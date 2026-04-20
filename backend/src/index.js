// Cloudflare Workers entry. Routes incoming HTTP requests to the Table
// Durable Object, which owns the RNG and evaluator. For step 1b there's
// a single hard-coded "default" table — step 3 (table lifecycle) expands
// this to multi-table routing keyed by the 4-letter join code.

export { Table } from "./table.js";

function corsHeaders(origin) {
  // Allow any origin for dev. Tighten to the GitHub Pages origin once
  // the prod UI is pointing here (step 1c).
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Single table for now. Step 3 keys this by the table code from the URL.
    const id = env.TABLE.idFromName("default");
    const stub = env.TABLE.get(id);

    const upstream = await stub.fetch(request);
    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
