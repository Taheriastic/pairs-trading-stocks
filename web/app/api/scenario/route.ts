import { NextRequest, NextResponse } from "next/server";
import { financials, scenarioFor } from "@/lib/server";
import { allowRequest, clientKey } from "@/lib/rateLimit";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const client = clientKey(request);
  if (!allowRequest(client))
    return NextResponse.json(
      { error: "Too many scenario requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  try {
    const body = await request.json();
    const symbol = String(body.symbol);
    const growth = Number(body.growth);
    const margin = Number(body.margin);
    const fin = await financials();
    const data = scenarioFor(fin, symbol, growth, margin);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid scenario assumptions" },
      { status: 400 },
    );
  }
}
