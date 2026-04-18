# Slot Machine Project

## What this is

A personal-learning browser slot machine. Generic nature/animal theme. Runs as a static site — open `index.html` in a browser and it works. No server, no build step, no deploy pipeline.

## Hard constraints

- **Vanilla HTML, CSS, and JavaScript only.** No React, Vue, Svelte, jQuery, TypeScript, bundlers, or package managers.
- **No build step.** If I can’t refresh the browser and see the change, it’s the wrong approach.
- **No external runtime dependencies** except Howler.js for audio (loaded from CDN, added only when audio is implemented).
- **Three files max for core:** `index.html`, `style.css`, `game.js`. Split `game.js` later only if it exceeds ~800 lines.
- **No localStorage wrappers, no state management libraries.** Plain `localStorage.getItem` / `setItem`.
- **Code must be readable by a non-developer.** Clear variable names, comments on non-obvious logic, no clever one-liners.

## Game specification

### Grid and reels

- 5 reels, 3 rows visible per reel (5x3 grid).
- Each reel is a strip of 30–40 symbols. Spinning picks a random offset and lands on it.
- Reel strips are weighted (more low-value symbols, fewer high-value) to hit ~95% RTP.

### Paylines

- 10 paylines for v1. Standard L-to-R matching. Use the common 10-line pattern (row 1, row 2, row 3, V, inverted V, zigzags).
- Player can adjust active paylines from 1 to 10 via +/- buttons.
- Total bet = `lineBet × activeLines`.

### Symbols

- 8 regular symbols, ranked low to high: leaf, acorn, mushroom, rabbit, fox, deer, bear, wolf.
- 1 wild symbol (e.g., paw print): substitutes for any regular symbol. Does not substitute for scatter.
- 1 scatter symbol (e.g., full moon): pays from anywhere, triggers bonus.
- Use emoji placeholders in v1. Leave the symbol-to-asset mapping in one place so real art can swap in later.

### Paytable (aim for ~95% RTP)

- High symbols (wolf, bear, deer): 3/4/5 of a kind pays 20x / 100x / 500x line bet (wolf), scaling down for bear and deer.
- Mid symbols (fox, rabbit): 3/4/5 pays smaller.
- Low symbols (mushroom, acorn, leaf): 3/4/5 pays smallest, but hit frequently.
- Wilds pay as the highest symbol they complete.
- 3/4/5 scatters anywhere pays 2x/10x/50x total bet AND triggers bonus.
- Claude should calculate approximate RTP via Monte Carlo simulation (1M+ spins, print result to console) during development to verify ~95%. This is an in-code check, not a player-facing feature.

### Bonus round

- Triggered by 3+ scatters.
- **Build v1 without the hold & spin bonus.** Instead, implement 10 free spins at 2x multiplier. This is simpler and lets the base game get finished.
- Hold & spin is deferred to v2. Scope v2 separately — do not start it until v1 is fully playable.

### Betting

- Adjustable line bet: 0.25, 0.50, 1, 2, 5 credits.
- Adjustable active lines: 1 to 10.
- Spin button triggers a spin if balance ≥ total bet.

### Balance

- Starts at 1000 credits on first load.
- Persists in `localStorage` under a single key (`slot_balance`).
- “Buy back in” button resets balance to 1000. Always available.

### Animations and juice

- Reel spin: CSS transform on a vertical strip inside `overflow: hidden` container. Each reel stops ~150ms after the previous (cascading stop feel).
- Winning paylines: flash the winning tiles, draw the line briefly, pulse the win amount.
- Win counter: tick up from 0 to the win amount over ~1 second.
- Big wins (≥ 50x total bet): screen shake, particle burst, “BIG WIN” banner.
- Bonus trigger: dedicated transition animation before free spins start.
- All animations skippable by clicking Spin again (or tapping).

### Audio (basic, Howler.js)

- Reel spin loop (plays during spin, stops on reel land).
- Win chime (regular wins).
- Big win fanfare (≥ 50x).
- Bonus trigger sound.
- Mute button in UI. Muted state persists in localStorage.
- Audio files go in `/sounds/`. Use free CC0 sources; Claude should leave placeholder filenames and a note for me to drop files in.

### Mobile

- Responsive: works on 360px width and up.
- Touch targets minimum 44x44px.
- No hover-dependent UI (mobile has no hover).
- Test: the full UI must be usable in portrait mode on a phone without zooming.

## Build order (do NOT skip ahead)

1. Static 5x3 grid with emoji symbols. Spin button does nothing yet.
1. Reel strips defined. Spin button randomizes displayed symbols (no animation).
1. Payline evaluation. Win amount logs to console.
1. Win amount shows in UI. Balance updates. Bet controls work.
1. Reel spin animation (CSS transforms, cascading stop).
1. Winning tile highlight + line draw.
1. Wilds and scatters in the evaluator.
1. localStorage persistence + buy-back-in button.
1. Audio (Howler + mute button).
1. Big win celebration (shake, particles, banner).
1. Bonus trigger detection + free spins bonus round.
1. Mobile responsiveness pass.
1. RTP Monte Carlo verification (console script, 1M spins).

**After each step, stop and confirm it works before moving to the next.** Do not stack multiple steps in one change.

## Code style

- Use `const` by default, `let` when reassigning, never `var`.
- Function names describe what they do (`evaluatePayline`, not `evalPL`).
- One file per concern if splitting becomes necessary: `reels.js`, `paytable.js`, `animations.js`, `audio.js`, `bonus.js`, `main.js`.
- Config (paytable, reel strips, bet options) goes in a `config.js` object at the top so I can tune values without hunting.
- Comments explain *why*, not *what*. Don’t comment obvious lines.

## What NOT to do

- Don’t add a framework “just to make state easier.”
- Don’t add TypeScript “for safety.”
- Don’t add npm packages “it’s just one dependency.”
- Don’t use `<canvas>` unless a specific animation genuinely requires it (particles are the only likely case, and even then CSS is fine).
- Don’t invent features I didn’t ask for (progressive jackpots, multipliers beyond the bonus, side bets, gamble feature, etc.).
- Don’t write tests. This is a personal project; manual play-testing is the test.

## When in doubt

Ask me. Don’t guess on paytable values, symbol names, or UX decisions.
