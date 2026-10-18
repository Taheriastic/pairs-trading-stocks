import { NextRequest, NextResponse } from "next/server";
import { azureRequest, localAnalysis, validPair } from "@/lib/server";
import type { Analysis } from "@/lib/types";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const pair = request.nextUrl.searchParams.get("pair") || "KO-PEP";
  if (!validPair(pair))
    return NextResponse.json({ error: "Unknown pair" }, { status: 400 });
  const remote = (await azureRequest(
    `analysis?pair=${pair}`,
  )) as Analysis | null;
  const data = remote ?? (await localAnalysis(pair));
  return NextResponse.json(
    { ...data, serviceMode: remote ? "azure" : "snapshot" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
