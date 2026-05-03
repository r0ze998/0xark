// src/screens/s1-menu.js — S1 Captain's Cabin · Navigation Hub
// Central navigation backbone for all screens.
// mount(container, { pubkey? }) / unmount(container)

const NAV_ITEMS = [
  { id: 'battle',    icon: '⚔', label: 'BATTLE ARENA',  sub: 'Duel · ZK Commit',   event: 'nav:matchmaking', wave: 1 },
  { id: 'deck',      icon: '◈', label: 'DECK EDITOR',   sub: '60 Cards · 20 Slots', event: 'nav:deck-editor', wave: 1 },
  { id: 'shop',      icon: '◆', label: 'BOURSE SHOP',   sub: 'x402 · SOL Market',   event: 'nav:shop',        wave: 2 },
  { id: 'agent',     icon: '◎', label: 'AGENT HUB',     sub: 'AI Strategists',       event: 'nav:agent',       wave: 3 },
  { id: 'lore',      icon: '◇', label: 'LORE CATALOG',  sub: '60 Card Shards',       event: 'nav:lore',        wave: 3 },
  { id: 'howtoplay', icon: '?', label: 'HOW TO PLAY',   sub: 'Rules · Tutorial',     event: 'nav:howtoplay',   wave: 3 },
];

export function mount(container, detail = {}) {
  injectStyle();
  container.innerHTML = buildHTML(detail.pubkey || '');
  bindEvents(container);
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML(pubkey) {
  const truncated = pubkey.length >= 8
    ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`
    : (pubkey || '????...????');

  const grid = NAV_ITEMS.map(({ id, icon, label, sub, event, wave }) => `
    <button class="s1-nav-btn gba-btn" data-event="${event}"
      aria-label="${label}" data-wave="${wave}">
      <span class="s1-nav-icon" aria-hidden="true">${icon}</span>
      <span class="s1-nav-label">${label}</span>
      <span class="s1-nav-sub">${sub}</span>
    </button>`).join('');

  return `
<div class="s1-root" role="main" aria-label="Captain's Cabin navigation hub">

  <!-- Cabin atmosphere bg layers -->
  <div class="s1-bg-planks" aria-hidden="true"></div>
  <div class="s1-bg-lantern" aria-hidden="true"></div>

  <header class="s1-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s1-back" id="s1-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s1-location">CAPTAIN'S CABIN</div>
    <span class="chip s1-season label-dim">SEASON 1 · SUCCESSION WAR</span>
  </header>

  <div class="s1-body">
    <!-- Left panel: cabin flavor -->
    <aside class="s1-panel" aria-label="Cabin details">
      <div class="s1-panel-title label-gold">◎ ELYON HQ</div>
      <div class="s1-anchor-art" aria-hidden="true">
        <div class="s1-anchor">⚓</div>
      </div>
      <div class="s1-flavor">
        <p class="label-dim">Season 1 · Day 3 / 14</p>
        <p class="label-dim">Cards: 47 / 60</p>
        <p class="label-dim">Clan: BLACK FLAG</p>
      </div>
      <div class="s1-divider"></div>
      <div class="s1-status-list">
        <div class="s1-status-row">
          <span class="label-dim">BATTLES</span><span class="label-gold">12</span>
        </div>
        <div class="s1-status-row">
          <span class="label-dim">WINS</span><span class="label-gold">8</span>
        </div>
        <div class="s1-status-row">
          <span class="label-dim">WIN RATE</span><span class="label-gold">66%</span>
        </div>
        <div class="s1-status-row">
          <span class="label-dim">SOL EARNED</span><span class="label-gold">0.041</span>
        </div>
      </div>
    </aside>

    <!-- Right: nav grid -->
    <nav class="s1-nav" aria-label="Main navigation">
      ${grid}
    </nav>
  </div>

  <footer class="s1-footer">
    <span class="mono s1-pubkey">${truncated}</span>
    <span class="sep">·</span>
    <span class="label-dim">devnet</span>
    <span class="sep">·</span>
    <span class="label-dim">0xARK v4</span>
  </footer>
</div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s1-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });

  container.querySelectorAll('.s1-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent(btn.dataset.event));
    });
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s1-menu')) return;
  const el = document.createElement('style');
  el.id = 'style-s1-menu';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s1-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* BG layers */
.s1-bg-planks {
  position: absolute; inset: 0; pointer-events: none;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 47px,
      rgba(201,162,39,0.04) 47px,
      rgba(201,162,39,0.04) 49px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 119px,
      rgba(201,162,39,0.03) 119px,
      rgba(201,162,39,0.03) 121px
    );
}
.s1-bg-lantern {
  position: absolute; top: -80px; right: 340px; width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(201,162,39,0.07) 0%, transparent 70%);
  pointer-events: none;
}

/* Topbar */
.s1-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s1-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s1-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s1-season { font-size: 13px; flex-shrink: 0; }

/* Body */
.s1-body { flex: 1; display: flex; min-height: 0; }

/* Left panel */
.s1-panel {
  width: 260px; flex-shrink: 0;
  border-right: var(--border-dim); background: rgba(26,31,51,0.60);
  display: flex; flex-direction: column; padding: 16px 16px 12px;
  gap: 10px;
}
.s1-panel-title { font-size: 17px; letter-spacing: 0.10em; }
.s1-anchor-art {
  display: flex; align-items: center; justify-content: center;
  flex: 1; min-height: 0;
}
.s1-anchor {
  font-size: 80px; line-height: 1;
  opacity: 0.18; filter: sepia(1) hue-rotate(10deg);
}
.s1-flavor { display: flex; flex-direction: column; gap: 4px; }
.s1-flavor p { font-size: 15px; letter-spacing: 0.06em; }
.s1-divider { height: 1px; background: var(--border-dim); border: none; margin: 2px 0; border-top: 1px solid rgba(201,162,39,0.20); }
.s1-status-list { display: flex; flex-direction: column; gap: 6px; }
.s1-status-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 15px; letter-spacing: 0.06em;
}

/* Nav grid */
.s1-nav {
  flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 2px; padding: 8px; background: #090d1a;
}
.s1-nav-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 0; width: 100%; height: 100%;
  background: var(--bg-mid); border: var(--border-dim);
  transition: background 80ms, border-color 80ms;
}
.s1-nav-btn:hover, .s1-nav-btn:focus-visible {
  background: var(--accent-gold); border-color: var(--accent-gold);
  color: var(--bg-deep); outline: none;
}
.s1-nav-btn:hover .s1-nav-sub,
.s1-nav-btn:focus-visible .s1-nav-sub { color: var(--bg-deep); opacity: 0.70; }
.s1-nav-icon { font-size: 30px; line-height: 1; }
.s1-nav-label { font-size: 16px; letter-spacing: 0.10em; white-space: nowrap; }
.s1-nav-sub { font-size: 13px; letter-spacing: 0.04em; color: var(--text-dim); white-space: nowrap; }

/* Footer */
.s1-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; white-space: nowrap; z-index: 10;
}
.s1-pubkey { color: var(--text-dim); font-family: 'Courier New', monospace; font-size: 13px; }
`;
