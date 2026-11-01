import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DAILY_RULES,
  simulateDaily,
  replayDaily,
  scoreAt,
  weightsFor,
  benchmarkDaily,
} from "../web/lib/dailyEngine.ts";
const close = (a, b, tolerance = 1e-7) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
function fixture(a, b, start = 1) {
  return {
    start_index: start,
    dates: a.map((_, i) => `2020-01-${String(i + 1).padStart(2, "0")}`),
    indices: { KO: a, PEP: b },
  };
}
test("decisions fill at the next close; both legs pay entry and exit costs", () => {
  const data = fixture(
    [100, 110, 120, 114, 108, 108],
    [100, 100, 100, 100, 100, 100],
  );
  const rule = { ...DAILY_RULES[0], cadence: 100 };
  const result = simulateDaily(data, "KO-PEP", rule, 10),
    trade = result.trades[0];
  assert.equal(result.trades.length, 1);
  assert.equal(trade.signal, 1);
  assert.equal(trade.entry, 2);
  assert.equal(trade.exit, 5);
  assert.equal(result.curve[1], 10000);
  close(trade.gross, 500);
  close(trade.entryCost, 10);
  close(trade.exitCost, 9.5);
  close(trade.pnl, 480.5);
  close(result.curve.at(-1), 10480.5);
  close(simulateDaily(data, "KO-PEP", rule, 0).curve.at(-1), 10500);
  close(benchmarkDaily(data,"KO-PEP",10).at(-1),9480.5);
});
test("future prices cannot alter earlier scores, fills or equity", () => {
  const a = Array.from(
      { length: 100 },
      (_, i) => 100 + i * 0.1 + Math.sin(i / 4),
    ),
    b = Array.from({ length: 100 }, (_, i) => 100 + i * 0.12 + Math.cos(i / 6));
  const original = fixture(a, b, 30),
    changed = structuredClone(original);
  for (let i = 75; i < 100; i++) changed.indices.KO[i] *= 3;
  for (const rule of DAILY_RULES.filter((r) => r.lookback <= 20)) {
    const one = simulateDaily(original, "KO-PEP", rule),
      two = simulateDaily(changed, "KO-PEP", rule);
    assert.deepEqual(one.curve.slice(0, 75), two.curve.slice(0, 75));
    assert.deepEqual(one.direction.slice(0, 75), two.direction.slice(0, 75));
    assert.equal(
      scoreAt(a, b, 74, rule),
      scoreAt(changed.indices.KO, b, 74, rule),
    );
  }
});
test("a fixed direction holds units without charging imaginary daily trades", () => {
  const a = Array.from({ length: 30 }, (_, i) => 100 + i),
    b = a.map(() => 100),
    data = fixture(a, b);
  const r = simulateDaily(data, "KO-PEP", DAILY_RULES[0]);
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].reason, "snapshot end");
  close(r.costTotal, r.trades[0].entryCost + r.trades[0].exitCost);
});
test("replay accounting matches a strategy position on the same dates", () => {
  const a = [100, 110, 120, 114, 108, 108],
    b = a.map(() => 100),
    data = fixture(a, b),
    r = simulateDaily(data, "KO-PEP", { ...DAILY_RULES[0], cadence: 100 });
  const tr = r.trades[0],
    replay = replayDaily(
      data,
      "KO-PEP",
      tr.signal,
      tr.weights,
      tr.exit - tr.entry,
      tr.capital,
      10,
    );
  close(replay.pnl, tr.pnl);
  assert.equal(replay.entry, tr.entry);
  assert.equal(replay.exit, tr.exit);
  assert.equal(
    replayDaily(
      data,
      "KO-PEP",
      data.dates.length - 1,
      [0.5, -0.5],
      20,
      10000,
      10,
    ),
    null,
  );
  assert.equal(
    replayDaily(data, "KO-PEP", 1, [0.5, -0.5], -1, 10000, 10),
    null,
  );
});
test("the production lab has exactly 5,032 comparable sessions and honest exposures", () => {
  const data = JSON.parse(
    readFileSync(new URL("../data/daily_lab.json", import.meta.url)),
  );
  assert.equal(data.dates.length - data.start_index, 5032);
  assert.equal(data.dates[data.start_index], "2006-10-16");
  assert.equal(data.dates.at(-1), "2026-10-16");
  assert.equal(DAILY_RULES.length, 10);
  assert.equal(data.source.calendar_audit.missing_sessions,0);
  assert.equal(data.source.calendar_audit.extra_sessions,0);
  for (const pair of ["KO-PEP", "MSFT-ORCL"]) {
    for (const rule of DAILY_RULES) {
      const r = simulateDaily(data, pair, rule, 10);
      assert.equal(r.curve.length - data.start_index, 5032);
      assert.ok(r.curve.every(Number.isFinite));
      close(
        r.curve.at(-1) - 10000,
        r.trades.reduce((sum, tr) => sum + tr.pnl, 0),
        1e-5,
      );
      for (const tr of r.trades) {
        assert.equal(tr.entry, tr.signal + 1);
        assert.ok(tr.exit > tr.entry);
        close(Math.abs(tr.weights[0]) + Math.abs(tr.weights[1]), 1);
        if (rule.mode === "long") assert.ok(tr.weights.every((w) => w >= 0));
      }
      assert.equal(
        r.annual.reduce((sum, y) => sum + y.trades, 0),
        r.trades.length,
      );
    }
  }
  assert.deepEqual(weightsFor(1, DAILY_RULES[0]), [0.5, -0.5]);
  assert.deepEqual(weightsFor(-1, DAILY_RULES[8]), [0, 1]);
});
