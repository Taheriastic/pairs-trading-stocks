"use client";
import { useEffect, useMemo, useState } from "react";
import LineChart from "./LineChart";
import type {
  Analysis,
  Financials,
  Scenario,
  Signal,
  Trade,
} from "@/lib/types";

const pairNames: Record<
  string,
  { title: string; subtitle: string; companies: string[] }
> = {
  "KO-PEP": {
    title: "Coca-Cola / PepsiCo",
    subtitle: "Consumer staples",
    companies: ["KO", "PEP"],
  },
  "MSFT-ORCL": {
    title: "Microsoft / Oracle",
    subtitle: "Enterprise software",
    companies: ["MSFT", "ORCL"],
  },
};
const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n) >= 1e9 || n === 0 ? (Math.abs(n) / 1e9).toFixed(2) + "B" : (Math.abs(n) / 1e6).toFixed(0) + "M"}`;
const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const price = (n: number | null) => (n === null ? "—" : "$" + n.toFixed(2));

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

export default function Dashboard({ financials }: { financials: Financials }) {
  const [pair, setPair] = useState("KO-PEP");
  const [company, setCompany] = useState("KO");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [growth, setGrowth] = useState(financials.companies.KO.growth);
  const [margin, setMargin] = useState(
    financials.companies.KO.operating_margin,
  );
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [scenarioError, setScenarioError] = useState(false);
  const current = financials.companies[company];

  useEffect(() => {
    let alive = true;
    fetch(`/api/analysis?pair=${pair}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Analysis) => {
        if (alive) {
          setAnalysis(data);
          setAnalysisError(false);
          setSelectedDate(data.end_date);
        }
      })
      .catch(() => {
        if (alive) setAnalysisError(true);
      });
    return () => {
      alive = false;
    };
  }, [pair]);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      fetch("/api/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: company, growth, margin }),
      })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data: Scenario) => {
          if (alive) {
            setScenario(data);
            setScenarioError(false);
          }
        })
        .catch(() => {
          if (alive) setScenarioError(true);
        });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [company, growth, margin]);
  const changePair = (next: string) => {
    setAnalysis(null);
    setAnalysisError(false);
    setScenario(null);
    setScenarioError(false);
    setPair(next);
    const symbol = pairNames[next].companies[0];
    setCompany(symbol);
    setGrowth(financials.companies[symbol].growth);
    setMargin(financials.companies[symbol].operating_margin);
  };
  const changeCompany = (symbol: string) => {
    setScenario(null);
    setScenarioError(false);
    setCompany(symbol);
    setGrowth(financials.companies[symbol].growth);
    setMargin(financials.companies[symbol].operating_margin);
  };
  const signal = useMemo<Signal | undefined>(() => {
    if (!analysis?.signals.length) return;
    return (
      [...analysis.signals].reverse().find((s) => s.date <= selectedDate) ||
      analysis.signals[0]
    );
  }, [analysis, selectedDate]);
  const matchingTrade = useMemo<Trade | undefined>(
    () => analysis?.strategy.trades.find((t) => t.signal_date === signal?.date),
    [analysis, signal],
  );
  const preset = (kind: "base" | "upside" | "downside") => {
    setScenarioError(false);
    setGrowth(
      Math.max(
        -0.5,
        Math.min(
          0.5,
          current.growth +
            (kind === "upside" ? 0.05 : kind === "downside" ? -0.05 : 0),
        ),
      ),
    );
    setMargin(
      Math.max(
        0,
        Math.min(
          0.8,
          current.operating_margin +
            (kind === "upside" ? 0.02 : kind === "downside" ? -0.02 : 0),
        ),
      ),
    );
  };
  const baseIsReady =
    scenario?.symbol === company &&
    scenario.growth === growth &&
    scenario.margin === margin;
  const briefUrl = `/brief?pair=${pair}&symbol=${company}&growth=${growth}&margin=${margin}`;
  const workbookUrl = `/api/workbook?symbol=${company}&growth=${growth}&margin=${margin}`;
  const latestTradeDate = analysis?.signals
    .filter((s) => s.action === "entry queued")
    .at(-1)?.date;
  const benchmarkReturn = analysis
    ? 100 * (analysis.benchmark.at(-1)!.equity / 10000 - 1)
    : 0;

  return (
    <main>
      <header className="site-header">
        <div className="brand">
          <div className="brand-icon">
            F<span>·</span>D
          </div>
          <div>
            <strong>Finance Decision Lab</strong>
            <small>FP&A × quantitative research</small>
          </div>
        </div>
        <div className="header-right">
          <span className="snapshot-pill">Historical snapshot · Dec 2024</span>
          <a href="#methodology">Methodology ↗</a>
        </div>
      </header>
      <div className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">FINANCIAL ANALYSIS / CASE STUDY</span>
            <h1>
              From financial statements
              <br />
              to a <em>decision.</em>
            </h1>
            <p>
              Compare peers, model operating outcomes, and examine historical
              trading signals with the assumptions visible.
            </p>
            <div className="hero-meta">
              <span className="hero-dot" /> Filing-backed metrics <b>•</b>{" "}
              Formula-driven scenarios <b>•</b> Tested market history
            </div>
          </div>
          <div className="hero-aside">
            <span>THE QUESTION</span>
            <p>
              What changes the outlook when revenue growth or operating margin
              moves?
            </p>
            <span className="aside-line" />
            <small>Explore a scenario below ↓</small>
          </div>
        </section>

        <section className="pair-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">01 / PEER CONTEXT</span>
              <h2>Select an industry lens</h2>
            </div>
            <p>
              Two pairs. Different businesses and fiscal calendars. Same
              analytical framework.
            </p>
          </div>
          <div className="pair-picker">
            {Object.entries(pairNames).map(([key, item]) => (
              <button
                key={key}
                className={`pair-button ${key === pair ? "active" : ""}`}
                onClick={() => changePair(key)}
              >
                <span className="pair-overline">{item.subtitle}</span>
                <strong>{item.title}</strong>
                <span className="pair-tickers">
                  {key.replace("-", "  /  ")} <span>↗</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel financial-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">02 / REPORTED PERFORMANCE</span>
              <h2>What the filings say</h2>
              <p>
                Latest annual 10-K available by {financials.as_of}. USD,
                consolidated.
              </p>
            </div>
            <span className="source-note">
              Fiscal periods differ across companies
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Company / fiscal year end</th>
                  <th>Revenue</th>
                  <th>YoY growth</th>
                  <th>Operating income</th>
                  <th>Operating margin</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {pairNames[pair].companies.map((symbol) => {
                  const c = financials.companies[symbol];
                  return (
                    <tr key={symbol}>
                      <td>
                        <strong>{symbol}</strong>
                        <span>
                          {c.name} · {c.period_end}
                        </span>
                      </td>
                      <td>{money(c.revenue)}</td>
                      <td>{pct(c.growth)}</td>
                      <td>{money(c.operating_income)}</td>
                      <td>{pct(c.operating_margin)}</td>
                      <td>
                        <a href={c.filing_url} target="_blank" rel="noreferrer">
                          10-K ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            Growth compares each company with its own prior fiscal year. These
            are reported figures, not forecasts.
          </p>
        </section>

        <section className="scenario-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">03 / FP&A SCENARIO PLANNER</span>
              <h2>Turn assumptions into an outlook</h2>
            </div>
            <p>
              Move the two drivers and see how each contributes to projected
              operating income.
            </p>
          </div>
          <div className="scenario-grid">
            <div className="panel controls-panel">
              <div className="control-heading">
                <div>
                  <span className="overline">MODEL INPUTS</span>
                  <h3>Choose a company</h3>
                </div>
                <div className="segment">
                  {pairNames[pair].companies.map((symbol) => (
                    <button
                      key={symbol}
                      className={symbol === company ? "selected" : ""}
                      onClick={() => changeCompany(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div className="presets">
                <button onClick={() => preset("downside")}>Downside</button>
                <button onClick={() => preset("base")}>Base case</button>
                <button onClick={() => preset("upside")}>Upside</button>
              </div>
              <label className="slider-control">
                <span>
                  <strong>Revenue growth</strong>
                  <b>{pct(growth)}</b>
                </span>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  step="0.5"
                  value={growth * 100}
                  onChange={(e) => {
                    setScenarioError(false);
                    setGrowth(Number(e.target.value) / 100);
                  }}
                />
                <small>Historical growth: {pct(current.growth)}</small>
              </label>
              <label className="slider-control">
                <span>
                  <strong>Operating margin</strong>
                  <b>{pct(margin)}</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="0.5"
                  value={margin * 100}
                  onChange={(e) => {
                    setScenarioError(false);
                    setMargin(Number(e.target.value) / 100);
                  }}
                />
                <small>
                  Historical margin: {pct(current.operating_margin)}
                </small>
              </label>
              <div className="formula-note">
                Revenue = reported revenue × (1 + growth)
                <br />
                Operating income = projected revenue × margin
              </div>
            </div>
            <div className="panel outcome-panel">
              <div className="outcome-head">
                <span className="overline">
                  ILLUSTRATIVE NEXT-YEAR SCENARIO
                </span>
                <span className="mode-pill">
                  {baseIsReady && scenario?.serviceMode === "azure"
                    ? "Azure calculation"
                    : "Dated snapshot"}
                </span>
              </div>
              {baseIsReady && scenario ? (
                <>
                  <div className="outcome-big">
                    <small>Projected operating income</small>
                    <strong>{money(scenario.scenario_operating_income)}</strong>
                    <span
                      className={
                        scenario.total_change >= 0 ? "positive" : "negative"
                      }
                    >
                      {money(scenario.total_change)} vs. base case
                    </span>
                  </div>
                  <div className="outcome-stats">
                    <Stat
                      label="Projected revenue"
                      value={money(scenario.scenario_revenue)}
                    />
                    <Stat
                      label="Base operating income"
                      value={money(scenario.base_operating_income)}
                    />
                  </div>
                  <div className="bridge">
                    <span>CHANGE BRIDGE</span>
                    <div>
                      <em>Growth effect</em>
                      <b>{money(scenario.growth_effect)}</b>
                    </div>
                    <div>
                      <em>Margin effect</em>
                      <b>{money(scenario.margin_effect)}</b>
                    </div>
                    <div className="bridge-total">
                      <em>Total change</em>
                      <b>{money(scenario.total_change)}</b>
                    </div>
                  </div>
                </>
              ) : (
                <p className="loading">
                  {scenarioError
                    ? "Scenario service unavailable."
                    : "Calculating scenario…"}
                </p>
              )}
              <div className="outcome-actions">
                <a
                  href={briefUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button-primary"
                >
                  Open one-page brief ↗
                </a>
                <a href={workbookUrl} className="button-secondary">
                  Download Excel ↓
                </a>
              </div>
              <p className="footnote">
                User assumptions are illustrative and are not company guidance.
                The bridge applies growth first, then margin.
              </p>
            </div>
          </div>
        </section>

        <section className="historical-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">04 / HISTORICAL SIGNAL LAB</span>
              <h2>Would the model have acted?</h2>
            </div>
            <p>
              Select a past trading day. Model parameters are fitted without
              that day or any later prices.
            </p>
          </div>
          <div className="historical-grid">
            <div className="panel signal-panel">
              <div className="date-line">
                <label htmlFor="asof">As-of date</label>
                <div>
                  <input
                    id="asof"
                    type="date"
                    min={analysis?.start_date}
                    max={analysis?.end_date}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <button
                    onClick={() =>
                      latestTradeDate && setSelectedDate(latestTradeDate)
                    }
                    disabled={!latestTradeDate}
                  >
                    Latest executed signal
                  </button>
                </div>
              </div>
              {analysisError ? (
                <p>Historical analysis could not load.</p>
              ) : !signal ? (
                <p className="loading">Loading dated research…</p>
              ) : (
                <>
                  <div className="signal-state">
                    <span
                      className={`signal-dot ${signal.action === "entry queued" ? "on" : ""}`}
                    />
                    <div>
                      <small>MODEL STATUS · {signal.date}</small>
                      <h3>
                        {signal.action === "entry queued"
                          ? `${signal.direction === 1 ? "Long" : "Short"} ${analysis?.symbols[0]} / ${signal.direction === 1 ? "Short" : "Long"} ${analysis?.symbols[1]}`
                          : signal.action === "holding" ||
                              signal.action === "exit queued"
                            ? "Existing position"
                            : "No new trade"}
                      </h3>
                      <p>
                        {!signal.eligible
                          ? "No qualified relationship in the prior 252-day window."
                          : signal.action === "entry queued"
                            ? "Signal observed after close; simulated entry at the next available close."
                            : signal.action === "holding"
                              ? "The strategy was already in a position."
                              : "The entry threshold was not met, or the sample ended."}
                      </p>
                    </div>
                  </div>
                  <div className="signal-numbers">
                    <Stat
                      label="Spread z-score"
                      value={signal.z.toFixed(2)}
                      detail="entry at ±2.0"
                    />
                    <Stat
                      label="Cointegration p-value"
                      value={signal.pvalue.toFixed(3)}
                      detail="required below 0.05"
                    />
                    <Stat
                      label="Historical adjusted price"
                      value={price(signal.y_price)}
                      detail={analysis?.symbols[0]}
                    />
                  </div>
                  {signal.action === "entry queued" && (
                    <div className="levels">
                      <div>
                        <span>SIMULATED FILL · NEXT CLOSE</span>
                        <strong>
                          {matchingTrade
                            ? price(matchingTrade.entry_y)
                            : "See next session"}
                        </strong>
                      </div>
                      <div>
                        <span>CONDITIONAL TARGET*</span>
                        <strong>{price(signal.target_y_if_x_constant)}</strong>
                      </div>
                      <div>
                        <span>CONDITIONAL STOP*</span>
                        <strong>{price(signal.stop_y_if_x_constant)}</strong>
                      </div>
                    </div>
                  )}
                  {matchingTrade && (
                    <div className="trade-result">
                      Observed outcome:{" "}
                      <strong
                        className={
                          matchingTrade.pnl >= 0 ? "positive" : "negative"
                        }
                      >
                        {signed(matchingTrade.return_pct)}
                      </strong>{" "}
                      over {matchingTrade.holding_days} trading days ·{" "}
                      {matchingTrade.reason} exit on {matchingTrade.exit_date}.
                    </div>
                  )}
                  <p className="footnote">
                    *Research-price level for {analysis?.symbols[0]} if{" "}
                    {analysis?.symbols[1]} stays fixed at its selected-day
                    adjusted price. The model does not predict a future quote.
                  </p>
                </>
              )}
            </div>
            <div className="panel method-card">
              <span className="overline">RESEARCH RULES</span>
              <h3>Every signal has a boundary.</h3>
              <ul>
                <li>
                  <b>252</b> preceding trading days to fit the pair
                </li>
                <li>
                  <b>60</b> preceding spreads to set the range
                </li>
                <li>
                  <b>±2.0</b> to enter, <b>±0.5</b> to exit
                </li>
                <li>
                  <b>±3.5</b> stop or <b>20</b> trading-day limit
                </li>
                <li>
                  <b>10 bps</b> per leg, on entry and exit
                </li>
              </ul>
              <p>
                Cointegration is retested on the training window. A low p-value
                is evidence under a model, not proof of future convergence.
              </p>
            </div>
          </div>
        </section>

        <section className="performance-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">05 / PERFORMANCE & RISK</span>
              <h2>Results, including the quiet days</h2>
            </div>
            <p>
              Historical simulation from {analysis?.start_date || "…"} to{" "}
              {analysis?.end_date || "…"}. Starting capital $10,000.
            </p>
          </div>
          {analysis && (
            <>
              <div className="performance-stats">
                <Stat
                  label="Pairs strategy"
                  value={signed(analysis.strategy.total_return_pct)}
                  detail={`${analysis.strategy.trade_count} completed trades`}
                />
                <Stat
                  label="Inverse strategy"
                  value={signed(analysis.inverse.total_return_pct)}
                  detail="same dates and costs"
                />
                <Stat
                  label="50/50 buy & hold"
                  value={signed(benchmarkReturn)}
                  detail="adjusted-price benchmark"
                />
                <Stat
                  label="Max drawdown"
                  value={signed(analysis.strategy.max_drawdown_pct)}
                  detail={`${analysis.strategy.loss_count} losing ${analysis.strategy.loss_count === 1 ? "trade" : "trades"}`}
                />
                <Stat
                  label="Days in cash"
                  value={String(analysis.strategy.cash_days)}
                  detail={`of ${analysis.strategy.curve.length} sessions`}
                />
              </div>
              <div className="panel chart-panel">
                <div className="chart-title">
                  <strong>Equity path</strong>
                  <small>USD · net of modeled trading costs</small>
                </div>
                <LineChart
                  series={[
                    {
                      name: "Pairs strategy",
                      color: "#007f75",
                      points: analysis.strategy.curve,
                    },
                    {
                      name: "Inverse",
                      color: "#d07b55",
                      points: analysis.inverse.curve,
                    },
                    {
                      name: "50/50 buy & hold",
                      color: "#314f8c",
                      points: analysis.benchmark,
                    },
                  ]}
                />
              </div>
              <div className="panel trade-table">
                <h3>Completed trades</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Signal</th>
                        <th>Entry → Exit</th>
                        <th>Position</th>
                        <th>Reason</th>
                        <th>Net P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.strategy.trades.length ? (
                        analysis.strategy.trades.map((t, i) => (
                          <tr key={i}>
                            <td>{t.signal_date}</td>
                            <td>
                              {t.entry_date} → {t.exit_date}
                            </td>
                            <td>
                              {t.direction === 1
                                ? `Long ${analysis.symbols[0]}`
                                : `Short ${analysis.symbols[0]}`}
                            </td>
                            <td>{t.reason}</td>
                            <td
                              className={t.pnl >= 0 ? "positive" : "negative"}
                            >
                              {signed(t.return_pct)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            No completed trades in the sample.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        <section id="methodology" className="methodology">
          <div>
            <span className="section-kicker">METHOD / SOURCES / LIMITS</span>
            <h2>Show the work.</h2>
          </div>
          <div className="method-grid">
            <div>
              <h3>Market data</h3>
              <p>
                Fixed daily snapshot through December 2024. Three tickers come
                from a CC0 S&P 500 archive. KO comes from a separate CC0 archive
                because the first archive contains empty KO rows.
              </p>
              <a
                href="https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks"
                target="_blank"
                rel="noreferrer"
              >
                S&P 500 dataset ↗
              </a>
              <a
                href="https://www.kaggle.com/datasets/isaaclopgu/coca-cola-stock-daily-updated"
                target="_blank"
                rel="noreferrer"
              >
                KO dataset ↗
              </a>
            </div>
            <div>
              <h3>Financial statements</h3>
              <p>
                Annual reported facts from SEC companyfacts, restricted to 10-K
                filings available by the same cutoff. Fiscal year ends differ;
                company values should be read within those periods.
              </p>
              <a
                href="https://www.sec.gov/search-filings/edgar-application-programming-interfaces"
                target="_blank"
                rel="noreferrer"
              >
                SEC data APIs ↗
              </a>
            </div>
            <div>
              <h3>Interpretation</h3>
              <p>
                Adjusted research prices can differ from executable quotes.
                Costs exclude borrow fees, financing, taxes, and market impact.
                Cointegration tests, thresholds, and past returns do not
                establish a profitable future strategy.
              </p>
              <a href="#methodology">Review the method ↑</a>
            </div>
          </div>
          <div className="method-footer">
            <span>Built as an FP&A and research case study</span>
            <span>
              {analysis?.serviceMode === "azure" &&
              scenario?.serviceMode === "azure"
                ? "Calculations served by Azure Functions"
                : "Local dated snapshot · Azure service not connected"}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
