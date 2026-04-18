// Norminton Casino — slot machine
// Build step 7: wilds substitute for regular symbols, scatters pay anywhere
// (and flag the bonus round for step 11). See Claude.md for the full spec.

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

  // 10 paylines using the common row-index pattern. Each entry is a list of
  // row indices per reel (0 = top row, 1 = middle, 2 = bottom).
  // Lines 1-3: straight rows. 4-5: V and inverted V. 6-10: zigzags.
  paylines: [
    [1, 1, 1, 1, 1], // 1: middle row
    [0, 0, 0, 0, 0], // 2: top row
    [2, 2, 2, 2, 2], // 3: bottom row
    [0, 1, 2, 1, 0], // 4: V
    [2, 1, 0, 1, 2], // 5: inverted V
    [0, 0, 1, 2, 2], // 6: down-step
    [2, 2, 1, 0, 0], // 7: up-step
    [1, 0, 0, 0, 1], // 8: small arch
    [1, 2, 2, 2, 1], // 9: small dip
    [0, 1, 0, 1, 0], // 10: zigzag top
  ],

  // Paytable: multiplier of line bet for 3, 4, 5 of a kind.
  // High symbols pay big but are rare; low symbols pay small but hit often.
  // Scatter entry is "anywhere-pays" multiplier of TOTAL bet (used in step 7).
  // Wild has no entry — it substitutes for other symbols (also step 7).
  paytable: {
    wolf:     [20, 100, 500],
    bear:     [15,  60, 300],
    deer:     [10,  40, 150],
    fox:      [ 5,  20,  75],
    rabbit:   [ 3,  10,  40],
    mushroom: [ 2,   8,  25],
    acorn:    [ 1,   5,  15],
    leaf:     [ 1,   4,  10],
    scatter:  [ 2,  10,  50], // paid on total bet, not line bet
  },

  // Betting options
  lineBetOptions: [0.25, 0.5, 1, 2, 5],
  minLines: 1,
  maxLines: 10,
  startingBalance: 1000,

  // Animation tuning
  spinBaseDurationMs: 700,     // reel 0 spins this long
  spinStaggerMs: 150,          // each later reel spins this much longer
  spinPaddingSymbols: 20,      // random symbols shown before the landing 3
  spinOvershootPx: 6,          // how far past rest the reel briefly drops
  spinBounceBackMs: 200,       // time for the reel to settle back from overshoot
};

// Distinct colors per payline so overlapping wins stay legible.
const PAYLINE_COLORS = [
  "#f2c56a", "#ff6b78", "#8bd1ff", "#76e5b1", "#c58eff",
  "#ffaa66", "#ffd966", "#ff9aa2", "#9eebff", "#d4ff82",
];

// ---------- Game state ----------

const state = {
  balance: CONFIG.startingBalance,
  lineBetIndex: 2,   // index into CONFIG.lineBetOptions → 1.00
  activeLines: 10,
  lastWin: 0,
};

function currentLineBet() {
  return CONFIG.lineBetOptions[state.lineBetIndex];
}

function currentTotalBet() {
  return currentLineBet() * state.activeLines;
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

// Evaluate a single payline left-to-right. Wilds substitute for any regular
// symbol; scatters never match on a line. A pure run of leading wilds pays as
// wolf (the highest-paying symbol). Returns a win object or null.
function evaluatePayline(grid, payline, lineBet, lineNumber) {
  const lineSymbols = payline.map((row, reel) => grid[reel][row]);

  // Find the "base" symbol — the first non-wild, non-scatter symbol in the
  // line. A scatter in the lead halts the search (scatter never participates
  // in line wins). If every leading position is wild, baseSymbol stays null
  // and the run pays as wolf.
  let baseSymbol = null;
  for (const s of lineSymbols) {
    if (s === "scatter") break;
    if (s === "wild") continue;
    baseSymbol = s;
    break;
  }

  // Count the run from the left: wild is always in the run; baseSymbol
  // extends it; anything else (including scatter) breaks it.
  let runLength = 0;
  for (const s of lineSymbols) {
    if (s === "wild") { runLength++; continue; }
    if (baseSymbol !== null && s === baseSymbol) { runLength++; continue; }
    break;
  }

  if (runLength < 3) return null;

  // All-wild line: pay as the highest symbol (wolf). Spec: "Wilds pay as the
  // highest symbol they complete."
  const paySymbol = baseSymbol ?? "wolf";
  const paytableEntry = CONFIG.paytable[paySymbol];
  if (!paytableEntry) return null;

  const multiplier = paytableEntry[runLength - 3];
  return {
    line: lineNumber,
    symbol: paySymbol,
    count: runLength,
    win: lineBet * multiplier,
  };
}

// Locate every scatter symbol on the grid. Scatters pay from anywhere, not on
// a payline, so we need their positions independent of the paylines.
function findScatterCells(grid) {
  const cells = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === "scatter") cells.push([reel, row]);
    }
  }
  return cells;
}

// Evaluate every active payline plus the scatter anywhere-pay. Returns total
// win, per-line hits, scatter metadata, and whether the bonus was triggered
// (bonus round itself lands in step 11).
function evaluateSpin(grid, lineBet, activeLines) {
  const hits = [];
  let totalWin = 0;

  for (let i = 0; i < activeLines; i++) {
    const hit = evaluatePayline(grid, CONFIG.paylines[i], lineBet, i + 1);
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
    const totalBet = lineBet * activeLines;
    // Cap at the 5-of-a-kind payout even if more than 5 scatters land.
    const index = Math.min(scatterCount, 5) - 3;
    scatterWin = totalBet * CONFIG.paytable.scatter[index];
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

const SVG_NS = "http://www.w3.org/2000/svg";

function clearWinHighlights() {
  const overlay = document.getElementById("paylines-overlay");
  overlay.innerHTML = "";
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

// For each winning payline, highlight the contributing cells and draw a
// colored line through them. Scatter hits also light up their cells but don't
// get a polyline — scatters aren't on a payline.
function drawWinningLines(result) {
  const overlay = document.getElementById("paylines-overlay");
  const hasAnyHighlight = result.hits.length > 0 || result.scatterCount >= 3;
  if (!hasAnyHighlight) return;

  const overlayRect = overlay.getBoundingClientRect();
  overlay.setAttribute("viewBox", `0 0 ${overlayRect.width} ${overlayRect.height}`);

  result.hits.forEach((hit) => {
    const payline = CONFIG.paylines[hit.line - 1];
    const color = PAYLINE_COLORS[(hit.line - 1) % PAYLINE_COLORS.length];

    // Only draw through reels that actually matched (count columns from left).
    const points = [];
    for (let reel = 0; reel < hit.count; reel++) {
      const cell = cellElement(reel, payline[reel]);
      cell.classList.add("cell-win");
      const rect = cell.getBoundingClientRect();
      const cx = rect.left - overlayRect.left + rect.width / 2;
      const cy = rect.top - overlayRect.top + rect.height / 2;
      points.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
    }

    const line = document.createElementNS(SVG_NS, "polyline");
    line.setAttribute("points", points.join(" "));
    line.setAttribute("stroke", color);
    line.setAttribute("color", color); // used by drop-shadow(currentColor)
    line.classList.add("payline-draw");
    overlay.appendChild(line);

    // Set dasharray to the actual polyline length so reveal covers it exactly.
    const length = line.getTotalLength();
    line.style.setProperty("--dash-length", length);
  });

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
  document.getElementById("line-bet").textContent = formatCredits(currentLineBet());
  document.getElementById("active-lines").textContent = state.activeLines;
  document.getElementById("total-bet").textContent = formatCredits(currentTotalBet());

  // Disable spin when the player can't afford the current total bet.
  // Stays enabled during a spin so a second tap can skip the animation.
  const spinButton = document.getElementById("spin-button");
  spinButton.disabled = !spinInProgress && state.balance < currentTotalBet();

  // Disable stepper extremes so the player can't push past bounds.
  document.querySelector('[data-action="bet-down"]').disabled =
    state.lineBetIndex <= 0;
  document.querySelector('[data-action="bet-up"]').disabled =
    state.lineBetIndex >= CONFIG.lineBetOptions.length - 1;
  document.querySelector('[data-action="lines-down"]').disabled =
    state.activeLines <= CONFIG.minLines;
  document.querySelector('[data-action="lines-up"]').disabled =
    state.activeLines >= CONFIG.maxLines;
}

function handleStepper(action) {
  if (action === "bet-up" && state.lineBetIndex < CONFIG.lineBetOptions.length - 1) {
    state.lineBetIndex++;
  } else if (action === "bet-down" && state.lineBetIndex > 0) {
    state.lineBetIndex--;
  } else if (action === "lines-up" && state.activeLines < CONFIG.maxLines) {
    state.activeLines++;
  } else if (action === "lines-down" && state.activeLines > CONFIG.minLines) {
    state.activeLines--;
  }
  updateUI();
}

async function performSpin() {
  if (spinInProgress) return;

  const bet = currentTotalBet();
  if (state.balance < bet) return;

  clearWinHighlights();

  state.balance -= bet;
  state.lastWin = 0;
  updateUI();

  // Decide the outcome before the animation so evaluation and display stay
  // in sync even if the animation is skipped.
  const grid = spinAllReels();
  const result = evaluateSpin(grid, currentLineBet(), state.activeLines);

  spinInProgress = true;
  await animateReels(grid);
  spinInProgress = false;

  state.lastWin = result.totalWin;
  state.balance += result.totalWin;
  updateUI();

  if (result.totalWin > 0) {
    console.log(
      `Win: ${formatCredits(result.totalWin)} credits`,
      { hits: result.hits, scatters: result.scatterCount, scatterWin: result.scatterWin },
    );
    drawWinningLines(result);
    pulseWinDisplay();
  } else {
    console.log("No win");
  }

  // Bonus detection is ready here; the actual free-spins round is step 11.
  if (result.bonusTriggered) {
    console.log(`Bonus triggered! ${result.scatterCount} scatters — free spins land in step 11.`);
  }
}

// A tap mid-spin skips the animation; otherwise starts a new spin.
function handleSpinClick() {
  if (spinInProgress) {
    skipActiveSpin();
    return;
  }
  performSpin();
}

// ---------- Wire-up ----------

document.addEventListener("DOMContentLoaded", () => {
  renderGrid(spinAllReels());
  updateUI();

  document.getElementById("spin-button").addEventListener("click", handleSpinClick);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStepper(btn.dataset.action));
  });
});
