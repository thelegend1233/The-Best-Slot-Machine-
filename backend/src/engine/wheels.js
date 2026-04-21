// Bonus wheels (12 slots each). Free-spin reels carry 3 wilds per reel
// (vs 1 on base reels). Empirically per-free-spin RTP is ~1.48× bet, so the
// wheel product is set to ~15.6 to keep total RTP near 93-94%.
//
// Multiplier wheel: ×2 (5/12), ×3 (5/12), ×4 (1/12), ×5 (1/12) → avg 2.83×
// Free-spins wheel: 4 (3/12), 5 (5/12), 7 (3/12), 8 (1/12)    → avg 5.5

export const MULTIPLIER_WHEEL = [
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  2, color: "wheel-slice-c" },
  { value:  4, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  5, color: "wheel-slice-f" },
  { value:  2, color: "wheel-slice-c" },
  { value:  3, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
  { value:  4, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value:  4, color: "wheel-slice-c" },
  { value:  7, color: "wheel-slice-d" },
  { value:  5, color: "wheel-slice-e" },
  { value:  4, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value:  8, color: "wheel-slice-f" },
  { value:  5, color: "wheel-slice-c" },
  { value:  7, color: "wheel-slice-d" },
  { value:  5, color: "wheel-slice-e" },
  { value:  7, color: "wheel-slice-b" },
];
