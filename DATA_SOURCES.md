# Data sources and cutoff

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

## Separate 20-year research archive

The [strategy study](STRATEGY_STUDY.md) audited a newer Kaggle archive containing KO, PEP, MSFT, and ORCL through 2026-10-16. Its publisher labels the archive CC0, but the metadata does not document upstream price rights. Its one `close` field appears retrospectively adjusted, without raw closes or split/dividend event rows. The archive is used only to generate local research and aggregate results in `data/strategy_study.json`; its price rows and trade-specific levels are not shipped with the web app. The interactive simulator continues to use the separately pinned 2024 snapshot described above.
