// Reel spinning, decoupled from Math.random so it's reproducible from a
// seed. Given a random function r() returning floats in [0, 1), picks a
// starting index on each strip and returns the three visible symbols.

import { REELS } from "./reels.js";

export function spinReel(strip, random) {
  const start = Math.floor(random() * strip.length);
  return [
    strip[start],
    strip[(start + 1) % strip.length],
    strip[(start + 2) % strip.length],
  ];
}

export function spinAllReels(random, reels = REELS) {
  return reels.map((strip) => spinReel(strip, random));
}
