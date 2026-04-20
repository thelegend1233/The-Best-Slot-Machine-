// RNG + commit-reveal tests. The critical property is that a given
// preimage ALWAYS produces the same spin outcome, so a revealed
// preimage is enough to audit any past spin.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mulberry32,
  bytesToHex,
  hexToBytes,
  sha256Hex,
  seedFromPreimage,
  rngFromPreimage,
  newCommit,
  verifyCommit,
} from "../src/engine/rng.js";
import { spinAllReels } from "../src/engine/spin.js";

test("mulberry32 is deterministic for the same seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    assert.equal(a(), b());
  }
});

test("different seeds diverge immediately", () => {
  const a = mulberry32(42);
  const b = mulberry32(43);
  assert.notEqual(a(), b());
});

test("bytesToHex and hexToBytes roundtrip", () => {
  const bytes = new Uint8Array([0, 1, 15, 16, 255, 127, 128]);
  const hex = bytesToHex(bytes);
  assert.equal(hex, "00010f10ff7f80");
  assert.deepEqual(Array.from(hexToBytes(hex)), Array.from(bytes));
});

test("sha256Hex matches a known test vector", async () => {
  // "abc" → "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  const input = new TextEncoder().encode("abc");
  const got = await sha256Hex(input);
  assert.equal(
    got,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("seedFromPreimage uses the first 4 bytes deterministically", () => {
  const pre = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x11]);
  const seed = seedFromPreimage(pre);
  assert.equal(seed, 0xdeadbeef);
});

test("same preimage reproduces the same grid", () => {
  const preimage = new Uint8Array(32).fill(0x7f);
  const rngA = rngFromPreimage(preimage);
  const rngB = rngFromPreimage(preimage);
  const gridA = spinAllReels(rngA);
  const gridB = spinAllReels(rngB);
  assert.deepEqual(gridA, gridB);
});

test("commit-reveal round trip verifies", async () => {
  const { preimageHex, commitHex } = await newCommit();
  assert.equal(commitHex.length, 64); // SHA-256 hex = 64 chars
  assert.equal(preimageHex.length, 64); // 32 bytes hex = 64 chars
  assert.ok(await verifyCommit(preimageHex, commitHex));
});

test("tampered preimage fails verification", async () => {
  const { preimageHex, commitHex } = await newCommit();
  const bad = (preimageHex.startsWith("0") ? "1" : "0") + preimageHex.slice(1);
  assert.equal(await verifyCommit(bad, commitHex), false);
});
