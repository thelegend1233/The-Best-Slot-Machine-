# Norminton Casino — Backend (Phase 2)

Server-authoritative backend for the live multi-player table.

This directory is the **only** place the Phase 1 "no build step, no
dependencies" rule is relaxed — per `PHASE2.md`. The static player UI
at the repo root stays vanilla HTML / CSS / JS.

## Status

**Phase 2 step 1b (current):** the backend is now a deployable Worker
with a single Durable Object (`Table`). A `POST /spin` endpoint returns
a real server-computed spin result with a SHA-256 commit-reveal so the
client can verify the outcome wasn't altered after the fact.

Done so far:
- Step 1a ✓ portable engine + parity tests.
- Step 1b ✓ Worker entry, Durable Object, `wrangler.toml`, HTTP `/spin`
  endpoint, DO integration tests.

Next up:
- Step 1c — WebSocket protocol and wire the Phase 1 client to call the
  backend instead of running the engine locally.
- Step 1d — D1 spin log with per-spin commit-reveal persisted.

See `../PHASE2.md` for the full plan and locked decisions.

## Layout

```
backend/
├── package.json       # Node + wrangler project metadata (no runtime deps yet)
├── wrangler.toml      # Cloudflare Worker + Durable Object config
├── src/
│   ├── index.js       # Worker entry — routes requests to the Table DO
│   ├── table.js       # Table Durable Object (owns RNG + evaluator per table)
│   └── engine/        # Pure, portable game logic (reusable in tests + Worker)
│       ├── reels.js
│       ├── paytable.js
│       ├── wheels.js
│       ├── spin.js
│       ├── evaluator.js
│       └── rng.js     # Seedable PRNG + commit-reveal helpers
└── test/              # Node built-in test runner
    ├── evaluator.test.js
    ├── rng.test.js
    └── table.test.js  # Direct DO fetch tests (no wrangler needed)
```

Engine modules avoid Node-specific APIs — they use only what's available
in both `node:>=20` and the Cloudflare Workers runtime (Web Crypto,
`globalThis.crypto`, plain ES modules).

## Running tests

Requires Node 20 or later. No install step, no external dependencies.

```bash
cd backend
npm test
```

Tests cover:
- Every evaluator branch (no-match, basic ways, wild substitution,
  all-wilds, scatter anywhere, scatter breaking a run, zero-multiplier
  low-symbol hits).
- 500k-spin deterministic RTP sanity check.
- PRNG determinism, commit-reveal round-trip, and tamper detection.

## Running the Worker locally

`wrangler dev` spins up a local server that simulates the Workers
runtime (including Durable Objects) against the real code. No Cloudflare
account needed just to poke at it:

```bash
cd backend
npx wrangler dev           # http://127.0.0.1:8787

# In another terminal:
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/spin \
     -H 'content-type: application/json' \
     -d '{"bet": 1}'
```

The spin response includes the `grid`, the `totalWin`, the `hits`, the
`commit` (SHA-256 of the server seed), and the `reveal` (the seed itself).
Feed `reveal` back into the engine and you must reproduce the grid —
that's the audit path.

## Deploying to Cloudflare

One-time on the same desktop:

```bash
npm install -g wrangler
wrangler login            # OAuth, opens a browser
wrangler whoami           # shows your Account ID; paste into wrangler.toml
                          # if wrangler prompts on deploy
```

Then, from `backend/`:

```bash
wrangler deploy
```

Wrangler prints the deployed URL (e.g.
`https://norminton-casino.<your-handle>.workers.dev`). That's the base
URL the Phase 1 client will point at in step 1c.
