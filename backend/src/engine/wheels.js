// Bonus wheels (12 slots each). Ported from the Phase 1 client. Weights
// are encoded as repeated values in the array, so an unbiased uniform
// pick from the array produces the intended distribution.
//
// Multiplier wheel: x3 (4/12), x5 (4/12), x10 (3/12), x20 (1/12).
// Free-spins wheel: 10 (4/12), 15 (4/12), 20 (3/12), 25 (1/12).
//
// Avg multiplier ~6.8x. Avg free spins ~15.4.
// Minimum floor: 10 spins × x3 so even the worst-case bonus feels meaningful.

export const MULTIPLIER_WHEEL = [
  { value:  3, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value:  3, color: "wheel-slice-c" },
  { value: 10, color: "wheel-slice-d" },
  { value:  5, color: "wheel-slice-e" },
  { value:  3, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value: 20, color: "wheel-slice-f" },
  { value:  3, color: "wheel-slice-c" },
  { value: 10, color: "wheel-slice-e" },
  { value:  5, color: "wheel-slice-d" },
  { value: 10, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
  { value: 10, color: "wheel-slice-a" },
  { value: 15, color: "wheel-slice-b" },
  { value: 10, color: "wheel-slice-c" },
  { value: 20, color: "wheel-slice-d" },
  { value: 15, color: "wheel-slice-e" },
  { value: 10, color: "wheel-slice-a" },
  { value: 15, color: "wheel-slice-b" },
  { value: 25, color: "wheel-slice-f" },
  { value: 10, color: "wheel-slice-c" },
  { value: 20, color: "wheel-slice-d" },
  { value: 15, color: "wheel-slice-e" },
  { value: 20, color: "wheel-slice-b" },
];
