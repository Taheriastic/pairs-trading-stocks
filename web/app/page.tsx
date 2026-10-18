import Dashboard from "@/components/Dashboard";
import { financials, localData } from "@/lib/server";
import type { StrategyStudyData } from "@/lib/types";
export default async function Home() {
  const [fin, study] = await Promise.all([
    financials(),
    localData<StrategyStudyData>("strategy_study.json"),
  ]);
  return <Dashboard financials={fin} study={study} />;
}
