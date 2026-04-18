// Norminton Casino — slot machine
// Build step 4: win amount and balance shown in UI; bet controls work.
// Wilds / scatters are not yet special — they evaluate as their own symbol.
// Step 7 will introduce wild substitution and scatter anywhere-pays.

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
};

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

// Evaluate a single payline left-to-right. Returns a win object if the leading
// symbol hits 3+ in a row and has a paytable entry, otherwise null.
// Step 3 does NOT substitute wilds or treat scatters specially — that's step 7.
function evaluatePayline(grid, payline, lineBet, lineNumber) {
  const symbolsOnLine = payline.map((row, reel) => grid[reel][row]);
  const leadSymbol = symbolsOnLine[0];

  let runLength = 1;
  for (let reel = 1; reel < symbolsOnLine.length; reel++) {
    if (symbolsOnLine[reel] === leadSymbol) runLength++;
    else break;
  }

  if (runLength < 3) return null;

  const paytableEntry = CONFIG.paytable[leadSymbol];
  // Scatters aren't paid on paylines (anywhere-pays comes in step 7), and
  // wilds have no direct paytable entry.
  if (!paytableEntry || leadSymbol === "scatter") return null;

  const multiplier = paytableEntry[runLength - 3];
  const winAmount = lineBet * multiplier;

  return {
    line: lineNumber,
    symbol: leadSymbol,
    count: runLength,
    win: winAmount,
  };
}

// Evaluate all active paylines on the grid and return total win + a breakdown.
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

  return { totalWin, hits };
}

// ---------- Rendering ----------

function renderGrid(grid) {
  const reels = document.querySelectorAll(".reel");
  reels.forEach((reelEl, reelIndex) => {
    const cells = reelEl.querySelectorAll(".cell");
    cells.forEach((cellEl, rowIndex) => {
      const symbolName = grid[reelIndex][rowIndex];
      cellEl.textContent = SYMBOLS[symbolName];
    });
  });
}

// ---------- UI updates ----------

function updateUI() {
  document.getElementById("balance").textContent = formatCredits(state.balance);
  document.getElementById("win").textContent = formatCredits(state.lastWin);
  document.getElementById("line-bet").textContent = formatCredits(currentLineBet());
  document.getElementById("active-lines").textContent = state.activeLines;
  document.getElementById("total-bet").textContent = formatCredits(currentTotalBet());

  // Disable spin when the player can't afford the current total bet.
  const spinButton = document.getElementById("spin-button");
  spinButton.disabled = state.balance < currentTotalBet();

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

function performSpin() {
  const bet = currentTotalBet();
  if (state.balance < bet) return;

  state.balance -= bet;
  state.lastWin = 0;
  updateUI();

  const grid = spinAllReels();
  renderGrid(grid);

  const result = evaluateSpin(grid, currentLineBet(), state.activeLines);
  state.lastWin = result.totalWin;
  state.balance += result.totalWin;

  if (result.totalWin > 0) {
    console.log(`Win: ${formatCredits(result.totalWin)} credits`, result.hits);
  } else {
    console.log("No win");
  }

  updateUI();
}

// ---------- Wire-up ----------

document.addEventListener("DOMContentLoaded", () => {
  renderGrid(spinAllReels());
  updateUI();

  document.getElementById("spin-button").addEventListener("click", performSpin);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStepper(btn.dataset.action));
  });
});
