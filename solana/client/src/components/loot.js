// loot.js — Screen 5: Loot Phase (winner/loser animations, vault update)
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, CARD_NAMES } from './common/Card.js';
import { pxIcon } from '../lib/px-icons.js';
import { showToast, txLink, setDemoMode } from '../lib/ui-shared.js';
import { roundWinsFor } from './common/round-ui.js';
import { STEAL_ENABLED } from '../config.js';
import { getState, setState, resetBattle } from '../state/battle-state.js';
import { computePostBattleImprints } from '../lib/abilities.js';
import * as duelWs from '../lib/duel-ws.js';

let _animTimeout  = null;
let _lootCardId   = null;
let _selectMode   = false;   // winner is picking which card to loot

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();

  const s = getState();
  _lootCardId  = s.battleResult?.lootCard ?? null;
  _selectMode  = false;

  setState({ phase: 'loot' });
  container.innerHTML = s.isWinner ? buildWinHTML(s) : buildLoseHTML(s);
  bindEvents(container);
  runLootAnimation(container, s);
  if (s.isWinner) _setupEngrave(container, s);
}

export function unmount(container) {
  if (_animTimeout) { clearTimeout(_animTimeout); _animTimeout = null; }
  _lootCardId = null;
  _selectMode = false;
  container.innerHTML = '';
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildWinHTML(s) {
  const oppCards = s.opponentField ?? s.fieldCards;
  const hasMrdr  = s.fieldCards.some(c => c?.cardId === 30);

  return `
<div class="loot-root loot-root--win" role="main" aria-label="Victory! Loot phase">

  <!-- Radial glow -->
  <div class="loot-glow" aria-hidden="true"></div>

  <!-- Title -->
  <h1 class="loot-title" id="loot-title">YOU WON!</h1>

  <!-- Marauder bonus -->
  ${hasMrdr ? `<div class="loot-marauder label-gold">${pxIcon('star')} MARAUDER BONUS — TAKE 2 CARDS</div>` : ''}

  <!-- Reveal label -->
  <div class="loot-pick-label" id="loot-pick-label">
    Opponent's cards
  </div>

  <!-- Opponent cards (face-down, revealed by animation) -->
  <div class="loot-opp-cards" id="loot-opp-cards" role="list">
    ${oppCards.map((c, i) => `
      <div class="loot-opp-card-wrap" data-idx="${i}" data-card="${c?.cardId ?? 0}">
        ${CardFrameHTML({ id: c?.cardId ?? 1, faceDown: true })}
      </div>`).join('')}
  </div>

  <!-- Steal act (gated by STEAL_ENABLED — F1-5) -->
  ${_stealActHTML()}

  <!-- Result message -->
  <div class="loot-result" id="loot-result" style="display:none;"></div>

  <!-- Progress update -->
  <div class="loot-perso-update" id="loot-perso" style="display:none;"></div>

  <!-- ENGRAVE VICTORY (F1-6) — the winner's signature on-chain verb -->
  <div class="loot-engrave" id="loot-engrave" style="display:none;">
    <button class="gba-btn gba-btn--primary loot-engrave-btn" id="loot-engrave-btn">
      ${pxIcon('chisel')} ENGRAVE VICTORY
    </button>
    <div class="loot-engrave-hint label-dim" id="loot-engrave-hint">record this duel on-chain forever</div>
  </div>

  <!-- Continue -->
  <button class="gba-btn gba-btn--primary loot-continue-btn" id="loot-continue" disabled>
    CONTINUE →
  </button>

</div>`;
}

// Winner's third act. STEAL is gated OFF until YKK-47/YKK-44 (config.STEAL_ENABLED):
// no client-side vault transfer is faked — an honest sealed slot is shown instead.
function _stealActHTML() {
  if (STEAL_ENABLED) {
    return `
  <div class="loot-claim-block" id="loot-claim-block" style="display:none;">
    <p class="loot-claim-hint">Claim 1 card from the loser (on-chain)</p>
    <button class="gba-btn gba-btn--primary loot-claim-btn" id="loot-claim-btn">
      ${pxIcon('battle')} STEAL A CARD
    </button>
    <div class="loot-claim-error" id="loot-claim-error" style="display:none;"></div>
  </div>`;
  }
  return `
  <div class="loot-steal-sealed" id="loot-steal-sealed" style="display:none;">
    <span class="chip loot-steal-chip">${pxIcon('lock')} STEAL — sealed pending review</span>
  </div>`;
}

// Loser recap (F1-5): honest learning panel — both hands side-by-side + the
// final round score. No card is taken client-side; nothing about the loss is faked.
function buildLoseHTML(s) {
  const myCards  = s.fieldCards.filter(Boolean);
  const oppCards = (s.opponentField ?? []).filter(Boolean);
  const { my, opp } = roundWinsFor(s);

  const row = (cards, label, cls) => `
    <div class="loot-recap-row">
      <div class="loot-recap-label label-dim">${label}</div>
      <div class="loot-recap-cards ${cls}">
        ${cards.length
          ? cards.map(c => CardFrameHTML({ id: c.cardId })).join('')
          : `<span class="label-dim">— hidden —</span>`}
      </div>
    </div>`;

  return `
<div class="loot-root loot-root--lose" role="main" aria-label="Defeat. Loot phase">

  <h1 class="loot-title loot-title--lose display-xl" id="loot-title">YOU LOST…</h1>

  <div class="loot-recap">
    ${row(oppCards, 'OPPONENT', 'loot-recap-cards--opp')}
    <div class="loot-recap-score">${my} <span class="loot-recap-dash">–</span> ${opp}</div>
    ${row(myCards, 'YOUR HAND', 'loot-recap-cards--mine')}
  </div>

  <div class="loot-result" id="loot-result">no card was taken — steal is not yet enabled</div>

  <button class="gba-btn gba-btn--ghost loot-continue-btn" id="loot-continue" disabled>
    CONTINUE →
  </button>

</div>`;
}

/* ── Animation ──────────────────────────────────────────────────────── */
function runLootAnimation(container, s) {
  const after = (ms, fn) => { _animTimeout = setTimeout(fn, ms); };

  if (s.isWinner) {
    // 1. Reveal all opp cards one by one
    const oppCards = s.opponentField ?? s.fieldCards;
    after(400, () => {
      container.querySelector('#loot-title')?.classList.add('loot-title--visible');
      oppCards.forEach((c, i) => {
        after(i * 300, () => revealOppCard(container, i, c?.cardId ?? 1));
      });
    });

    // 2. Winner's steal act after reveal — gated by STEAL_ENABLED (F1-5).
    after(400 + oppCards.length * 300 + 400, () => {
      if (STEAL_ENABLED) {
        _selectMode = true;
        const claimBlock = container.querySelector('#loot-claim-block');
        if (claimBlock) claimBlock.style.display = '';
      } else {
        const sealed = container.querySelector('#loot-steal-sealed');
        if (sealed) sealed.style.display = '';
        enableContinue(container);
      }
    });

  } else {
    // Loser: honest recap only — NO card is taken client-side (spec §6).
    after(500, () => {
      container.querySelector('#loot-title')?.classList.add('loot-title--visible');
    });
    after(1200, () => enableContinue(container));
  }
}

function revealOppCard(container, idx, cardId) {
  const wrap = container.querySelector(`.loot-opp-card-wrap[data-idx="${idx}"]`);
  if (!wrap) return;
  wrap.classList.add('loot-card--flip');
  setTimeout(() => {
    wrap.innerHTML = CardFrameHTML({ id: cardId });
    wrap.dataset.card = cardId;
    wrap.setAttribute('data-idx', idx);
    wrap.classList.remove('loot-card--flip');
  }, 150);
}

function enableContinue(container) {
  const btn = container.querySelector('#loot-continue');
  if (btn) btn.disabled = false;
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  // Winner: CLAIM LOOT on-chain
  const claimBtn = container.querySelector('#loot-claim-btn');
  if (claimBtn) {
    claimBtn.addEventListener('click', async () => {
      if (!_selectMode) return;
      await onClaimLoot(container);
    });
  }

  // Continue
  container.querySelector('#loot-continue').addEventListener('click', () => {
    onContinue();
  });
}

async function onClaimLoot(container) {
  _selectMode = false;
  const btn   = container.querySelector('#loot-claim-btn');
  const errEl = container.querySelector('#loot-claim-error');
  if (btn) { btn.disabled = true; btn.textContent = 'CLAIMING…'; }
  if (errEl) errEl.style.display = 'none';

  const s = getState();
  const oppCards   = s.opponentField ?? s.fieldCards;
  const loserField = oppCards.map(c => c?.cardId ?? 0).slice(0, 5);
  // Pad to 5 slots
  while (loserField.length < 5) loserField.push(0);

  // duel_id: derive from matchId (deterministic Pubkey seed)
  let duelIdPK = null;
  if (window.oxarkOnchain && s.matchId) {
    try {
      const { PublicKey } = window.solanaWeb3 ?? solanaWeb3;
      const seed = new TextEncoder().encode(String(s.matchId).padEnd(32, '0').slice(0, 32));
      [duelIdPK] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode('match'), seed],
        new PublicKey(window.oxarkOnchain.PROGRAM_ID)
      );
    } catch (_) {}
  }

  if (!duelIdPK) {
    // Fallback: generate a unique key per session (demo mode)
    duelIdPK = window.solanaWeb3
      ? new window.solanaWeb3.PublicKey(crypto.getRandomValues(new Uint8Array(32)))
      : null;
  }

  if (!duelIdPK || !s.opponentPubkey || !window.oxarkOnchain?.claimBattleLoot) {
    // On-chain unavailable — apply loot locally for demo
    const idx    = Math.floor(Math.random() * loserField.filter(Boolean).length);
    const cardId = loserField.filter(Boolean)[idx] ?? 1;
    onCardPickedLocal(container, cardId, s);
    if (btn) { btn.textContent = 'CLAIMED (demo)'; }
    return;
  }

  try {
    const result = await window.oxarkOnchain.claimBattleLoot(
      duelIdPK.toString(),
      s.opponentPubkey,
      loserField
    );
    const cardId = result.stolenCardId ?? loserField.find(Boolean) ?? 1;
    onCardPickedLocal(container, cardId, s);
    if (btn) { btn.textContent = 'CLAIMED'; }
  } catch (err) {
    _selectMode = true;
    if (btn) { btn.disabled = false; btn.textContent = '◆ CLAIM LOOT'; }
    if (errEl) {
      errEl.textContent = err.message ?? 'Claim failed';
      errEl.style.display = 'block';
    }
  }
}

function onCardPickedLocal(container, cardId, s) {
  const cardName = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  const isLgd    = getCard(cardId)?.rarity === 3;
  const newVault = [...s.vault, cardId];
  setState({ vault: newVault, lootCard: cardId });

  // Highlight chosen card
  container.querySelectorAll('.loot-opp-card-wrap').forEach(el => {
    const id = parseInt(el.dataset.card, 10);
    el.classList.toggle('loot-card--chosen', id === cardId);
    if (id !== cardId) el.style.opacity = '0.35';
  });

  const result = container.querySelector('#loot-result');
  if (result) {
    result.style.display = 'block';
    result.innerHTML = `+ <span class="label-gold">${cardName}</span> added to vault${isLgd ? ` <span class="label-gold">${pxIcon('star')} LEGENDARY!</span>` : ''}`;
  }

  if (isLgd) showLegendaryEffect(container);

  const perso = container.querySelector('#loot-perso');
  if (perso) {
    perso.style.display = 'block';
    perso.textContent   = updatePersonalities(s, cardId);
  }

  _applyImprints(container, s);
  setTimeout(() => enableContinue(container), 400);
}


function showLegendaryEffect(container) {
  const flash = document.createElement('div');
  flash.className = 'loot-legendary-flash';
  flash.textContent = 'LEGENDARY ACQUIRED';
  container.appendChild(flash);
  setTimeout(() => flash.remove(), 2500);
}

function updatePersonalities(s, cardId) {
  // game-design-v2: Oracle(40)→detective, Architect(60)→sage
  const LEGENDARY_TO_PERSO = { 10:'conqueror', 20:'patron', 30:'phoenix', 40:'detective', 50:'hermit', 60:'sage' };
  const perso = LEGENDARY_TO_PERSO[cardId];
  if (!perso) return '';

  const personalities = { ...s.personalities };
  personalities[perso] = Math.min(10, (personalities[perso] ?? 0) + 1);
  setState({ personalities });
  return `${perso.toUpperCase()}: ${personalities[perso]}/10`;
}

function _applyImprints(container, s) {
  const result = s.battleResult ?? {};
  const imprints = computePostBattleImprints({
    isFirstWin:  !(s.earnedImprints ?? []).includes('FirstBlood'),
    winner:      'p1',
    p1Cards:     s.fieldCards.filter(Boolean).map(c => getCard(c.cardId)).filter(Boolean),
    p2Cards:     (s.opponentField ?? []).filter(Boolean).map(c => getCard(c.cardId)).filter(Boolean),
    p1Destroyed: result.p1Destroyed ?? [],
    p2Destroyed: result.p2Destroyed ?? [],
  });

  if (!imprints.length) return;

  const keys = imprints.map(i => i.key);
  setState({ earnedImprints: [...(s.earnedImprints ?? []), ...keys] });

  _showImprintToasts(container, imprints);

  // Call on-chain (mock for demo)
  imprints.forEach(imp => {
    if (window.oxarkOnchain?.grantImprint) {
      window.oxarkOnchain.grantImprint(imp.cardId ?? 0, imp.key).catch(
        err => console.warn('grant_imprint:', err)
      );
    }
    console.log(`[demo] grant_imprint: key=${imp.key} card=${imp.cardId ?? 'n/a'}`);
  });
}

function _showImprintToasts(container, imprints) {
  imprints.forEach((imp, i) => {
    const toast = document.createElement('div');
    toast.className = 'loot-imprint-toast';
    toast.innerHTML = `+ Imprint: <span class="label-gold">${imp.key}</span>${imp.description ? ` — ${imp.description}` : ''}`;
    toast.style.animationDelay = `${i * 400}ms`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000 + i * 400);
  });
}

/* ── ENGRAVE VICTORY (F1-6) ──────────────────────────────────────────────────
 * settle_duel_history: the winner records each of their used cards' win credit
 * trustlessly FROM the on-chain DuelState. Available once the chain confirms this
 * player is the winner and the duel ended. Skippable (CONTINUE stays live).      */
async function _setupEngrave(container, s) {
  const oc = window.oxarkOnchain;
  if (typeof oc?.getDuelStateFull !== 'function' || typeof oc?.settleDuelHistory !== 'function' || !s.duelId) return;
  try {
    const ds = await oc.getDuelStateFull(s.duelId);
    if (!ds || !(ds.endedAt > 0)) return;
    const myPk = window.solana?.publicKey?.toBase58?.() ?? null;
    if (myPk && ds.winner && ds.winner !== myPk) return; // only the on-chain winner engraves
    const block = container.querySelector('#loot-engrave');
    if (block) block.style.display = '';
    container.querySelector('#loot-engrave-btn')
      ?.addEventListener('click', () => _doEngrave(container, s));
  } catch (err) {
    console.warn('[engrave] eligibility check failed:', err?.message ?? err);
  }
}

async function _doEngrave(container, s) {
  const btn  = container.querySelector('#loot-engrave-btn');
  const hint = container.querySelector('#loot-engrave-hint');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = 'ENGRAVING…';
  try {
    // Resolve the used cardIds → mints (a card must still be held; unresolved
    // slots are dropped and the rest settle — spec §7.1).
    const cardIds = s.fieldCards.filter(Boolean).map(c => c.cardId);
    const map = await window.oxarkOnchain.getOwnedCardMints();
    const mints = cardIds.map(id => map.get(id)?.[0]?.mint).filter(Boolean);
    if (!mints.length) throw new Error('no held cards to settle');

    const sig = await window.oxarkOnchain.settleDuelHistory(s.duelId, mints);
    container.querySelector('#loot-engrave')?.classList.add('loot-engrave--done');
    const t = showToast('recorded on-chain forever', 'success');
    try { t.innerHTML = `${pxIcon('chisel')} recorded on-chain forever ${txLink(sig)}`; } catch (_) {}
    btn.disabled = true;
    btn.innerHTML = `${pxIcon('check')} ENGRAVED`;
    if (hint) hint.textContent = `${mints.length} card${mints.length === 1 ? '' : 's'} settled`;
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (/already|settled/i.test(msg)) { // on-chain bitmap already set → completed state
      btn.disabled = true;
      btn.innerHTML = `${pxIcon('check')} ENGRAVED`;
      if (hint) hint.textContent = 'already engraved';
      return;
    }
    showToast(`Engrave failed: ${msg.slice(0, 50)}`, 'error');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('chisel')} ENGRAVE VICTORY`;
  }
}

async function onContinue() {
  const s = getState();

  // Host announces match end to server
  if (s.isHost && s.duelId && duelWs.isConnected()) {
    const winner = s.isWinner ? s.playerPubkey : (s.opponentPubkey ?? 'opponent');
    duelWs.sendDuelEnded(s.duelId, winner);
  }

  // x402 match-end payment
  if (window.x402?.payMatchEnd && s.matchId) {
    window.x402.payMatchEnd({
      matchId: s.matchId,
      winner:  s.isWinner ? (s.playerPubkey ?? 'p1') : (s.opponentPubkey ?? 'p2'),
    }).catch(err => console.warn('[x402] payMatchEnd:', err));
  } else {
    setDemoMode('match-end payment skipped (x402 offline)');
  }

  resetBattle();
  duelWs.disconnect();
  document.dispatchEvent(new CustomEvent('nav:main'));
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-loot')) return;
  const el = document.createElement('style');
  el.id = 'style-loot';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.loot-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main);
  display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start; padding: 40px 24px 20px; gap: 12px;
}
.loot-root--win { background: radial-gradient(ellipse 70% 60% at 50% 40%, rgba(201,162,39,0.12) 0%, var(--bg-deep) 70%); }
.loot-root--lose { background: radial-gradient(ellipse 70% 60% at 50% 40%, rgba(214,59,59,0.08) 0%, var(--bg-deep) 70%); }

.loot-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 50% 40% at 50% 30%, rgba(201,162,39,0.2) 0%, transparent 65%);
}

.loot-title {
  font-size: 72px; letter-spacing: 0.1em; color: var(--accent-gold); line-height: 1;
  text-shadow: 0 0 40px rgba(201,162,39,0.5), 3px 3px 0 #000;
  opacity: 0; transform: scale(1.3);
  transition: opacity 0.5s, transform 0.5s cubic-bezier(0.16,1,0.3,1);
}
.loot-title--lose { color: var(--accent-red); text-shadow: 0 0 30px rgba(214,59,59,0.4), 3px 3px 0 #000; }
.loot-title--visible { opacity: 1; transform: scale(1); }

.loot-marauder {
  font-size: 18px; letter-spacing: 0.08em;
  animation: pulse-gold 1s ease-in-out infinite alternate;
}
@keyframes pulse-gold { from { opacity: 1; } to { opacity: 0.6; } }

.loot-pick-label { font-size: 18px; letter-spacing: 0.04em; color: var(--text-cream); }

.loot-opp-cards, .loot-your-cards {
  display: flex; gap: 10px; justify-content: center;
}
.loot-opp-card-wrap .card-frame,
.loot-your-card-wrap .card-frame { width: 140px; }
.loot-opp-card-wrap, .loot-your-card-wrap {
  cursor: pointer; transition: transform 0.2s, opacity 0.3s;
}
.loot-opp-card-wrap:hover { transform: translateY(-4px); }
.loot-card--chosen {
  outline: 3px solid var(--accent-gold);
  box-shadow: 0 0 16px rgba(201,162,39,0.6);
  transform: translateY(-6px) scale(1.04);
}
.loot-card--flip { opacity: 0; transform: rotateY(90deg); transition: opacity 0.15s, transform 0.15s; }
.loot-card--taken { animation: taken-fly 0.8s ease-in forwards; }
@keyframes taken-fly { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(120px,-80px) scale(0.5); opacity: 0; } }
.loot-card--return { animation: return-glow 0.5s ease forwards; }
@keyframes return-glow { from { opacity: 1; } to { opacity: 0.4; filter: grayscale(0.6); } }

.loot-result {
  font-size: 20px; letter-spacing: 0.04em; color: var(--text-cream);
  text-align: center;
}
.loot-perso-update { font-size: 16px; color: var(--text-dim); }

/* Sealed steal (STEAL_ENABLED=false) */
.loot-steal-sealed { display: flex; justify-content: center; margin: 14px 0; }
.loot-steal-chip {
  color: var(--text-dim); border-color: var(--text-dim); opacity: 0.85;
  display: inline-flex; align-items: center; gap: 5px; font-size: 14px; letter-spacing: 0.06em;
}

/* Loser recap (honest learning panel) */
.loot-recap { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 10px 0; }
.loot-recap-row { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.loot-recap-label { font-size: 13px; letter-spacing: 0.1em; }
.loot-recap-cards { display: flex; gap: 6px; }
.loot-recap-cards .card-frame { width: 112px; }
.loot-recap-score { font-size: 34px; color: var(--text-cream); letter-spacing: 0.08em; }
.loot-recap-dash { color: var(--text-dim); padding: 0 6px; }

.loot-claim-block { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 16px 0; }
.loot-claim-hint  { font-size: 14px; color: var(--text-dim); text-align: center; }
.loot-claim-btn   { padding: 12px 36px; font-size: 20px; letter-spacing: 0.06em; }
.loot-claim-error { font-size: 14px; color: #e55; text-align: center; }

.loot-continue-btn { padding: 12px 40px; font-size: 22px; letter-spacing: 0.08em; margin-top: auto; }

/* ENGRAVE VICTORY */
.loot-engrave { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 6px 0; }
.loot-engrave-btn { font-size: 18px; padding: 10px 22px; letter-spacing: 0.06em; }
.loot-engrave-hint { font-size: 13px; }
.loot-engrave--done .loot-engrave-btn { animation: loot-engrave-sweep 700ms var(--ease-out, ease-out); }
@keyframes loot-engrave-sweep {
  0% { box-shadow: 0 0 0 rgba(201,162,39,0); }
  40% { box-shadow: 0 0 22px rgba(201,162,39,0.85); }
  100% { box-shadow: 0 0 0 rgba(201,162,39,0); }
}

.loot-legendary-flash {
  position: absolute; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  font-size: 48px; color: var(--accent-gold-bright); letter-spacing: 0.1em;
  background: rgba(216,176,52,0.15);
  animation: lgd-flash 2.5s ease forwards;
  pointer-events: none;
}
@keyframes lgd-flash { 0% { opacity: 0; } 15% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }

.loot-imprint-toast {
  position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
  background: rgba(10,14,26,0.9); border: 1px solid rgba(201,162,39,0.5);
  padding: 6px 16px; font-size: 15px; letter-spacing: 0.04em; color: var(--text-cream);
  white-space: nowrap; pointer-events: none;
  animation: imprint-toast 3s ease forwards;
}
@keyframes imprint-toast {
  0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
  10%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  80%  { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
}
`;
