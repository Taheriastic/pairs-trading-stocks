# Data sources and cutoff

## Current daily lab: 2006–2026

`data/daily_lab.json` is the current chart and replay source: **5,032 common sessions, 2006-10-16 through 2026-10-16**, plus 252 earlier lead-in sessions for the first decision. It contains normalized analytical indices (100 at study start), not raw dollar quotes. The source is the publisher-labeled CC0 [Kaggle version-202 archive](https://www.kaggle.com/datasets/darkmatternet/s-and-p-500-stocks-25-years-of-data-updated-daily), dated 2026-10-17; SHA-256 `6b08f03040378dd59824673cdc8bd38f268ebdff83e881a3d965c709459db7b3`.

The previous aggregate-only display scope has been revised for this research interface: normalized analytical indices are displayed under the publisher's CC0 label, with the upstream provenance limitation disclosed. This is not a claim that an upstream market-data license or a complete adjustment methodology has been independently established. No executable nominal quote or current trading signal is presented.

`scripts/build_daily_lab.py` rejects changed archives, duplicate symbol/dates, missing aligned observations, weekend rows, gaps longer than five calendar days, and nonpositive/nonfinite values. All four series' daily returns agree with the separately pinned historical adjusted prices over **2,005 overlapping sessions**, with a maximum return difference below 0.0000012. The archive's adjustment lineage and incremental vintage process remain limitations. The Coca-Cola 2012 split remains smooth; this consistency check does not replace a complete corporate-action audit. The current methodology and full results are in [DAILY_STRATEGY_REPORT.md](DAILY_STRATEGY_REPORT.md).

## Legacy 2024 simulator and current financial filings

The committed dataset represents information selected for a **2024-12-23 cutoff**. The latest daily price observation is 2024-12-20, the preceding trading session. No live feed is used.

| Data | Source | License / access | Used fields |
|---|---|---|---|
| PEP, MSFT, ORCL daily history | [S&P 500 Stocks](https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks), archive dated 2024-12-23 | CC0, verified through Kaggle dataset metadata | Date, Symbol, Adj Close, Close |
| KO daily history | [Coca Cola Stock Daily Updated](https://www.kaggle.com/datasets/isaaclopgu/coca-cola-stock-daily-updated), archive dated 2025-12-31 | CC0, verified through Kaggle dataset metadata | Date, Close |
| Annual company statements | [SEC companyfacts API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Public SEC filings, no API key | Revenue and operating income from filed 10-K facts |

The first archive contains 3,768 KO date rows but **no populated KO price rows**. The separate KO archive is used after this audit. The KO `Close` column is treated as an adjusted-like research series; it is not presented as a raw nominal trading quote. Since that archive was produced after 2024, later corporate action adjustments may affect historical values. This is disclosed in the UI and limits a strict point-in-time price-data claim.

The other symbols use `Adj Close` for analysis and `Close` only for source inspection. Cross-source adjustment methods may differ. Equal-weight returns are based on these research series and are illustrative.

Financial values are selected from annual-duration, consolidated US-GAAP facts in 10-Ks filed by the cutoff. The earliest eligible filing for each annual period is used, avoiding later restatements where the SEC API has multiple entries. Latest matched annual revenue and operating income are shown, with the previous annual revenue used for growth. The exact accession and source URL for each company are in `data/financials.json`.

`data/manifest.json` records row counts, license metadata, archive SHA-256 checksums, and sources. `scripts/prepare_data.py` refuses changed price archives. Updating the dataset requires a new review, checksum, date label, calculations, and tests.

## Archived aggregate-only study

The earlier [strategy study](STRATEGY_STUDY.md) audited the version-202 archive and initially displayed only aggregate results. That release kept its 2024 interactive simulator. The current daily lab revises that display scope as documented at the top of this file; the archive's upstream provenance and adjustment limitations remain disclosed. The earlier study used the first 252 sessions for formation inside its sample. The current lab uses 252 additional sessions before the 20-year window, so every displayed return covers the full period.
