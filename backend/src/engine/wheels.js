// Bonus wheels (12 slots each). Ported from the Phase 1 client. Weights
// are encoded as repeated values in the array, so an unbiased uniform
// pick from the array produces the intended distribution.
//
// Multiplier wheel: x2 (6/12), x3 (3/12), x5 (2/12), x10 (1/12).
// Free-spins wheel: 5 (2/12), 8 (3/12), 10 (3/12), 15 (2/12), 20 (1/12), 25 (1/12).
//
// Avg multiplier ~3.4x (was 2.9x). Avg free spins ~11.6 (was 9.9).
// Run runMonteCarlo() in the client to verify total RTP after changes.

export const MULTIPLIER_WHEEL = [
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  2, color: "wheel-slice-c" },
  { value:  5, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-a" },
  { value:  2, color: "wheel-slice-b" },
  { value: 10, color: "wheel-slice-f" },
  { value:  2, color: "wheel-slice-c" },
  { value:  5, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
  { value:  8, color: "wheel-slice-a" },
  { value: 10, color: "wheel-slice-b" },
  { value:  8, color: "wheel-slice-c" },
  { value:  5, color: "wheel-slice-d" },
  { value: 15, color: "wheel-slice-e" },
  { value:  8, color: "wheel-slice-a" },
  { value: 10, color: "wheel-slice-b" },
  { value: 20, color: "wheel-slice-f" },
  { value:  5, color: "wheel-slice-c" },
  { value: 10, color: "wheel-slice-d" },
  { value: 25, color: "wheel-slice-f" },
  { value: 15, color: "wheel-slice-e" },
];
