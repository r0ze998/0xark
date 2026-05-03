// src/screens/s4-agent-hub.js — S4 Agent Hub
// AI Strategist agents: browse, hire, assign to deck.
// mount(container, { pubkey? }) / unmount(container)

const AGENTS = [
  {
    id: 'a01', name: 'ORACLE VESPER',  clan: 'nameless-silk', role: 'SCOUT',
    rank: 'S', cost: 0.02, sym: '◎',
    tagline: 'Reads the enemy hand before the commit phase.',
    active: false,
  },
  {
    id: 'a02', name: 'IRON TACTICIAN', clan: 'iron-circle',   role: 'STRATEGIST',
    rank: 'A', cost: 0.015, sym: '⚙',
    tagline: 'Optimizes lane assignments for maximum resolve damage.',
    active: true,
  },
  {
    id: 'a03', name: 'SILK MERCHANT',  clan: 'bourse',        role: 'BROKER',
    rank: 'B', cost: 0.008, sym: '◆',
    tagline: 'Negotiates favorable x402 card trades post-battle.',
    active: false,
  },
  {
    id: 'a04', name: 'BLACK PHANTOM',  clan: 'black-flag',    role: 'INFILTRATOR',
    rank: 'A', cost: 0.018, sym: '◈',
    tagline: 'Steals 1 additional card on ZK-verified criticals.',
    active: false,
  },
  {
    id: 'a05', name: 'BLADE COUNSEL',  clan: 'hollow-blade',  role: 'DUELIST',
    rank: 'B', cost: 0.010, sym: '⚔',
    tagline: 'Maximizes ATK output in the REVEAL phase.',
    active: false,
  },
  {
    id: 'a06', name: 'CROWN HERALD',   clan: 'royal',         role: 'HERALD',
    rank: 'S', cost: 0.030, sym: '♛',
    tagline: 'Unlocks cross-clan card synergies. Royal access only.',
    active: false,
  },
];

const CLAN_TEXT = {
  'black-flag':    '#6a9fd8',
  'hollow-blade':  '#e05070',
  'iron-circle':   '#5ab87a',
  'bourse':        '#c9a227',
  'nameless-silk': '#a070e0',
  'royal':         '#d8b034',
};

const RANK_COLOR = { S: '#d8b034', A: '#e05070', B: '#5ab87a', C: '#4a90d9' };

let _selected = null;

export function mount(container, detail = {}) {
  injectStyle();
  _selected = null;
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

  const agentList = AGENTS.map(a => {
    const color = CLAN_TEXT[a.clan] ?? '#e8dfc8';
    const rankColor = RANK_COLOR[a.rank] ?? '#e8dfc8';
    return `
      <div class="s4-agent-row${a.active ? ' s4-agent-row--active' : ''}"
        role="button" tabindex="0" data-id="${a.id}"
        aria-label="${a.name} rank ${a.rank} ${a.active ? 'active' : 'available'}">
        <div class="s4-agent-rank" style="color:${rankColor};border-color:${rankColor}55;">${a.rank}</div>
        <div class="s4-agent-sym" style="color:${color};">${a.sym}</div>
        <div class="s4-agent-info">
          <div class="s4-agent-name" style="color:${color};">${a.name}</div>
          <div class="s4-agent-role label-dim">${a.role}</div>
        </div>
        <div class="s4-agent-cost label-gold">${a.cost.toFixed(3)}</div>
        ${a.active ? '<div class="s4-agent-active-badge">ACTIVE</div>' : ''}
      </div>`;
  }).join('');

  const activeAgent = AGENTS.find(a => a.active);
  const detailHtml = activeAgent
    ? renderDetail(activeAgent)
    : `<div class="s4-detail-empty label-dim">Select an agent to view details</div>`;

  return `
<div class="s4-root" role="main" aria-label="Agent Hub">

  <header class="s4-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s4-back" id="s4-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s4-location">AGENT HUB</div>
    <div class="s4-hud flex-row gap-8">
      <span class="chip">ACTIVE <span class="label-gold">1 / 1</span></span>
      <span class="chip label-dim">SEASON 1</span>
    </div>
  </header>

  <div class="s4-body">

    <!-- Left: Agent list -->
    <aside class="s4-list" aria-label="Available agents">
      <div class="s4-list-header label-dim" style="font-size:14px;padding:8px 12px;border-bottom:var(--border-dim);">
        STRATEGISTS
      </div>
      <div class="s4-agents" role="list" aria-label="Agent roster">
        ${agentList}
      </div>
    </aside>

    <!-- Right: Detail -->
    <section class="s4-detail" id="s4-detail" aria-label="Agent details">
      ${detailHtml}
    </section>

  </div>

  <footer class="s4-footer">
    <span class="mono" style="color:var(--text-dim);font-family:'Courier New',monospace;font-size:13px;">${truncated}</span>
    <span class="sep">·</span>
    <span class="label-dim">AI Strategists · on-chain hiring TBD</span>
    <span class="sep">·</span>
    <button class="gba-btn gba-btn--ghost" id="s4-menu" style="font-size:13px;padding:2px 8px;">≡ CABIN</button>
  </footer>

</div>`;
}

function renderDetail(agent) {
  const color = CLAN_TEXT[agent.clan] ?? '#e8dfc8';
  const rankColor = RANK_COLOR[agent.rank] ?? '#e8dfc8';
  return `
    <div class="s4-detail-content">
      <div class="s4-det-header">
        <div class="s4-det-rank" style="color:${rankColor};border-color:${rankColor}55;">${agent.rank}</div>
        <div>
          <div class="s4-det-name" style="color:${color};">${agent.name}</div>
          <div class="s4-det-role label-dim">${agent.role}</div>
        </div>
      </div>
      <div class="s4-det-tagline">"${agent.tagline}"</div>
      <div class="s4-det-cost">
        <span class="label-dim">HIRE COST</span>
        <span class="label-gold">${agent.cost.toFixed(3)} SOL / duel</span>
      </div>
      <div class="s4-det-buttons">
        ${agent.active
          ? '<button class="gba-btn gba-btn--danger" disabled>DEACTIVATE · TBD</button>'
          : '<button class="gba-btn gba-btn--primary" disabled>HIRE AGENT · TBD</button>'
        }
      </div>
      <div class="label-dim" style="font-size:13px;margin-top:8px;">On-chain agent registry · Season 1</div>
    </div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s4-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s4-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  container.querySelectorAll('.s4-agent-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      const agent = AGENTS.find(a => a.id === id);
      if (!agent) return;
      _selected = id;
      container.querySelectorAll('.s4-agent-row').forEach(r => r.classList.toggle('s4-agent-row--selected', r.dataset.id === id));
      const detail = container.querySelector('#s4-detail');
      if (detail) detail.innerHTML = renderDetail(agent);
    });
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s4-agent-hub')) return;
  const el = document.createElement('style');
  el.id = 'style-s4-agent-hub';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s4-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}
.s4-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s4-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s4-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s4-hud { flex-shrink: 0; }
.s4-body { flex: 1; display: flex; min-height: 0; }

.s4-list {
  width: 340px; flex-shrink: 0; border-right: var(--border-dim);
  background: rgba(10,14,26,0.60); display: flex; flex-direction: column; overflow: hidden;
}
.s4-list-header { flex-shrink: 0; }
.s4-agents { flex: 1; overflow-y: auto; }
.s4-agents::-webkit-scrollbar { width: 3px; }
.s4-agents::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.s4-agent-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid rgba(201,162,39,0.08);
  cursor: pointer; transition: background 80ms;
}
.s4-agent-row:hover, .s4-agent-row:focus-visible,
.s4-agent-row--selected { background: rgba(201,162,39,0.08); outline: none; }
.s4-agent-row--active { background: rgba(201,162,39,0.05); }
.s4-agent-rank {
  width: 26px; height: 26px; border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}
.s4-agent-sym { font-size: 22px; flex-shrink: 0; width: 24px; text-align: center; }
.s4-agent-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.s4-agent-name { font-size: 16px; letter-spacing: 0.06em; }
.s4-agent-role { font-size: 13px; }
.s4-agent-cost { font-size: 15px; flex-shrink: 0; }
.s4-agent-active-badge {
  font-size: 11px; padding: 1px 6px; letter-spacing: 0.06em;
  color: #5ab87a; border: 1px solid #5ab87a44; flex-shrink: 0;
}

.s4-detail {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.s4-detail-empty { font-size: 17px; letter-spacing: 0.06em; }
.s4-detail-content { display: flex; flex-direction: column; gap: 16px; max-width: 480px; width: 100%; }
.s4-det-header { display: flex; align-items: center; gap: 12px; }
.s4-det-rank {
  width: 40px; height: 40px; border: 2px solid;
  display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
}
.s4-det-name { font-size: 24px; letter-spacing: 0.08em; }
.s4-det-role { font-size: 16px; }
.s4-det-tagline { font-size: 17px; color: var(--text-dim); font-style: italic; line-height: 1.5; }
.s4-det-cost { display: flex; gap: 12px; font-size: 17px; align-items: center; }
.s4-det-buttons { display: flex; gap: 8px; }

.s4-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; gap: 0; white-space: nowrap; z-index: 10;
}
`;
