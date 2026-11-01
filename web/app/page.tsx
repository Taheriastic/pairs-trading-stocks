import DailyLab from "@/components/DailyLab";
import { financials, localData } from "@/lib/server";
import type { DailyData } from "@/lib/dailyTypes";
export default async function Home() {
  const [fin, data] = await Promise.all([
    financials(),
    localData<DailyData>("daily_lab.json"),
  ]);
  return <DailyLab financials={fin} data={data} />;
}
