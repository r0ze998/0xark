// 11-save-init.js — save/load + game bootstrap (v2 DOM-based)
// Saves player vault and deck. Bootstraps to title scene via router.

const SAVE_KEY = 'oxark_save_v2';

function saveGame() {
  try {
    const vault = pl && pl[0] && pl[0].vault
      ? [...(pl[0].vault instanceof Set ? pl[0].vault : [])]
      : [];
    const deck = pl && pl[0] && pl[0].deckIndices ? pl[0].deckIndices : [];
    const data = {
      vault,
      deck,
      walletAddress: walletPublicKey || null,
      seasonStartTime: typeof seasonStartTime !== 'undefined' ? seasonStartTime : null,
      seasonEndTime:   typeof seasonEndTime   !== 'undefined' ? seasonEndTime   : null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (d.vault && pl && pl[0]) {
      pl[0].vault = new Set(d.vault);
      pl[0].cc = pl[0].vault.size;
    }
    if (d.deck && pl && pl[0]) pl[0].deckIndices = d.deck;
    if (d.walletAddress) walletPublicKey = d.walletAddress;
    if (d.seasonStartTime) {
      if (typeof seasonStartTime !== 'undefined') seasonStartTime = d.seasonStartTime;
      if (typeof seasonEndTime   !== 'undefined') seasonEndTime   = d.seasonEndTime || d.seasonStartTime;
    }
    return true;
  } catch(e) { return false; }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch(e) { return false; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

// ── Stubs for Phase C functions not defined in loaded modules ────────────────
// Functions already defined in loaded modules are NOT stubbed here to avoid
// duplicate-declaration collisions (checked by lint-bundle.test.js).
function initFog() {}
function initOnboard() {}
function drawWalletHUD() {}
function drawOnboardPrompt() {}
function drawTownHint() {}
function drawTownShopModal() {}
function drawIntroTutorial() {}
function drawTitleOptionsOverlay() {}
function drawSynergyBanner() {}
function drawLandmarkBanner() {}
function drawMinimap() {}
function drawExplorationProgress() {}
function drawTutorialStepOverlay() {}
function drawToasts() {}
function drawFishingOverlay() {}
function drawPuzzlePillars() {}
function drawPuzzleMessage() {}
function drawObjectInteractMsg() {}
function drawFountainDialog() {}
function drawMapCardUseOverlay() {}
function drawCardAcquisition() {}
function drawDiscardOverlay() {}
function drawMarketplace() {}
function drawSynthesisShop() {}
function drawTutorialMsg() {}
function tryMovePlayer() { return false; }
function checkTreasure() {}
function tryWildEncounter() {}
function checkTownInteractable() {}
function dTitle() {}
function dSplash() {}
function dMap() {}
function dMenu() {}
function dLobby() {}
function dCrd() {}
function drawCardDetailPanel() {}
function dLog() {}
function dStats() {}
function dVictory() {}
function dGameOver() {}
function drawBuildingInterior() {}
function drawVictoryScene() {}
function drawCardDetailScene() {}
function drawCardStorageScene() {}
function updateAmbient() {}
function updateRivalAI() {}
function updateFootprints() {}
function updateRivalActivity() {}
function updateProximityTension() {}
function updateNPCWander() {}
function updateTownWeather() {}
function updateFishing() {}
function updateBanner() {}
function sfxDangerAlert() {}
function sfxCursor() {}
function sfxConfirm() {}
function sfxBack() {}
function resumeAudio() {}
function setSfxVolume() {}
function setMusicVolume() {}
function x402CheckServer() {}
function x402PushState() {}
function lobbyFindMatch() {}

// ── Load saved game ───────────────────────────────────────────────────────────
loadGame();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Start rAF loop (canvas, used by duel)
requestAnimationFrame(loop);

// Show title scene via DOM router
(function() {
  function startApp() {
    if (typeof enterScene === 'function') {
      enterScene('title');
    } else {
      setTimeout(startApp, 50);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
