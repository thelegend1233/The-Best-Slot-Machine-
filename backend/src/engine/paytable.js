// Ported verbatim from the Phase 1 client so client and server compute
// identical outcomes. Tuned for ~93% total RTP with the current reel
// strips and bonus wheels (see Phase 1 Monte Carlo in game.js).

export const PAYTABLE = {
  wolf:     [1,  7, 25],
  bear:     [0,  3,  9],
  deer:     [0,  1,  5],
  fox:      [0,  0,  3],
  rabbit:   [0,  0,  1],
  mushroom: [0,  0,  1],
  acorn:    [0,  0,  1],
  leaf:     [0,  0,  1],
  scatter:  [0,  2, 10], // paid on bet, anywhere on the grid
};

// Regular (non-wild, non-scatter) symbols evaluated for ways wins. Order
// doesn't affect payouts — each symbol is checked independently.
export const PAY_SYMBOLS = [
  "leaf", "acorn", "mushroom", "rabbit",
  "fox",  "deer",  "bear",     "wolf",
];
