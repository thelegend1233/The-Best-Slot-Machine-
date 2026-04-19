// Norminton Casino — slot machine
// Mechanic: 243 ways pays. Any 3+ matching symbols left-to-right, one per
// column, regardless of row. Wilds substitute. Wins highlight every
// contributing cell; no payline polylines. See Claude.md for the full spec.

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

  // Paytable: multiplier of bet for 3 / 4 / 5 of a kind. Tuned via 2M-spin
  // Monte Carlo to ~93% RTP with ~23% hit frequency. Low symbols (leaf,
  // acorn, mushroom) only pay on 4 or 5 of a kind so the game doesn't flood
  // the player with 1x-bet hits. Leaf is decorative only — it never pays on
  // its own (still substitutes via wild bridges).
  // Scatter entry is "anywhere-pays" multiplier of bet.
  // Wild has no entry — it substitutes for other symbols.
  paytable: {
    wolf:     [3, 18, 90],
    bear:     [2,  9, 35],
    deer:     [0,  5, 22],
    fox:      [0,  3, 12],
    rabbit:   [0,  1,  5],
    mushroom: [0,  0,  3],
    acorn:    [0,  0,  1],
    leaf:     [0,  0,  0],
    scatter:  [2, 10, 50], // paid on bet, anywhere on the grid
  },

  // Betting options
  betOptions: [0.25, 0.5, 1, 2, 5],
  startingBalance: 1000,
  waysCount: 243,
  // Regular (non-wild, non-scatter) symbols evaluated for ways wins.
  paySymbols: ["leaf", "acorn", "mushroom", "rabbit", "fox", "deer", "bear", "wolf"],

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

  // Disable spin when the player can't afford the current bet.
  // Stays enabled during a spin so a second tap can skip the animation.
  const spinButton = document.getElementById("spin-button");
  spinButton.disabled = !spinInProgress && state.balance < currentBet();

  // Disable stepper extremes so the player can't push past bounds.
  document.querySelector('[data-action="bet-down"]').disabled =
    state.betIndex <= 0;
  document.querySelector('[data-action="bet-up"]').disabled =
    state.betIndex >= CONFIG.betOptions.length - 1;
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

  const bet = currentBet();
  if (state.balance < bet) return;

  clearWinHighlights();

  state.balance -= bet;
  state.lastWin = 0;
  saveBalance();
  updateUI();

  // Decide the outcome before the animation so evaluation and display stay
  // in sync even if the animation is skipped.
  const grid = spinAllReels();
  const result = evaluateSpin(grid, bet);

  spinInProgress = true;
  await animateReels(grid);
  spinInProgress = false;

  state.lastWin = result.totalWin;
  state.balance += result.totalWin;
  saveBalance();
  updateUI();

  if (result.totalWin > 0) {
    console.log(
      `Win: ${formatCredits(result.totalWin)} credits`,
      { hits: result.hits, scatters: result.scatterCount, scatterWin: result.scatterWin },
    );
    drawWinHighlights(result);
    pulseWinDisplay();
    if (isBigWin(result.totalWin, bet)) {
      runBigWinCelebration();
    }
  } else {
    console.log("No win");
  }

  // Bonus detection is ready here; the actual free-spins round is step 11.
  if (result.bonusTriggered) {
    console.log(`Bonus triggered! ${result.scatterCount} scatters — free spins land in step 11.`);
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

  document.getElementById("spin-button").addEventListener("click", handleSpinClick);
  document.getElementById("buy-back-in-button").addEventListener("click", buyBackIn);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStepper(btn.dataset.action));
  });
});
