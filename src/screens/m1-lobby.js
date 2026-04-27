// src/screens/m1-lobby.js — M1 Main Lobby · Crown Plaza
// Navigation hub after wallet connect.
// mount(container, { pubkey, spectator? }) / unmount(container)

const CLANS = [
  { id: 'black-flag',    label: 'BLACK FLAG',    color: 'var(--clan-black-flag)',    text: '#6a9fd8' },
  { id: 'hollow-blade',  label: 'HOLLOW BLADE',  color: 'var(--clan-hollow-blade)',  text: '#e05070' },
  { id: 'iron-circle',   label: 'IRON CIRCLE',   color: 'var(--clan-iron-circle)',   text: '#5ab87a' },
  { id: 'bourse',        label: 'BOURSE',         color: 'var(--clan-bourse)',         text: '#c9a227' },
  { id: 'nameless-silk', label: 'NAMELESS SILK',  color: 'var(--clan-nameless-silk)', text: '#a070e0' },
];

const NAV_ITEMS = [
  { id: 'battle',   icon: '⚔', label: 'BATTLE',       event: 'nav:matchmaking', live: true  },
  { id: 'deck',     icon: '◈', label: 'DECK EDITOR',   event: 'nav:deck-editor', live: true  },
  { id: 'shop',     icon: '◆', label: 'BOURSE SHOP',   event: 'nav:shop',        live: false },
  { id: 'agent',    icon: '◎', label: 'AGENT HUB',     event: 'nav:agent',       live: false },
  { id: 'lore',     icon: '◇', label: 'LORE CATALOG',  event: 'nav:lore',        live: false },
  { id: 'settings', icon: '⚙', label: 'SETTINGS',      event: 'nav:settings',    live: false },
];

let _toastTimer = null;

export function mount(container, detail = {}) {
  injectStyle();
  const pubkey = detail.pubkey || '';
  container.innerHTML = buildHTML(pubkey);
  bindEvents(container);
}

export function unmount(container) {
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML(pubkey) {
  const truncated = pubkey.length >= 8
    ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`
    : (pubkey || '????...????');

  const navGrid = NAV_ITEMS.map(({ id, icon, label, event, live }) => `
    <button class="m1-nav-btn gba-btn${live ? '' : ' m1-nav-dim'}"
      data-event="${event}" data-live="${live}" aria-label="${label}">
      <span class="m1-nav-icon" aria-hidden="true">${icon}</span>
      <span class="m1-nav-label">${label}</span>
      ${!live ? '<span class="m1-nav-badge">S2</span>' : ''}
    </button>`).join('');

  const clanZones = CLANS.map(({ id, label, color, text }) => `
    <div class="m1-zone m1-zone--${id}" style="--zc:${color};--zt:${text};">
      <span class="m1-zone-label">${label}</span>
    </div>`).join('');

  return `
<div class="m1-root" role="main" aria-label="Crown Plaza lobby">
  <header class="m1-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost m1-back" id="m1-back" aria-label="Back to title">▸ TITLE</button>
    <div class="chip m1-location">THE CROWN PLAZA</div>
    <div class="m1-hud flex-row gap-8">
      <span class="chip m1-hud-chip">CARDS <span class="label-gold">47 / 60</span></span>
      <span class="chip m1-hud-chip">DAY <span class="label-gold">3 / 14</span></span>
      <span class="chip m1-hud-chip label-gold">SUCCESSION WAR</span>
    </div>
  </header>

  <div class="m1-body">
    <aside class="m1-map" aria-label="Crown Plaza map">
      <div class="m1-map-header"><span class="label-dim">◎ CROWN PLAZA</span></div>
      <div class="m1-zones">
        ${clanZones}
        <div class="m1-fountain" aria-hidden="true"><span class="m1-fountain-icon">❋</span></div>
      </div>
    </aside>
    <nav class="m1-nav" aria-label="Navigation">${navGrid}</nav>
  </div>

  <footer class="m1-footer">
    <span class="mono m1-pubkey" title="${pubkey}">${truncated}</span>
    <span class="sep">·</span><span class="label-dim">devnet</span>
    <span class="sep">·</span><span class="label-dim">SOLANA</span>
    <span class="m1-online label-dim">· ? ONLINE</span>
  </footer>

  <div class="m1-toast" id="m1-toast" aria-live="assertive" aria-hidden="true"></div>
</div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#m1-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title'));
  });

  container.querySelectorAll('.m1-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.live === 'true') {
        document.dispatchEvent(new CustomEvent(btn.dataset.event));
      } else {
        showToast(container, 'COMING IN SEASON 2');
      }
    });
  });
}

function showToast(container, message) {
  const toast = container.querySelector('#m1-toast');
  if (!toast) return;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  toast.textContent = message;
  toast.setAttribute('aria-hidden', 'false');
  toast.classList.add('m1-toast--visible');
  _toastTimer = setTimeout(() => {
    toast.classList.remove('m1-toast--visible');
    toast.setAttribute('aria-hidden', 'true');
    _toastTimer = null;
  }, 2000);
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-m1-lobby')) return;
  const el = document.createElement('style');
  el.id = 'style-m1-lobby';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.m1-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.m1-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.70); z-index: 10;
}
.m1-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.m1-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.m1-hud { flex-shrink: 0; }
.m1-hud-chip { white-space: nowrap; font-size: 14px; }

/* Body */
.m1-body { flex: 1; display: flex; min-height: 0; }

/* Map panel */
.m1-map {
  width: 320px; flex-shrink: 0; display: flex; flex-direction: column;
  border-right: var(--border-dim); background: var(--bg-mid);
}
.m1-map-header {
  height: 28px; flex-shrink: 0; display: flex; align-items: center;
  padding: 0 12px; border-bottom: var(--border-dim); font-size: 14px; letter-spacing: 0.08em;
}
.m1-zones {
  flex: 1; position: relative; display: grid;
  grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr);
  gap: 2px; padding: 8px; background: #0d1020;
}
.m1-zone {
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--zc) 28%, #0a0e1a);
  border: 1px solid color-mix(in srgb, var(--zc) 55%, transparent);
  padding: 6px 4px; transition: background 80ms;
}
.m1-zone:hover { background: color-mix(in srgb, var(--zc) 42%, #0a0e1a); }
.m1-zone-label { font-size: 13px; letter-spacing: 0.06em; color: var(--zt); white-space: nowrap; text-align: center; line-height: 1.2; }
.m1-fountain {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 36px; height: 36px; background: rgba(10,14,26,0.90); border: var(--border-gold);
  display: flex; align-items: center; justify-content: center; z-index: 2; pointer-events: none;
}
.m1-fountain-icon { color: var(--accent-gold); font-size: 18px; line-height: 1; }

/* Nav grid */
.m1-nav {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr);
  gap: 2px; padding: 8px; background: #0d1020;
}
.m1-nav-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 0; width: 100%; height: 100%;
  font-size: 15px; letter-spacing: 0.08em;
  background: var(--bg-mid); border: var(--border-dim); transition: background 80ms, border-color 80ms;
}
.m1-nav-btn:hover, .m1-nav-btn:focus-visible {
  background: var(--accent-gold); border-color: var(--accent-gold); color: var(--bg-deep); outline: none;
}
.m1-nav-dim { opacity: 0.60; }
.m1-nav-dim:hover, .m1-nav-dim:focus-visible {
  background: var(--bg-mid); border-color: var(--accent-gold); color: var(--text-cream); opacity: 0.85;
}
.m1-nav-icon { font-size: 28px; line-height: 1; }
.m1-nav-label { font-size: 15px; letter-spacing: 0.10em; white-space: nowrap; }
.m1-nav-badge { font-size: 11px; letter-spacing: 0.06em; color: var(--accent-red); opacity: 0.80; white-space: nowrap; }

/* Footer */
.m1-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; gap: 0; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; white-space: nowrap; z-index: 10;
}
.m1-pubkey { color: var(--text-dim); font-family: 'Courier New', monospace; font-size: 13px; }
.m1-online { margin-left: 4px; }

/* Toast */
.m1-toast {
  position: absolute; bottom: 56px; left: 50%; transform: translateX(-50%);
  background: var(--bg-deep); border: var(--border-gold); color: var(--accent-gold);
  font-family: var(--font-main); font-size: 20px; letter-spacing: 0.10em; padding: 8px 24px;
  pointer-events: none; opacity: 0; transition: opacity 200ms; white-space: nowrap; z-index: 20;
}
.m1-toast--visible { opacity: 1; }
`;
