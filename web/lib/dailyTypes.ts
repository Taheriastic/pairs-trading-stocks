export type DailyData = {
  version: string;
  start_index: number;
  start_date: string;
  end_date: string;
  sessions: number;
  source: {
    name: string;
    url: string;
    license: string;
    sha256: string;
    display: string;
    limitations: string;
    overlap_audit: Record<
      string,
      { sessions: number; max_daily_return_difference: number }
    >;
    calendar_audit: {
      calendar: string;
      package_version: string;
      missing_sessions: number;
      extra_sessions: number;
    };
  };
  dates: string[];
  indices: Record<string, number[]>;
};
export type DailyRule = {
  id: string;
  name: string;
  family: "Pair reversal" | "Pair trend" | "Stock rotation";
  lookback: number;
  cadence: number;
  kind: "return" | "ratio";
  mode: "pair" | "long";
  follow: boolean;
  explanation: string;
};
export type DailyTrade = {
  signal: number;
  entry: number;
  exit: number;
  direction: number;
  weights: [number, number];
  capital: number;
  entryA: number;
  entryB: number;
  exitA: number;
  exitB: number;
  sharesA: number;
  sharesB: number;
  gross: number;
  entryCost: number;
  exitCost: number;
  pnl: number;
  returnPct: number;
  reason: string;
};
export type DailyResult = {
  id: string;
  curve: number[];
  direction: number[];
  scores: number[];
  trades: DailyTrade[];
  totalReturn: number;
  drawdown: number;
  cagr: number;
  sharpe: number;
  costTotal: number;
  activeDays: number;
  lastTrade: DailyTrade | null;
  annual: { year: string; returnPct: number; trades: number; losses: number }[];
};
