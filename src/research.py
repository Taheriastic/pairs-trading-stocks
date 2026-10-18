"""Historical research on retrospective adjusted prices. Fits exclude the signal close and later observations."""
from __future__ import annotations

import csv
import math
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import coint

PAIRS = {'KO-PEP': ('KO', 'PEP'), 'MSFT-ORCL': ('MSFT', 'ORCL')}
FORMATION = 252
SPREAD_WINDOW = 60
ENTRY = 2.0
EXIT = 0.5
STOP = 3.5
MAX_HOLD = 20
CAPITAL = 10_000.0
COST_BPS = 10.0


def load_prices(path: Path, pair: str) -> pd.DataFrame:
    if pair not in PAIRS:
        raise ValueError('Unknown pair')
    y, x = PAIRS[pair]
    rows = []
    with path.open(newline='') as file:
        for row in csv.DictReader(file):
            if row['symbol'] in (y, x):
                rows.append((row['date'], row['symbol'], float(row['adjusted_close'])))
    frame = pd.DataFrame(rows, columns=['date', 'symbol', 'price'])
    result = frame.pivot(index='date', columns='symbol', values='price')[[y, x]].dropna().sort_index()
    if len(result) < FORMATION + MAX_HOLD + 2:
        raise ValueError('Insufficient aligned prices')
    if (result <= 0).any().any():
        raise ValueError('Nonpositive price')
    return result


def signal_at(prices: pd.DataFrame, index: int, *, test_cointegration=True) -> dict:
    """Use [index-252, index) to fit; use the observed close at index for its signal."""
    if index < FORMATION or index >= len(prices):
        raise IndexError('Signal index outside eligible history')
    y_name, x_name = prices.columns
    training = prices.iloc[index - FORMATION:index]
    x = training[x_name].to_numpy(dtype=float)
    y = training[y_name].to_numpy(dtype=float)
    beta, alpha = np.polyfit(x, y, 1)
    residual = y - (alpha + beta * x)
    reference = residual[-SPREAD_WINDOW:]
    mean = float(reference.mean())
    std = float(reference.std(ddof=1))
    pvalue = float(coint(y, x, trend='c', maxlag=1, autolag=None)[1]) if test_cointegration else 0.01
    observed_y = float(prices.iloc[index][y_name])
    observed_x = float(prices.iloc[index][x_name])
    spread = observed_y - (alpha + beta * observed_x)
    z = (spread - mean) / std if std > 0 else 0.0
    valid = bool(np.isfinite([alpha, beta, mean, std, pvalue, z]).all() and beta > 0 and std > 0 and pvalue < 0.05)
    direction = -1 if valid and z >= ENTRY else (1 if valid and z <= -ENTRY else 0)
    boundary = EXIT if direction == -1 else -EXIT
    stop_boundary = STOP if direction == -1 else -STOP
    return {
        'date': str(prices.index[index]), 'y_price': observed_y, 'x_price': observed_x,
        'alpha': float(alpha), 'beta': float(beta), 'spread': float(spread),
        'mean': mean, 'std': std, 'z': float(z), 'pvalue': pvalue,
        'eligible': valid, 'direction': direction,
        'target_y_if_x_constant': float(alpha + beta * observed_x + mean + boundary * std) if direction else None,
        'stop_y_if_x_constant': float(alpha + beta * observed_x + mean + stop_boundary * std) if direction else None,
        'action': 'none',
    }


def make_signals(prices: pd.DataFrame, *, test_cointegration=True) -> list[dict]:
    return [signal_at(prices, i, test_cointegration=test_cointegration) for i in range(FORMATION, len(prices))]


def _close_reason(record: dict, position: int, days_held: int) -> str | None:
    z = record['z']
    if position == -1:
        if z >= STOP:
            return 'stop'
        if z <= EXIT:
            return 'target'
    else:
        if z <= -STOP:
            return 'stop'
        if z >= -EXIT:
            return 'target'
    if days_held >= MAX_HOLD:
        return 'time'
    return None


def simulate(prices: pd.DataFrame, signals: list[dict], *, inverse=False) -> dict:
    """Signal after close t; fill at close t+1. Mark fixed entry shares each close."""
    y, x = prices.columns
    lookup = {row['date']: row for row in signals}
    cash = CAPITAL
    open_trade = None
    pending = None
    trades = []
    curve = []
    active_days = 0
    first = FORMATION
    for i in range(first, len(prices)):
        day = str(prices.index[i])
        py, px = map(float, prices.iloc[i][[y, x]])
        record = lookup[day]
        if pending:
            if pending['kind'] == 'exit' and open_trade:
                t = open_trade
                pnl = t['shares_y'] * (py - t['entry_y']) + t['shares_x'] * (px - t['entry_x'])
                exit_cost = COST_BPS / 10_000 * (abs(t['shares_y'] * py) + abs(t['shares_x'] * px))
                cash = t['capital_at_entry'] + pnl - t['entry_cost'] - exit_cost
                trades.append({
                    'signal_date': t['signal_date'], 'entry_date': t['entry_date'], 'exit_date': day,
                    'direction': t['direction'], 'entry_y': t['entry_y'], 'entry_x': t['entry_x'],
                    'exit_y': py, 'exit_x': px, 'holding_days': i - t['entry_index'],
                    'reason': pending['reason'], 'pnl': cash - t['capital_at_entry'],
                    'return_pct': 100 * (cash / t['capital_at_entry'] - 1),
                    'entry_cost': t['entry_cost'], 'exit_cost': exit_cost,
                })
                open_trade = None
            elif pending['kind'] == 'entry' and open_trade is None:
                direction = pending['direction'] * (-1 if inverse else 1)
                entry_cost = cash * COST_BPS / 10_000
                open_trade = {
                    'signal_date': pending['signal_date'], 'entry_date': day, 'entry_index': i,
                    'capital_at_entry': cash, 'entry_cost': entry_cost,
                    'entry_y': py, 'entry_x': px, 'direction': direction,
                    'shares_y': direction * (cash * 0.5) / py,
                    'shares_x': -direction * (cash * 0.5) / px,
                }
            pending = None
        if open_trade:
            t = open_trade
            pnl = t['shares_y'] * (py - t['entry_y']) + t['shares_x'] * (px - t['entry_x'])
            equity = t['capital_at_entry'] + pnl - t['entry_cost']
            active_days += 1
        else:
            equity = cash
        curve.append({'date': day, 'equity': round(equity, 4)})
        if i == len(prices) - 1:
            if open_trade:
                t = open_trade
                exit_cost = COST_BPS / 10_000 * (abs(t['shares_y'] * py) + abs(t['shares_x'] * px))
                cash = equity - exit_cost
                trades.append({
                    'signal_date': t['signal_date'], 'entry_date': t['entry_date'], 'exit_date': day,
                    'direction': t['direction'], 'entry_y': t['entry_y'], 'entry_x': t['entry_x'],
                    'exit_y': py, 'exit_x': px, 'holding_days': i - t['entry_index'], 'reason': 'end of sample',
                    'pnl': cash - t['capital_at_entry'], 'return_pct': 100 * (cash / t['capital_at_entry'] - 1),
                    'entry_cost': t['entry_cost'], 'exit_cost': exit_cost,
                })
                curve[-1]['equity'] = round(cash, 4)
            break
        if open_trade:
            reason = _close_reason(record, open_trade['direction'] * (-1 if inverse else 1), i - open_trade['entry_index'])
            record['action'] = 'exit queued' if reason else 'holding'
            if reason:
                pending = {'kind': 'exit', 'reason': reason}
        elif record['direction'] and i < len(prices) - 2:
            record['action'] = 'entry queued'
            pending = {'kind': 'entry', 'direction': record['direction'], 'signal_date': day}
        else:
            record['action'] = 'no trade'
    peak = CAPITAL
    max_drawdown = 0.0
    for point in curve:
        peak = max(peak, point['equity'])
        max_drawdown = min(max_drawdown, point['equity'] / peak - 1)
    return {
        'curve': curve, 'trades': trades, 'total_return_pct': 100 * (curve[-1]['equity'] / CAPITAL - 1),
        'max_drawdown_pct': max_drawdown * 100,
        'trade_count': len(trades), 'loss_count': sum(t['pnl'] < 0 for t in trades),
        'cash_days': len(curve) - active_days, 'active_days': active_days,
    }


def benchmark(prices: pd.DataFrame) -> list[dict]:
    sample = prices.iloc[FORMATION:]
    start = sample.iloc[0]
    return [{'date': str(day), 'equity': round(float(CAPITAL * 0.5 * (row.iloc[0] / start.iloc[0] + row.iloc[1] / start.iloc[1])), 4)} for day, row in sample.iterrows()]


def analyze(prices: pd.DataFrame) -> dict:
    signals = make_signals(prices)
    # simulate modifies action labels; the inverse gets a separate copy.
    normal = simulate(prices, signals)
    inverse = simulate(prices, [dict(row) for row in signals], inverse=True)
    return {
        'pair': '-'.join(prices.columns), 'symbols': list(prices.columns),
        'start_date': str(prices.index[FORMATION]), 'end_date': str(prices.index[-1]),
        'model': {'formation_days': FORMATION, 'spread_days': SPREAD_WINDOW, 'entry_z': ENTRY,
                  'exit_z': EXIT, 'stop_z': STOP, 'max_hold_days': MAX_HOLD,
                  'capital': CAPITAL, 'cost_bps_per_leg_per_side': COST_BPS,
                  'cointegration_p_max': 0.05},
        'signals': signals, 'strategy': normal, 'inverse': inverse,
        'benchmark': benchmark(prices),
    }
