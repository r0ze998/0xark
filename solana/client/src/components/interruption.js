// interruption.js — Screen 3: INTEL PHASE (spec F1-2). 60s, read-only.
//
// This replaces the old "Interruption" screen. Post-commit hand mutation (the
// swap UI) is GONE: a swapped hand makes the on-chain reveal_hand fail forever,
// because the commitment was sealed at preparation. INTEL is now purely a
// read/pay phase — PEEK the opponent, buy AI ADVICE, then LOCK IN. Your hand is
// immutable here; the only navigation out is nav:reveal (no WS, no state write).
//
// There is deliberately NO WS reveal here. The single reveal path is the gated
// one in reveal.js that fires only after the on-chain reveal_hand tx confirms.
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, ACTION_LABELS } from './common/Card.js';
import { RoundHudHTML, injectRoundUiCSS } from './common/round-ui.js';
import { startTimer } from './common/Timer.js';
import { pxIcon } from '../lib/px-icons.js';
import { showToast, txLink } from '../lib/ui-shared.js';
import { getState, setState } from '../state/battle-state.js';

const INTEL_SECS = 60;

let _stopTimer     = null;
let _field         = [];
let _opponentField = null;

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();
  injectRoundUiCSS();

  const s        = getState();
  _field         = s.fieldCards.map(c => (c ? { ...c } : null));
  _opponentField = s.opponentField ?? null;

  setState({ phase: 'interruption' });
  container.innerHTML = buildHTML();
  bindEvents(container);

  const timerEl = container.querySelector('#intel-timer');
  _stopTimer = startTimer(timerEl, INTEL_SECS, () => lockIn());
}

export function unmount(container) {
  _stopTimer?.();
  _stopTimer = null;
  _field = [];
  _opponentField = null;
  container.innerHTML = '';
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildHTML() {
  const peeked = getState().hasPeeked;
  return `
<div class="intel-root" role="main" aria-label="Intel Phase">

  <header class="intel-topbar">
    <div class="chip intel-phase-label">INTEL PHASE</div>
    <div class="intel-timer-wrap" aria-live="polite" aria-atomic="true">
      <span class="label-dim" style="font-size:14px;">TIME</span>
      <span class="intel-timer" id="intel-timer" aria-label="Time remaining">0:${INTEL_SECS}</span>
    </div>
    ${RoundHudHTML()}
  </header>

  <div class="intel-body">

    <!-- Left column: opponent (sealed) + your locked hand -->
    <div class="intel-left">
      <section class="intel-opp" aria-label="Opponent hand">
        <div class="intel-section-label label-dim">OPPONENT — <span id="intel-opp-state">${peeked ? 'REVEALED' : 'SEALED'}</span></div>
        <div class="intel-opp-slots" id="intel-opp-slots">
          ${renderOppSlots()}
        </div>
      </section>

      <section class="intel-hand" aria-label="Your locked hand">
        <div class="intel-section-label label-dim">YOUR HAND — LOCKED ${pxIcon('lock')}</div>
        <div class="intel-hand-slots">
          ${renderHandSlots()}
        </div>
      </section>
    </div>

    <!-- Right column: intel actions -->
    <aside class="intel-actions" aria-label="Intel actions">
      <div class="intel-action-block">
        <button class="gba-btn intel-peek-btn" id="intel-peek" ${peeked ? 'disabled' : ''}>
          ${pxIcon('eye')} ${peeked ? 'PEEKED' : 'PEEK'}${peeked ? ` ${pxIcon('check')}` : ''}
        </button>
        <div class="intel-cost label-dim">0.005 SOL</div>
      </div>

      <div class="intel-divider"></div>

      <div class="intel-action-block">
        <button class="gba-btn intel-advice-btn" id="intel-advice">
          ${pxIcon('chip')} AI ADVICE
        </button>
        <div class="intel-cost label-dim">0.003 SOL</div>
        <div class="intel-advice-panel" id="intel-advice-panel" role="log" aria-live="polite"></div>
      </div>

      <div class="intel-divider"></div>

      <button class="gba-btn gba-btn--primary intel-lockin-btn" id="intel-lockin">
        ${pxIcon('check')} LOCK IN
      </button>
    </aside>

  </div>
</div>`;
}

function renderOppSlots() {
  if (!_opponentField) {
    // Sealed chests — the CRACK ritual's object, not a generic face-down card.
    return Array(5).fill(0).map((_, i) =>
      `<div class="intel-chest" id="intel-chest-${i}" aria-label="Sealed opponent card ${i + 1}">${pxIcon('chest', { size: 44 })}</div>`
    ).join('');
  }
  return _opponentField.map((c, i) =>
    `<div class="intel-opp-card" id="intel-opp-card-${i}">${CardFrameHTML({ id: c.cardId })}</div>`
  ).join('');
}

function renderHandSlots() {
  return _field.map((slot, i) => {
    if (!slot) return `<div class="intel-hand-slot intel-hand-slot--empty" aria-label="Empty slot ${i + 1}"></div>`;
    return `<div class="intel-hand-slot" aria-label="Your card ${slot.cardId}, action ${slot.actionType}">
      ${CardFrameHTML({ id: slot.cardId })}
      <span class="intel-hand-lock">${pxIcon('lock', { size: 12 })}</span>
      <div class="intel-hand-action label-gold" style="font-size:13px;">${ACTION_LABELS[slot.actionType] ?? ''}</div>
    </div>`;
  }).join('');
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#intel-peek').addEventListener('click', () => doPeek(container));
  container.querySelector('#intel-advice').addEventListener('click', () => doAdvice(container));
  container.querySelector('#intel-lockin').addEventListener('click', () => lockIn());
}

/* ── PEEK ───────────────────────────────────────────────────────────── */
async function doPeek(container) {
  const btn = container.querySelector('#intel-peek');
  btn.disabled = true;
  btn.innerHTML = 'PEEKING…';

  const s = getState();
  let result = null;
  let real = false;
  try {
    if (window.x402?.scoutPeek) {
      const conn = window.oxarkOnchain?.getConnection?.() ?? null;
      result = await window.x402.scoutPeek(s.matchId, s.opponentPubkey, window.solana, conn);
      real = true;
    }
  } catch (err) {
    console.warn('[Intel] scoutPeek failed, falling back to mock:', err?.message ?? err);
    result = null;
  }

  if (result) {
    _opponentField = normalizeField(result.cards ?? result);
    setState({ hasPeeked: true, opponentField: _opponentField });
    revealChests(container);
    btn.innerHTML = `PEEKED ${pxIcon('check')}`;
    const sig = result.signature ?? result.sig ?? null;
    if (real && sig) showTxToast('Peek paid', sig);
    return;
  }

  // Fallback: never silently — light DEMO mode + mock intel with an explicit hint.
  _opponentField = mockOpponentField();
  setState({ hasPeeked: true, opponentField: _opponentField });
  revealChests(container);
  btn.innerHTML = `PEEKED ${pxIcon('check')}`;
  lightDemo('scoutPeek unavailable — showing mock intel');
  const stateEl = container.querySelector('#intel-opp-state');
  if (stateEl) stateEl.innerHTML = 'MOCK INTEL (demo)';
  showToast('MOCK INTEL (demo) — x402 peek offline', 'info');
}

// Per-slot chest CRACK-lite: swap each sealed chest for the face-up opponent
// frame on a 120ms stagger (spec §3.3).
function revealChests(container) {
  const slots = container.querySelector('#intel-opp-slots');
  if (!slots) return;
  _opponentField.forEach((c, i) => {
    setTimeout(() => {
      const chest = container.querySelector(`#intel-chest-${i}`);
      if (!chest) return;
      chest.classList.add('intel-chest--crack');
      setTimeout(() => {
        chest.outerHTML = `<div class="intel-opp-card intel-opp-card--reveal" id="intel-opp-card-${i}">${CardFrameHTML({ id: c.cardId })}</div>`;
      }, 140);
    }, i * 120);
  });
  const stateEl = container.querySelector('#intel-opp-state');
  if (stateEl && !stateEl.textContent.includes('MOCK')) stateEl.textContent = 'REVEALED';
}

/* ── AI ADVICE ──────────────────────────────────────────────────────── */
async function doAdvice(container) {
  const btn   = container.querySelector('#intel-advice');
  const panel = container.querySelector('#intel-advice-panel');
  btn.disabled = true;
  btn.innerHTML = 'THINKING…';
  panel.classList.add('intel-advice-panel--open');
  panel.textContent = 'Requesting AI strategy…';

  const s = getState();
  const context = {
    round:         s.round ?? 1,
    myFieldCardIds: _field.filter(Boolean).map(c => c.cardId),
    myActionTypes:  _field.filter(Boolean).map(c => c.actionType ?? 0),
    // Only disclose opponent hand if we actually peeked.
    opponentField:  s.hasPeeked ? (_opponentField ?? []).map(c => c.cardId) : null,
  };

  try {
    if (!window.x402?.payAiStrategyAdvice) throw new Error('advice endpoint offline');
    const result = await window.x402.payAiStrategyAdvice(context);
    const text = result?.advice ?? result?.message ?? result?.text ?? '';
    panel.textContent = text || 'No advice returned.';
    const sig = result?.signature ?? result?.sig ?? null;
    if (sig) showTxToast('Advice paid', sig);
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('chip')} AI ADVICE`;
  } catch (err) {
    console.warn('[Intel] AI advice failed:', err?.message ?? err);
    panel.textContent = 'MOCK ADVICE (demo): balance FLAME up front, hold VOID to counter BARRIER. Advice service offline.';
    lightDemo('AI advice unavailable — mock advice shown');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('chip')} AI ADVICE`;
  }
}

/* ── LOCK IN (also the 60s timeout path) ────────────────────────────── */
// Pure navigation. No state mutation, no WS send — the hand was already sealed
// at preparation and the reveal tx is the only thing that unseals it.
function lockIn() {
  _stopTimer?.();
  _stopTimer = null;
  document.dispatchEvent(new CustomEvent('nav:reveal'));
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function normalizeField(cards) {
  return (cards ?? []).map(c => ({
    cardId: c.cardId ?? c.id ?? c,
    actionType: c.actionType ?? 0,
  }));
}

function mockOpponentField() {
  // Deterministic-ish mock hand for demo (5 distinct card ids).
  return [21, 22, 23, 24, 25].map(id => ({ cardId: id, actionType: 2 }));
}

// Forward-compatible: F1-7 (PR-G) adds window.oxarkUI.setDemoMode + txLink. Use
// them when present; otherwise degrade to a plain toast so nothing is silent.
function lightDemo(reason) {
  if (window.oxarkUI?.setDemoMode) window.oxarkUI.setDemoMode(reason);
  else console.info('[DEMO]', reason);
}

function showTxToast(label, sig) {
  const t = showToast(label, 'success');
  try { t.innerHTML = `${pxIcon('check')} ${label} ${txLink(sig)}`; } catch (_) {}
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-intel')) return;
  const el = document.createElement('style');
  el.id = 'style-intel';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.intel-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

.intel-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.intel-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-blue); border-color: var(--accent-blue); }
.intel-timer-wrap { display: flex; align-items: baseline; gap: 6px; }
.intel-timer { font-size: 32px; color: var(--accent-gold); letter-spacing: 0.04em; line-height: 1; transition: color 0.3s; }
.intel-timer.timer--urgent { color: var(--accent-red); animation: pulse 0.6s ease-in-out infinite alternate; }

.intel-body { flex: 1; display: grid; grid-template-columns: 1fr 240px; min-height: 0; }

.intel-left { grid-column: 1; display: flex; flex-direction: column; padding: 10px 12px; gap: 12px; min-height: 0; overflow: hidden; }
.intel-section-label { font-size: 13px; letter-spacing: 0.1em; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }

.intel-opp-slots, .intel-hand-slots { display: flex; gap: 8px; }
.intel-opp-slots .card-frame, .intel-hand-slots .card-frame { width: 128px; }

/* Sealed chest tile */
.intel-chest {
  width: 128px; height: 172px; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(201,162,39,0.25); background: rgba(10,14,26,0.7);
  color: var(--accent-gold); transition: transform 140ms, opacity 140ms;
}
.intel-chest--crack { transform: scale(1.08) rotate(-2deg); opacity: 0.15; }
.intel-opp-card--reveal { animation: intel-reveal 220ms var(--ease-out, ease-out); }
@keyframes intel-reveal { from { opacity: 0; transform: translateY(6px) scale(0.96); } to { opacity: 1; transform: none; } }

/* Locked hand */
.intel-hand-slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.intel-hand-slot--empty { width: 128px; height: 172px; border: 1px dashed rgba(201,162,39,0.2); }
.intel-hand-lock {
  position: absolute; top: 4px; right: 4px; z-index: 2;
  color: var(--accent-gold); background: rgba(3,6,15,0.8);
  padding: 1px 2px; line-height: 0; border: 1px solid rgba(201,162,39,0.3);
}
.intel-hand-action { text-align: center; }

/* Actions column */
.intel-actions {
  grid-column: 2; border-left: var(--border-dim); padding: 12px;
  display: flex; flex-direction: column; gap: 10px; background: rgba(10,14,26,0.4);
}
.intel-action-block { display: flex; flex-direction: column; gap: 3px; }
.intel-peek-btn, .intel-advice-btn { width: 100%; justify-content: center; font-size: 16px; padding: 8px; }
.intel-cost { font-size: 13px; text-align: center; }
.intel-divider { height: 1px; background: rgba(201,162,39,0.15); margin: 2px 0; }
.intel-advice-panel {
  display: none; font-size: 13px; line-height: 1.5; color: var(--text-cream);
  max-height: 118px; overflow-y: auto; padding: 6px 8px; margin-top: 4px;
  border: var(--border-dim); background: rgba(3,6,15,0.6);
}
.intel-advice-panel--open { display: block; }
.intel-advice-panel::-webkit-scrollbar { width: 3px; }
.intel-advice-panel::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.2); }
.intel-lockin-btn { width: 100%; justify-content: center; font-size: 20px; padding: 10px; margin-top: auto; }
.tx-link { color: var(--accent-blue); text-decoration: none; }
.tx-link:hover { text-decoration: underline; }
`;
