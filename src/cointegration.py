"""
Econometric Foundations: Stationarity, Cointegration, and Ornstein-Uhlenbeck Modeling
"""

from typing import Dict, Tuple, Any
import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller, coint


def test_stationarity(series: pd.Series, maxlag: int = None) -> Dict[str, Any]:
    """
    Perform the Augmented Dickey-Fuller (ADF) test for stationarity.
    
    H0: Unit root present (non-stationary)
    H1: Stationary
    """
    clean_series = series.dropna()
    result = adfuller(clean_series, maxlag=maxlag, autolag="AIC")
    
    return {
        "test_statistic": float(result[0]),
        "p_value": float(result[1]),
        "used_lag": int(result[2]),
        "nobs": int(result[3]),
        "critical_values": {k: float(v) for k, v in result[4].items()},
        "is_stationary_5pct": bool(result[1] < 0.05),
        "is_stationary_1pct": bool(result[1] < 0.01),
    }


def estimate_hedge_ratio(
    y: pd.Series, x: pd.Series, add_constant: bool = True
) -> Tuple[float, float, pd.Series]:
    """
    Estimate static cointegrating hedge ratio via Ordinary Least Squares (OLS):
    y = alpha + beta * x + epsilon
    
    Returns:
        beta: Hedge ratio (units of x per unit of y)
        alpha: Intercept term
        spread: Residual spread series (epsilon)
    """
    if add_constant:
        X = sm.add_constant(x)
        model = sm.OLS(y, X).fit()
        alpha = float(model.params.iloc[0])
        beta = float(model.params.iloc[1])
    else:
        model = sm.OLS(y, x).fit()
        alpha = 0.0
        beta = float(model.params.iloc[0])

    spread = y - (alpha + beta * x)
    return beta, alpha, spread


def test_engle_granger(y: pd.Series, x: pd.Series) -> Dict[str, Any]:
    """
    Execute the Engle-Granger two-step cointegration test.
    """
    score, p_value, crit_values = coint(y, x)
    beta, alpha, spread = estimate_hedge_ratio(y, x)
    ou_results = estimate_ornstein_uhlenbeck(spread)

    return {
        "coint_t_statistic": float(score),
        "p_value": float(p_value),
        "critical_values": {
            "1%": float(crit_values[0]),
            "5%": float(crit_values[1]),
            "10%": float(crit_values[2]),
        },
        "is_cointegrated_5pct": bool(p_value < 0.05),
        "is_cointegrated_10pct": bool(p_value < 0.10),
        "hedge_ratio_beta": beta,
        "intercept_alpha": alpha,
        "half_life_days": ou_results["half_life_days"],
        "ou_theta": ou_results["theta"],
    }


def estimate_ornstein_uhlenbeck(spread: pd.Series, dt: float = 1.0) -> Dict[str, float]:
    """
    Fit discrete Ornstein-Uhlenbeck (OU) mean-reverting process:
    d S_t = theta * (mu - S_t) dt + sigma * dW_t
    
    Via discrete AR(1) regression:
    S_t - S_{t-1} = a + b * S_{t-1} + e_t
    where b = - theta * dt  =>  theta = - b / dt
    half_life = ln(2) / theta
    """
    s = spread.dropna()
    s_lag = s.shift(1).dropna()
    delta_s = (s - s_lag).dropna()
    
    # Align
    s_lag = s_lag.loc[delta_s.index]
    
    X = sm.add_constant(s_lag)
    model = sm.OLS(delta_s, X).fit()
    
    a = float(model.params.iloc[0])
    b = float(model.params.iloc[1])
    residuals = model.resid
    
    # Mean-reverting requires b < 0
    if b < 0:
        theta = -b / dt
        half_life = np.log(2) / theta
        equilibrium_mean = -a / b
    else:
        # Non-mean reverting or explosive
        theta = 0.0
        half_life = np.nan
        equilibrium_mean = np.nan

    sigma = float(residuals.std() / np.sqrt(dt))

    return {
        "theta": float(theta),
        "half_life_days": float(half_life) if not np.isnan(half_life) else 999.0,
        "equilibrium_mean": float(equilibrium_mean) if not np.isnan(equilibrium_mean) else 0.0,
        "sigma": float(sigma),
        "r_squared": float(model.rsquared),
    }


def calculate_rolling_zscore(
    spread: pd.Series, lookback_window: int = 30
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Calculate dynamic rolling Z-Score for the spread.
    
    Z_t = (Spread_t - Mean_w(Spread)) / Std_w(Spread)
    """
    rolling_mean = spread.rolling(window=lookback_window).mean()
    rolling_std = spread.rolling(window=lookback_window).std()
    
    z_score = (spread - rolling_mean) / rolling_std
    return z_score, rolling_mean, rolling_std
