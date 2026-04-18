// Wildwood Spins — slot machine
// Build step 1: static 5x3 grid of emoji symbols. Spin button does nothing yet.

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

// Static placeholder layout for step 1. Columns are reels (0..4), rows 0..2.
const INITIAL_GRID = [
  ["fox",    "rabbit", "leaf"    ],
  ["acorn",  "deer",   "mushroom"],
  ["bear",   "wolf",   "fox"     ],
  ["leaf",   "rabbit", "wild"    ],
  ["scatter","acorn",  "deer"    ],
];

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
  renderGrid(INITIAL_GRID);

  // Spin button is a no-op in step 1. Wiring comes in step 2.
  const spinButton = document.getElementById("spin-button");
  spinButton.addEventListener("click", () => {
    // intentionally empty for step 1
  });
});
