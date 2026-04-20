// Table Durable Object — owns the RNG, evaluator, and spin log for one table.
//
// Endpoints:
//   GET  /health  — liveness probe.
//   POST /spin    — HTTP round-trip (curl / audit use).
//   GET  /ws      — WebSocket upgrade. Messages: { type:"spin", bet }
//                   Response: { type:"result", grid, totalWin, ..., commit, reveal }
//
// Step 1d adds D1 persistence: every spin is written to the `spin` table
// with the full commit-reveal and a per-table hash chain so the session
// log is tamper-evident.

import { REELS } from "./engine/reels.js";
import { evaluateSpin } from "./engine/evaluator.js";
import { spinAllReels } from "./engine/spin.js";
import { newCommit, rngFromPreimage, sha256Hex } from "./engine/rng.js";

const TABLE_ID = "default"; // step 3 will key this by the 4-letter join code

export class Table {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, version: "phase2.1d" });
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
      const spinData = await this.computeSpin(bet);
      ws.send(JSON.stringify({ type: "result", ...spinData }));
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

    const spinData = await this.computeSpin(bet);
    return json(spinData);
  }

  // Core: generate a spin, log it to D1, return the full result payload.
  async computeSpin(bet) {
    const { preimage, preimageHex, commitHex } = await newCommit();
    const random = rngFromPreimage(preimage);
    const grid = spinAllReels(random, REELS);
    const result = evaluateSpin(grid, bet);

    const gridJson = JSON.stringify(grid);
    const prevSpinHash = (await this.state.storage.get("prevSpinHash")) ?? null;

    // Hash chain: each spin includes the previous hash so the whole session
    // log can be verified as unmodified after the fact.
    const chainInput = new TextEncoder().encode(
      [preimageHex, gridJson, prevSpinHash ?? ""].join("|")
    );
    const spinHash = await sha256Hex(chainInput);

    // Persist the new chain tip before writing to D1 so a D1 failure
    // never leaves the chain and the DB out of sync.
    await this.state.storage.put("prevSpinHash", spinHash);

    // Write to D1 — non-fatal so a database hiccup doesn't kill the spin.
    if (this.env.DB) {
      try {
        await this.env.DB.prepare(`
          INSERT INTO spin
            (table_id, ts, bet, grid_json, total_win, scatter_count,
             bonus_triggered, rng_commit, rng_reveal, prev_spin_hash, this_spin_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          TABLE_ID,
          Date.now(),
          bet,
          gridJson,
          result.totalWin,
          result.scatterCount,
          result.bonusTriggered ? 1 : 0,
          commitHex,
          preimageHex,
          prevSpinHash,
          spinHash,
        ).run();
      } catch (err) {
        console.error("D1 write failed:", err.message);
      }
    }

    return {
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
      spinHash,
    };
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
