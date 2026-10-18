let
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
