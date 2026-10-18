# Methodology and limitations

## FP&A

For each company, use the latest eligible annual SEC filing as the reported baseline. Let reported revenue be `R0`, prior-year revenue `R−1`, reported operating income `O0`, historical growth `g0 = R0/R−1 − 1`, and historical operating margin `m0 = O0/R0`.

- Base projected revenue: `Rb = R0(1 + g0)`
- Base projected operating income: `Ob = Rb × m0`
- Scenario projected revenue: `Rs = R0(1 + gs)`
- Scenario projected operating income: `Os = Rs × ms`
- Growth effect: `(Rs − Rb) × m0`
- Margin effect: `Rs × (ms − m0)`

The two effects sum exactly to `Os − Ob`. This is an illustrative driver model, not official company guidance. Fiscal year ends differ among companies.

## Pair signal and backtest

For a historical close at index `t`, fit `Y = α + βX + ε` on exactly the preceding **252 aligned trading sessions** `[t−252, t)`. The residual mean and sample standard deviation use the last **60** residuals in that formation window. The selected-day adjusted research prices enter only the observed spread and z-score. A two-step Engle–Granger cointegration test uses the same formation window, with one lag and no automatic lag search. A fresh entry requires `p < 0.05`, positive β, and `|z| ≥ 2`. No signal is shown if these tests fail.

After observing a qualifying close, simulate an equal-dollar long/short allocation at the **next available close**. Begin with $10,000, allocate half the then-current equity to each leg, and hold fixed shares until exit. Apply 10 basis points to each leg on entry and exit; the entry total is 10 bps of gross capital. The modeled strategy exits after a closing z-score crosses ±0.5 toward the mean, reaches ±3.5 away from it, or reaches a 20-trading-session holding limit, with exit filled at the following close. Any open position is liquidated on the last sample close. The inverse uses the same dates and reverses leg directions; it is not independently optimized. The benchmark buys and holds equal dollar amounts of both stocks from the first eligible session.

The conditional target and stop are algebraic **levels for Y** at the selected close, holding X constant. They are not a forecast of Y's next quote. Historical fill and exit prices shown in the app are research-price series values.

## Interactive decision drill

The chart shows aligned adjusted research prices for both companies from the first eligible model day through 2024-12-20. Each line is divided by its own first displayed price and multiplied by 100 for comparison. The displayed dollar range is each stock's minimum and maximum adjusted research price in that same window. Trade markers represent the tested strategy only. Company investor sources document split histories; there are no split-event markers in this dataset. The KO series is especially limited by the separate, retrospectively produced archive described in `DATA_SOURCES.md`.

For a visitor-selected historical day, the what-if drill allows either pair direction even if the strategy's eligibility or entry rules did not support a trade. It allocates half the selected capital to each leg at the next available adjusted close. On each subsequent close it checks the same target, stop, and 20-session rules, then simulates an exit at the next close. It applies 10 basis points per leg per side to entry and exit. A trade still open at the sample end exits there. The workbook carries the same values and formulas for signed shares, gross P/L, costs, net P/L, and net return. This exercise is an ex-post scenario and **is never added to the tested strategy curve or trade count**. Outcomes near the end of the sample are truncated by the fixed cutoff.

## Limits

- Repeated daily cointegration tests can produce false positives. A low p-value is not a guarantee of future mean reversion.
- The source archives do not give a uniform point-in-time raw close for KO. Retrospective adjustment and mixed data sources limit historical precision.
- The backtest excludes short-borrow fees, financing, dividends not captured consistently by the source series, taxes, market impact, intraday execution, and changing capital requirements. It therefore should not be used to place trades.
- The benchmark has long-only exposure and is a context reference, not a risk-matched competitor.
- Thresholds are fixed for this demonstration. This small number of trades cannot establish statistical robustness or a predictive edge.
