import type { Analysis, Trade } from "./types";

export function replayWhatIf(
  analysis: Analysis,
  signalDate: string,
  direction: 1 | -1,
  capital: number,
): Trade | null {
  if (!Number.isFinite(capital) || capital <= 0) return null;
  const prices = analysis.prices;
  const index = prices.findIndex((point) => point.date === signalDate);
  if (index < 0 || index + 1 >= prices.length) return null;
  const entryIndex = index + 1;
  const entry = prices[entryIndex];
  const { exit_z, stop_z, max_hold_days, cost_bps_per_leg_per_side } =
    analysis.model;
  let reason = "end of sample";
  let exitIndex = prices.length - 1;
  for (let i = entryIndex; i < prices.length - 1; i++) {
    const z = analysis.signals[i].z;
    const held = i - entryIndex;
    if (
      (direction === 1 && z <= -stop_z) ||
      (direction === -1 && z >= stop_z)
    ) {
      reason = "stop";
    } else if (
      (direction === 1 && z >= -exit_z) ||
      (direction === -1 && z <= exit_z)
    ) {
      reason = "target";
    } else if (held >= max_hold_days) {
      reason = "time";
    } else {
      continue;
    }
    exitIndex = i + 1;
    break;
  }
  const exit = prices[exitIndex];
  const sharesY = (direction * (capital * 0.5)) / entry.y_price;
  const sharesX = (-direction * (capital * 0.5)) / entry.x_price;
  const entryCost = (capital * cost_bps_per_leg_per_side) / 10000;
  const exitCost =
    (cost_bps_per_leg_per_side / 10000) *
    (Math.abs(sharesY * exit.y_price) + Math.abs(sharesX * exit.x_price));
  const pnl =
    sharesY * (exit.y_price - entry.y_price) +
    sharesX * (exit.x_price - entry.x_price) -
    entryCost -
    exitCost;
  return {
    signal_date: signalDate,
    entry_date: entry.date,
    exit_date: exit.date,
    direction,
    entry_y: entry.y_price,
    entry_x: entry.x_price,
    exit_y: exit.y_price,
    exit_x: exit.x_price,
    holding_days: exitIndex - entryIndex,
    reason,
    pnl,
    return_pct: (100 * pnl) / capital,
  };
}
