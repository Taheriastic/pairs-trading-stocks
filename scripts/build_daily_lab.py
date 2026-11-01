"""Build a 20-year, normalized analytical snapshot from the pinned CC0 archive.

No raw quote levels are published. A 252-session lead-in supports the first
study-day decisions. The published license is recorded without claiming the
upstream adjustment methodology has been independently certified.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import zipfile

import numpy as np
import pandas as pd
import exchange_calendars as xcals

ROOT = Path(__file__).resolve().parents[1]
SHA256 = "6b08f03040378dd59824673cdc8bd38f268ebdff83e881a3d965c709459db7b3"
SYMBOLS = ["KO", "PEP", "MSFT", "ORCL"]


def build(archive_path: Path):
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    if digest != SHA256:
        raise ValueError("Unreviewed archive: checksum differs from version 202")
    rows = []
    seen = set()
    with zipfile.ZipFile(archive_path) as archive, archive.open("sp500_stocks.csv") as f:
        for row in csv.DictReader(line.decode() for line in f):
            if row["symbol"] not in SYMBOLS:
                continue
            key = (row["date"], row["symbol"])
            if key in seen:
                raise ValueError(f"Duplicate {key}")
            seen.add(key)
            rows.append((row["date"], row["symbol"], float(row["close"])))
    frame = pd.DataFrame(rows, columns=["date", "symbol", "value"]).pivot(index="date", columns="symbol", values="value").sort_index()[SYMBOLS]
    if frame.isna().any().any() or not np.isfinite(frame.to_numpy()).all() or (frame <= 0).any().any():
        raise ValueError("Unaligned, nonfinite or nonpositive history")
    start = frame.index.get_loc("2006-10-16")
    frame = frame.iloc[start-252:]
    if frame.index[-1] != "2026-10-16" or len(frame)-252 != 5032:
        raise ValueError("Unexpected study dates or sessions")
    calendar = pd.to_datetime(frame.index)
    if (calendar.weekday >= 5).any() or any(gap.days > 5 for gap in calendar[1:]-calendar[:-1]):
        raise ValueError("Unexpected calendar gap or weekend")
    nyse=xcals.get_calendar("XNYS",start=frame.index[0],end=frame.index[-1])
    expected=set(nyse.sessions_in_range(frame.index[0],frame.index[-1]).strftime("%Y-%m-%d"))
    actual=set(frame.index)
    if expected!=actual:
        raise ValueError(f"Exchange calendar mismatch: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
    old = pd.read_csv(ROOT / "data/prices.csv").pivot(index="date", columns="symbol", values="adjusted_close")
    agreement = {}
    for symbol in SYMBOLS:
        overlap = pd.concat([frame[symbol].pct_change(), old[symbol].pct_change()], axis=1).dropna()
        error = float((overlap.iloc[:, 0] - overlap.iloc[:, 1]).abs().max())
        if error > .00001:
            raise ValueError(f"Historical return discrepancy for {symbol}: {error}")
        agreement[symbol] = {"sessions": len(overlap), "max_daily_return_difference": error}
    indexed = frame / frame.iloc[252] * 100
    payload = {
        "version": "2026-10-18-daily-v1", "start_index": 252,
        "start_date": "2006-10-16", "end_date": "2026-10-16", "sessions": 5032,
        "source": {"name": "Kaggle S&P 500 history · version 202", "url": "https://www.kaggle.com/datasets/darkmatternet/s-and-p-500-stocks-25-years-of-data-updated-daily", "license": "Publisher CC0", "sha256": digest,
                   "display": "Normalized analytical indices; 100 at the study start. Not raw dollar quotes.",
                   "limitations": "Retrospective adjustment methodology and upstream provider rights are not independently established. Results are provisional historical research, not a validated investment edge.",
                   "overlap_audit": agreement,
                   "calendar_audit":{"calendar":"XNYS","package_version":xcals.__version__,"missing_sessions":0,"extra_sessions":0}},
        "dates": list(indexed.index),
        "indices": {s: [round(float(v), 8) for v in indexed[s]] for s in SYMBOLS},
    }
    for target in [ROOT / "data/daily_lab.json", ROOT / "web/public/data/daily_lab.json"]:
        target.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False)+"\n")
    print(json.dumps({"sessions": payload["sessions"], "start": payload["start_date"], "end": payload["end_date"], "overlap_audit": agreement}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    build(parser.parse_args().archive)
