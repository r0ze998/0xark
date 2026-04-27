// src/screens/s5-lore.js — S5 Lore Catalog
// 6-tab clan browser: BF / HB / IC / Bourse / NS / Royal (KLG).
// mount(container, { tab? }) / unmount(container)

// Royal / KLG palette (D confirmed)
const ROYAL_PALETTE = {
  gold:  '#d8b034',
  light: '#f4ecd0',
  armor: '#9098a8',
  dark:  '#7a8088',
  red:   '#8c1c2e',
};

const CLANS = [
  {
    id: 'black-flag',
    label: 'BLACK FLAG',
    abbr: 'BF',
    color: '#6a9fd8',
    band: '#0f2540',
    lore: 'Pirates of the Elyon coast. Masters of raid, theft, and ZK-blind assault.',
    cards: [
      { name: 'PHANTOM PISTOL',  type: 'ATK', sym: '⚔', rarity: 'RARE'   },
      { name: "CROW'S EYE",       type: 'SPY', sym: '◎', rarity: 'COMMON' },
      { name: 'TIDE CANNON',      type: 'ATK', sym: '⚔', rarity: 'UNCOMMON' },
      { name: 'POWDER CHARGE',    type: 'ATK', sym: '⚔', rarity: 'COMMON' },
      { name: 'CORSAIR BLADE',    type: 'ATK', sym: '⚔', rarity: 'UNCOMMON' },
    ],
    hero: { name: 'CAPT. VEGA', ph: true },
  },
  {
    id: 'hollow-blade',
    label: 'HOLLOW BLADE',
    abbr: 'HB',
    color: '#e05070',
    band: '#300a18',
    lore: 'Duellists who carve wounds into the on-chain ledger. Their defeats are permanent.',
    cards: [
      { name: 'ANCHOR SHIELD',  type: 'DEF', sym: '🛡', rarity: 'COMMON'   },
      { name: 'SHADOW CLOAK',   type: 'SPY', sym: '◎', rarity: 'UNCOMMON' },
      { name: 'HULL BRACE',     type: 'DEF', sym: '🛡', rarity: 'COMMON'   },
      { name: 'CUTLASS STRIKE', type: 'ATK', sym: '⚔', rarity: 'UNCOMMON' },
    ],
    hero: { name: 'BLADE MARSHAL', ph: true },
  },
  {
    id: 'iron-circle',
    label: 'IRON CIRCLE',
    abbr: 'IC',
    color: '#5ab87a',
    band: '#102818',
    lore: 'Fortress builders and siege engineers. Control the lanes, control the succession.',
    cards: [
      { name: 'IRON FIST',   type: 'ATK', sym: '⚔', rarity: 'RARE'    },
      { name: 'BONE BUCKLER',type: 'DEF', sym: '🛡', rarity: 'COMMON'  },
      { name: 'BARRICADE',   type: 'DEF', sym: '🛡', rarity: 'UNCOMMON'},
      { name: 'IRON WALL',   type: 'DEF', sym: '🛡', rarity: 'UNCOMMON'},
    ],
    hero: null,
  },
  {
    id: 'bourse',
    label: 'BOURSE',
    abbr: 'BO',
    color: '#c9a227',
    band: '#2a1e00',
    lore: 'Merchant princes who weaponize x402 payments. Every battle is a transaction.',
    cards: [
      { name: 'GOLD COMPASS',    type: 'REL', sym: '◈', rarity: 'RARE'      },
      { name: 'MERCHANT LEDGER', type: 'REL', sym: '◈', rarity: 'UNCOMMON'  },
      { name: 'VAULT KEY',       type: 'REL', sym: '◈', rarity: 'UNCOMMON'  },
    ],
    hero: null,
  },
  {
    id: 'nameless-silk',
    label: 'NAMELESS SILK',
    abbr: 'NS',
    color: '#a070e0',
    band: '#1a0830',
    lore: 'Ghost operatives. Their cards vanish from the chain until the reveal hash is confirmed.',
    cards: [
      { name: 'SILK VEIL',    type: 'SPY', sym: '◎', rarity: 'RARE'    },
      { name: 'WHISPER NET',  type: 'SPY', sym: '◎', rarity: 'UNCOMMON'},
      { name: 'MIRROR GLASS', type: 'SPY', sym: '◎', rarity: 'UNCOMMON'},
      { name: 'DUSK MANTLE',  type: 'SPY', sym: '◎', rarity: 'COMMON'  },
    ],
    hero: null,
  },
  {
    id: 'royal',
    label: 'ROYAL INDEPENDENT',
    abbr: 'ROYAL',
    color: ROYAL_PALETTE.gold,
    band: '#1e1400',
    lore: 'The last loyalists of a fallen throne. Bound to no clan — recognized by all.',
    cards: [
      { name: "KING'S LAST GUARD", type: 'REL', sym: '♛', rarity: 'LEGENDARY' },
    ],
    hero: { name: 'KLG', ph: true },
  },
];

const RARITY_COLOR = {
  COMMON: 'var(--text-dim)',
  UNCOMMON: '#5ab87a',
  RARE: '#4a90d9',
  LEGENDARY: ROYAL_PALETTE.gold,
};

let _activeTab = 'black-flag';

export function mount(container, detail = {}) {
  injectStyle();
  _activeTab = detail.tab ?? 'black-flag';
  container.innerHTML = buildHTML();
  bindEvents(container);
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML() {
  const tabs = CLANS.map(c => `
    <button class="s5-tab${c.id === _activeTab ? ' s5-tab--active' : ''}"
      data-clan="${c.id}" aria-selected="${c.id === _activeTab}"
      style="--tc:${c.color};">${c.abbr}</button>`).join('');

  return `
<div class="s5-root" role="main" aria-label="Lore Catalog">

  <header class="s5-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s5-back" id="s5-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s5-location">LORE CATALOG</div>
    <span class="chip label-dim">60 CARDS · 6 CLANS</span>
  </header>

  <!-- Clan tabs -->
  <div class="s5-tabs" role="tablist" aria-label="Clan tabs">
    ${tabs}
  </div>

  <!-- Tab content -->
  <div class="s5-content" id="s5-content" role="tabpanel">
    ${renderTab(_activeTab)}
  </div>

  <footer class="s5-footer">
    <span class="label-dim" style="font-size:13px;">Click a card to open M5 Card Detail</span>
    <span class="sep">·</span>
    <button class="gba-btn gba-btn--ghost" id="s5-menu" style="font-size:13px;padding:2px 8px;">≡ CABIN</button>
  </footer>

</div>`;
}

function renderTab(clanId) {
  const clan = CLANS.find(c => c.id === clanId);
  if (!clan) return '';

  const isRoyal = clan.id === 'royal';

  const cardGrid = clan.cards.map(card => {
    const rarColor = RARITY_COLOR[card.rarity] ?? 'var(--text-dim)';
    return `
      <div class="s5-card" role="button" tabindex="0" data-name="${card.name}"
        aria-label="${card.name} ${card.rarity}"
        style="border-color:${clan.color}33;">
        <div class="s5-card-type" style="color:${clan.color};">${card.type}</div>
        <div class="s5-card-sym">${card.sym}</div>
        <div class="s5-card-name">${card.name}</div>
        <div class="s5-card-rarity" style="color:${rarColor};">${card.rarity}</div>
      </div>`;
  }).join('');

  const heroPh = clan.hero
    ? `<div class="s5-hero-ph" style="border-color:${clan.color}40;">
         <span class="s5-hero-ph-label" style="color:${clan.color}50;">${clan.hero.name}</span>
       </div>`
    : '';

  return `
    <div class="s5-tab-inner">
      <!-- Clan header -->
      <div class="s5-clan-header" style="background:${clan.band}; border-bottom-color:${clan.color}40;">
        ${heroPh}
        <div class="s5-clan-info">
          <div class="s5-clan-name" style="color:${clan.color};">${clan.label}</div>
          <div class="s5-clan-lore">${clan.lore}</div>
          ${isRoyal ? `<div class="s5-royal-note" style="color:${ROYAL_PALETTE.armor};">
            ♛ Currently 1 member · Future Royal expansion pending
          </div>` : ''}
        </div>
        <div class="s5-clan-count">
          <div class="s5-clan-count-num" style="color:${clan.color};">${clan.cards.length}</div>
          <div class="label-dim" style="font-size:13px;">CARDS</div>
        </div>
      </div>

      <!-- Card grid -->
      <div class="s5-card-grid" role="list" aria-label="${clan.label} cards">
        ${cardGrid}
      </div>
    </div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s5-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s5-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  container.querySelectorAll('.s5-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _activeTab = tab.dataset.clan;
      container.querySelectorAll('.s5-tab').forEach(t => {
        const on = t.dataset.clan === _activeTab;
        t.classList.toggle('s5-tab--active', on);
        t.setAttribute('aria-selected', String(on));
      });
      const content = container.querySelector('#s5-content');
      if (content) content.innerHTML = renderTab(_activeTab);
      bindCardEvents(container);
    });
  });

  bindCardEvents(container);
}

function bindCardEvents(container) {
  container.querySelectorAll('.s5-card').forEach(card => {
    card.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('nav:card-detail', {
        detail: { cardName: card.dataset.name, clan: _activeTab },
      }));
    });
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s5-lore')) return;
  const el = document.createElement('style');
  el.id = 'style-s5-lore';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s5-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}
.s5-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s5-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s5-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }

/* Tabs */
.s5-tabs {
  height: 40px; flex-shrink: 0; display: flex; border-bottom: var(--border-dim);
  background: rgba(10,14,26,0.80);
}
.s5-tab {
  flex: 1; font-family: var(--font-main); font-size: 14px; letter-spacing: 0.08em;
  border: none; border-right: 1px solid rgba(201,162,39,0.15);
  background: transparent; color: var(--text-dim); cursor: pointer;
  transition: background 80ms, color 80ms;
  border-bottom: 3px solid transparent;
}
.s5-tab:last-child { border-right: none; }
.s5-tab:hover { background: rgba(201,162,39,0.06); color: var(--tc, #e8dfc8); }
.s5-tab--active {
  background: rgba(201,162,39,0.05); color: var(--tc, #e8dfc8);
  border-bottom-color: var(--tc, #c9a227);
}

/* Content */
.s5-content { flex: 1; overflow: hidden; }
.s5-tab-inner { display: flex; flex-direction: column; height: 100%; }

/* Clan header */
.s5-clan-header {
  flex-shrink: 0; display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid;
}
.s5-hero-ph {
  width: 48px; height: 72px; border: 1px dashed;
  display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: 4px; flex-shrink: 0;
}
.s5-hero-ph-label { font-size: 9px; letter-spacing: 0.04em; text-align: center; }
.s5-clan-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.s5-clan-name { font-size: 20px; letter-spacing: 0.10em; }
.s5-clan-lore { font-size: 15px; color: var(--text-dim); line-height: 1.4; }
.s5-royal-note { font-size: 13px; letter-spacing: 0.04em; margin-top: 2px; }
.s5-clan-count { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.s5-clan-count-num { font-size: 32px; line-height: 1; }

/* Card grid */
.s5-card-grid {
  flex: 1; overflow-y: auto; display: grid;
  grid-template-columns: repeat(8, 1fr); gap: 6px;
  padding: 10px 16px; align-content: start;
}
.s5-card-grid::-webkit-scrollbar { width: 3px; }
.s5-card-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.s5-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 6px 4px; min-height: 80px;
  background: var(--bg-mid); border: 1px solid;
  cursor: pointer; transition: background 80ms;
}
.s5-card:hover, .s5-card:focus-visible {
  background: rgba(201,162,39,0.08); outline: none;
}
.s5-card-type { font-size: 11px; letter-spacing: 0.06em; }
.s5-card-sym  { font-size: 20px; line-height: 1; }
.s5-card-name { font-size: 10px; text-align: center; color: var(--text-dim); letter-spacing: 0.02em; line-height: 1.2; }
.s5-card-rarity { font-size: 10px; letter-spacing: 0.04em; }

/* Footer */
.s5-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; gap: 0; white-space: nowrap; z-index: 10;
}
`;
