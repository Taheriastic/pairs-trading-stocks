import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const financials = JSON.parse(readFileSync(path.join(root, 'data/financials.json'), 'utf8'));
const names = { KO: 'Coca-Cola', PEP: 'PepsiCo', MSFT: 'Microsoft', ORCL: 'Oracle' };
const mText = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = Object.values(financials.companies).map(c =>
  `    {${[names[c.symbol], c.symbol, c.period_end].map(mText).join(', ')}, ${c.revenue}, ${c.prior_revenue}, ${c.operating_income}, ${mText(c.filing_url)}, ${mText(financials.as_of)}}`
).join(',\n');
const actuals = `let
  Source = #table(type table [Company=text, Ticker=text, FiscalYearEnd=text, RevenueUSD=number, PriorRevenueUSD=number, OperatingIncomeUSD=number, FilingURL=text, FinancialCutoff=text], {\n${rows}\n  }),
  Dates = Table.TransformColumnTypes(Source, {{"FiscalYearEnd", type date}, {"FinancialCutoff", type date}}),
  Growth = Table.AddColumn(Dates, "ReportedGrowth", each [RevenueUSD] / [PriorRevenueUSD] - 1, type number),
  Margin = Table.AddColumn(Growth, "ReportedMargin", each [OperatingIncomeUSD] / [RevenueUSD], type number),
  RevenueB = Table.AddColumn(Margin, "RevenueB", each [RevenueUSD] / 1000000000, type number),
  IncomeB = Table.AddColumn(RevenueB, "OperatingIncomeB", each [OperatingIncomeUSD] / 1000000000, type number),
  Sensitivity = Table.AddColumn(IncomeB, "OnePointMarginImpactB", each [RevenueUSD] * 0.01 / 1000000000, type number)
in
  Sensitivity
`;
const scenarios = `let
  GrowthSteps = Table.AddColumn(Financials, "GrowthChangePP", each {-10, -5, 0, 5, 10}),
  GrowthRows = Table.ExpandListColumn(GrowthSteps, "GrowthChangePP"),
  MarginSteps = Table.AddColumn(GrowthRows, "MarginChangePP", each {-2, -1, 0, 1, 2}),
  MarginRows = Table.ExpandListColumn(MarginSteps, "MarginChangePP"),
  Types = Table.TransformColumnTypes(MarginRows, {{"GrowthChangePP", type number}, {"MarginChangePP", type number}}),
  AssumedGrowth = Table.AddColumn(Types, "ScenarioGrowth", each [ReportedGrowth] + [GrowthChangePP] / 100, type number),
  AssumedMargin = Table.AddColumn(AssumedGrowth, "ScenarioMargin", each [ReportedMargin] + [MarginChangePP] / 100, type number),
  BaseRevenue = Table.AddColumn(AssumedMargin, "BaseRevenueB", each [RevenueB] * (1 + [ReportedGrowth]), type number),
  BaseIncome = Table.AddColumn(BaseRevenue, "BaseOperatingIncomeB", each [BaseRevenueB] * [ReportedMargin], type number),
  Revenue = Table.AddColumn(BaseIncome, "ScenarioRevenueB", each [RevenueB] * (1 + [ScenarioGrowth]), type number),
  Income = Table.AddColumn(Revenue, "ScenarioOperatingIncomeB", each [ScenarioRevenueB] * [ScenarioMargin], type number),
  GrowthEffect = Table.AddColumn(Income, "GrowthEffectB", each ([ScenarioRevenueB] - [BaseRevenueB]) * [ReportedMargin], type number),
  MarginEffect = Table.AddColumn(GrowthEffect, "MarginEffectB", each [ScenarioRevenueB] * ([ScenarioMargin] - [ReportedMargin]), type number),
  Change = Table.AddColumn(MarginEffect, "OperatingIncomeChangeB", each [ScenarioOperatingIncomeB] - [BaseOperatingIncomeB], type number),
  Check = Table.AddColumn(Change, "BridgeResidualB", each [GrowthEffectB] + [MarginEffectB] - [OperatingIncomeChangeB], type number)
in
  Check
`;
const bridge = `let
  Steps = Table.AddColumn(ScenarioGrid, "Bridge", each {
    [Step="1 Base operating income", AmountB=[BaseOperatingIncomeB]],
    [Step="2 Revenue growth effect", AmountB=[GrowthEffectB]],
    [Step="3 Operating margin effect", AmountB=[MarginEffectB]]
  }),
  Rows = Table.ExpandListColumn(Steps, "Bridge"),
  Values = Table.ExpandRecordColumn(Rows, "Bridge", {"Step", "AmountB"}),
  Types = Table.TransformColumnTypes(Values, {{"Step", type text}, {"AmountB", type number}})
in
  Types
`;
const out = path.join(root, 'powerbi');
mkdirSync(out, { recursive: true });
for (const [name, code] of Object.entries({ Financials: actuals, ScenarioGrid: scenarios, VarianceBridge: bridge })) {
  writeFileSync(path.join(out, `${name}.pq`), code);
}
for (const company of Object.values(financials.companies)) {
  for (const dg of [-10, -5, 0, 5, 10]) for (const dm of [-2, -1, 0, 1, 2]) {
    const r = company.revenue / 1e9;
    const rb = r * (1 + company.growth);
    const rs = r * (1 + company.growth + dg / 100);
    const ms = company.operating_margin + dm / 100;
    const change = rs * ms - rb * company.operating_margin;
    const bridge = (rs - rb) * company.operating_margin + rs * (ms - company.operating_margin);
    if (Math.abs(change - bridge) > 1e-10) throw Error('Variance bridge does not reconcile');
  }
}
if (Math.abs(financials.companies.MSFT.revenue * .01 / 1e9 - 2.45122) > 1e-10) throw Error('Sensitivity mismatch');
console.log('Generated three Power Query sources; reconciled 100 company scenarios and Microsoft sensitivity.');
