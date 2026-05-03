// loot.js — Screen 5: Loot Phase (winner/loser animations, vault update)
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { CardHTML, injectCardCSS, CARD_NAMES } from './common/Card.js';
import { getState, setState, resetBattle } from '../state/battle-state.js';
import { computePostBattleImprints } from '../lib/abilities.js';
import * as duelWs from '../lib/duel-ws.js';

let _animTimeout  = null;
let _lootCardId   = null;
let _selectMode   = false;   // winner is picking which card to loot

export function mount(container, detail = {}) {
  injectStyle();
  injectCardCSS();

  const s = getState();
  _lootCardId  = s.battleResult?.lootCard ?? null;
  _selectMode  = false;

  setState({ phase: 'loot' });
  container.innerHTML = s.isWinner ? buildWinHTML(s) : buildLoseHTML(s);
  bindEvents(container);
  runLootAnimation(container, s);
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
  ${hasMrdr ? '<div class="loot-marauder label-gold">★ MARAUDER BONUS — TAKE 2 CARDS</div>' : ''}

  <!-- Pick a card -->
  <div class="loot-pick-label" id="loot-pick-label">
    Opponent's cards — <span class="label-gold">pick your prize</span>
  </div>

  <!-- Opponent cards (face-down, then reveal on hover/click) -->
  <div class="loot-opp-cards" id="loot-opp-cards" role="list">
    ${oppCards.map((c, i) => `
      <div class="loot-opp-card-wrap" data-idx="${i}" data-card="${c?.cardId ?? 0}">
        ${CardHTML({ id: c?.cardId ?? 1, faceDown: true })}
      </div>`).join('')}
  </div>

  <!-- Result message -->
  <div class="loot-result" id="loot-result" style="display:none;"></div>

  <!-- Progress update -->
  <div class="loot-perso-update" id="loot-perso" style="display:none;"></div>

  <!-- Continue -->
  <button class="gba-btn gba-btn--primary loot-continue-btn" id="loot-continue" disabled>
    CONTINUE →
  </button>

</div>`;
}

function buildLoseHTML(s) {
  const myCards = s.fieldCards.filter(Boolean);
  const lootId  = _lootCardId;

  return `
<div class="loot-root loot-root--lose" role="main" aria-label="Defeat. Loot phase">

  <!-- Title -->
  <h1 class="loot-title loot-title--lose" id="loot-title">YOU LOST…</h1>

  <!-- Your field -->
  <div class="loot-pick-label">Your cards:</div>
  <div class="loot-your-cards" id="loot-your-cards" role="list">
    ${myCards.map((c, i) => `
      <div class="loot-your-card-wrap" id="loot-my-${i}" data-idx="${i}" data-card="${c.cardId}">
        ${CardHTML({ id: c.cardId })}
      </div>`).join('')}
  </div>

  <!-- Result message -->
  <div class="loot-result" id="loot-result"></div>

  <!-- Progress update -->
  <div class="loot-perso-update" id="loot-perso" style="display:none;"></div>

  <!-- Continue -->
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

    // 2. Enable picking
    after(400 + oppCards.length * 300 + 400, () => {
      _selectMode = true;
      container.querySelector('#loot-pick-label').textContent = '◆ Choose your prize card!';
    });

  } else {
    // Loser: 1 card is taken
    after(500, () => {
      container.querySelector('#loot-title')?.classList.add('loot-title--visible');
    });

    after(1200, () => {
      const idx = Math.floor(Math.random() * s.fieldCards.filter(Boolean).length);
      _lootCardId = s.fieldCards[idx]?.cardId ?? null;

      // Highlight the taken card
      const wrap = container.querySelector(`#loot-my-${idx}`);
      if (wrap) wrap.classList.add('loot-card--taken');

      const result = container.querySelector('#loot-result');
      const cardName = CARD_NAMES[_lootCardId] ?? `Card #${_lootCardId}`;
      if (result) result.textContent = `— ${cardName} was taken by your opponent`;

      after(800, () => {
        // Other cards return to vault animation
        s.fieldCards.forEach((c, i) => {
          if (i !== idx && c) {
            const w = container.querySelector(`#loot-my-${i}`);
            if (w) w.classList.add('loot-card--return');
          }
        });

        const perso = container.querySelector('#loot-perso');
        if (perso) { perso.style.display = 'block'; perso.textContent = '↩ Cards returned to vault'; }

        after(600, () => {
          updateVaultAfterLoss(s, idx);
          enableContinue(container);
        });
      });
    });
  }
}

function revealOppCard(container, idx, cardId) {
  const wrap = container.querySelector(`.loot-opp-card-wrap[data-idx="${idx}"]`);
  if (!wrap) return;
  wrap.classList.add('loot-card--flip');
  setTimeout(() => {
    wrap.innerHTML = CardHTML({ id: cardId });
    wrap.dataset.card = cardId;
    wrap.setAttribute('data-idx', idx);
    wrap.classList.remove('loot-card--flip');
  }, 150);
}

function updateVaultAfterLoss(s, takenIdx) {
  const takenId  = s.fieldCards[takenIdx]?.cardId ?? null;
  const newVault = s.vault.filter(id => id !== takenId);
  setState({ vault: newVault });
}

function enableContinue(container) {
  const btn = container.querySelector('#loot-continue');
  if (btn) btn.disabled = false;
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  // Winner: pick a card
  const oppCards = container.querySelector('#loot-opp-cards');
  if (oppCards) {
    oppCards.addEventListener('click', e => {
      if (!_selectMode) return;
      const wrap = e.target.closest('[data-card]');
      if (!wrap) return;
      const cardId = parseInt(wrap.dataset.card, 10);
      onCardPicked(container, cardId);
    });
  }

  // Continue
  container.querySelector('#loot-continue').addEventListener('click', () => {
    onContinue();
  });
}

function onCardPicked(container, cardId) {
  if (!_selectMode) return;
  _selectMode = false;
  _lootCardId = cardId;

  // Mark selected
  container.querySelectorAll('.loot-opp-card-wrap').forEach(el => {
    const id = parseInt(el.dataset.card, 10);
    el.classList.toggle('loot-card--chosen', id === cardId);
    if (id !== cardId) el.style.opacity = '0.35';
  });

  const s        = getState();
  const cardName = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  const isLgd    = getCard(cardId)?.rarity === 3;
  const newVault = [...s.vault, cardId];

  setState({ vault: newVault, lootCard: cardId });

  const result = container.querySelector('#loot-result');
  if (result) {
    result.style.display = 'block';
    result.innerHTML = `+ <span class="label-gold">${cardName}</span> added to vault${isLgd ? ' <span class="label-gold">★ LEGENDARY!</span>' : ''}`;
  }

  if (isLgd) showLegendaryEffect(container);

  const perso = container.querySelector('#loot-perso');
  if (perso) {
    perso.style.display = 'block';
    perso.textContent   = updatePersonalities(s, cardId);
  }

  // Imprint hook
  _applyImprints(container, s);

  setTimeout(() => enableContinue(container), 400);
}

function showLegendaryEffect(container) {
  const flash = document.createElement('div');
  flash.className = 'loot-legendary-flash';
  flash.textContent = '★ LEGENDARY ACQUIRED ★';
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

.loot-continue-btn { padding: 12px 40px; font-size: 22px; letter-spacing: 0.08em; margin-top: auto; }

.loot-legendary-flash {
  position: absolute; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  font-size: 48px; color: #d8b034; letter-spacing: 0.1em;
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
