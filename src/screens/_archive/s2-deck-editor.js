// src/screens/s2-deck-editor.js — S2 Deck Editor
// 60-card collection management and 20-slot active deck builder.
// mount(container, { pubkey? }) / unmount(container)

const CLAN_TEXT = {
  'black-flag':    '#6a9fd8',
  'hollow-blade':  '#e05070',
  'iron-circle':   '#5ab87a',
  'bourse':        '#c9a227',
  'nameless-silk': '#a070e0',
};

const CLAN_LABELS = {
  'black-flag':    'BF',
  'hollow-blade':  'HB',
  'iron-circle':   'IC',
  'bourse':        'BO',
  'nameless-silk': 'NS',
};

const ALL_CARDS = [
  { id: 'c01', name: 'PHANTOM PISTOL',   type: 'ATK', clan: 'black-flag',    sym: '⚔' },
  { id: 'c02', name: "CROW'S EYE",        type: 'SPY', clan: 'black-flag',    sym: '◎' },
  { id: 'c03', name: 'ANCHOR SHIELD',    type: 'DEF', clan: 'hollow-blade',  sym: '🛡' },
  { id: 'c04', name: 'IRON FIST',        type: 'ATK', clan: 'iron-circle',   sym: '⚔' },
  { id: 'c05', name: 'SILK VEIL',        type: 'SPY', clan: 'nameless-silk', sym: '◎' },
  { id: 'c06', name: 'GOLD COMPASS',     type: 'REL', clan: 'bourse',        sym: '◈' },
  { id: 'c07', name: 'SHADOW CLOAK',     type: 'SPY', clan: 'hollow-blade',  sym: '◎' },
  { id: 'c08', name: 'BONE BUCKLER',     type: 'DEF', clan: 'iron-circle',   sym: '🛡' },
  { id: 'c09', name: 'TIDE CANNON',      type: 'ATK', clan: 'black-flag',    sym: '⚔' },
  { id: 'c10', name: 'WHISPER NET',      type: 'SPY', clan: 'nameless-silk', sym: '◎' },
  { id: 'c11', name: 'MERCHANT LEDGER',  type: 'REL', clan: 'bourse',        sym: '◈' },
  { id: 'c12', name: 'BARRICADE',        type: 'DEF', clan: 'iron-circle',   sym: '🛡' },
  { id: 'c13', name: 'CUTLASS STRIKE',   type: 'ATK', clan: 'hollow-blade',  sym: '⚔' },
  { id: 'c14', name: 'MIRROR GLASS',     type: 'SPY', clan: 'nameless-silk', sym: '◎' },
  { id: 'c15', name: 'VAULT KEY',        type: 'REL', clan: 'bourse',        sym: '◈' },
  { id: 'c16', name: 'POWDER CHARGE',    type: 'ATK', clan: 'black-flag',    sym: '⚔' },
  { id: 'c17', name: 'IRON WALL',        type: 'DEF', clan: 'iron-circle',   sym: '🛡' },
  { id: 'c18', name: 'DUSK MANTLE',      type: 'SPY', clan: 'nameless-silk', sym: '◎' },
  { id: 'c19', name: 'HULL BRACE',       type: 'DEF', clan: 'hollow-blade',  sym: '🛡' },
  { id: 'c20', name: 'CORSAIR BLADE',    type: 'ATK', clan: 'black-flag',    sym: '⚔' },
];

const TYPE_FILTERS = ['ALL', 'ATK', 'DEF', 'SPY', 'REL'];
const CLAN_FILTERS = [
  { id: 'all',           label: 'ALL'  },
  { id: 'black-flag',    label: 'B.FLAG' },
  { id: 'hollow-blade',  label: 'H.BLADE' },
  { id: 'iron-circle',   label: 'I.CIRCLE' },
  { id: 'bourse',        label: 'BOURSE' },
  { id: 'nameless-silk', label: 'N.SILK' },
];

const MAX_DECK = 20;

let _activeType = 'ALL';
let _activeClan = 'all';
let _deck = [];      // array of card ids

export function mount(container, detail = {}) {
  injectStyle();
  _activeType = 'ALL';
  _activeClan = 'all';
  _deck = [];
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

  const typeFilters = TYPE_FILTERS.map(t => `
    <button class="s2-filter-btn gba-btn gba-btn--ghost${_activeType === t ? ' is-active' : ''}"
      data-type="${t}" aria-pressed="${_activeType === t}">${t}</button>`).join('');

  const clanFilters = CLAN_FILTERS.map(({ id, label }) => `
    <button class="s2-filter-btn s2-filter-clan gba-btn gba-btn--ghost${_activeClan === id ? ' is-active' : ''}"
      data-clan="${id}" aria-pressed="${_activeClan === id}">${label}</button>`).join('');

  return `
<div class="s2-root" role="main" aria-label="Deck Editor">

  <header class="s2-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s2-back" id="s2-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s2-location">DECK EDITOR</div>
    <div class="s2-hud flex-row gap-8">
      <span class="chip">COLLECTION <span class="label-gold">${ALL_CARDS.length}</span></span>
      <span class="chip s2-deck-count">DECK <span class="label-gold" id="s2-deck-sz">0</span> / ${MAX_DECK}</span>
    </div>
  </header>

  <div class="s2-body">

    <!-- Left: Collection panel -->
    <section class="s2-collection" aria-label="Card collection">
      <div class="s2-col-header">
        <span class="label-dim" style="font-size:14px;">COLLECTION</span>

        <!-- Hero placeholder: Vega (small corner) -->
        <div class="s2-hero-vega" aria-hidden="true">
          <div class="s2-hero-ph">
            <span class="s2-hero-ph-label">VEGA</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="s2-filters-row">
        ${typeFilters}
      </div>
      <div class="s2-filters-row s2-filters-clan">
        ${clanFilters}
      </div>

      <!-- Card grid -->
      <div class="s2-col-grid" id="s2-col-grid" role="list" aria-label="Collection cards">
        ${renderCollectionGrid()}
      </div>
    </section>

    <!-- Right: Deck panel -->
    <section class="s2-deck-panel" aria-label="Active deck">
      <div class="s2-deck-header">
        <span class="label-dim" style="font-size:14px;">ACTIVE DECK</span>
        <!-- Hero placeholder: Blade Marshal -->
        <div class="s2-hero-blade" aria-hidden="true">
          <div class="s2-hero-ph s2-hero-ph--blade">
            <span class="s2-hero-ph-label">BLADE MARSHAL</span>
          </div>
        </div>
      </div>

      <div class="s2-deck-grid" id="s2-deck-grid" role="list" aria-label="Deck slots">
        ${renderDeckSlots()}
      </div>

      <!-- Deck stats -->
      <div class="s2-deck-stats" id="s2-deck-stats">
        ${renderDeckStats()}
      </div>

      <!-- Save -->
      <button class="gba-btn gba-btn--primary s2-save-btn" id="s2-save" disabled aria-label="Save deck (TBD)">
        SAVE DECK · TBD
      </button>
    </section>

  </div>

  <footer class="s2-footer">
    <span class="mono" style="color:var(--text-dim);font-family:'Courier New',monospace;font-size:13px;">${truncated}</span>
    <span class="sep">·</span>
    <span class="label-dim">Click card to add · Click deck slot to remove</span>
    <span class="sep">·</span>
    <button class="gba-btn gba-btn--ghost" id="s2-menu" style="font-size:13px;padding:2px 8px;">≡ CABIN</button>
  </footer>

</div>`;
}

/* ── Render helpers ──────────────────────────────────────────── */
function filteredCards() {
  return ALL_CARDS.filter(c => {
    if (_activeType !== 'ALL' && c.type !== _activeType) return false;
    if (_activeClan !== 'all' && c.clan !== _activeClan) return false;
    return true;
  });
}

function renderCollectionGrid() {
  return filteredCards().map(c => {
    const inDeck = _deck.includes(c.id);
    const color = CLAN_TEXT[c.clan] ?? '#e8dfc8';
    return `
      <div class="s2-col-card${inDeck ? ' s2-col-card--in-deck' : ''}"
        role="listitem" data-id="${c.id}" tabindex="0"
        aria-label="${c.name} ${inDeck ? '(in deck)' : '(click to add)'}"
        style="--cc:${color};">
        <div class="s2-cc-type">${c.type}</div>
        <div class="s2-cc-sym">${c.sym}</div>
        <div class="s2-cc-name">${c.name}</div>
        <div class="s2-cc-clan">${CLAN_LABELS[c.clan] ?? ''}</div>
        ${inDeck ? '<div class="s2-cc-check">✓</div>' : ''}
      </div>`;
  }).join('');
}

function renderDeckSlots() {
  const slots = [];
  for (let i = 0; i < MAX_DECK; i++) {
    const id = _deck[i];
    if (id) {
      const card = ALL_CARDS.find(c => c.id === id);
      const color = card ? (CLAN_TEXT[card.clan] ?? '#e8dfc8') : '#e8dfc8';
      slots.push(`
        <div class="s2-deck-slot s2-deck-slot--filled" role="listitem"
          data-slot="${i}" tabindex="0"
          aria-label="${card ? card.name : 'Card'} (click to remove)"
          style="--cc:${color};">
          <span class="s2-ds-sym">${card ? card.sym : '?'}</span>
          <span class="s2-ds-name">${card ? card.name : ''}</span>
        </div>`);
    } else {
      slots.push(`
        <div class="s2-deck-slot s2-deck-slot--empty" role="listitem" data-slot="${i}"
          aria-label="Empty slot ${i + 1}">
          <span class="s2-ds-num">${i + 1}</span>
        </div>`);
    }
  }
  return slots.join('');
}

function renderDeckStats() {
  const counts = { ATK: 0, DEF: 0, SPY: 0, REL: 0 };
  _deck.forEach(id => {
    const c = ALL_CARDS.find(x => x.id === id);
    if (c) counts[c.type] = (counts[c.type] || 0) + 1;
  });
  return `
    <div class="s2-stat"><span class="label-dim">ATK</span><span class="label-gold">${counts.ATK}</span></div>
    <div class="s2-stat"><span class="label-dim">DEF</span><span class="label-gold">${counts.DEF}</span></div>
    <div class="s2-stat"><span class="label-dim">SPY</span><span class="label-gold">${counts.SPY}</span></div>
    <div class="s2-stat"><span class="label-dim">REL</span><span class="label-gold">${counts.REL}</span></div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s2-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s2-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  // Type filters
  container.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeType = btn.dataset.type;
      container.querySelectorAll('[data-type]').forEach(b => {
        const on = b.dataset.type === _activeType;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      refreshCollection(container);
    });
  });

  // Clan filters
  container.querySelectorAll('[data-clan]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeClan = btn.dataset.clan;
      container.querySelectorAll('[data-clan]').forEach(b => {
        const on = b.dataset.clan === _activeClan;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      refreshCollection(container);
    });
  });

  // Collection card click: add to deck
  container.querySelector('#s2-col-grid').addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    if (_deck.includes(id)) return;
    if (_deck.length >= MAX_DECK) return;
    _deck.push(id);
    refreshAll(container);
  });

  // Deck slot click: remove from deck
  container.querySelector('#s2-deck-grid').addEventListener('click', e => {
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    const idx = parseInt(slot.dataset.slot, 10);
    if (_deck[idx] !== undefined) {
      _deck.splice(idx, 1);
      refreshAll(container);
    }
  });
}

function refreshAll(container) {
  refreshCollection(container);
  const dg = container.querySelector('#s2-deck-grid');
  if (dg) dg.innerHTML = renderDeckSlots();
  const ds = container.querySelector('#s2-deck-stats');
  if (ds) ds.innerHTML = renderDeckStats();
  const sz = container.querySelector('#s2-deck-sz');
  if (sz) sz.textContent = _deck.length;
  const save = container.querySelector('#s2-save');
  if (save) save.disabled = _deck.length < MAX_DECK;
}

function refreshCollection(container) {
  const grid = container.querySelector('#s2-col-grid');
  if (grid) grid.innerHTML = renderCollectionGrid();
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s2-deck-editor')) return;
  const el = document.createElement('style');
  el.id = 'style-s2-deck-editor';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s2-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

.s2-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s2-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s2-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s2-hud { flex-shrink: 0; }
.s2-deck-count { white-space: nowrap; font-size: 14px; }

.s2-body { flex: 1; display: flex; min-height: 0; }

/* Collection */
.s2-collection {
  width: 440px; flex-shrink: 0; display: flex; flex-direction: column;
  border-right: var(--border-dim); background: rgba(10,14,26,0.60);
  overflow: hidden; padding: 8px 8px 0;
}
.s2-col-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px; flex-shrink: 0;
}
.s2-filters-row {
  display: flex; gap: 3px; flex-shrink: 0; flex-wrap: wrap; margin-bottom: 4px;
}
.s2-filter-btn { font-size: 13px; padding: 2px 8px; }
.s2-filters-clan { margin-bottom: 6px; }

.s2-col-grid {
  flex: 1; overflow-y: auto; display: grid;
  grid-template-columns: repeat(5, 1fr); gap: 4px; align-content: start;
  padding-bottom: 6px;
}
.s2-col-grid::-webkit-scrollbar { width: 3px; }
.s2-col-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.s2-col-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; padding: 4px 2px; background: var(--bg-mid);
  border: 1px solid color-mix(in srgb, var(--cc, #e8dfc8) 30%, transparent);
  cursor: pointer; transition: background 80ms, border-color 80ms;
  min-height: 70px; position: relative;
}
.s2-col-card:hover, .s2-col-card:focus-visible {
  background: color-mix(in srgb, var(--cc, #e8dfc8) 18%, var(--bg-deep));
  border-color: var(--cc, #e8dfc8); outline: none;
}
.s2-col-card--in-deck { opacity: 0.45; cursor: default; }
.s2-col-card--in-deck:hover { background: var(--bg-mid); border-color: color-mix(in srgb, var(--cc, #e8dfc8) 30%, transparent); }
.s2-cc-type { font-size: 10px; letter-spacing: 0.06em; color: var(--cc, #e8dfc8); }
.s2-cc-sym  { font-size: 18px; line-height: 1; }
.s2-cc-name { font-size: 9px; letter-spacing: 0.02em; text-align: center; line-height: 1.2; color: var(--text-dim); }
.s2-cc-clan { font-size: 9px; color: var(--cc, #e8dfc8); letter-spacing: 0.04em; }
.s2-cc-check {
  position: absolute; top: 2px; right: 3px; font-size: 11px; color: var(--accent-gold); line-height: 1;
}

/* Hero placeholders */
.s2-hero-vega, .s2-hero-blade { flex-shrink: 0; }
.s2-hero-ph {
  width: 40px; height: 60px;
  background: rgba(201,162,39,0.06); border: 1px dashed rgba(201,162,39,0.25);
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;
}
.s2-hero-ph--blade {
  background: rgba(201,162,39,0.06); border-color: rgba(201,162,39,0.20);
}
.s2-hero-ph-label { font-size: 7px; letter-spacing: 0.02em; color: rgba(201,162,39,0.40); text-align: center; }

/* Deck panel */
.s2-deck-panel {
  flex: 1; display: flex; flex-direction: column;
  padding: 8px 8px 0; overflow: hidden;
}
.s2-deck-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px; flex-shrink: 0;
}
.s2-deck-grid {
  flex: 1; display: grid;
  grid-template-columns: repeat(5, 1fr); gap: 3px; align-content: start;
  overflow-y: auto; margin-bottom: 6px;
}
.s2-deck-grid::-webkit-scrollbar { width: 3px; }
.s2-deck-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.20); }

.s2-deck-slot {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; padding: 4px 2px; min-height: 60px;
  border: 1px solid; transition: background 80ms;
}
.s2-deck-slot--empty {
  border-color: rgba(201,162,39,0.12); background: rgba(201,162,39,0.04);
}
.s2-deck-slot--filled {
  border-color: color-mix(in srgb, var(--cc, #e8dfc8) 45%, transparent);
  background: color-mix(in srgb, var(--cc, #e8dfc8) 8%, var(--bg-deep));
  cursor: pointer;
}
.s2-deck-slot--filled:hover, .s2-deck-slot--filled:focus-visible {
  background: rgba(214,59,59,0.15); border-color: var(--accent-red); outline: none;
}
.s2-ds-num { font-size: 13px; color: var(--text-dim); }
.s2-ds-sym { font-size: 16px; line-height: 1; }
.s2-ds-name { font-size: 8px; text-align: center; color: var(--text-dim); letter-spacing: 0.02em; }

/* Deck stats */
.s2-deck-stats {
  display: flex; gap: 12px; padding: 4px 0; flex-shrink: 0; border-top: var(--border-dim);
  border-bottom: var(--border-dim); margin-bottom: 6px;
}
.s2-stat { display: flex; gap: 6px; font-size: 15px; }

/* Save */
.s2-save-btn { width: 100%; justify-content: center; font-size: 18px; flex-shrink: 0; margin-bottom: 4px; }

/* Footer */
.s2-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 13px; gap: 0; white-space: nowrap; z-index: 10;
}
`;
