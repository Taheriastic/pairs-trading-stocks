"""
Unit tests for econometric & cointegration tools
"""

import numpy as np
import pandas as pd
import pytest

from src.cointegration import (
    test_stationarity,
    estimate_hedge_ratio,
    estimate_ornstein_uhlenbeck,
    calculate_rolling_zscore,
)


def test_stationarity_white_noise():
    np.random.seed(42)
    white_noise = pd.Series(np.random.normal(0, 1, 500))
    res = test_stationarity(white_noise)
    assert res["is_stationary_5pct"] is True
    assert res["p_value"] < 0.05


def test_stationarity_random_walk():
    np.random.seed(42)
    random_walk = pd.Series(np.random.normal(0, 1, 500)).cumsum()
    res = test_stationarity(random_walk)
    assert res["is_stationary_5pct"] is False


def test_estimate_hedge_ratio():
    np.random.seed(42)
    x = pd.Series(np.linspace(10, 50, 100) + np.random.normal(0, 1, 100))
    # True beta = 1.5, alpha = 2.0
    y = 2.0 + 1.5 * x + np.random.normal(0, 0.5, 100)
    
    beta, alpha, spread = estimate_hedge_ratio(y, x)
    assert pytest.approx(beta, rel=0.1) == 1.5
    assert pytest.approx(alpha, abs=1.0) == 2.0
    assert len(spread) == 100


def test_ornstein_uhlenbeck_half_life():
    np.random.seed(42)
    # Synthetic mean-reverting OU process with theta = 0.1
    # dt = 1 => half-life = ln(2) / 0.1 ~ 6.93 days
    s = [0.0]
    theta = 0.1
    for _ in range(500):
        ds = -theta * s[-1] + np.random.normal(0, 1)
        s.append(s[-1] + ds)
    
    ou = estimate_ornstein_uhlenbeck(pd.Series(s))
    assert 4.0 <= ou["half_life_days"] <= 12.0


def test_rolling_zscore():
    s = pd.Series(np.random.normal(0, 1, 100))
    z, mean, std = calculate_rolling_zscore(s, lookback_window=20)
    assert len(z) == 100
    assert np.isnan(z.iloc[0])
    assert not np.isnan(z.iloc[25])
