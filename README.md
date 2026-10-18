# Pairs Trading Stocks

[Open the live lab](https://pairs-trading-stocks.vercel.app/).

A daily strategy research workspace for **Coca-Cola / PepsiCo** and **Microsoft / Oracle**, covering **5,032 common trading sessions, 16 October 2006–16 October 2026**. It compares ten continuous pair and stock-rotation rules, with clickable charts, historical decision replays, a guided walkthrough, a full position ledger, and matching analysis reports and Excel exports. SEC financial scenarios have their own explicitly dated 2024 filing snapshot.

## What to try

1. Follow the six-step walkthrough or skip and reopen it from the header.
2. Select a pair and a rule. Price, equity and relative-gap charts share the complete 20-year history. Range buttons change the displayed window; the strategy continues from earlier history.
3. Change transaction costs, inspect a historical day, choose a position and holding period, then run a replay. Decisions fill at the next close. Visitor replays are separate from strategy performance.
4. Compare all ten rules by return, drawdown or number of positions. Open a completed position or inspect annual performance.
5. Export the selected method and replay. The workbook includes the 5,032-row equity path, annual results, position ledger, source checksum and editable replay P/L formulas.
6. Open Fundamentals for SEC-backed revenue/margin scenarios, their operating-income bridge and a separate financial-model Excel export.

## What the research found

The [daily-strategy report](DAILY_STRATEGY_REPORT.md) is the current app methodology and results. At 10 bps per leg per transaction, monthly loser **stock rotation** returned approximately **+356.3% for KO/PEP** and **+1,144.1% for MSFT/ORCL**, with maximum drawdowns of **−38.2%** and **−44.0%**. It owns one stock, with no short leg; it carries market exposure and does not demonstrate convergence. Other rules, including more active long/short reversals, lose money. The default is an educational example, not a validated winner or an optimized recommendation.

The ten-rule menu was created after a previous [96-variant study](STRATEGY_STUDY.md). Its full-history ranking is hindsight. There is no genuinely untouched evaluation period for these new exploratory rules. Daily closes cannot test high-frequency execution, and no rule guarantees profit.

## Run locally

The committed analytical snapshot is sufficient to run the app. Use Node.js 24 (Node.js 22.18+ also supports the TypeScript research scripts).

```bash
cd web
npm ci
npm run dev
```

For calculation checks:

```bash
node --experimental-strip-types --test tests/daily_engine.test.mjs
node --experimental-strip-types scripts/summarize_daily_lab.mjs
PYTHONPATH=. .venv/bin/python -m pytest -q tests
npm run lint --prefix web
npm run typecheck --prefix web
npm run build --prefix web
```

Python 3.12 and `requirements.txt` support the archive audit and the older research engine. To reproduce the new snapshot, obtain the checksum-pinned version-202 Kaggle ZIP and run `PYTHONPATH=. .venv/bin/python scripts/build_daily_lab.py /path/to/archive.zip`.

## Data and limitations

The current chart uses **normalized analytical indices**, starting at 100 on 2006-10-16, from a publisher-labeled CC0 archive. A 252-session lead-in allows the first study-day decision to use earlier observations. Daily returns match the previous adjusted-price data over 2,005 overlapping sessions per company. The upstream provider's rights and full adjustment methodology have not been independently established; these are provisional research values, not executable dollar quotes. See [DATA_SOURCES.md](DATA_SOURCES.md).

The dashboard, brief and study workbook share `web/lib/dailyEngine.ts`. No same-close fills or future data are used for decisions. The app shows losses, actual cash costs and long-only market exposure. Borrow fees, financing, taxes, impact and intraday fills are excluded. Stock prices are separate from the SEC operating scenario. The former 2024 simulator and Python engine remain for reproducibility and legacy export URLs; they are not the main dashboard.

## Deployment and development

Next.js runs on Vercel Hobby with committed snapshots and no live-feed credentials. Azure is not part of this release. See [DEPLOYMENT.md](DEPLOYMENT.md), [METHODOLOGY.md](METHODOLOGY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md).

MIT licensed code. Source datasets, brand names and SEC filings retain their provenance and terms. Company ticker monograms are identification marks created for this interface; they do not imply company endorsement.
