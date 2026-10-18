import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { localAnalysis, validPair } from "@/lib/server";
import { replayWhatIf } from "@/lib/whatIf";

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );

export default async function TradeBrief({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const pair = params.pair || "";
  const date = params.date || "";
  const direction = Number(params.direction);
  const capital = Number(params.capital);
  if (
    !validPair(pair) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (direction !== 1 && direction !== -1) ||
    !Number.isFinite(capital) ||
    capital < 1000 ||
    capital > 1000000
  ) {
    return (
      <main className="brief-page">
        <p>Invalid historical trade selection.</p>
        <Link href="/">← Dashboard</Link>
      </main>
    );
  }
  const analysis = await localAnalysis(pair);
  const signal = analysis.signals.find((row) => row.date === date);
  const trade = replayWhatIf(analysis, date, direction, capital);
  if (!signal || !trade)
    return (
      <main className="brief-page">
        <p>No following trading session is available.</p>
        <Link href="/">← Dashboard</Link>
      </main>
    );
  const [y, x] = analysis.symbols;
  const strategyEntry = signal.action === "entry queued";
  return (
    <main className="brief-page">
      <div className="brief-toolbar">
        <Link href="/">← Dashboard</Link>
        <PrintButton />
      </div>
      <article className="brief-paper">
        <header>
          <span>PAIRS TRADING STOCKS / HISTORICAL DECISION NOTE</span>
          <h1>
            {y} / {x} trade replay
          </h1>
          <p>
            Decision close {date} · Fixed research data through{" "}
            {analysis.end_date}
          </p>
        </header>
        <section>
          <h2>Decision context</h2>
          <p>
            The model compared {y} with {x} using the prior{" "}
            {analysis.model.formation_days} aligned trading sessions. Its spread
            z-score was <b>{signal.z.toFixed(2)}</b> (entry threshold ±
            {analysis.model.entry_z.toFixed(1)}); the cointegration p-value was{" "}
            <b>{signal.pvalue.toFixed(3)}</b> (required below{" "}
            {analysis.model.cointegration_p_max}).
          </p>
          <p>
            <b>
              {strategyEntry
                ? "The tested strategy queued an entry."
                : "The tested strategy did not open a new trade."}
            </b>{" "}
            The scenario below replays the visitor’s chosen direction, whether
            or not it matched that rule.
          </p>
        </section>
        <section>
          <h2>Visitor decision</h2>
          <p>
            <b>
              {direction === 1
                ? `Buy ${y}; short ${x}`
                : `Short ${y}; buy ${x}`}
            </b>{" "}
            with {usd(capital)} gross exposure, allocated equally between the
            legs. The simulated fill is the next available adjusted close.
          </p>
          <div className="brief-metrics">
            <div>
              Entry · {trade.entry_date}
              <strong>
                {y} {usd(trade.entry_y)}
              </strong>
              <small>
                {x} {usd(trade.entry_x)}
              </small>
            </div>
            <div>
              Exit · {trade.exit_date}
              <strong>
                {y} {usd(trade.exit_y)}
              </strong>
              <small>
                {x} {usd(trade.exit_x)}
              </small>
            </div>
            <div>
              Net historical result<strong>{usd(trade.pnl)}</strong>
              <small>
                {trade.return_pct.toFixed(2)}% · {trade.reason} ·{" "}
                {trade.holding_days} sessions
              </small>
            </div>
          </div>
        </section>
        <section>
          <h2>How to interpret it</h2>
          <p>
            The result follows the same spread target, stop, and{" "}
            {analysis.model.max_hold_days}-session limit used in the research
            model, with {analysis.model.cost_bps_per_leg_per_side} basis points
            per leg per side. It is an ex-post hypothetical outcome, never part
            of the strategy trade count or performance curve. A relative price
            gap is not proof either stock was fundamentally mispriced. The
            selected outcome was unknowable on {date}.
          </p>
          <p>
            <Link
              href={`/api/trade-workbook?pair=${pair}&date=${date}&direction=${direction}&capital=${capital}`}
            >
              Download the formula-driven Excel analysis ↓
            </Link>
          </p>
        </section>
        <footer>
          <p>
            Price sources:{" "}
            <a href="https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks">
              S&P 500 Stocks CC0 archive
            </a>
            {pair === "KO-PEP" && (
              <>
                {" "}
                and{" "}
                <a href="https://www.kaggle.com/datasets/isaaclopgu/coca-cola-stock-daily-updated">
                  Coca-Cola CC0 archive
                </a>
              </>
            )}
            . Retrospectively adjusted research prices are not executable
            quotes. Borrow, financing, taxes, and market impact are excluded.
          </p>
        </footer>
      </article>
    </main>
  );
}
