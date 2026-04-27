// src/screens/s6-settings.js — S6 Settings
// Game preferences, NFT stack info, wallet info.
// mount(container, { pubkey? }) / unmount(container)

const SETTING_SECTIONS = [
  {
    id: 'wallet',
    label: 'WALLET',
    icon: '◎',
    settings: [
      { id: 'pubkey',   label: 'WALLET ADDRESS', type: 'display', value: '????...????' },
      { id: 'network',  label: 'NETWORK',         type: 'display', value: 'Devnet' },
      { id: 'balance',  label: 'SOL BALANCE',      type: 'display', value: '0.041 SOL' },
    ],
  },
  {
    id: 'game',
    label: 'GAME',
    icon: '⚔',
    settings: [
      { id: 'clan',     label: 'ACTIVE CLAN',  type: 'display', value: 'BLACK FLAG'  },
      { id: 'season',   label: 'SEASON',       type: 'display', value: 'Season 1'    },
      { id: 'confirm',  label: 'CONFIRM TXNS', type: 'toggle',  value: true           },
      { id: 'sounds',   label: 'SOUNDS',       type: 'toggle',  value: true           },
    ],
  },
  {
    id: 'nft',
    label: 'NFT STACK',
    icon: '◈',
    settings: [
      { id: 'nft-type', label: 'TOKEN STANDARD', type: 'display', value: 'SPL Token (anchor-spl)' },
      { id: 'program',  label: 'CARDS PROGRAM',  type: 'display', value: 'oxark-cards v0.1.0'     },
      { id: 'network2', label: 'DEPLOY TARGET',  type: 'display', value: 'Devnet → Mainnet S1'    },
      { id: 'cNFT',     label: 'cNFT',           type: 'display', value: 'Not used (standard SPL)'},
    ],
  },
  {
    id: 'zk',
    label: 'ZK / PROOF',
    icon: '⬡',
    settings: [
      { id: 'curve',    label: 'CURVE',       type: 'display', value: 'BN254'        },
      { id: 'system',   label: 'PROOF SYS',   type: 'display', value: 'Groth16'      },
      { id: 'hash',     label: 'HASH',        type: 'display', value: 'Poseidon'     },
      { id: 'circuit',  label: 'CIRCUIT',     type: 'display', value: 'Circom'       },
    ],
  },
  {
    id: 'infra',
    label: 'INFRASTRUCTURE',
    icon: '⚙',
    settings: [
      { id: 'mb',       label: 'EPHEMERAL ROLLUP', type: 'display', value: 'MagicBlock SDK 0.6.6' },
      { id: 'x402',     label: 'x402 ENDPOINT',    type: 'display', value: 'TBD · Fly.io pending' },
      { id: 'ai',       label: 'AI AGENTS',         type: 'display', value: 'TBD · Season 1'       },
    ],
  },
];

let _activeSection = 'wallet';
let _toggleStates = { confirm: true, sounds: true };

export function mount(container, detail = {}) {
  injectStyle();
  _activeSection = 'wallet';
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

  const navItems = SETTING_SECTIONS.map(s => `
    <button class="s6-nav-item${s.id === _activeSection ? ' s6-nav-item--active' : ''}"
      data-section="${s.id}" aria-selected="${s.id === _activeSection}">
      <span class="s6-nav-icon">${s.icon}</span>
      <span class="s6-nav-label">${s.label}</span>
    </button>`).join('');

  return `
<div class="s6-root" role="main" aria-label="Settings">

  <header class="s6-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s6-back" id="s6-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s6-location">SETTINGS</div>
    <span class="chip label-dim">0xARK v4 · Season 1</span>
  </header>

  <div class="s6-body">

    <!-- Left: section nav -->
    <nav class="s6-nav" role="tablist" aria-label="Settings sections">
      ${navItems}
    </nav>

    <!-- Right: settings panel -->
    <section class="s6-panel" id="s6-panel" aria-label="Settings panel">
      ${renderSection(_activeSection, truncated)}
    </section>

  </div>

  <footer class="s6-footer">
    <span class="mono" style="color:var(--text-dim);font-family:'Courier New',monospace;font-size:13px;">${truncated}</span>
    <span class="sep">·</span>
    <span class="label-dim">devnet</span>
    <span class="sep">·</span>
    <button class="gba-btn gba-btn--ghost" id="s6-menu" style="font-size:13px;padding:2px 8px;">≡ CABIN</button>
  </footer>

</div>`;
}

function renderSection(sectionId, pubkey) {
  const section = SETTING_SECTIONS.find(s => s.id === sectionId);
  if (!section) return '';

  const rows = section.settings.map(setting => {
    let valueHtml;
    if (setting.type === 'toggle') {
      const on = _toggleStates[setting.id] ?? setting.value;
      valueHtml = `
        <button class="s6-toggle${on ? ' s6-toggle--on' : ''}"
          data-setting="${setting.id}" role="switch" aria-checked="${on}"
          aria-label="Toggle ${setting.label}">
          <span class="s6-toggle-knob"></span>
          <span class="s6-toggle-label">${on ? 'ON' : 'OFF'}</span>
        </button>`;
    } else {
      const displayValue = setting.id === 'pubkey' ? (pubkey || setting.value) : setting.value;
      valueHtml = `<span class="s6-value${setting.id === 'pubkey' ? ' mono' : ''}">${displayValue}</span>`;
    }

    return `
      <div class="s6-row">
        <span class="s6-row-label label-dim">${setting.label}</span>
        ${valueHtml}
      </div>`;
  }).join('');

  return `
    <div class="s6-section-content">
      <div class="s6-section-title">
        <span class="s6-section-icon">${section.icon}</span>
        <span class="label-gold" style="font-size:18px;letter-spacing:0.10em;">${section.label}</span>
      </div>
      <div class="s6-rows">
        ${rows}
      </div>
      ${sectionId === 'nft' ? `
        <div class="s6-nft-note">
          <span class="label-dim" style="font-size:14px;">
            ◈ Cards are standard SPL Tokens minted by the oxark-cards program.<br>
            No Bubblegum cNFT or Light Protocol compression is used.
          </span>
        </div>` : ''}
    </div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s6-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s6-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  container.querySelectorAll('.s6-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeSection = btn.dataset.section;
      container.querySelectorAll('.s6-nav-item').forEach(b => {
        const on = b.dataset.section === _activeSection;
        b.classList.toggle('s6-nav-item--active', on);
        b.setAttribute('aria-selected', String(on));
      });
      const panel = container.querySelector('#s6-panel');
      if (panel) panel.innerHTML = renderSection(_activeSection, '????...????');
      bindToggleEvents(container);
    });
  });

  bindToggleEvents(container);
}

function bindToggleEvents(container) {
  container.querySelectorAll('.s6-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.setting;
      _toggleStates[id] = !(_toggleStates[id] ?? true);
      const on = _toggleStates[id];
      btn.classList.toggle('s6-toggle--on', on);
      btn.setAttribute('aria-checked', String(on));
      btn.querySelector('.s6-toggle-label').textContent = on ? 'ON' : 'OFF';
    });
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s6-settings')) return;
  const el = document.createElement('style');
  el.id = 'style-s6-settings';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s6-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}
.s6-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s6-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s6-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s6-body { flex: 1; display: flex; min-height: 0; }

.s6-nav {
  width: 200px; flex-shrink: 0; border-right: var(--border-dim);
  background: rgba(10,14,26,0.60); display: flex; flex-direction: column;
  padding: 8px 0;
}
.s6-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; width: 100%; text-align: left;
  font-family: var(--font-main); font-size: 16px; letter-spacing: 0.06em;
  border: none; background: transparent; color: var(--text-dim);
  cursor: pointer; transition: background 80ms, color 80ms;
  border-left: 3px solid transparent;
}
.s6-nav-item:hover, .s6-nav-item:focus-visible { background: rgba(201,162,39,0.06); color: var(--text-cream); outline: none; }
.s6-nav-item--active { color: var(--text-cream); border-left-color: var(--accent-gold); background: rgba(201,162,39,0.08); }
.s6-nav-icon { font-size: 18px; flex-shrink: 0; width: 22px; text-align: center; }
.s6-nav-label { letter-spacing: 0.08em; }

.s6-panel { flex: 1; overflow-y: auto; padding: 20px 24px; }
.s6-panel::-webkit-scrollbar { width: 3px; }
.s6-panel::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.s6-section-content { display: flex; flex-direction: column; gap: 16px; max-width: 560px; }
.s6-section-title { display: flex; align-items: center; gap: 10px; }
.s6-section-icon { font-size: 22px; }

.s6-rows { display: flex; flex-direction: column; gap: 0; }
.s6-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid rgba(201,162,39,0.10);
  font-size: 17px;
}
.s6-row-label { font-size: 15px; letter-spacing: 0.06em; }
.s6-value { font-size: 16px; color: var(--text-cream); }
.mono { font-family: 'Courier New', monospace; font-size: 13px; color: var(--text-dim); }

/* Toggle */
.s6-toggle {
  display: flex; align-items: center; gap: 6px; padding: 3px 8px;
  font-family: var(--font-main); font-size: 15px; letter-spacing: 0.06em;
  border: 1px solid rgba(201,162,39,0.30); background: transparent;
  color: var(--text-dim); cursor: pointer; transition: all 80ms;
}
.s6-toggle--on { border-color: #5ab87a; color: #5ab87a; }
.s6-toggle-knob {
  width: 10px; height: 10px;
  background: var(--text-dim); border-radius: 0; transition: background 80ms;
}
.s6-toggle--on .s6-toggle-knob { background: #5ab87a; }

.s6-nft-note {
  padding: 12px; border: 1px solid rgba(201,162,39,0.20);
  background: rgba(201,162,39,0.04); line-height: 1.6;
}

.s6-footer {
  height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  font-size: 14px; gap: 0; white-space: nowrap; z-index: 10;
}
`;
