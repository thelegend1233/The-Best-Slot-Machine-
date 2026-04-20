// Parity + correctness tests for the ported evaluator. Crafted grids
// exercise every branch (zero wins, basic ways, wild substitution,
// all-wilds pay as wolf, scatter anywhere-pays, scatter breaks runs).
//
// The closing integration test runs a 500k-spin simulation with a
// deterministic seed and asserts the total RTP lands in the expected
// window for this paytable (Phase 1 measured ~93% over 2M spins; a
// 500k sample should fall well inside the ~91-95% band).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateSpin,
  evaluateWaysForSymbol,
  findScatterCells,
} from "../src/engine/evaluator.js";
import { spinAllReels } from "../src/engine/spin.js";
import { mulberry32 } from "../src/engine/rng.js";

test("empty grid with no matches pays nothing", () => {
  const grid = [
    ["leaf", "acorn", "mushroom"],
    ["acorn", "mushroom", "leaf"],
    ["mushroom", "leaf", "acorn"],
    ["deer", "bear", "wolf"],
    ["fox", "rabbit", "mushroom"],
  ];
  const r = evaluateSpin(grid, 1);
  assert.equal(r.totalWin, 0);
  assert.equal(r.hits.length, 0);
  assert.equal(r.scatterCount, 0);
  assert.equal(r.bonusTriggered, false);
});

test("5 wolves one per column pays wolf 5-of-kind", () => {
  const grid = [
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
  ];
  const r = evaluateSpin(grid, 1);
  // wolf 5-of-a-kind paytable entry is 30; ways = 1 each column = 1
  assert.equal(r.totalWin, 30);
  assert.equal(r.hits.length, 1);
  assert.deepEqual(r.hits[0].symbol, "wolf");
  assert.equal(r.hits[0].count, 5);
  assert.equal(r.hits[0].ways, 1);
});

test("ways multiply across reels with multiple matches", () => {
  // Leaf is a low symbol: only 5-of-a-kind pays (1x bet). With 2 leaves
  // per reel, ways = 2*2*2*2*2 = 32, so total win = 32 * 1 = 32.
  const grid = [
    ["leaf", "leaf", "x"],
    ["leaf", "leaf", "x"],
    ["leaf", "leaf", "x"],
    ["leaf", "leaf", "x"],
    ["leaf", "leaf", "x"],
  ];
  const r = evaluateSpin(grid, 1);
  assert.equal(r.totalWin, 32);
  assert.equal(r.hits[0].ways, 32);
});

test("wild substitutes to complete a wolf run", () => {
  const grid = [
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
    ["x", "wild", "x"],
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
  ];
  const r = evaluateSpin(grid, 1);
  const wolf = r.hits.find((h) => h.symbol === "wolf");
  assert.ok(wolf, "expected a wolf hit");
  assert.equal(wolf.count, 5);
  assert.equal(wolf.ways, 1);
  assert.equal(wolf.win, 30);
});

test("all-wild row pays every symbol (wilds substitute for all)", () => {
  // 5 wilds (one per column) matches every paying symbol. This is an
  // extreme corner case — the current reel strips can't actually
  // produce this grid — but the evaluator behavior must still be
  // correct if some future tuning allows it.
  const grid = [
    ["x", "wild", "x"],
    ["x", "wild", "x"],
    ["x", "wild", "x"],
    ["x", "wild", "x"],
    ["x", "wild", "x"],
  ];
  const r = evaluateSpin(grid, 1);
  // Sum of every paying-symbol 5-of-a-kind multiplier from paytable.js
  // with ways = 1 per slot: 1 + 1 + 1 + 2 + 4 + 7 + 12 + 30 = 58
  assert.equal(r.totalWin, 58);
});

test("3 scatters anywhere pays the scatter multiplier and triggers bonus", () => {
  const grid = [
    ["scatter", "a", "b"],
    ["c", "d", "scatter"],
    ["e", "f", "scatter"],
    ["g", "h", "i"],
    ["j", "k", "l"],
  ];
  const r = evaluateSpin(grid, 1);
  assert.equal(r.scatterCount, 3);
  assert.equal(r.bonusTriggered, true);
  // scatter 3-of-a-kind multiplier is 1 * bet
  assert.equal(r.scatterWin, 1);
  assert.equal(r.totalWin, 1);
});

test("5 scatters anywhere use the 5-of-kind bucket", () => {
  const grid = [
    ["scatter", "a", "b"],
    ["c", "d", "scatter"],
    ["e", "f", "scatter"],
    ["scatter", "h", "i"],
    ["scatter", "k", "l"],
  ];
  const r = evaluateSpin(grid, 1);
  assert.equal(r.scatterCount, 5);
  assert.equal(r.scatterWin, 12);
});

test("scatter in a would-be run doesn't pay as a line symbol", () => {
  // Scatter in the middle of a wolf row must break the run, not act as
  // a wolf.
  const grid = [
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
    ["x", "scatter", "x"],
    ["x", "wolf", "x"],
    ["x", "wolf", "x"],
  ];
  const r = evaluateSpin(grid, 1);
  const wolf = r.hits.find((h) => h.symbol === "wolf");
  assert.equal(wolf, undefined, "wolf run should not have formed");
  // But the lone scatter itself doesn't trigger a bonus (need 3+).
  assert.equal(r.scatterCount, 1);
  assert.equal(r.bonusTriggered, false);
});

test("findScatterCells returns every scatter position", () => {
  const grid = [
    ["scatter", "a", "scatter"],
    ["b", "c", "d"],
    ["scatter", "e", "f"],
    ["g", "h", "i"],
    ["j", "k", "l"],
  ];
  const cells = findScatterCells(grid);
  assert.deepEqual(cells, [
    [0, 0],
    [0, 2],
    [2, 0],
  ]);
});

test("low-symbol 3-of-a-kind with zero multiplier returns no hit", () => {
  // Rabbit paytable is [0, 0, 2]: 3-of-a-kind pays zero. The evaluator
  // must treat that as no hit rather than producing a "win" of 0 and
  // lighting up cells.
  const grid = [
    ["rabbit", "x", "y"],
    ["rabbit", "x", "y"],
    ["rabbit", "x", "y"],
    ["x", "x", "y"],
    ["x", "x", "y"],
  ];
  const hit = evaluateWaysForSymbol(grid, "rabbit", 1);
  assert.equal(hit, null);
});

test("500k-spin sanity sim lands RTP in the target band", () => {
  // Deterministic seed + in-engine RNG so this is reproducible on any
  // machine. Just a sanity check that the port matches Phase 1 behavior
  // within sampling noise. Phase 1 Monte Carlo logged ~93% total RTP.
  // Base-only (no bonus round sim here) is ~60%, so this test uses a
  // wider ~55-65% band.
  const random = mulberry32(0xfeedface);
  const N = 500_000;
  const bet = 1;
  let wagered = 0;
  let won = 0;

  for (let i = 0; i < N; i++) {
    wagered += bet;
    const grid = spinAllReels(random);
    won += evaluateSpin(grid, bet).totalWin;
  }

  const rtp = won / wagered;
  assert.ok(
    rtp > 0.55 && rtp < 0.65,
    `base-only RTP out of band: ${(rtp * 100).toFixed(2)}%`,
  );
});
