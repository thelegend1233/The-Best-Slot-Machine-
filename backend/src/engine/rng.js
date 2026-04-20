// RNG primitives shared by the Worker runtime and the Node test runner.
// Two things live here:
//
//   1. A seedable 32-bit PRNG (mulberry32). Same seed produces the same
//      sequence on any platform, so a server outcome can be recomputed and
//      verified later from the seed alone.
//
//   2. Commit-reveal helpers. Before spinning, the server picks 32 random
//      bytes (the "preimage"), hashes it with SHA-256, and commits the hash
//      to the player. The PRNG seed is derived from the preimage. Once the
//      spin resolves, the server reveals the preimage so anyone can
//      recompute the hash + rerun the PRNG + re-run the evaluator and
//      confirm the result was not altered after the fact.
//
// Web Crypto (globalThis.crypto / crypto.subtle) is available on both the
// Workers runtime and Node >= 20, so no environment-specific imports.

const HEX = "0123456789abcdef";

export function randomPreimage() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf;
}

export function bytesToHex(bytes) {
  let out = "";
  for (const b of bytes) out += HEX[b >>> 4] + HEX[b & 0xf];
  return out;
}

export function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error("odd-length hex string");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

// Fold 4 bytes of the preimage into a 32-bit seed. Any deterministic
// mapping works; this one just uses the first word.
export function seedFromPreimage(preimage) {
  if (preimage.length < 4) throw new Error("preimage must be at least 4 bytes");
  return (
    ((preimage[0] << 24) |
     (preimage[1] << 16) |
     (preimage[2] << 8)  |
      preimage[3]) >>> 0
  );
}

// mulberry32 — tiny, fast, good enough for a slot machine. Not
// cryptographically secure, but we're not trying to hide the seed; the
// preimage is revealed after the spin.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: derive a seeded random function directly from a preimage
// (or from its hex encoding, whichever the caller has handy).
export function rngFromPreimage(preimage) {
  const bytes = typeof preimage === "string" ? hexToBytes(preimage) : preimage;
  return mulberry32(seedFromPreimage(bytes));
}

// Full commit + reveal bundle. `commit` is what the server sends the
// client before evaluating; `reveal` (preimage hex) is sent afterwards.
export async function newCommit() {
  const preimage = randomPreimage();
  const preimageHex = bytesToHex(preimage);
  const commitHex = await sha256Hex(preimage);
  return { preimage, preimageHex, commitHex };
}

// Used by anyone auditing after the fact: given a revealed preimage,
// confirm it matches the stored commit hash.
export async function verifyCommit(preimageHex, commitHex) {
  const bytes = hexToBytes(preimageHex);
  const expected = await sha256Hex(bytes);
  return expected === commitHex;
}
