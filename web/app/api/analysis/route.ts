import { NextRequest, NextResponse } from "next/server";
import { localAnalysis, validPair } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const pair = request.nextUrl.searchParams.get("pair") || "KO-PEP";
  if (!validPair(pair))
    return NextResponse.json({ error: "Unknown pair" }, { status: 400 });
  const data = await localAnalysis(pair);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
