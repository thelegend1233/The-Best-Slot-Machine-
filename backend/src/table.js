// Table Durable Object — owns the RNG, evaluator, player registry, and spin
// log for one table.
//
// WebSocket protocol (step 2):
//   Client → { type:"join", displayName, token }   (token null on first visit)
//   Server → { type:"joined", token, displayName }
//   Client → { type:"spin", bet, token }
//   Server → { type:"result", grid, totalWin, ..., commit, reveal, spinHash }
//
// Player state is stored in DO SQLite storage so it survives hibernation.
// The ws attachment carries the token so we don't re-read storage each spin.

import { REELS } from "./engine/reels.js";
import { evaluateSpin } from "./engine/evaluator.js";
import { spinAllReels } from "./engine/spin.js";
import { newCommit, rngFromPreimage, sha256Hex } from "./engine/rng.js";

const TABLE_ID = "default";
const MAX_NAME_LEN = 32;

export class Table {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, version: "phase2.2" });
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

  async webSocketMessage(ws, message) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "invalid json" }));
      return;
    }

    if (msg.type === "join") {
      await this.handleJoin(ws, msg);
      return;
    }

    if (msg.type === "spin") {
      // Token comes from the WS attachment set during join.
      const { token } = ws.deserializeAttachment() ?? {};
      if (!token) {
        ws.send(JSON.stringify({ type: "error", error: "join first" }));
        return;
      }
      const bet = Number(msg.bet);
      if (!Number.isFinite(bet) || bet <= 0) {
        ws.send(JSON.stringify({ type: "error", error: "bet must be a positive number" }));
        return;
      }
      const spinData = await this.computeSpin(bet, token);
      ws.send(JSON.stringify({ type: "result", ...spinData }));
      return;
    }

    ws.send(JSON.stringify({ type: "error", error: `unknown type: ${msg.type}` }));
  }

  async handleJoin(ws, msg) {
    const displayName = String(msg.displayName ?? "").trim().slice(0, MAX_NAME_LEN) || "Guest";
    let token = typeof msg.token === "string" && msg.token.length > 0 ? msg.token : null;

    // Check if the token belongs to an existing player.
    let existing = token ? await this.state.storage.get(`player:${token}`) : null;

    if (!existing) {
      // New player — mint a fresh token.
      token = crypto.randomUUID();
      existing = { displayName, joinedAt: Date.now() };
    } else {
      // Returning player — allow display name update.
      existing.displayName = displayName;
    }

    await this.state.storage.put(`player:${token}`, existing);

    // Attach the token to this WebSocket so later messages can retrieve it
    // without hitting storage. Survives hibernation.
    ws.serializeAttachment({ token });

    // Persist to D1 player table (non-fatal).
    if (this.env.DB) {
      try {
        await this.env.DB.prepare(`
          INSERT INTO player (token, table_id, display_name, joined_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(token) DO UPDATE SET display_name = excluded.display_name
        `).bind(token, TABLE_ID, existing.displayName, existing.joinedAt).run();
      } catch (err) {
        console.error("D1 player upsert failed:", err.message);
      }
    }

    ws.send(JSON.stringify({ type: "joined", token, displayName: existing.displayName }));
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
    return json(await this.computeSpin(bet, null));
  }

  async computeSpin(bet, playerToken) {
    const { preimage, preimageHex, commitHex } = await newCommit();
    const random = rngFromPreimage(preimage);
    const grid = spinAllReels(random, REELS);
    const result = evaluateSpin(grid, bet);

    const gridJson = JSON.stringify(grid);
    const prevSpinHash = (await this.state.storage.get("prevSpinHash")) ?? null;

    const chainInput = new TextEncoder().encode(
      [preimageHex, gridJson, prevSpinHash ?? ""].join("|")
    );
    const spinHash = await sha256Hex(chainInput);
    await this.state.storage.put("prevSpinHash", spinHash);

    if (this.env.DB) {
      try {
        await this.env.DB.prepare(`
          INSERT INTO spin
            (table_id, player_token, ts, bet, grid_json, total_win, scatter_count,
             bonus_triggered, rng_commit, rng_reveal, prev_spin_hash, this_spin_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          TABLE_ID, playerToken, Date.now(), bet, gridJson,
          result.totalWin, result.scatterCount,
          result.bonusTriggered ? 1 : 0,
          commitHex, preimageHex, prevSpinHash, spinHash,
        ).run();
      } catch (err) {
        console.error("D1 spin write failed:", err.message);
      }
    }

    return {
      bet, grid,
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
