let
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
