// Direct-invoke tests of the Table Durable Object. A DO instance is
// just a class with (state, env) in the constructor and an async
// fetch(request). Neither is touched by the current endpoints, so we
// pass empty stand-ins and hit fetch with synthetic Request objects.
// No wrangler / miniflare required.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Table } from "../src/table.js";
import {
  evaluateSpin,
} from "../src/engine/evaluator.js";
import { spinAllReels } from "../src/engine/spin.js";
import { rngFromPreimage, hexToBytes, sha256Hex } from "../src/engine/rng.js";

function makeTable() {
  return new Table({}, {});
}

test("GET /health returns ok", async () => {
  const table = makeTable();
  const res = await table.fetch(new Request("https://t/health"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.version, "string");
});

test("POST /spin with invalid body returns 400", async () => {
  const table = makeTable();
  const res = await table.fetch(
    new Request("https://t/spin", { method: "POST", body: "not json" }),
  );
  assert.equal(res.status, 400);
});

test("POST /spin with missing bet returns 400", async () => {
  const table = makeTable();
  const res = await table.fetch(
    new Request("https://t/spin", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );
  assert.equal(res.status, 400);
});

test("POST /spin returns a shaped result with commit + reveal", async () => {
  const table = makeTable();
  const res = await table.fetch(
    new Request("https://t/spin", {
      method: "POST",
      body: JSON.stringify({ bet: 1 }),
    }),
  );
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.bet, 1);
  assert.ok(Array.isArray(body.grid) && body.grid.length === 5);
  assert.ok(Array.isArray(body.grid[0]) && body.grid[0].length === 3);
  assert.ok(typeof body.totalWin === "number");
  assert.ok(Array.isArray(body.hits));
  assert.ok(Array.isArray(body.scatterCells));
  assert.ok(typeof body.bonusTriggered === "boolean");
  assert.equal(body.commit.length, 64);
  assert.equal(body.reveal.length, 64);
});

test("reveal + preimage recomputes the exact same grid", async () => {
  // This is the whole point of commit-reveal: the server must be unable
  // to change the outcome after the fact. Given the reveal, anyone can
  // rerun the engine and should land on the identical grid.
  const table = makeTable();
  const res = await table.fetch(
    new Request("https://t/spin", {
      method: "POST",
      body: JSON.stringify({ bet: 1 }),
    }),
  );
  const body = await res.json();

  const rng = rngFromPreimage(hexToBytes(body.reveal));
  const reGrid = spinAllReels(rng);
  assert.deepEqual(reGrid, body.grid);

  const reResult = evaluateSpin(reGrid, body.bet);
  assert.equal(reResult.totalWin, body.totalWin);
});

test("commit equals SHA-256 of the reveal bytes", async () => {
  const table = makeTable();
  const res = await table.fetch(
    new Request("https://t/spin", {
      method: "POST",
      body: JSON.stringify({ bet: 1 }),
    }),
  );
  const body = await res.json();
  const expected = await sha256Hex(hexToBytes(body.reveal));
  assert.equal(body.commit, expected);
});

test("unknown route returns 404", async () => {
  const table = makeTable();
  const res = await table.fetch(new Request("https://t/nope"));
  assert.equal(res.status, 404);
});
