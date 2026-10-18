"""
Historical Market Data Ingestion & Preprocessing
"""

from typing import List, Tuple, Optional
import pandas as pd
import numpy as np
import yfinance as yf


def fetch_pair_data(
    ticker_y: str = "KO",
    ticker_x: str = "PEP",
    start_date: str = "2018-01-01",
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch adjusted closing prices for a pair of assets from Yahoo Finance.
    
    Args:
        ticker_y: Primary ticker (dependent variable in cointegration regression)
        ticker_x: Benchmark/Hedge ticker (independent variable)
        start_date: Start date string (YYYY-MM-DD)
        end_date: End date string (YYYY-MM-DD). Defaults to latest available if None.
        
    Returns:
        pd.DataFrame with cleaned, aligned adjusted closing prices and returns.
    """
    tickers = [ticker_y, ticker_x]
    data = yf.download(
        tickers=tickers,
        start=start_date,
        end=end_date,
        progress=False,
        auto_adjust=False,
    )

    if "Adj Close" in data:
        prices = data["Adj Close"]
    elif "Close" in data:
        prices = data["Close"]
    else:
        raise ValueError("Price data does not contain 'Adj Close' or 'Close' columns.")

    # Reorder columns to ensure [ticker_y, ticker_x]
    df = prices[[ticker_y, ticker_x]].dropna().copy()
    df.columns = [ticker_y, ticker_x]

    # Calculate returns
    df[f"{ticker_y}_ret"] = df[ticker_y].pct_change()
    df[f"{ticker_x}_ret"] = df[ticker_x].pct_change()
    
    # Calculate log returns
    df[f"{ticker_y}_log_ret"] = np.log(df[ticker_y] / df[ticker_y].shift(1))
    df[f"{ticker_x}_log_ret"] = np.log(df[ticker_x] / df[ticker_x].shift(1))

    # Price ratio
    df["price_ratio"] = df[ticker_y] / df[ticker_x]

    return df


def calculate_summary_stats(df: pd.DataFrame, ticker_y: str, ticker_x: str) -> dict:
    """
    Calculate summary statistics, correlations, and annualized volatilities.
    """
    ret_y = df[f"{ticker_y}_ret"].dropna()
    ret_x = df[f"{ticker_x}_ret"].dropna()
    
    pearson_corr = df[ticker_y].corr(df[ticker_x])
    ret_corr = ret_y.corr(ret_x)
    
    ann_vol_y = ret_y.std() * np.sqrt(252)
    ann_vol_x = ret_x.std() * np.sqrt(252)

    return {
        "price_correlation": float(pearson_corr),
        "return_correlation": float(ret_corr),
        f"{ticker_y}_ann_vol": float(ann_vol_y),
        f"{ticker_x}_ann_vol": float(ann_vol_x),
        "observations": int(len(df)),
        "start_date": str(df.index[0].strftime("%Y-%m-%d")),
        "end_date": str(df.index[-1].strftime("%Y-%m-%d")),
    }
