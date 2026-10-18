# Twenty-year pairs strategy study — 18 October 2026

## Result

**No tested method earned promotion as a validated trading strategy for either pair.** More permissive rules generated hundreds of trades, but none of the 96 predefined candidates for either pair met the development screen of positive after-cost return and at least 20 trades. The selection protocol therefore nominated no candidate for validation or final evaluation. This result does not show that no pairs strategy could ever work; it is a finding about these pairs, prices, costs, and candidate rules.

The live app keeps its older, explicitly dated educational simulation. The study's aggregate results can be displayed alongside it, but the new archive's raw price rows and precise entry levels are **not** deployed: the dataset publisher marks it CC0, yet the upstream provider's public-display rights and raw-versus-adjusted price lineage are not documented sufficiently to replace the existing snapshot.

## Data audit

- Candidate: [S&P 500 Stocks: 25 Years of Data (Updated Daily)](https://www.kaggle.com/datasets/darkmatternet/s-and-p-500-stocks-25-years-of-data-updated-daily), Kaggle version **202** (17 October 2026), publisher license label **CC0**.
- Downloaded ZIP SHA-256: `6b08f03040378dd59824673cdc8bd38f268ebdff83e881a3d965c709459db7b3`.
- KO, PEP, MSFT, and ORCL each have 6,738 rows from 2000-01-03 through 2026-10-16. The latest 20-year common sample contains **5,032 aligned sessions**, 2006-10-16 through 2026-10-16. No duplicate symbol-date records, weekend records, nonpositive prices, or gaps longer than five calendar days were found in this slice.
- The file supplies one `close` field, without separate raw close, adjusted close, dividends, or split events. Its history appears retrospectively adjusted: for example, its 2024-12-20 prices differ from the app's earlier pinned values. Around Coca-Cola's [2012 two-for-one split](https://investors.coca-colacompany.com/stock-info/splits), the series moves from $25.43 on August 10 to $25.37 on August 13, without a near-50% discontinuity. This is evidence of adjustment, **not** a verified adjustment methodology or executable quote history.
- The only daily move above 30% in the four-series study slice is ORCL +35.95% on 2025-09-10. [Contemporaneous reporting](https://www.bloomberg.com/news/articles/2025-09-09/oracle-posts-strong-bookings-following-openai-cloud-deal) described an approximately 36% earnings-driven surge. This was retained rather than silently removed.
- The archive metadata does not identify the upstream quote provider or establish permission to redistribute its prices publicly. Publisher CC0 metadata alone does not resolve that gap. The app therefore does not publish the new price rows.

## Predefined comparison

For each pair, the study tested 96 combinations: regression residual, log-price ratio, and 20-session relative-return distance; 126- or 252-session formation; 90th or 95th percentile entry; median or 65th percentile convergence exit; 10- or 20-session maximum hold; and either no correlation gate or a preceding-60-session return correlation of at least 0.30. Percentiles and relationships are recomputed from earlier closes only. A stop occurs at the 1st or 99th historical percentile. The existing 252-session, 2.0-z-score, Engle–Granger-gated model was run separately as a baseline.

The signal is observed after close *t*, with entry or exit filled at the next available close. Each trade begins with equal dollar long and short legs, 1× gross exposure and $10,000 starting capital. Trading costs are 10 basis points per leg on each entry and exit. The model excludes borrow fees, financing, taxes, impact, and intraday execution; adjusted-like research prices are not executable quotes.

The first 60% of sessions are development (through 2018-10-11); the next 20% are validation (through 2022-10-11); the final 20% are untouched evaluation (2022-10-12 through 2026-10-16). The selection rule requires at least 20 development trades and positive development return, then ranks the ten development survivors by annualized return divided by the larger of 10% or maximum drawdown. It would choose among survivors using the same score and at least 12 validation trades. **No candidate passed the development screen for either pair**, so the app has no selected rule. The final period was not used to choose one afterward.

| Pair and rule | Full-period trades | Full-period net return | Full-period max drawdown | Final-period net return | Status |
|---|---:|---:|---:|---:|---|
| KO–PEP, existing cointegration rule | 11 | −1.88% | −5.33% | 0.00% (0 trades) | Baseline |
| KO–PEP, best full-history candidate | 180 | −21.57% | −22.83% | −4.39% | Hindsight only |
| KO–PEP, most active candidate | 519 | −65.80% | −66.24% | −27.76% | Hindsight only |
| MSFT–ORCL, existing cointegration rule | 2 | −7.62% | −7.62% | −5.06% (1 trade) | Baseline |
| MSFT–ORCL, best full-history candidate | 291 | −33.30% | −58.43% | +18.03% | Hindsight only |
| MSFT–ORCL, most active candidate | 578 | −73.99% | −75.94% | −37.23% | Hindsight only |

“Best full-history” means least negative overall return among the 96; it is **not** a held-out result because that row was chosen using the full period. For context, equal-weight long-only buy-and-hold returned +360.81% for KO–PEP and +1,476.23% for MSFT–ORCL over the full window, with materially different market exposure and risk. The complete period metrics and configurations are in [`data/strategy_study.json`](data/strategy_study.json).

### Performance by calendar year

Each cell is the mark-to-market return for that year; parentheses give trades opened that year. The study starts reporting in 2007 after its first 252 formation sessions. The hindsight rule was selected using the full 20 years and is **not** a validated strategy. The JSON also records annual drawdown and losing trades for these methods and the most-active rule. The benchmark has long-only risk rather than matched long/short exposure.

| Year | KO–PEP baseline | KO–PEP hindsight | KO–PEP buy/hold | MSFT–ORCL baseline | MSFT–ORCL hindsight | MSFT–ORCL buy/hold |
|---|---:|---:|---:|---:|---:|---:|
| 2007 | -0.8% (1) | -0.1% (1) | +6.5% | +0.0% (0) | +5.2% (5) | +10.6% |
| 2008 | +0.0% (0) | -2.1% (15) | -25.0% | +0.0% (0) | +0.7% (23) | -33.3% |
| 2009 | -1.0% (3) | +3.6% (4) | +23.1% | +0.0% (0) | -3.4% (21) | +48.5% |
| 2010 | -1.5% (1) | -6.6% (18) | +15.5% | +0.0% (0) | -9.4% (13) | +12.2% |
| 2011 | +0.0% (0) | -2.2% (13) | +7.5% | +0.0% (0) | -6.6% (10) | -12.4% |
| 2012 | +0.0% (0) | -0.9% (4) | +6.5% | +0.0% (0) | -1.9% (3) | +20.7% |
| 2013 | +0.2% (1) | +2.3% (6) | +20.2% | +0.0% (0) | -5.8% (6) | +26.3% |
| 2014 | +0.0% (0) | +7.7% (17) | +10.2% | -2.7% (1) | +0.5% (8) | +22.6% |
| 2015 | -0.3% (1) | -0.5% (1) | +6.7% | +0.0% (0) | -4.0% (2) | +0.1% |
| 2016 | +0.2% (1) | -3.4% (13) | +3.3% | +0.0% (0) | -7.2% (15) | +11.3% |
| 2017 | +0.0% (0) | -4.4% (10) | +16.0% | +0.0% (0) | -0.8% (9) | +33.8% |
| 2018 | -0.8% (1) | -1.1% (10) | +1.3% | +0.0% (0) | -13.9% (32) | +11.0% |
| 2019 | +0.0% (0) | -0.4% (10) | +23.6% | +0.0% (0) | -14.9% (34) | +43.8% |
| 2020 | +0.0% (0) | -7.2% (12) | +6.7% | +0.0% (0) | -1.4% (24) | +37.1% |
| 2021 | +2.1% (2) | -0.8% (4) | +15.8% | +0.0% (0) | +8.5% (7) | +48.2% |
| 2022 | +0.0% (0) | -3.3% (10) | +8.7% | -5.1% (1) | -4.0% (10) | -22.2% |
| 2023 | +0.0% (0) | +2.1% (2) | -3.9% | +0.0% (0) | +1.6% (25) | +49.8% |
| 2024 | +0.0% (0) | +3.2% (13) | +0.7% | +0.0% (0) | -3.6% (8) | +25.6% |
| 2025 | +0.0% (0) | -6.5% (12) | +7.7% | +0.0% (0) | +36.2% (12) | +16.5% |
| 2026 | +0.0% (0) | -2.3% (5) | +19.3% | +0.0% (0) | -6.4% (24) | -5.0% |

## Reproduce and interpret

With the archived version-202 ZIP obtained from Kaggle, run `PYTHONPATH=. .venv/bin/python scripts/strategy_study.py /path/to/archive.zip --output data/strategy_study.json`. The script verifies the archive structure, records its checksum, aligns the four stocks, generates the bounded comparison, and writes aggregate JSON. Review the checksum and source before replacing the pinned results. The candidate grid and selection rule live in the script; changing them creates a new study and requires a fresh untouched evaluation period.

This is a historical educational test, not a current recommendation. The final-period outcomes show why maximizing opportunities or selecting a favorable rule after viewing all years would be misleading.
