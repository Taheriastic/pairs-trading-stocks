import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Analysis, Financials, Scenario } from "./types";

const dataRoot = path.join(process.cwd(), "public", "data");
export const pairs = ["KO-PEP", "MSFT-ORCL"] as const;
export type Pair = (typeof pairs)[number];
export function validPair(pair: string): pair is Pair {
  return pairs.includes(pair as Pair);
}
export async function localData<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dataRoot, name), "utf8")) as T;
}
export async function financials(): Promise<Financials> {
  return localData<Financials>("financials.json");
}
export async function localAnalysis(pair: Pair): Promise<Analysis> {
  return localData<Analysis>(`${pair}.json`);
}
export function scenarioFor(
  fin: Financials,
  symbol: string,
  growth: number,
  margin: number,
): Scenario {
  const company = fin.companies[symbol];
  if (
    !company ||
    !Number.isFinite(growth) ||
    !Number.isFinite(margin) ||
    growth < -0.5 ||
    growth > 0.5 ||
    margin < 0 ||
    margin > 0.8
  ) {
    throw new Error("Invalid scenario assumptions");
  }
  const baseRevenue = company.revenue * (1 + company.growth);
  const scenarioRevenue = company.revenue * (1 + growth);
  const baseOperatingIncome = baseRevenue * company.operating_margin;
  const scenarioOperatingIncome = scenarioRevenue * margin;
  const growthEffect =
    (scenarioRevenue - baseRevenue) * company.operating_margin;
  const marginEffect = scenarioRevenue * (margin - company.operating_margin);
  return {
    symbol,
    growth,
    margin,
    reported_revenue: company.revenue,
    base_growth: company.growth,
    base_margin: company.operating_margin,
    base_revenue: baseRevenue,
    base_operating_income: baseOperatingIncome,
    scenario_revenue: scenarioRevenue,
    scenario_operating_income: scenarioOperatingIncome,
    growth_effect: growthEffect,
    margin_effect: marginEffect,
    total_change: scenarioOperatingIncome - baseOperatingIncome,
    filing_url: company.filing_url,
    period_end: company.period_end,
  };
}
export async function azureRequest(
  route: string,
  init?: RequestInit,
): Promise<unknown | null> {
  const base = process.env.AZURE_FUNCTION_URL;
  const key = process.env.AZURE_FUNCTION_KEY;
  if (!base || !key) return null;
  try {
    const url = `${base.replace(/\/$/, "")}/api/${route}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        "x-functions-key": key,
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(6500),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
