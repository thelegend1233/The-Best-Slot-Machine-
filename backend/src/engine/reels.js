// Reel strips. Ported verbatim from the Phase 1 client (game.js) so the
// server evaluator produces identical results given the same grid. Reels 1,
// 2, and 3 carry two scatters each to keep the ~1 / 50 bonus trigger rate
// tuned in Phase 1.

export const REELS = [
  // reel 0 — 1 scatter
  [
    "leaf","acorn","mushroom","rabbit","leaf","fox","acorn","leaf",
    "rabbit","mushroom","deer","leaf","acorn","wild","mushroom","fox",
    "leaf","rabbit","acorn","bear","leaf","mushroom","fox","acorn",
    "scatter","rabbit","leaf","deer","mushroom","acorn","wolf","leaf",
    "fox","rabbit","leaf",
  ],
  // reel 1 — 2 scatters
  [
    "acorn","leaf","rabbit","mushroom","acorn","fox","leaf","rabbit",
    "scatter","deer","mushroom","leaf","wild","acorn","rabbit","fox",
    "leaf","mushroom","acorn","bear","rabbit","leaf","fox","mushroom",
    "acorn","scatter","leaf","deer","rabbit","acorn","mushroom","leaf",
    "fox","acorn","rabbit",
  ],
  // reel 2 — 2 scatters
  [
    "mushroom","leaf","acorn","rabbit","leaf","mushroom","fox","acorn",
    "scatter","rabbit","deer","mushroom","acorn","wild","leaf","rabbit",
    "fox","mushroom","acorn","leaf","wolf","rabbit","mushroom","leaf",
    "acorn","fox","scatter","leaf","bear","mushroom","rabbit","acorn",
    "leaf","fox","mushroom",
  ],
  // reel 3 — 2 scatters
  [
    "leaf","rabbit","acorn","mushroom","leaf","acorn","fox","rabbit",
    "scatter","mushroom","acorn","deer","rabbit","leaf","wild","mushroom",
    "acorn","fox","leaf","rabbit","mushroom","bear","acorn","leaf",
    "fox","rabbit","mushroom","scatter","acorn","leaf","deer","rabbit",
    "mushroom","fox","acorn",
  ],
  // reel 4 — 1 scatter
  [
    "leaf","acorn","rabbit","mushroom","leaf","fox","acorn","rabbit",
    "leaf","mushroom","acorn","deer","leaf","rabbit","mushroom","wild",
    "acorn","leaf","fox","rabbit","mushroom","acorn","leaf","bear",
    "rabbit","fox","mushroom","acorn","leaf","scatter","rabbit","wolf",
    "leaf","mushroom","acorn",
  ],
];

// Free-spin reel strips — identical to REELS but with 3 wilds per reel
// instead of 1. Extra wilds replace leaf/acorn symbols spread across each
// strip so no single cluster forms.
export const FREE_SPIN_REELS = [
  // reel 0 — 3 wilds (idx 4, 13, 29 → was leaf/wild/acorn)
  [
    "leaf","acorn","mushroom","rabbit","wild","fox","acorn","leaf",
    "rabbit","mushroom","deer","leaf","acorn","wild","mushroom","fox",
    "leaf","rabbit","acorn","bear","leaf","mushroom","fox","acorn",
    "scatter","rabbit","leaf","deer","mushroom","wild","wolf","leaf",
    "fox","rabbit","leaf",
  ],
  // reel 1 — 3 wilds (idx 0, 12, 30 → was acorn/wild/mushroom)
  [
    "wild","leaf","rabbit","mushroom","acorn","fox","leaf","rabbit",
    "scatter","deer","mushroom","leaf","wild","acorn","rabbit","fox",
    "leaf","mushroom","acorn","bear","rabbit","leaf","fox","mushroom",
    "acorn","scatter","leaf","deer","rabbit","acorn","wild","leaf",
    "fox","acorn","rabbit",
  ],
  // reel 2 — 3 wilds (idx 1, 13, 23 → was leaf/wild/leaf)
  [
    "mushroom","wild","acorn","rabbit","leaf","mushroom","fox","acorn",
    "scatter","rabbit","deer","mushroom","acorn","wild","leaf","rabbit",
    "fox","mushroom","acorn","leaf","wolf","rabbit","mushroom","wild",
    "acorn","fox","scatter","leaf","bear","mushroom","rabbit","acorn",
    "leaf","fox","mushroom",
  ],
  // reel 3 — 3 wilds (idx 0, 14, 34 → was leaf/wild/acorn)
  [
    "wild","rabbit","acorn","mushroom","leaf","acorn","fox","rabbit",
    "scatter","mushroom","acorn","deer","rabbit","leaf","wild","mushroom",
    "acorn","fox","leaf","rabbit","mushroom","bear","acorn","leaf",
    "fox","rabbit","mushroom","scatter","acorn","leaf","deer","rabbit",
    "mushroom","fox","wild",
  ],
  // reel 4 — 3 wilds (idx 0, 4, 15 → was leaf/leaf/wild)
  [
    "wild","acorn","rabbit","mushroom","wild","fox","acorn","rabbit",
    "leaf","mushroom","acorn","deer","leaf","rabbit","mushroom","wild",
    "acorn","leaf","fox","rabbit","mushroom","acorn","leaf","bear",
    "rabbit","fox","mushroom","acorn","leaf","scatter","rabbit","wolf",
    "leaf","mushroom","acorn",
  ],
];
