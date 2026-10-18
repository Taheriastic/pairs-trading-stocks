import json
from pathlib import Path
import pytest
from azure.function_app import calculate_scenario

ROOT = Path(__file__).resolve().parents[1]


def test_filing_values_and_cutoff():
    fin = json.loads((ROOT / 'data/financials.json').read_text())
    assert fin['as_of'] == '2024-12-23'
    assert set(fin['companies']) == {'KO', 'PEP', 'MSFT', 'ORCL'}
    for company in fin['companies'].values():
        assert company['filed'] <= fin['as_of']
        assert company['revenue'] > company['operating_income'] > 0
        assert company['filing_url'].startswith('https://www.sec.gov/Archives/edgar/data/')


def test_scenario_bridge_reconciles():
    result = calculate_scenario('MSFT', .2, .45)
    assert result['scenario_revenue'] == result['reported_revenue'] * 1.2
    assert result['scenario_operating_income'] == result['scenario_revenue'] * .45
    assert abs(result['growth_effect'] + result['margin_effect'] - result['total_change']) < .0001
    with pytest.raises(ValueError):
        calculate_scenario('MSFT', 9, .2)
