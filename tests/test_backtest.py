"""
Unit tests for pairs trading backtest simulation and metrics
"""

import numpy as np
import pandas as pd
import pytest

from src.backtest import run_pairs_backtest
from src.metrics import compute_performance_metrics


def test_pairs_backtest_execution():
    np.random.seed(42)
    n = 200
    dates = pd.date_range("2023-01-01", periods=n, freq="B")
    
    # Generate cointegrated prices
    base = 50.0 + np.random.normal(0, 0.5, n).cumsum()
    # Spread with sine wave oscillations to guarantee trades
    spread = 3.0 * np.sin(np.linspace(0, 8 * np.pi, n)) + np.random.normal(0, 0.2, n)
    
    df = pd.DataFrame({
        "KO": base + spread,
        "PEP": base,
    }, index=dates)

    res = run_pairs_backtest(
        prices_df=df,
        ticker_y="KO",
        ticker_x="PEP",
        beta=1.0,
        alpha=0.0,
        lookback_window=20,
        entry_z=1.5,
        exit_z=0.5,
        stop_loss_z=3.5,
        transaction_cost_bps=5.0,
    )

    assert "results_df" in res
    assert "trades_df" in res
    assert res["total_trades"] > 0
    assert 0.0 <= res["win_rate"] <= 1.0


def test_compute_performance_metrics():
    # Constant 1% daily return over 100 days
    rets = pd.Series([0.01] * 100)
    perf = compute_performance_metrics(rets)
    assert perf["cumulative_return_pct"] > 0
    assert perf["sharpe_ratio"] > 0
    assert perf["max_drawdown_pct"] == 0.0
