import type { DailyData } from "./dailyTypes";
import { localData, validPair } from "./server";
import {
  directionFor,
  benchmarkDaily,
  pairSymbols,
  replayDaily,
  ruleById,
  scoreAt,
  simulateDaily,
  weightsFor,
} from "./dailyEngine";

export async function researchContext(
  params: Record<string, string | undefined>,
) {
  const pair = params.pair || "KO-PEP";
  if (!validPair(pair)) throw new Error("Invalid pair");
  const rule = ruleById(params.strategy || "rotation20"),
    cost = Number(params.cost ?? 10),
    capital = Number(params.capital ?? 10000),
    hold = Number(params.hold ?? 20),
    position = params.position || "rule";
  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    cost > 25 ||
    !Number.isFinite(capital) ||
    capital < 1000 ||
    capital > 1000000 ||
    !Number.isInteger(hold) ||
    hold < 1 ||
    hold > 5032 ||
    !["rule", "a", "b", "ab", "ba"].includes(position)
  )
    throw new Error("Invalid research assumptions");
  const data = await localData<DailyData>("daily_lab.json"),
    date = params.date || data.dates.at(-23)!;
  const decision = data.dates.indexOf(date);
  if (decision < data.start_index)
    throw new Error("Choose a study trading day");
  const symbols = pairSymbols(pair),
    score = scoreAt(
      data.indices[symbols[0]],
      data.indices[symbols[1]],
      decision,
      rule,
    );
  const weights: [number, number] =
    position === "rule"
      ? weightsFor(directionFor(score, rule), rule)
      : position === "a"
        ? [1, 0]
        : position === "b"
          ? [0, 1]
          : position === "ab"
            ? [0.5, -0.5]
            : [-0.5, 0.5];
  const result = simulateDaily(data, pair, rule, cost),
    replay = replayDaily(data, pair, decision, weights, hold, capital, cost);
  const benchmark = benchmarkDaily(data, pair, cost);
  return {
    benchmark,
    pair,
    rule,
    cost,
    capital,
    hold,
    position,
    data,
    date,
    decision,
    symbols,
    score,
    weights,
    result,
    replay,
  };
}
