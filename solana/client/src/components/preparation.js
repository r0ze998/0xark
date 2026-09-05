import { injectStyle } from '../lib/inject-style.js';
import { PREPARATION_CSS } from '../style/preparation.js';
// preparation.js — Screen 2: Preparation Phase (3-min timer, 5-slot field, ZK commit)
// mount(container, detail) / unmount(container)

import { practiceOpponent } from '../lib/practice-mode.js';
import { summarizeHand } from '../lib/hand-summary.js';
import { ALL_CARD_IDS, getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, ACTION_LABELS, CARD_NAMES, FACTION_NAMES } from './common/Card.js';
import { ActionTypeSelectorHTML, injectActionTypeSelectorCSS, ACTION_TYPES } from './common/ActionTypeSelector.js';
import { placeInHand, completeHand, snapshotHand } from '../lib/preparation-hand.js';
import { startTimer } from './common/Timer.js';
import { RoundHudHTML, injectRoundUiCSS } from './common/round-ui.js';
import { EnergyHudHTML, attachEnergyHud, injectEnergyCss, computeEnergy } from './common/energy-hud.js';
import { pxIcon } from '../lib/px-icons.js';
import { getState, setState } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';

let _detachEnergy = () => {};

const PREP_SECS = 180; // 3 minutes

let _stopTimer    = null;
let _activeSlot   = null;   // index 0-4 currently editing
let _field        = [null, null, null, null, null]; // {cardId, actionType}|null
let _vault        = [];
let _targetSlot   = null; // explicit replacement/empty slot; null fills next empty
let _committing   = false;
let _remaining   = PREP_SECS;
let _timerStarted = 0;
let _mountId      = 0;

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectPreparationCSS();
  injectCardCSS();
  injectActionTypeSelectorCSS();
  injectRoundUiCSS();
  injectEnergyCss();

  const s    = getState();
  _vault     = detail.vault   ?? s.vault   ?? [];
  _field     = [null, null, null, null, null];
  _activeSlot = null;
  _targetSlot = null;
  _committing = false;
  _remaining = PREP_SECS;
  _mountId++;

  setState({ phase: 'preparation', fieldCards: _field });
  container.innerHTML = buildHTML();
  bindEvents(container);

  refreshVault(container);
  updateConfirm(container);
  refreshAction(container);
  if (window.oxarkPreview) {
    container.querySelector('#prep-timer').textContent = '∞';
    container.querySelector('#prep-timer').setAttribute('aria-label', 'Untimed practice');
  } else resumeTimer(container);

  // Energy HUD (display only here; the spend + gate live at commit / lobby).
  const pubkey = s.playerPubkey ?? window.oxarkWallet?.getPublicKey?.()?.toString();
  _loadEnergy(container, pubkey, detail.playerState);
}

export function unmount(container) {
  _mountId++;
  _stopTimer?.();
  _stopTimer = null;
  _detachEnergy(); _detachEnergy = () => {};
  _activeSlot = null;
  _field = [null, null, null, null, null];
  container.innerHTML = '';
}

async function _loadEnergy(container, pubkey, seed) {
  const mountId = _mountId;
  const apply = (ps) => {
    if (mountId !== _mountId) return;
    _detachEnergy();
    _detachEnergy = attachEnergyHud(container, { playerState: ps, refill: true });
  };
  if (seed) apply(seed);
  if (computeEnergy(seed).energyNow != null) return;
  if (typeof window.oxarkOnchain?.getPlayerState !== 'function' || !pubkey) return;
  try {
    const ps = await window.oxarkOnchain.getPlayerState(pubkey);
    if (ps) apply(ps);
  } catch (_) { /* keep seed/placeholder */ }
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
    <div class="prep-topbar-right">
      ${EnergyHudHTML(null, { refill: true })}
      ${RoundHudHTML()}
    </div>
  </header>

  <div class="prep-body">

    <!-- Field (5 slots) -->
    <section class="prep-field-panel" aria-label="Your field">
      <div class="prep-field-heading"><div class="prep-field-title">Build your hand</div><span class="chip" id="prep-count">0 / 5</span></div>
      <div class="prep-next" id="prep-next" role="status" aria-live="polite">Choose a card from your vault</div>
      <div class="prep-hand-summary" id="prep-hand-summary" aria-live="polite"></div>
      <div class="prep-slots" id="prep-slots" role="group" aria-label="Your five card slots">
        ${renderSlots()}
      </div>

      <!-- Action type selector (shown when a slot is active) -->
      <div class="prep-action-picker" id="prep-action-picker">
        <div class="prep-action-heading"><div class="prep-action-title" id="prep-action-title">CHOOSE A CARD</div><button class="gba-btn gba-btn--ghost prep-remove-selected" id="prep-remove" disabled>REMOVE</button></div>
        ${ActionTypeSelectorHTML()}
        <div class="prep-action-desc" id="prep-action-desc" aria-live="polite">Each card gets one action. Select a field slot to review or change it.</div>
      </div>

      <!-- Confirm button -->
      <button class="gba-btn gba-btn--primary prep-confirm-btn" id="prep-confirm" disabled>
        ${pxIcon('check')} SEAL YOUR HAND
      </button>
      <div class="prep-hint" id="prep-hint" role="status" aria-live="polite">Fill all 5 slots to confirm</div>
      ${!window.oxarkPreview && (getState().round ?? 1) === 1
        ? `<div class="prep-energy-note label-dim">consumes ${pxIcon('bolt', { size: 12 })}1 (charged once per duel)</div>`
        : ''}
    </section>

    <!-- Vault grid (owned cards) -->
    <section class="prep-vault-panel" aria-label="Vault — select cards">
      <div class="prep-vault-header">
        <span class="prep-vault-title">COLLECTION <span class="label-dim">(${ownedCards.length})</span></span>
        <span class="label-dim" style="font-size:13px;">Choose 5 · arrows to browse · Enter to add</span>${window.oxarkPreview ? '<button id="prep-sample" class="gba-btn gba-btn--ghost">Deal me five</button>' : ''}
      </div>
      <div class="prep-filter-row"><label for="prep-faction">Faction</label><select id="prep-faction"><option value="">All factions</option>${FACTION_NAMES.map((name, i) => `<option value="${i}">${name}</option>`).join('')}</select><span id="prep-filter-count" role="status">${ownedCards.length} cards</span></div>
      <div class="prep-vault-grid" id="prep-vault-grid" role="group" aria-label="Owned cards">
        ${ownedCards.map(id => CardFrameHTML({ id, owned: true })).join('')}
      </div>
      <div class="prep-timeout-note label-dim">${window.oxarkPreview ? 'UNTIMED PRACTICE · Select a card above to change its action. Seal when you are ready.' : 'At 0:00, empty slots fill and your hand commits. Selected cards and actions stay.'}</div>
    </section>

  </div>

</div>`;
}

function renderSlots() {
  return _field.map((slot, i) => {
    const active = _activeSlot === i;
    const next = _targetSlot === i || (_targetSlot === null && _field.findIndex(c => !c) === i);
    const label = slot ? `Slot ${i + 1}: ${CARD_NAMES[slot.cardId] ?? 'Card'}, ${ACTION_TYPES[slot.actionType]?.label ?? ''}` : `Empty slot ${i + 1}`;
    return `<div class="prep-slot ${slot ? 'prep-slot--filled' : 'prep-slot--empty'}${active ? ' prep-slot--active' : ''}${next ? ' prep-slot--next' : ''}"
      data-slot="${i}" role="button" tabindex="${_committing ? -1 : 0}" aria-pressed="${active}" aria-disabled="${_committing}" aria-label="${label}">
      <span class="prep-slot-index">${i + 1}</span>
      ${slot ? `${CardFrameHTML({ id: slot.cardId })}<div class="prep-slot-action">${ACTION_LABELS[slot.actionType] ?? '—'}</div>` : `<span class="prep-slot-num">+</span><span class="prep-slot-empty-label">${next ? 'NEXT' : 'EMPTY'}</span>`}
    </div>`;
  }).join('');
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  const slots = container.querySelector('#prep-slots');
  slots.addEventListener('click', e => {
    const el = e.target.closest('[data-slot]');
    if (el && !_committing) selectSlot(container, Number(el.dataset.slot));
  });
  slots.addEventListener('keydown', e => {
    const el = e.target.closest('[data-slot]');
    if (!el || _committing) return;
    const idx = Number(el.dataset.slot);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); selectSlot(container, idx);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); removeCard(container, idx);
    } else {
      const next = e.key === 'ArrowRight' ? (idx + 1) % 5 : e.key === 'ArrowLeft' ? (idx + 4) % 5 : e.key === 'Home' ? 0 : e.key === 'End' ? 4 : null;
      if (next !== null) { e.preventDefault(); slots.querySelector(`[data-slot="${next}"]`)?.focus(); }
    }
  });
  const vault = container.querySelector('#prep-vault-grid');
  container.querySelector('#prep-faction').addEventListener('change', event => {
    const faction = event.target.value;
    let count = 0;
    vault.querySelectorAll('[data-id]').forEach(card => {
      card.hidden = faction !== '' && getCard(Number(card.dataset.id)).faction !== Number(faction);
      if (!card.hidden) count++;
    });
    container.querySelector('#prep-filter-count').textContent = `${count} cards`;
  });
  vault.addEventListener('click', e => {
    const el = e.target.closest('[data-id]');
    if (el && !_committing) placeCard(container, Number(el.dataset.id));
  });
  vault.addEventListener('keydown', e => {
    const el = e.target.closest('[data-id]');
    if (!el || _committing) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeCard(container, Number(el.dataset.id)); return; }
    const cards = [...vault.querySelectorAll('[data-id]:not([hidden])')];
    const idx = cards.indexOf(el);
    const columns = cards.filter(card => card.offsetTop === cards[0]?.offsetTop).length || 1;
    const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[e.key];
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? cards.length - 1 : offset !== undefined ? Math.max(0, Math.min(cards.length - 1, idx + offset)) : null;
    if (next !== null) { e.preventDefault(); cards[next]?.focus(); }
  });
  container.querySelector('#prep-action-picker').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn && _activeSlot !== null && !_committing) setAction(container, _activeSlot, Number(btn.dataset.action));
  });
  container.querySelector('#prep-remove').addEventListener('click', () => {
    if (_activeSlot !== null) removeCard(container, _activeSlot);
  });
  container.querySelector('#prep-sample')?.addEventListener('click', () => {
    if (_committing) return;
    _field = completeHand(_field, [5, 18, 30, 43, 60, ..._vault].filter(id => _vault.includes(id)));
    _activeSlot = 0; _targetSlot = null;
    refreshSlots(container); refreshVault(container); refreshAction(container); updateConfirm(container);
  });
  container.querySelector('#prep-confirm').addEventListener('click', () => onConfirm(container));
}

function selectSlot(container, idx) {
  if (_committing) return;
  _activeSlot = idx;
  _targetSlot = idx;
  refreshSlots(container);
  refreshAction(container);
  updateConfirm(container);
}

function placeCard(container, cardId) {
  if (_committing || !_vault.includes(cardId)) return;
  const existing = _field.findIndex(c => c?.cardId === cardId);
  if (existing >= 0) { selectSlot(container, existing); return; }
  const next = placeInHand(_field, cardId, _targetSlot);
  if (next === _field) {
    container.querySelector('#prep-next').textContent = 'Hand full — select a field slot to replace it';
    return;
  }
  _field = next;
  _activeSlot = _field.findIndex(c => c?.cardId === cardId);
  _targetSlot = null; // keep the new card's action visible; next choice fills a hole
  refreshSlots(container);
  refreshVault(container);
  refreshAction(container);
  updateConfirm(container);
}

function removeCard(container, idx) {
  if (_committing || !_field[idx]) return;
  _field = _field.map((card, i) => i === idx ? null : card);
  _activeSlot = idx;
  _targetSlot = idx;
  refreshSlots(container);
  refreshVault(container);
  refreshAction(container);
  updateConfirm(container);
}

function setAction(container, idx, actionType) {
  if (_committing || !_field[idx] || !ACTION_TYPES.some(a => a.id === actionType)) return;
  _field = _field.map((card, i) => i === idx ? { ...card, actionType } : card);
  refreshAction(container);
  refreshSlots(container);
}

function refreshAction(container) {
  const card = _field[_activeSlot];
  const action = card ? ACTION_TYPES.find(a => a.id === card.actionType) : null;
  container.querySelector('#prep-action-title').textContent = card
    ? `SLOT ${_activeSlot + 1} · ${CARD_NAMES[card.cardId] ?? 'CARD'}` : 'CHOOSE A CARD';
  container.querySelector('#prep-action-desc').textContent = action
    ? `${action.label} — ${action.desc}` : 'Choose a card, then set its action here.';
  container.querySelectorAll('.ats-btn').forEach(btn => {
    const on = Number(btn.dataset.action) === action?.id;
    btn.classList.toggle('ats-btn--active', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.disabled = _committing || !card;
  });
  container.querySelector('#prep-remove').disabled = _committing || !card;
}

function refreshSlots(container) {
  const el = container.querySelector('#prep-slots');
  const focused = el?.contains(document.activeElement) ? document.activeElement.dataset.slot : null;
  if (el) el.innerHTML = renderSlots();
  if (focused != null && !_committing) el.querySelector(`[data-slot="${focused}"]`)?.focus();
}

function refreshVault(container) {
  const placedIds = new Set(_field.filter(Boolean).map(s => s.cardId));
  container.querySelectorAll('#prep-vault-grid [data-id]').forEach(el => {
    const selected = placedIds.has(Number(el.dataset.id));
    el.classList.toggle('card-frame--selected', selected);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', _committing ? '-1' : '0');
    el.setAttribute('aria-pressed', String(selected));
    el.setAttribute('aria-disabled', String(_committing));
    el.style.opacity = selected ? '0.55' : '1';
  });
}

function updateConfirm(container) {
  const summary = summarizeHand(_field);
  const host = container.querySelector('#prep-hand-summary');
  host.innerHTML = `<span><b>${summary.bp}</b> base BP</span><span><b>${summary.hp}</b> base HP</span><span class="prep-synergy">${summary.synergyFactions.length ? summary.synergyFactions.map(f => FACTION_NAMES[f]).join(' / ') + ' synergy ready' : '3 of one faction unlocks synergy'}</span>`;
  container.querySelector('#prep-faction').disabled = _committing;
  const count = _field.filter(Boolean).length;
  const filled = count === 5;
  container.querySelector('#prep-confirm').disabled = _committing || !filled;
  container.querySelector('#prep-count').textContent = `${count} / 5`;
  container.querySelector('#prep-hint').textContent = filled
    ? 'Sealing locks these 5 cards and their actions for this round.' : 'Choose 5 different cards. Each starts with Crystal.';
  const next = _targetSlot ?? _field.findIndex(c => !c);
  container.querySelector('#prep-next').textContent = _committing ? 'SEALING YOUR HAND — selection locked'
    : _targetSlot !== null && _field[_targetSlot] ? `REPLACE SLOT ${_targetSlot + 1} — choose a card from your vault`
    : filled ? 'HAND READY — review actions, then seal'
    : `CHOOSE CARD ${count + 1} — next: slot ${next + 1}`;
}

function resumeTimer(container) {
  if (_remaining <= 0) return; // expired failures stay editable for a manual retry
  _timerStarted = Date.now();
  _stopTimer = startTimer(container.querySelector('#prep-timer'), _remaining, () => {
    _remaining = 0;
    _stopTimer = null;
    onTimeout(container);
  });
}

function pauseTimer() {
  if (_stopTimer) {
    _remaining = Math.max(0, _remaining - Math.floor((Date.now() - _timerStarted) / 1000));
    _stopTimer();
    _stopTimer = null;
  }
}

async function onConfirm(container) {
  const btn  = container.querySelector('#prep-confirm');
  const hint = container.querySelector('#prep-hint');

  // Freeze the exact choices before the first async boundary. Neither UI edits
  // nor timer expiry may change the hand while its proof or transaction is pending.
  if (_committing || getState().commitment !== null || _field.some(c => !c)) return;
  const hand = snapshotHand(_field);
  const duel = getState();
  const mountId = _mountId;
  let attemptCommitment = null;
  _committing = true;
  pauseTimer();
  container.querySelector('.prep-root')?.setAttribute('aria-busy', 'true');
  refreshSlots(container);
  refreshVault(container);
  refreshAction(container);
  updateConfirm(container);
  if (btn) { btn.disabled = true; btn.textContent = 'SEALING HAND…'; }

  if (window.oxarkPreview) {
    if (hint) hint.textContent = 'Sealing your practice hand. No proof or transaction is submitted.';
    await new Promise(resolve => setTimeout(resolve, 450));
    if (mountId !== _mountId) return;
    setState({ fieldCards: hand.map(card => ({ ...card })), opponentField: practiceOpponent(duel.round),
      commitment: 'practice-only', hasPeeked: false, phase: 'interruption', duelId: null, matchId: null });
    document.dispatchEvent(new CustomEvent('nav:interruption'));
    return;
  }

  try {
    const cardIds = hand.map(s => s.cardId);
    const salt    = duelWs.generateSalt();

    // SHA-256 hand commitment (always present)
    const hashBytes    = await duelWs.computeHandCommitment(cardIds, salt);
    if (mountId !== _mountId) return;
    const commitmentHex = duelWs.toHex(hashBytes);
    attemptCommitment = commitmentHex;

    // ── ZK proof generation ───────────────────────────────────────────────
    let zkProofBytes      = null; // { proofA, proofB, proofC }
    let zkPublicSignals   = null; // raw snarkjs string[]
    let zkPublicInputBytes = null; // Uint8Array[](32) × 4

    const zkAvailable = typeof window.zkCardCommit?.proveHandCommit === 'function';

    if (zkAvailable) {
      if (btn)  btn.textContent  = 'PREPARING SEAL…';
      if (hint) hint.textContent = 'Proving your hidden hand. Your selection is locked.';

      const round      = duel.round ?? 1;
      const pubkeyBytes = window.oxarkWallet?.getPublicKey?.()?.toBytes?.() ?? null;

      const _zkT0 = performance.now();
      const zkResult = await window.zkCardCommit.proveHandCommit(cardIds, salt, round, pubkeyBytes);
      if (mountId !== _mountId) return;
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
      fieldCards: hand.map(card => ({ ...card })),
      commitment: commitmentHex,
      salt,
      zkProofBytes,
      zkPublicSignals,
      zkPublicInputBytes,
    });

    const s = duel;

    // ── On-chain: initDuel (host only) → commitHand ───────────────────────
    if (typeof window.oxarkOnchain?.commitHand !== 'function') {
      throw new Error('Connection unavailable. Your hand has not been sealed.');
    }
    if (typeof window.oxarkOnchain?.commitHand === 'function') {
      if (s.isHost && typeof window.oxarkOnchain?.initDuel === 'function') {
        if (btn) btn.textContent = 'OPENING DUEL…';
        if (hint) hint.textContent = 'Confirm the duel transaction in your wallet.';
        const myPubkey = window.solana?.publicKey?.toBase58();
        await window.oxarkOnchain.initDuel(
          s.duelId, myPubkey, s.opponentPubkey,
        );
        if (mountId !== _mountId) return;
      }

      if (btn) btn.textContent = 'CONFIRMING SEAL…';
      if (hint) hint.textContent = 'Confirm in your wallet, then wait for the seal to record on-chain.';
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

    if (mountId !== _mountId) return;
    setState({ phase: 'interruption' });

    if (s.duelId && duelWs.isConnected()) {
      duelWs.sendHandCommitted(s.duelId, s.round ?? 1, commitmentHex, {
        zkHasProof: zkProofBytes !== null,
        zkPublicSignals,
      });
    }

    document.dispatchEvent(new CustomEvent('nav:interruption'));
  } catch (err) {
    // A disconnected screen still owns its failed attempt, but never clear a
    // newer duel/round/attempt that may have started while the request awaited.
    const current = getState();
    if (attemptCommitment && current.duelId === duel.duelId
      && current.round === duel.round && current.commitment === attemptCommitment) {
      setState({ commitment: null });
    }
    if (mountId !== _mountId) return;
    _committing = false;
    container.querySelector('.prep-root')?.setAttribute('aria-busy', 'false');
    refreshSlots(container);
    refreshVault(container);
    refreshAction(container);
    updateConfirm(container);
    resumeTimer(container);
    console.error('[Prep] Commit failed:', err);
    const msg = err.message ?? 'commit failed';
    // InsufficientEnergy is belt-and-suspenders — the lobby gate should prevent
    // it, but map it to a friendly refill nudge if it slips through (spec §4).
    const userMsg = msg.includes('AlreadyCommitted')
      ? 'Already committed for this round'
      : /InsufficientEnergy/i.test(msg)
      ? 'Out of energy — refill from the topbar to enter this duel'
      : 'Error: ' + msg;
    if (btn)  { btn.disabled = false; btn.textContent = 'SEAL YOUR HAND'; }
    if (hint) hint.textContent = `${userMsg}. Your hand is preserved — retry when ready.`;
  }
}

function onTimeout(container) {
  if (_committing) return;
  // Keep the player's cards and actions; random selection applies only to holes.
  const candidates = [..._vault].sort(() => Math.random() - 0.5);
  _field = completeHand(_field, candidates);
  _targetSlot = null;
  if (_activeSlot === null) _activeSlot = _field.findIndex(Boolean);
  refreshSlots(container);
  refreshVault(container);
  refreshAction(container);
  updateConfirm(container);
  if (_field.some(card => !card)) {
    container.querySelector('#prep-hint').textContent = 'Not enough different cards to fill your hand. Add cards to your vault before sealing.';
    return;
  }
  onConfirm(container);
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectPreparationCSS() {
  injectStyle('style-prep', PREPARATION_CSS);
}
