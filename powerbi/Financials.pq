let
  Source = #table(type table [Company=text, Ticker=text, FiscalYearEnd=text, RevenueUSD=number, PriorRevenueUSD=number, OperatingIncomeUSD=number, FilingURL=text, FinancialCutoff=text], {
    {"Coca-Cola", "KO", "2023-12-31", 45754000000, 43004000000, 11311000000, "https://www.sec.gov/Archives/edgar/data/21344/000002134424000009/", "2024-12-23"},
    {"PepsiCo", "PEP", "2023-12-30", 91471000000, 86392000000, 11986000000, "https://www.sec.gov/Archives/edgar/data/77476/000007747624000008/", "2024-12-23"},
    {"Microsoft", "MSFT", "2024-06-30", 245122000000, 211915000000, 109433000000, "https://www.sec.gov/Archives/edgar/data/789019/000095017024087843/", "2024-12-23"},
    {"Oracle", "ORCL", "2024-05-31", 52961000000, 49954000000, 15353000000, "https://www.sec.gov/Archives/edgar/data/1341439/000095017024075605/", "2024-12-23"}
  }),
  Dates = Table.TransformColumnTypes(Source, {{"FiscalYearEnd", type date}, {"FinancialCutoff", type date}}),
  Growth = Table.AddColumn(Dates, "ReportedGrowth", each [RevenueUSD] / [PriorRevenueUSD] - 1, type number),
  Margin = Table.AddColumn(Growth, "ReportedMargin", each [OperatingIncomeUSD] / [RevenueUSD], type number),
  RevenueB = Table.AddColumn(Margin, "RevenueB", each [RevenueUSD] / 1000000000, type number),
  IncomeB = Table.AddColumn(RevenueB, "OperatingIncomeB", each [OperatingIncomeUSD] / 1000000000, type number),
  Sensitivity = Table.AddColumn(IncomeB, "OnePointMarginImpactB", each [RevenueUSD] * 0.01 / 1000000000, type number)
in
  Sensitivity
