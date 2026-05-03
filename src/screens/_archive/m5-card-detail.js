// src/screens/m5-card-detail.js — M5 Card Detail
// Full card view: art, stats, lore shard, battle history.
// mount(container, { cardId?, cardName?, clan?, type?, lore? }) / unmount(container)

// KLG (Royal Independent) palette
const ROYAL = {
  gold:  '#d8b034',
  light: '#f4ecd0',
  armor: '#9098a8',
  dark:  '#7a8088',
  red:   '#8c1c2e',
};

const CLAN_COLORS = {
  'black-flag':    { band: '#1a3a5c', text: '#6a9fd8', label: 'BLACK FLAG'    },
  'hollow-blade':  { band: '#4a1020', text: '#e05070', label: 'HOLLOW BLADE'  },
  'iron-circle':   { band: '#1a3a28', text: '#5ab87a', label: 'IRON CIRCLE'   },
  'bourse':        { band: '#3a2800', text: '#c9a227', label: 'BOURSE'         },
  'nameless-silk': { band: '#2a1050', text: '#a070e0', label: 'NAMELESS SILK' },
  'royal':         { band: '#2c2000', text: ROYAL.gold, label: 'ROYAL INDEPENDENT' },
};

const TYPE_COLORS = {
  ATK: '#d63b3b',
  DEF: '#4a90d9',
  SPY: '#a070e0',
  REL: '#c9a227',
};

const SAMPLE_CARDS = {
  'phantom-pistol': {
    name: 'PHANTOM PISTOL',
    type: 'ATK', clan: 'black-flag', sym: '⚔',
    atk: 7, def: 2, spd: 9, rarity: 'RARE',
    lore: `"Loaded with gunpowder stolen from the Iron Circle's arsenal. Fires twice — once at the body, once at the soul."`,
    history: [
      { result: 'WIN',  vs: 'ANCHOR SHIELD',  dmg: 5 },
      { result: 'WIN',  vs: 'IRON WALL',       dmg: 7 },
      { result: 'LOSS', vs: 'BONE BUCKLER',    dmg: 0 },
    ],
  },
  'klg': {
    name: 'KING\'S LAST GUARD',
    type: 'REL', clan: 'royal', sym: '♛',
    atk: 4, def: 8, spd: 5, rarity: 'LEGENDARY',
    lore: '"The final sentinel of a throne no longer standing. Loyalty outlasts the king."',
    history: [],
  },
};

function getCard(detail) {
  if (detail.cardId && SAMPLE_CARDS[detail.cardId]) return SAMPLE_CARDS[detail.cardId];
  return {
    name:    detail.cardName ?? 'PHANTOM PISTOL',
    type:    detail.type     ?? 'ATK',
    clan:    detail.clan     ?? 'black-flag',
    sym:     detail.sym      ?? '⚔',
    atk:     detail.atk      ?? 6,
    def:     detail.def      ?? 3,
    spd:     detail.spd      ?? 7,
    rarity:  detail.rarity   ?? 'COMMON',
    lore:    detail.lore     ?? '"A card forged in the heat of battle."',
    history: detail.history  ?? [],
  };
}

export function mount(container, detail = {}) {
  injectStyle();
  container.innerHTML = buildHTML(getCard(detail));
  bindEvents(container, detail);
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML(card) {
  const clanData = CLAN_COLORS[card.clan] ?? CLAN_COLORS['black-flag'];
  const typeColor = TYPE_COLORS[card.type] ?? '#e8dfc8';
  const isRoyal = card.clan === 'royal';

  const historyRows = card.history.length
    ? card.history.map(h => `
        <div class="m5-hist-row">
          <span class="m5-hist-result m5-hist-${h.result.toLowerCase()}">${h.result}</span>
          <span class="m5-hist-vs label-dim">vs ${h.vs}</span>
          <span class="m5-hist-dmg" style="color:${typeColor};">${h.dmg > 0 ? `+${h.dmg}` : '—'}</span>
        </div>`).join('')
    : '<div class="label-dim" style="font-size:15px;padding:8px 0;">NO BATTLE HISTORY</div>';

  const statBar = (val, max = 10, color = '#c9a227') => {
    const pct = Math.min(100, (val / max) * 100);
    return `<div class="m5-stat-bar"><div class="m5-stat-fill" style="width:${pct}%;background:${color};"></div></div>`;
  };

  return `
<div class="m5-root" role="main" aria-label="Card Detail: ${card.name}">

  <!-- Clan band header -->
  <div class="m5-clan-band" style="background:${clanData.band}; border-color:${clanData.text}40;">
    <span class="m5-clan-label" style="color:${clanData.text};">${clanData.label}</span>
    <span class="m5-rarity" style="color:${isRoyal ? ROYAL.gold : clanData.text};">${card.rarity}</span>
  </div>

  <div class="m5-body">

    <!-- Left: Card art panel -->
    <section class="m5-art-panel" aria-label="Card art">
      <!-- Hero placeholder: KLG -->
      <div class="m5-art-frame" style="border-color:${clanData.text}55;"
        aria-label="Card artwork placeholder">
        <div class="m5-art-placeholder" style="background:${clanData.band}60;">
          <div class="m5-art-sym" style="color:${clanData.text};">${card.sym}</div>
          <div class="m5-art-hero-ph" style="border-color:${clanData.text}30;">
            <span class="m5-art-hero-label" style="color:${clanData.text}55;">KLG</span>
          </div>
        </div>
      </div>
      <div class="m5-card-name-large" style="color:${isRoyal ? ROYAL.gold : clanData.text};">${card.name}</div>
      <div class="m5-type-badge" style="background:${typeColor}22;border-color:${typeColor}55;color:${typeColor};">
        ${card.type}
      </div>
    </section>

    <!-- Center: Stats + Lore -->
    <section class="m5-info-panel" aria-label="Card stats and lore">
      <div class="m5-stats-section">
        <div class="m5-stat-row">
          <span class="m5-stat-label label-dim">ATK</span>
          <span class="m5-stat-val" style="color:${TYPE_COLORS.ATK};">${card.atk}</span>
          ${statBar(card.atk, 10, TYPE_COLORS.ATK)}
        </div>
        <div class="m5-stat-row">
          <span class="m5-stat-label label-dim">DEF</span>
          <span class="m5-stat-val" style="color:${TYPE_COLORS.DEF};">${card.def}</span>
          ${statBar(card.def, 10, TYPE_COLORS.DEF)}
        </div>
        <div class="m5-stat-row">
          <span class="m5-stat-label label-dim">SPD</span>
          <span class="m5-stat-val" style="color:var(--accent-gold);">${card.spd}</span>
          ${statBar(card.spd, 10, '#c9a227')}
        </div>
      </div>

      <div class="m5-section-divider"></div>

      <div class="m5-lore-section" aria-label="Lore">
        <div class="m5-section-label label-dim">LORE SHARD</div>
        <div class="m5-lore-text" style="border-left-color:${clanData.text}60;">${card.lore}</div>
      </div>

      <div class="m5-section-divider"></div>

      <div class="m5-history-section" aria-label="Battle history">
        <div class="m5-section-label label-dim">BATTLE HISTORY</div>
        ${historyRows}
      </div>
    </section>

    <!-- Right: Actions -->
    <section class="m5-actions-panel" aria-label="Card actions">
      <button class="gba-btn m5-action-btn" id="m5-add-deck" aria-label="Add to deck">
        + ADD TO DECK
      </button>
      <button class="gba-btn gba-btn--ghost m5-action-btn" id="m5-view-owner" aria-label="View on-chain">
        ◎ ON-CHAIN
      </button>
      <button class="gba-btn gba-btn--ghost m5-action-btn" id="m5-lore-full" aria-label="Full lore">
        ◇ LORE
      </button>
      <div class="m5-section-divider"></div>
      <div class="m5-on-chain-stub label-dim">
        <div style="font-size:13px;">MINT</div>
        <div class="mono" style="font-size:12px;color:var(--text-dim);">TBD · devnet</div>
      </div>
    </section>

  </div>

  <!-- Bottom nav -->
  <footer class="m5-footer">
    <button class="gba-btn gba-btn--ghost m5-back" id="m5-back" aria-label="Back">◂ BACK</button>
    <button class="gba-btn gba-btn--ghost m5-lore-nav" id="m5-lore-btn" aria-label="Lore Catalog">◇ LORE CATALOG</button>
    <button class="gba-btn gba-btn--ghost m5-deck-nav" id="m5-deck-btn" aria-label="Deck Editor">◈ DECK EDITOR</button>
    <button class="gba-btn gba-btn--ghost m5-menu-btn" id="m5-menu" aria-label="Captain's Cabin">≡ CABIN</button>
  </footer>

</div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container, detail) {
  container.querySelector('#m5-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lore'));
  });
  container.querySelector('#m5-lore-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lore'));
  });
  container.querySelector('#m5-deck-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:deck-editor'));
  });
  container.querySelector('#m5-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });
  container.querySelector('#m5-add-deck').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:deck-editor'));
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-m5-card-detail')) return;
  const el = document.createElement('style');
  el.id = 'style-m5-card-detail';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.m5-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

.m5-clan-band {
  height: 36px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 16px;
  border-bottom: 1px solid; z-index: 10;
}
.m5-clan-label { font-size: 15px; letter-spacing: 0.12em; }
.m5-rarity { font-size: 14px; letter-spacing: 0.10em; }

.m5-body { flex: 1; display: flex; min-height: 0; }

/* Art panel */
.m5-art-panel {
  width: 240px; flex-shrink: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  border-right: var(--border-dim); padding: 16px;
  background: rgba(10,14,26,0.70);
}
.m5-art-frame {
  width: 160px; height: 220px; border: 2px solid;
  overflow: hidden; flex-shrink: 0;
}
.m5-art-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
}
.m5-art-sym { font-size: 52px; line-height: 1; }
.m5-art-hero-ph {
  width: 48px; height: 72px; border: 1px dashed;
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px;
}
.m5-art-hero-label { font-size: 8px; letter-spacing: 0.04em; }
.m5-card-name-large { font-size: 18px; letter-spacing: 0.08em; text-align: center; line-height: 1.2; }
.m5-type-badge {
  font-size: 13px; letter-spacing: 0.10em; padding: 2px 12px;
  border: 1px solid;
}

/* Info panel */
.m5-info-panel {
  flex: 1; display: flex; flex-direction: column;
  padding: 14px 16px; gap: 10px; border-right: var(--border-dim);
  overflow-y: auto;
}
.m5-info-panel::-webkit-scrollbar { width: 3px; }
.m5-info-panel::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.m5-stats-section { display: flex; flex-direction: column; gap: 8px; }
.m5-stat-row { display: flex; align-items: center; gap: 8px; }
.m5-stat-label { width: 32px; font-size: 15px; flex-shrink: 0; }
.m5-stat-val { width: 24px; font-size: 20px; text-align: right; flex-shrink: 0; }
.m5-stat-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.10); }
.m5-stat-fill { height: 100%; transition: width 300ms ease-out; }

.m5-section-divider { height: 1px; border-top: 1px solid rgba(201,162,39,0.15); }
.m5-section-label { font-size: 13px; letter-spacing: 0.10em; margin-bottom: 4px; }

.m5-lore-section { display: flex; flex-direction: column; gap: 4px; }
.m5-lore-text {
  font-size: 16px; line-height: 1.5; color: var(--text-dim);
  padding-left: 10px; border-left: 2px solid;
}

.m5-history-section { display: flex; flex-direction: column; gap: 4px; }
.m5-hist-row { display: flex; gap: 10px; align-items: center; font-size: 15px; }
.m5-hist-result { width: 40px; font-size: 14px; letter-spacing: 0.06em; flex-shrink: 0; }
.m5-hist-win  { color: #5ab87a; }
.m5-hist-loss { color: var(--accent-red); }
.m5-hist-vs { flex: 1; }
.m5-hist-dmg { width: 32px; text-align: right; flex-shrink: 0; }

/* Actions panel */
.m5-actions-panel {
  width: 180px; flex-shrink: 0; display: flex; flex-direction: column;
  padding: 14px 12px; gap: 8px; background: rgba(10,14,26,0.50);
}
.m5-action-btn { width: 100%; justify-content: center; font-size: 15px; padding: 6px 8px; }
.m5-on-chain-stub { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }

/* Footer */
.m5-footer {
  height: 40px; flex-shrink: 0; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; border-top: var(--border-dim); background: rgba(3,6,15,0.75); z-index: 10;
}
.m5-back, .m5-lore-nav, .m5-deck-nav, .m5-menu-btn { font-size: 15px; padding: 3px 10px; }
.mono { font-family: 'Courier New', monospace; }
`;
