# Power BI FP&A report

This report uses the existing public SEC financial snapshot, selected as of **23 December 2024**, independently of the price study's later cutoff. Coca-Cola and PepsiCo use FY2023; Microsoft and Oracle use FY2024. Exact fiscal year ends and SEC accession URLs are included in the model and report.

## Reproduce the model

Run `node scripts/build_power_bi.mjs` from the repository root. In Power BI Power Query, create queries named `Financials`, `ScenarioGrid`, and `VarianceBridge`, pasting the corresponding `.pq` sources into the Advanced editor in that order. These sources contain public filing figures only; no account credentials or live connections are needed.

- `Financials`: four reported company records, growth, margin, amounts in USD billions, and sensitivity to a one-percentage-point margin change at reported revenue.
- `ScenarioGrid`: 25 illustrative assumptions per company. Growth changes are -10, -5, 0, +5, +10 percentage points; margin changes are -2, -1, 0, +1, +2 percentage points relative to reported rates. These are discrete scenarios, not predictions or fitted probabilities.
- `VarianceBridge`: three calculation steps for each scenario: base operating income, revenue growth effect, and operating margin effect. The native waterfall's total is scenario operating income. Sort by Step ascending.

The scenario page must use single-selection company, growth-change, and margin-change slicers **from VarianceBridge**. Do not sum different scenarios. The company comparison uses Financials rather than the repeated scenario rows. No relationship between the tables is required for these separate pages.

## Financial interpretation

Base projected revenue repeats historical growth, and base operating income repeats the reported margin. The formulas match `scenarioFor` in `web/lib/server.ts` and `METHODOLOGY.md`. Growth effect plus margin effect reconciles to the change in operating income.

Microsoft FY2024 reported revenue is $245.122B; a one-percentage-point margin change at that fixed revenue implies **$2.45122B** of operating-income sensitivity. This is a modeled sensitivity, not realized savings, investment returns, or a company forecast. A scenario that also projects revenue growth has a different margin effect because it uses projected revenue.

## Verification and access

The report was authored in the Power BI browser service using a **Microsoft Fabric (Free)** license, with no trial, paid capacity, or Azure deployment. The report pages are Company comparison, Scenario planning, and Sources & definitions.

In Power BI, baseline and +5pp growth / +1pp margin scenarios were checked for all four companies. Rounded operating-income results in USD billions were:

| Company | Base projection | Changed scenario |
| --- | ---: | ---: |
| Coca-Cola | 12.03 | 13.11 |
| PepsiCo | 12.69 | 14.30 |
| Microsoft | 126.58 | 135.01 |
| Oracle | 16.28 | 17.63 |

The generation script independently checks all 100 variance bridges and Microsoft's fixed-revenue sensitivity. These checks complement the report review; they do not establish that a new report version has been published.

Public embedding was attempted on 18 October 2026. The tenant returned: **“Contact your admin to enable embed code creation.”** Do not describe the app as containing a publicly embedded live Power BI report. The intended public fallback is an authentic exported report preview/download. A workspace link requires authorized sign-in and is not a public sharing link.

The app includes the original PDF and PBIX exported from the service, plus three PNG previews rendered directly from that PDF. The PBIX contains imported data and all three report pages; no live credentials are required. Browser report behavior was verified in the service; opening the PBIX in Windows Desktop was not tested on this Mac. The public preview is static, and the app's existing operating-outlook controls remain the way to change assumptions in the browser.

`manifest.json` pins the financial snapshot and exported artifacts with SHA-256 hashes. Regenerating the Power Query sources does not regenerate the exported report. Re-author, verify, export, and render the report if its source snapshot changes; update the manifest only after that review.

Run `node scripts/check_power_bi.mjs http://localhost:3011` against a running production build. It checks the pinned artifacts, reconciles all eight observed Power BI results with the app API and the formulas in downloaded Excel workbooks, and verifies that PDF/PBIX/PNG files are served. Excel formulas are evaluated independently for this check; this does not claim a native Excel Desktop recalculation test.

Report ID: `ae6adcf8-7c5f-4710-abd8-f402fb88a650`. Workspace report: https://app.powerbi.com/groups/dbcace42-580f-413c-ac2c-b7c8036ebd6e/reports/ae6adcf8-7c5f-4710-abd8-f402fb88a650/
