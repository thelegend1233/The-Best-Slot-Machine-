// Pure 243-ways evaluator. Must produce byte-for-byte identical wins to
// the Phase 1 client evaluator in game.js so players can't see a
// different outcome on-screen than the server recorded in the ledger.
//
// For every paying symbol:
//   1. Find each reel's match positions — the symbol itself or a wild
//      (wilds substitute for any paying symbol, not for scatter).
//   2. Run-length: leading reels with at least one match.
//   3. If length >= 3 and the paytable multiplier is non-zero, win =
//      bet * multiplier * ways, where ways = product of per-reel match
//      counts. Wilds count toward every symbol's ways, so a single wild
//      can drive multiple symbol wins on the same grid.
//
// Scatter is paid "anywhere": 3+ scatter symbols on the 5x3 grid pay
// their multiplier times the bet AND flag the bonus round.

import { PAYTABLE, PAY_SYMBOLS } from "./paytable.js";

export function evaluateWaysForSymbol(grid, symbol, bet) {
  const matchingRows = grid.map((reel) => {
    const rows = [];
    for (let row = 0; row < reel.length; row++) {
      const s = reel[row];
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

  const paytableEntry = PAYTABLE[symbol];
  if (!paytableEntry) return null;

  const multiplier = paytableEntry[runLength - 3];
  if (!multiplier) return null;

  let ways = 1;
  for (let r = 0; r < runLength; r++) ways *= matchingRows[r].length;

  const win = bet * multiplier * ways;

  const cells = [];
  for (let r = 0; r < runLength; r++) {
    for (const row of matchingRows[r]) cells.push([r, row]);
  }

  return { symbol, count: runLength, ways, win, cells };
}

export function findScatterCells(grid) {
  const cells = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === "scatter") cells.push([reel, row]);
    }
  }
  return cells;
}

export function evaluateSpin(grid, bet) {
  const hits = [];
  let totalWin = 0;

  for (const symbol of PAY_SYMBOLS) {
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
    scatterWin = bet * PAYTABLE.scatter[index];
    totalWin += scatterWin;
    bonusTriggered = true;
  }

  return {
    totalWin,
    hits,
    scatterCells,
    scatterCount,
    scatterWin,
    bonusTriggered,
  };
}
