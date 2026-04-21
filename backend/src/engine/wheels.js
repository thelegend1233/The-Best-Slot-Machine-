// Bonus wheels (12 slots each). Free-spin reels now carry 3 wilds per reel
// (vs 1 on base reels), so the per-spin win during bonus is higher. These
// wheel values are scaled down from the pre-wild version to keep total RTP
// near 93-94%. Run runMonteCarlo() in the browser console to verify.
//
// Multiplier wheel: ×3 (4/12), ×5 (4/12), ×8 (3/12), ×12 (1/12).
// Free-spins wheel: 8 (4/12), 10 (4/12), 12 (3/12), 15 (1/12).
//
// Avg multiplier ~5.25×. Avg free spins ~10.25. Product ~53.8.

export const MULTIPLIER_WHEEL = [
  { value:  3, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value:  3, color: "wheel-slice-c" },
  { value:  8, color: "wheel-slice-d" },
  { value:  5, color: "wheel-slice-e" },
  { value:  3, color: "wheel-slice-a" },
  { value:  5, color: "wheel-slice-b" },
  { value: 12, color: "wheel-slice-f" },
  { value:  3, color: "wheel-slice-c" },
  { value:  8, color: "wheel-slice-e" },
  { value:  5, color: "wheel-slice-d" },
  { value:  8, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
  { value:  8, color: "wheel-slice-a" },
  { value: 10, color: "wheel-slice-b" },
  { value:  8, color: "wheel-slice-c" },
  { value: 12, color: "wheel-slice-d" },
  { value: 10, color: "wheel-slice-e" },
  { value:  8, color: "wheel-slice-a" },
  { value: 10, color: "wheel-slice-b" },
  { value: 15, color: "wheel-slice-f" },
  { value:  8, color: "wheel-slice-c" },
  { value: 12, color: "wheel-slice-d" },
  { value: 10, color: "wheel-slice-e" },
  { value: 12, color: "wheel-slice-b" },
];
