// Cloudflare Workers entry. Routes requests to Table Durable Objects keyed
// by the 4-letter table code. One DO instance per table — strong consistency,
// no races on spin ordering or balance.

export { Table } from "./table.js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit I/O to avoid confusion

function generateCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => CHARS[b % CHARS.length]).join("");
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonRes(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function stubFor(env, code) {
  return env.TABLE.get(env.TABLE.idFromName(code));
}

async function proxyToTable(stub, request, origin) {
  // WebSocket upgrades must pass through as-is — CORS headers on a 101 break the handshake.
  if (request.headers.get("Upgrade") === "websocket") {
    return stub.fetch(request);
  }
  const upstream = await stub.fetch(request);
  const headers = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // POST /tables — create a new table, return { code, hostToken }
    if (url.pathname === "/tables" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch {
        return jsonRes({ error: "body must be JSON" }, 400, origin);
      }
      const buyIn = Number(body?.buyIn);
      if (!Number.isFinite(buyIn) || buyIn <= 0) {
        return jsonRes({ error: "buyIn must be a positive number" }, 400, origin);
      }

      const code = generateCode();
      const hostToken = crypto.randomUUID();
      const stub = stubFor(env, code);

      // Initialize the DO with table metadata.
      const initUrl = new URL(request.url);
      initUrl.pathname = "/init";
      const initResp = await stub.fetch(new Request(initUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, hostToken, buyIn }),
      }));

      if (!initResp.ok) {
        return jsonRes({ error: "failed to initialize table" }, 500, origin);
      }

      // Persist table record to D1 (non-fatal).
      if (env.DB) {
        try {
          await env.DB.prepare(
            "INSERT INTO game_table (code, host_token, status, buy_in, created_at) VALUES (?, ?, 'open', ?, ?)"
          ).bind(code, hostToken, buyIn, Date.now()).run();
        } catch (err) {
          console.error("D1 game_table insert failed:", err.message);
        }
      }

      return jsonRes({ code, hostToken }, 200, origin);
    }

    // /tables/:CODE  or  /tables/:CODE/...
    const tableMatch = url.pathname.match(/^\/tables\/([A-Z]{4})(\/.*)?$/);
    if (tableMatch) {
      return proxyToTable(stubFor(env, tableMatch[1]), request, origin);
    }

    // Legacy routes from step 1b–1d (/health, /spin, /ws) → "default" DO.
    if (["/health", "/spin", "/ws"].some(p => url.pathname === p)) {
      return proxyToTable(stubFor(env, "default"), request, origin);
    }

    return new Response("not found", { status: 404 });
  },
};
