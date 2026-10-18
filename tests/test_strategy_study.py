"""Checks for the separately sourced, longer-horizon study."""
import numpy as np
import pandas as pd
import pytest

from scripts.strategy_study import percentile_signals, simulate


def test_research_signal_does_not_see_later_prices():
    days = pd.bdate_range("2020-01-01", periods=360).strftime("%Y-%m-%d")
    t = np.arange(360)
    prices = pd.DataFrame({"KO": 50 + t * .03 + np.sin(t / 8),
                           "PEP": 100 + t * .05 + np.sin(t / 9)}, index=days)
    changed = prices.copy()
    changed.iloc[301:, 0] *= 4
    for family in ("regression", "log_ratio", "distance"):
        percentile, correlation = percentile_signals(prices, family, 126)
        later_percentile, later_correlation = percentile_signals(changed, family, 126)
        np.testing.assert_allclose(percentile[:301], later_percentile[:301], equal_nan=True)
        np.testing.assert_allclose(correlation[:301], later_correlation[:301], equal_nan=True)


def test_next_close_fill_and_both_side_costs():
    prices = pd.DataFrame({"KO": [100., 100., 90., 90.],
                           "PEP": [100., 100., 100., 100.]},
                          index=["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"])
    result = simulate(prices, np.array([.95, .5, .5, .5]), np.zeros(4),
                      entry=.9, exit_pct=.5, hold=20, min_corr=None)
    assert len(result["trades"]) == 1
    trade = result["trades"][0]
    assert trade["signal_date"] == "2024-01-02"
    assert trade["entry_date"] == "2024-01-03"
    assert trade["exit_date"] == "2024-01-04"
    assert trade["direction"] == -1
    assert trade["pnl"] == pytest.approx(480.5)
    assert result["curve"][-1] == pytest.approx(10480.5)
