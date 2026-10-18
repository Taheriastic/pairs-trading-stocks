from pathlib import Path
import math
import numpy as np
import pandas as pd
from src.research import FORMATION, PAIRS, CAPITAL, analyze, load_prices, signal_at, simulate

ROOT = Path(__file__).resolve().parents[1]


def test_all_pairs_have_aligned_history_and_finite_outputs():
    for pair in PAIRS:
        prices = load_prices(ROOT / 'data/prices.csv', pair)
        assert prices.index.is_unique
        assert len(prices) > FORMATION + 1000
        data = analyze(prices)
        assert data['end_date'] == '2024-12-20'
        assert len(data['signals']) == len(prices) - FORMATION
        assert len(data['prices']) == len(data['signals'])
        assert data['prices'][0]['date'] == data['start_date']
        assert data['prices'][-1]['date'] == data['end_date']
        assert math.isclose(data['prices'][-1]['y_price'], float(prices.iloc[-1, 0]), abs_tol=0.0001)
        assert math.isclose(data['prices'][-1]['x_price'], float(prices.iloc[-1, 1]), abs_tol=0.0001)
        assert data['signals'][-1]['action'] == 'no trade'
        assert len(data['strategy']['curve']) == len(data['benchmark'])
        assert all(math.isfinite(p['equity']) for p in data['strategy']['curve'])
        assert data['strategy']['cash_days'] + data['strategy']['active_days'] == len(data['strategy']['curve'])
        assert abs(data['strategy']['curve'][-1]['equity'] - (CAPITAL + sum(t['pnl'] for t in data['strategy']['trades']))) < 0.01


def test_signal_fitting_never_uses_current_or_future_prices():
    rng = np.random.default_rng(3)
    x = 100 + np.cumsum(rng.normal(0, 1, 270))
    y = 1.2 * x + rng.normal(0, 0.3, 270)
    frame = pd.DataFrame({'KO': y, 'PEP': x}, index=[f'2020-{i:03d}' for i in range(270)])
    original = signal_at(frame, 255, test_cointegration=False)
    changed = frame.copy()
    changed.iloc[255:, :] *= 50
    mutated = signal_at(changed, 255, test_cointegration=False)
    for field in ('alpha', 'beta', 'mean', 'std'):
        assert original[field] == mutated[field]
    assert original['z'] != mutated['z']


def test_next_close_fills_and_trade_log_reconciles_with_equity():
    dates = [f'2020-{i:03d}' for i in range(260)]
    prices = pd.DataFrame({'KO': [100.0]*253 + [102.0, 104.0] + [104.0]*5,
                           'PEP': [100.0]*260}, index=dates)
    signals = [{'date': day, 'z': 0, 'direction': 0, 'action': 'none'} for day in dates[FORMATION:]]
    signals[0]['z'] = -2.2; signals[0]['direction'] = 1
    signals[1]['z'] = -2.2
    signals[2]['z'] = 0.0
    result = simulate(prices, signals)
    assert len(result['trades']) == 1
    trade = result['trades'][0]
    assert trade['signal_date'] == dates[FORMATION]
    assert trade['entry_date'] == dates[FORMATION+1]
    assert trade['exit_date'] == dates[FORMATION+3]
    assert trade['entry_y'] == 102.0
    assert trade['entry_cost'] == 10.0
    assert math.isclose(trade['pnl'], result['curve'][-1]['equity']-CAPITAL, abs_tol=0.01)
    inverse = simulate(prices, [dict(x) for x in signals], inverse=True)
    assert inverse['trades'][0]['pnl'] < 0


def test_benchmark_starts_at_initial_capital():
    prices = load_prices(ROOT / 'data/prices.csv', 'KO-PEP')
    result = analyze(prices)
    assert result['benchmark'][0]['equity'] == CAPITAL
    assert result['strategy']['curve'][0]['equity'] == CAPITAL
