# Daily strategy research — 18 October 2026

The app uses **5,032 common daily sessions from 2006-10-16 through 2026-10-16**, plus a 252-session lead-in for prior-price calculations. Every daily decision uses information known through that close and executes at the next close. The first signal is on the first study day. Fixed units are held until a direction switch; there is no imaginary daily transaction when the position stays the same. The final close liquidates the position.

## Ten-rule exploratory menu

The menu was specified after the earlier 96-variant study, so these are exploratory results, not an untouched test. The app defaults to monthly loser rotation as a transparent long-only example; it is not labeled the best strategy. Long/short reversal and relative-trend controls are available alongside three long-only rotations. No result is forced to be profitable. Full-history rankings are hindsight.

Each position begins at 1× gross exposure with $10,000 initial capital and 10 basis points per leg on entry and exit. A switch closes the old position and opens the new one, charging both sides. Borrow fees, financing, taxes, impact and intraday fills are excluded. This is daily research, not high-frequency trading.

## KO-PEP

| Rule | Exposure | Net return | Annualized | Drawdown | Positions | Losses |
|---|---|---:|---:|---:|---:|---:|
| Daily loser / winner | Long / short | -99.25% | -21.73% | -99.28% | 2571 | 1752 |
| Weekly relative reversal | Long / short | -85.32% | -9.16% | -85.57% | 1119 | 681 |
| Monthly relative reversal | Long / short | -63.65% | -4.94% | -67.71% | 523 | 292 |
| Quarterly relative reversal | Long / short | -35.97% | -2.21% | -41.76% | 321 | 183 |
| Fast ratio convergence | Long / short | -63.26% | -4.89% | -67.30% | 645 | 335 |
| Annual ratio convergence | Long / short | -27.37% | -1.59% | -39.33% | 156 | 77 |
| Relative trend control | Long / short | -60.53% | -4.55% | -66.97% | 321 | 231 |
| Weekly loser rotation | Long only | 98.42% | 3.49% | -38.35% | 526 | 251 |
| Monthly loser rotation | Long only | 356.28% | 7.90% | -38.15% | 121 | 41 |
| Monthly trend rotation | Long only | 285.63% | 6.99% | -45.48% | 73 | 31 |

Equal-weight buy and hold returned **482.85%** with the same next-close entry and entry/exit cost rate. It owns both stocks and has market exposure.

## MSFT-ORCL

| Rule | Exposure | Net return | Annualized | Drawdown | Positions | Losses |
|---|---|---:|---:|---:|---:|---:|
| Daily loser / winner | Long / short | -98.16% | -18.13% | -98.18% | 2528 | 1436 |
| Weekly relative reversal | Long / short | -72.89% | -6.33% | -87.15% | 1105 | 581 |
| Monthly relative reversal | Long / short | -66.33% | -5.31% | -70.97% | 478 | 235 |
| Quarterly relative reversal | Long / short | -38.79% | -2.43% | -65.12% | 238 | 104 |
| Fast ratio convergence | Long / short | -18.39% | -1.01% | -52.57% | 556 | 229 |
| Annual ratio convergence | Long / short | -37.30% | -2.31% | -65.71% | 138 | 46 |
| Relative trend control | Long / short | -55.05% | -3.93% | -72.52% | 238 | 164 |
| Weekly loser rotation | Long only | 505.94% | 9.44% | -58.65% | 505 | 212 |
| Monthly loser rotation | Long only | 1144.15% | 13.46% | -44.02% | 126 | 52 |
| Monthly trend rotation | Long only | 1002.02% | 12.77% | -60.23% | 66 | 34 |

Equal-weight buy and hold returned **1660.94%** with the same next-close entry and entry/exit cost rate. It owns both stocks and has market exposure.

## Data audit and display scope

Input is the pinned Kaggle version-202 archive with SHA-256 `6b08f03040378dd59824673cdc8bd38f268ebdff83e881a3d965c709459db7b3`. The publisher labels it CC0. This release makes an explicit scope change from the earlier aggregate-only view: it displays normalized analytical indices under that publisher license, not raw dollar quotes. It does not claim the upstream provider or adjustment methodology has been independently certified. The former 2024 drill remains in source for reproducibility but is no longer the main interface.

All four series have aligned dates, positive finite values and no duplicate dates or weekends. The date set matches the XNYS exchange calendar (exchange-calendars 4.13.2) exactly, with zero missing or extra sessions. Daily returns agree with the separately pinned adjusted-price archive across 2,005 overlapping sessions per symbol, with a maximum absolute difference below 0.0000012 (0.00012 percentage points). Coca-Cola’s 2012 split is smooth in the adjusted-like series. This confirms return continuity and consistency, not a complete corporate-action audit. The source’s incremental-update process may still produce vintage or dividend-adjustment issues. Results are provisional historical research.

The source card does not independently establish upstream redistribution rights. Before commercial reuse, replace or license the feed with an explicitly authorized provider. This educational app presents normalized analytical indices and discloses the provenance limitation rather than calling them executable stock quotes.

[Dataset source](https://www.kaggle.com/datasets/darkmatternet/s-and-p-500-stocks-25-years-of-data-updated-daily). Annual statistics for every method are in `data/daily_results.json`, the app comparison, and the selected-method Excel export. SEC financials remain a distinct 2024 filing snapshot and are explicitly labeled.

## Reproduce

1. Obtain the pinned Kaggle archive and run `PYTHONPATH=. .venv/bin/python scripts/build_daily_lab.py /path/to/archive.zip`.
2. Run `node --experimental-strip-types scripts/summarize_daily_lab.mjs`.
3. Run `node --experimental-strip-types --test tests/daily_engine.test.mjs` and the existing Python tests.

The dashboard, report and workbook import the same deterministic TypeScript engine. The Excel replay sheet contains editable capital/cost cells and signed-unit, gross-P/L, cost and net-P/L formulas. Its full strategy path is frozen; editing replay assumptions does not silently regenerate the trading rule.
