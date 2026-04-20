// Bonus wheels (12 slots each). Ported from the Phase 1 client. Weights
// are encoded as repeated values in the array, so an unbiased uniform
// pick from the array produces the intended distribution.
//
// Multiplier wheel: x2 (8/12), x3 (3/12), x10 (1/12 jackpot).
// Free-spins wheel: 5 (3/12), 8 (3/12), 10 (3/12), 15 (2/12), 20 (1/12).
//
// Average combined bonus per trigger ~17x bet (median 12x, p99 ~110x).

export const MULTIPLIER_WHEEL = [
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  2, color: "wheel-slice-c" },
  { value:  2, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-a" },
  { value:  2, color: "wheel-slice-b" },
  { value: 10, color: "wheel-slice-f" },
  { value:  2, color: "wheel-slice-c" },
  { value:  2, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
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
];
