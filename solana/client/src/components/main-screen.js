// main-screen.js — Screen 1: Vault viewer + matchmaking
// mount(container, detail) / unmount(container)

import { ALL_CARD_IDS, getCard, isBurnable, isMergeOnly, getMergeRecipe, MERGE_RECIPES } from '../lib/cards.js';
import { CardHTML, injectCardCSS, FACTION_NAMES, FACTION_COLORS, CARD_NAMES } from './common/Card.js';
import { LegendaryProgressHTML, injectLegendaryProgressCSS, PERSONALITIES } from './common/LegendaryProgress.js';
import { PrizePoolHTML, injectPrizePoolCSS } from './common/PrizePool.js';
import { getState, setState } from '../state/battle-state.js';
import { CardDetailModal } from './card-detail.js';
import * as duelWs from '../lib/duel-ws.js';

let _matchInterval  = null;
let _dots           = 0;
let _unsubWaiting   = () => {};
let _unsubMatched   = () => {};

function _unsubMatchmaking() {
  _unsubWaiting();
  _unsubMatched();
  _unsubWaiting = () => {};
  _unsubMatched = () => {};
}

export function mount(container, detail = {}) {
  injectStyle();
  injectCardCSS();
  injectLegendaryProgressCSS();
  injectPrizePoolCSS();

  const s = getState();
  const vault   = detail.vault   ?? s.vault   ?? [];
  const pubkey  = detail.pubkey  ?? s.playerPubkey ?? '';
  const perso   = detail.personalities ?? s.personalities ?? {};

  setState({ vault, playerPubkey: pubkey, personalities: perso, phase: 'main' });

  container.innerHTML = buildHTML({ vault, pubkey, perso });
  bindEvents(container);
}

export function unmount(container) {
  if (_matchInterval) { clearInterval(_matchInterval); _matchInterval = null; }
  _unsubMatchmaking();
  container.innerHTML = '';
}

/* ── Evolve helpers ─────────────────────────────────────────────────── */
function _countEvolvable(owned) {
  return Object.values(MERGE_RECIPES).filter(r => owned.has(r.recipe[0]) && owned.has(r.recipe[1])).length;
}

function _buildEvolveList(owned) {
  const rows = Object.entries(MERGE_RECIPES).map(([childId, r]) => {
    const cId    = parseInt(childId, 10);
    const hasA   = owned.has(r.recipe[0]);
    const hasB   = owned.has(r.recipe[1]);
    const ready  = hasA && hasB;
    const nameA  = CARD_NAMES[r.recipe[0]] ?? `#${r.recipe[0]}`;
    const nameB  = CARD_NAMES[r.recipe[1]] ?? `#${r.recipe[1]}`;
    const nameC  = CARD_NAMES[cId] ?? r.name;
    return `
<div class="ms-evolve-row${ready ? ' ms-evolve-row--ready' : ''}" data-child="${cId}">
  <div class="ms-evolve-row-info">
    <span class="ms-evolve-result label-gold">${nameC}</span>
    <span class="ms-evolve-recipe label-dim">${nameA} + ${nameB}</span>
  </div>
  <button class="gba-btn gba-btn--primary ms-evolve-btn"
    data-child="${cId}" data-a="${r.recipe[0]}" data-b="${r.recipe[1]}"
    ${ready ? '' : 'disabled'}>
    ${ready ? '⚗ EVOLVE' : '⚗ NEED CARDS'}
  </button>
</div>`;
  });
  return rows.join('') || '<div class="label-dim" style="padding:12px;">No merge-only cards available yet.</div>';
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildHTML({ vault, pubkey, perso }) {
  const owned = new Set(vault);
  const vaultCount = vault.length;
  const truncPub   = pubkey.length >= 8
    ? `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`
    : (pubkey || '—');

  const cardGrid = ALL_CARD_IDS.map(id => {
    const isOwned = owned.has(id);
    const card = getCard(id);
    return CardHTML({ id, owned: isOwned, compact: true });
  }).join('');

  const FACTIONS = PERSONALITIES.map((p, i) => ({
    label: FACTION_NAMES[p.faction],
    color: FACTION_COLORS[p.faction],
  }));

  return `
<div class="ms-root" role="main" aria-label="0xARK Main Screen">

  <!-- Top bar -->
  <header class="ms-topbar">
    <div class="ms-brand">
      <span class="ms-brand-name">0xARK</span>
      <span class="chip ms-tagline">CARD BATTLE ON SOLANA</span>
    </div>
    <div class="ms-hud flex-row gap-8">
      <span class="chip">VAULT <span class="label-gold">${vaultCount}</span><span class="label-dim">/60</span></span>
      <button class="gba-btn gba-btn--ghost ms-wallet-btn" id="ms-wallet">
        ${pubkey ? `✓ ${truncPub}` : '◆ CONNECT WALLET'}
      </button>
    </div>
  </header>

  <div class="ms-body">

    <!-- Left: Vault panel -->
    <section class="ms-vault-panel" aria-label="Card vault">
      <div class="ms-panel-header">
        <span class="ms-panel-title">VAULT</span>
        <span class="label-dim" style="font-size:14px;">${vaultCount}/60 CARDS</span>
      </div>

      <!-- Progress bar -->
      <div class="ms-vault-progress" role="progressbar"
           aria-valuenow="${vaultCount}" aria-valuemax="60">
        <div class="ms-vault-progress-fill" style="width:${Math.round((vaultCount/60)*100)}%;"></div>
        <span class="ms-vault-progress-label">${Math.round((vaultCount/60)*100)}%</span>
      </div>

      <!-- Tab bar -->
      <div class="ms-tab-bar" role="tablist">
        <button class="ms-tab ms-tab--active" id="ms-tab-vault" role="tab" aria-selected="true" aria-controls="ms-pane-vault">VAULT</button>
        <button class="ms-tab" id="ms-tab-evolve" role="tab" aria-selected="false" aria-controls="ms-pane-evolve">
          EVOLVE${_countEvolvable(owned) > 0 ? ` <span class="ms-evolve-badge">${_countEvolvable(owned)}</span>` : ''}
        </button>
      </div>

      <!-- VAULT pane -->
      <div id="ms-pane-vault" role="tabpanel">
        <!-- Faction filter -->
        <div class="ms-faction-filters" role="group" aria-label="Filter by faction">
          <button class="ms-faction-btn ms-faction-btn--active gba-btn gba-btn--ghost" data-faction="all">ALL</button>
          ${PERSONALITIES.map(p => `
            <button class="ms-faction-btn gba-btn gba-btn--ghost"
              data-faction="${p.faction}"
              style="--fc:${FACTION_COLORS[p.faction]};">
              ${FACTION_NAMES[p.faction].toUpperCase().slice(0,3)}
            </button>`).join('')}
        </div>

        <!-- Card grid 10×6 -->
        <div class="ms-card-grid" id="ms-card-grid" role="list" aria-label="All cards">
          ${cardGrid}
        </div>
      </div>

      <!-- EVOLVE pane -->
      <div id="ms-pane-evolve" role="tabpanel" style="display:none;">
        <div class="ms-evolve-list" id="ms-evolve-list">
          ${_buildEvolveList(owned)}
        </div>
      </div>

    </section>

    <!-- Right: Side panels -->
    <aside class="ms-side">

      <!-- Personality progress -->
      <div class="ms-side-section">
        <div class="ms-panel-header">
          <span class="ms-panel-title">PERSONALITIES</span>
        </div>
        ${LegendaryProgressHTML(perso, 10, vault)}
      </div>

      <!-- Prize pool -->
      <div class="ms-side-section">
        ${PrizePoolHTML(0, vaultCount)}
      </div>

      <!-- Matchmaking -->
      <div class="ms-matchmaking">
        <div class="ms-match-fee">ENTRY FEE: <span class="label-gold">0.001 SOL</span></div>
        <button class="gba-btn gba-btn--primary ms-start-btn" id="ms-start">
          ▶ START BATTLE
        </button>
        <div class="ms-match-info label-dim" id="ms-match-info">
          WIN CARDS · EARN SOL · UNLOCK LEGENDARIES
        </div>
      </div>

    </aside>
  </div>

  <!-- Footer -->
  <footer class="ms-footer">
    <span class="mono label-dim">${truncPub}</span>
    <span class="sep">·</span>
    <span class="label-dim">DEVNET</span>
    <span class="sep">·</span>
    <span class="label-dim">Program: 5i37jW…XfmN</span>
  </footer>

</div>`;
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  // Wallet connect
  container.querySelector('#ms-wallet').addEventListener('click', async () => {
    if (!window.oxarkWallet) {
      _showWalletError(container, 'Phantom or Solflare required');
      window.open('https://phantom.app/', '_blank', 'noopener');
      return;
    }
    try {
      await window.oxarkWallet.connect();
      const pub = window.oxarkWallet.getPublicKey?.()?.toString() ?? '';
      setState({ playerPubkey: pub });
      document.dispatchEvent(new CustomEvent('nav:main', { detail: { pubkey: pub } }));
    } catch (err) {
      if (err?.code === 4001) return; // user rejected — silent
      _showWalletError(container, err?.message ?? 'Wallet connection failed');
    }
  });

  // Tab switching
  container.querySelector('#ms-tab-vault')?.addEventListener('click', () => {
    _switchTab(container, 'vault');
  });
  container.querySelector('#ms-tab-evolve')?.addEventListener('click', () => {
    _switchTab(container, 'evolve');
  });

  // Faction filter
  container.querySelectorAll('.ms-faction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const faction = btn.dataset.faction;
      container.querySelectorAll('.ms-faction-btn').forEach(b => {
        b.classList.toggle('ms-faction-btn--active', b === btn);
      });
      filterVaultGrid(container, faction);
    });
  });

  // Card click → detail modal
  container.querySelector('#ms-card-grid')?.addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const cardId = parseInt(card.dataset.id, 10);
    if (!cardId) return;
    CardDetailModal.show(container.querySelector('.ms-root'), cardId, {
      onBurn:   () => _refreshVaultGrid(container),
      onEvolve: () => _refreshVaultGrid(container),
    });
  });

  // Evolve buttons in EVOLVE pane
  container.querySelector('#ms-evolve-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.ms-evolve-btn');
    if (!btn || btn.disabled) return;
    const childId = parseInt(btn.dataset.child, 10);
    CardDetailModal.show(container.querySelector('.ms-root'), childId, {
      onEvolve: () => _refreshVaultGrid(container),
    });
  });

  // Start battle
  container.querySelector('#ms-start').addEventListener('click', () => {
    startMatchmaking(container);
  });
}

function _switchTab(container, tab) {
  const vaultPane  = container.querySelector('#ms-pane-vault');
  const evolvePane = container.querySelector('#ms-pane-evolve');
  const tabVault   = container.querySelector('#ms-tab-vault');
  const tabEvolve  = container.querySelector('#ms-tab-evolve');
  const isVault    = tab === 'vault';
  if (vaultPane)  vaultPane.style.display  = isVault  ? '' : 'none';
  if (evolvePane) evolvePane.style.display = !isVault ? '' : 'none';
  tabVault?.classList.toggle('ms-tab--active', isVault);
  tabEvolve?.classList.toggle('ms-tab--active', !isVault);
  tabVault?.setAttribute('aria-selected', String(isVault));
  tabEvolve?.setAttribute('aria-selected', String(!isVault));
}

function _refreshVaultGrid(container) {
  const s     = getState();
  const owned = new Set(s.vault);
  const grid  = container.querySelector('#ms-card-grid');
  if (grid) grid.innerHTML = ALL_CARD_IDS.map(id => CardHTML({ id, owned: owned.has(id), compact: true })).join('');
  const evolveList = container.querySelector('#ms-evolve-list');
  if (evolveList) evolveList.innerHTML = _buildEvolveList(owned);
}

function filterVaultGrid(container, faction) {
  const grid = container.querySelector('#ms-card-grid');
  if (!grid) return;
  const s     = getState();
  const owned = new Set(s.vault);
  const cards = faction === 'all'
    ? ALL_CARD_IDS
    : ALL_CARD_IDS.filter(id => getCard(id)?.faction === parseInt(faction, 10));

  grid.innerHTML = cards.map(id => CardHTML({ id, owned: owned.has(id), compact: true })).join('');
}

async function startMatchmaking(container) {
  const btn  = container.querySelector('#ms-start');
  const info = container.querySelector('#ms-match-info');
  if (!btn || !info) return;

  btn.disabled    = true;
  btn.textContent = '● SEARCHING…';
  info.textContent = 'Connecting to server…';

  try {
    await duelWs.connect();

    _unsubWaiting = duelWs.on('matchmaking_waiting', ({ roomId }) => {
      info.textContent = `Searching for opponent… [${roomId}]`;
    });

    _unsubMatched = duelWs.on('matchmaking_matched', ({ roomId, role, opponentWallet, opponentId }) => {
      _unsubMatchmaking();
      if (_matchInterval) { clearInterval(_matchInterval); _matchInterval = null; }
      const isHost = role === 'host';
      const duelId = `${roomId}-R1`;
      setState({
        matchId: roomId,
        opponentPubkey: opponentWallet ?? null,
        isHost,
        duelId,
        opponentPlayerId: opponentId,
        phase: 'preparation',
      });
      document.dispatchEvent(new CustomEvent('nav:preparation', { detail: { matchId: roomId } }));
    });

    _matchInterval = setInterval(() => {
      btn.textContent = `● SEARCHING${'·'.repeat((_dots++ % 3) + 1)}`;
    }, 500);

    const s = getState();
    duelWs.enqueueMatchmaking({
      wallet:     s.playerPubkey || null,
      name:       (s.playerPubkey || 'Player').slice(0, 8),
      card_count: s.vault.length,
    });

  } catch {
    // Server unavailable — demo fallback
    _matchInterval = setInterval(() => {
      btn.textContent = `● SEARCHING${'·'.repeat((_dots++ % 3) + 1)}`;
    }, 500);
    info.textContent = 'Demo mode (server offline)';
    setTimeout(() => {
      if (_matchInterval) { clearInterval(_matchInterval); _matchInterval = null; }
      const matchId = `demo-${Date.now()}`;
      setState({ matchId, phase: 'preparation', isHost: true, duelId: `${matchId}-R1` });
      document.dispatchEvent(new CustomEvent('nav:preparation', { detail: { matchId } }));
    }, 2500);
  }
}

/* ── Wallet error banner ────────────────────────────────────────────── */
function _showWalletError(container, msg) {
  const existing = container.querySelector('.ms-wallet-err');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'ms-wallet-err';
  el.textContent = msg;
  container.querySelector('.ms-root')?.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-ms')) return;
  const el = document.createElement('style');
  el.id = 'style-ms';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.ms-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.ms-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.ms-brand { display: flex; align-items: center; gap: 10px; }
.ms-brand-name { font-size: 24px; color: var(--accent-gold); letter-spacing: 0.12em; }
.ms-tagline { font-size: 12px; letter-spacing: 0.08em; color: var(--text-dim); }
.ms-hud { flex-shrink: 0; }
.ms-wallet-btn { font-size: 14px; padding: 3px 10px; }
.ms-wallet-err {
  position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
  background: var(--accent-red); color: #fff; padding: 6px 18px;
  font-size: 16px; letter-spacing: 0.05em; z-index: 200;
  animation: ms-err-fade 4s ease forwards;
}
@keyframes ms-err-fade { 0%,80%{opacity:1} 100%{opacity:0} }

/* Body */
.ms-body { flex: 1; display: flex; min-height: 0; }

/* Vault panel */
.ms-vault-panel {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  padding: 8px 10px 0; border-right: var(--border-dim);
  overflow: hidden;
}
.ms-panel-header {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 5px; flex-shrink: 0;
}
.ms-panel-title { font-size: 16px; letter-spacing: 0.12em; color: var(--accent-gold); }

/* Progress bar */
.ms-vault-progress {
  height: 6px; background: rgba(255,255,255,0.07); margin-bottom: 6px;
  position: relative; flex-shrink: 0; overflow: hidden;
}
.ms-vault-progress-fill { height: 100%; background: var(--accent-gold); transition: width 0.5s; }
.ms-vault-progress-label {
  position: absolute; right: 0; top: -14px;
  font-size: 11px; color: var(--text-dim);
}

/* Faction filters */
.ms-faction-filters {
  display: flex; gap: 3px; flex-shrink: 0; margin-bottom: 6px; flex-wrap: wrap;
}
.ms-faction-btn {
  font-size: 12px; padding: 2px 8px;
  border-color: rgba(255,255,255,0.12);
}
.ms-faction-btn:hover { border-color: var(--fc, var(--accent-gold)); color: var(--text-cream); }
.ms-faction-btn--active { border-color: var(--accent-gold); color: var(--text-cream); background: rgba(201,162,39,0.1); }

/* Card grid */
.ms-card-grid {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px;
  align-content: start; padding-bottom: 4px;
}
.ms-card-grid::-webkit-scrollbar { width: 3px; }
.ms-card-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.2); }
.ms-card-grid .ark-card--compact { width: 100%; min-width: 0; }

/* Side panel */
.ms-side {
  width: 240px; flex-shrink: 0;
  display: flex; flex-direction: column;
  padding: 8px 10px; gap: 10px; overflow-y: auto;
}
.ms-side::-webkit-scrollbar { width: 2px; }
.ms-side-section {
  display: flex; flex-direction: column; gap: 5px;
  padding-bottom: 8px; border-bottom: var(--border-dim);
}

/* Matchmaking */
.ms-matchmaking {
  display: flex; flex-direction: column; gap: 6px; margin-top: auto;
  padding-top: 8px; border-top: var(--border-dim);
}
.ms-match-fee { font-size: 14px; letter-spacing: 0.06em; color: var(--text-dim); }
.ms-start-btn {
  width: 100%; justify-content: center; font-size: 20px; padding: 10px;
  letter-spacing: 0.06em;
}
.ms-match-info { font-size: 12px; text-align: center; letter-spacing: 0.04em; }

/* Tabs */
.ms-tab-bar {
  display: flex; gap: 0; flex-shrink: 0; border-bottom: var(--border-dim); margin-bottom: 6px;
}
.ms-tab {
  padding: 4px 14px; font-size: 13px; letter-spacing: 0.08em;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-dim); cursor: pointer; font-family: var(--font-main);
  transition: color 80ms, border-color 80ms;
}
.ms-tab:hover { color: var(--text-cream); }
.ms-tab--active { color: var(--accent-gold); border-bottom-color: var(--accent-gold); }
.ms-evolve-badge {
  display: inline-block; background: var(--accent-red); color: #fff;
  font-size: 10px; padding: 0 4px; border-radius: 2px; margin-left: 4px;
  vertical-align: middle; line-height: 15px;
}

/* Evolve list */
.ms-evolve-list {
  display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto; flex: 1; padding-right: 4px;
}
.ms-evolve-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
}
.ms-evolve-row--ready { border-color: rgba(201,162,39,0.35); background: rgba(201,162,39,0.05); }
.ms-evolve-row-info { display: flex; flex-direction: column; gap: 2px; }
.ms-evolve-result { font-size: 15px; letter-spacing: 0.05em; }
.ms-evolve-recipe { font-size: 12px; }
.ms-evolve-btn { font-size: 14px; padding: 4px 12px; }

/* Footer */
.ms-footer {
  height: 32px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; gap: 0; border-top: var(--border-dim);
  background: rgba(3,6,15,0.7);
}
`;
