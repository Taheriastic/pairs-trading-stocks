import type {
  StrategyStudyData,
  StudyCandidate,
  StudyMetrics,
} from "@/lib/types";

const methodName: Record<string, string> = {
  regression: "Regression spread",
  log_ratio: "Log-price ratio",
  distance: "20-day relative move",
};
const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function MetricRow({
  name,
  result,
  note,
}: {
  name: string;
  result: StudyMetrics;
  note: string;
}) {
  return (
    <tr>
      <th scope="row">
        {name}
        <small>{note}</small>
      </th>
      <td>{result.trades}</td>
      <td className={result.return_pct < 0 ? "negative" : "positive"}>
        {signed(result.return_pct)}
      </td>
      <td>{signed(result.drawdown_pct)}</td>
      <td>{result.losses}</td>
    </tr>
  );
}

function rule(candidate: StudyCandidate) {
  const item = candidate.config;
  return `${item.lookback}-day reference · ${Math.round(item.entry_percentile * 100)}th-percentile entry · ${item.max_hold}-day maximum hold${item.min_correlation === null ? "" : ` · correlation ≥ ${item.min_correlation.toFixed(2)}`}`;
}

export default function StrategyStudy({
  pair,
  study,
}: {
  pair: string;
  study: StrategyStudyData;
}) {
  const result = study.pairs[pair];
  if (!result) return null;
  return (
    <section
      id="study"
      className="study-section"
      aria-labelledby="study-heading"
    >
      <div className="section-top">
        <div>
          <span className="section-kicker">RESEARCH / 20 YEARS</span>
          <h2 id="study-heading">Did more trades improve the result?</h2>
        </div>
        <p>
          {study.audit.common_rows.toLocaleString()} aligned closes ·{" "}
          {study.audit.start_date} to {study.audit.end_date}
        </p>
      </div>
      <div className="study-verdict">
        <span>FINDING FOR {pair.replace("-", " / ")}</span>
        <strong>No validated winner</strong>
        <p>
          We tested {result.tested_candidates} predefined rule combinations.
          None met the development screen of positive after-cost return and at
          least 20 trades. Choosing a favorable rule from later years would turn
          this into a hindsight exercise.
        </p>
      </div>
      <div className="study-grid">
        <div className="panel study-table">
          <h3>How the methods compared</h3>
          <p>
            Full 20-year results on $10,000 starting capital, with modeled
            trading costs.
          </p>
          <small className="study-scroll-hint">
            Swipe the table to compare returns →
          </small>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Trades</th>
                  <th>Net return</th>
                  <th>Max drawdown</th>
                  <th>Losing trades</th>
                </tr>
              </thead>
              <tbody>
                <MetricRow
                  name="Existing cointegration rule"
                  result={result.cointegration_baseline.full}
                  note="Fixed-rule baseline"
                />
                {Object.entries(result.family_hindsight).map(
                  ([family, candidate]) => (
                    <MetricRow
                      key={family}
                      name={methodName[family] || family}
                      result={candidate.full}
                      note="Best full-history fit within this family"
                    />
                  ),
                )}
                <MetricRow
                  name="50/50 buy and hold"
                  result={result.equal_weight_benchmark.full}
                  note="Long-only context; different risk"
                />
              </tbody>
            </table>
          </div>
          <small className="study-caveat">
            The three family rows were chosen using the entire 20 years; they
            are hindsight comparisons, not independently validated strategies.
          </small>
        </div>
        <div className="panel study-explain">
          <h3>What the search learned</h3>
          <div className="study-note">
            <span>01 / MORE ACTIVITY</span>
            <p>
              The most active version opened{" "}
              <b>{result.most_active.full.trades}</b> trades and returned{" "}
              <b>{signed(result.most_active.full.return_pct)}</b> after modeled
              costs. Frequency alone did not help.
            </p>
          </div>
          <div className="study-note">
            <span>02 / HINDSIGHT FIT</span>
            <p>
              The least-negative full-history candidate was{" "}
              <b>{methodName[result.hindsight.config.family]}</b>:{" "}
              {rule(result.hindsight)}. Its{" "}
              {signed(result.hindsight.full.return_pct)} result cannot be
              treated as a prediction.
            </p>
          </div>
          <div className="study-note">
            <span>03 / LATER YEARS</span>
            <p>
              The untouched evaluation period began {study.splits.holdout_start}
              . No candidate was promoted from development and validation into
              that period.
            </p>
          </div>
        </div>
      </div>
      <p className="study-source">
        Study prices come from a{" "}
        <a
          href="https://www.kaggle.com/datasets/darkmatternet/s-and-p-500-stocks-25-years-of-data-updated-daily"
          target="_blank"
          rel="noreferrer"
        >
          dated research archive
        </a>{" "}
        with retrospectively adjusted values through {study.audit.end_date}. The
        interactive trade simulator below uses a separate verified snapshot
        through 2024-12-20. The newer archive lacks distinct raw closes and a
        documented upstream public-display license, so its price rows and trade
        levels are not shown here. This is historical analysis, not a current
        trade signal.
      </p>
    </section>
  );
}
