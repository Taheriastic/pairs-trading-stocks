"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DailyData, DailyTrade } from "@/lib/dailyTypes";
import type { Financials } from "@/lib/types";
import {
  DAILY_RULES,
  benchmarkDaily,
  directionFor,
  pairSymbols,
  replayDaily,
  ruleById,
  scoreAt,
  simulateDaily,
  weightsFor,
} from "@/lib/dailyEngine";
import LabChart, { type ChartSeries } from "./LabChart";
import LabTour, { TOUR_STEPS } from "./LabTour";
import { LabMark, TickerMark } from "./LabMark";
import PowerBIReport from "./PowerBIReport";

const usd = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(v);
const percent = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const names: Record<string, string> = {
  KO: "Coca-Cola",
  PEP: "PepsiCo",
  MSFT: "Microsoft",
  ORCL: "Oracle",
};
const tones = (v: number) => (v < 0 ? "lab-negative" : "lab-positive");
function Metric({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="lab-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function positionLabel(w: [number, number], symbols: [string, string]) {
  return (
    w
      .map((v, i) => (v ? `${v > 0 ? "Buy" : "Short"} ${symbols[i]}` : null))
      .filter(Boolean)
      .join(" / ") || "Cash"
  );
}
function periodStart(data: DailyData, years: number) {
  return years === 20
    ? data.start_index
    : Math.max(
        data.start_index,
        data.dates.findIndex(
          (d) =>
            d >=
            `${Number(data.end_date.slice(0, 4)) - years}${data.end_date.slice(4)}`,
        ),
      );
}

export default function DailyLab({
  data,
  financials,
}: {
  data: DailyData;
  financials: Financials;
}) {
  const [pair, setPair] = useState("KO-PEP"),
    [ruleId, setRuleId] = useState("rotation20"),
    [cost, setCost] = useState(10);
  const [tab, setTab] = useState("research"),
    [view, setView] = useState<"prices" | "equity" | "gap">("prices");
  const [range, setRange] = useState(20),
    [selected, setSelected] = useState(data.dates.length - 23);
  const [showBenchmark, setShowBenchmark] = useState(true),
    [sort, setSort] = useState("return"),
    [tradePage, setTradePage] = useState(0);
  const [position, setPosition] = useState("rule"),
    [hold, setHold] = useState(20),
    [capital, setCapital] = useState(10000),
    [replayKey, setReplayKey] = useState("");
  const [tourStep, setTourStep] = useState(-1),
    [tourComplete, setTourComplete] = useState(false);
  const [company, setCompany] = useState("KO"),
    [growth, setGrowth] = useState(0.1),
    [margin, setMargin] = useState(0.25);
  const symbols = useMemo(() => pairSymbols(pair), [pair]);
  const rule = ruleById(ruleId),
    last = data.dates.length - 1;
  const all = useMemo(
    () =>
      Object.fromEntries(
        DAILY_RULES.map((r) => [r.id, simulateDaily(data, pair, r, cost)]),
      ),
    [data, pair, cost],
  );
  const result = all[ruleId];
  const gross = useMemo(
    () => simulateDaily(data, pair, rule, 0),
    [data, pair, rule],
  );
  const start = useMemo(() => periodStart(data, range), [data, range]);
  const end = last;
  const initial = result.curve[start],
    final = result.curve[end],
    rangeReturn = 100 * (final / initial - 1);
  const periodTrades = result.trades.filter((t) => t.entry >= start);
  let peak = initial,
    drawdown = 0;
  for (const v of result.curve.slice(start)) {
    peak = Math.max(peak, v);
    drawdown = Math.min(drawdown, 100 * (v / peak - 1));
  }
  const benchmark = useMemo(
    () => benchmarkDaily(data, pair, cost),
    [data, pair, cost],
  );
  const benchmarkReturn = 100 * (benchmark[end] / benchmark[start] - 1);
  const series = useMemo<ChartSeries[]>(() => {
    if (view === "prices")
      return symbols.map((s, i) => ({
        name: s,
        color: i ? "#d7934c" : "#237b72",
        values: data.indices[s],
      }));
    if (view === "equity") {
      const lines = [
        {
          name: rule.name,
          color: "#237b72",
          values: result.curve.map((v) => (v / result.curve[start]) * 10000),
        },
      ];
      if (showBenchmark)
        lines.push({
          name: "50/50 buy & hold",
          color: "#95a1b1",
          values: benchmark.map((v) => (v / benchmark[start]) * 10000),
        });
      return lines;
    }
    return [
      {
        name: `${symbols[0]} minus ${symbols[1]} · 20-session return`,
        color: "#5667a4",
        values: data.dates.map((_, i) =>
          i < 20
            ? 0
            : 100 *
              (data.indices[symbols[0]][i] / data.indices[symbols[0]][i - 20] -
                1 -
                (data.indices[symbols[1]][i] /
                  data.indices[symbols[1]][i - 20] -
                  1)),
        ),
      },
    ];
  }, [view, symbols, data, result, rule, showBenchmark, benchmark, start]);
  const score = scoreAt(
      data.indices[symbols[0]],
      data.indices[symbols[1]],
      selected,
      rule,
    ),
    suggested = weightsFor(directionFor(score, rule), rule);
  const weights: [number, number] =
    position === "rule"
      ? suggested
      : position === "a"
        ? [1, 0]
        : position === "b"
          ? [0, 1]
          : position === "ab"
            ? [0.5, -0.5]
            : [-0.5, 0.5];
  const replay = replayDaily(
    data,
    pair,
    selected,
    weights,
    hold,
    capital,
    cost,
  );
  const currentReplayKey = [
    pair,
    ruleId,
    selected,
    position,
    hold,
    capital,
    cost,
  ].join(":");
  const exportParams = new URLSearchParams({
    pair,
    strategy: ruleId,
    cost: String(cost),
    date: data.dates[selected],
    position,
    hold: String(hold),
    capital: String(capital),
  }).toString();
  const displayTrades = [...result.trades]
    .reverse()
    .slice(tradePage * 8, tradePage * 8 + 8);
  const sorted = Object.values(all).sort((a, b) =>
    sort === "trades"
      ? b.trades.length - a.trades.length
      : sort === "drawdown"
        ? b.drawdown - a.drawdown
        : b.totalReturn - a.totalReturn,
  );
  const stopTour = useCallback(() => {
    setTourStep(-1);
    try {
      localStorage.setItem("pairs-tour-daily-v1", "done");
    } catch {}
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (!localStorage.getItem("pairs-tour-daily-v1")) setTourStep(0);
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const complete = (step: number) => {
    if (tourStep === step) setTourComplete(true);
  };
  const goTab = (next: string) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectDay = (i: number) => {
    setSelected(i);
    if (i < start) setRange(20);
    complete(2);
  };
  const changePair = (p: string) => {
    setPair(p);
    setTradePage(0);
    complete(0);
  };
  const changeRule = (id: string) => {
    setRuleId(id);
    setTradePage(0);
    complete(1);
  };
  const nextTour = () => {
    if (tourStep === TOUR_STEPS.length - 1) {
      stopTour();
      return;
    }
    setTourStep(tourStep + 1);
    setTourComplete(false);
    if (tourStep + 1 === 3) setTab("research");
  };
  const restartTour = () => {
    setTab("research");
    setTourStep(0);
    setTourComplete(false);
  };
  const inspectTrade = (trade: DailyTrade) => {
    setSelected(trade.signal);
    setRange(20);
    setHold(trade.exit - trade.entry);
    setCapital(Number(trade.capital.toFixed(2)));
    setPosition(
      rule.mode === "long"
        ? trade.weights[0] > 0
          ? "a"
          : "b"
        : trade.direction === 1
          ? "ab"
          : "ba",
    );
    setTab("research");
    document
      .getElementById("replay-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const fin = financials.companies[company],
    projectedRevenue = fin.revenue * (1 + growth),
    projectedIncome = projectedRevenue * margin,
    baseRevenue = fin.revenue * (1 + fin.growth),
    baseIncome = baseRevenue * fin.operating_margin;
  return (
    <div className="daily-lab">
      <header className="lab-header">
        <a
          className="lab-brand"
          href="#prices"
          aria-label="Pairs Trading home"
          onClick={(e) => {
            e.preventDefault();
            goTab("research");
          }}
        >
          <LabMark />
          <span>
            Pairs Trading<small>A historical strategy lab</small>
          </span>
        </a>
        <nav aria-label="Workspace">
          <button
            className={tab === "research" ? "active" : ""}
            onClick={() => goTab("research")}
          >
            Workspace
          </button>
          <button
            id="lab-compare"
            className={tab === "compare" ? "active" : ""}
            onClick={() => {
              goTab("compare");
              complete(4);
            }}
          >
            Compare 10 rules
          </button>
          <button
            className={tab === "finance" ? "active" : ""}
            onClick={() => goTab("finance")}
          >
            Fundamentals
          </button>
          <button
            className={tab === "sources" ? "active" : ""}
            onClick={() => goTab("sources")}
          >
            Data & method
          </button>
        </nav>
        <button className="tour-restart" onClick={restartTour}>
          <span>?</span> Walkthrough
        </button>
      </header>
      <main className="lab-main">
        <div className="lab-title-row">
          <div>
            <div className="lab-eyebrow">
              <i />{" "}
              {tab === "finance"
                ? "FINANCIAL PLANNING / SEC FILINGS"
                : "DAILY RESEARCH / FIXED SNAPSHOT"}
            </div>
            <h1>
              {tab === "finance"
                ? "Revenue, margin and operating income."
                : "Two companies. Ten ways to trade."}
            </h1>
            <p>
              {tab === "finance"
                ? "Compare reported figures and build a revenue and margin scenario."
                : "Test relative reversals, follow trends, or rotate between stocks. See what actually happened."}
            </p>
          </div>
          <div className="snapshot-label">
            <strong>
              {tab === "finance"
                ? "Annual SEC statements"
                : `${data.sessions.toLocaleString()} sessions`}
            </strong>
            <span>
              {tab === "finance"
                ? "Available by 23 Dec 2024"
                : "16 Oct 2006 → 16 Oct 2026"}
            </span>
            <small>
              {tab === "finance"
                ? "Fiscal periods differ by company"
                : "Daily closes · no intraday feed"}
            </small>
          </div>
        </div>
        {(tab === "research" || tab === "compare") && (
          <div className="lab-toolbar">
            <div
              id="lab-pair"
              className="pair-switch"
              role="group"
              aria-label="Choose company pair"
            >
              {["KO-PEP", "MSFT-ORCL"].map((p) => {
                const ss = pairSymbols(p);
                return (
                  <button
                    key={p}
                    aria-pressed={pair === p}
                    onClick={() => changePair(p)}
                  >
                    <span className="pair-logos">
                      <TickerMark symbol={ss[0]} />
                      <TickerMark symbol={ss[1]} />
                    </span>
                    <span>
                      {names[ss[0]]} <i>/</i> {names[ss[1]]}
                      <small>{p.replace("-", " · ")}</small>
                    </span>
                    {pair === p && <b>✓</b>}
                  </button>
                );
              })}
            </div>
            <label id="lab-rule" className="rule-select">
              Strategy
              <select
                value={ruleId}
                onChange={(e) => changeRule(e.target.value)}
              >
                {["Pair reversal", "Pair trend", "Stock rotation"].map(
                  (family) => (
                    <optgroup key={family} label={family}>
                      {DAILY_RULES.filter((r) => r.family === family).map(
                        (r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ),
                )}
              </select>
            </label>
            <label className="cost-control">
              Cost per leg / transaction
              <strong>
                {cost} bps <span>({(cost / 100).toFixed(2)}%)</span>
              </strong>
              <input
                aria-label="Transaction cost in basis points"
                type="range"
                min="0"
                max="25"
                step="1"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        {tab === "research" && (
          <>
            <div className="strategy-note">
              <span
                className={`exposure-tag ${rule.mode === "long" ? "long-only" : ""}`}
              >
                {rule.mode === "long"
                  ? "100% long · no short leg"
                  : "50% long / 50% short"}
              </span>
              <p>{rule.explanation}</p>
            </div>
            <div className="lab-metrics">
              <Metric
                label={`${range === 20 ? "20-year" : "Visible-window"} net return`}
                value={percent(rangeReturn)}
                tone={tones(rangeReturn)}
                note={`${usd(10000)} → ${usd(10000 * (1 + rangeReturn / 100))}`}
              />
              <Metric
                label="Largest decline from peak"
                value={percent(drawdown)}
                note="Maximum drawdown in this window"
              />
              <Metric
                label="Completed positions"
                value={periodTrades.length.toLocaleString()}
                note={`${periodTrades.filter((t) => t.pnl < 0).length} lost money · includes costs`}
              />
              <Metric
                label="50/50 buy & hold"
                value={percent(benchmarkReturn)}
                tone={tones(benchmarkReturn)}
                note="Both stocks held · same transaction rate"
              />
            </div>
            <section id="prices" className="lab-chart-panel">
              <div className="chart-panel-top">
                <div>
                  <span className="lab-eyebrow">EXPLORE THE EVIDENCE</span>
                  <h2>
                    {view === "prices"
                      ? "How the stocks moved"
                      : view === "equity"
                        ? "What happened to $10,000"
                        : "Did the relative gap reverse?"}
                  </h2>
                </div>
                <div
                  className="chart-tabs"
                  role="group"
                  aria-label="Chart type"
                >
                  {(
                    [
                      ["prices", "Stock prices"],
                      ["equity", "Portfolio value"],
                      ["gap", "Relative gap"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-options">
                <div
                  className="range-buttons"
                  role="group"
                  aria-label="Chart period"
                >
                  {[1, 5, 10, 20].map((y) => (
                    <button
                      key={y}
                      className={range === y ? "active" : ""}
                      onClick={() => {
                        setRange(y);
                        setSelected(Math.max(selected, periodStart(data, y)));
                      }}
                    >
                      {y === 20 ? "All 20Y" : `${y}Y`}
                    </button>
                  ))}
                </div>
                <span>
                  {end - start + 1} visible sessions
                  {range < 20
                    ? " · strategy continues from earlier history"
                    : ""}
                </span>
                {view === "equity" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={showBenchmark}
                      onChange={(e) => setShowBenchmark(e.target.checked)}
                    />{" "}
                    Buy & hold
                  </label>
                )}
              </div>
              <div id="lab-chart">
                <LabChart
                  dates={data.dates}
                  series={series}
                  start={start}
                  end={end}
                  selected={selected}
                  onSelect={selectDay}
                  unit={
                    view === "equity" ? "USD" : view === "gap" ? "%" : "index"
                  }
                />
              </div>
              <div className="chart-footnote">
                <span>
                  {view === "prices"
                    ? "Each stock starts at 100 on 16 Oct 2006. These are normalized research indices, not dollar share prices."
                    : view === "equity"
                      ? "Portfolio values are rebased to $10,000 at the left edge. Stock rotation has market exposure; pair positions carry short risk."
                      : "Difference between the two stocks’ 20-session returns. A gap crossing zero means relative performance switched; it does not mean the share prices became equal."}
                  {pair === "KO-PEP" && view === "prices" && (
                    <button
                      className="split-jump"
                      onClick={() => {
                        setRange(20);
                        selectDay(data.dates.indexOf("2012-08-13"));
                      }}
                    >
                      Inspect KO’s 2012 two-for-one split ↗
                    </button>
                  )}
                </span>
                <label>
                  Decision date
                  <input
                    aria-label="Decision date"
                    type="date"
                    min={data.start_date}
                    max={data.end_date}
                    value={data.dates[selected]}
                    onChange={(e) => {
                      const i = data.dates.findLastIndex(
                        (d) => d <= e.target.value,
                      );
                      if (i >= data.start_index) selectDay(i);
                    }}
                  />
                </label>
              </div>
            </section>
            <div className="research-bottom">
              <section id="replay-panel" className="lab-panel replay-panel">
                <div className="panel-heading">
                  <div>
                    <span className="lab-eyebrow">
                      YOUR HISTORICAL DECISION
                    </span>
                    <h2>What if you made this trade?</h2>
                  </div>
                  <span className="small-label">{data.dates[selected]}</span>
                </div>
                <div className="decision-card">
                  <span>Rule’s next review direction</span>
                  <strong>{positionLabel(suggested, symbols)}</strong>
                  <p>
                    {rule.kind === "ratio"
                      ? "Log-ratio deviation from its prior mean"
                      : "Relative log return"}
                    : <b>{percent(score * 100)}</b>.{" "}
                    {rule.follow
                      ? "This rule follows the stronger stock."
                      : "This rule takes the relatively weaker side."}{" "}
                    {(selected - data.start_index) % rule.cadence !== 0 &&
                      `The actual strategy reviews every ${rule.cadence} sessions; this selected day is between scheduled reviews.`}
                  </p>
                </div>
                <div className="replay-inputs">
                  <label>
                    Position
                    <select
                      aria-label="Replay position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      <option value="rule">Use this rule’s direction</option>
                      <option value="ab">
                        Buy {symbols[0]} / short {symbols[1]}
                      </option>
                      <option value="ba">
                        Short {symbols[0]} / buy {symbols[1]}
                      </option>
                      <option value="a">Buy {symbols[0]} only</option>
                      <option value="b">Buy {symbols[1]} only</option>
                    </select>
                  </label>
                  <label>
                    Gross capital, USD
                    <input
                      aria-label="Replay capital"
                      type="number"
                      min="1000"
                      max="1000000"
                      step="100"
                      value={capital}
                      onChange={(e) => setCapital(Number(e.target.value))}
                    />
                  </label>
                  <label className="hold-control">
                    Hold for <b>{hold} sessions</b>
                    <input
                      aria-label="Replay holding sessions"
                      type="range"
                      min="1"
                      max={Math.max(60, hold)}
                      value={hold}
                      onChange={(e) => setHold(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div id="lab-replay">
                  <button
                    className="lab-primary replay-button"
                    disabled={!replay || capital > 1000000}
                    onClick={() => {
                      setReplayKey(currentReplayKey);
                      complete(3);
                    }}
                  >
                    Run replay <span>→</span>
                  </button>
                </div>
                {!replay && (
                  <p className="lab-warning">
                    Pick an earlier date with at least two following closes and
                    enter $1,000–$1,000,000.
                  </p>
                )}
                {replayKey === currentReplayKey && replay && (
                  <div className="replay-result" aria-live="polite">
                    <div>
                      <span>Historical net outcome</span>
                      <strong className={tones(replay.pnl)}>
                        {usd(replay.pnl, 2)}{" "}
                        <small>{percent(replay.returnPct)}</small>
                      </strong>
                    </div>
                    <dl>
                      {weights.map(
                        (weight, i) =>
                          weight !== 0 && (
                            <div key={i}>
                              <dt>
                                {symbols[i]} {weight > 0 ? "long" : "short"}{" "}
                                contribution
                              </dt>
                              <dd>
                                {usd(
                                  i === 0
                                    ? replay.sharesA *
                                        (replay.exitA - replay.entryA)
                                    : replay.sharesB *
                                        (replay.exitB - replay.entryB),
                                  2,
                                )}
                              </dd>
                            </div>
                          ),
                      )}
                      <div>
                        <dt>Next-close entry</dt>
                        <dd>{data.dates[replay.entry]}</dd>
                      </div>
                      <div>
                        <dt>Exit</dt>
                        <dd>{data.dates[replay.exit]}</dd>
                      </div>
                      <div>
                        <dt>Gross gain / loss</dt>
                        <dd>{usd(replay.gross, 2)}</dd>
                      </div>
                      <div>
                        <dt>Entry + exit costs</dt>
                        <dd>−{usd(replay.entryCost + replay.exitCost, 2)}</dd>
                      </div>
                    </dl>
                    <p>
                      Entry → exit index: {symbols[0]}{" "}
                      {replay.entryA.toFixed(2)} → {replay.exitA.toFixed(2)};{" "}
                      {symbols[1]} {replay.entryB.toFixed(2)} →{" "}
                      {replay.exitB.toFixed(2)}.{" "}
                      {replay.reason.includes("truncated")
                        ? "This holding period reaches the snapshot end and is truncated. "
                        : ""}
                      This visitor replay is separate from the selected
                      strategy’s performance. The outcome was unknown on the
                      decision date.
                    </p>
                    <div className="export-links">
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`/research-brief?${exportParams}`}
                      >
                        Open decision report ↗
                      </a>
                      <a href={`/api/research-workbook?${exportParams}`}>
                        Download Excel ↓
                      </a>
                    </div>
                  </div>
                )}
                <p className="tiny-note">
                  Index units are used for P/L calculations. They do not
                  represent executable share counts. Borrow fees, financing,
                  taxes and intraday fills are excluded.
                </p>
              </section>
              <aside className="lab-panel result-context">
                <span className="lab-eyebrow">READ THE RESULT</span>
                <h2>Profit needs an explanation.</h2>
                <div>
                  <b>01</b>
                  <section>
                    <h3>
                      {rule.mode === "long"
                        ? "You are owning a stock"
                        : "You are trading a relative move"}
                    </h3>
                    <p>
                      {rule.mode === "long"
                        ? "A rotation can profit because the market rose. It does not establish that the loser caught up with the winner."
                        : "The long leg gains when it rises; the short leg gains when it falls. Persistent divergence can keep the pair losing."}
                    </p>
                  </section>
                </div>
                <div>
                  <b>02</b>
                  <section>
                    <h3>Costs compound too</h3>
                    <p>
                      At {cost} bps, the selected strategy paid{" "}
                      {usd(result.costTotal)} in modeled cash transaction costs
                      over the full history. Its zero-cost return was{" "}
                      <strong>{percent(gross.totalReturn)}</strong>; after costs
                      it was <strong>{percent(result.totalReturn)}</strong>.
                    </p>
                  </section>
                </div>
                <div>
                  <b>03</b>
                  <section>
                    <h3>A historical comparison</h3>
                    <p>
                      The ten rules were added after an earlier study of these
                      prices. They are exploratory; none has a genuinely
                      untouched evaluation period. More trades alone do not
                      establish an advantage.
                    </p>
                  </section>
                </div>
                <button
                  className="lab-secondary"
                  onClick={() => {
                    goTab("compare");
                    complete(4);
                  }}
                >
                  Compare the ten rules →
                </button>
              </aside>
            </div>
            <section className="lab-panel ledger">
              <div className="panel-heading">
                <div>
                  <span className="lab-eyebrow">THE AUDIT TRAIL</span>
                  <h2>Every completed position</h2>
                </div>
                <span className="small-label">
                  {result.trades.length} positions · newest first
                </span>
              </div>
              <div className="lab-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Signal → entry</th>
                      <th>Exit</th>
                      <th>Position</th>
                      <th>Net P/L</th>
                      <th>Reason</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {displayTrades.map((t, i) => (
                      <tr key={`${t.entry}-${i}`}>
                        <td>
                          <b>{data.dates[t.signal]}</b>
                          <small>Fill {data.dates[t.entry]}</small>
                        </td>
                        <td>{data.dates[t.exit]}</td>
                        <td>{positionLabel(t.weights, symbols)}</td>
                        <td className={tones(t.pnl)}>
                          {percent(t.returnPct)}
                          <small>{usd(t.pnl, 2)}</small>
                        </td>
                        <td>{t.reason}</td>
                        <td>
                          <button
                            onClick={() => inspectTrade(t)}
                            aria-label={`Inspect position entered ${data.dates[t.entry]}`}
                          >
                            Replay ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ledger-pages">
                <button
                  disabled={tradePage === 0}
                  onClick={() => setTradePage(tradePage - 1)}
                >
                  ← Newer
                </button>
                <span>
                  Page {tradePage + 1} of{" "}
                  {Math.max(1, Math.ceil(result.trades.length / 8))}
                </span>
                <button
                  disabled={(tradePage + 1) * 8 >= result.trades.length}
                  onClick={() => setTradePage(tradePage + 1)}
                >
                  Older →
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "compare" && (
          <section className="lab-panel compare-panel">
            <div className="panel-heading">
              <div>
                <span className="lab-eyebrow">SAME HISTORY / SAME COSTS</span>
                <h2>Ten rules, with the losses included.</h2>
                <p>
                  Full 20-year outcomes. All use next-close fills and 1× gross
                  exposure. These are exploratory historical results.
                </p>
              </div>
              <label>
                Sort by
                <select
                  aria-label="Sort strategies"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="return">Net return</option>
                  <option value="trades">Most positions</option>
                  <option value="drawdown">Smallest drawdown</option>
                </select>
              </label>
            </div>
            <div className="lab-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Exposure</th>
                    <th>Net return</th>
                    <th>Annualized</th>
                    <th>Max drawdown</th>
                    <th>Positions / losses</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const config = ruleById(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={r.id === ruleId ? "selected-rule" : ""}
                      >
                        <td>
                          <b>{config.name}</b>
                          <small>
                            {config.lookback}-session lookback · reviews every{" "}
                            {config.cadence}{" "}
                            {config.cadence === 1 ? "session" : "sessions"}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`exposure-tag ${config.mode === "long" ? "long-only" : ""}`}
                          >
                            {config.mode === "long"
                              ? "Long only"
                              : "Long / short"}
                          </span>
                        </td>
                        <td className={tones(r.totalReturn)}>
                          <b>{percent(r.totalReturn)}</b>
                        </td>
                        <td>{percent(r.cagr)}</td>
                        <td>{percent(r.drawdown)}</td>
                        <td>
                          {r.trades.length} /{" "}
                          {r.trades.filter((t) => t.pnl < 0).length}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              changeRule(r.id);
                              goTab("research");
                            }}
                          >
                            {r.id === ruleId ? "Open ↗" : "Explore ↗"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="tiny-note">
              The return ranking uses the complete history and is hindsight.
              Stock rotation and long/short strategies have different market
              exposure. A profitable long-only rule does not prove convergence.
              A position is counted when entered and later closed; it can
              contain two legs.
            </p>
            <details className="annual-table">
              <summary>Annual performance for {rule.name}</summary>
              <div className="lab-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Net return</th>
                      <th>Positions opened</th>
                      <th>Losing positions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.annual.map((y) => (
                      <tr key={y.year}>
                        <td>{y.year}</td>
                        <td className={tones(y.returnPct)}>
                          {percent(y.returnPct)}
                        </td>
                        <td>{y.trades}</td>
                        <td>{y.losses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}
        {tab === "finance" && (
          <section className="finance-workspace">
            <div className="lab-panel">
              <span className="lab-eyebrow">OPERATING SCENARIOS</span>
              <h2>What if the business changes?</h2>
              <p>
                Financial statements are a separate snapshot available by 23 Dec
                2024. These assumptions change revenue and operating income.
              </p>
              <div className="company-tabs">
                {Object.keys(names).map((s) => (
                  <button
                    className={s === company ? "active" : ""}
                    key={s}
                    onClick={() => {
                      setCompany(s);
                      setGrowth(financials.companies[s].growth);
                      setMargin(financials.companies[s].operating_margin);
                    }}
                  >
                    <TickerMark symbol={s} />
                    {names[s]}
                  </button>
                ))}
              </div>
              <div className="lab-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Revenue</th>
                      <th>Growth</th>
                      <th>Operating income</th>
                      <th>Operating margin</th>
                      <th>Fiscal year end</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(financials.companies).map(([s, c]) => (
                      <tr key={s}>
                        <td>
                          <b>{names[s]}</b>
                        </td>
                        <td>{usd(c.revenue / 1e9, 2)}B</td>
                        <td>{percent(c.growth * 100)}</td>
                        <td>{usd(c.operating_income / 1e9, 2)}B</td>
                        <td>{percent(c.operating_margin * 100)}</td>
                        <td>{c.period_end}</td>
                        <td>
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={c.filing_url}
                          >
                            SEC 10-K ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lab-panel financial-model">
              <div>
                <span className="lab-eyebrow">
                  {names[company]} / YOUR ASSUMPTIONS
                </span>
                <h2>Build an operating outlook</h2>
                <label>
                  Revenue growth <b>{percent(growth * 100)}</b>
                  <input
                    aria-label="Revenue growth assumption"
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.005"
                    value={growth}
                    onChange={(e) => setGrowth(Number(e.target.value))}
                  />
                </label>
                <label>
                  Operating margin <b>{(margin * 100).toFixed(1)}%</b>
                  <input
                    aria-label="Operating margin assumption"
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.005"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                  />
                </label>
                <button
                  className="lab-secondary"
                  onClick={() => {
                    setGrowth(fin.growth);
                    setMargin(fin.operating_margin);
                  }}
                >
                  Reset to reported rates
                </button>
              </div>
              <div className="finance-outcome">
                <span>Illustrative operating income</span>
                <strong>{usd(projectedIncome / 1e9, 2)}B</strong>
                <p>
                  {usd((projectedIncome - baseIncome) / 1e9, 2)}B versus
                  repeating reported rates
                </p>
                <dl>
                  <div>
                    <dt>Projected revenue</dt>
                    <dd>{usd(projectedRevenue / 1e9, 2)}B</dd>
                  </div>
                  <div>
                    <dt>Growth contribution</dt>
                    <dd>
                      {usd(
                        ((projectedRevenue - baseRevenue) *
                          fin.operating_margin) /
                          1e9,
                        2,
                      )}
                      B
                    </dd>
                  </div>
                  <div>
                    <dt>Margin contribution</dt>
                    <dd>
                      {usd(
                        (projectedRevenue * (margin - fin.operating_margin)) /
                          1e9,
                        2,
                      )}
                      B
                    </dd>
                  </div>
                </dl>
                <div className="export-links">
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`/brief?symbol=${company}&growth=${growth}&margin=${margin}`}
                  >
                    One-page brief ↗
                  </a>
                  <a
                    href={`/api/workbook?symbol=${company}&growth=${growth}&margin=${margin}`}
                  >
                    Formula-driven Excel ↓
                  </a>
                </div>
                <small>
                  Revenue = reported revenue × (1 + growth). Operating income =
                  revenue × margin. These are user assumptions, not company
                  guidance.
                </small>
              </div>
            </div>
            <PowerBIReport />
          </section>
        )}
        {tab === "sources" && (
          <section className="lab-panel sources-panel">
            <span className="lab-eyebrow">REPRODUCIBLE RESEARCH</span>
            <h2>Know what is underneath the chart.</h2>
            <div className="source-grid">
              <section>
                <h3>One common history</h3>
                <p>
                  All four companies use the same{" "}
                  {data.sessions.toLocaleString()} daily sessions,{" "}
                  {data.start_date} to {data.end_date}. An additional 252
                  earlier sessions supply each first-day lookback. Weekends,
                  duplicate records, missing symbols and nonpositive values are
                  rejected. The date set exactly matches the XNYS exchange
                  calendar, with no missing or extra sessions.
                </p>
                <a href={data.source.url} target="_blank" rel="noreferrer">
                  {data.source.name} ↗
                </a>
                <p>
                  Publisher license: <b>{data.source.license}</b>. The archive
                  SHA-256 and source checks are included in the workbook. The
                  site publishes normalized analytical indices, with 100 at the
                  study start, rather than raw dollar quotes.
                </p>
              </section>
              <section>
                <h3>Adjustment and provenance</h3>
                <p>
                  The series behaves like adjusted history. Its daily returns
                  match the separately pinned adjusted data across 2,005
                  overlapping sessions for every symbol; the largest difference
                  is under 0.00012 percentage points. Coca-Cola’s 2012 split
                  does not create a 50% research return.
                </p>
                <p>{data.source.limitations}</p>
                <a
                  href="https://investors.coca-colacompany.com/stock-info/splits"
                  target="_blank"
                  rel="noreferrer"
                >
                  Coca-Cola split record ↗
                </a>
              </section>
              <section>
                <h3>When a trade can occur</h3>
                <p>
                  A decision uses closes known through day t. Its entry or
                  switch fills at close t+1. A position holds fixed units until
                  the next switch; same-direction reviews do not fabricate
                  additional transactions. The final close liquidates the
                  remaining position.
                </p>
                <p>
                  Costs apply to the actual absolute value of each leg at entry
                  and exit. A direction switch closes the old legs and opens new
                  ones. No intraday or high-frequency execution is modeled.
                </p>
              </section>
              <section>
                <h3>How to interpret “best”</h3>
                <p>
                  The ten rules are a frozen exploratory menu, defined after a
                  previous 96-variant study. The complete-history ranking is
                  hindsight, not independent validation. No daily stock strategy
                  guarantees convergence or profit.
                </p>
                <p>
                  Risk-free interest, short-borrow costs, financing, taxes and
                  market impact are excluded. Long-only rotation earns market
                  exposure. Annual returns include mark-to-market moves;
                  position counts and losses are grouped by entry year.
                </p>
              </section>
            </div>
            <details>
              <summary>Archive checksum and data audit</summary>
              <code>{data.source.sha256}</code>
              <pre>{JSON.stringify(data.source.overlap_audit, null, 2)}</pre>
            </details>
          </section>
        )}
        <footer className="lab-footer">
          <div>
            <LabMark small />
            <span>
              Pairs Trading{" "}
              <small>Historical research · educational portfolio project</small>
            </span>
          </div>
          <div id="lab-export" className="footer-exports">
            <a
              target="_blank"
              rel="noreferrer"
              href={`/research-brief?${exportParams}`}
            >
              Analysis report ↗
            </a>
            <a href={`/api/research-workbook?${exportParams}`}>
              Download study Excel ↓
            </a>
          </div>
        </footer>
      </main>
      {tourStep >= 0 && (
        <LabTour
          step={tourStep}
          complete={tourComplete}
          onNext={nextTour}
          onSkip={stopTour}
        />
      )}
    </div>
  );
}
