"""Reproducible, bounded pairs-strategy study on a separately downloaded archive.

The input archive is research material; this script publishes only aggregate
results, not the provider's price rows. Run with a pinned Kaggle ZIP path.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from src.research import make_signals as baseline_signals, simulate as baseline_simulate

SYMBOLS = ("KO", "PEP", "MSFT", "ORCL")
PAIRS = (("KO", "PEP"), ("MSFT", "ORCL"))
CAPITAL = 10_000.0
COST_BPS = 10.0


def load_archive(path: Path) -> tuple[pd.DataFrame, dict]:
    rows: dict[str, dict[str, float]] = defaultdict(dict)
    duplicates = 0
    with zipfile.ZipFile(path) as archive, archive.open("sp500_stocks.csv") as handle:
        reader = csv.DictReader(line.decode("utf-8") for line in handle)
        if not {"date", "symbol", "close"}.issubset(reader.fieldnames or []):
            raise ValueError("Missing required price fields")
        for row in reader:
            symbol = row["symbol"]
            if symbol not in SYMBOLS:
                continue
            day = row["date"]
            if day in rows[symbol]:
                duplicates += 1
            rows[symbol][day] = float(row["close"])
    if duplicates:
        raise ValueError(f"Duplicate symbol-date rows: {duplicates}")
    frame = pd.DataFrame(rows).sort_index()
    missing_by_symbol = frame.isna().sum().to_dict()
    if any(missing_by_symbol.values()):
        raise ValueError(f"Missing common sessions: {missing_by_symbol}")
    if frame.empty or not np.isfinite(frame.to_numpy()).all() or (frame <= 0).any().any():
        raise ValueError("Missing, nonfinite, or nonpositive prices")
    latest = frame.index[-1]
    earliest = str((pd.Timestamp(latest) - pd.DateOffset(years=20)).date())
    frame = frame.loc[frame.index >= earliest, list(SYMBOLS)]
    if len(frame) < 750:
        raise ValueError("Too little common history")
    jumps = {}
    for symbol in SYMBOLS:
        change = frame[symbol].pct_change()
        jumps[symbol] = [{"date": day, "return_pct": round(float(value) * 100, 2)}
                         for day, value in change.items() if pd.notna(value) and abs(value) > 0.30]
    calendar = pd.to_datetime(frame.index)
    audit = {
        "archive_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "rows_by_symbol": {symbol: len(rows[symbol]) for symbol in SYMBOLS},
        "common_rows": len(frame), "start_date": frame.index[0], "end_date": latest,
        "large_daily_moves": jumps,
        "weekend_rows": int(sum(day.weekday() >= 5 for day in calendar)),
        "gaps_over_five_calendar_days": int(sum(gap.days > 5 for gap in calendar[1:] - calendar[:-1])),
        "source_fields": ["date", "open", "high", "low", "close", "volume", "symbol"],
        "price_interpretation": "retrospectively adjusted research close; no raw close or corporate-action rows",
    }
    return frame, audit


def percentile_signals(prices: pd.DataFrame, family: str, lookback: int) -> tuple[np.ndarray, np.ndarray]:
    """At t, compare its close with the relationship from [t-lookback, t)."""
    y = prices.iloc[:, 0].to_numpy(float)
    x = prices.iloc[:, 1].to_numpy(float)
    ly, lx = np.log(y), np.log(x)
    n = len(prices)
    pct = np.full(n, np.nan)
    corr = np.full(n, np.nan)
    if family == "distance":
        values = np.full(n, np.nan)
        values[20:] = (ly[20:] - ly[:-20]) - (lx[20:] - lx[:-20])
    elif family == "log_ratio":
        values = ly - lx
    elif family == "regression":
        values = None
    else:
        raise ValueError(family)
    for t in range(max(lookback, 21), n):
        if family == "regression":
            xx = x[t-lookback:t]
            yy = y[t-lookback:t]
            beta = np.cov(xx, yy, ddof=0)[0, 1] / np.var(xx)
            if not np.isfinite(beta) or beta <= 0:
                continue
            alpha = yy.mean() - beta * xx.mean()
            reference = yy - (alpha + beta * xx)
            observed = y[t] - (alpha + beta * x[t])
        else:
            reference = values[t-lookback:t]
            observed = values[t]
            if not np.isfinite(reference).all():
                continue
        pct[t] = (np.count_nonzero(reference < observed) + .5 * np.count_nonzero(reference == observed)) / len(reference)
        ry = np.diff(ly[t-60:t])
        rx = np.diff(lx[t-60:t])
        if np.std(ry) > 0 and np.std(rx) > 0:
            corr[t] = np.corrcoef(ry, rx)[0, 1]
    return pct, corr


def simulate(prices: pd.DataFrame, pct: np.ndarray, corr: np.ndarray, *,
             entry: float, exit_pct: float, hold: int, min_corr: float | None) -> dict:
    """Observe close t, enter/exit at t+1 close; mark fixed shares daily."""
    n = len(prices)
    values = prices.to_numpy(float)
    capital = CAPITAL
    trade = None
    pending = None
    curve = np.full(n, CAPITAL)
    trades = []
    for t in range(n):
        py, px = values[t]
        if pending:
            kind, payload = pending
            if kind == "exit" and trade:
                gross = trade["shares_y"] * (py - trade["entry_y"]) + trade["shares_x"] * (px - trade["entry_x"])
                exit_cost = COST_BPS / 10_000 * (abs(trade["shares_y"] * py) + abs(trade["shares_x"] * px))
                capital = trade["capital"] + gross - trade["entry_cost"] - exit_cost
                trades.append({"signal_date": str(prices.index[trade["signal_index"]]),
                               "entry_date": str(prices.index[trade["entry_index"]]),
                               "exit_date": str(prices.index[t]), "entry_index": trade["entry_index"],
                               "exit_index": t, "direction": trade["direction"],
                               "pnl": capital - trade["capital"], "reason": payload})
                trade = None
            elif kind == "entry" and trade is None:
                direction, signal_index = payload
                trade = {"direction": direction, "signal_index": signal_index,
                         "entry_index": t, "capital": capital,
                         "entry_y": py, "entry_x": px,
                         "entry_cost": capital * COST_BPS / 10_000,
                         "shares_y": direction * capital * .5 / py,
                         "shares_x": -direction * capital * .5 / px}
            pending = None
        if trade:
            curve[t] = (trade["capital"] + trade["shares_y"] * (py - trade["entry_y"])
                        + trade["shares_x"] * (px - trade["entry_x"]) - trade["entry_cost"])
        else:
            curve[t] = capital
        if t == n - 1:
            if trade:
                exit_cost = COST_BPS / 10_000 * (abs(trade["shares_y"] * py) + abs(trade["shares_x"] * px))
                capital = curve[t] - exit_cost
                curve[t] = capital
                trades.append({"signal_date": str(prices.index[trade["signal_index"]]),
                               "entry_date": str(prices.index[trade["entry_index"]]),
                               "exit_date": str(prices.index[t]), "entry_index": trade["entry_index"],
                               "exit_index": t, "direction": trade["direction"],
                               "pnl": capital - trade["capital"], "reason": "sample end"})
            break
        p = pct[t]
        if trade:
            direction = trade["direction"]
            held = t - trade["entry_index"]
            stopped = (p >= .99 if direction == -1 else p <= .01) if np.isfinite(p) else False
            target = (p <= exit_pct if direction == -1 else p >= 1-exit_pct) if np.isfinite(p) else False
            if stopped or target or held >= hold:
                pending = ("exit", "stop" if stopped else "target" if target else "time")
        elif t < n - 2 and np.isfinite(p) and (min_corr is None or (np.isfinite(corr[t]) and corr[t] >= min_corr)):
            direction = -1 if p >= entry else (1 if p <= 1-entry else 0)
            if direction:
                pending = ("entry", (direction, t))
    return {"curve": curve, "trades": trades}


def metrics(result: dict, start: int, end: int) -> dict:
    curve = result["curve"]
    segment = curve[start:end+1]
    base = curve[start-1] if start else CAPITAL
    peaks = np.maximum.accumulate(np.r_[base, segment])[1:]
    trades = [x for x in result["trades"] if start <= x["entry_index"] <= end]
    total = float(segment[-1] / base - 1)
    years = max((end-start+1)/252, 1/252)
    cagr = (segment[-1] / base) ** (1/years) - 1 if segment[-1] > 0 else -1
    dd = float(np.min(segment/peaks - 1))
    return {"return_pct": round(total*100, 3), "cagr_pct": round(cagr*100, 3),
            "drawdown_pct": round(dd*100, 3), "trades": len(trades),
            "losses": int(sum(x["pnl"] < 0 for x in trades)),
            "score": round(cagr/max(abs(dd), .10), 4) if total > 0 else None}


def annual_metrics(result: dict, dates: pd.Index) -> dict:
    years = sorted({str(day)[:4] for day in dates[252:]})
    return {year: metrics(result,
                          next(i for i in range(252, len(dates)) if str(dates[i])[:4] == year),
                          max(i for i in range(252, len(dates)) if str(dates[i])[:4] == year))
            for year in years}


def run(frame: pd.DataFrame, audit: dict) -> dict:
    n = len(frame)
    dev_end, validation_end = int(n*.6)-1, int(n*.8)-1
    output = {"audit": audit, "splits": {"development_end": frame.index[dev_end],
                                         "validation_end": frame.index[validation_end],
                                         "holdout_start": frame.index[validation_end+1]}, "pairs": {}}
    for y, x in PAIRS:
        prices = frame[[y, x]]
        candidates = []
        for family in ("regression", "log_ratio", "distance"):
            for lookback in (126, 252):
                pct, corr = percentile_signals(prices, family, lookback)
                for entry in (.90, .95):
                    for exit_pct in (.50, .65):
                        for hold in (10, 20):
                            for min_corr in (None, .30):
                                config = {"family": family, "lookback": lookback, "entry_percentile": entry,
                                          "exit_percentile": exit_pct, "max_hold": hold, "min_correlation": min_corr}
                                result = simulate(prices, pct, corr, entry=entry, exit_pct=exit_pct,
                                                  hold=hold, min_corr=min_corr)
                                candidates.append({"config": config, "result": result,
                                                   "development": metrics(result, 252, dev_end),
                                                   "validation": metrics(result, dev_end+1, validation_end),
                                                   "holdout": metrics(result, validation_end+1, n-1),
                                                   "full": metrics(result, 252, n-1)})
        # Screen on development only; validation chooses among survivors.
        developed = sorted((c for c in candidates if c["development"]["score"] is not None
                            and c["development"]["trades"] >= 20),
                           key=lambda c: c["development"]["score"], reverse=True)[:10]
        qualified = [c for c in developed if c["validation"]["score"] is not None
                     and c["validation"]["trades"] >= 12]
        selected = max(qualified, key=lambda c: (c["validation"]["score"], c["validation"]["trades"])) if qualified else None
        hindsight = max(candidates, key=lambda c: c["full"]["return_pct"])
        def present(c):
            if c is None:
                return None
            return {k: c[k] for k in ("config", "development", "validation", "holdout", "full")}
        baseline_rows = baseline_signals(prices)
        baseline = baseline_simulate(prices, baseline_rows)
        baseline_curve = np.r_[np.full(252, CAPITAL), [p["equity"] for p in baseline["curve"]]]
        day_to_index = {str(day): i for i, day in enumerate(prices.index)}
        baseline_result = {"curve": baseline_curve,
                           "trades": [{"entry_index": day_to_index[t["entry_date"]], "pnl": t["pnl"]}
                                      for t in baseline["trades"]]}
        equal_weight = CAPITAL * .5 * (prices.iloc[:, 0].to_numpy() / prices.iloc[0, 0]
                                        + prices.iloc[:, 1].to_numpy() / prices.iloc[0, 1])
        benchmark_result = {"curve": equal_weight, "trades": []}
        output["pairs"][f"{y}-{x}"] = {"tested_candidates": len(candidates),
                                         "developed_candidates": len(developed),
                                         "qualified_candidates": len(qualified),
                                         "selected": present(selected),
                                         "hindsight": present(hindsight),
                                         "family_hindsight": {family: present(max(
                                             (c for c in candidates if c["config"]["family"] == family),
                                             key=lambda c: c["full"]["return_pct"]))
                                             for family in ("regression", "log_ratio", "distance")},
                                         "most_active": present(max(candidates, key=lambda c: c["full"]["trades"])),
                                         "annual": {
                                             "cointegration_baseline": annual_metrics(baseline_result, prices.index),
                                             "hindsight": annual_metrics(hindsight["result"], prices.index),
                                             "most_active": annual_metrics(max(candidates, key=lambda c: c["full"]["trades"])["result"], prices.index),
                                             "equal_weight_benchmark": annual_metrics(benchmark_result, prices.index),
                                         },
                                         "cointegration_baseline": {period: metrics(baseline_result, lo, hi)
                                                                  for period, lo, hi in (("development", 252, dev_end),
                                                                                         ("validation", dev_end+1, validation_end),
                                                                                         ("holdout", validation_end+1, n-1),
                                                                                         ("full", 252, n-1))},
                                         "equal_weight_benchmark": {period: metrics(benchmark_result, lo, hi)
                                                                    for period, lo, hi in (("development", 252, dev_end),
                                                                                           ("validation", dev_end+1, validation_end),
                                                                                           ("holdout", validation_end+1, n-1),
                                                                                           ("full", 252, n-1))},
                                         "holdout_pass": bool(selected and selected["holdout"]["return_pct"] > 0
                                                              and selected["holdout"]["trades"] >= 12
                                                              and selected["holdout"]["drawdown_pct"] >= -20)}
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/strategy_study.json"))
    args = parser.parse_args()
    frame, audit = load_archive(args.archive)
    result = run(frame, audit)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"audit": audit, "splits": result["splits"],
                      "pairs": {k: {"selected": v["selected"], "hindsight": v["hindsight"],
                                     "baseline": v["cointegration_baseline"],
                                     "holdout_pass": v["holdout_pass"]} for k,v in result["pairs"].items()}}, indent=2))


if __name__ == "__main__":
    main()
