// Bonus wheels (12 slots each). Free-spin reels carry 3 wilds per reel
// (vs 1 on base reels), so the per-spin win during bonus is much higher.
// Wheel values calibrated against runMonteCarlo() to land at ~94% total RTP.
//
// Multiplier wheel: ×2 (4/12), ×3 (4/12), ×4 (3/12), ×8 (1/12) → avg 3.33×
// Free-spins wheel: 6 (4/12), 8 (4/12), 10 (3/12), 15 (1/12)  → avg 8.42

export const MULTIPLIER_WHEEL = [
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  2, color: "wheel-slice-c" },
  { value:  4, color: "wheel-slice-d" },
  { value:  3, color: "wheel-slice-e" },
  { value:  2, color: "wheel-slice-a" },
  { value:  3, color: "wheel-slice-b" },
  { value:  8, color: "wheel-slice-f" },
  { value:  2, color: "wheel-slice-c" },
  { value:  4, color: "wheel-slice-e" },
  { value:  3, color: "wheel-slice-d" },
  { value:  4, color: "wheel-slice-b" },
];

export const FREE_SPINS_WHEEL = [
  { value:  6, color: "wheel-slice-a" },
  { value:  8, color: "wheel-slice-b" },
  { value:  6, color: "wheel-slice-c" },
  { value: 10, color: "wheel-slice-d" },
  { value:  8, color: "wheel-slice-e" },
  { value:  6, color: "wheel-slice-a" },
  { value:  8, color: "wheel-slice-b" },
  { value: 15, color: "wheel-slice-f" },
  { value:  6, color: "wheel-slice-c" },
  { value: 10, color: "wheel-slice-d" },
  { value:  8, color: "wheel-slice-e" },
  { value: 10, color: "wheel-slice-b" },
];
