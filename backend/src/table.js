// Table Durable Object — owns the RNG and evaluator for a single table.
// A DO instance is "single-threaded" (serialized request handling) per
// instance ID, so there are no races on spin ordering or the spin log.
//
// Step 1b exposes two endpoints:
//
//   GET  /health   — liveness probe, no state touched.
//   POST /spin     — body: { bet: number }.
//                    Returns { grid, totalWin, hits, ..., commit, reveal }.
//                    Commit-reveal is generated server-side: the same
//                    preimage deterministically produces the same grid, so
//                    a client (or auditor) can re-run the engine and
//                    verify the posted result.
//
// Later steps add: table lifecycle, player identity, WebSocket, bonus
// rounds, and a D1-backed spin log.

import { REELS } from "./engine/reels.js";
import { evaluateSpin } from "./engine/evaluator.js";
import { spinAllReels } from "./engine/spin.js";
import { newCommit, rngFromPreimage } from "./engine/rng.js";

export class Table {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, version: "phase2.1b" });
    }

    if (url.pathname === "/spin" && request.method === "POST") {
      return this.handleSpin(request);
    }

    return new Response("not found", { status: 404 });
  }

  async handleSpin(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }

    const bet = Number(body?.bet);
    if (!Number.isFinite(bet) || bet <= 0) {
      return json({ error: "bet must be a positive number" }, 400);
    }

    const { preimage, preimageHex, commitHex } = await newCommit();
    const random = rngFromPreimage(preimage);
    const grid = spinAllReels(random, REELS);
    const result = evaluateSpin(grid, bet);

    // Shape matches what the Phase 1 client evaluator returns so the
    // eventual swap in step 1c is a drop-in.
    return json({
      bet,
      grid,
      totalWin: result.totalWin,
      hits: result.hits,
      scatterCells: result.scatterCells,
      scatterCount: result.scatterCount,
      scatterWin: result.scatterWin,
      bonusTriggered: result.bonusTriggered,
      // Commit goes out first in principle; we return both together for
      // the simple /spin round-trip. In the WebSocket protocol (step 1c)
      // we'll actually sequence commit -> reveal across messages.
      commit: commitHex,
      reveal: preimageHex,
    });
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
