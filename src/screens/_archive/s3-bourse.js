// src/screens/s3-bourse.js — S3 Bourse Shop · Card Marketplace
// x402 payment integration — server endpoint TBD.
// mount(container, { pubkey? }) / unmount(container)

const CATEGORIES = [
  { id: 'all',     label: 'ALL CARDS' },
  { id: 'atk',     label: 'WEAPONS'   },
  { id: 'def',     label: 'SHIELDS'   },
  { id: 'spy',     label: 'SCOUTS'    },
  { id: 'special', label: 'RELICS'    },
];

const LISTINGS = [
  { name: 'PHANTOM PISTOL',  type: 'ATK', clan: 'black-flag',    price: 0.012, symbol: '⚔', cat: 'atk'     },
  { name: "CROW'S EYE",      type: 'SPY', clan: 'black-flag',    price: 0.008, symbol: '◎', cat: 'spy'     },
  { name: 'ANCHOR SHIELD',   type: 'DEF', clan: 'hollow-blade',  price: 0.009, symbol: '🛡', cat: 'def'     },
  { name: 'IRON FIST',       type: 'ATK', clan: 'iron-circle',   price: 0.015, symbol: '⚔', cat: 'atk'     },
  { name: 'SILK VEIL',       type: 'SPY', clan: 'nameless-silk', price: 0.011, symbol: '◎', cat: 'spy'     },
  { name: 'GOLD COMPASS',    type: 'REL', clan: 'bourse',        price: 0.022, symbol: '◈', cat: 'special' },
  { name: 'SHADOW CLOAK',    type: 'SPY', clan: 'hollow-blade',  price: 0.007, symbol: '◎', cat: 'spy'     },
  { name: 'BONE BUCKLER',    type: 'DEF', clan: 'iron-circle',   price: 0.010, symbol: '🛡', cat: 'def'     },
  { name: 'TIDE CANNON',     type: 'ATK', clan: 'black-flag',    price: 0.018, symbol: '⚔', cat: 'atk'     },
  { name: 'WHISPER NET',     type: 'SPY', clan: 'nameless-silk', price: 0.013, symbol: '◎', cat: 'spy'     },
  { name: 'MERCHANT LEDGER', type: 'REL', clan: 'bourse',        price: 0.031, symbol: '◈', cat: 'special' },
  { name: 'BARRICADE',       type: 'DEF', clan: 'iron-circle',   price: 0.006, symbol: '🛡', cat: 'def'     },
];

const CLAN_TEXT = {
  'black-flag':    '#6a9fd8',
  'hollow-blade':  '#e05070',
  'iron-circle':   '#5ab87a',
  'bourse':        '#c9a227',
  'nameless-silk': '#a070e0',
};

let _activeCat = 'all';

export function mount(container, detail = {}) {
  injectStyle();
  _activeCat = 'all';
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

  const cats = CATEGORIES.map(({ id, label }) => `
    <button class="s3-cat-btn gba-btn gba-btn--ghost${id === _activeCat ? ' is-active' : ''}"
      data-cat="${id}" aria-pressed="${id === _activeCat}">${label}</button>`).join('');

  return `
<div class="s3-root" role="main" aria-label="Bourse Shop marketplace">

  <header class="s3-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s3-back" id="s3-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s3-location">THE BOURSE SHOP</div>
    <div class="s3-hud flex-row gap-8">
      <span class="chip">BALANCE <span class="label-gold">0.041 SOL</span></span>
      <span class="chip s3-x402-badge">x402 · TBD</span>
    </div>
  </header>

  <div class="s3-body">

    <!-- Left sidebar -->
    <aside class="s3-sidebar" aria-label="Shop sidebar">
      <div class="s3-sidebar-title label-gold">CATEGORIES</div>
      <nav class="s3-cats" aria-label="Card categories">
        ${cats}
      </nav>

      <div class="s3-divider"></div>

      <div class="s3-price-filter">
        <div class="label-dim" style="font-size:14px;margin-bottom:6px;">PRICE RANGE</div>
        <div class="flex-row gap-8">
          <span class="chip" style="font-size:13px;">0.000</span>
          <span class="label-dim">—</span>
          <span class="chip" style="font-size:13px;">0.050</span>
        </div>
      </div>

      <div class="s3-divider"></div>

      <!-- Hero placeholder: Blade Marshal -->
      <div class="s3-hero-wrap" aria-hidden="true">
        <div class="s3-hero-placeholder">
          <span class="s3-hero-label">BLADE MARSHAL</span>
        </div>
      </div>
    </aside>

    <!-- Card grid -->
    <section class="s3-main" aria-label="Card listings">
      <div class="s3-grid-header flex-row gap-8">
        <span class="label-dim" style="font-size:14px;">LISTINGS</span>
        <span class="s3-count label-gold" id="s3-count">${LISTINGS.length}</span>
        <span class="label-dim" style="font-size:14px;margin-left:auto;">SORT: PRICE ↑</span>
      </div>
      <div class="s3-grid" id="s3-grid" role="list" aria-label="Available cards">
        ${renderGrid('all')}
      </div>
    </section>

  </div>

  <footer class="s3-footer">
    <span class="mono" style="color:var(--text-dim);font-family:'Courier New',monospace;font-size:13px;">${truncated}</span>
    <span class="sep">·</span>
    <span class="label-dim">x402 endpoint · TBD (Fly.io deploy pending)</span>
    <span class="sep">·</span>
    <button class="gba-btn gba-btn--ghost s3-menu-btn" id="s3-menu" style="font-size:13px;padding:2px 8px;">≡ CABIN</button>
  </footer>

</div>`;
}

function renderGrid(cat) {
  const items = cat === 'all' ? LISTINGS : LISTINGS.filter(l => l.cat === cat);
  return items.map(({ name, type, clan, price, symbol }) => {
    const color = CLAN_TEXT[clan] ?? '#e8dfc8';
    return `
      <div class="s3-card-item" role="listitem" aria-label="${name} ${price} SOL">
        <div class="s3-card-visual" style="border-color:${color}22;">
          <div class="s3-card-type" style="color:${color};">${type}</div>
          <div class="s3-card-sym">${symbol}</div>
          <div class="s3-card-name">${name}</div>
        </div>
        <div class="s3-card-price label-gold">${price.toFixed(3)} SOL</div>
        <button class="gba-btn s3-buy-btn" disabled aria-label="Buy ${name}" title="x402 endpoint TBD">
          BUY · x402
        </button>
      </div>`;
  }).join('');
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s3-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s3-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  container.querySelectorAll('.s3-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeCat = btn.dataset.cat;
      container.querySelectorAll('.s3-cat-btn').forEach(b => {
        const active = b.dataset.cat === _activeCat;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      const grid = container.querySelector('#s3-grid');
      const count = container.querySelector('#s3-count');
      if (grid) grid.innerHTML = renderGrid(_activeCat);
      if (count) {
        const n = _activeCat === 'all' ? LISTINGS.length : LISTINGS.filter(l => l.cat === _activeCat).length;
        count.textContent = n;
      }
    });
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s3-bourse')) return;
  const el = document.createElement('style');
  el.id = 'style-s3-bourse';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s3-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

.s3-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s3-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s3-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s3-hud { flex-shrink: 0; }
.s3-x402-badge {
  font-size: 13px; letter-spacing: 0.06em;
  color: var(--accent-gold); border-color: var(--accent-gold);
  background: rgba(201,162,39,0.08);
}

.s3-body { flex: 1; display: flex; min-height: 0; }

/* Sidebar */
.s3-sidebar {
  width: 200px; flex-shrink: 0;
  border-right: var(--border-dim); background: rgba(26,31,51,0.50);
  display: flex; flex-direction: column; padding: 12px 10px; gap: 8px;
}
.s3-sidebar-title { font-size: 14px; letter-spacing: 0.10em; }
.s3-cats { display: flex; flex-direction: column; gap: 3px; }
.s3-cat-btn { font-size: 14px; padding: 4px 10px; text-align: left; justify-content: flex-start; }
.s3-price-filter { display: flex; flex-direction: column; gap: 4px; }
.s3-divider { height: 1px; border-top: 1px solid rgba(201,162,39,0.15); margin: 2px 0; }

/* Hero placeholder */
.s3-hero-wrap { flex: 1; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px; }
.s3-hero-placeholder {
  width: 72px; height: 108px;
  background: rgba(201,162,39,0.06); border: 1px dashed rgba(201,162,39,0.25);
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px;
}
.s3-hero-label { font-size: 10px; letter-spacing: 0.04em; color: rgba(201,162,39,0.40); text-align: center; }

/* Main grid area */
.s3-main {
  flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden;
  padding: 8px 10px;
}
.s3-grid-header { height: 28px; flex-shrink: 0; margin-bottom: 6px; font-size: 14px; }
.s3-count { font-size: 16px; }
.s3-grid {
  flex: 1; overflow-y: auto; display: grid;
  grid-template-columns: repeat(4, 1fr); gap: 6px; align-content: start;
}
.s3-grid::-webkit-scrollbar { width: 4px; }
.s3-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.30); }

.s3-card-item {
  display: flex; flex-direction: column; gap: 4px;
  background: var(--bg-mid); border: var(--border-dim); padding: 6px;
}
.s3-card-visual {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 6px 4px; border: 1px solid; min-height: 80px;
}
.s3-card-type { font-size: 11px; letter-spacing: 0.06em; }
.s3-card-sym { font-size: 22px; line-height: 1; }
.s3-card-name { font-size: 11px; letter-spacing: 0.03em; text-align: center; line-height: 1.2; color: var(--text-dim); }
.s3-card-price { font-size: 15px; text-align: center; }
.s3-buy-btn { font-size: 13px; padding: 3px 0; width: 100%; justify-content: center; opacity: 0.50; }

/* Footer */
.s3-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; gap: 0; white-space: nowrap; z-index: 10;
}
.s3-menu-btn { flex-shrink: 0; }
`;
