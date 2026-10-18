import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { researchContext } from "@/lib/researchExport";

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v,
  );
export default async function ResearchBrief({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  let c;
  try {
    c = await researchContext(params);
  } catch {
    return (
      <main className="brief-page">
        <h1>Choose a valid research selection</h1>
        <Link href="/">Return to the lab</Link>
      </main>
    );
  }
  const t = c.replay;
  return (
    <main className="brief-page">
      <div className="brief-toolbar">
        <Link href="/">← Strategy lab</Link>
        <PrintButton />
      </div>
      <article className="brief-paper research-paper">
        <header>
          <span>PAIRS TRADING / HISTORICAL RESEARCH NOTE</span>
          <h1>
            {c.pair.replace("-", " / ")} · {c.rule.name}
          </h1>
          <p>
            {c.data.start_date} → {c.data.end_date} ·{" "}
            {c.data.sessions.toLocaleString()} daily sessions
          </p>
        </header>
        <section>
          <h2>Strategy and exposure</h2>
          <p>
            {c.rule.explanation}{" "}
            {c.rule.mode === "long"
              ? "This strategy owns one stock and carries stock-market exposure."
              : "This strategy opens equal dollar long and short legs, holding fixed units until a switch."}{" "}
            Decisions fill at the following close, with {c.cost} bps per leg per
            transaction.
          </p>
          <div className="brief-metrics">
            <div>
              Full-history net return
              <strong>{c.result.totalReturn.toFixed(2)}%</strong>
              <small>
                {usd(10000)} → {usd(c.result.curve.at(-1)!)}
              </small>
            </div>
            <div>
              Maximum drawdown<strong>{c.result.drawdown.toFixed(2)}%</strong>
              <small>
                {c.result.trades.filter((tr) => tr.pnl < 0).length} losing
                positions
              </small>
            </div>
            <div>
              Completed positions<strong>{c.result.trades.length}</strong>
              <small>{usd(c.result.costTotal)} modeled costs</small>
            </div>
          </div>
          <p>
            For context, 50/50 buy-and-hold returned{" "}
            {(100 * (c.benchmark.at(-1)! / 10000 - 1)).toFixed(2)}% with the
            same next-close entry and transaction-cost rate. It owns both stocks
            and carries market exposure.
          </p>
        </section>
        <section>
          <h2>Your decision on {c.date}</h2>
          {t ? (
            <>
              <p>
                {c.weights
                  .map((w, i) =>
                    w
                      ? `${w > 0 ? "Buy" : "Short"} ${c.symbols[i]} (${Math.abs(w) * 100}% gross allocation)`
                      : null,
                  )
                  .filter(Boolean)
                  .join("; ")}
                . Capital: {usd(c.capital)}. Entry: {c.data.dates[t.entry]};
                exit: {c.data.dates[t.exit]} ({t.exit - t.entry} trading
                sessions, {t.reason}).
              </p>
              <div className="brief-metrics">
                <div>
                  Gross P/L<strong>{usd(t.gross)}</strong>
                </div>
                <div>
                  Entry + exit costs
                  <strong>{usd(t.entryCost + t.exitCost)}</strong>
                </div>
                <div>
                  Net result<strong>{usd(t.pnl)}</strong>
                  <small>{t.returnPct.toFixed(2)}% of gross capital</small>
                </div>
              </div>
              <p>
                The visitor replay uses a chosen holding period and is separate
                from the strategy’s direction-switch rule and performance. This
                outcome uses subsequent historical observations and was unknown
                on the decision date.
              </p>
            </>
          ) : (
            <p>
              No replay is available for this date because there are
              insufficient later closes.
            </p>
          )}
        </section>
        <section>
          <h2>Evidence and limits</h2>
          <p>
            The ten-rule menu is exploratory and was created after an earlier
            study of these prices; no rule has a genuinely untouched evaluation
            period. The full-history ranking is hindsight. A profitable stock
            rotation may reflect market growth and does not establish
            convergence. Borrow fees, financing, taxes, market impact and
            intraday trading are excluded.
          </p>
          <p>
            Prices are normalized analytical indices under the archive
            publisher’s CC0 label, not executable dollar quotes. Historical
            returns agree with the earlier adjusted data across 2,005
            overlapping sessions per stock. The upstream provider’s rights and
            adjustment methodology are not independently established, so results
            remain provisional research.
          </p>
          <p>
            <a href={c.data.source.url}>Source: {c.data.source.name}</a> ·
            SHA-256: <small>{c.data.source.sha256}</small>
          </p>
        </section>
        <footer>
          Reproducible educational analysis · Data ends {c.data.end_date} · No
          current trade signal
        </footer>
      </article>
    </main>
  );
}
