// Norminton Casino — slot machine
// Mechanic: 243 ways pays. Any 3+ matching symbols left-to-right, one per
// column, regardless of row. Wilds substitute. Wins highlight every
// contributing cell; no payline polylines. 3+ scatters trigger 10 free spins
// at x2 multiplier. See Claude.md for the full spec.

// Single place where emoji art is mapped to symbol names. Swap emojis for real
// art later without hunting through the codebase.
const SYMBOLS = {
  leaf:     "🍃",
  acorn:    "🌰",
  mushroom: "🍄",
  rabbit:   "🐇",
  fox:      "🦊",
  deer:     "🦌",
  bear:     "🐻",
  wolf:     "🐺",
  wild:     "🐾",
  scatter:  "🌕",
};

// CONFIG — tune game feel from one place.
const CONFIG = {
  // Weighted reels: low-value symbols appear more often than high-value ones
  // so the game can target ~95% RTP. Exact weights get tuned in step 13.
  reels: [
    // reel 0
    [
      "leaf","acorn","mushroom","rabbit","leaf","fox","acorn","leaf",
      "rabbit","mushroom","deer","leaf","acorn","wild","mushroom","fox",
      "leaf","rabbit","acorn","bear","leaf","mushroom","fox","acorn",
      "scatter","rabbit","leaf","deer","mushroom","acorn","wolf","leaf",
      "fox","rabbit","leaf",
    ],
    // reel 1 — 2 scatters for a ~1/50 bonus trigger rate
    [
      "acorn","leaf","rabbit","mushroom","acorn","fox","leaf","rabbit",
      "scatter","deer","mushroom","leaf","wild","acorn","rabbit","fox",
      "leaf","mushroom","acorn","bear","rabbit","leaf","fox","mushroom",
      "acorn","scatter","leaf","deer","rabbit","acorn","mushroom","leaf",
      "fox","acorn","rabbit",
    ],
    // reel 2 — 2 scatters
    [
      "mushroom","leaf","acorn","rabbit","leaf","mushroom","fox","acorn",
      "scatter","rabbit","deer","mushroom","acorn","wild","leaf","rabbit",
      "fox","mushroom","acorn","leaf","wolf","rabbit","mushroom","leaf",
      "acorn","fox","scatter","leaf","bear","mushroom","rabbit","acorn",
      "leaf","fox","mushroom",
    ],
    // reel 3 — 2 scatters
    [
      "leaf","rabbit","acorn","mushroom","leaf","acorn","fox","rabbit",
      "scatter","mushroom","acorn","deer","rabbit","leaf","wild","mushroom",
      "acorn","fox","leaf","rabbit","mushroom","bear","acorn","leaf",
      "fox","rabbit","mushroom","scatter","acorn","leaf","deer","rabbit",
      "mushroom","fox","acorn",
    ],
    // reel 4
    [
      "leaf","acorn","rabbit","mushroom","leaf","fox","acorn","rabbit",
      "leaf","mushroom","acorn","deer","leaf","rabbit","mushroom","wild",
      "acorn","leaf","fox","rabbit","mushroom","acorn","leaf","bear",
      "rabbit","fox","mushroom","acorn","leaf","scatter","rabbit","wolf",
      "leaf","mushroom","acorn",
    ],
  ],

  // Paytable: multiplier of bet for 3 / 4 / 5 of a kind. Tuned via 2M-spin
  // Monte Carlo with the current (denser) scatter reels and the multiplier
  // wheel to hit ~93% *total* RTP (base ~60%, bonus ~33%).
  // - Only wolf and bear pay 3 of a kind (the rare high symbols).
  // - Every other symbol pays 5 of a kind (and sometimes 4), so every
  //   symbol on the reel has a path to winning.
  // - Low symbols (leaf, acorn, mushroom, rabbit) need 5 of a kind because
  //   ways multiplication amplifies common symbols hard.
  // Scatter is an "anywhere-pays" multiplier of bet. Wild has no entry —
  // it substitutes for other symbols.
  paytable: {
    wolf:     [1,  7, 25],
    bear:     [0,  3,  9],
    deer:     [0,  1,  5],
    fox:      [0,  0,  3],
    rabbit:   [0,  0,  1],
    mushroom: [0,  0,  1],
    acorn:    [0,  0,  1],
    leaf:     [0,  0,  1],
    scatter:  [0,  2, 10], // paid on bet, anywhere on the grid
  },

  // Betting options
  betOptions: [0.25, 0.5, 1, 2, 5],
  startingBalance: 1000,
  waysCount: 243,
  // Regular (non-wild, non-scatter) symbols evaluated for ways wins.
  paySymbols: ["leaf", "acorn", "mushroom", "rabbit", "fox", "deer", "bear", "wolf"],
  // Bonus round: 3+ scatters trigger two wheels in sequence. Wheel 1 locks
  // in the multiplier for the whole round; wheel 2 locks in the number of
  // free spins. Free spins use freeSpinReels (3 wilds/reel) so wheels are
  // scaled down to keep total RTP near 93-94%. Run runMonteCarlo() to verify.
  //
  // Multiplier wheel: ×3 (4/12), ×5 (4/12), ×8 (3/12), ×12 (1/12) → avg ~5.25×
  multiplierWheel: [
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
  ],
  // Free-spins wheel: 8 (4/12), 10 (4/12), 12 (3/12), 15 (1/12) → avg ~10.25
  freeSpinsWheel: [
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
  ],
  // Free-spin reel strips — 3 wilds per reel (vs 1 on base reels).
  // Extra wilds replace leaf/acorn symbols spread across each strip.
  freeSpinReels: [
    // reel 0
    [
      "leaf","acorn","mushroom","rabbit","wild","fox","acorn","leaf",
      "rabbit","mushroom","deer","leaf","acorn","wild","mushroom","fox",
      "leaf","rabbit","acorn","bear","leaf","mushroom","fox","acorn",
      "scatter","rabbit","leaf","deer","mushroom","wild","wolf","leaf",
      "fox","rabbit","leaf",
    ],
    // reel 1
    [
      "wild","leaf","rabbit","mushroom","acorn","fox","leaf","rabbit",
      "scatter","deer","mushroom","leaf","wild","acorn","rabbit","fox",
      "leaf","mushroom","acorn","bear","rabbit","leaf","fox","mushroom",
      "acorn","scatter","leaf","deer","rabbit","acorn","wild","leaf",
      "fox","acorn","rabbit",
    ],
    // reel 2
    [
      "mushroom","wild","acorn","rabbit","leaf","mushroom","fox","acorn",
      "scatter","rabbit","deer","mushroom","acorn","wild","leaf","rabbit",
      "fox","mushroom","acorn","leaf","wolf","rabbit","mushroom","wild",
      "acorn","fox","scatter","leaf","bear","mushroom","rabbit","acorn",
      "leaf","fox","mushroom",
    ],
    // reel 3
    [
      "wild","rabbit","acorn","mushroom","leaf","acorn","fox","rabbit",
      "scatter","mushroom","acorn","deer","rabbit","leaf","wild","mushroom",
      "acorn","fox","leaf","rabbit","mushroom","bear","acorn","leaf",
      "fox","rabbit","mushroom","scatter","acorn","leaf","deer","rabbit",
      "mushroom","fox","wild",
    ],
    // reel 4
    [
      "wild","acorn","rabbit","mushroom","wild","fox","acorn","rabbit",
      "leaf","mushroom","acorn","deer","leaf","rabbit","mushroom","wild",
      "acorn","leaf","fox","rabbit","mushroom","acorn","leaf","bear",
      "rabbit","fox","mushroom","acorn","leaf","scatter","rabbit","wolf",
      "leaf","mushroom","acorn",
    ],
  ],

  // Animation tuning
  spinBaseDurationMs: 700,     // reel 0 spins this long
  spinStaggerMs: 150,          // each later reel spins this much longer
  spinPaddingSymbols: 20,      // random symbols shown before the landing 3
  spinOvershootPx: 6,          // how far past rest the reel briefly drops
  spinBounceBackMs: 200,       // time for the reel to settle back from overshoot
};

// ---------- Backend connection ----------

// Set to your deployed Worker URL to run server-authoritative mode.
// Leave empty (or remove the value) to play fully offline.
// Example: "https://norminton-casino.yourhandle.workers.dev"
const BACKEND_URL = "https://norminton-casino.nicholas-1e8.workers.dev";

// ---------- Player identity ----------

const PLAYER_KEY = "slot_player";

function loadPlayer() {
  try {
    const s = localStorage.getItem(PLAYER_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { displayName: null, token: null };
}

function savePlayer(p) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
}

const player = loadPlayer();

function showPlayerByline() {
  if (!player.displayName) return;
  const el = document.getElementById("player-byline");
  if (!el) return;
  document.getElementById("player-name-display").textContent = player.displayName;
  el.hidden = false;
}

// Returns a Promise that resolves to the buy-in amount the player chose.
function promptBuyIn() {
  return new Promise((resolve) => {
    const overlay    = document.getElementById("buyin-prompt");
    const input      = document.getElementById("buyin-input");
    const submitBtn  = document.getElementById("buyin-submit");
    const optionBtns = document.querySelectorAll(".buyin-option");
    overlay.hidden = false;

    let selectedAmount = null;

    optionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        optionBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedAmount = Number(btn.dataset.amount);
        input.value = "";
      });
    });

    input.addEventListener("input", () => {
      optionBtns.forEach((b) => b.classList.remove("selected"));
      selectedAmount = null;
    });

    function submit() {
      const custom = Number(input.value);
      const amount = selectedAmount || (custom > 0 ? custom : null);
      if (!amount) return;
      overlay.hidden = true;
      resolve(amount);
    }

    submitBtn.addEventListener("click", submit, { once: true });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

// Returns a Promise that resolves to the display name the user entered.
function promptDisplayName() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("name-prompt");
    const input   = document.getElementById("name-input");
    const btn     = document.getElementById("name-submit");
    overlay.hidden = false;
    input.focus();

    function submit() {
      const name = input.value.trim();
      if (!name) return;
      overlay.hidden = true;
      resolve(name);
    }

    btn.addEventListener("click", submit, { once: true });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

// ---------- Backend network layer ----------

let _ws = null;
let _wsReady = false;
let _pendingJoin = null;
const _pendingSpins = []; // FIFO; safe because spins are sequential

function connectBackend() {
  if (!BACKEND_URL) return;
  const wsUrl = BACKEND_URL.replace(/^http/, "ws").replace(/\/?$/, "") + "/ws";
  const socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    _ws = socket;
    // Don't mark ready yet — wait for "joined" ack before allowing spins.
    sendJoin(socket);
  });

  socket.addEventListener("message", (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    if (msg.type === "joined") {
      player.token = msg.token;
      player.displayName = msg.displayName;
      savePlayer(player);
      showPlayerByline();
      if (msg.balance !== undefined) { state.balance = msg.balance; saveBalance(); updateUI(); }
      _wsReady = true;
      if (_pendingJoin) { _pendingJoin.resolve(msg); _pendingJoin = null; }
      console.log("[backend] joined as", msg.displayName, "balance:", msg.balance);
      return;
    }

    if (msg.type === "reset") {
      // Host reset — clear saved identity so buy-in flow restarts on reload.
      player.token = null;
      player.displayName = null;
      savePlayer(player);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => location.reload(), 400);
      return;
    }

    if (msg.type === "error" && _pendingSpins.length === 0) {
      console.error("[backend]", msg.error);
      return;
    }

    if (_pendingSpins.length === 0) return;
    const { resolve, reject } = _pendingSpins.shift();
    if (msg.type === "result") resolve(msg);
    else reject(new Error(msg.error || "unknown error from server"));
  });

  socket.addEventListener("close", () => {
    _ws = null;
    _wsReady = false;
    if (_pendingJoin) { _pendingJoin.reject(new Error("disconnected")); _pendingJoin = null; }
    while (_pendingSpins.length) _pendingSpins.shift().reject(new Error("disconnected"));
    console.log("[backend] disconnected — retrying in 3s");
    setTimeout(connectBackend, 3000);
  });

  socket.addEventListener("error", () => {
    _wsReady = false;
  });
}

async function sendJoin(socket) {
  if (!player.displayName) {
    player.displayName = await promptDisplayName();
  }
  // New players pick their buy-in; returning players keep their server balance.
  let buyIn;
  if (!player.token) {
    buyIn = await promptBuyIn();
  }
  socket.send(JSON.stringify({
    type: "join",
    displayName: player.displayName,
    token: player.token || null,
    buyIn,
  }));
}

// Resolves to { grid, totalWin, hits, scatterCells, scatterCount,
// scatterWin, bonusTriggered } — same shape as evaluateSpin() locally,
// plus commit/reveal when server mode is active.
async function requestSpin(bet, opts = {}) {
  const { isFree = false, multiplier = 1 } = opts;
  if (!BACKEND_URL || !_wsReady) {
    // Offline: run the engine client-side as before.
    const grid = spinAllReels();
    return { grid, ...evaluateSpin(grid, bet) };
  }
  return new Promise((resolve, reject) => {
    _pendingSpins.push({ resolve, reject });
    _ws.send(JSON.stringify({ type: "spin", bet, token: player.token, isFree, multiplier }));
  });
}

// ---------- Game state ----------

// Single localStorage key per spec — no wrappers, just getItem / setItem.
const STORAGE_KEY = "slot_balance";
const HOUSE_STORAGE_KEY = "slot_house_stats";
const MUTE_STORAGE_KEY = "slot_muted";

function loadBalance() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return CONFIG.startingBalance;
  const parsed = parseFloat(stored);
  // Guard against tampered or corrupted values rather than silently breaking.
  if (!isFinite(parsed) || parsed < 0) return CONFIG.startingBalance;
  return parsed;
}

function saveBalance() {
  localStorage.setItem(STORAGE_KEY, String(state.balance));
}

// ---------- Audio ----------
// Howler.js is loaded from a CDN. If the library failed to load (blocked,
// offline, etc.) every audio call becomes a no-op so the game still plays.
// Sound files live in /sounds/ — the repo ships an empty folder and a
// README so the user can drop in their own CC0 clips. Missing files just
// fail silently inside Howler.

const SOUND_FILES = {
  reelSpin: "sounds/reel-spin.mp3",
  win:      "sounds/win.mp3",
  bigWin:   "sounds/big-win.mp3",
  bonus:    "sounds/bonus.mp3",
};
let sounds = null;
let audioMuted = localStorage.getItem(MUTE_STORAGE_KEY) === "1";

function initAudio() {
  if (typeof Howl === "undefined") {
    console.warn("Howler.js not available — audio disabled.");
    return;
  }
  sounds = {
    reelSpin: new Howl({ src: [SOUND_FILES.reelSpin], loop: true, volume: 0.4 }),
    win:      new Howl({ src: [SOUND_FILES.win],                volume: 0.6 }),
    bigWin:   new Howl({ src: [SOUND_FILES.bigWin],             volume: 0.75 }),
    bonus:    new Howl({ src: [SOUND_FILES.bonus],              volume: 0.75 }),
  };
  // Howler.mute() applies globally, so we flip the whole mixer instead of
  // tracking per-sound state.
  Howler.mute(audioMuted);
}

function playSound(key) {
  if (!sounds || audioMuted) return;
  const s = sounds[key];
  if (s) s.play();
}

function stopSound(key) {
  if (!sounds) return;
  const s = sounds[key];
  if (s) s.stop();
}

function setMuted(next) {
  audioMuted = next;
  localStorage.setItem(MUTE_STORAGE_KEY, audioMuted ? "1" : "0");
  if (typeof Howler !== "undefined") Howler.mute(audioMuted);
  updateMuteButton();
  // Pulling the plug on the loop immediately feels better than letting it
  // ride out on mute (especially if the player muted because it was too loud).
  if (audioMuted) stopSound("reelSpin");
}

function updateMuteButton() {
  const btn = document.getElementById("mute-button");
  if (!btn) return;
  btn.textContent = audioMuted ? "🔇" : "🔊";
  btn.classList.toggle("muted", audioMuted);
  btn.setAttribute("aria-label", audioMuted ? "Unmute audio" : "Mute audio");
  btn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
}

// ---------- House ledger (dev view) ----------
// Cumulative totals from the casino's perspective. Tracked always so the
// dev view can show lifetime stats the moment ?dev=1 is added; shown only
// when the dev panel is revealed.
const houseStats = loadHouseStats();

function loadHouseStats() {
  const stored = localStorage.getItem(HOUSE_STORAGE_KEY);
  const empty = { wagered: 0, won: 0, spins: 0, bonusesTriggered: 0 };
  if (!stored) return empty;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      return {
        wagered: Number(parsed.wagered) || 0,
        won: Number(parsed.won) || 0,
        spins: Number(parsed.spins) || 0,
        bonusesTriggered: Number(parsed.bonusesTriggered) || 0,
      };
    }
  } catch { /* fall through to empty */ }
  return empty;
}

function saveHouseStats() {
  localStorage.setItem(HOUSE_STORAGE_KEY, JSON.stringify(houseStats));
}

function renderHouseStats() {
  const wageredEl = document.getElementById("hs-wagered");
  if (!wageredEl) return; // dev panel not rendered
  const net = houseStats.wagered - houseStats.won;
  const rtp =
    houseStats.wagered > 0
      ? (houseStats.won / houseStats.wagered * 100).toFixed(2) + "%"
      : "—";

  wageredEl.textContent = formatCredits(houseStats.wagered);
  document.getElementById("hs-won").textContent = formatCredits(houseStats.won);
  const netEl = document.getElementById("hs-net");
  // Leading "+" so the sign is unambiguous when the house is ahead.
  netEl.textContent = (net >= 0 ? "+" : "") + formatCredits(net);
  netEl.classList.toggle("positive", net > 0);
  netEl.classList.toggle("negative", net < 0);
  document.getElementById("hs-rtp").textContent = rtp;
  document.getElementById("hs-spins").textContent = houseStats.spins;
  document.getElementById("hs-bonuses").textContent = houseStats.bonusesTriggered;
}

function resetHouseStats() {
  houseStats.wagered = 0;
  houseStats.won = 0;
  houseStats.spins = 0;
  houseStats.bonusesTriggered = 0;
  saveHouseStats();
  renderHouseStats();
}

const state = {
  balance: loadBalance(),
  betIndex: 2,   // index into CONFIG.betOptions → 1.00
  lastWin: 0,
};

// Bonus round state. Tracked separately so regular game flow stays readable.
// No re-trigger in v1: scatters during free spins still pay their scatter
// multiplier (via the evaluator) but don't add more free spins.
// `multiplier` and `spinsAwarded` are locked in by the two wheels that show
// when the bonus triggers.
const bonus = {
  active: false,
  spinsRemaining: 0,
  spinsAwarded: 0,
  multiplier: 1,
  totalWin: 0,
};

function currentBet() {
  return CONFIG.betOptions[state.betIndex];
}

function formatCredits(amount) {
  return amount.toFixed(2);
}

// ---------- Reel spinning ----------

// Pick a random starting index on a reel strip and return the three consecutive
// symbols that would be visible (top, middle, bottom). Wraps around the strip.
function spinReel(reelStrip) {
  const startIndex = Math.floor(Math.random() * reelStrip.length);
  const visible = [];
  for (let row = 0; row < 3; row++) {
    const index = (startIndex + row) % reelStrip.length;
    visible.push(reelStrip[index]);
  }
  return visible;
}

// Build the full 5-reel grid by spinning each reel independently.
function spinAllReels() {
  return CONFIG.reels.map(spinReel);
}

function spinFreeReels() {
  return CONFIG.freeSpinReels.map(spinReel);
}

// ---------- Payline evaluation (basic, step 3) ----------

// 243-ways evaluator. For each paying symbol, find the longest leading run
// of reels that contain at least one match (the symbol itself or a wild,
// which substitutes). When the run is 3+ reels long, the win is:
//   bet × paytable[symbol][run-3] × ways
// where `ways` is the product of the per-reel match counts. Wilds count
// toward every paying symbol's match (standard ways-pays behaviour), so a
// single wild can contribute to multiple symbol wins on the same spin.
function evaluateWaysForSymbol(grid, symbol, bet) {
  // Per-reel positions where symbol or wild appears.
  const matchingRows = grid.map((reelArray) => {
    const rows = [];
    for (let row = 0; row < reelArray.length; row++) {
      const s = reelArray[row];
      if (s === symbol || s === "wild") rows.push(row);
    }
    return rows;
  });

  let runLength = 0;
  for (let r = 0; r < matchingRows.length; r++) {
    if (matchingRows[r].length > 0) runLength++;
    else break;
  }

  if (runLength < 3) return null;

  const paytableEntry = CONFIG.paytable[symbol];
  if (!paytableEntry) return null;

  const multiplier = paytableEntry[runLength - 3];
  // Low symbols pay 0 on some run lengths. Treat zero-multiplier runs as
  // "no win" so we don't highlight cells without actually paying anything.
  if (!multiplier) return null;

  let ways = 1;
  for (let r = 0; r < runLength; r++) ways *= matchingRows[r].length;

  const win = bet * multiplier * ways;

  // Cells contributing to the win (used to highlight tiles on a hit).
  const cells = [];
  for (let r = 0; r < runLength; r++) {
    for (const row of matchingRows[r]) cells.push([r, row]);
  }

  return { symbol, count: runLength, ways, win, cells };
}

function findScatterCells(grid) {
  const cells = [];
  for (let reel = 0; reel < grid.length; reel++) {
    for (let row = 0; row < grid[reel].length; row++) {
      if (grid[reel][row] === "scatter") cells.push([reel, row]);
    }
  }
  return cells;
}

// Evaluate every paying symbol plus the scatter anywhere-pay. Returns total
// win, per-symbol hits, scatter metadata, and whether the bonus was
// triggered (free-spins round lands in step 11).
function evaluateSpin(grid, bet) {
  const hits = [];
  let totalWin = 0;

  for (const symbol of CONFIG.paySymbols) {
    const hit = evaluateWaysForSymbol(grid, symbol, bet);
    if (hit) {
      hits.push(hit);
      totalWin += hit.win;
    }
  }

  const scatterCells = findScatterCells(grid);
  const scatterCount = scatterCells.length;
  let scatterWin = 0;
  let bonusTriggered = false;

  if (scatterCount >= 3) {
    // Cap at the 5-of-a-kind payout even if more than 5 scatters land.
    const index = Math.min(scatterCount, 5) - 3;
    scatterWin = bet * CONFIG.paytable.scatter[index];
    totalWin += scatterWin;
    bonusTriggered = true;
  }

  return { totalWin, hits, scatterCells, scatterCount, scatterWin, bonusTriggered };
}

// ---------- Rendering ----------

// Replace a reel's contents with 3 static cells showing the given symbols.
// This is the "at-rest" shape used both at page load and after a spin settles.
function renderStaticReel(reelEl, symbols) {
  reelEl.innerHTML = "";
  for (const symbolName of symbols) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (symbolName === "wild") cell.classList.add("cell-wild");
    if (symbolName === "scatter") cell.classList.add("cell-scatter");
    cell.textContent = SYMBOLS[symbolName];
    reelEl.appendChild(cell);
  }
}

function renderGrid(grid) {
  const reels = document.querySelectorAll(".reel");
  reels.forEach((reelEl, reelIndex) => {
    renderStaticReel(reelEl, grid[reelIndex]);
  });
}

// ---------- Spin animation ----------

// Track animation state so we can (a) ignore duplicate spin requests mid-spin
// and (b) let a second tap skip the animation to the final result.
let spinInProgress = false;
let bonusSequenceInProgress = false; // true between bonus trigger and free spins start
let activeSkips = [];

function skipActiveSpin() {
  const skips = activeSkips;
  activeSkips = [];
  skips.forEach((fn) => fn());
}

// Animate all 5 reels. Each reel is swapped for a long strip; the strip starts
// with its bottom (padding) visible and slides DOWN so the target symbols at
// the top appear — new symbols enter from the top, old ones drop off the
// bottom. Reels stop in cascade. The stop has a two-phase settle: first a
// smooth decel to just past rest (overshoot), then a short bounce back,
// giving a subtle "hit the stop" feel.
function animateReels(targetGrid, reels = CONFIG.reels) {
  return new Promise((resolve) => {
    const reelEls = Array.from(document.querySelectorAll(".reel"));
    let remaining = reelEls.length;

    reelEls.forEach((reelEl, reelIndex) => {
      const targetSymbols = targetGrid[reelIndex];
      const reelStrip = reels[reelIndex];

      // Strip layout: [buffer] [target0] [target1] [target2] [padding × N].
      // The buffer above the targets gives overshoot somewhere to land.
      // The padding below is what's visible while the reel is spinning.
      const randomSymbol = () =>
        reelStrip[Math.floor(Math.random() * reelStrip.length)];
      const stripSymbols = [randomSymbol(), ...targetSymbols];
      for (let i = 0; i < CONFIG.spinPaddingSymbols; i++) {
        stripSymbols.push(randomSymbol());
      }

      // Lock the reel's height while the longer strip is swapped in so the
      // surrounding grid doesn't jump.
      const lockedHeight = reelEl.getBoundingClientRect().height;
      reelEl.style.height = lockedHeight + "px";

      reelEl.innerHTML = "";
      const strip = document.createElement("div");
      strip.className = "strip";
      for (const symbolName of stripSymbols) {
        const cell = document.createElement("div");
        cell.className = "cell";
        if (symbolName === "wild") cell.classList.add("cell-wild");
        if (symbolName === "scatter") cell.classList.add("cell-scatter");
        cell.textContent = SYMBOLS[symbolName];
        strip.appendChild(cell);
      }
      reelEl.appendChild(strip);

      const spinDuration = CONFIG.spinBaseDurationMs + reelIndex * CONFIG.spinStaggerMs;

      let finished = false;
      let phase = 1;

      const finish = () => {
        if (finished) return;
        finished = true;
        strip.removeEventListener("transitionend", onTransitionEnd);
        renderStaticReel(reelEl, targetSymbols);
        reelEl.style.height = "";
        remaining--;
        if (remaining === 0) resolve();
      };

      // Phase 1 lands at overshoot; phase 2 bounces back; then finish.
      // Phase 2 uses a symmetric ease-in-out so velocity is zero at both ends:
      // no sudden direction change, no jerk at the seam.
      function onTransitionEnd(event) {
        if (event.propertyName !== "transform") return;
        if (phase === 1) {
          phase = 2;
          strip.style.transition = `transform ${CONFIG.spinBounceBackMs}ms cubic-bezier(0.45, 0, 0.55, 1)`;
          strip.style.transform = `translateY(${restY}px)`;
        } else {
          finish();
        }
      }
      strip.addEventListener("transitionend", onTransitionEnd);

      activeSkips.push(() => {
        strip.style.transition = "none";
        finish();
      });

      // Measure after layout so cell/gap sizes are real, then kick off phase 1.
      // `restY` is captured in the closure for phase 2.
      let restY = 0;
      requestAnimationFrame(() => {
        const stripHeight = strip.getBoundingClientRect().height;
        const reelInnerHeight = reelEl.clientHeight - 12; // minus 6px padding on both sides
        const cellCount = stripSymbols.length;
        const gapPx = 10;
        const cellHeight = (stripHeight - gapPx * (cellCount - 1)) / cellCount;
        const stride = cellHeight + gapPx;

        // Start: padding visible at the bottom of the strip.
        const startY = -(stripHeight - reelInnerHeight);
        // Rest: target symbols occupy the visible window. Buffer is at strip
        // index 0, so shifting by one stride puts target0 at the top.
        restY = -stride;
        const overshootY = restY + CONFIG.spinOvershootPx;

        // Place the strip at its start position without animating.
        strip.style.transition = "none";
        strip.style.transform = `translateY(${startY}px)`;
        // Force a reflow so the next transform actually triggers a transition.
        void strip.offsetHeight;

        strip.style.transition = `transform ${spinDuration}ms cubic-bezier(0.12, 0.72, 0.32, 1)`;
        strip.style.transform = `translateY(${overshootY}px)`;
      });
    });
  });
}

// ---------- Win highlight (cells + payline overlay) ----------

function clearWinHighlights() {
  document.querySelectorAll(".cell.cell-win").forEach((el) => {
    el.classList.remove("cell-win");
  });
  document.querySelector(".stat-win").classList.remove("pulse");
}

function pulseWinDisplay() {
  const statWin = document.querySelector(".stat-win");
  // Restart the CSS animation by toggling the class.
  statWin.classList.remove("pulse");
  void statWin.offsetWidth;
  statWin.classList.add("pulse");
}

function cellElement(reelIndex, rowIndex) {
  const reel = document.querySelectorAll(".reel")[reelIndex];
  return reel.querySelectorAll(".cell")[rowIndex];
}

// 243 ways doesn't have discrete paylines to draw — instead, every cell
// that contributed to any symbol win lights up. Scatter cells light up too
// when the scatter pay triggers.
function drawWinHighlights(result) {
  for (const hit of result.hits) {
    for (const [reel, row] of hit.cells) {
      cellElement(reel, row).classList.add("cell-win");
    }
  }
  if (result.scatterCount >= 3) {
    for (const [reel, row] of result.scatterCells) {
      cellElement(reel, row).classList.add("cell-win");
    }
  }
}

// ---------- UI updates ----------

function updateUI() {
  document.getElementById("balance").textContent = formatCredits(state.balance);
  document.getElementById("win").textContent = formatCredits(state.lastWin);
  document.getElementById("bet").textContent = formatCredits(currentBet());

  // Free spins: Spin is always enabled (cost is zero). Paid play: require
  // balance to cover the bet. During an in-flight animation Spin stays
  // enabled so a second tap can skip.
  const spinButton = document.getElementById("spin-button");
  spinButton.disabled =
    bonusSequenceInProgress ||
    (!spinInProgress && !bonus.active && state.balance < currentBet());
  spinButton.textContent = bonus.active ? "Free Spin" : "Spin";

  // Bet steppers and the buy-back-in button are locked during the bonus so
  // the player can't change the wager or reset their balance mid-round.
  const lockedForBonus = bonus.active;
  document.querySelector('[data-action="bet-down"]').disabled =
    lockedForBonus || state.betIndex <= 0;
  document.querySelector('[data-action="bet-up"]').disabled =
    lockedForBonus || state.betIndex >= CONFIG.betOptions.length - 1;
  document.getElementById("buy-back-in-button").disabled = lockedForBonus;
}

function handleStepper(action) {
  if (action === "bet-up" && state.betIndex < CONFIG.betOptions.length - 1) {
    state.betIndex++;
  } else if (action === "bet-down" && state.betIndex > 0) {
    state.betIndex--;
  }
  updateUI();
}

async function performSpin() {
  if (spinInProgress) return;

  // Cancel any pending auto-advance — this call takes over.
  clearTimeout(autoAdvanceTimeoutId);
  autoAdvanceTimeoutId = null;

  const bet = currentBet();
  const isFreeSpin = bonus.active;

  // Paid spins require balance; free spins don't touch it.
  if (!isFreeSpin && state.balance < bet) return;

  clearWinHighlights();

  const multiplier = isFreeSpin ? bonus.multiplier : 1;

  if (!isFreeSpin) {
    state.balance -= bet;
    saveBalance();
    houseStats.wagered += bet;
    houseStats.spins++;
  } else {
    bonus.spinsRemaining--;
  }
  state.lastWin = 0;
  updateUI();
  if (isFreeSpin) updateBonusIndicator();

  // Decide the outcome before the animation so evaluation and display stay
  // in sync even if the animation is skipped.
  // Online: server provides the grid and result (authoritative).
  // Offline: run the engine locally as before.
  let grid, baseResult, serverBalance;
  const isOnline = BACKEND_URL && _wsReady;
  if (isOnline) {
    const spinResult = await requestSpin(bet, { isFree: isFreeSpin, multiplier });
    grid = spinResult.grid;
    baseResult = spinResult;
    serverBalance = spinResult.balance;
    // forceBonusNext is a dev-only tool; server is authoritative online.
    if (forceBonusNext && !isFreeSpin) {
      forceBonusNext = false;
      setDevButtonArmed(false);
    }
  } else {
    grid = isFreeSpin ? spinFreeReels() : spinAllReels();
    // Dev override: plant 3 scatters before evaluation.
    if (forceBonusNext && !isFreeSpin) {
      forceBonusNext = false;
      setDevButtonArmed(false);
      rigGridForBonus(grid);
    }
    baseResult = evaluateSpin(grid, bet);
  }
  // Server already applies the free-spin multiplier; offline needs it applied here.
  const winAmount = isOnline ? baseResult.totalWin : baseResult.totalWin * multiplier;

  spinInProgress = true;
  playSound("reelSpin");
  await animateReels(grid, isFreeSpin ? CONFIG.freeSpinReels : CONFIG.reels);
  stopSound("reelSpin");
  spinInProgress = false;

  state.lastWin = winAmount;
  if (serverBalance !== undefined) {
    state.balance = serverBalance;
  } else {
    state.balance += winAmount;
  }
  saveBalance();
  if (winAmount > 0) houseStats.won += winAmount;
  saveHouseStats();
  renderHouseStats();
  if (isFreeSpin) {
    bonus.totalWin += winAmount;
    updateBonusIndicator();
  }
  updateUI();

  if (winAmount > 0) {
    console.log(
      `${isFreeSpin ? "Free spin" : "Spin"} win: ${formatCredits(winAmount)} credits`,
      { hits: baseResult.hits, scatters: baseResult.scatterCount, multiplier },
    );
    drawWinHighlights(baseResult);
    pulseWinDisplay();
    if (isBigWin(winAmount, bet)) {
      // Big-win fanfare replaces the regular chime so they don't overlap.
      playSound("bigWin");
      runBigWinCelebration();
    } else {
      playSound("win");
    }
  } else {
    console.log(isFreeSpin ? "Free spin — no win" : "No win");
  }

  // Start the bonus round after a base-game trigger resolves. The two
  // wheels run sequentially and lock in the free-spin count + multiplier
  // before the first free spin.
  if (!isFreeSpin && baseResult.bonusTriggered) {
    bonusSequenceInProgress = true;
    updateUI();
    document.body.classList.add("bonus-shake");
    setTimeout(() => document.body.classList.remove("bonus-shake"), 5000);
    setTimeout(async () => {
      const { freeSpins, multiplier } = await runBonusWheels();
      startFreeSpins(freeSpins, multiplier);
    }, 5100);
    return;
  }

  // Free-spin flow control.
  if (isFreeSpin) {
    if (bonus.spinsRemaining === 0) {
      setTimeout(endFreeSpins, 900);
    } else {
      // Auto-advance to the next free spin so the bonus plays itself out.
      // The player can still tap Spin to skip the pause.
      clearTimeout(autoAdvanceTimeoutId);
      // Give winning spins more breathing room so the highlights are readable.
      const pauseMs = winAmount > 0 ? 2600 : 1700;
      autoAdvanceTimeoutId = setTimeout(() => {
        autoAdvanceTimeoutId = null;
        if (bonus.active && !spinInProgress) performSpin();
      }, pauseMs);
    }
  }
}

// A tap mid-spin skips the animation; a tap during the big-win celebration
// dismisses it; otherwise starts a new spin.
function handleSpinClick() {
  if (celebrationInProgress) clearCelebration();
  if (spinInProgress) {
    skipActiveSpin();
    return;
  }
  performSpin();
}

// ---------- Big-win celebration ----------

// Threshold per spec: a win of at least 50x the total bet is "big".
const BIG_WIN_MULTIPLIER = 50;

let celebrationInProgress = false;
let celebrationTimeoutId = null;
let autoAdvanceTimeoutId = null;

function isBigWin(winAmount, totalBet) {
  return totalBet > 0 && winAmount >= totalBet * BIG_WIN_MULTIPLIER;
}

// Generate N particles at random angles/distances. Colors stay in the warm
// gold/amber range so the burst reads as "money" rather than rainbow confetti.
function spawnParticles(count = 32) {
  const container = document.getElementById("particles");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const size = 6 + Math.random() * 10;
    const hue = 38 + Math.random() * 18; // gold / amber
    const lightness = 55 + Math.random() * 15;
    particle.style.setProperty("--dx", `${dx.toFixed(0)}px`);
    particle.style.setProperty("--dy", `${dy.toFixed(0)}px`);
    particle.style.setProperty("--size", `${size.toFixed(1)}px`);
    particle.style.background = `hsl(${hue}, 95%, ${lightness}%)`;
    particle.style.color = `hsl(${hue}, 95%, ${lightness}%)`;
    particle.style.animationDelay = `${Math.floor(Math.random() * 120)}ms`;
    container.appendChild(particle);
  }
}

function runBigWinCelebration() {
  celebrationInProgress = true;

  document.querySelector(".machine").classList.add("shake");
  // Shake finishes on its own; strip the class so it can run again later.
  setTimeout(() => {
    document.querySelector(".machine").classList.remove("shake");
  }, 500);

  spawnParticles();
  const banner = document.getElementById("big-win-banner");
  banner.classList.remove("show");
  // Force a reflow so the animation restarts cleanly on back-to-back big wins.
  void banner.offsetWidth;
  banner.classList.add("show");

  // Auto-clear slightly after the banner animation ends.
  clearTimeout(celebrationTimeoutId);
  celebrationTimeoutId = setTimeout(clearCelebration, 2200);
}

function clearCelebration() {
  celebrationInProgress = false;
  clearTimeout(celebrationTimeoutId);
  celebrationTimeoutId = null;
  document.getElementById("particles").innerHTML = "";
  const banner = document.getElementById("big-win-banner");
  banner.classList.remove("show");
  document.querySelector(".machine").classList.remove("shake");
}

// ---------- Dev tooling ----------

// Set by the dev panel (or the console helper) to guarantee the next spin
// lands 3 scatters and triggers the bonus. Dev-only, gated behind ?dev=1.
let forceBonusNext = false;

// Drop 3 scatters into the visible window on three different reels. Any
// ways wins on the same grid are left alone.
function rigGridForBonus(grid) {
  grid[0][1] = "scatter";
  grid[2][0] = "scatter";
  grid[4][2] = "scatter";
}

function setDevButtonArmed(armed) {
  const btn = document.getElementById("dev-force-bonus");
  if (!btn) return;
  btn.textContent = armed ? "Bonus Armed ✓" : "Force Bonus";
  btn.classList.toggle("armed", armed);
}

// Monte Carlo verifier (step 13). Uses the real evaluator + wheels, so any
// paytable/wheel/reel-strip change is reflected immediately. Safe to run in
// the browser console via `runMonteCarlo()` or `runMonteCarlo(1_000_000)`.
// Skips the DOM / animation entirely so it finishes in seconds.
function runMonteCarlo(totalSpins = 1_000_000) {
  const bet = 1;
  const multWheel = CONFIG.multiplierWheel;
  const spinsWheel = CONFIG.freeSpinsWheel;

  let wagered = 0;
  let won = 0;
  let baseWon = 0;
  let bonusWon = 0;
  let hits = 0;
  let triggers = 0;

  const t0 = performance.now();
  for (let i = 0; i < totalSpins; i++) {
    wagered += bet;
    const result = evaluateSpin(spinAllReels(), bet);
    won += result.totalWin;
    baseWon += result.totalWin;
    if (result.totalWin > 0) hits++;
    if (result.bonusTriggered) {
      triggers++;
      const mult = multWheel[Math.floor(Math.random() * multWheel.length)].value;
      const spins = spinsWheel[Math.floor(Math.random() * spinsWheel.length)].value;
      for (let k = 0; k < spins; k++) {
        const w = evaluateSpin(spinFreeReels(), bet).totalWin * mult;
        won += w;
        bonusWon += w;
      }
    }
  }
  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);

  const rtp = won / wagered;
  const baseRTP = baseWon / wagered;
  const bonusRTP = bonusWon / wagered;
  const avgBonus = triggers > 0 ? bonusWon / triggers : 0;

  console.log(`Monte Carlo over ${totalSpins.toLocaleString()} spins (${elapsed}s):`);
  console.log(`  Total RTP:   ${(rtp * 100).toFixed(2)}%  (target ~93%)`);
  console.log(`  Base RTP:    ${(baseRTP * 100).toFixed(2)}%`);
  console.log(`  Bonus RTP:   ${(bonusRTP * 100).toFixed(2)}%`);
  console.log(`  Hit freq:    ${(hits / totalSpins * 100).toFixed(2)}%`);
  console.log(`  Bonus rate:  ${(triggers / totalSpins * 100).toFixed(3)}%  (≈ 1 in ${triggers > 0 ? Math.round(totalSpins / triggers) : "∞"})`);
  console.log(`  Avg bonus:   ${avgBonus.toFixed(1)}× bet`);

  return { rtp, baseRTP, bonusRTP, hits, triggers, avgBonus };
}

function setupDevPanel() {
  // Expose console helpers even without the URL flag — easier for anyone
  // poking around in devtools.
  window.forceBonus = () => {
    forceBonusNext = true;
    setDevButtonArmed(true);
    console.log("Bonus armed for the next spin.");
  };
  window.runMonteCarlo = runMonteCarlo;

  const hasDevFlag =
    /[?&]dev=1(&|$)/.test(location.search) || location.hash === "#dev";
  if (!hasDevFlag) return;

  const panel = document.getElementById("dev-panel");
  panel.hidden = false;
  document.getElementById("dev-force-bonus").addEventListener("click", () => {
    forceBonusNext = !forceBonusNext;
    setDevButtonArmed(forceBonusNext);
  });
  document.getElementById("hs-reset").addEventListener("click", resetHouseStats);
  renderHouseStats();
}

// ---------- Bonus wheels ----------

const SVG_WHEEL_NS = "http://www.w3.org/2000/svg";

// Build the pie-slice SVG for a wheel. Slice 0 sits centered at the top
// (12 o'clock) where the pointer is, and slices proceed clockwise.
function renderWheel(svg, segments) {
  svg.innerHTML = "";
  const radius = 100;
  const n = segments.length;
  const sliceAngle = 360 / n;

  segments.forEach((seg, i) => {
    // Start at top (−90° in SVG coords), rotate clockwise.
    const startDeg = -90 + i * sliceAngle - sliceAngle / 2;
    const endDeg = startDeg + sliceAngle;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = Math.cos(startRad) * radius;
    const y1 = Math.sin(startRad) * radius;
    const x2 = Math.cos(endRad) * radius;
    const y2 = Math.sin(endRad) * radius;

    const path = document.createElementNS(SVG_WHEEL_NS, "path");
    path.setAttribute(
      "d",
      `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
    );
    path.setAttribute("class", `${seg.color} wheel-divider`);
    svg.appendChild(path);

    // Label sits out near the rim so 12 narrow slices each have room for
    // the digits. Just the number, no prefix — the wheel title says what
    // the number means.
    const midDeg = startDeg + sliceAngle / 2;
    const midRad = (midDeg * Math.PI) / 180;
    const textX = Math.cos(midRad) * radius * 0.72;
    const textY = Math.sin(midRad) * radius * 0.72;
    const text = document.createElementNS(SVG_WHEEL_NS, "text");
    text.setAttribute("x", textX.toFixed(2));
    text.setAttribute("y", textY.toFixed(2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    // Rotate each label so it reads radially outward (top-of-digit toward
    // the rim) — a classic prize-wheel look.
    text.setAttribute(
      "transform",
      `rotate(${(midDeg + 90).toFixed(2)} ${textX.toFixed(2)} ${textY.toFixed(2)})`,
    );
    text.setAttribute("class", "wheel-label");
    text.textContent = String(seg.value);
    svg.appendChild(text);
  });

  // Outer rim and center hub for a polished look.
  const rim = document.createElementNS(SVG_WHEEL_NS, "circle");
  rim.setAttribute("r", String(radius));
  rim.setAttribute("class", "wheel-rim");
  svg.appendChild(rim);
  const hub = document.createElementNS(SVG_WHEEL_NS, "circle");
  hub.setAttribute("r", "8");
  hub.setAttribute("class", "wheel-hub");
  svg.appendChild(hub);
}

// Each wheel spins to a chosen slice. Slice i's center sits at angle
// (i * sliceAngle) clockwise from top; rotating the wheel by -i*sliceAngle
// brings it back under the pointer. Several extra turns make the spin feel
// weighty and keep the landing position unpredictable.
function animateWheel(svg, segments, chosenIndex) {
  return new Promise((resolve) => {
    const n = segments.length;
    const sliceAngle = 360 / n;
    const fullTurns = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
    // A small random offset within the slice keeps the end position looking
    // natural (the pointer doesn't always land dead-center).
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.6;
    const target = fullTurns * 360 - chosenIndex * sliceAngle + jitter;

    svg.style.transition = "transform 3.6s cubic-bezier(0.1, 0.75, 0.2, 1)";
    // Force a reflow so the transition applies cleanly on repeat runs.
    void svg.offsetWidth;
    svg.style.transform = `rotate(${target}deg)`;

    const onEnd = () => {
      svg.removeEventListener("transitionend", onEnd);
      resolve();
    };
    svg.addEventListener("transitionend", onEnd);
  });
}

function resetWheel(svg) {
  // Snap back to 0 without animation so the next wheel starts fresh.
  svg.style.transition = "none";
  svg.style.transform = "rotate(0deg)";
  void svg.offsetWidth;
}

// Wait for a user tap on the wheel's "Spin" button.
function waitForTap(button) {
  return new Promise((resolve) => {
    const onClick = () => {
      button.removeEventListener("click", onClick);
      resolve();
    };
    button.addEventListener("click", onClick);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Show one wheel, have the player spin it, and resolve with the chosen
// segment. All segments are equally weighted — rebalance by repeating a
// value in CONFIG if you want weighting.
async function runSingleWheel(title, segments) {
  const overlay = document.getElementById("wheel-overlay");
  const svg = document.getElementById("wheel");
  const button = document.getElementById("wheel-button");
  const titleEl = document.getElementById("wheel-title");
  const resultEl = document.getElementById("wheel-result");

  titleEl.textContent = title;
  resetWheel(svg);
  renderWheel(svg, segments);
  resultEl.classList.remove("show");
  resultEl.textContent = "";
  button.disabled = false;
  button.textContent = "Spin";
  overlay.hidden = false;

  await waitForTap(button);
  button.disabled = true;

  const chosenIndex = Math.floor(Math.random() * segments.length);
  await animateWheel(svg, segments, chosenIndex);

  const chosen = segments[chosenIndex];
  resultEl.textContent = `× ${chosen.value}`;
  // Restart the pop animation cleanly.
  resultEl.classList.remove("show");
  void resultEl.offsetWidth;
  resultEl.classList.add("show");

  // Pause so the player can register the result before moving on.
  await wait(1400);
  return chosen.value;
}

async function runBonusWheels() {
  const multiplier = await runSingleWheel("Multiplier Wheel", CONFIG.multiplierWheel);
  await wait(200);
  const freeSpins = await runSingleWheel("Free Spins Wheel", CONFIG.freeSpinsWheel);
  await wait(250);
  document.getElementById("wheel-overlay").hidden = true;
  return { multiplier, freeSpins };
}

// ---------- Free-spins bonus round ----------

function showBonusBanner(title, sub) {
  const banner = document.getElementById("bonus-banner");
  document.getElementById("bonus-banner-title").textContent = title;
  document.getElementById("bonus-banner-sub").textContent = sub;
  banner.hidden = false;
  banner.classList.remove("show");
  // Force a reflow so the animation restarts on back-to-back banners.
  void banner.offsetWidth;
  banner.classList.add("show");
  setTimeout(() => {
    banner.classList.remove("show");
    banner.hidden = true;
  }, 4500);
}

function updateBonusIndicator() {
  document.getElementById("bonus-remaining").textContent = bonus.spinsRemaining;
  document.getElementById("bonus-total").textContent = bonus.spinsAwarded;
  document.getElementById("bonus-multiplier").textContent = bonus.multiplier;
  document.getElementById("bonus-total-win").textContent = formatCredits(bonus.totalWin);
}

function startFreeSpins(spinsAwarded, multiplier) {
  bonusSequenceInProgress = false;
  bonus.active = true;
  document.body.classList.add("bonus-active");
  bonus.spinsAwarded = spinsAwarded;
  bonus.spinsRemaining = spinsAwarded;
  bonus.multiplier = multiplier;
  bonus.totalWin = 0;

  houseStats.bonusesTriggered++;
  saveHouseStats();
  renderHouseStats();
  playSound("bonus");

  const indicator = document.getElementById("bonus-indicator");
  indicator.hidden = false;
  updateBonusIndicator();

  showBonusBanner(
    `${spinsAwarded} Free Spins`,
    `× ${multiplier} Multiplier`,
  );
  updateUI();
}

function endFreeSpins() {
  const totalWon = bonus.totalWin;
  bonus.active = false;
  document.body.classList.remove("bonus-active");
  bonus.spinsRemaining = 0;

  clearTimeout(autoAdvanceTimeoutId);
  autoAdvanceTimeoutId = null;

  document.getElementById("bonus-indicator").hidden = true;
  showBonusBanner("Bonus Win", `${formatCredits(totalWon)} credits`);
  updateUI();
  console.log(`Bonus ended. Total won: ${formatCredits(totalWon)} credits.`);
}

// "Buy Back In" — top up the balance to the starting amount. Always available
// per spec; no confirm dialog (the label is unambiguous and the action is
// reversible by playing it back down).
function buyBackIn() {
  if (spinInProgress) return;
  state.balance = CONFIG.startingBalance;
  state.lastWin = 0;
  saveBalance();
  clearWinHighlights();
  updateUI();
}

// ---------- Wire-up ----------

document.addEventListener("DOMContentLoaded", () => {
  connectBackend();
  showPlayerByline();
  renderGrid(spinAllReels());
  updateUI();
  setupDevPanel();
  initAudio();
  updateMuteButton();

  document.getElementById("spin-button").addEventListener("click", handleSpinClick);
  document.getElementById("buy-back-in-button").addEventListener("click", buyBackIn);
  document.getElementById("mute-button").addEventListener("click", () => setMuted(!audioMuted));

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStepper(btn.dataset.action));
  });
});
