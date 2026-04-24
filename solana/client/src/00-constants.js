// 00-constants.js — shared named constants for 0xARK game client
// Loaded first in bundle so every module can reference SCENE_IDS / GAME_CONSTANTS.
// DO NOT add game-state variables here — this file is for compile-time constants only.

// ── Scene routing IDs ────────────────────────────────────────────────────────
// Global `sc` variable is compared against these string values in the main
// render switch (09-game-loop.js). Centralised here so typos in string
// literals are caught by grep/search rather than silent mis-routing.
const SCENE_IDS = Object.freeze({
  SPLASH: "splash", // loading/boot screen
  TITLE: "title", // title screen (dTitle)
  MAP: "map", // overworld + dungeon exploration (Phase C)
  ACT: "act", // Phase C card battle resolver (dAct)
  CRD: "crd", // card collection screen
  LOG: "log", // battle log screen
  STATS: "stats", // player stats screen
  VICTORY: "victory", // win/game-over screen (Phase C)
  LOBBY: "lobby", // Phase D Crown Plaza hub (dLobby)
  DUEL: "duel", // M2 Duel Board (drawDuelScene)
  DUEL_VICTORY: "duel_victory", // M4 Victory/Defeat scene (drawVictoryScene)
  CARD_DETAIL: "card_detail", // M5 Card Detail scene (drawCardDetailScene)
  CARD_STORAGE: "card_storage", // PC Box Card Storage (drawCardStorageScene)
  BATTLE: "battle", // legacy Phase C guard value (08-overlays.js)
  MENU: "menu",     // v3.0-plus top navigation hub (2×3 grid — 08-menu.js)
});

// ── Game economy constants ───────────────────────────────────────────────────
// Per-feature costs in SOL (x402 micropayments). Matching amounts are in the
// X-Payment-Required header served by the x402 broker; these constants are the
// client-side reference values used in UI copy and validation.
const GAME_CONSTANTS = Object.freeze({
  SCOUT_PEEK_COST_SOL: 0.005, // x402 cost to reveal one opponent card
  COUNTER_PEEK_COST_SOL: 0.01, // x402 cost for counter-peek response
  LEASE_ROUNDS: 3, // default Steal-Lease duration (duels before auto-return)
  IMPRINT_BP_CAP: 1, // max BP bonus a Veteran Imprint can grant
  SEASON_LEGENDARY_CAP: 40, // total Legendaries mintable in Season 1 (10 per species × 4)
  COMMON_SPECIES_COUNT: 30, // distinct Common species (unlimited mint)
});
