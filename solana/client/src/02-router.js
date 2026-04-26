// 02-router.js — scene routing (DOM-based)
// All scene transitions go through enterScene(). Direct DOM manipulation is forbidden.

const SCENE_IDS_V2 = {
  TITLE:       'title',
  MENU:        'menu',
  LOBBY:       'lobby',
  DUEL:        'duel',
  DECK_EDITOR: 'deck_editor',
  SHOP:        'shop',
  AGENT:       'agent',
  LORE:        'lore',
  SETTINGS:    'settings',
  HOW_TO_PLAY: 'how_to_play',
  RESULT:      'result',
};

let _currentScene = null;
let _sceneInits = {};
let _sceneCleanups = {};

function registerScene(id, { init, cleanup } = {}) {
  if (init)     _sceneInits[id]    = init;
  if (cleanup)  _sceneCleanups[id] = cleanup;
}

function enterScene(sceneId, params = {}) {
  const valid = Object.values(SCENE_IDS_V2);
  if (!valid.includes(sceneId)) {
    console.error('[router] Invalid scene:', sceneId);
    enterScene('title');
    return;
  }

  // Cleanup current
  if (_currentScene) {
    const el = document.getElementById('scene-' + _currentScene);
    if (el) el.classList.remove('active');
    const cleanup = _sceneCleanups[_currentScene];
    if (cleanup) try { cleanup(); } catch(e) { console.warn('[router] cleanup error', e); }
  }

  // Pause/resume canvas loop
  if (sceneId === 'duel') {
    _duelCanvasActive = true;
    if (typeof initDuelCanvas === 'function') initDuelCanvas();
  } else {
    _duelCanvasActive = false;
  }

  // Show new scene
  const next = document.getElementById('scene-' + sceneId);
  if (!next) {
    console.error('[router] scene element not found: scene-' + sceneId);
    return;
  }
  next.classList.add('active');
  next.scrollTop = 0;
  _currentScene = sceneId;

  // Update legacy sc variable (used by canvas duel logic)
  if (typeof sc !== 'undefined') sc = (sceneId === 'duel') ? 'duel' : sceneId;

  // Init
  const init = _sceneInits[sceneId];
  if (init) try { init(params); } catch(e) { console.error('[router] init error for', sceneId, e); }
}

function currentSceneId() { return _currentScene; }

// ── Canvas loop gate ──────────────────────────────────────────────────────────
// The rAF loop (09-game-loop.js) checks this flag — canvas draw runs only in duel
let _duelCanvasActive = false;
function isDuelCanvasActive() { return _duelCanvasActive; }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = '', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' toast-' + type : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 300ms';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, duration);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Back buttons (delegated) ──────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-back]');
  if (btn) {
    const target = btn.dataset.back;
    enterScene(target);
  }
  // Menu grid cells
  const cell = e.target.closest('.menu-cell[data-scene]');
  if (cell) {
    enterScene(cell.dataset.scene);
  }
});
