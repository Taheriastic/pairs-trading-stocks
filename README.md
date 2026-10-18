# Pairs Trading Stocks

Live app: [pairs-trading-stocks.vercel.app](https://pairs-trading-stocks.vercel.app/). The public Vercel deployment uses a fixed, sourced historical snapshot through 2024-12-20; no live quotes are supplied.

A filing-backed FP&A scenario planner and historical pairs research app for **Coca-Cola / PepsiCo** and **Microsoft / Oracle**. The dashboard is designed as a finance case study: it makes assumptions, sources, losses, and inactive periods visible. It is not a current trading signal service.

## What it does

- Compares reported annual revenue, revenue growth, operating income, and operating margin from SEC 10-K facts available by **2024-12-23**. Fiscal periods are labeled and may differ.
- Forecasts next-year revenue and operating income from user-selected growth and margin. A sequential bridge attributes change versus a base case to growth, then margin. Visitors can print a one-page brief and download a formula-driven Excel workbook.
- Shows a historical daily pair signal using a 252-session training window before the selected date, a 60-session residual reference window, and a cointegration eligibility gate. Simulated fills occur at the next close, with costs. It also shows the inverse result, an equal-weight buy-and-hold reference, drawdown, completed trades, and cash days.
- Opens with a four-step tutorial. A two-stock adjusted-price chart indexes both companies to 100, shows historical price ranges, and marks modeled entries and exits. Corporate split histories are linked to company investor sources.
- Includes a decision drill for any historical date with a following session: choose the long and short legs and capital, reveal the next-close entry and modeled exit, then open a one-page decision note or download a formula-driven trade analysis workbook. A what-if trade is clearly separate from the tested strategy.
- Uses **Next.js on Vercel** for the public site. An Azure Functions integration remains in the codebase but is not deployed or required by the app.

## Current sample findings

The fixed sample runs from 2018-01-03 through 2024-12-20 after its formation window. At the current parameters, KO/PEP has three completed trades and MSFT/ORCL has one. MSFT/ORCL loses money in the simulated strategy. These findings may change with source corrections or a new research snapshot. The app shows the full results, including the benchmark and costs.

## Run locally

Requires Node.js 22 and Python 3.12.

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt pytest
PYTHONPATH=. .venv/bin/python -m pytest -q tests
cd web
npm ci
npm run dev
```

Open `http://localhost:3000`. The app works without cloud credentials. The Python `src/research.py` module regenerates pair outputs with `PYTHONPATH=. .venv/bin/python scripts/build_analysis.py`.

## Data provenance

See [DATA_SOURCES.md](DATA_SOURCES.md) and [METHODOLOGY.md](METHODOLOGY.md). The committed price CSV and result JSON are a fixed research snapshot; rebuilding requires deliberate source validation. The main CC0 S&P 500 dataset has **empty KO rows**, so KO comes from a separate CC0 dataset. That KO dataset's `Close` is an adjusted-like research series and provides no distinct raw close. Historical entry and conditional levels are therefore **research-price levels**, not executable nominal quotes. The KO export was published after the research cutoff, so its retrospective adjustment may incorporate later corporate actions; this limits a strict claim of point-in-time price availability. Signal model fitting itself never reads observations from the signal date or later.

`python3 scripts/prepare_data.py` verifies the pinned price archives and reuses the committed SEC snapshot. To deliberately refresh SEC facts, set `SEC_USER_AGENT` to your own contact-bearing user agent before running the script. Review any regenerated values and sources before committing them.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel publication and verification steps. Do not describe the Azure integration as deployed; the user chose to continue on Vercel.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for tests, data refresh policy, and documentation expectations. Project-specific agent guidance is in [AGENTS.md](AGENTS.md).

MIT licensed code. Source datasets and SEC filings retain their own provenance and terms.
