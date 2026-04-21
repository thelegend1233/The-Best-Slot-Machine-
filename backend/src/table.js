// Table Durable Object — one instance per table (keyed by the 4-letter code).
// Owns the RNG, evaluator, player registry, and server-side balances.
//
// HTTP endpoints:
//   POST /init              — called once by the Worker when creating a table.
//   GET  /health            — liveness probe.
//   POST /spin              — HTTP round-trip (curl / audit use).
//   GET  /tables/:CODE/ws  — WebSocket upgrade (routed here by the Worker).
//
// WebSocket protocol:
//   Client → { type:"join",      displayName, token }
//   Server → { type:"joined",    token, displayName, balance, buyIn, tableCode }
//
//   Client → { type:"host-join" }
//   Server → { type:"leaderboard", players:[{displayName,balance,totalWagered,totalWon,totalSpins}] }
//          (also broadcast to all host sockets after every spin)
//
//   Client → { type:"spin", bet, token, isFree, multiplier }
//   Server → { type:"result", grid, totalWin, balance, ..., commit, reveal }

import { REELS } from "./engine/reels.js";
import { evaluateSpin } from "./engine/evaluator.js";
import { spinAllReels } from "./engine/spin.js";
import { newCommit, rngFromPreimage, sha256Hex } from "./engine/rng.js";

const MAX_NAME_LEN = 32;

export class Table {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, version: "phase2.3" });
    }

    if (url.pathname === "/spin" && request.method === "POST") {
      return this.handleHttpSpin(request);
    }

    // /tables/:CODE/ws — WebSocket upgrade.
    if (url.pathname.endsWith("/ws") && request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade();
    }

    // Legacy /ws path from step 1b–1d.
    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade();
    }

    return new Response("not found", { status: 404 });
  }

  async handleInit(request) {
    const existing = await this.state.storage.get("table:meta");
    if (existing) return json({ ok: true, already: true });

    let body;
    try { body = await request.json(); } catch {
      return json({ error: "bad body" }, 400);
    }
    const { code, hostToken, buyIn } = body;
    await this.state.storage.put("table:meta", { code, hostToken, buyIn, status: "open", createdAt: Date.now() });
    return json({ ok: true, code });
  }

  handleWebSocketUpgrade() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let msg;
    try { msg = JSON.parse(message); } catch {
      ws.send(JSON.stringify({ type: "error", error: "invalid json" }));
      return;
    }

    if (msg.type === "join")      { await this.handleJoin(ws, msg);     return; }
    if (msg.type === "host-join") { await this.handleHostJoin(ws);       return; }
    if (msg.type === "spin")      { await this.handleWsSpin(ws, msg);    return; }

    ws.send(JSON.stringify({ type: "error", error: `unknown type: ${msg.type}` }));
  }

  async webSocketClose(_ws) {}
  async webSocketError(_ws) {}

  async handleHostJoin(ws) {
    ws.serializeAttachment({ isHost: true });
    const players = await this.getLeaderboard();
    ws.send(JSON.stringify({ type: "leaderboard", players }));
  }

  async getLeaderboard() {
    const entries = await this.state.storage.list({ prefix: "player:" });
    const players = [];
    for (const [, data] of entries) {
      players.push({
        displayName: data.displayName,
        balance: data.balance,
        totalWagered: data.totalWagered || 0,
        totalWon: data.totalWon || 0,
        totalSpins: data.totalSpins || 0,
        joinedAt: data.joinedAt,
      });
    }
    return players.sort((a, b) => b.balance - a.balance);
  }

  async broadcastLeaderboard() {
    const sockets = this.state.getWebSockets();
    const hostSockets = sockets.filter(ws => ws.deserializeAttachment()?.isHost);
    if (!hostSockets.length) return;
    const players = await this.getLeaderboard();
    const msg = JSON.stringify({ type: "leaderboard", players });
    for (const ws of hostSockets) ws.send(msg);
  }

  async handleJoin(ws, msg) {
    let meta = await this.state.storage.get("table:meta");
    if (!meta) {
      // Auto-create the permanent table on first join.
      meta = { code: "default", hostToken: null, buyIn: 1000, status: "open", createdAt: Date.now() };
      await this.state.storage.put("table:meta", meta);
    }

    const displayName = String(msg.displayName ?? "").trim().slice(0, MAX_NAME_LEN) || "Guest";
    let token = typeof msg.token === "string" && msg.token.length > 0 ? msg.token : null;

    let playerData = token ? await this.state.storage.get(`player:${token}`) : null;

    if (!playerData) {
      token = crypto.randomUUID();
      const startBalance = Number(msg.buyIn) > 0 ? Number(msg.buyIn) : meta.buyIn;
      playerData = { displayName, joinedAt: Date.now(), balance: startBalance };
    } else {
      playerData.displayName = displayName;
    }

    await this.state.storage.put(`player:${token}`, playerData);
    ws.serializeAttachment({ token });

    // D1 upsert (non-fatal).
    if (this.env.DB) {
      try {
        await this.env.DB.prepare(`
          INSERT INTO player (token, table_id, display_name, joined_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(token) DO UPDATE SET display_name = excluded.display_name
        `).bind(token, meta.code, playerData.displayName, playerData.joinedAt).run();
      } catch (err) { console.error("D1 player upsert:", err.message); }
    }

    ws.send(JSON.stringify({
      type: "joined",
      token,
      displayName: playerData.displayName,
      balance: playerData.balance,
      buyIn: meta.buyIn,
      tableCode: meta.code,
    }));
  }

  async handleWsSpin(ws, msg) {
    const { token } = ws.deserializeAttachment() ?? {};
    if (!token) { ws.send(JSON.stringify({ type: "error", error: "join first" })); return; }

    const bet = Number(msg.bet);
    const isFree = msg.isFree === true;
    const multiplier = Number(msg.multiplier) || 1;

    if (!isFree && (!Number.isFinite(bet) || bet <= 0)) {
      ws.send(JSON.stringify({ type: "error", error: "bet must be a positive number" }));
      return;
    }

    const result = await this.computeSpin(bet, token, isFree, multiplier);
    if (result.error) { ws.send(JSON.stringify({ type: "error", error: result.error })); return; }
    ws.send(JSON.stringify({ type: "result", ...result }));
  }

  async handleHttpSpin(request) {
    let body;
    try { body = await request.json(); } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    const bet = Number(body?.bet);
    if (!Number.isFinite(bet) || bet <= 0) return json({ error: "bet must be positive" }, 400);
    return json(await this.computeSpin(bet, null, false, 1));
  }

  async computeSpin(bet, playerToken, isFree, multiplier) {
    // Load player and enforce balance (online mode only — playerToken is null for legacy HTTP).
    let playerData = null;
    if (playerToken) {
      playerData = await this.state.storage.get(`player:${playerToken}`);
      if (!playerData) return { error: "player not found" };
      if (!isFree && playerData.balance < bet) return { error: "insufficient balance" };
      if (!isFree) {
        playerData.balance = Math.round((playerData.balance - bet) * 100) / 100;
        playerData.totalWagered = Math.round(((playerData.totalWagered || 0) + bet) * 100) / 100;
        playerData.totalSpins = (playerData.totalSpins || 0) + 1;
      }
    }

    const { preimage, preimageHex, commitHex } = await newCommit();
    const random = rngFromPreimage(preimage);
    const grid = spinAllReels(random, REELS);
    const result = evaluateSpin(grid, bet || 1); // bet=0 for free spins; use 1 for evaluator

    // Free spins pass the actual bet for win calculation via multiplier.
    const baseWin = isFree ? result.totalWin * multiplier : result.totalWin;

    if (playerData) {
      playerData.balance = Math.round((playerData.balance + baseWin) * 100) / 100;
      if (baseWin > 0) playerData.totalWon = Math.round(((playerData.totalWon || 0) + baseWin) * 100) / 100;
      await this.state.storage.put(`player:${playerToken}`, playerData);
    }

    const meta = await this.state.storage.get("table:meta");
    const tableId = meta?.code ?? "default";
    const gridJson = JSON.stringify(grid);
    const prevSpinHash = (await this.state.storage.get("prevSpinHash")) ?? null;
    const chainInput = new TextEncoder().encode([preimageHex, gridJson, prevSpinHash ?? ""].join("|"));
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
          tableId, playerToken, Date.now(), isFree ? 0 : bet, gridJson,
          baseWin, result.scatterCount, result.bonusTriggered ? 1 : 0,
          commitHex, preimageHex, prevSpinHash, spinHash,
        ).run();
      } catch (err) { console.error("D1 spin write:", err.message); }
    }

    this.broadcastLeaderboard().catch(() => {});

    return {
      bet: isFree ? 0 : bet,
      grid,
      totalWin: baseWin,
      hits: result.hits,
      scatterCells: result.scatterCells,
      scatterCount: result.scatterCount,
      scatterWin: result.scatterWin,
      bonusTriggered: result.bonusTriggered,
      commit: commitHex,
      reveal: preimageHex,
      spinHash,
      ...(playerData !== null && { balance: playerData.balance }),
    };
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
