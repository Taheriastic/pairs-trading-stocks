import { NextRequest, NextResponse } from "next/server";
import { azureRequest, financials, scenarioFor } from "@/lib/server";
import type { Scenario } from "@/lib/types";
import { allowRequest } from "@/lib/rateLimit";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const client =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
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
    scenarioFor(fin, symbol, growth, margin); // validate before forwarding
    const remote = (await azureRequest("scenario", {
      method: "POST",
      body: JSON.stringify({ symbol, growth, margin }),
    })) as Scenario | null;
    const data = remote ?? scenarioFor(fin, symbol, growth, margin);
    return NextResponse.json(
      { ...data, serviceMode: remote ? "azure" : "snapshot" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid scenario assumptions" },
      { status: 400 },
    );
  }
}
