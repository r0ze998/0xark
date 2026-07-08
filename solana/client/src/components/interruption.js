// interruption.js — Screen 3: Interruption Phase (1-min, peek, swap, ready)
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, ACTION_LABELS } from './common/Card.js';
import { ActionTypeSelectorHTML, injectActionTypeSelectorCSS } from './common/ActionTypeSelector.js';
import { startTimer } from './common/Timer.js';
import { getState, setState } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';

const INTR_SECS = 60;

let _stopTimer   = null;
let _field       = [];
let _opponentField = null;
let _swapMode    = false;   // are we currently picking a replacement?
let _swapSlot    = null;    // which slot we're swapping
let _vault       = [];

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();
  injectActionTypeSelectorCSS();

  const s    = getState();
  _field     = s.fieldCards.map(c => c ? { ...c } : null);
  _vault     = s.vault ?? [];
  _opponentField = null;
  _swapMode  = false;
  _swapSlot  = null;

  setState({ phase: 'interruption' });
  container.innerHTML = buildHTML();
  bindEvents(container);

  const timerEl = container.querySelector('#intr-timer');
  _stopTimer = startTimer(timerEl, INTR_SECS, () => onTimeout(container));
}

export function unmount(container) {
  _stopTimer?.();
  _stopTimer = null;
  _swapMode = false;
  _swapSlot = null;
  container.innerHTML = '';
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildHTML() {
  const s = getState();
  return `
<div class="intr-root" role="main" aria-label="Interruption Phase">

  <!-- Top bar -->
  <header class="intr-topbar">
    <div class="chip intr-phase-label">INTERRUPTION PHASE</div>
    <div class="intr-timer-wrap">
      <span class="label-dim" style="font-size:14px;">TIME</span>
      <span class="intr-timer" id="intr-timer">1:00</span>
    </div>
    <div class="label-dim" style="font-size:14px;">PEEK · SWAP · READY</div>
  </header>

  <div class="intr-body">

    <!-- Opponent area (visible after peek) -->
    <section class="intr-opponent-area" id="intr-opp-area" aria-label="Opponent field">
      <div class="intr-area-label label-dim">OPPONENT FIELD</div>
      <div class="intr-opp-slots" id="intr-opp-slots">
        ${renderOppSlots()}
      </div>
      <div class="intr-opp-hint label-dim" id="intr-opp-hint">
        ${_opponentField ? '' : 'Peek to reveal'}
      </div>
    </section>

    <!-- Your field -->
    <section class="intr-your-area" aria-label="Your field">
      <div class="intr-area-label label-dim">YOUR FIELD</div>
      <div class="intr-your-slots" id="intr-your-slots">
        ${renderYourSlots()}
      </div>

      <!-- Swap vault (hidden until swap mode) -->
      <div class="intr-swap-vault" id="intr-swap-vault" style="display:none;">
        <div class="intr-swap-title label-dim">SELECT REPLACEMENT CARD</div>
        <div class="intr-swap-grid" id="intr-swap-grid">
          ${renderSwapGrid()}
        </div>
      </div>

      <!-- Action edit for selected slot -->
      <div class="intr-action-edit" id="intr-action-edit" style="display:none;">
        <div class="label-dim" style="font-size:13px;margin-bottom:4px;">RE-ASSIGN ACTION</div>
        ${ActionTypeSelectorHTML()}
      </div>
    </section>

    <!-- Controls -->
    <aside class="intr-controls">
      <!-- Peek -->
      <div class="intr-ctrl-section">
        <div class="intr-ctrl-title">INTEL</div>
        <button class="gba-btn intr-peek-btn" id="intr-peek"
          ${getState().hasPeeked ? 'disabled' : ''}>
          👁 PEEK OPPONENT
          <span class="intr-fee">(0.005 SOL)</span>
        </button>
        ${getState().hasPeeked ? '<div class="label-dim" style="font-size:13px;">Peeked ✓</div>' : ''}
      </div>

      <!-- Swap info -->
      <div class="intr-ctrl-section">
        <div class="intr-ctrl-title">SWAP</div>
        <div class="label-dim" style="font-size:13px;" id="intr-swap-count">
          1 free swap remaining
        </div>
        <div class="label-dim" style="font-size:13px;">Click your card to swap</div>
      </div>

      <!-- Ready -->
      <div class="intr-ctrl-section" style="margin-top:auto;">
        <button class="gba-btn gba-btn--primary intr-ready-btn" id="intr-ready">
          ✓ READY
        </button>
      </div>
    </aside>

  </div>

</div>`;
}

function renderOppSlots() {
  if (!_opponentField) {
    return Array(5).fill(0).map(() => CardFrameHTML({ faceDown: true })).join('');
  }
  return _opponentField.map(c => CardFrameHTML({ id: c.cardId })).join('');
}

function renderYourSlots() {
  return _field.map((slot, i) => {
    if (!slot) return `<div class="intr-your-slot" data-your-slot="${i}"></div>`;
    return `<div class="intr-your-slot${_swapSlot === i ? ' intr-slot--swap-active' : ''}"
      data-your-slot="${i}" tabindex="0"
      aria-label="Your card slot ${i+1}, ${slot.cardId}">
      ${CardFrameHTML({ id: slot.cardId })}
      <div class="intr-slot-action label-gold" style="font-size:13px;">${ACTION_LABELS[slot.actionType] ?? ''}</div>
    </div>`;
  }).join('');
}

function renderSwapGrid() {
  const placedIds = new Set(_field.filter(Boolean).map(s => s.cardId));
  const avail = (_vault).filter(id => !placedIds.has(id) || id === _field[_swapSlot]?.cardId);
  return avail.map(id => CardFrameHTML({ id, owned: true })).join('');
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  // Peek
  container.querySelector('#intr-peek').addEventListener('click', async () => {
    await doPeek(container);
  });

  // Your slot click — enter swap mode
  container.querySelector('#intr-your-slots').addEventListener('click', e => {
    const slotEl = e.target.closest('[data-your-slot]');
    if (!slotEl) return;
    const idx = parseInt(slotEl.dataset.yourSlot, 10);
    enterSwapMode(container, idx);
  });

  // Swap grid card click
  container.querySelector('#intr-swap-grid').addEventListener('click', e => {
    const cardEl = e.target.closest('[data-id]');
    if (!cardEl || _swapSlot === null) return;
    const newId = parseInt(cardEl.dataset.id, 10);
    doSwap(container, _swapSlot, newId);
  });

  // Action edit
  container.querySelector('#intr-action-edit').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || _swapSlot === null) return;
    const at = parseInt(btn.dataset.action, 10);
    if (_field[_swapSlot]) {
      _field[_swapSlot] = { ..._field[_swapSlot], actionType: at };
      refreshYourSlots(container);
      highlightAction(container, at);
    }
  });

  // Ready
  container.querySelector('#intr-ready').addEventListener('click', () => {
    onReady(container);
  });
}

async function doPeek(container) {
  const btn = container.querySelector('#intr-peek');
  btn.disabled = true;
  btn.textContent = '⏳ PEEKING…';

  try {
    let result = null;
    if (window.x402?.scoutPeek) {
      const s = getState();
      result = await window.x402.scoutPeek(s.matchId, s.opponentPubkey, window.solana, null);
    }
    // Fallback: random opponent hand for demo
    if (!result) {
      result = { cards: [21,22,23,24,25].map(id => ({ cardId: id, actionType: 2 })) };
    }
    _opponentField = result.cards ?? result;
    setState({ hasPeeked: true, opponentField: _opponentField });
    refreshOppSlots(container);
    btn.textContent = '👁 PEEKED ✓';
    container.querySelector('#intr-opp-hint').textContent = 'Opponent field revealed';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '👁 PEEK OPPONENT\n(0.005 SOL)';
  }
}

function enterSwapMode(container, idx) {
  const s = getState();
  if (s.hasPeeked && _swapSlot !== null && _swapSlot !== idx) {
    // Already used swap
    return;
  }
  _swapSlot = idx;
  _swapMode = true;
  refreshYourSlots(container);

  const swapVault = container.querySelector('#intr-swap-vault');
  const actionEdit = container.querySelector('#intr-action-edit');
  const swapGrid = container.querySelector('#intr-swap-grid');
  swapVault.style.display = 'block';
  actionEdit.style.display = 'block';
  swapGrid.innerHTML = renderSwapGrid();
  if (_field[idx]) highlightAction(container, _field[idx].actionType);
}

function doSwap(container, idx, newCardId) {
  _field[idx] = { cardId: newCardId, actionType: _field[idx]?.actionType ?? 0 };
  refreshYourSlots(container);
  const swapGrid = container.querySelector('#intr-swap-grid');
  swapGrid.innerHTML = renderSwapGrid();

  container.querySelector('#intr-swap-count').textContent = '0 swaps remaining';
  // Close swap vault after selection
  container.querySelector('#intr-swap-vault').style.display = 'none';
  container.querySelector('#intr-action-edit').style.display = 'none';
  _swapMode = false;
  _swapSlot = null;
}

async function onReady(container) {
  const btn = container.querySelector('#intr-ready');
  btn.disabled = true;
  btn.textContent = '⏳ COMMITTING…';

  try {
    let commitment = getState().commitment;
    let salt       = getState().salt;

    // Re-commit if field changed after swap
    const fieldChanged = _field.some((slot, i) => slot?.cardId !== getState().fieldCards[i]?.cardId);
    if (fieldChanged) {
      salt = duelWs.generateSalt();
      const hashBytes = await duelWs.computeHandCommitment(_field.map(s => s.cardId), salt);
      commitment = duelWs.toHex(hashBytes);
    }

    setState({ fieldCards: [..._field], commitment, salt, phase: 'reveal' });

    const s = getState();
    if (s.duelId && duelWs.isConnected()) {
      duelWs.sendHandRevealed(
        s.duelId, 1,
        _field.map(slot => slot.cardId),
        _field.map(slot => slot.actionType),
      );
    }

    document.dispatchEvent(new CustomEvent('nav:reveal'));
  } catch {
    btn.disabled = false;
    btn.textContent = '✓ READY';
  }
}

function onTimeout(container) {
  const s = getState();
  setState({ fieldCards: [..._field], phase: 'reveal' });
  if (s.duelId && duelWs.isConnected()) {
    duelWs.sendHandRevealed(
      s.duelId, 1,
      _field.map(slot => slot.cardId),
      _field.map(slot => slot.actionType),
    );
  }
  document.dispatchEvent(new CustomEvent('nav:reveal'));
}

function refreshOppSlots(container) {
  const el = container.querySelector('#intr-opp-slots');
  if (el) el.innerHTML = renderOppSlots();
}

function refreshYourSlots(container) {
  const el = container.querySelector('#intr-your-slots');
  if (el) el.innerHTML = renderYourSlots();
}

function highlightAction(container, actionType) {
  container.querySelectorAll('.ats-btn').forEach(btn => {
    const on = parseInt(btn.dataset.action, 10) === actionType;
    btn.classList.toggle('ats-btn--active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-intr')) return;
  const el = document.createElement('style');
  el.id = 'style-intr';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.intr-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

.intr-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.intr-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-blue); border-color: var(--accent-blue); }
.intr-timer-wrap { display: flex; align-items: baseline; gap: 6px; }
.intr-timer {
  font-size: 32px; color: var(--accent-gold); letter-spacing: 0.04em;
  transition: color 0.3s;
}
.intr-timer.timer--urgent { color: var(--accent-red); animation: pulse 0.6s ease-in-out infinite alternate; }

.intr-body { flex: 1; display: flex; min-height: 0; }

/* Opponent area */
.intr-opponent-area {
  width: 100%; border-bottom: var(--border-dim);
  display: flex; flex-direction: column; gap: 5px;
  flex-shrink: 0;
}

.intr-body {
  flex: 1; display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr 220px;
  min-height: 0;
}
.intr-opponent-area { grid-column: 1; grid-row: 1; padding: 8px 12px 6px; border-bottom: var(--border-dim); }
.intr-your-area { grid-column: 1; grid-row: 2; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
.intr-controls { grid-column: 2; grid-row: 1 / 3; border-left: var(--border-dim); padding: 10px; display: flex; flex-direction: column; gap: 10px; }

.intr-area-label { font-size: 13px; letter-spacing: 0.1em; margin-bottom: 4px; flex-shrink: 0; }
.intr-opp-hint { font-size: 13px; }

.intr-opp-slots, .intr-your-slots {
  display: flex; gap: 6px; flex-shrink: 0;
}
.intr-opp-slots .card-frame,
.intr-your-slots .card-frame,
.intr-swap-grid .card-frame { width: 112px; }

.intr-your-slot {
  cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px;
  border: 1px solid rgba(201,162,39,0.2); flex-shrink: 0;
  transition: border-color 80ms;
}
.intr-your-slot:hover { border-color: var(--accent-gold); }
.intr-slot--swap-active { border-color: var(--accent-blue) !important; background: rgba(74,144,217,0.08); }
.intr-slot-action { font-size: 13px; text-align: center; }

/* Swap vault */
.intr-swap-vault {
  flex-shrink: 0; border: var(--border-dim); padding: 6px;
  max-height: 100px;
}
.intr-swap-title { font-size: 13px; letter-spacing: 0.06em; margin-bottom: 4px; }
.intr-swap-grid {
  display: flex; gap: 4px; overflow-x: auto; flex-wrap: nowrap;
}
.intr-swap-grid::-webkit-scrollbar { height: 3px; }
.intr-swap-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.2); }

/* Action edit */
.intr-action-edit { flex-shrink: 0; padding: 4px 0; }

/* Controls */
.intr-ctrl-section { display: flex; flex-direction: column; gap: 5px; }
.intr-ctrl-title { font-size: 14px; letter-spacing: 0.1em; color: var(--accent-gold); }
.intr-peek-btn { font-size: 15px; padding: 6px 10px; display: flex; flex-direction: column; gap: 1px; }
.intr-fee { font-size: 13px; color: var(--text-dim); }
.intr-ready-btn { width: 100%; justify-content: center; font-size: 20px; padding: 10px; }
`;
