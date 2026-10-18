"use client";
import { useEffect, useMemo, useState } from "react";
import LineChart from "./LineChart";
import PriceChart from "./PriceChart";
import { exitLabel, replayWhatIf } from "@/lib/whatIf";
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
  const [whatIfDirection, setWhatIfDirection] = useState<1 | -1>(1);
  const [whatIfCapital, setWhatIfCapital] = useState(10000);
  const [replayedKey, setReplayedKey] = useState("");
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
  const lastTrade = analysis?.strategy.trades.at(-1);
  const sessionsAfterLastTrade =
    analysis?.signals.filter(
      (item) => lastTrade && item.date > lastTrade.exit_date,
    ).length ?? 0;
  const priceRanges = analysis?.symbols.map((symbol, index) => {
    const values = analysis.prices.map((item) =>
      index === 0 ? item.y_price : item.x_price,
    );
    return {
      symbol,
      low: Math.min(...values),
      high: Math.max(...values),
      first: values[0],
      last: values.at(-1)!,
    };
  });
  const whatIf =
    analysis && signal
      ? replayWhatIf(analysis, signal.date, whatIfDirection, whatIfCapital)
      : null;
  const whatIfKey = `${pair}|${signal?.date}|${whatIfDirection}|${whatIfCapital}`;
  const showWhatIf = replayedKey === whatIfKey;
  const tradeWorkbookUrl = `/api/trade-workbook?pair=${pair}&date=${signal?.date || ""}&direction=${whatIfDirection}&capital=${whatIfCapital}`;
  const tradeBriefUrl = `/trade-brief?pair=${pair}&date=${signal?.date || ""}&direction=${whatIfDirection}&capital=${whatIfCapital}`;
  const recentDivergences =
    analysis?.signals
      .filter(
        (item) =>
          item.date >= "2024-01-01" &&
          Math.abs(item.z) >= analysis.model.entry_z &&
          item.action === "no trade",
      )
      .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
      .slice(0, 2) ?? [];
  const benchmarkReturn = analysis
    ? 100 * (analysis.benchmark.at(-1)!.equity / 10000 - 1)
    : 0;

  return (
    <main>
      <header className="site-header">
        <div className="brand">
          <div className="brand-icon">
            P<span>·</span>T
          </div>
          <div>
            <strong>Pairs Trading Stocks</strong>
            <small>A guided finance research case study</small>
          </div>
        </div>
        <div className="header-right">
          <span className="snapshot-pill">
            Research data through 20 Dec 2024
          </span>
          <a href="#guide">How to use this</a>
        </div>
      </header>
      <div className="wrap">
        <section id="guide" className="guide-section">
          <div className="guide-title">
            <span className="section-kicker">START HERE / 90-SECOND GUIDE</span>
            <h2>How to use this lab</h2>
            <p>
              Follow the evidence in order. Green and red returns are past
              modeled outcomes, not future price calls.
            </p>
          </div>
          <div className="guide-steps">
            <a href="#prices">
              <b>01</b>
              <strong>Compare the two prices</strong>
              <span>
                See each stock’s adjusted price range. Lines start at 100 so
                different share prices are comparable.
              </span>
              <em>Explore prices ↗</em>
            </a>
            <a href="#signals">
              <b>02</b>
              <strong>Inspect a past decision</strong>
              <span>
                Pick a day or a completed trade. The model either gives two legs
                or explains why it stayed out.
              </span>
              <em>Open signal lab ↗</em>
            </a>
            <a href="#results">
              <b>03</b>
              <strong>Follow the outcome</strong>
              <span>
                Check the next-close entry, exit, costs, and loss as well as the
                periods with no trades.
              </span>
              <em>Review results ↗</em>
            </a>
            <a href="#planner">
              <b>04</b>
              <strong>Plan operating scenarios</strong>
              <span>
                Change revenue growth and margin to explore company operating
                income. This is separate from the stock model.
              </span>
              <em>Try FP&A ↗</em>
            </a>
          </div>
        </section>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              INTERACTIVE RESEARCH NOTE / TWO COMPANY PAIRS
            </span>
            <h1>
              See the prices.
              <br />
              Understand the <em>decision.</em>
            </h1>
            <p>
              Explore when a historical pair model would have bought one stock
              and shorted the other, what happened next, and how company
              fundamentals change under your own assumptions.
            </p>
            <a className="hero-cta" href="#guide">
              Start the walkthrough ↓
            </a>
          </div>
          <div className="hero-aside">
            <span>READ THIS FIRST</span>
            <p>
              A trade ending in 2022 does not mean the data ended there. The
              model kept checking through December 2024 and found no later
              qualifying entry for Microsoft and Oracle.
            </p>
            <span className="aside-line" />
            <small>Historical research, not a live buy signal.</small>
          </div>
        </section>

        <section className="pair-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">CHOOSE A PAIR</span>
              <h2>Which companies do you want to study?</h2>
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

        <section id="prices" className="prices-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">PRICE HISTORY / 2018–2024</span>
              <h2>What did each stock actually do?</h2>
            </div>
            <p>
              Two adjusted research-price histories, aligned on the same trading
              days. The 100-point scale shows relative change, not dollars.
            </p>
          </div>
          <div className="panel prices-panel">
            {analysis ? (
              <>
                <div className="price-context">
                  <strong>{pairNames[pair].title}</strong>
                  <span>
                    {analysis.start_date} → {analysis.end_date} ·{" "}
                    {analysis.prices.length.toLocaleString()} aligned sessions
                  </span>
                </div>
                <PriceChart
                  prices={analysis.prices}
                  symbols={analysis.symbols}
                  trades={analysis.strategy.trades}
                  selectedDate={signal?.date || analysis.end_date}
                />
                <div className="range-grid">
                  {priceRanges?.map((range) => (
                    <div key={range.symbol}>
                      <span>{range.symbol} · adjusted research price</span>
                      <strong>
                        {price(range.low)} – {price(range.high)}
                      </strong>
                      <small>
                        First {price(range.first)} · Last {price(range.last)}
                      </small>
                    </div>
                  ))}
                </div>
                <p className="chart-explainer">
                  Circles mark simulated entries; squares mark exits. A rising
                  stock by itself is not a pair signal. The model also requires
                  a large relative spread and a qualifying historical
                  relationship.
                </p>
                <div className="split-note">
                  <strong>What about stock splits?</strong>
                  <p>
                    The chart uses retrospectively adjusted research prices, so
                    split events are not shown as sudden tradable drops. The
                    linked split records predate this 2018–2024 view:{" "}
                    <a
                      href="https://investors.coca-colacompany.com/stock-info/splits"
                      target="_blank"
                      rel="noreferrer"
                    >
                      KO 2012
                    </a>
                    ,{" "}
                    <a
                      href="https://pepsico.gcs-web.com/static-files/6975b0df-bde6-43e8-952f-ec0bf38e9a91"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PEP 1996
                    </a>
                    ,{" "}
                    <a
                      href="https://www.microsoft.com/en-us/investor/faq"
                      target="_blank"
                      rel="noreferrer"
                    >
                      MSFT 2003
                    </a>
                    , and{" "}
                    <a
                      href="https://investor.oracle.com/investor-news/news-details/2000/Oracle-Reports-Net-Income-Up-111-Earnings-Per-Share-017-Application-Sales-Up-42-Database-Sales-Up-32-Oracle-Stock-to-Split-2-for-1/default.aspx"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ORCL 2000
                    </a>
                    . These sources describe corporate actions; the plotted
                    series is not a raw execution quote.
                  </p>
                </div>
              </>
            ) : (
              <p className="loading">Loading price history…</p>
            )}
          </div>
        </section>

        <section id="signals" className="historical-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">
                HISTORICAL DECISION / ONE DAY AT A TIME
              </span>
              <h2>Would the model have bought either stock?</h2>
            </div>
            <p>
              Select a past trading day. Model parameters are fitted without
              that day or any later prices. A large relative price gap does not
              prove either company is undervalued.
            </p>
          </div>
          {analysis && recentDivergences.length > 0 && (
            <div className="divergence-strip">
              <div>
                <span className="section-kicker">MORE DATES TO EXPLORE</span>
                <strong>
                  A price gap is not automatically a strategy trade.
                </strong>
                <p>
                  These 2024 days crossed the spread threshold but failed the
                  relationship test. Open one, choose a direction, and replay
                  the outcome for learning.
                </p>
              </div>
              {recentDivergences.map((item) => (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                >
                  <b>{item.date}</b>
                  <span>Spread {item.z.toFixed(2)}σ · no signal</span>
                  <em>Inspect day ↗</em>
                </button>
              ))}
            </div>
          )}
          {analysis && (
            <div className="date-status">
              <strong>Data ends {analysis.end_date}.</strong>
              <span>
                Last completed trade:{" "}
                {lastTrade
                  ? `${lastTrade.entry_date} → ${lastTrade.exit_date} (${signed(lastTrade.return_pct)} net)`
                  : "none"}
                .{" "}
                {lastTrade &&
                  `${sessionsAfterLastTrade.toLocaleString()} later trading sessions had no new completed trade.`}
              </span>
            </div>
          )}
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
                    Show last trade example
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
                      label={`${analysis?.symbols[0]} adjusted price`}
                      value={price(signal.y_price)}
                      detail="observed at selected close"
                    />
                    <Stat
                      label={`${analysis?.symbols[1]} adjusted price`}
                      value={price(signal.x_price)}
                      detail="observed at selected close"
                    />
                  </div>
                  {signal.action === "entry queued" && (
                    <div className="levels">
                      <div>
                        <span>
                          NEXT-CLOSE FILL · {analysis?.symbols[0]} /{" "}
                          {analysis?.symbols[1]}
                        </span>
                        <strong>
                          {matchingTrade
                            ? `${price(matchingTrade.entry_y)} / ${price(matchingTrade.entry_x)}`
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
                      <strong>
                        {matchingTrade.direction === 1
                          ? `Buy ${analysis?.symbols[0]} · short ${analysis?.symbols[1]}`
                          : `Short ${analysis?.symbols[0]} · buy ${analysis?.symbols[1]}`}
                      </strong>
                      <br />
                      Entry {matchingTrade.entry_date}:{" "}
                      {price(matchingTrade.entry_y)} /{" "}
                      {price(matchingTrade.entry_x)}. Exit{" "}
                      {matchingTrade.exit_date}: {price(matchingTrade.exit_y)} /{" "}
                      {price(matchingTrade.exit_x)}.<br />
                      Net simulated result after modeled transaction costs:{" "}
                      <strong
                        className={
                          matchingTrade.pnl >= 0 ? "positive" : "negative"
                        }
                      >
                        {signed(matchingTrade.return_pct)}
                      </strong>{" "}
                      over {matchingTrade.holding_days} trading days ·{" "}
                      {exitLabel(matchingTrade.reason)} exit.
                    </div>
                  )}
                  {signal.action === "entry queued" && (
                    <p className="footnote">
                      *Research-price level for {analysis?.symbols[0]} if{" "}
                      {analysis?.symbols[1]} stays fixed at its selected-day
                      adjusted price. The model does not predict a future quote.
                    </p>
                  )}
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
                Target and stop refer to the spread z-score, not a fixed P/L
                percentage; a spread stop can still show a dollar gain.
              </p>
            </div>
          </div>
          <div className="panel what-if-panel">
            <div className="what-if-heading">
              <div>
                <span className="section-kicker">
                  INTERACTIVE HISTORICAL REPLAY
                </span>
                <h3>What if you took a pair position?</h3>
                <p>
                  Choose a past day above and a direction below. This replays a
                  hypothetical trade with the same next-close fill, exit
                  boundaries, 20-day limit, and costs. It does not add a trade
                  to the tested strategy.
                </p>
              </div>
              <span className="what-if-tag">
                Experiment · not strategy performance
              </span>
            </div>
            <div className="what-if-controls">
              <div>
                <label>Position</label>
                <div className="segment">
                  <button
                    className={whatIfDirection === 1 ? "selected" : ""}
                    onClick={() => setWhatIfDirection(1)}
                  >
                    Buy {analysis?.symbols[0]} / short {analysis?.symbols[1]}
                  </button>
                  <button
                    className={whatIfDirection === -1 ? "selected" : ""}
                    onClick={() => setWhatIfDirection(-1)}
                  >
                    Short {analysis?.symbols[0]} / buy {analysis?.symbols[1]}
                  </button>
                </div>
              </div>
              <label>
                Gross capital, USD
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={whatIfCapital}
                  onChange={(e) => setWhatIfCapital(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              className="replay-button"
              disabled={
                !whatIf || whatIfCapital > 1000000 || whatIfCapital < 1000
              }
              onClick={() => setReplayedKey(whatIfKey)}
            >
              Make this historical trade →
            </button>
            {showWhatIf && whatIf && analysis ? (
              <>
                <p className="decision-verdict">
                  {signal?.action === "entry queued"
                    ? whatIfDirection === signal.direction
                      ? "Decision review: your direction matched the model's historical entry."
                      : "Decision review: you chose the opposite direction from the model's historical entry."
                    : "Decision review: the tested model stayed out on this day; this result belongs only to your what-if."}
                </p>
                <div className="what-if-result">
                  <div>
                    <span>Hypothetical entry · {whatIf.entry_date}</span>
                    <strong>
                      {analysis.symbols[0]} {price(whatIf.entry_y)} <i>/</i>{" "}
                      {analysis.symbols[1]} {price(whatIf.entry_x)}
                    </strong>
                  </div>
                  <div>
                    <span>
                      Exit · {whatIf.exit_date} · {exitLabel(whatIf.reason)}
                    </span>
                    <strong>
                      {analysis.symbols[0]} {price(whatIf.exit_y)} <i>/</i>{" "}
                      {analysis.symbols[1]} {price(whatIf.exit_x)}
                    </strong>
                  </div>
                  <div>
                    <span>Net result after modeled costs</span>
                    <strong
                      className={whatIf.pnl >= 0 ? "positive" : "negative"}
                    >
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(whatIf.pnl)}{" "}
                      <small>({signed(whatIf.return_pct)})</small>
                    </strong>
                  </div>
                </div>
                <a className="report-button" href={tradeWorkbookUrl}>
                  Download trade analysis Excel ↓
                </a>
                <a
                  className="report-button"
                  href={tradeBriefUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open one-page decision note ↗
                </a>
              </>
            ) : (
              <p className="what-if-empty">
                {whatIf
                  ? "Choose a position, commit to it, then reveal the historical result."
                  : "Choose an earlier trading day with a following session and a capital amount from $1,000 to $1,000,000."}
              </p>
            )}
            {signal && (
              <p className="footnote">
                On {signal.date}, the tested strategy{" "}
                {signal.action === "entry queued"
                  ? "did queue a trade"
                  : "did not open a new trade"}
                . This experiment deliberately allows either direction; its
                result uses later historical prices and was unknowable on the
                selected day. Short borrowing costs, financing, and taxes are
                excluded.
              </p>
            )}
          </div>
        </section>

        <section id="results" className="performance-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">RESULTS / THE FULL SAMPLE</span>
              <h2>What happened after the decisions?</h2>
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
                  detail={`${analysis.strategy.trade_count} completed ${analysis.strategy.trade_count === 1 ? "trade" : "trades"}`}
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
                        <th>Both legs</th>
                        <th>Reason</th>
                        <th>Net P/L</th>
                        <th>Explore</th>
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
                                ? `Buy ${analysis.symbols[0]} / short ${analysis.symbols[1]}`
                                : `Short ${analysis.symbols[0]} / buy ${analysis.symbols[1]}`}
                            </td>
                            <td>{exitLabel(t.reason)}</td>
                            <td
                              className={t.pnl >= 0 ? "positive" : "negative"}
                            >
                              {signed(t.return_pct)}
                            </td>
                            <td>
                              <button
                                className="inspect-trade"
                                onClick={() => {
                                  setSelectedDate(t.signal_date);
                                  document
                                    .getElementById("signals")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }}
                              >
                                Inspect ↗
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
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

        <section id="planner" className="scenario-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">
                FINANCIAL PLANNING / SEPARATE FROM STOCK PRICES
              </span>
              <h2>What if the business performs differently?</h2>
            </div>
            <p>
              These controls change next-year revenue and operating income, not
              the price chart or trade signals. They are your assumptions.
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
                <button onClick={() => preset("downside")}>
                  Lower operating case
                </button>
                <button onClick={() => preset("base")}>
                  Repeat reported rates
                </button>
                <button onClick={() => preset("upside")}>
                  Higher operating case
                </button>
              </div>
              <p className="preset-help">
                Lower / higher changes revenue growth by ∓5 percentage points
                and operating margin by ∓2 points from the last reported rates.
                These are examples, not company forecasts or share-price upside.
              </p>
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
                  {baseIsReady ? "Your assumptions" : "Calculating"}
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
                      {money(scenario.total_change)} vs. repeating reported
                      rates
                    </span>
                  </div>
                  <div className="outcome-stats">
                    <Stat
                      label="Projected revenue"
                      value={money(scenario.scenario_revenue)}
                    />
                    <Stat
                      label="If reported rates repeat"
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
              Vercel app · fixed historical research snapshot through 2024-12-20
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
