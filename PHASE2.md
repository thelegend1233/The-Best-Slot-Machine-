# Phase 2 — Live multiplayer table, real money settled between friends

> **Scope document, not a commitment.** This file captures the plan so we
> can refer back to it. Nothing is built yet.

## Overview

Phase 1 is a single-device, play-money slot. Phase 2 turns it into a live
table where you (the house) can open a session, friends join by link, and
everyone plays against a shared authoritative server. Settlement is in
real money, done between friends outside the app (Venmo / cash / etc.).

The current static site stays as the player UI. A small backend is added
for game state, RNG, and the ledger. The `Claude.md` constraints against
servers and build steps apply to Phase 1 — Phase 2 explicitly breaks them,
but only for the backend. The player page stays vanilla HTML/CSS/JS.

## Legal sanity note (not legal advice)

Real-money slot play — even just between friends — is treated differently
in different jurisdictions. Some places regulate or prohibit "banker" games
where one party collects from others. Before running this with anyone,
confirm it's fine where you live. Simple guardrails that help:

- Keep groups small and private (invite-only URL, no public discovery).
- Don't advertise or take fees / a rake (the house pays wins out of its
  own pocket, no cut off the top).
- Keep per-session stake bounded (e.g. $20 per seat, settled at end).
- Keep clear records so disputes resolve quickly.

Nothing in the app itself should imply "licensed gambling."

## Decisions locked

1. **Buy-ins.** House sets each player's buy-in individually from the
   dashboard. Top-ups allowed anytime, routed the same way. Every credit
   is its own line in the ledger.
2. **Settlement timing.** Cash out anytime after a **5-minute minimum**
   from a player's join time. Top-ups don't reset the timer. When a
   player cashes out, their chip balance converts to dollars at that
   moment and they leave the table; the table keeps running.
3. **Concurrent tables.** Multiple tables in parallel. Each table gets a
   short **4-letter uppercase code** (e.g. `WOLF`, `MINT`) that the house
   hands out. Landing page has a "Join Table" input — paste the code and
   a display name to sit down. Codes expire when the table closes; no
   reuse while active.
4. **Bet denominations.** Real dollars. The existing `0.25 / 0.50 / 1 / 2 / 5`
   buttons are literal USD amounts. No chip-to-dollar conversion.
5. **Visibility.** Hybrid. Each player sees only their own grid and
   balance. Big wins (≥ 50× total bet — same threshold used by the Phase 1
   celebration) are broadcast to the full table with the player's name.
   Regular wins stay private.

## Architecture

- **Player UI** — unchanged static site on GitHub Pages. All game logic
  moves behind a WebSocket client.
- **Backend** — Cloudflare Workers + Durable Objects (DO).
  - One DO per table. The DO is a single-instance object (strong
    consistency, no races) that owns the RNG, the reel config, the paytable,
    and the spin log for that table.
  - WebSocket from each player + the house dashboard to the DO. All spins
    round-trip through it.
  - Cloudflare D1 (or KV) for long-term spin log + settlement records.
- **Server owns the truth** — reel strips, paytable, wheel outcomes, spin
  RNG all live in the worker. The client becomes a dumb renderer. Opening
  devtools and editing values does nothing to outcomes.
- **Live feed** — each spin is broadcast to all clients in the table. The
  house dashboard receives the same feed plus aggregate ledger deltas.
- **Identity** — display name + a server-issued table token stored in
  `localStorage` for reconnect. No external auth providers.

## Spin integrity & audit trail (mandatory for real money)

Because disputes over real money will happen eventually, every spin must
be independently verifiable after the fact.

- **Commit-reveal RNG per spin.** At spin start the server commits a hash
  of `(seed || nonce || input)`. On result, it reveals the full preimage.
  Any player can later recompute the grid from the preimage and confirm
  the outcome wasn't changed after the fact.
- **Append-only spin log.** Each spin row includes: table, player, server
  timestamp, bet, bet unit → dollar rate, RNG preimage, resulting grid,
  evaluator output (hits, bonus trigger), wheel results, multiplier, free
  spins, win amount. Stored in D1, never edited.
- **Per-table hash chain.** Each spin's hash includes the previous spin's
  hash. Gives you a cheap "entire session wasn't rewritten" check.
- **Paytable / reel snapshot per table.** The table stores a frozen copy
  of the config when it's created. House cannot change the odds mid-table
  (server rejects config updates on active tables).
- **Session export.** At settlement, the house gets a JSON + CSV of every
  spin in the table and the final balances. Players can ask for their own
  rows. If someone claims they're owed more, the record settles it.

## Data model (first cut)

```
table        { id, host_id, status, buy_in_cents, chip_to_cents_rate,
               created_at, closed_at, paytable_version, reels_version,
               config_snapshot_json }
player       { id, table_id, display_name, token, joined_at,
               balance_chips, net_settlement_cents (nullable until close) }
spin         { id, table_id, player_id, ts, bet_chips,
               rng_commit_hash, rng_preimage, grid_json, total_win_chips,
               base_win_chips, bonus_win_chips, multiplier, free_spins,
               is_free_spin, parent_bonus_id (nullable),
               prev_spin_hash, this_spin_hash }
bonus_round  { id, table_id, player_id, trigger_spin_id, multiplier,
               free_spins_awarded, total_win_chips, opened_at, closed_at }
ledger_view  -> aggregate of spins per table + per player
```

## Phase 2 build order

1. **Lift evaluator + RNG + wheels to the worker.** Single-player round-trip
   over WebSocket. Keep the current UI; swap "compute locally" for "ask
   server." Spin log and per-spin commit-reveal added from day one.
2. **Player identity.** Display name + token in localStorage for reconnect.
3. **Table lifecycle.** House creates a table (picks buy-in + chip rate)
   → gets a share URL → friends open it and pick display names → house
   starts the round → plays until house closes.
4. **House dashboard** (`/house?table=XYZ`). Live per-player P/L, running
   house P/L, big-win feed, spin-rate meter. Reuses the Phase 1 ledger
   rendering. Kick button; disable-join toggle.
5. **Cashier / settlement.** On close the dashboard shows each player's
   net in dollars (chips × rate). One-screen export: JSON + CSV.
6. **Player history view.** Each player can see their own spins this
   session (for self-audit). Not other players' spins.
7. **Polish.** Emote reactions, "hot seat" highlight when someone hits
   a big win, simple table chat.

## Out of scope for Phase 2

- Matchmaking with strangers, public lobbies, leaderboards across tables.
- Persistent cross-session bankrolls (a new session is a new ledger).
- Mobile apps — web works fine on phones.
- Progressive jackpots pooled across tables.
- In-app payments (settlement is out-of-band).
- Regulated-casino features (license, KYC, responsible-play tooling).

## What stays in the repo vs. what's new

- **`/` (root)** — unchanged Phase 1 player UI. Gets a tiny network layer
  to talk to the backend.
- **`/backend`** — new, separate deploy. `wrangler.toml`, Worker code, DO
  class, a small `package.json`. This directory is the **only** place the
  "no build step" rule is broken.
- **`Claude.md`** — add a paragraph noting Phase 2 is active and the rules
  apply only to the static UI.

## Open risks

- **Tampering with the client** still can't change outcomes (server is
  authoritative), but a hostile player could flood spin requests. Rate-limit
  per token in the DO.
- **Disconnects mid-spin.** Server decides outcomes before the reel
  animation; if the client disconnects, the win still credits on reconnect.
  Reel display is just UI.
- **Bonus round in-flight.** If a player disconnects during free spins,
  the DO keeps the round queued until they reconnect (or the house
  force-completes after N minutes).
- **Clock skew / duplicate spins.** Every spin has a client nonce. DO
  rejects duplicates and uses server time for ordering.
- **Browser-tab closed without settlement.** Balance is authoritative on
  the server; player can rejoin and the house still owes / is owed the
  same amount.
- **Abuse of the dev panel.** The Phase 1 "Force Bonus" and "Reset Ledger"
  never ship in Phase 2. All dev knobs move behind a host-only flag on the
  dashboard.

## Infrastructure decisions (locked)

- **Cloudflare account.** Reusing the existing account from another project.
  This project gets its own isolated Worker, Durable Object namespace, and
  D1 database. Zero crossover with the other project's resources.
- **Domain.** Free `*.workers.dev` subdomain for the backend (e.g.
  `slot-machine.<handle>.workers.dev`). Static UI stays on GitHub Pages.
  Easy to swap to a custom domain later by binding a route — no code
  changes required.
- **Player cashout screen.** Bare: "Net: +$X" or "Net: −$X", nothing else.
  Payment happens out-of-band (Venmo, cash).
- **House dashboard.** Separate from the player view. Live per-seat stats
  during play (name, balance, net, spins, bonuses hit, idle time) and a
  post-session per-seat report that includes every spin, every top-up,
  and every cashout. Downloadable JSON + CSV. This is where you run the
  night from.
