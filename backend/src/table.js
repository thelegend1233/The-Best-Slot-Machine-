// Table Durable Object — owns the RNG and evaluator for a single table.
// A DO instance is "single-threaded" (serialized request handling) per
// instance ID, so there are no races on spin ordering or the spin log.
//
// Step 1c adds WebSocket support alongside the existing HTTP endpoints:
//
//   GET  /health   — liveness probe, no state touched.
//   POST /spin     — HTTP round-trip spin (kept for curl / audit use).
//   GET  /ws       — Upgrade: websocket. Client sends { type:"spin", bet }
//                    and receives { type:"result", grid, totalWin, hits,
//                    scatterCells, scatterCount, scatterWin,
//                    bonusTriggered, commit, reveal }.
//
// Uses the Durable Objects Hibernatable WebSocket API so the DO can
// hibernate between messages and the runtime handles the WS lifecycle.
//
// Later steps add: table lifecycle, player identity, bonus rounds,
// multi-player broadcast, and a D1-backed spin log.

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
      return json({ ok: true, version: "phase2.1c" });
    }

    if (url.pathname === "/spin" && request.method === "POST") {
      return this.handleSpin(request);
    }

    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    return new Response("not found", { status: 404 });
  }

  handleWebSocketUpgrade(_request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // Hibernatable WebSocket callbacks — called by the runtime.
  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "invalid json" }));
      return;
    }

    if (msg.type === "spin") {
      const bet = Number(msg.bet);
      if (!Number.isFinite(bet) || bet <= 0) {
        ws.send(JSON.stringify({ type: "error", error: "bet must be a positive number" }));
        return;
      }
      const { preimage, preimageHex, commitHex } = await newCommit();
      const random = rngFromPreimage(preimage);
      const grid = spinAllReels(random, REELS);
      const result = evaluateSpin(grid, bet);
      ws.send(JSON.stringify({
        type: "result",
        bet,
        grid,
        totalWin: result.totalWin,
        hits: result.hits,
        scatterCells: result.scatterCells,
        scatterCount: result.scatterCount,
        scatterWin: result.scatterWin,
        bonusTriggered: result.bonusTriggered,
        commit: commitHex,
        reveal: preimageHex,
      }));
      return;
    }

    ws.send(JSON.stringify({ type: "error", error: `unknown message type: ${msg.type}` }));
  }

  async webSocketClose(_ws, _code, _reason) {}
  async webSocketError(_ws, _error) {}

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
