// preparation.js — Screen 2: Preparation Phase (3-min timer, 5-slot field, ZK commit)
// mount(container, detail) / unmount(container)

import { ALL_CARD_IDS, getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, ACTION_LABELS, ACTION_ICONS } from './common/Card.js';
import { ActionTypeSelectorHTML, injectActionTypeSelectorCSS, ACTION_TYPES } from './common/ActionTypeSelector.js';
import { startTimer } from './common/Timer.js';
import { getState, setState } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';

const PREP_SECS = 180; // 3 minutes

let _stopTimer    = null;
let _activeSlot   = null;   // index 0-4 currently editing
let _field        = [null, null, null, null, null]; // {cardId, actionType}|null
let _vault        = [];

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();
  injectActionTypeSelectorCSS();

  const s    = getState();
  _vault     = detail.vault   ?? s.vault   ?? [];
  _field     = [null, null, null, null, null];
  _activeSlot = null;

  setState({ phase: 'preparation', fieldCards: _field });
  container.innerHTML = buildHTML();
  bindEvents(container);

  const timerEl = container.querySelector('#prep-timer');
  _stopTimer = startTimer(timerEl, PREP_SECS, () => onTimeout(container));
}

export function unmount(container) {
  _stopTimer?.();
  _stopTimer = null;
  _activeSlot = null;
  _field = [null, null, null, null, null];
  container.innerHTML = '';
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildHTML() {
  const owned  = new Set(_vault);
  const ownedCards = ALL_CARD_IDS.filter(id => owned.has(id));

  return `
<div class="prep-root" role="main" aria-label="Preparation Phase">

  <!-- Top bar -->
  <header class="prep-topbar">
    <div class="chip prep-phase-label">PREPARATION PHASE</div>
    <div class="prep-timer-wrap" aria-live="polite" aria-atomic="true">
      <span class="label-dim" style="font-size:14px;">TIME</span>
      <span class="prep-timer" id="prep-timer" aria-label="Time remaining">3:00</span>
    </div>
    <div class="label-dim" style="font-size:14px;">SELECT 5 CARDS + ACTIONS</div>
  </header>

  <div class="prep-body">

    <!-- Field (5 slots) -->
    <section class="prep-field-panel" aria-label="Your field">
      <div class="prep-field-title">YOUR FIELD</div>
      <div class="prep-slots" id="prep-slots" role="list">
        ${renderSlots()}
      </div>

      <!-- Action type selector (shown when a slot is active) -->
      <div class="prep-action-picker" id="prep-action-picker" style="display:none;">
        <div class="prep-action-title label-dim">CHOOSE ACTION TYPE</div>
        ${ActionTypeSelectorHTML()}
      </div>

      <!-- Confirm button -->
      <button class="gba-btn gba-btn--primary prep-confirm-btn" id="prep-confirm" disabled>
        ✓ CONFIRM &amp; COMMIT
      </button>
      <div class="label-dim prep-hint" id="prep-hint">Fill all 5 slots to confirm</div>
    </section>

    <!-- Vault grid (owned cards) -->
    <section class="prep-vault-panel" aria-label="Vault — select cards">
      <div class="prep-vault-header">
        <span class="prep-vault-title">VAULT <span class="label-dim">(${ownedCards.length})</span></span>
        <span class="label-dim" style="font-size:13px;">Click to place in empty slot</span>
      </div>
      <div class="prep-vault-grid" id="prep-vault-grid" role="list">
        ${ownedCards.map(id => CardFrameHTML({ id, owned: true })).join('')}
      </div>
    </section>

  </div>

</div>`;
}

function renderSlots() {
  return _field.map((slot, i) => {
    const isActive = _activeSlot === i;
    if (!slot) {
      return `<div class="prep-slot prep-slot--empty${isActive ? ' prep-slot--active' : ''}"
        data-slot="${i}" role="listitem" tabindex="0"
        aria-label="Empty slot ${i + 1}">
        <span class="prep-slot-num">${i + 1}</span>
      </div>`;
    }
    const card = getCard(slot.cardId);
    const actionLabel = ACTION_LABELS[slot.actionType] ?? '—';
    return `<div class="prep-slot prep-slot--filled${isActive ? ' prep-slot--active' : ''}"
      data-slot="${i}" role="listitem" tabindex="0"
      aria-label="Slot ${i + 1}: card ${slot.cardId}">
      ${CardFrameHTML({ id: slot.cardId })}
      <div class="prep-slot-action" style="font-size:11px;color:var(--accent-gold);">${actionLabel}</div>
      <button class="prep-slot-remove" data-slot="${i}" aria-label="Remove card from slot ${i+1}">✕</button>
    </div>`;
  }).join('');
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  // Slot click — activate slot or show action picker
  container.querySelector('#prep-slots').addEventListener('click', e => {
    const slotEl = e.target.closest('[data-slot]');
    if (!slotEl) return;
    const removeBtn = e.target.closest('.prep-slot-remove');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.slot, 10);
      removeCard(container, idx);
      return;
    }
    const idx = parseInt(slotEl.dataset.slot, 10);
    selectSlot(container, idx);
  });

  // Vault card click — place into active slot
  container.querySelector('#prep-vault-grid').addEventListener('click', e => {
    const cardEl = e.target.closest('[data-id]');
    if (!cardEl) return;
    const id = parseInt(cardEl.dataset.id, 10);
    placeCard(container, id);
  });

  // Action type picker
  container.querySelector('#prep-action-picker').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || _activeSlot === null) return;
    const at = parseInt(btn.dataset.action, 10);
    setAction(container, _activeSlot, at);
  });

  // Confirm
  container.querySelector('#prep-confirm').addEventListener('click', () => {
    onConfirm(container);
  });
}

function selectSlot(container, idx) {
  _activeSlot = idx;
  refreshSlots(container);
  const picker = container.querySelector('#prep-action-picker');
  picker.style.display = _field[idx] ? 'block' : 'none';
  if (_field[idx]) highlightAction(container, _field[idx].actionType);
}

function placeCard(container, cardId) {
  // Find first empty slot, or use active slot
  let targetSlot = _activeSlot !== null ? _activeSlot : _field.findIndex(s => !s);
  if (targetSlot < 0) return; // all full

  // Check if card already placed
  if (_field.some(s => s?.cardId === cardId)) return;

  _field[targetSlot] = { cardId, actionType: 0 };
  selectSlot(container, targetSlot);
  refreshVault(container);
  updateConfirm(container);
}

function removeCard(container, idx) {
  _field[idx] = null;
  if (_activeSlot === idx) _activeSlot = null;
  refreshSlots(container);
  const picker = container.querySelector('#prep-action-picker');
  picker.style.display = 'none';
  refreshVault(container);
  updateConfirm(container);
}

function setAction(container, idx, actionType) {
  if (!_field[idx]) return;
  _field[idx] = { ..._field[idx], actionType };
  highlightAction(container, actionType);
  refreshSlots(container);
}

function highlightAction(container, actionType) {
  container.querySelectorAll('.ats-btn').forEach(btn => {
    const on = parseInt(btn.dataset.action, 10) === actionType;
    btn.classList.toggle('ats-btn--active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function refreshSlots(container) {
  const el = container.querySelector('#prep-slots');
  if (el) el.innerHTML = renderSlots();
}

function refreshVault(container) {
  const placedIds = new Set(_field.filter(Boolean).map(s => s.cardId));
  container.querySelectorAll('#prep-vault-grid [data-id]').forEach(el => {
    const id = parseInt(el.dataset.id, 10);
    el.classList.toggle('card-frame--selected', placedIds.has(id));
    el.style.opacity = placedIds.has(id) ? '0.4' : '1';
  });
}

function updateConfirm(container) {
  const filled  = _field.every(s => s !== null);
  const btn     = container.querySelector('#prep-confirm');
  const hint    = container.querySelector('#prep-hint');
  if (btn) btn.disabled = !filled;
  if (hint) hint.textContent = filled
    ? 'Ready — click to commit hand'
    : `Fill all 5 slots to confirm (${_field.filter(Boolean).length}/5)`;
}

async function onConfirm(container) {
  const btn  = container.querySelector('#prep-confirm');
  const hint = container.querySelector('#prep-hint');

  // Guard: already committed this round
  if (getState().commitment !== null) return;

  if (btn) { btn.disabled = true; btn.textContent = '⏳ COMMITTING…'; }

  try {
    const cardIds = _field.map(s => s.cardId);
    const salt    = duelWs.generateSalt();

    // SHA-256 hand commitment (always present)
    const hashBytes    = await duelWs.computeHandCommitment(cardIds, salt);
    const commitmentHex = duelWs.toHex(hashBytes);

    // ── ZK proof generation ───────────────────────────────────────────────
    let zkProofBytes      = null; // { proofA, proofB, proofC }
    let zkPublicSignals   = null; // raw snarkjs string[]
    let zkPublicInputBytes = null; // Uint8Array[](32) × 4

    const zkAvailable = typeof window.zkCardCommit?.proveHandCommit === 'function';

    if (zkAvailable) {
      if (btn)  btn.textContent  = '⏳ ZK PROOF…';
      if (hint) hint.textContent = 'Generating ZK proof — takes a few seconds…';

      const s          = getState();
      const round      = s.round ?? 1;
      const pubkeyBytes = window.oxarkWallet?.getPublicKey?.()?.toBytes?.() ?? null;

      const _zkT0 = performance.now();
      const zkResult = await window.zkCardCommit.proveHandCommit(cardIds, salt, round, pubkeyBytes);
      const _zkMs = Math.round(performance.now() - _zkT0);
      console.log(`[ZK] proveHandCommit done in ${_zkMs}ms — ok=${zkResult.ok}${zkResult.error ? ' err=' + zkResult.error : ''}`);

      if (zkResult.ok) {
        zkProofBytes       = window.zkCardCommit.proofToBytes(zkResult.proof);
        zkPublicSignals    = zkResult.publicSignals;
        zkPublicInputBytes = window.zkCardCommit.publicSignalsToBytes(zkResult.publicSignals);
      } else {
        throw new Error('ZK proof failed: ' + (zkResult.error ?? 'snarkjs unavailable'));
      }
    } else {
      throw new Error('snarkjs not loaded — ZK proof required to commit hand.');
    }
    // ─────────────────────────────────────────────────────────────────────

    setState({
      fieldCards: [..._field],
      commitment: commitmentHex,
      salt,
      zkProofBytes,
      zkPublicSignals,
      zkPublicInputBytes,
    });

    const s = getState();

    // ── On-chain: initDuel (host only) → commitHand ───────────────────────
    if (typeof window.oxarkOnchain?.commitHand === 'function') {
      if (s.isHost && typeof window.oxarkOnchain?.initDuel === 'function') {
        if (btn) btn.textContent = '⏳ INIT DUEL…';
        const myPubkey = window.solana?.publicKey?.toBase58();
        await window.oxarkOnchain.initDuel(
          s.duelId, myPubkey, s.opponentPubkey,
        );
      }

      if (btn) btn.textContent = '⏳ ON-CHAIN COMMIT…';
      await window.oxarkOnchain.commitHand(
        s.duelId,
        s.round ?? 1,
        zkProofBytes.proofA,
        zkProofBytes.proofB,
        zkProofBytes.proofC,
        zkPublicInputBytes,
      );
    }
    // ─────────────────────────────────────────────────────────────────────

    setState({ phase: 'interruption' });

    if (s.duelId && duelWs.isConnected()) {
      duelWs.sendHandCommitted(s.duelId, s.round ?? 1, commitmentHex, {
        zkHasProof: zkProofBytes !== null,
        zkPublicSignals,
      });
    }

    document.dispatchEvent(new CustomEvent('nav:interruption'));
  } catch (err) {
    console.error('[Prep] Commit failed:', err);
    const msg = err.message ?? 'commit failed';
    const userMsg = msg.includes('AlreadyCommitted')
      ? 'Already committed for this round'
      : 'Error: ' + msg;
    if (btn)  { btn.disabled = false; btn.textContent = '✓ CONFIRM & COMMIT'; }
    if (hint) hint.textContent = userMsg;
    setState({ commitment: null }); // allow retry
  }
}

function onTimeout(container) {
  // Auto-select 5 random owned cards
  const avail = [..._vault].sort(() => Math.random() - 0.5).slice(0, 5);
  avail.forEach((id, i) => { _field[i] = { cardId: id, actionType: 0 }; });
  refreshSlots(container);
  updateConfirm(container);
  onConfirm(container);
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-prep')) return;
  const el = document.createElement('style');
  el.id = 'style-prep';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.prep-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.prep-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.prep-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-gold); border-color: var(--accent-gold); }
.prep-timer-wrap { display: flex; align-items: baseline; gap: 6px; }
.prep-timer {
  font-size: 32px; color: var(--accent-gold); letter-spacing: 0.04em; line-height: 1;
  transition: color 0.3s;
}
.prep-timer.timer--urgent { color: var(--accent-red); animation: pulse 0.6s ease-in-out infinite alternate; }
@keyframes pulse { from { opacity: 1; } to { opacity: 0.6; } }

/* Body */
.prep-body { flex: 1; display: flex; min-height: 0; }

/* Field panel */
.prep-field-panel {
  width: 320px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px 12px; border-right: var(--border-dim);
  background: rgba(10,14,26,0.5);
}
.prep-field-title {
  font-size: 14px; letter-spacing: 0.1em; color: var(--text-dim); flex-shrink: 0;
}

/* 5 slots row */
.prep-slots {
  display: flex; gap: 5px; flex-shrink: 0;
}
.prep-slot {
  flex: 1; min-height: 100px; border: 2px solid;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; cursor: pointer; position: relative; overflow: hidden;
  transition: border-color 80ms, background 80ms;
}
.prep-slot--empty {
  border-color: rgba(201,162,39,0.2); border-style: dashed;
  background: rgba(201,162,39,0.03);
}
.prep-slot--empty:hover { border-color: rgba(201,162,39,0.5); background: rgba(201,162,39,0.07); }
.prep-slot--filled { border-color: rgba(201,162,39,0.4); border-style: solid; background: rgba(10,14,26,0.8); }
.prep-slot--active { border-color: var(--accent-gold) !important; background: rgba(201,162,39,0.08) !important; }
.prep-slot-num { font-size: 20px; color: var(--text-dim); }
.prep-slot-action { text-align: center; padding: 0 2px; }
.prep-slot-remove {
  position: absolute; top: 2px; right: 2px;
  background: none; border: none; font-size: 11px;
  color: var(--accent-red); cursor: pointer; font-family: var(--font-main);
  padding: 1px 3px;
}
.prep-slot-remove:hover { background: rgba(214,59,59,0.2); }
.prep-slot .card-frame { width: 100%; }
.prep-vault-grid .card-frame { width: 80px; }

/* Action picker */
.prep-action-picker {
  flex-shrink: 0; padding: 6px; background: rgba(10,14,26,0.6);
  border: var(--border-dim);
}
.prep-action-title { font-size: 12px; letter-spacing: 0.06em; margin-bottom: 5px; }

/* Confirm */
.prep-confirm-btn {
  width: 100%; justify-content: center; font-size: 20px; padding: 10px; flex-shrink: 0;
}
.prep-hint { font-size: 13px; text-align: center; flex-shrink: 0; }

/* Vault panel */
.prep-vault-panel {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  padding: 8px 10px; overflow: hidden;
}
.prep-vault-header {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px; flex-shrink: 0;
}
.prep-vault-title { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-gold); }
.prep-vault-grid {
  flex: 1; overflow-y: auto;
  display: flex; flex-wrap: wrap; gap: 4px; align-content: start;
  padding-bottom: 4px;
}
.prep-vault-grid::-webkit-scrollbar { width: 3px; }
.prep-vault-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.2); }
`;
