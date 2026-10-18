"""Azure Functions v2 endpoints for the public research dashboard."""
from __future__ import annotations

import json
from pathlib import Path

import azure.functions as func

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)
ROOT = Path(__file__).parent / 'data'
FINANCIALS = json.loads((ROOT / 'financials.json').read_text())
PAIRS = {'KO-PEP', 'MSFT-ORCL'}


def response(payload, status=200):
    return func.HttpResponse(json.dumps(payload, allow_nan=False), status_code=status,
                             mimetype='application/json', headers={'Cache-Control': 'public, max-age=86400' if status == 200 else 'no-store'})


def calculate_scenario(symbol: str, growth: float, margin: float) -> dict:
    if symbol not in FINANCIALS['companies']:
        raise ValueError('Unknown company')
    if not -0.5 <= growth <= 0.5 or not 0 <= margin <= 0.8:
        raise ValueError('Assumptions outside supported range')
    base = FINANCIALS['companies'][symbol]
    revenue = base['revenue']
    base_growth = base['growth']
    base_margin = base['operating_margin']
    base_forecast_revenue = revenue * (1 + base_growth)
    scenario_revenue = revenue * (1 + growth)
    base_forecast_income = base_forecast_revenue * base_margin
    scenario_income = scenario_revenue * margin
    growth_effect = (scenario_revenue - base_forecast_revenue) * base_margin
    margin_effect = scenario_revenue * (margin - base_margin)
    return {
        'symbol': symbol, 'growth': growth, 'margin': margin,
        'reported_revenue': revenue, 'base_growth': base_growth, 'base_margin': base_margin,
        'base_revenue': base_forecast_revenue, 'base_operating_income': base_forecast_income,
        'scenario_revenue': scenario_revenue, 'scenario_operating_income': scenario_income,
        'growth_effect': growth_effect, 'margin_effect': margin_effect,
        'total_change': scenario_income - base_forecast_income,
        'filing_url': base['filing_url'], 'period_end': base['period_end'],
    }


@app.route(route='analysis', methods=['GET'])
def analysis(req: func.HttpRequest) -> func.HttpResponse:
    pair = req.params.get('pair', '')
    if pair not in PAIRS:
        return response({'error': 'Unknown pair'}, 400)
    return func.HttpResponse((ROOT / f'{pair}.json').read_text(), mimetype='application/json',
                             headers={'Cache-Control': 'public, max-age=86400'})


@app.route(route='scenario', methods=['POST'])
def scenario(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
        result = calculate_scenario(str(body['symbol']), float(body['growth']), float(body['margin']))
        return response(result)
    except (ValueError, TypeError, KeyError, OverflowError):
        return response({'error': 'Invalid scenario assumptions'}, 400)
