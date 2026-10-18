"""Rebuild the fixed, as-of-2024-12-23 research snapshot from public sources."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import subprocess
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data'
CUTOFF = '2024-12-23'
PRICE_END = '2024-12-20'
TICKERS = {'KO': '0000021344', 'PEP': '0000077476', 'MSFT': '0000789019', 'ORCL': '0001341439'}
KAGGLE_META = 'https://www.kaggle.com/api/v1/datasets/view/andrewmvd/sp-500-stocks'
KAGGLE_ZIP = 'https://www.kaggle.com/api/v1/datasets/download/andrewmvd/sp-500-stocks'
KO_META = 'https://www.kaggle.com/api/v1/datasets/view/isaaclopgu/coca-cola-stock-daily-updated'
KO_ZIP = 'https://www.kaggle.com/api/v1/datasets/download/isaaclopgu/coca-cola-stock-daily-updated'
USER_AGENT = 'FinanceDecisionLab/1.0 dataset download'


def download(url, user_agent=USER_AGENT):
    return subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--user-agent', user_agent, url], check=True, capture_output=True, timeout=120).stdout


def annual_facts(data, tag):
    facts = data['facts']['us-gaap'].get(tag, {}).get('units', {}).get('USD', [])
    results = {}
    for item in facts:
        if item.get('form') != '10-K' or item.get('fp') != 'FY' or item.get('filed', '9999') > CUTOFF:
            continue
        if not item.get('start') or not item.get('end'):
            continue
        days = (date.fromisoformat(item['end']) - date.fromisoformat(item['start'])).days
        if not 330 <= days <= 400:
            continue
        end = item['end']
        if end not in results or item['filed'] < results[end]['filed']:
            results[end] = item
    return results


def main():
    OUT.mkdir(exist_ok=True)
    meta = json.loads(download(KAGGLE_META))
    if meta.get('licenseName') != 'CC0: Public Domain' or not meta.get('lastUpdated', '').startswith(CUTOFF):
        raise ValueError('Unexpected Kaggle license or snapshot date')
    ko_meta = json.loads(download(KO_META))
    if ko_meta.get('licenseName') != 'CC0: Public Domain':
        raise ValueError('Unexpected KO dataset license')
    archive = download(KAGGLE_ZIP)
    ko_archive = download(KO_ZIP)
    if hashlib.sha256(archive).hexdigest() != '0c50fb48ef5b4a6c0f722e3dfe667c78077185517030f36839aaed3bae9a2d79':
        raise ValueError('Main price archive changed: audit before using a new snapshot')
    if hashlib.sha256(ko_archive).hexdigest() != 'e1c209365c3d71c825019ed2c35df05aa72cfe5cca187372cac28c3151485ae5':
        raise ValueError('KO archive changed: audit before using a new snapshot')
    rows = []
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        reader = csv.DictReader(io.TextIOWrapper(zf.open('sp500_stocks.csv'), encoding='utf-8'))
        required = {'Date', 'Symbol', 'Adj Close', 'Close'}
        if not required <= set(reader.fieldnames or []):
            raise ValueError('Price schema changed')
        for row in reader:
            if row['Symbol'] not in TICKERS or not '2017-01-01' <= row['Date'] <= PRICE_END:
                continue
            if not row['Adj Close'] or not row['Close']:
                continue
            adjusted, close = float(row['Adj Close']), float(row['Close'])
            if adjusted <= 0 or close <= 0:
                continue
            rows.append({'date': row['Date'], 'symbol': row['Symbol'], 'adjusted_close': adjusted, 'close': close})
    with zipfile.ZipFile(io.BytesIO(ko_archive)) as zf:
        reader = csv.DictReader(io.TextIOWrapper(zf.open('Coca_Cola_historical_data.csv'), encoding='utf-8'))
        for row in reader:
            day = row['Date'][:10]
            if '2017-01-01' <= day <= PRICE_END and row['Close']:
                adjusted = float(row['Close'])
                if adjusted > 0:
                    rows.append({'date': day, 'symbol': 'KO', 'adjusted_close': adjusted, 'close': ''})
    by_symbol = {symbol: {row['date'] for row in rows if row['symbol'] == symbol} for symbol in TICKERS}
    if any(len(dates) < 1000 for dates in by_symbol.values()):
        raise ValueError('Insufficient ticker history')
    with (OUT / 'prices.csv').open('w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=['date', 'symbol', 'adjusted_close', 'close'], lineterminator='\n')
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda row: (row['date'], row['symbol'])))

    sec_user_agent = os.environ.get('SEC_USER_AGENT')
    if sec_user_agent:
        financials = {}
        for symbol, cik in TICKERS.items():
            data = json.loads(download(f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json', sec_user_agent))
            revenue = {}
            for tag in ('RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'):
                for end, fact in annual_facts(data, tag).items():
                    revenue.setdefault(end, (fact, tag))
            operating = annual_facts(data, 'OperatingIncomeLoss')
            matched = sorted(set(revenue) & set(operating))
            if len(matched) < 2:
                raise ValueError(f'Missing two annual financial periods for {symbol}')
            latest, prior = matched[-1], matched[-2]
            rev, rev_tag = revenue[latest]
            op = operating[latest]
            prior_rev = revenue[prior][0]
            if rev['accn'] != op['accn']:
                raise ValueError(f'Mismatched filing accessions for {symbol}')
            financials[symbol] = {
                'name': data['entityName'].title(), 'symbol': symbol, 'cik': cik,
                'period_start': rev['start'], 'period_end': latest,
                'prior_period_end': prior, 'filed': rev['filed'], 'accession': rev['accn'],
                'filing_url': f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{rev['accn'].replace('-', '')}/",
                'revenue_tag': rev_tag, 'revenue': rev['val'],
                'prior_revenue': prior_rev['val'], 'operating_income': op['val'],
                'growth': rev['val'] / prior_rev['val'] - 1,
                'operating_margin': op['val'] / rev['val'],
            }
        (OUT / 'financials.json').write_text(json.dumps({'as_of': CUTOFF, 'companies': financials}, indent=2) + '\n')
    elif not (OUT / 'financials.json').exists():
        raise ValueError('Set SEC_USER_AGENT with your own contact address to build financials from scratch')
    manifest = {
        'as_of': CUTOFF, 'price_end': PRICE_END, 'price_source': KAGGLE_META, 'price_download': KAGGLE_ZIP,
        'price_license': meta['licenseName'], 'price_archive_sha256': hashlib.sha256(archive).hexdigest(),
        'ko_source': KO_META, 'ko_download': KO_ZIP, 'ko_license': ko_meta['licenseName'],
        'ko_archive_sha256': hashlib.sha256(ko_archive).hexdigest(),
        'ko_note': 'Main S&P 500 archive has no KO prices. KO Close from separate CC0 archive is used as an adjusted-like research price; raw nominal close is unavailable there.',
        'price_rows': len(rows), 'price_symbols': {key: len(value) for key, value in by_symbol.items()},
        'price_fields': ['Date', 'Symbol', 'Adj Close', 'Close'],
        'financial_source': 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
        'financial_policy': 'Earliest filed 10-K fact for latest annual period available by cutoff; fiscal periods may differ.',
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
