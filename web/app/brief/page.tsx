import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { financials, scenarioFor, validPair } from "@/lib/server";
const money = (n: number) => "$" + (n / 1e9).toFixed(2) + "B";
export default async function Brief({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const fin = await financials();
  const pair = validPair(params.pair || "") ? params.pair! : "KO-PEP";
  const symbol =
    params.symbol && fin.companies[params.symbol]
      ? params.symbol
      : pair.split("-")[0];
  const c = fin.companies[symbol];
  const growth = Number(params.growth ?? c.growth),
    margin = Number(params.margin ?? c.operating_margin);
  let s;
  try {
    s = scenarioFor(fin, symbol, growth, margin);
  } catch {
    s = scenarioFor(fin, symbol, c.growth, c.operating_margin);
  }
  return (
    <main className="brief-page">
      <div className="brief-toolbar">
        <Link href="/">← Dashboard</Link>
        <PrintButton />
      </div>
      <article className="brief-paper">
        <header>
          <span>FINANCE DECISION LAB / INVESTMENT & FP&A BRIEF</span>
          <h1>{symbol} operating outlook</h1>
          <p>Historical, filing-based scenario · Data cutoff {fin.as_of}</p>
        </header>
        <section>
          <h2>Reported baseline</h2>
          <div className="brief-metrics">
            <div>
              Revenue<strong>{money(c.revenue)}</strong>
            </div>
            <div>
              Operating income<strong>{money(c.operating_income)}</strong>
            </div>
            <div>
              Operating margin
              <strong>{(c.operating_margin * 100).toFixed(1)}%</strong>
            </div>
          </div>
          <p>
            Fiscal year ended {c.period_end}. Revenue grew{" "}
            {(c.growth * 100).toFixed(1)}% versus the previous fiscal year.
          </p>
        </section>
        <section>
          <h2>Scenario</h2>
          <p>
            Assume revenue grows <b>{(s.growth * 100).toFixed(1)}%</b> and
            operating margin is <b>{(s.margin * 100).toFixed(1)}%</b>. Projected
            revenue is <b>{money(s.scenario_revenue)}</b> and projected
            operating income is <b>{money(s.scenario_operating_income)}</b>.
          </p>
          <div className="brief-bridge">
            <div>
              Base projected operating income{" "}
              <b>{money(s.base_operating_income)}</b>
            </div>
            <div>
              Revenue growth effect <b>{money(s.growth_effect)}</b>
            </div>
            <div>
              Margin effect <b>{money(s.margin_effect)}</b>
            </div>
            <div>
              Scenario projected operating income{" "}
              <b>{money(s.scenario_operating_income)}</b>
            </div>
          </div>
        </section>
        <section>
          <h2>Decision lens</h2>
          <p>
            The scenario changes operating income by{" "}
            <b>{money(s.total_change)}</b> relative to a base case that carries
            forward historical growth and margin. The bridge applies growth
            first and margin second. These assumptions are illustrative, not
            management guidance.
          </p>
        </section>
        <footer>
          <p>
            Source:{" "}
            <a href={c.filing_url}>
              {symbol} 10-K filed {c.filed}
            </a>
            . Annual consolidated SEC facts; period end {c.period_end}.
          </p>
          <p>
            Research limitations: company fiscal calendars differ; projections
            are simple driver scenarios and exclude changes to mix, financing,
            taxes and capital allocation.
          </p>
        </footer>
      </article>
    </main>
  );
}
