import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { financials, scenarioFor } from "@/lib/server";
import { allowRequest } from "@/lib/rateLimit";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const client =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  if (!allowRequest(`workbook:${client}`, 10))
    return NextResponse.json(
      { error: "Too many workbook requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  try {
    const symbol = request.nextUrl.searchParams.get("symbol") || "MSFT";
    const fin = await financials();
    const company = fin.companies[symbol];
    if (!company) throw new Error("Invalid company");
    const growth = Number(
      request.nextUrl.searchParams.get("growth") ?? company.growth,
    );
    const margin = Number(
      request.nextUrl.searchParams.get("margin") ?? company.operating_margin,
    );
    scenarioFor(fin, symbol, growth, margin);
    const book = new ExcelJS.Workbook();
    book.calcProperties.fullCalcOnLoad = true;
    book.creator = "Pairs Trading Stocks";
    book.subject = "Historical filing-based FP&A scenario";
    const sheet = book.addWorksheet("Scenario");
    sheet.columns = [{ width: 34 }, { width: 25 }, { width: 46 }];
    sheet.getCell("A1").value = `${symbol} | FP&A scenario planner`;
    sheet.getCell("A2").value = "USD; annual fiscal period shown below";
    const labels: Record<number, string> = {
      4: "Fiscal period end",
      5: "Reported revenue",
      6: "Prior revenue",
      7: "Reported operating income",
      8: "Historical revenue growth",
      9: "Historical operating margin",
      12: "Scenario revenue growth",
      13: "Scenario operating margin",
      15: "Base projected revenue",
      16: "Base projected operating income",
      17: "Scenario projected revenue",
      18: "Scenario projected operating income",
      20: "Revenue growth effect",
      21: "Margin effect",
      22: "Total operating income change",
      23: "Bridge check",
    };
    for (const [row, label] of Object.entries(labels))
      sheet.getCell(`A${row}`).value = label;
    sheet.getCell("B4").value = company.period_end;
    sheet.getCell("B5").value = company.revenue;
    sheet.getCell("B6").value = company.prior_revenue;
    sheet.getCell("B7").value = company.operating_income;
    sheet.getCell("B8").value = { formula: "B5/B6-1", result: company.growth };
    sheet.getCell("B9").value = {
      formula: "B7/B5",
      result: company.operating_margin,
    };
    sheet.getCell("B12").value = growth;
    sheet.getCell("B13").value = margin;
    const formulas: Record<number, string> = {
      15: "B5*(1+B8)",
      16: "B15*B9",
      17: "B5*(1+B12)",
      18: "B17*B13",
      20: "(B17-B15)*B9",
      21: "B17*(B13-B9)",
      22: "B20+B21",
      23: "B18-B16-B22",
    };
    for (const [row, formula] of Object.entries(formulas))
      sheet.getCell(`B${row}`).value = { formula };
    for (const row of [5, 6, 7, 15, 16, 17, 18, 20, 21, 22, 23])
      sheet.getCell(`B${row}`).numFmt = "#,##0;[Red](#,##0)";
    for (const row of [8, 9, 12, 13])
      sheet.getCell(`B${row}`).numFmt = "0.0%;[Red](0.0%)";
    sheet.getCell("C12").value = "Editable assumption";
    sheet.getCell("C13").value = "Editable assumption";
    for (const cell of ["B12", "B13"]) {
      sheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5F0FA" },
      };
    }
    sheet.getRow(1).font = {
      bold: true,
      size: 16,
      color: { argb: "FF173553" },
    };
    for (const row of [4, 12, 15, 20]) sheet.getRow(row).font = { bold: true };
    sheet.getCell("A26").value = "Source filing";
    sheet.getCell("B26").value = {
      text: company.filing_url,
      hyperlink: company.filing_url,
    };
    sheet.getCell("A27").value = "Filed";
    sheet.getCell("B27").value = company.filed;
    sheet.getCell("A28").value = "Data cutoff";
    sheet.getCell("B28").value = fin.as_of;
    sheet.getCell("A29").value = "Method";
    sheet.getCell("B29").value =
      "Growth then margin bridge; scenario is illustrative, not guidance.";
    const buffer = await book.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${symbol}-finance-scenario.xlsx"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid workbook request" },
      { status: 400 },
    );
  }
}
