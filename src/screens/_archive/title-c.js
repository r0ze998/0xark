// src/screens/title-c.js — Title C · Card-First
// Immersive card showcase title screen: spotlight on a rotating hero card.
// mount(container) / unmount(container)

const SHOWCASE_CARDS = [
  { name: 'PHANTOM PISTOL',  clan: 'black-flag',    type: 'ATK', sym: '⚔', atk: 7, def: 2, spd: 9,  rarity: 'RARE',      color: '#6a9fd8' },
  { name: "CROW'S EYE",       clan: 'black-flag',    type: 'SPY', sym: '◎', atk: 2, def: 3, spd: 10, rarity: 'COMMON',    color: '#6a9fd8' },
  { name: 'SILK VEIL',        clan: 'nameless-silk', type: 'SPY', sym: '◎', atk: 3, def: 4, spd: 9,  rarity: 'RARE',      color: '#a070e0' },
  { name: 'GOLD COMPASS',     clan: 'bourse',        type: 'REL', sym: '◈', atk: 0, def: 0, spd: 0,  rarity: 'RARE',      color: '#c9a227' },
  { name: "KING'S LAST GUARD",clan: 'royal',         type: 'REL', sym: '♛', atk: 4, def: 8, spd: 5,  rarity: 'LEGENDARY', color: '#d8b034' },
];

const CLAN_LABELS = {
  'black-flag':    'BLACK FLAG',
  'hollow-blade':  'HOLLOW BLADE',
  'iron-circle':   'IRON CIRCLE',
  'bourse':        'BOURSE',
  'nameless-silk': 'NAMELESS SILK',
  'royal':         'ROYAL INDEPENDENT',
};

const TYPE_COLORS = {
  ATK: '#d63b3b',
  DEF: '#4a90d9',
  SPY: '#a070e0',
  REL: '#c9a227',
};

const RARITY_COLOR = {
  COMMON: 'var(--text-dim)',
  UNCOMMON: '#5ab87a',
  RARE: '#4a90d9',
  LEGENDARY: '#d8b034',
};

let _cardIdx = 0;
let _rotator = null;

export function mount(container, detail = {}) {
  injectStyle();
  _cardIdx = 0;
  container.innerHTML = buildHTML();
  bindEvents(container);
  _rotator = setInterval(() => {
    _cardIdx = (_cardIdx + 1) % SHOWCASE_CARDS.length;
    refreshCard(container);
  }, 4000);
}

export function unmount(container) {
  if (_rotator) { clearInterval(_rotator); _rotator = null; }
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML() {
  const dots = SHOWCASE_CARDS.map((_, i) => `
    <button class="tc-dot${i === _cardIdx ? ' tc-dot--active' : ''}" data-idx="${i}"
      aria-label="Show card ${i + 1}"></button>`).join('');

  return `
<div class="tc-root" role="main" aria-label="Title C — Card-First">

  <!-- Background glow (updates per card) -->
  <div class="tc-bg-glow" id="tc-glow" aria-hidden="true"></div>
  <div class="tc-bg-grid" aria-hidden="true"></div>

  <!-- Left: Game info -->
  <section class="tc-info" aria-label="Game info">
    <div class="tc-game-title">0×ARK</div>
    <div class="tc-game-sub">SUCCESSION WAR<br>OF ELYON</div>
    <div class="tc-tech-stack">
      <div class="tc-tech-item"><span class="tc-tech-sym">⬡</span> ZK · Groth16</div>
      <div class="tc-tech-item"><span class="tc-tech-sym">◆</span> x402 · Payments</div>
      <div class="tc-tech-item"><span class="tc-tech-sym">◎</span> AI · Agents</div>
      <div class="tc-tech-item"><span class="tc-tech-sym">⚡</span> Solana · Fast</div>
    </div>
    <div class="tc-cta-group">
      <button class="gba-btn gba-btn--primary tc-play" id="tc-play" aria-label="Play now">
        ▸ PLAY NOW
      </button>
      <button class="gba-btn gba-btn--ghost tc-lore" id="tc-lore" aria-label="Lore catalog">
        ◇ VIEW CARDS
      </button>
    </div>
    <div class="tc-season-badge">
      <span class="label-dim" style="font-size:13px;">SEASON 1</span>
      <span class="label-gold" style="font-size:13px;">· 14 DAYS LEFT</span>
    </div>
  </section>

  <!-- Center: Card showcase -->
  <section class="tc-showcase" aria-label="Featured card">
    <div class="tc-card-frame" id="tc-card" aria-live="polite">
      ${renderCard()}
    </div>
    <div class="tc-dots" role="tablist" aria-label="Card selection">
      ${dots}
    </div>
    <div class="tc-nav-btns">
      <button class="gba-btn gba-btn--ghost tc-prev" id="tc-prev" aria-label="Previous card">◂</button>
      <button class="gba-btn gba-btn--ghost tc-next" id="tc-next" aria-label="Next card">▸</button>
    </div>
  </section>

  <!-- Right: Card detail panel -->
  <section class="tc-detail" id="tc-detail" aria-label="Card details">
    ${renderDetail()}
  </section>

  <!-- Bottom bar -->
  <div class="tc-bottombar">
    <span class="label-dim" style="font-size:13px;">0xARK · 60 Cards · 6 Clans · On-chain ZK TCG</span>
    <button class="gba-btn gba-btn--ghost tc-title-b" id="tc-title-b" style="font-size:13px;padding:2px 10px;margin-left:auto;">
      ◂ TITLE B
    </button>
    <button class="gba-btn gba-btn--ghost tc-title-a" id="tc-title-a" style="font-size:13px;padding:2px 10px;">
      ◂ TITLE A
    </button>
  </div>

</div>`;
}

function renderCard() {
  const card = SHOWCASE_CARDS[_cardIdx];
  const typeColor = TYPE_COLORS[card.type] ?? '#e8dfc8';
  const rarColor  = RARITY_COLOR[card.rarity] ?? 'var(--text-dim)';
  return `
    <div class="tc-card-inner" style="border-color:${card.color}88;background:rgba(0,0,0,0.70);">
      <div class="tc-card-header" style="background:${card.color}22;">
        <span class="tc-card-type" style="color:${typeColor};">${card.type}</span>
        <span class="tc-card-rarity" style="color:${rarColor};">${card.rarity}</span>
      </div>
      <div class="tc-card-art" style="border-color:${card.color}44;">
        <div class="tc-card-sym" style="color:${card.color};">${card.sym}</div>
      </div>
      <div class="tc-card-name" style="color:${card.color};">${card.name}</div>
      <div class="tc-card-clan label-dim">${CLAN_LABELS[card.clan] ?? card.clan.toUpperCase()}</div>
    </div>`;
}

function renderDetail() {
  const card = SHOWCASE_CARDS[_cardIdx];
  const typeColor = TYPE_COLORS[card.type] ?? '#e8dfc8';
  const rarColor  = RARITY_COLOR[card.rarity] ?? 'var(--text-dim)';

  const bar = (val, max, color) => {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return `<div class="tc-stat-bar"><div style="width:${pct}%;background:${color};height:100%;"></div></div>`;
  };

  return `
    <div class="tc-detail-inner">
      <div class="tc-det-title" style="color:${card.color};">${card.name}</div>
      <div class="tc-det-clan label-dim">${CLAN_LABELS[card.clan] ?? ''}</div>
      <div class="tc-det-rarity" style="color:${rarColor};">${card.rarity}</div>
      ${card.atk > 0 || card.def > 0 || card.spd > 0 ? `
        <div class="tc-det-stats">
          <div class="tc-stat-row">
            <span class="tc-stat-lbl label-dim">ATK</span>
            <span class="tc-stat-val" style="color:${TYPE_COLORS.ATK};">${card.atk}</span>
            ${bar(card.atk, 10, TYPE_COLORS.ATK)}
          </div>
          <div class="tc-stat-row">
            <span class="tc-stat-lbl label-dim">DEF</span>
            <span class="tc-stat-val" style="color:${TYPE_COLORS.DEF};">${card.def}</span>
            ${bar(card.def, 10, TYPE_COLORS.DEF)}
          </div>
          <div class="tc-stat-row">
            <span class="tc-stat-lbl label-dim">SPD</span>
            <span class="tc-stat-val" style="color:var(--accent-gold);">${card.spd}</span>
            ${bar(card.spd, 10, '#c9a227')}
          </div>
        </div>` : `<div class="label-dim" style="font-size:15px;margin-top:8px;">RELIC · Passive Effect</div>`}
      <button class="gba-btn gba-btn--ghost tc-view-lore" id="tc-view-lore"
        style="width:100%;justify-content:center;font-size:15px;margin-top:12px;"
        aria-label="View in lore catalog">
        ◇ VIEW IN CATALOG
      </button>
    </div>`;
}

function refreshCard(container) {
  const cardEl = container.querySelector('#tc-card');
  if (cardEl) cardEl.innerHTML = renderCard();
  const detEl = container.querySelector('#tc-detail');
  if (detEl) detEl.innerHTML = renderDetail();
  const glowEl = container.querySelector('#tc-glow');
  if (glowEl) {
    const c = SHOWCASE_CARDS[_cardIdx].color;
    glowEl.style.background = `radial-gradient(ellipse 50% 60% at 52% 45%, ${c}18 0%, transparent 70%)`;
  }
  container.querySelectorAll('.tc-dot').forEach(d => {
    const on = parseInt(d.dataset.idx, 10) === _cardIdx;
    d.classList.toggle('tc-dot--active', on);
  });
  // re-bind lore button
  const loreBtn = container.querySelector('#tc-view-lore');
  if (loreBtn) loreBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lore', { detail: { tab: SHOWCASE_CARDS[_cardIdx].clan } }));
  });
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#tc-play').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title'));
  });
  container.querySelector('#tc-lore').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lore'));
  });
  container.querySelector('#tc-title-a').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title'));
  });
  container.querySelector('#tc-title-b').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title-b'));
  });
  container.querySelector('#tc-prev').addEventListener('click', () => {
    if (_rotator) { clearInterval(_rotator); _rotator = null; }
    _cardIdx = (_cardIdx - 1 + SHOWCASE_CARDS.length) % SHOWCASE_CARDS.length;
    refreshCard(container);
  });
  container.querySelector('#tc-next').addEventListener('click', () => {
    if (_rotator) { clearInterval(_rotator); _rotator = null; }
    _cardIdx = (_cardIdx + 1) % SHOWCASE_CARDS.length;
    refreshCard(container);
  });
  container.querySelectorAll('.tc-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (_rotator) { clearInterval(_rotator); _rotator = null; }
      _cardIdx = parseInt(dot.dataset.idx, 10);
      refreshCard(container);
    });
  });
  const loreBtn = container.querySelector('#tc-view-lore');
  if (loreBtn) loreBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lore', { detail: { tab: SHOWCASE_CARDS[_cardIdx].clan } }));
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-title-c')) return;
  const el = document.createElement('style');
  el.id = 'style-title-c';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.tc-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: grid;
  grid-template-columns: 300px 1fr 260px;
  grid-template-rows: 1fr 36px;
  grid-template-areas: "info showcase detail" "bar bar bar";
}

.tc-bg-glow {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 50% 60% at 52% 45%, rgba(100,160,216,0.10) 0%, transparent 70%);
  transition: background 800ms ease;
}
.tc-bg-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    linear-gradient(rgba(201,162,39,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201,162,39,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Info section */
.tc-info {
  grid-area: info; position: relative; z-index: 1;
  display: flex; flex-direction: column; justify-content: center;
  padding: 24px 20px; gap: 16px;
  border-right: var(--border-dim); background: rgba(10,14,26,0.60);
}
.tc-game-title { font-size: 56px; letter-spacing: 0.06em; color: var(--accent-gold); line-height: 1; text-shadow: 0 0 16px rgba(201,162,39,0.35); }
.tc-game-sub { font-size: 15px; letter-spacing: 0.14em; color: var(--text-cream); line-height: 1.4; }
.tc-tech-stack { display: flex; flex-direction: column; gap: 4px; }
.tc-tech-item { font-size: 14px; letter-spacing: 0.06em; color: var(--text-dim); }
.tc-tech-sym { color: var(--accent-gold); }
.tc-cta-group { display: flex; flex-direction: column; gap: 6px; }
.tc-play { font-size: 20px; }
.tc-lore { font-size: 16px; }
.tc-season-badge { display: flex; gap: 4px; }

/* Showcase */
.tc-showcase {
  grid-area: showcase; position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 16px;
}
.tc-card-frame { width: 200px; height: 280px; }
.tc-card-inner {
  width: 100%; height: 100%; border: 2px solid;
  display: flex; flex-direction: column; overflow: hidden;
}
.tc-card-header {
  height: 32px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 8px;
}
.tc-card-type { font-size: 14px; letter-spacing: 0.08em; }
.tc-card-rarity { font-size: 12px; letter-spacing: 0.06em; }
.tc-card-art {
  flex: 1; display: flex; align-items: center; justify-content: center;
  border-top: 1px solid; border-bottom: 1px solid;
}
.tc-card-sym { font-size: 72px; line-height: 1; }
.tc-card-name { padding: 6px 8px 2px; font-size: 14px; letter-spacing: 0.06em; text-align: center; }
.tc-card-clan { padding: 0 8px 8px; font-size: 12px; text-align: center; }

.tc-dots { display: flex; gap: 8px; }
.tc-dot {
  width: 10px; height: 10px; border: 1px solid rgba(201,162,39,0.40);
  background: transparent; cursor: pointer; transition: background 120ms;
}
.tc-dot--active { background: var(--accent-gold); border-color: var(--accent-gold); }
.tc-nav-btns { display: flex; gap: 8px; }
.tc-prev, .tc-next { font-size: 18px; padding: 4px 14px; }

/* Detail panel */
.tc-detail {
  grid-area: detail; position: relative; z-index: 1;
  border-left: var(--border-dim); background: rgba(10,14,26,0.50);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.tc-detail-inner { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.tc-det-title { font-size: 18px; letter-spacing: 0.06em; line-height: 1.2; }
.tc-det-clan { font-size: 14px; }
.tc-det-rarity { font-size: 15px; }
.tc-det-stats { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.tc-stat-row { display: flex; align-items: center; gap: 6px; }
.tc-stat-lbl { font-size: 14px; width: 30px; flex-shrink: 0; }
.tc-stat-val { font-size: 18px; width: 22px; flex-shrink: 0; text-align: right; }
.tc-stat-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08); overflow: hidden; }

/* Bottom bar */
.tc-bottombar {
  grid-area: bar; display: flex; align-items: center;
  padding: 0 12px; gap: 6px; border-top: var(--border-dim);
  background: rgba(3,6,15,0.80); z-index: 1; font-size: 13px;
}
`;
