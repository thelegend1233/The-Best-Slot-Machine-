// Norminton Casino — slot machine
// Build step 2: reel strips defined; Spin randomizes displayed symbols.

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
// Reel strips are weighted: low-value symbols appear more often than high-value
// ones so the game can target ~95% RTP. Exact weights will be tuned in step 13
// (Monte Carlo). Each reel is intentionally a little different so the same
// symbol pattern doesn't repeat column-to-column.
const CONFIG = {
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
};

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

document.addEventListener("DOMContentLoaded", () => {
  // Show an initial random grid so the machine doesn't look blank on load.
  renderGrid(spinAllReels());

  const spinButton = document.getElementById("spin-button");
  spinButton.addEventListener("click", () => {
    renderGrid(spinAllReels());
  });
});
