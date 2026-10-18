import Dashboard from "@/components/Dashboard";
import { financials } from "@/lib/server";
export default async function Home() {
  return <Dashboard financials={await financials()} />;
}
