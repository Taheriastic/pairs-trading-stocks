import { readFileSync, writeFileSync } from "node:fs";
import {
  DAILY_RULES,
  simulateDaily,
  benchmarkDaily,
} from "../web/lib/dailyEngine.ts";
const data = JSON.parse(
  readFileSync(new URL("../data/daily_lab.json", import.meta.url)),
);
const output = {
  version: data.version,
  period: [data.start_date, data.end_date],
  sessions: data.sessions,
  cost_bps: 10,
  status:
    "Exploratory; created after prior research. No untouched evaluation period.",
  pairs: {},
  benchmarks: {},
};
const lines = [
  "# Daily strategy research — 18 October 2026",
  "",
  "The app uses **5,032 common daily sessions from 2006-10-16 through 2026-10-16**, plus a 252-session lead-in for prior-price calculations. Every daily decision uses information known through that close and executes at the next close. The first signal is on the first study day. Fixed units are held until a direction switch; there is no imaginary daily transaction when the position stays the same. The final close liquidates the position.",
  "",
  "## Ten-rule exploratory menu",
  "",
  "The menu was specified after the earlier 96-variant study, so these are exploratory results, not an untouched test. The app defaults to monthly loser rotation as a transparent long-only example; it is not labeled the best strategy. Long/short reversal and relative-trend controls are available alongside three long-only rotations. No result is forced to be profitable. Full-history rankings are hindsight.",
  "",
  "Each position begins at 1× gross exposure with $10,000 initial capital and 10 basis points per leg on entry and exit. A switch closes the old position and opens the new one, charging both sides. Borrow fees, financing, taxes, impact and intraday fills are excluded. This is daily research, not high-frequency trading.",
  "",
];
for (const pair of ["KO-PEP", "MSFT-ORCL"]) {
  output.pairs[pair] = {};
  lines.push(
    `## ${pair}`,
    "",
    "| Rule | Exposure | Net return | Annualized | Drawdown | Positions | Losses |",
    "|---|---|---:|---:|---:|---:|---:|",
  );
  for (const rule of DAILY_RULES) {
    const r = simulateDaily(data, pair, rule, 10),
      gross = simulateDaily(data, pair, rule, 0);
    output.pairs[pair][rule.id] = {
      rule,
      total_return: r.totalReturn,
      cagr: r.cagr,
      drawdown: r.drawdown,
      positions: r.trades.length,
      losses: r.trades.filter((t) => t.pnl < 0).length,
      cash_costs: r.costTotal,
      zero_cost_return: gross.totalReturn,
      annual: r.annual,
    };
    lines.push(
      `| ${rule.name} | ${rule.mode === "long" ? "Long only" : "Long / short"} | ${r.totalReturn.toFixed(2)}% | ${r.cagr.toFixed(2)}% | ${r.drawdown.toFixed(2)}% | ${r.trades.length} | ${r.trades.filter((t) => t.pnl < 0).length} |`,
    );
  }
  const benchmark = benchmarkDaily(data, pair, 10);
  output.benchmarks[pair] = {
    return_pct: 100 * (benchmark.at(-1) / 10000 - 1),
  };
  lines.push(
    "",
    `Equal-weight buy and hold returned **${output.benchmarks[pair].return_pct.toFixed(2)}%** with the same next-close entry and entry/exit cost rate. It owns both stocks and has market exposure.`,
    "",
  );
}
lines.push(
  "## Data audit and display scope",
  "",
  "Input is the pinned Kaggle version-202 archive with SHA-256 `" +
    data.source.sha256 +
    "`. The publisher labels it CC0. This release makes an explicit scope change from the earlier aggregate-only view: it displays normalized analytical indices under that publisher license, not raw dollar quotes. It does not claim the upstream provider or adjustment methodology has been independently certified. The former 2024 drill remains in source for reproducibility but is no longer the main interface.",
  "",
  "All four series have aligned dates, positive finite values and no duplicate dates or weekends. The date set matches the XNYS exchange calendar (exchange-calendars 4.13.2) exactly, with zero missing or extra sessions. Daily returns agree with the separately pinned adjusted-price archive across 2,005 overlapping sessions per symbol, with a maximum absolute difference below 0.0000012 (0.00012 percentage points). Coca-Cola’s 2012 split is smooth in the adjusted-like series. This confirms return continuity and consistency, not a complete corporate-action audit. The source’s incremental-update process may still produce vintage or dividend-adjustment issues. Results are provisional historical research.",
  "",
  "The source card does not independently establish upstream redistribution rights. Before commercial reuse, replace or license the feed with an explicitly authorized provider. This educational app presents normalized analytical indices and discloses the provenance limitation rather than calling them executable stock quotes.",
  "",
  "[Dataset source](" +
    data.source.url +
    "). Annual statistics for every method are in `data/daily_results.json`, the app comparison, and the selected-method Excel export. SEC financials remain a distinct 2024 filing snapshot and are explicitly labeled.",
  "",
  "## Reproduce",
  "",
  "1. Obtain the pinned Kaggle archive and run `PYTHONPATH=. .venv/bin/python scripts/build_daily_lab.py /path/to/archive.zip`.",
  "2. Run `node --experimental-strip-types scripts/summarize_daily_lab.mjs`.",
  "3. Run `node --experimental-strip-types --test tests/daily_engine.test.mjs` and the existing Python tests.",
  "",
  "The dashboard, report and workbook import the same deterministic TypeScript engine. The Excel replay sheet contains editable capital/cost cells and signed-unit, gross-P/L, cost and net-P/L formulas. Its full strategy path is frozen; editing replay assumptions does not silently regenerate the trading rule.",
);
writeFileSync(
  new URL("../data/daily_results.json", import.meta.url),
  JSON.stringify(output, null, 2) + "\n",
);
writeFileSync(
  new URL("../DAILY_STRATEGY_REPORT.md", import.meta.url),
  lines.join("\n") + "\n",
);
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(output.pairs).map(([p, r]) => [
        p,
        Object.fromEntries(
          Object.entries(r).map(([id, m]) => [
            id,
            {
              return: m.total_return,
              positions: m.positions,
              drawdown: m.drawdown,
            },
          ]),
        ),
      ]),
    ),
    null,
    2,
  ),
);
