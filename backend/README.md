# Norminton Casino — Backend (Phase 2)

Server-authoritative backend for the live multi-player table.

This directory is the **only** place the Phase 1 "no build step, no
dependencies" rule is relaxed — per `PHASE2.md`. The static player UI
at the repo root stays vanilla HTML / CSS / JS.

## Status

**Phase 2 step 1a (current):** portable engine code (reels, paytable,
wheels, evaluator, seedable RNG + commit-reveal) plus Node tests
verifying parity with Phase 1. No Worker entry point, no Durable
Object, no WebSocket yet.

Next up:
- Step 1b — Worker entry, Durable Object shell, `wrangler.toml`,
  HTTP `/spin` round-trip for a single player.
- Step 1c — WebSocket protocol and client network layer.
- Step 1d — D1 spin log with per-spin commit-reveal fully wired.

See `../PHASE2.md` for the full plan and locked decisions.

## Layout

```
backend/
├── package.json       # Node + wrangler project metadata (no runtime deps yet)
├── src/engine/        # Pure, portable game logic (reusable in tests + Worker)
│   ├── reels.js
│   ├── paytable.js
│   ├── wheels.js
│   ├── spin.js
│   ├── evaluator.js
│   └── rng.js         # Seedable PRNG + commit-reveal helpers
└── test/              # Node built-in test runner
    ├── evaluator.test.js
    └── rng.test.js
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

## Deploying (later)

Not ready yet. Once step 1b adds the Worker entry + `wrangler.toml`:

```bash
# One-time, on a desktop:
npm install -g wrangler
wrangler login

# From this directory:
wrangler deploy
```

The Worker will bind to a free `*.workers.dev` subdomain per the
decisions in `PHASE2.md`.
