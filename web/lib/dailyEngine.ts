import type {
  DailyData,
  DailyRule,
  DailyResult,
  DailyTrade,
} from "./dailyTypes";

// Frozen v1 research menu. These rules are exploratory after the prior study;
// none is described as selected on a genuinely untouched evaluation period.
export const DAILY_RULES: DailyRule[] = [
  {
    id: "reversal1",
    name: "Daily loser / winner",
    family: "Pair reversal",
    lookback: 1,
    cadence: 1,
    kind: "return",
    mode: "pair",
    follow: false,
    explanation:
      "Buy the stock with the weaker last-day return and short the stronger one. Recheck every close; switch only when the relative loser changes.",
  },
  {
    id: "reversal5",
    name: "Weekly relative reversal",
    family: "Pair reversal",
    lookback: 5,
    cadence: 1,
    kind: "return",
    mode: "pair",
    follow: false,
    explanation:
      "Buy the weaker stock over five sessions and short the stronger. Assess daily, hold fixed units until the direction reverses.",
  },
  {
    id: "reversal20",
    name: "Monthly relative reversal",
    family: "Pair reversal",
    lookback: 20,
    cadence: 1,
    kind: "return",
    mode: "pair",
    follow: false,
    explanation:
      "Buy the 20-session relative loser and short the winner. The model expects relative performance to reverse; the prices do not need to become equal.",
  },
  {
    id: "reversal60",
    name: "Quarterly relative reversal",
    family: "Pair reversal",
    lookback: 60,
    cadence: 1,
    kind: "return",
    mode: "pair",
    follow: false,
    explanation:
      "Use 60-session relative returns to set equal long and short legs. Review daily and switch when the relative performance gap changes sign.",
  },
  {
    id: "ratio20",
    name: "Fast ratio convergence",
    family: "Pair reversal",
    lookback: 20,
    cadence: 1,
    kind: "ratio",
    mode: "pair",
    follow: false,
    explanation:
      "Compare the log price ratio with its preceding 20-session average. Buy the relatively low side and short the relatively high side.",
  },
  {
    id: "ratio252",
    name: "Annual ratio convergence",
    family: "Pair reversal",
    lookback: 252,
    cadence: 1,
    kind: "ratio",
    mode: "pair",
    follow: false,
    explanation:
      "Trade the deviation of the log price ratio from its prior 252-session mean. Assess daily, without a cointegration gate.",
  },
  {
    id: "pairtrend60",
    name: "Relative trend control",
    family: "Pair trend",
    lookback: 60,
    cadence: 1,
    kind: "return",
    mode: "pair",
    follow: true,
    explanation:
      "A control that buys the 60-session relative winner and shorts the loser. It tests persistence rather than convergence.",
  },
  {
    id: "rotation5",
    name: "Weekly loser rotation",
    family: "Stock rotation",
    lookback: 5,
    cadence: 5,
    kind: "return",
    mode: "long",
    follow: false,
    explanation:
      "Every five sessions, invest in the weaker stock over the previous five sessions. Hold one stock, with no short leg. This carries stock-market exposure.",
  },
  {
    id: "rotation20",
    name: "Monthly loser rotation",
    family: "Stock rotation",
    lookback: 20,
    cadence: 20,
    kind: "return",
    mode: "long",
    follow: false,
    explanation:
      "Every 20 sessions, buy the weaker performer over the previous 20 sessions. Keep holding it until a later review selects the other company. No short leg.",
  },
  {
    id: "trend60",
    name: "Monthly trend rotation",
    family: "Stock rotation",
    lookback: 60,
    cadence: 20,
    kind: "return",
    mode: "long",
    follow: true,
    explanation:
      "Every 20 sessions, hold the stronger stock over the previous 60 sessions. A long-only trend control with market exposure.",
  },
];

export function ruleById(id: string) {
  const rule = DAILY_RULES.find((r) => r.id === id);
  if (!rule) throw new Error("Unknown strategy");
  return rule;
}
export function pairSymbols(pair: string): [string, string] {
  if (pair === "KO-PEP") return ["KO", "PEP"];
  if (pair === "MSFT-ORCL") return ["MSFT", "ORCL"];
  throw new Error("Unknown pair");
}
export function scoreAt(a: number[], b: number[], t: number, rule: DailyRule) {
  if (t < rule.lookback) return 0;
  if (rule.kind === "return")
    return (
      Math.log(a[t] / a[t - rule.lookback]) -
      Math.log(b[t] / b[t - rule.lookback])
    );
  let mean = 0;
  for (let i = t - rule.lookback; i < t; i++)
    mean += Math.log(a[i] / b[i]) / rule.lookback;
  return Math.log(a[t] / b[t]) - mean;
}
export function directionFor(score: number, rule: DailyRule) {
  if (Math.abs(score) < 1e-12) return 0;
  return (score > 0 ? -1 : 1) * (rule.follow ? -1 : 1);
}
export function weightsFor(
  direction: number,
  rule: DailyRule,
): [number, number] {
  if (!direction) return [0, 0];
  return rule.mode === "long"
    ? direction === 1
      ? [1, 0]
      : [0, 1]
    : [direction * 0.5, -direction * 0.5];
}

export function benchmarkDaily(data: DailyData, pair: string, costBps = 10) {
  const [a, b] = pairSymbols(pair).map((symbol) => data.indices[symbol]),
    entry = data.start_index + 1,
    last = data.dates.length - 1,
    rate = costBps / 10000;
  return data.dates.map((_, i) =>
    i < entry
      ? 10000
      : 5000 * (a[i] / a[entry] + b[i] / b[entry]) -
        10000 * rate -
        (i === last ? 5000 * (a[i] / a[entry] + b[i] / b[entry]) * rate : 0),
  );
}

export function simulateDaily(
  data: DailyData,
  pair: string,
  rule: DailyRule,
  costBps = 10,
): DailyResult {
  if (!Number.isFinite(costBps) || costBps < 0 || costBps > 100)
    throw new Error("Invalid transaction cost");
  const [y, x] = pairSymbols(pair),
    a = data.indices[y],
    b = data.indices[x],
    n = data.dates.length,
    start = data.start_index;
  const rate = costBps / 10000;
  const curve = Array(n).fill(10000),
    direction = Array(n).fill(0),
    scores = Array(n).fill(0);
  const trades: DailyTrade[] = [];
  let cash = 10000,
    position: {
      entry: number;
      signal: number;
      direction: number;
      capital: number;
      a: number;
      b: number;
      sa: number;
      sb: number;
      entryCost: number;
      weights: [number, number];
    } | null = null;
  let costTotal = 0,
    activeDays = 0,
    pending: { signal: number; direction: number } | null = null;
  // First decision is at the first study close, not at an unseen same-close fill.
  for (let t = start; t < n; t++) {
    if (pending) {
      if (position) {
        const p = position,
          gross = p.sa * (a[t] - p.a) + p.sb * (b[t] - p.b),
          exitCost = rate * (Math.abs(p.sa * a[t]) + Math.abs(p.sb * b[t]));
        cash = p.capital + gross - p.entryCost - exitCost;
        costTotal += exitCost;
        trades.push({
          signal: p.signal,
          entry: p.entry,
          exit: t,
          direction: p.direction,
          weights: p.weights,
          capital: p.capital,
          entryA: p.a,
          entryB: p.b,
          exitA: a[t],
          exitB: b[t],
          sharesA: p.sa,
          sharesB: p.sb,
          gross,
          entryCost: p.entryCost,
          exitCost,
          pnl: cash - p.capital,
          returnPct: 100 * (cash / p.capital - 1),
          reason: "direction switch",
        });
        position = null;
      }
      if (pending.direction && cash > 0) {
        const weights = weightsFor(pending.direction, rule),
          entryCost = rate * cash;
        position = {
          entry: t,
          signal: pending.signal,
          direction: pending.direction,
          capital: cash,
          a: a[t],
          b: b[t],
          sa: (weights[0] * cash) / a[t],
          sb: (weights[1] * cash) / b[t],
          entryCost,
          weights,
        };
        costTotal += entryCost;
      }
      pending = null;
    }
    if (position) {
      curve[t] =
        position.capital +
        position.sa * (a[t] - position.a) +
        position.sb * (b[t] - position.b) -
        position.entryCost;
      activeDays++;
    } else curve[t] = cash;
    direction[t] = position?.direction || 0;
    scores[t] = scoreAt(a, b, t, rule);
    if (t === n - 1) {
      if (position) {
        const p = position,
          gross = p.sa * (a[t] - p.a) + p.sb * (b[t] - p.b),
          exitCost = rate * (Math.abs(p.sa * a[t]) + Math.abs(p.sb * b[t]));
        curve[t] -= exitCost;
        costTotal += exitCost;
        trades.push({
          signal: p.signal,
          entry: p.entry,
          exit: t,
          direction: p.direction,
          weights: p.weights,
          capital: p.capital,
          entryA: p.a,
          entryB: p.b,
          exitA: a[t],
          exitB: b[t],
          sharesA: p.sa,
          sharesB: p.sb,
          gross,
          entryCost: p.entryCost,
          exitCost,
          pnl: curve[t] - p.capital,
          returnPct: 100 * (curve[t] / p.capital - 1),
          reason: "snapshot end",
        });
      }
      break;
    }
    if (t < n - 2 && (t - start) % rule.cadence === 0 && curve[t] > 0) {
      const wanted = directionFor(scores[t], rule);
      if (wanted !== (position?.direction || 0))
        pending = { signal: t, direction: wanted };
    }
  }
  let peak = 10000,
    dd = 0;
  const changes = [];
  for (let t = start; t < n; t++) {
    peak = Math.max(peak, curve[t]);
    dd = Math.min(dd, curve[t] / peak - 1);
    if (t > start) changes.push(curve[t] / curve[t - 1] - 1);
  }
  const mean = changes.reduce((s, v) => s + v, 0) / Math.max(1, changes.length),
    variance =
      changes.reduce((s, v) => s + (v - mean) ** 2, 0) /
      Math.max(1, changes.length - 1);
  const years = (n - start - 1) / 252,
    totalReturn = 100 * (curve[n - 1] / 10000 - 1),
    cagr = 100 * ((Math.max(0, curve[n - 1]) / 10000) ** (1 / years) - 1);
  const annual = [];
  for (const year of [
    ...new Set(data.dates.slice(start).map((d) => d.slice(0, 4))),
  ]) {
    const first = Math.max(
        start,
        data.dates.findIndex((d) => d.startsWith(year)),
      ),
      last = data.dates.findLastIndex((d) => d.startsWith(year));
    const ts = trades.filter((tr) => tr.entry >= first && tr.entry <= last);
    annual.push({
      year,
      returnPct:
        100 * (curve[last] / (first === start ? 10000 : curve[first - 1]) - 1),
      trades: ts.length,
      losses: ts.filter((tr) => tr.pnl < 0).length,
    });
  }
  // Gross sensitivity is computed by rerunning the same rule at zero cost.
  // It is not gross = net + cash costs because costs also reduce future capital.
  return {
    id: rule.id,
    curve,
    direction,
    scores,
    trades,
    totalReturn,
    drawdown: dd * 100,
    cagr,
    sharpe: variance > 0 ? (mean / Math.sqrt(variance)) * Math.sqrt(252) : 0,
    costTotal,
    activeDays,
    lastTrade: trades.at(-1) || null,
    annual,
  };
}

export function replayDaily(
  data: DailyData,
  pair: string,
  decision: number,
  weights: [number, number],
  hold: number,
  capital: number,
  costBps: number,
): DailyTrade | null {
  if (
    decision < data.start_index ||
    decision + 2 >= data.dates.length ||
    !Number.isInteger(hold) ||
    hold < 1 ||
    hold > 5032 ||
    capital < 1000 ||
    capital > 1000000 ||
    !Number.isFinite(costBps) ||
    costBps < 0 ||
    costBps > 100 ||
    !Number.isFinite(capital) ||
    Math.abs(weights[0]) + Math.abs(weights[1]) !== 1
  )
    return null;
  const [y, x] = pairSymbols(pair),
    a = data.indices[y],
    b = data.indices[x],
    entry = decision + 1,
    exit = Math.min(entry + hold, data.dates.length - 1),
    rate = costBps / 10000;
  const sharesA = (weights[0] * capital) / a[entry],
    sharesB = (weights[1] * capital) / b[entry],
    gross = sharesA * (a[exit] - a[entry]) + sharesB * (b[exit] - b[entry]);
  const entryCost = capital * rate,
    exitCost =
      rate * (Math.abs(sharesA * a[exit]) + Math.abs(sharesB * b[exit])),
    pnl = gross - entryCost - exitCost;
  return {
    signal: decision,
    entry,
    exit,
    direction: weights[0] > 0 ? 1 : -1,
    weights,
    capital,
    entryA: a[entry],
    entryB: b[entry],
    exitA: a[exit],
    exitB: b[exit],
    sharesA,
    sharesB,
    gross,
    entryCost,
    exitCost,
    pnl,
    returnPct: (100 * pnl) / capital,
    reason:
      exit < entry + hold
        ? "snapshot end · truncated"
        : "chosen holding period",
  };
}
