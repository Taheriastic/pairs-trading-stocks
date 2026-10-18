import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { localAnalysis, validPair } from "@/lib/server";
import { replayWhatIf } from "@/lib/whatIf";
import { allowRequest, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!allowRequest(`trade-workbook:${clientKey(request)}`, 10))
    return NextResponse.json(
      { error: "Too many workbook requests" },
      { status: 429 },
    );
  const params = request.nextUrl.searchParams;
  const pair = params.get("pair") || "";
  const date = params.get("date") || "";
  const direction = Number(params.get("direction"));
  const capital = Number(params.get("capital"));
  if (
    !validPair(pair) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (direction !== 1 && direction !== -1) ||
    !Number.isFinite(capital) ||
    capital < 1000 ||
    capital > 1000000
  )
    return NextResponse.json(
      { error: "Invalid trade request" },
      { status: 400 },
    );
  const data = await localAnalysis(pair);
  const signal = data.signals.find((item) => item.date === date);
  const trade = replayWhatIf(data, date, direction, capital);
  if (!signal || !trade)
    return NextResponse.json(
      { error: "No following trading session" },
      { status: 400 },
    );
  const book = new ExcelJS.Workbook();
  book.creator = "Pairs Trading Stocks";
  book.subject = "Historical pair trade decision replay";
  book.calcProperties.fullCalcOnLoad = true;
  const sheet = book.addWorksheet("Trade replay");
  sheet.columns = [{ width: 39 }, { width: 24 }, { width: 60 }];
  sheet.getCell("A1").value = `${pair} | historical decision replay`;
  sheet.getCell("A2").value =
    "Fixed research snapshot through 2024-12-20 · not a live quote";
  const rows: Array<[number, string, string | number, string?]> = [
    [4, "Decision date", date],
    [
      5,
      "Model status",
      signal.action === "entry queued"
        ? "Qualified strategy entry"
        : "What-if only: strategy stayed out",
    ],
    [6, "Spread z-score", signal.z],
    [7, "Cointegration p-value", signal.pvalue],
    [
      8,
      "Gross capital (editable)",
      capital,
      "One times gross exposure; equal dollar legs",
    ],
    [
      9,
      "Direction (editable)",
      direction,
      "+1: long first / short second; -1: reverse",
    ],
    [10, "Entry date", trade.entry_date],
    [11, `${data.symbols[0]} entry adjusted price`, trade.entry_y],
    [12, `${data.symbols[1]} entry adjusted price`, trade.entry_x],
    [13, "Exit date", trade.exit_date],
    [14, "Exit reason", trade.reason],
    [15, `${data.symbols[0]} exit adjusted price`, trade.exit_y],
    [16, `${data.symbols[1]} exit adjusted price`, trade.exit_x],
    [
      23,
      "Transaction cost, bps per leg per side",
      data.model.cost_bps_per_leg_per_side,
    ],
  ];
  for (const [row, label, value, note] of rows) {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = value;
    if (note) sheet.getCell(`C${row}`).value = note;
  }
  const formulaRows: Array<[number, string, string, number]> = [
    [
      18,
      `${data.symbols[0]} signed shares`,
      "B9*B8/2/B11",
      (direction * capital) / 2 / trade.entry_y,
    ],
    [
      19,
      `${data.symbols[1]} signed shares`,
      "-B9*B8/2/B12",
      (-direction * capital) / 2 / trade.entry_x,
    ],
    [
      20,
      "Gross price P/L",
      "B18*(B15-B11)+B19*(B16-B12)",
      trade.pnl +
        (capital * data.model.cost_bps_per_leg_per_side) / 10000 +
        (data.model.cost_bps_per_leg_per_side / 10000) *
          (Math.abs(
            ((direction * capital) / 2 / trade.entry_y) * trade.exit_y,
          ) +
            Math.abs(
              ((direction * capital) / 2 / trade.entry_x) * trade.exit_x,
            )),
    ],
    [
      21,
      "Entry transaction cost",
      "B8*B23/10000",
      (capital * data.model.cost_bps_per_leg_per_side) / 10000,
    ],
    [
      22,
      "Exit transaction cost",
      "(ABS(B18*B15)+ABS(B19*B16))*B23/10000",
      (data.model.cost_bps_per_leg_per_side / 10000) *
        (Math.abs(((direction * capital) / 2 / trade.entry_y) * trade.exit_y) +
          Math.abs(((direction * capital) / 2 / trade.entry_x) * trade.exit_x)),
    ],
    [24, "Net P/L", "B20-B21-B22", trade.pnl],
    [25, "Net return", "B24/B8", trade.return_pct / 100],
  ];
  for (const [row, label, formula, result] of formulaRows) {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = { formula, result };
  }
  for (const row of [8, 11, 12, 15, 16, 20, 21, 22, 24])
    sheet.getCell(`B${row}`).numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)';
  sheet.getCell("B25").numFmt = "0.00%;[Red](0.00%)";
  for (const cell of ["B8", "B9"])
    sheet.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EEE4" },
    };
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF193D34" } };
  for (const row of [4, 10, 13, 24]) sheet.getRow(row).font = { bold: true };
  sheet.getCell("A28").value = "Interpretation";
  sheet.getCell("B28").value =
    "The what-if result uses later historical prices. It was not known on the decision date; no predictive edge is implied.";
  sheet.getCell("A29").value = "Price provenance";
  sheet.getCell("B29").value =
    "See DATA_SOURCES.md in the public repository. Retrospectively adjusted research values differ from executable quotes.";
  sheet.getCell("A30").value = "Missing costs";
  sheet.getCell("B30").value =
    "Borrow, financing, taxes and market impact excluded.";
  sheet.getCell("A31").value = "Source 1";
  sheet.getCell("B31").value = {
    text: "S&P 500 stocks CC0 archive",
    hyperlink: "https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks",
  };
  sheet.getCell("A32").value = "Source 2 (KO)";
  sheet.getCell("B32").value = {
    text: "Coca-Cola CC0 archive",
    hyperlink:
      "https://www.kaggle.com/datasets/isaaclopgu/coca-cola-stock-daily-updated",
  };
  const buffer = await book.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${pair}-${date}-trade-replay.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
