// Ported verbatim from the Phase 1 client so client and server compute
// identical outcomes. Tuned for ~93% total RTP with the current reel
// strips and bonus wheels (see Phase 1 Monte Carlo in game.js).

export const PAYTABLE = {
  wolf:     [2,  9, 30],
  bear:     [1,  4, 12],
  deer:     [0,  2,  7],
  fox:      [0,  1,  4],
  rabbit:   [0,  0,  2],
  mushroom: [0,  0,  1],
  acorn:    [0,  0,  1],
  leaf:     [0,  0,  1],
  scatter:  [1,  3, 12], // paid on bet, anywhere on the grid
};

// Regular (non-wild, non-scatter) symbols evaluated for ways wins. Order
// doesn't affect payouts — each symbol is checked independently.
export const PAY_SYMBOLS = [
  "leaf", "acorn", "mushroom", "rabbit",
  "fox",  "deer",  "bear",     "wolf",
];
