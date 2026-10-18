"""
Market-Neutral Pairs Trading Backtest Engine
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


def run_pairs_backtest(
    prices_df: pd.DataFrame,
    ticker_y: str = "KO",
    ticker_x: str = "PEP",
    beta: float = 1.0,
    alpha: float = 0.0,
    lookback_window: int = 30,
    entry_z: float = 2.0,
    exit_z: float = 0.5,
    stop_loss_z: float = 3.5,
    transaction_cost_bps: float = 10.0,  # 10 bps = 0.10% round-trip per leg
    initial_capital: float = 100_000.0,
) -> Dict[str, Any]:
    """
    Simulate a market-neutral pairs-trading strategy on historical daily prices.
    
    Position convention:
    - Position = +1 (Long Spread): Long Asset Y, Short Beta * Asset X
    - Position = -1 (Short Spread): Short Asset Y, Long Beta * Asset X
    - Position = 0: Cash / Flat
    """
    df = prices_df[[ticker_y, ticker_x]].copy()
    
    # Calculate raw spread: Spread = Y - (alpha + beta * X)
    df["spread"] = df[ticker_y] - (alpha + beta * df[ticker_x])
    
    # Calculate rolling Z-Score
    df["spread_mean"] = df["spread"].rolling(window=lookback_window).mean()
    df["spread_std"] = df["spread"].rolling(window=lookback_window).std()
    df["z_score"] = (df["spread"] - df["spread_mean"]) / df["spread_std"]
    
    # State tracking
    n = len(df)
    positions = np.zeros(n)
    trade_signals = [None] * n  # 'ENTRY_LONG', 'ENTRY_SHORT', 'EXIT_TARGET', 'STOP_LOSS'
    
    current_pos = 0  # 0, +1, -1
    entry_bar = 0
    trade_log: List[Dict[str, Any]] = []
    
    current_trade: Optional[Dict[str, Any]] = None
    
    cost_factor = transaction_cost_bps / 10_000.0

    for i in range(lookback_window, n):
        z = df["z_score"].iloc[i]
        date = df.index[i]
        price_y = df[ticker_y].iloc[i]
        price_x = df[ticker_x].iloc[i]

        if np.isnan(z):
            positions[i] = 0
            continue

        # Check existing position
        if current_pos == 1:
            # Currently Long Spread (expecting Z to rise)
            if z >= -exit_z:  # Reversion achieved
                current_pos = 0
                trade_signals[i] = "EXIT_TARGET"
                if current_trade:
                    current_trade["exit_date"] = date
                    current_trade["exit_price_y"] = price_y
                    current_trade["exit_price_x"] = price_x
                    current_trade["exit_z"] = z
                    current_trade["exit_reason"] = "Target Convergence"
                    trade_log.append(current_trade)
                    current_trade = None
            elif z <= -stop_loss_z:  # Severe divergence stop loss
                current_pos = 0
                trade_signals[i] = "STOP_LOSS"
                if current_trade:
                    current_trade["exit_date"] = date
                    current_trade["exit_price_y"] = price_y
                    current_trade["exit_price_x"] = price_x
                    current_trade["exit_z"] = z
                    current_trade["exit_reason"] = "Stop Loss"
                    trade_log.append(current_trade)
                    current_trade = None

        elif current_pos == -1:
            # Currently Short Spread (expecting Z to fall)
            if z <= exit_z:  # Reversion achieved
                current_pos = 0
                trade_signals[i] = "EXIT_TARGET"
                if current_trade:
                    current_trade["exit_date"] = date
                    current_trade["exit_price_y"] = price_y
                    current_trade["exit_price_x"] = price_x
                    current_trade["exit_z"] = z
                    current_trade["exit_reason"] = "Target Convergence"
                    trade_log.append(current_trade)
                    current_trade = None
            elif z >= stop_loss_z:  # Severe divergence stop loss
                current_pos = 0
                trade_signals[i] = "STOP_LOSS"
                if current_trade:
                    current_trade["exit_date"] = date
                    current_trade["exit_price_y"] = price_y
                    current_trade["exit_price_x"] = price_x
                    current_trade["exit_z"] = z
                    current_trade["exit_reason"] = "Stop Loss"
                    trade_log.append(current_trade)
                    current_trade = None

        # Check new entries if flat
        if current_pos == 0:
            if z <= -entry_z:
                current_pos = 1  # Long Spread: Long Y, Short Beta * X
                trade_signals[i] = "ENTRY_LONG"
                current_trade = {
                    "direction": "LONG_SPREAD",
                    "entry_date": date,
                    "entry_price_y": price_y,
                    "entry_price_x": price_x,
                    "entry_z": z,
                }
            elif z >= entry_z:
                current_pos = -1  # Short Spread: Short Y, Long Beta * X
                trade_signals[i] = "ENTRY_SHORT"
                current_trade = {
                    "direction": "SHORT_SPREAD",
                    "entry_date": date,
                    "entry_price_y": price_y,
                    "entry_price_x": price_x,
                    "entry_z": z,
                }

        positions[i] = current_pos

    df["position"] = positions
    df["trade_signal"] = trade_signals

    # Position changes to apply transaction costs
    df["position_shift"] = df["position"].shift(1).fillna(0)
    df["trade_occurred"] = (df["position"] != df["position_shift"]).astype(int)

    # Daily returns calculation
    ret_y = df[ticker_y].pct_change().fillna(0)
    ret_x = df[ticker_x].pct_change().fillna(0)

    # Spread return is: pos * (ret_y - weight_x * ret_x)
    # where weight_x is normalized beta * price_x / (price_y + beta * price_x)
    total_dollar = df[ticker_y] + beta * df[ticker_x]
    w_y = df[ticker_y] / total_dollar
    w_x = (beta * df[ticker_x]) / total_dollar

    spread_return = df["position_shift"] * (w_y * ret_y - w_x * ret_x)

    # Deduct transaction costs when position changes
    # Each entry or exit incurs cost on both legs
    friction_cost = df["trade_occurred"] * cost_factor * 2.0
    strategy_return = spread_return - friction_cost

    df["strategy_return"] = strategy_return
    df["cum_return"] = (1.0 + strategy_return).cumprod()
    df["portfolio_value"] = initial_capital * df["cum_return"]

    # Benchmark returns: equal-weight buy & hold of KO & PEP
    df["bnh_y"] = (1.0 + ret_y).cumprod()
    df["bnh_x"] = (1.0 + ret_x).cumprod()
    df["bnh_portfolio"] = 0.5 * df["bnh_y"] + 0.5 * df["bnh_x"]

    # Compute trade return in trade_log
    for trade in trade_log:
        if "exit_date" in trade:
            duration = (pd.to_datetime(trade["exit_date"]) - pd.to_datetime(trade["entry_date"])).days
            trade["duration_days"] = duration
            p_y0, p_y1 = trade["entry_price_y"], trade["exit_price_y"]
            p_x0, p_x1 = trade["entry_price_x"], trade["exit_price_x"]
            ret_y_trade = (p_y1 - p_y0) / p_y0
            ret_x_trade = (p_x1 - p_x0) / p_x0
            if trade["direction"] == "LONG_SPREAD":
                gross_pnl = 0.5 * ret_y_trade - 0.5 * ret_x_trade
            else:
                gross_pnl = -0.5 * ret_y_trade + 0.5 * ret_x_trade
            net_pnl = gross_pnl - 2.0 * cost_factor
            trade["net_pnl_pct"] = float(net_pnl * 100)
            trade["is_win"] = bool(net_pnl > 0)

    trades_df = pd.DataFrame(trade_log)

    return {
        "results_df": df,
        "trades_df": trades_df,
        "total_trades": len(trades_df),
        "win_rate": float(trades_df["is_win"].mean()) if len(trades_df) > 0 else 0.0,
        "final_portfolio_value": float(df["portfolio_value"].iloc[-1]),
        "total_return_pct": float((df["cum_return"].iloc[-1] - 1.0) * 100),
    }
