// Norminton Casino — slot machine
// Mechanic: 243 ways pays. Any 3+ matching symbols left-to-right, one per
// column, regardless of row. Wilds substitute. Wins highlight every
// contributing cell; no payline polylines. 3+ scatters trigger 10 free spins
// at x2 multiplier. See Claude.md for the full spec.

// Single place where emoji art is mapped to symbol names. Swap emojis for real
// art later without hunting through the codebase.
const SYMBOLS = {
  leaf:     "🍃",
  acorn:    "🌰",
  mushroom: "🍄",
  rabbit:   "🐇",
  fox:      "🦊",
  deer:     "🦌",
  bear:     "🐻",
  wolf:     "🐺",
  wild:     "🐾",
  scatter:  "🌕",
};

// CONFIG — tune game feel from one place.
const CONFIG = {
  // Weighted reels: low-value symbols appear more often than high-value ones
  // so the game can target ~95% RTP. Exact weights get tuned in step 13.
  reels: [
    // reel 0
    [
      "leaf","acorn","mushroom","rabbit","leaf","fox","acorn","leaf",
      "rabbit","mushroom","deer","leaf","acorn","wild","mushroom","fox",
      "leaf","rabbit","acorn","bear","leaf","mushroom","fox","acorn",
      "scatter","rabbit","leaf","deer","mushroom","acorn","wolf","leaf",
      "fox","rabbit","leaf",
    ],
    // reel 1
    [
      "acorn","leaf","rabbit","mushroom","acorn","fox","leaf","rabbit",
      "acorn","deer","mushroom","leaf","wild","acorn","rabbit","fox",
      "leaf","mushroom","acorn","bear","rabbit","leaf","fox","mushroom",
      "acorn","scatter","leaf","deer","rabbit","acorn","mushroom","leaf",
      "fox","acorn","rabbit",
    ],
    // reel 2
    [
      "mushroom","leaf","acorn","rabbit","leaf","mushroom","fox","acorn",
      "leaf","rabbit","deer","mushroom","acorn","wild","leaf","rabbit",
      "fox","mushroom","acorn","leaf","wolf","rabbit","mushroom","leaf",
      "acorn","fox","scatter","leaf","bear","mushroom","rabbit","acorn",
      "leaf","fox","mushroom",
    ],
    // reel 3
    [
      "leaf","rabbit","acorn","mushroom","leaf","acorn","fox","rabbit",
      "leaf","mushroom","acorn","deer","rabbit","leaf","wild","mushroom",
      "acorn","fox","leaf","rabbit","mushroom","bear","acorn","leaf",
      "fox","rabbit","mushroom","scatter","acorn","leaf","deer","rabbit",
      "mushroom","fox","acorn",
    ],
    // reel 4
    [
      "leaf","acorn","rabbit","mushroom","leaf","fox","acorn","rabbit",
      "leaf","mushroom","acorn","deer","leaf","rabbit","mushroom","wild",
      "acorn","leaf","fox","rabbit","mushroom","acorn","leaf","bear",
      "rabbit","fox","mushroom","acorn","leaf","scatter","rabbit","wolf",
      "leaf","mushroom","acorn",
    ],
  ],

  // Paytable: multiplier of bet for 3 / 4 / 5 of a kind. Tuned via 3M-spin
  // Monte Carlo to ~93% RTP with ~34% hit frequency.
  // - Only wolf and bear pay 3 of a kind (the rare high symbols).
  // - Every other symbol pays 5 of a kind (and sometimes 4), so every
  //   symbol on the reel has a path to winning.
  // - Low symbols (leaf, acorn, mushroom, rabbit) need 5 of a kind because
  //   ways multiplication amplifies common symbols hard.
  // Scatter is an "anywhere-pays" multiplier of bet. Wild has no entry —
  // it substitutes for other symbols.
  paytable: {
    wolf:     [3, 18, 70],
    bear:     [2,  8, 30],
    deer:     [0,  4, 20],
    fox:      [0,  3, 11],
    rabbit:   [0,  0,  3],
    mushroom: [0,  0,  2],
    acorn:    [0,  0,  1],
    leaf:     [0,  0,  1],
    scatter:  [2, 10, 50], // paid on bet, anywhere on the grid
  },

  // Betting options
  betOptions: [0.25, 0.5, 1, 2, 5],
  startingBalance: 1000,
  waysCount: 243,
  // Regular (non-wild, non-scatter) symbols evaluated for ways wins.
  paySymbols: ["leaf", "acorn", "mushroom", "rabbit", "fox", "deer", "bear", "wolf"],
  // Bonus round: 3+ scatters trigger two wheels in sequence. Wheel 1 locks
  // in the multiplier for the whole round; wheel 2 locks in the number of
  // free spins. Slices are listed in display order (slice 0 at top, going
  // clockwise). Every slice is equally likely, so weighting is done by
  // repeating values: the layouts below spread the jackpot slot (×25 / ×20)
  // across the wheel so its neighbors are small values and it stays rare.
  //
  // Multiplier wheel weights (12 slots):
  //   ×2: 4/12 (33%)   ×3: 3/12 (25%)   ×5: 2/12 (17%)
  //   ×10: 2/12 (17%)  ×25: 1/12 (8%)
  multiplierWheel: [
    { value:  2, color: "wheel-slice-a" },
    { value:  5, color: "wheel-slice-b" },
    { value:  2, color: "wheel-slice-c" },
    { value:  3, color: "wheel-slice-d" },
    { value: 10, color: "wheel-slice-e" },
    { value:  2, color: "wheel-slice-a" },
    { value:  3, color: "wheel-slice-b" },
    { value: 25, color: "wheel-slice-f" },
    { value:  2, color: "wheel-slice-c" },
    { value: 10, color: "wheel-slice-e" },
    { value:  3, color: "wheel-slice-d" },
    { value:  5, color: "wheel-slice-b" },
  ],
  // Free-spins wheel weights (12 slots):
  //   5:  3/12 (25%)  8:  3/12 (25%)  10: 3/12 (25%)
  //   15: 2/12 (17%)  20: 1/12 (8%)
  freeSpinsWheel: [
    { value:  5, color: "wheel-slice-a" },
    { value: 10, color: "wheel-slice-b" },
    { value:  8, color: "wheel-slice-c" },
    { value:  5, color: "wheel-slice-d" },
    { value: 15, color: "wheel-slice-e" },
    { value:  8, color: "wheel-slice-a" },
    { value: 10, color: "wheel-slice-b" },
    { value: 20, color: "wheel-slice-f" },
    { value:  5, color: "wheel-slice-c" },
    { value: 10, color: "wheel-slice-d" },
    { value:  8, color: "wheel-slice-b" },
    { value: 15, color: "wheel-slice-e" },
  ],

  // Animation tuning
  spinBaseDurationMs: 700,     // reel 0 spins this long
  spinStaggerMs: 150,          // each later reel spins this much longer
  spinPaddingSymbols: 20,      // random symbols shown before the landing 3
  spinOvershootPx: 6,          // how far past rest the reel briefly drops
  spinBounceBackMs: 200,       // time for the reel to settle back from overshoot
};

// ---------- Game state ----------

// Single localStorage key per spec — no wrappers, just getItem / setItem.
const STORAGE_KEY = "slot_balance";

function loadBalance() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return CONFIG.startingBalance;
  const parsed = parseFloat(stored);
  // Guard against tampered or corrupted values rather than silently breaking.
  if (!isFinite(parsed) || parsed < 0) return CONFIG.startingBalance;
  return parsed;
}

function saveBalance() {
  localStorage.setItem(STORAGE_KEY, String(state.balance));
}

const state = {
  balance: loadBalance(),
  betIndex: 2,   // index into CONFIG.betOptions → 1.00
  lastWin: 0,
};

// Bonus round state. Tracked separately so regular game flow stays readable.
// No re-trigger in v1: scatters during free spins still pay their scatter
// multiplier (via the evaluator) but don't add more free spins.
// `multiplier` and `spinsAwarded` are locked in by the two wheels that show
// when the bonus triggers.
const bonus = {
  active: false,
  spinsRemaining: 0,
  spinsAwarded: 0,
  multiplier: 1,
  totalWin: 0,
};

function currentBet() {
  return CONFIG.betOptions[state.betIndex];
}

function formatCredits(amount) {
  return amount.toFixed(2);
}

// ---------- Reel spinning ----------

// Pick a random starting index on a reel strip and return the three consecutive
// symbols that would be visible (top, middle, bottom). Wraps around the strip.
function spinReel(reelStrip) {
  const startIndex = Math.floor(Math.random() * reelStrip.length);
  const visible = [];
  for (let row = 0; row < 3; row++) {
    const index = (startIndex + row) % reelStrip.length;
    visible.push(reelStrip[index]);
  }
  return visible;
}

// Build the full 5-reel grid by spinning each reel independently.
function spinAllReels() {
  return CONFIG.reels.map(spinReel);
}

// ---------- Payline evaluation (basic, step 3) ----------

// 243-ways evaluator. For each paying symbol, find the longest leading run
// of reels that contain at least one match (the symbol itself or a wild,
// which substitutes). When the run is 3+ reels long, the win is:
//   bet × paytable[symbol][run-3] × ways
// where `ways` is the product of the per-reel match counts. Wilds count
// toward every paying symbol's match (standard ways-pays behaviour), so a
// single wild can contribute to multiple symbol wins on the same spin.
function evaluateWaysForSymbol(grid, symbol, bet) {
  // Per-reel positions where symbol or wild appears.
  const matchingRows = grid.map((reelArray) => {
    const rows = [];
    for (let row = 0; row < reelArray.length; row++) {
      const s = reelArray[row];
      if (s === symbol || s === "wild") rows.push(row);
    }
    return rows;
  });

  let runLength = 0;
  for (let r = 0; r < matchingRows.length; r++) {
    if (matchingRows[r].length > 0) runLength++;
    else break;
  }

  if (runLength < 3) return null;

  const paytableEntry = CONFIG.paytable[symbol];
  if (!paytableEntry) return null;

  const multiplier = paytableEntry[runLength - 3];
  // Low symbols pay 0 on some run lengths. Treat zero-multiplier runs as
  // "no win" so we don't highlight cells without actually paying anything.
  if (!multiplier) return null;

  let ways = 1;
  for (let r = 0; r < runLength; r++) ways *= matchingRows[r].length;

  const win = bet * multiplier * ways;

  // Cells contributing to the win (used to highlight tiles on a hit).
  const cells = [];
  for (let r = 0; r < runLength; r++) {
    for (const row of matchingRows[r]) cells.push([r, row]);
  }

  return { symbol, count: runLength, ways, win, cells };
}

function findScatterCells(grid) {
  const cells = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === "scatter") cells.push([reel, row]);
    }
  }
  return cells;
}

// Evaluate every paying symbol plus the scatter anywhere-pay. Returns total
// win, per-symbol hits, scatter metadata, and whether the bonus was
// triggered (free-spins round lands in step 11).
function evaluateSpin(grid, bet) {
  const hits = [];
  let totalWin = 0;

  for (const symbol of CONFIG.paySymbols) {
    const hit = evaluateWaysForSymbol(grid, symbol, bet);
    if (hit) {
      hits.push(hit);
      totalWin += hit.win;
    }
  }

  const scatterCells = findScatterCells(grid);
  const scatterCount = scatterCells.length;
  let scatterWin = 0;
  let bonusTriggered = false;

  if (scatterCount >= 3) {
    // Cap at the 5-of-a-kind payout even if more than 5 scatters land.
    const index = Math.min(scatterCount, 5) - 3;
    scatterWin = bet * CONFIG.paytable.scatter[index];
    totalWin += scatterWin;
    bonusTriggered = true;
  }

  return { totalWin, hits, scatterCells, scatterCount, scatterWin, bonusTriggered };
}

// ---------- Rendering ----------

// Replace a reel's contents with 3 static cells showing the given symbols.
// This is the "at-rest" shape used both at page load and after a spin settles.
function renderStaticReel(reelEl, symbols) {
  reelEl.innerHTML = "";
  for (const symbolName of symbols) {
    const cell = document.createElement("div");
    cell.className = "cell";
    // Wilds get a distinct tile so they're instantly recognizable.
    if (symbolName === "wild") cell.classList.add("cell-wild");
    cell.textContent = SYMBOLS[symbolName];
    reelEl.appendChild(cell);
  }
}

function renderGrid(grid) {
  const reels = document.querySelectorAll(".reel");
  reels.forEach((reelEl, reelIndex) => {
    renderStaticReel(reelEl, grid[reelIndex]);
  });
}

// ---------- Spin animation ----------

// Track animation state so we can (a) ignore duplicate spin requests mid-spin
// and (b) let a second tap skip the animation to the final result.
let spinInProgress = false;
let activeSkips = [];

function skipActiveSpin() {
  const skips = activeSkips;
  activeSkips = [];
  skips.forEach((fn) => fn());
}

// Animate all 5 reels. Each reel is swapped for a long strip; the strip starts
// with its bottom (padding) visible and slides DOWN so the target symbols at
// the top appear — new symbols enter from the top, old ones drop off the
// bottom. Reels stop in cascade. The stop has a two-phase settle: first a
// smooth decel to just past rest (overshoot), then a short bounce back,
// giving a subtle "hit the stop" feel.
function animateReels(targetGrid) {
  return new Promise((resolve) => {
    const reelEls = Array.from(document.querySelectorAll(".reel"));
    let remaining = reelEls.length;

    reelEls.forEach((reelEl, reelIndex) => {
      const targetSymbols = targetGrid[reelIndex];
      const reelStrip = CONFIG.reels[reelIndex];

      // Strip layout: [buffer] [target0] [target1] [target2] [padding × N].
      // The buffer above the targets gives overshoot somewhere to land.
      // The padding below is what's visible while the reel is spinning.
      const randomSymbol = () =>
        reelStrip[Math.floor(Math.random() * reelStrip.length)];
      const stripSymbols = [randomSymbol(), ...targetSymbols];
      for (let i = 0; i < CONFIG.spinPaddingSymbols; i++) {
        stripSymbols.push(randomSymbol());
      }

      // Lock the reel's height while the longer strip is swapped in so the
      // surrounding grid doesn't jump.
      const lockedHeight = reelEl.getBoundingClientRect().height;
      reelEl.style.height = lockedHeight + "px";

      reelEl.innerHTML = "";
      const strip = document.createElement("div");
      strip.className = "strip";
      for (const symbolName of stripSymbols) {
        const cell = document.createElement("div");
        cell.className = "cell";
        if (symbolName === "wild") cell.classList.add("cell-wild");
        cell.textContent = SYMBOLS[symbolName];
        strip.appendChild(cell);
      }
      reelEl.appendChild(strip);

      const spinDuration = CONFIG.spinBaseDurationMs + reelIndex * CONFIG.spinStaggerMs;

      let finished = false;
      let phase = 1;

      const finish = () => {
        if (finished) return;
        finished = true;
        strip.removeEventListener("transitionend", onTransitionEnd);
        renderStaticReel(reelEl, targetSymbols);
        reelEl.style.height = "";
        remaining--;
        if (remaining === 0) resolve();
      };

      // Phase 1 lands at overshoot; phase 2 bounces back; then finish.
      // Phase 2 uses a symmetric ease-in-out so velocity is zero at both ends:
      // no sudden direction change, no jerk at the seam.
      function onTransitionEnd(event) {
        if (event.propertyName !== "transform") return;
        if (phase === 1) {
          phase = 2;
          strip.style.transition = `transform ${CONFIG.spinBounceBackMs}ms cubic-bezier(0.45, 0, 0.55, 1)`;
          strip.style.transform = `translateY(${restY}px)`;
        } else {
          finish();
        }
      }
      strip.addEventListener("transitionend", onTransitionEnd);

      activeSkips.push(() => {
        strip.style.transition = "none";
        finish();
      });

      // Measure after layout so cell/gap sizes are real, then kick off phase 1.
      // `restY` is captured in the closure for phase 2.
      let restY = 0;
      requestAnimationFrame(() => {
        const stripHeight = strip.getBoundingClientRect().height;
        const reelInnerHeight = reelEl.clientHeight - 12; // minus 6px padding on both sides
        const cellCount = stripSymbols.length;
        const gapPx = 10;
        const cellHeight = (stripHeight - gapPx * (cellCount - 1)) / cellCount;
        const stride = cellHeight + gapPx;

        // Start: padding visible at the bottom of the strip.
        const startY = -(stripHeight - reelInnerHeight);
        // Rest: target symbols occupy the visible window. Buffer is at strip
        // index 0, so shifting by one stride puts target0 at the top.
        restY = -stride;
        const overshootY = restY + CONFIG.spinOvershootPx;

        // Place the strip at its start position without animating.
        strip.style.transition = "none";
        strip.style.transform = `translateY(${startY}px)`;
        // Force a reflow so the next transform actually triggers a transition.
        void strip.offsetHeight;

        strip.style.transition = `transform ${spinDuration}ms cubic-bezier(0.12, 0.72, 0.32, 1)`;
        strip.style.transform = `translateY(${overshootY}px)`;
      });
    });
  });
}

// ---------- Win highlight (cells + payline overlay) ----------

function clearWinHighlights() {
  document.querySelectorAll(".cell.cell-win").forEach((el) => {
    el.classList.remove("cell-win");
  });
  document.querySelector(".stat-win").classList.remove("pulse");
}

function pulseWinDisplay() {
  const statWin = document.querySelector(".stat-win");
  // Restart the CSS animation by toggling the class.
  statWin.classList.remove("pulse");
  void statWin.offsetWidth;
  statWin.classList.add("pulse");
}

function cellElement(reelIndex, rowIndex) {
  const reel = document.querySelectorAll(".reel")[reelIndex];
  return reel.querySelectorAll(".cell")[rowIndex];
}

// 243 ways doesn't have discrete paylines to draw — instead, every cell
// that contributed to any symbol win lights up. Scatter cells light up too
// when the scatter pay triggers.
function drawWinHighlights(result) {
  for (const hit of result.hits) {
    for (const [reel, row] of hit.cells) {
      cellElement(reel, row).classList.add("cell-win");
    }
  }
  if (result.scatterCount >= 3) {
    for (const [reel, row] of result.scatterCells) {
      cellElement(reel, row).classList.add("cell-win");
    }
  }
}

// ---------- UI updates ----------

function updateUI() {
  document.getElementById("balance").textContent = formatCredits(state.balance);
  document.getElementById("win").textContent = formatCredits(state.lastWin);
  document.getElementById("bet").textContent = formatCredits(currentBet());

  // Free spins: Spin is always enabled (cost is zero). Paid play: require
  // balance to cover the bet. During an in-flight animation Spin stays
  // enabled so a second tap can skip.
  const spinButton = document.getElementById("spin-button");
  spinButton.disabled =
    !spinInProgress && !bonus.active && state.balance < currentBet();
  spinButton.textContent = bonus.active ? "Free Spin" : "Spin";

  // Bet steppers and the buy-back-in button are locked during the bonus so
  // the player can't change the wager or reset their balance mid-round.
  const lockedForBonus = bonus.active;
  document.querySelector('[data-action="bet-down"]').disabled =
    lockedForBonus || state.betIndex <= 0;
  document.querySelector('[data-action="bet-up"]').disabled =
    lockedForBonus || state.betIndex >= CONFIG.betOptions.length - 1;
  document.getElementById("buy-back-in-button").disabled = lockedForBonus;
}

function handleStepper(action) {
  if (action === "bet-up" && state.betIndex < CONFIG.betOptions.length - 1) {
    state.betIndex++;
  } else if (action === "bet-down" && state.betIndex > 0) {
    state.betIndex--;
  }
  updateUI();
}

async function performSpin() {
  if (spinInProgress) return;

  // Cancel any pending auto-advance — this call takes over.
  clearTimeout(autoAdvanceTimeoutId);
  autoAdvanceTimeoutId = null;

  const bet = currentBet();
  const isFreeSpin = bonus.active;

  // Paid spins require balance; free spins don't touch it.
  if (!isFreeSpin && state.balance < bet) return;

  clearWinHighlights();

  const multiplier = isFreeSpin ? bonus.multiplier : 1;

  if (!isFreeSpin) {
    state.balance -= bet;
    saveBalance();
  } else {
    bonus.spinsRemaining--;
  }
  state.lastWin = 0;
  updateUI();
  if (isFreeSpin) updateBonusIndicator();

  // Decide the outcome before the animation so evaluation and display stay
  // in sync even if the animation is skipped.
  const grid = spinAllReels();

  // Dev override: if the admin armed a forced bonus, plant 3 scatters on
  // the base-game grid. Ignored during free spins so the bonus doesn't
  // loop on itself.
  if (forceBonusNext && !isFreeSpin) {
    forceBonusNext = false;
    setDevButtonArmed(false);
    rigGridForBonus(grid);
  }

  const baseResult = evaluateSpin(grid, bet);
  const winAmount = baseResult.totalWin * multiplier;

  spinInProgress = true;
  await animateReels(grid);
  spinInProgress = false;

  state.lastWin = winAmount;
  state.balance += winAmount;
  saveBalance();
  if (isFreeSpin) {
    bonus.totalWin += winAmount;
    updateBonusIndicator();
  }
  updateUI();

  if (winAmount > 0) {
    console.log(
      `${isFreeSpin ? "Free spin" : "Spin"} win: ${formatCredits(winAmount)} credits`,
      { hits: baseResult.hits, scatters: baseResult.scatterCount, multiplier },
    );
    drawWinHighlights(baseResult);
    pulseWinDisplay();
    if (isBigWin(winAmount, bet)) runBigWinCelebration();
  } else {
    console.log(isFreeSpin ? "Free spin — no win" : "No win");
  }

  // Start the bonus round after a base-game trigger resolves. The two
  // wheels run sequentially and lock in the free-spin count + multiplier
  // before the first free spin.
  if (!isFreeSpin && baseResult.bonusTriggered) {
    setTimeout(async () => {
      const { freeSpins, multiplier } = await runBonusWheels();
      startFreeSpins(freeSpins, multiplier);
    }, 700);
    return;
  }

  // Free-spin flow control.
  if (isFreeSpin) {
    if (bonus.spinsRemaining === 0) {
      setTimeout(endFreeSpins, 900);
    } else {
      // Auto-advance to the next free spin so the bonus plays itself out.
      // The player can still tap Spin to skip the pause.
      clearTimeout(autoAdvanceTimeoutId);
      autoAdvanceTimeoutId = setTimeout(() => {
        autoAdvanceTimeoutId = null;
        if (bonus.active && !spinInProgress) performSpin();
      }, 1200);
    }
  }
}

// A tap mid-spin skips the animation; a tap during the big-win celebration
// dismisses it; otherwise starts a new spin.
function handleSpinClick() {
  if (celebrationInProgress) clearCelebration();
  if (spinInProgress) {
    skipActiveSpin();
    return;
  }
  performSpin();
}

// ---------- Big-win celebration ----------

// Threshold per spec: a win of at least 50x the total bet is "big".
const BIG_WIN_MULTIPLIER = 50;

let celebrationInProgress = false;
let celebrationTimeoutId = null;
let autoAdvanceTimeoutId = null;

function isBigWin(winAmount, totalBet) {
  return totalBet > 0 && winAmount >= totalBet * BIG_WIN_MULTIPLIER;
}

// Generate N particles at random angles/distances. Colors stay in the warm
// gold/amber range so the burst reads as "money" rather than rainbow confetti.
function spawnParticles(count = 32) {
  const container = document.getElementById("particles");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const size = 6 + Math.random() * 10;
    const hue = 38 + Math.random() * 18; // gold / amber
    const lightness = 55 + Math.random() * 15;
    particle.style.setProperty("--dx", `${dx.toFixed(0)}px`);
    particle.style.setProperty("--dy", `${dy.toFixed(0)}px`);
    particle.style.setProperty("--size", `${size.toFixed(1)}px`);
    particle.style.background = `hsl(${hue}, 95%, ${lightness}%)`;
    particle.style.color = `hsl(${hue}, 95%, ${lightness}%)`;
    particle.style.animationDelay = `${Math.floor(Math.random() * 120)}ms`;
    container.appendChild(particle);
  }
}

function runBigWinCelebration() {
  celebrationInProgress = true;

  document.querySelector(".machine").classList.add("shake");
  // Shake finishes on its own; strip the class so it can run again later.
  setTimeout(() => {
    document.querySelector(".machine").classList.remove("shake");
  }, 500);

  spawnParticles();
  const banner = document.getElementById("big-win-banner");
  banner.classList.remove("show");
  // Force a reflow so the animation restarts cleanly on back-to-back big wins.
  void banner.offsetWidth;
  banner.classList.add("show");

  // Auto-clear slightly after the banner animation ends.
  clearTimeout(celebrationTimeoutId);
  celebrationTimeoutId = setTimeout(clearCelebration, 2200);
}

function clearCelebration() {
  celebrationInProgress = false;
  clearTimeout(celebrationTimeoutId);
  celebrationTimeoutId = null;
  document.getElementById("particles").innerHTML = "";
  const banner = document.getElementById("big-win-banner");
  banner.classList.remove("show");
  document.querySelector(".machine").classList.remove("shake");
}

// ---------- Dev tooling ----------

// Set by the dev panel (or the console helper) to guarantee the next spin
// lands 3 scatters and triggers the bonus. Dev-only, gated behind ?dev=1.
let forceBonusNext = false;

// Drop 3 scatters into the visible window on three different reels. Any
// ways wins on the same grid are left alone.
function rigGridForBonus(grid) {
  grid[0][1] = "scatter";
  grid[2][0] = "scatter";
  grid[4][2] = "scatter";
}

function setDevButtonArmed(armed) {
  const btn = document.getElementById("dev-force-bonus");
  if (!btn) return;
  btn.textContent = armed ? "Bonus Armed ✓" : "Force Bonus";
  btn.classList.toggle("armed", armed);
}

function setupDevPanel() {
  // Expose a console helper even without the URL flag — easier for anyone
  // poking around in devtools.
  window.forceBonus = () => {
    forceBonusNext = true;
    setDevButtonArmed(true);
    console.log("Bonus armed for the next spin.");
  };

  const hasDevFlag =
    /[?&]dev=1(&|$)/.test(location.search) || location.hash === "#dev";
  if (!hasDevFlag) return;

  const panel = document.getElementById("dev-panel");
  panel.hidden = false;
  document.getElementById("dev-force-bonus").addEventListener("click", () => {
    forceBonusNext = !forceBonusNext;
    setDevButtonArmed(forceBonusNext);
  });
}

// ---------- Bonus wheels ----------

const SVG_WHEEL_NS = "http://www.w3.org/2000/svg";

// Build the pie-slice SVG for a wheel. Slice 0 sits centered at the top
// (12 o'clock) where the pointer is, and slices proceed clockwise.
function renderWheel(svg, segments) {
  svg.innerHTML = "";
  const radius = 100;
  const n = segments.length;
  const sliceAngle = 360 / n;

  segments.forEach((seg, i) => {
    // Start at top (−90° in SVG coords), rotate clockwise.
    const startDeg = -90 + i * sliceAngle - sliceAngle / 2;
    const endDeg = startDeg + sliceAngle;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = Math.cos(startRad) * radius;
    const y1 = Math.sin(startRad) * radius;
    const x2 = Math.cos(endRad) * radius;
    const y2 = Math.sin(endRad) * radius;

    const path = document.createElementNS(SVG_WHEEL_NS, "path");
    path.setAttribute(
      "d",
      `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
    );
    path.setAttribute("class", `${seg.color} wheel-divider`);
    svg.appendChild(path);

    // Label sits out near the rim so 12 narrow slices each have room for
    // the digits. Just the number, no prefix — the wheel title says what
    // the number means.
    const midDeg = startDeg + sliceAngle / 2;
    const midRad = (midDeg * Math.PI) / 180;
    const textX = Math.cos(midRad) * radius * 0.72;
    const textY = Math.sin(midRad) * radius * 0.72;
    const text = document.createElementNS(SVG_WHEEL_NS, "text");
    text.setAttribute("x", textX.toFixed(2));
    text.setAttribute("y", textY.toFixed(2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    // Rotate each label so it reads radially outward (top-of-digit toward
    // the rim) — a classic prize-wheel look.
    text.setAttribute(
      "transform",
      `rotate(${(midDeg + 90).toFixed(2)} ${textX.toFixed(2)} ${textY.toFixed(2)})`,
    );
    text.setAttribute("class", "wheel-label");
    text.textContent = String(seg.value);
    svg.appendChild(text);
  });

  // Outer rim and center hub for a polished look.
  const rim = document.createElementNS(SVG_WHEEL_NS, "circle");
  rim.setAttribute("r", String(radius));
  rim.setAttribute("class", "wheel-rim");
  svg.appendChild(rim);
  const hub = document.createElementNS(SVG_WHEEL_NS, "circle");
  hub.setAttribute("r", "8");
  hub.setAttribute("class", "wheel-hub");
  svg.appendChild(hub);
}

// Each wheel spins to a chosen slice. Slice i's center sits at angle
// (i * sliceAngle) clockwise from top; rotating the wheel by -i*sliceAngle
// brings it back under the pointer. Several extra turns make the spin feel
// weighty and keep the landing position unpredictable.
function animateWheel(svg, segments, chosenIndex) {
  return new Promise((resolve) => {
    const n = segments.length;
    const sliceAngle = 360 / n;
    const fullTurns = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
    // A small random offset within the slice keeps the end position looking
    // natural (the pointer doesn't always land dead-center).
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.6;
    const target = fullTurns * 360 - chosenIndex * sliceAngle + jitter;

    svg.style.transition = "transform 3.6s cubic-bezier(0.1, 0.75, 0.2, 1)";
    // Force a reflow so the transition applies cleanly on repeat runs.
    void svg.offsetWidth;
    svg.style.transform = `rotate(${target}deg)`;

    const onEnd = () => {
      svg.removeEventListener("transitionend", onEnd);
      resolve();
    };
    svg.addEventListener("transitionend", onEnd);
  });
}

function resetWheel(svg) {
  // Snap back to 0 without animation so the next wheel starts fresh.
  svg.style.transition = "none";
  svg.style.transform = "rotate(0deg)";
  void svg.offsetWidth;
}

// Wait for a user tap on the wheel's "Spin" button.
function waitForTap(button) {
  return new Promise((resolve) => {
    const onClick = () => {
      button.removeEventListener("click", onClick);
      resolve();
    };
    button.addEventListener("click", onClick);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Show one wheel, have the player spin it, and resolve with the chosen
// segment. All segments are equally weighted — rebalance by repeating a
// value in CONFIG if you want weighting.
async function runSingleWheel(title, segments) {
  const overlay = document.getElementById("wheel-overlay");
  const svg = document.getElementById("wheel");
  const button = document.getElementById("wheel-button");
  const titleEl = document.getElementById("wheel-title");
  const resultEl = document.getElementById("wheel-result");

  titleEl.textContent = title;
  resetWheel(svg);
  renderWheel(svg, segments);
  resultEl.classList.remove("show");
  resultEl.textContent = "";
  button.disabled = false;
  button.textContent = "Spin";
  overlay.hidden = false;

  await waitForTap(button);
  button.disabled = true;

  const chosenIndex = Math.floor(Math.random() * segments.length);
  await animateWheel(svg, segments, chosenIndex);

  const chosen = segments[chosenIndex];
  resultEl.textContent = `× ${chosen.value}`;
  // Restart the pop animation cleanly.
  resultEl.classList.remove("show");
  void resultEl.offsetWidth;
  resultEl.classList.add("show");

  // Pause so the player can register the result before moving on.
  await wait(1400);
  return chosen.value;
}

async function runBonusWheels() {
  const multiplier = await runSingleWheel("Multiplier Wheel", CONFIG.multiplierWheel);
  await wait(200);
  const freeSpins = await runSingleWheel("Free Spins Wheel", CONFIG.freeSpinsWheel);
  await wait(250);
  document.getElementById("wheel-overlay").hidden = true;
  return { multiplier, freeSpins };
}

// ---------- Free-spins bonus round ----------

function showBonusBanner(title, sub) {
  const banner = document.getElementById("bonus-banner");
  document.getElementById("bonus-banner-title").textContent = title;
  document.getElementById("bonus-banner-sub").textContent = sub;
  banner.hidden = false;
  banner.classList.remove("show");
  // Force a reflow so the animation restarts on back-to-back banners.
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => {
    banner.classList.remove("show");
    banner.hidden = true;
  }, 2500);
}

function updateBonusIndicator() {
  document.getElementById("bonus-remaining").textContent = bonus.spinsRemaining;
  document.getElementById("bonus-total").textContent = bonus.spinsAwarded;
  document.getElementById("bonus-multiplier").textContent = bonus.multiplier;
  document.getElementById("bonus-total-win").textContent = formatCredits(bonus.totalWin);
}

function startFreeSpins(spinsAwarded, multiplier) {
  bonus.active = true;
  bonus.spinsAwarded = spinsAwarded;
  bonus.spinsRemaining = spinsAwarded;
  bonus.multiplier = multiplier;
  bonus.totalWin = 0;

  const indicator = document.getElementById("bonus-indicator");
  indicator.hidden = false;
  updateBonusIndicator();

  showBonusBanner(
    `${spinsAwarded} Free Spins`,
    `× ${multiplier} Multiplier`,
  );
  updateUI();
}

function endFreeSpins() {
  const totalWon = bonus.totalWin;
  bonus.active = false;
  bonus.spinsRemaining = 0;

  clearTimeout(autoAdvanceTimeoutId);
  autoAdvanceTimeoutId = null;

  document.getElementById("bonus-indicator").hidden = true;
  showBonusBanner("Bonus Win", `${formatCredits(totalWon)} credits`);
  updateUI();
  console.log(`Bonus ended. Total won: ${formatCredits(totalWon)} credits.`);
}

// "Buy Back In" — top up the balance to the starting amount. Always available
// per spec; no confirm dialog (the label is unambiguous and the action is
// reversible by playing it back down).
function buyBackIn() {
  if (spinInProgress) return;
  state.balance = CONFIG.startingBalance;
  state.lastWin = 0;
  saveBalance();
  clearWinHighlights();
  updateUI();
}

// ---------- Wire-up ----------

document.addEventListener("DOMContentLoaded", () => {
  renderGrid(spinAllReels());
  updateUI();
  setupDevPanel();

  document.getElementById("spin-button").addEventListener("click", handleSpinClick);
  document.getElementById("buy-back-in-button").addEventListener("click", buyBackIn);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStepper(btn.dataset.action));
  });
});
