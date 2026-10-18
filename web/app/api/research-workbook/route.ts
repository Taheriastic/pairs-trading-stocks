import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { researchContext } from "@/lib/researchExport";
import { allowRequest, clientKey } from "@/lib/rateLimit";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!allowRequest(`research-workbook:${clientKey(request)}`, 10))
    return NextResponse.json(
      { error: "Please wait before downloading another workbook" },
      { status: 429 },
    );
  try {
    const c = await researchContext(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const book = new ExcelJS.Workbook();
    book.creator = "Pairs Trading";
    book.subject = "Twenty-year exploratory strategy research";
    book.calcProperties.fullCalcOnLoad = true;
    const summary = book.addWorksheet("Study summary");
    summary.columns = [{ width: 38 }, { width: 65 }];
    const endRow = c.data.sessions + 1;
    const rows: [string, string | number][] = [
      ["Pairs Trading / study", c.pair],
      ["Selected rule", c.rule.name],
      [
        "Exposure",
        c.rule.mode === "long"
          ? "100% long only; no short leg"
          : "50% long / 50% short",
      ],
      ["Study start", c.data.start_date],
      ["Study end", c.data.end_date],
      ["Aligned daily sessions", c.data.sessions],
      ["Net return", c.result.totalReturn / 100],
      ["Maximum drawdown", c.result.drawdown / 100],
      ["Annualized return", c.result.cagr / 100],
      ["Completed positions", c.result.trades.length],
      ["Losing positions", c.result.trades.filter((t) => t.pnl < 0).length],
      ["Cost per leg per transaction (bps)", c.cost],
      ["Total modeled cash costs", c.result.costTotal],
      ["Execution", "Decision after close t; fill at close t+1"],
      ["Rule explanation", c.rule.explanation],
      [
        "Research status",
        "Exploratory after prior study; no genuinely untouched evaluation period",
      ],
      ["Data source", c.data.source.url],
      ["Publisher license", c.data.source.license],
      [
        "Price units",
        "Normalized research indices, 100 on study start; not executable dollar quotes",
      ],
      ["Provenance limitation", c.data.source.limitations],
      ["Archive version", "202 · 17 October 2026"],
      ["Archive SHA-256", c.data.source.sha256],
      [
        "Excluded costs",
        "Borrow fees, financing, tax, impact; no intraday fills",
      ],
      [
        "Workbook behavior",
        "Equity path is a frozen strategy simulation. Replay formulas can recalculate capital and costs; changing them does not rerun the strategy.",
      ],
      ["50/50 buy-and-hold net return", c.benchmark.at(-1)! / 10000 - 1],
    ];
    summary.addRows(rows);
    summary.getCell("B7").value = {
      formula: `'Daily equity'!B${endRow}/10000-1`,
      result: c.result.totalReturn / 100,
    };
    for (const row of [7, 8, 9, 25])
      summary.getCell(`B${row}`).numFmt = "0.00%";
    const equity = book.addWorksheet("Daily equity");
    equity.columns = [
      { header: "Date", width: 15 },
      { header: "Net equity, USD", width: 22 },
      { header: "Daily net return", width: 22 },
      { header: "Running peak", width: 22 },
      { header: "Drawdown", width: 22 },
      { header: "50/50 buy and hold, USD", width: 26 },
    ];
    let peak = 10000;
    c.data.dates.slice(c.data.start_index).forEach((date, i) => {
      const at = c.data.start_index + i,
        row = i + 2,
        value = c.result.curve[at];
      peak = Math.max(peak, value);
      equity.addRow([
        date,
        value,
        {
          formula: i === 0 ? `B${row}/10000-1` : `B${row}/B${row - 1}-1`,
          result: value / (i === 0 ? 10000 : c.result.curve[at - 1]) - 1,
        },
        {
          formula: i === 0 ? `MAX(10000,B${row})` : `MAX(D${row - 1},B${row})`,
          result: peak,
        },
        { formula: `B${row}/D${row}-1`, result: value / peak - 1 },
        c.benchmark[at],
      ]);
    });
    equity.getColumn(2).numFmt = '"$"#,##0.00';
    equity.getColumn(3).numFmt = "0.000%";
    equity.getColumn(4).numFmt = '"$"#,##0.00';
    equity.getColumn(5).numFmt = "0.00%";
    const annual = book.addWorksheet("Annual results");
    annual.columns = [
      { header: "Year", width: 12 },
      { header: "Net return", width: 20 },
      { header: "Positions opened", width: 22 },
      { header: "Losing positions", width: 22 },
    ];
    c.result.annual.forEach((y) =>
      annual.addRow([y.year, y.returnPct / 100, y.trades, y.losses]),
    );
    annual.getColumn(2).numFmt = "0.00%";
    const trades = book.addWorksheet("Positions");
    trades.columns = [
      { header: "Signal close", width: 15 },
      { header: "Entry close", width: 15 },
      { header: "Exit close", width: 15 },
      { header: `${c.symbols[0]} weight`, width: 18 },
      { header: `${c.symbols[1]} weight`, width: 18 },
      { header: "Gross P/L", width: 18 },
      { header: "Entry cost", width: 18 },
      { header: "Exit cost", width: 18 },
      { header: "Net P/L", width: 18 },
      { header: "Net return", width: 18 },
      { header: "Exit reason", width: 24 },
    ];
    c.result.trades.forEach((t) =>
      trades.addRow([
        c.data.dates[t.signal],
        c.data.dates[t.entry],
        c.data.dates[t.exit],
        ...t.weights,
        t.gross,
        t.entryCost,
        t.exitCost,
        t.pnl,
        t.returnPct / 100,
        t.reason,
      ]),
    );
    trades.getColumn(10).numFmt = "0.00%";
    if (c.replay) {
      const t = c.replay,
        sheet = book.addWorksheet("Your replay");
      sheet.columns = [{ width: 39 }, { width: 29 }];
      const values: [number, string, string | number][] = [
        [1, "Decision close", c.date],
        [2, "Entry close", c.data.dates[t.entry]],
        [3, "Exit close", c.data.dates[t.exit]],
        [4, "Capital, USD (editable)", c.capital],
        [5, "Cost, bps (editable)", c.cost],
        [6, `${c.symbols[0]} signed weight`, c.weights[0]],
        [7, `${c.symbols[1]} signed weight`, c.weights[1]],
        [10, `${c.symbols[0]} entry index`, t.entryA],
        [11, `${c.symbols[1]} entry index`, t.entryB],
        [12, `${c.symbols[0]} exit index`, t.exitA],
        [13, `${c.symbols[1]} exit index`, t.exitB],
        [24, "Exit rule", t.reason],
        [
          25,
          "Units",
          "Normalized analytical index units; not executable shares",
        ],
      ];
      for (const [row, label, value] of values) {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = value;
      }
      const formulas: [number, string, string, number][] = [
        [15, `${c.symbols[0]} signed index units`, "B4*B6/B10", t.sharesA],
        [16, `${c.symbols[1]} signed index units`, "B4*B7/B11", t.sharesB],
        [18, "Gross P/L", "B15*(B12-B10)+B16*(B13-B11)", t.gross],
        [19, "Entry cost", "B4*B5/10000", t.entryCost],
        [20, "Exit cost", "(ABS(B15*B12)+ABS(B16*B13))*B5/10000", t.exitCost],
        [21, "Net P/L", "B18-B19-B20", t.pnl],
        [22, "Net return", "B21/B4", t.returnPct / 100],
      ];
      for (const [row, label, formula, result] of formulas) {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = { formula, result };
        sheet.getCell(`B${row}`).numFmt = row === 22 ? "0.00%" : "#,##0.00";
      }
    }
    for (const sheet of book.worksheets) {
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF203C54" },
      };
      sheet.getRow(1).height = 25;
    }
    const bytes = await book.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${c.pair}-${c.rule.id}-20-year-study.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid research selection" },
      { status: 400 },
    );
  }
}
