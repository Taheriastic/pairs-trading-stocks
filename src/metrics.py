"""
Performance, Risk, and Transaction Cost Sensitivity Metrics
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd


def compute_performance_metrics(
    strategy_returns: pd.Series,
    risk_free_rate: float = 0.03,  # 3% annual risk-free rate
    periods_per_year: int = 252,
) -> Dict[str, float]:
    """
    Compute institutional-grade risk-adjusted performance metrics.
    """
    clean_rets = strategy_returns.dropna()
    if len(clean_rets) == 0:
        return {}

    rf_daily = (1.0 + risk_free_rate) ** (1.0 / periods_per_year) - 1.0

    # Cumulative return & CAGR
    cum_ret = (1.0 + clean_rets).prod() - 1.0
    n_days = len(clean_rets)
    n_years = n_days / periods_per_year
    cagr = (1.0 + cum_ret) ** (1.0 / n_years) - 1.0 if n_years > 0 else 0.0

    # Volatility
    ann_vol = clean_rets.std() * np.sqrt(periods_per_year)

    # Sharpe Ratio
    excess_ret = clean_rets - rf_daily
    sharpe = (excess_ret.mean() / clean_rets.std()) * np.sqrt(periods_per_year) if clean_rets.std() > 0 else 0.0

    # Sortino Ratio
    downside_returns = clean_rets[clean_rets < 0]
    downside_vol = downside_returns.std() * np.sqrt(periods_per_year)
    sortino = (excess_ret.mean() / downside_returns.std()) * np.sqrt(periods_per_year) if (len(downside_returns) > 0 and downside_returns.std() > 0) else 0.0

    # Drawdown
    wealth_index = (1.0 + clean_rets).cumprod()
    previous_peaks = wealth_index.cummax()
    drawdowns = (wealth_index - previous_peaks) / previous_peaks
    max_drawdown = float(drawdowns.min())

    # Calmar Ratio
    calmar = (cagr / abs(max_drawdown)) if abs(max_drawdown) > 0 else 0.0

    return {
        "cumulative_return_pct": float(cum_ret * 100),
        "cagr_pct": float(cagr * 100),
        "annualized_volatility_pct": float(ann_vol * 100),
        "sharpe_ratio": float(sharpe),
        "sortino_ratio": float(sortino),
        "max_drawdown_pct": float(max_drawdown * 100),
        "calmar_ratio": float(calmar),
    }


def compute_transaction_cost_sensitivity(
    prices_df: pd.DataFrame,
    ticker_y: str,
    ticker_x: str,
    beta: float,
    alpha: float,
    lookback_window: int = 30,
    entry_z: float = 2.0,
    exit_z: float = 0.5,
    stop_loss_z: float = 3.5,
    cost_regimes: List[float] = [0.0, 5.0, 10.0, 15.0, 20.0],
) -> pd.DataFrame:
    """
    Run backtest across multiple transaction cost tiers (in basis points)
    to assess strategy viability in real-world friction environments.
    """
    from src.backtest import run_pairs_backtest

    sensitivity_rows = []
    for cost_bps in cost_regimes:
        bt_res = run_pairs_backtest(
            prices_df=prices_df,
            ticker_y=ticker_y,
            ticker_x=ticker_x,
            beta=beta,
            alpha=alpha,
            lookback_window=lookback_window,
            entry_z=entry_z,
            exit_z=exit_z,
            stop_loss_z=stop_loss_z,
            transaction_cost_bps=cost_bps,
        )
        perf = compute_performance_metrics(bt_res["results_df"]["strategy_return"])
        sensitivity_rows.append({
            "Cost Regime (bps)": f"{cost_bps:.1f} bps",
            "Cumulative Return (%)": f"{perf.get('cumulative_return_pct', 0):.2f}%",
            "CAGR (%)": f"{perf.get('cagr_pct', 0):.2f}%",
            "Sharpe Ratio": f"{perf.get('sharpe_ratio', 0):.2f}",
            "Max Drawdown (%)": f"{perf.get('max_drawdown_pct', 0):.2f}%",
            "Total Trades": bt_res["total_trades"],
            "Win Rate (%)": f"{bt_res['win_rate'] * 100:.1f}%",
        })

    return pd.DataFrame(sensitivity_rows)
