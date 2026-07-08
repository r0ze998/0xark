// reveal.js — Screen 4: Reveal Phase + battle animation (~17s)
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { factionOf, isLegendaryOf } from '../lib/card-meta.js';
import { damageCalc } from '../lib/damage-calc.js';
import { CardFrameHTML, injectCardCSS, FACTION_NAMES, ACTION_LABELS, FACTION_COLORS } from './common/Card.js';
import { getState, setState } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';

let _animTimeout      = null;
let _skipped          = false;
let _unsubOppReveal   = () => {};
let _unsubResolved    = () => {};
let _revealPromise    = Promise.resolve(null);
let _revealFailed     = false;
let _uiAddLog         = null;

// Build card_ids [u64; 10]: first 5 are field card IDs, last 5 are 0n.
function _buildCardIds10(fieldCards) {
  return Array.from({ length: 10 }, (_, i) => BigInt(fieldCards[i]?.cardId ?? 0));
}

async function _submitRevealOnChain(s) {
  if (!s.duelId || !s.salt) return null;
  if (typeof window.oxarkOnchain?.revealHand !== 'function') return null;
  try {
    const cardIds10 = _buildCardIds10(s.fieldCards ?? []);
    const txHash = await window.oxarkOnchain.revealHand(
      s.duelId, s.round ?? 1, cardIds10, s.salt,
    );
    console.log('[Reveal] reveal_hand confirmed:', txHash);
    return txHash;
  } catch (err) {
    _revealFailed = true;
    const msg = err.message ?? String(err);
    console.error('[Reveal] reveal_hand failed (navigation blocked):', msg);
    _uiAddLog?.(`✕ reveal TX failed — tap to retry: ${msg.slice(0, 80)}`, 'log-error rev-retry-reveal');
    return null;
  }
}

// Poll DuelState until ended_at > 0 (max ~10 s, 500 ms interval).
async function _pollDuelResolution(duelIdStr) {
  if (typeof window.oxarkOnchain?.getDuelState !== 'function') return null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const ds = await window.oxarkOnchain.getDuelState(duelIdStr);
      if (ds && ds.endedAt > 0) return ds;
    } catch (_) { /* retry */ }
  }
  return null;
}

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();

  const s = getState();
  setState({ phase: 'reveal' });

  const opponentField = s.opponentField ??
    s.fieldCards.map(c => ({ ...getCard(c.cardId), actionType: 0 }));

  // Compute battle result via damage-calc
  let result = null;
  try {
    const p1Field = s.fieldCards.filter(Boolean).map(c => ({ ...getCard(c.cardId), actionType: c.actionType }));
    const p2Field = opponentField.filter(Boolean).map(c => ({ ...getCard(c.cardId), actionType: c.actionType ?? 0 }));
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    result = damageCalc({ p1Field, p2Field, seed });
  } catch {
    result = simpleBattleCalc(s.fieldCards, opponentField);
  }

  setState({ battleResult: result, isWinner: result?.winner === 'p1' });
  container.innerHTML = buildHTML(s, result);
  bindEvents(container);

  // Subscribe to opponent's reveal (update opponentField if not already set from peek)
  if (!s.opponentField && duelWs.isConnected() && s.duelId) {
    _unsubOppReveal = duelWs.on('duel_hand_revealed', (msg) => {
      if (msg.playerId !== s.opponentPlayerId) return;
      _unsubOppReveal();
      const oppField = (msg.card_ids ?? []).map((id, i) => ({
        cardId: id,
        actionType: (msg.action_types ?? [])[i] ?? 0,
      }));
      setState({ opponentField: oppField });
    });
  }

  // ── reveal_hand on-chain submit (parallel with animation; gates WS + nav) ─
  _revealFailed = false;
  _revealPromise = _submitRevealOnChain(s);

  // Send hand reveal to server only after reveal TX confirms.
  // If the TX fails, _revealFailed is set and navigation is blocked.
  if (duelWs.isConnected() && s.duelId) {
    const myCardIds     = s.fieldCards.filter(Boolean).map(c => c.cardId);
    const myActionTypes = s.fieldCards.filter(Boolean).map(c => c.actionType ?? 0);
    _revealPromise.then(txHash => {
      if (!_revealFailed) {
        duelWs.sendHandRevealed(s.duelId, s.round ?? 1, myCardIds, myActionTypes, txHash);
      }
    }).catch(() => { /* _revealFailed already set inside _submitRevealOnChain */ });
  }

  // ── Round-5 on-chain resolution ───────────────────────────────────────────
  // After both players call reveal_hand on round 5, damage_calc runs on-chain
  // and duel.ended_at is set. Poll DuelState to detect winner.
  const isRound5 = (s.round ?? 1) === 5;
  if (isRound5 && s.duelId) {
    const duelIdStr = s.duelId;

    const _resolveFromChain = async () => {
      const ds = await _pollDuelResolution(duelIdStr);
      if (!ds) return; // timed out — fall back to WS consensus
      const myPubkey = window.solana?.publicKey?.toBase58?.() ?? null;
      const isWinner = myPubkey ? ds.winner === myPubkey : false;
      const final = getState().battleResult ?? result ?? { winner: isWinner ? 'p1' : 'p2' };
      setState({ isWinner, battleResult: { ...final, winner: isWinner ? 'p1' : 'p2' }, phase: 'loot' });
      document.dispatchEvent(new CustomEvent('nav:loot'));
    };

    // Trigger poll once our own reveal TX is done, OR when opponent reveals via WS.
    _revealPromise.then(_resolveFromChain).catch(() => {});
    if (!s.opponentField && duelWs.isConnected()) {
      const unsubR5 = duelWs.on('duel_hand_revealed', (msg) => {
        if (msg.playerId !== s.opponentPlayerId) return;
        unsubR5();
        _resolveFromChain();
      });
    }
  }

  // Wire Phase-11 consensus (rounds 1-4 and fallback for round 5)
  if (duelWs.isConnected() && s.duelId) {
    const p1BP = s.fieldCards.filter(Boolean).reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    const p2BP = opponentField.filter(Boolean).reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    if (s.isHost) {
      duelWs.sendBattleResolved(s.duelId, 1, p1BP, p2BP, result?.winner ?? null);
    } else {
      duelWs.sendDamageClaim(s.duelId, 1, p1BP, p2BP);
    }

    _unsubResolved = duelWs.on('duel_battle_resolved', (msg) => {
      if (msg.duel_id !== s.duelId) return;
      if (_revealFailed) return; // reveal TX not confirmed — block navigation
      _unsubResolved();
      if (!_skipped && _animTimeout) {
        clearTimeout(_animTimeout);
        _animTimeout = null;
      }
      const final = getState().battleResult ?? result ?? { winner: msg.winner ?? 'p1' };
      setState({ isWinner: final.winner === 'p1', battleResult: final, phase: 'loot' });
      document.dispatchEvent(new CustomEvent('nav:loot'));
    });
  }

  runAnimation(container, s, result);
}

export function unmount(container) {
  if (_animTimeout) { clearTimeout(_animTimeout); _animTimeout = null; }
  _unsubOppReveal();
  _unsubResolved();
  _unsubOppReveal  = () => {};
  _unsubResolved   = () => {};
  _skipped       = false;
  _revealFailed  = false;
  _revealPromise = Promise.resolve(null);
  _uiAddLog      = null;
  container.innerHTML = '';
}

/* ── Simple fallback battle calc ────────────────────────────────────── */
function simpleBattleCalc(p1Field, p2Field) {
  const p1Cards = p1Field.filter(Boolean).map(s => ({ ...getCard(s.cardId), actionType: s.actionType, hpCurrent: getCard(s.cardId)?.hp ?? 0, dead: false }));
  const p2Cards = (p2Field || p1Field).filter(Boolean).map(s => ({ ...getCard(s.cardId), actionType: s.actionType ?? 0, hpCurrent: getCard(s.cardId)?.hp ?? 0, dead: false }));

  let p1BP = p1Cards.reduce((a, c) => a + (c.bp ?? 0), 0);
  let p2BP = p2Cards.reduce((a, c) => a + (c.bp ?? 0), 0);

  // Simple resolution: subtract BPs
  for (let i = 0; i < Math.min(p1Cards.length, p2Cards.length); i++) {
    const dmg = p1Cards[i]?.bp ?? 0;
    if (p2Cards[i]) p2Cards[i].hpCurrent = Math.max(0, (p2Cards[i].hpCurrent ?? 0) - dmg);
    if (p2Cards[i]?.hpCurrent === 0) p2Cards[i].dead = true;
  }

  const winner = p1BP >= p2BP ? 'p1' : 'p2';
  const lootPool = p2Cards.map(c => c.id ?? 0);
  const lootCard = lootPool[Math.floor(Math.random() * lootPool.length)] ?? null;

  return { winner, p1Cards, p2Cards, lootPool, lootCard, effects: [] };
}

/* ── HTML ───────────────────────────────────────────────────────────── */
function buildHTML(s, result) {
  const p1  = s.fieldCards.filter(Boolean);
  const p2  = s.opponentField ?? s.fieldCards;

  return `
<div class="rev-root" role="main" aria-label="Reveal Phase">

  <!-- Top bar -->
  <header class="rev-topbar">
    <div class="chip rev-phase-label">REVEAL</div>
    <div class="rev-status label-gold" id="rev-status">Revealing hands…</div>
    <button class="gba-btn gba-btn--ghost rev-skip-btn" id="rev-skip" style="font-size:14px;">
      ⏭ SKIP
    </button>
  </header>

  <div class="rev-body">

    <!-- Opponent field (top) -->
    <section class="rev-opp-field" aria-label="Opponent field">
      <div class="rev-field-label label-dim">OPPONENT</div>
      <div class="rev-card-row" id="rev-opp-row">
        ${p2.map((c, i) =>
          `<div class="rev-card-wrap" id="rev-opp-${i}" style="animation-delay:${i * 0.12}s;">
            ${CardFrameHTML({ id: c.cardId, faceDown: true })}
          </div>`
        ).join('')}
      </div>
    </section>

    <!-- Battle log (center) -->
    <div class="rev-center">
      <div class="rev-log" id="rev-log" role="log" aria-live="polite">
        <div class="rev-log-line label-dim">… waiting for reveal …</div>
      </div>
      <div class="rev-bp-totals" id="rev-bp-totals">
        <span class="rev-bp-p1">P1: <b class="label-gold" id="rev-p1-bp">—</b> BP</span>
        <span class="rev-vs">VS</span>
        <span class="rev-bp-p2">P2: <b class="label-gold" id="rev-p2-bp">—</b> BP</span>
      </div>
    </div>

    <!-- Your field (bottom) -->
    <section class="rev-your-field" aria-label="Your field">
      <div class="rev-card-row" id="rev-your-row">
        ${p1.map((c, i) =>
          `<div class="rev-card-wrap" id="rev-your-${i}" style="animation-delay:${i * 0.12}s;">
            ${CardFrameHTML({ id: c.cardId, faceDown: true })}
          </div>`
        ).join('')}
      </div>
      <div class="rev-field-label label-dim">YOU</div>
    </section>

  </div>

</div>`;
}

/* ── Animation sequence ─────────────────────────────────────────────── */
function runAnimation(container, s, result) {
  const p1 = s.fieldCards.filter(Boolean);
  const p2 = s.opponentField ?? s.fieldCards;
  const log = container.querySelector('#rev-log');

  const after = (ms, fn) => {
    if (_skipped) return;
    _animTimeout = setTimeout(fn, ms);
  };

  function setStatus(text) {
    const el = container.querySelector('#rev-status');
    if (el) el.textContent = text;
  }

  function addLog(text, cls = '') {
    if (!log) return;
    const line = document.createElement('div');
    line.className = `rev-log-line ${cls}`;
    line.textContent = text;
    // Retry click handler for error log lines
    if (cls.includes('rev-retry-reveal')) {
      line.style.cursor = 'pointer';
      line.addEventListener('click', () => {
        _revealFailed = false;
        line.textContent = '↻ retrying reveal TX…';
        line.className = 'rev-log-line log-dim';
        const s = getState();
        _submitRevealOnChain(s).then(tx => {
          if (tx) {
            line.textContent = `◈ reveal TX confirmed ✓ (${tx.slice(0,8)}…)`;
            line.className = 'rev-log-line log-gold';
            if (duelWs.isConnected() && s.duelId) {
              const myCardIds     = s.fieldCards.filter(Boolean).map(c => c.cardId);
              const myActionTypes = s.fieldCards.filter(Boolean).map(c => c.actionType ?? 0);
              duelWs.sendHandRevealed(s.duelId, s.round ?? 1, myCardIds, myActionTypes, tx);
            }
          } else {
            line.textContent = '✕ retry failed — check wallet';
            line.className = 'rev-log-line log-error rev-retry-reveal';
          }
        });
      });
    }
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }
  _uiAddLog = addLog;

  function clearLog() {
    if (log) log.innerHTML = '';
  }

  // Step 1: Reveal all cards (1s)
  after(200, () => {
    setStatus('Revealing hands…');
    p1.forEach((c, i) => {
      after(i * 120, () => flipCard(container, `rev-your-${i}`, c.cardId));
    });
    p2.forEach((c, i) => {
      after(i * 120, () => flipCard(container, `rev-opp-${i}`, c.cardId));
    });
  });

  // Step 2: Synergy check (1s after reveal)
  after(1400, () => {
    clearLog();
    setStatus('Checking synergies…');
    const p1Factions = p1.map(c => factionOf(c.cardId));
    const p2Factions = p2.map(c => factionOf(c.cardId));
    const p1Synergy = checkSynergy(p1Factions);
    const p2Synergy = checkSynergy(p2Factions);
    if (p1Synergy) addLog(`◆ YOUR ${FACTION_NAMES[p1Synergy]} SYNERGY ACTIVE! (+10% BP)`, 'log-gold');
    if (p2Synergy) addLog(`◇ OPPONENT ${FACTION_NAMES[p2Synergy]} SYNERGY ACTIVE! (+10% BP)`, 'log-red');
    if (!p1Synergy && !p2Synergy) addLog('No faction synergy.', 'log-dim');
  });

  // Step 3: Legendary effects (2s)
  after(2400, () => {
    setStatus('Legendary effects…');
    const lgdCards = [...p1, ...p2].filter(c => isLegendaryOf(c.cardId));
    lgdCards.forEach((c, i) => {
      after(i * 800, () => {
        addLog(`★ ${FACTION_NAMES[factionOf(c.cardId)]} LEGENDARY ACTIVATES!`, 'log-gold');
      });
    });
  });

  // Step 4: Action types (5s)
  after(4600, () => {
    setStatus('Resolving actions…');
    const allCards = [...p1.map((c,i) => ({...c, side:'p1', idx:i})), ...p2.map((c,i) => ({...c, side:'p2', idx:i}))]
      .sort((a, b) => (getCard(b.cardId)?.ini ?? 0) - (getCard(a.cardId)?.ini ?? 0));
    allCards.forEach((c, i) => {
      after(i * 400, () => {
        const card = getCard(c.cardId);
        addLog(`[${c.side.toUpperCase()}] ${ACTION_LABELS[c.actionType] ?? '—'} (INI ${card?.ini})`, '');
      });
    });
  });

  // Step 5: Combat pairs (7.5s)
  after(9600, () => {
    setStatus('COMBAT!');
    clearLog();
    const pairCount = Math.min(p1.length, p2.length);
    for (let i = 0; i < pairCount; i++) {
      after(i * 1200, () => {
        const c1 = p1[i], c2 = p2[i];
        const card1 = getCard(c1.cardId), card2 = getCard(c2.cardId);
        const dmg   = card1?.bp ?? 0;
        addLog(`PAIR ${i+1}: YOUR ${dmg}BP → OPP ${card2?.hp}HP`, 'log-combat');
        highlightPair(container, i);

        // Update HP display
        const resPair = result.p2Cards?.[i];
        if (resPair !== undefined) {
          const oppCard = container.querySelector(`#rev-opp-${i} .cf-hp .stat-value`);
          if (oppCard) {
            const newHp = resPair.hpCurrent ?? 0;
            oppCard.textContent = newHp;
            if (newHp <= 0) {
              container.querySelector(`#rev-opp-${i}`)?.classList.add('rev-card--dead');
              addLog(`  └ OPP card ${i+1} DESTROYED`, 'log-red');
            }
          }
        }
      });
    }
  });

  // Step 6: Result (1s)
  after(17200, () => {
    const p1BP = p1.reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    const p2BP = p2.reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    const p1El = container.querySelector('#rev-p1-bp');
    const p2El = container.querySelector('#rev-p2-bp');
    if (p1El) p1El.textContent = p1BP;
    if (p2El) p2El.textContent = p2BP;

    const winner = result?.winner ?? (p1BP >= p2BP ? 'p1' : 'p2');
    setStatus(winner === 'p1' ? '◆ YOU WIN!' : '◇ OPPONENT WINS');
    container.querySelector('#rev-status').style.fontSize = '24px';
    container.querySelector('#rev-status').style.color = winner === 'p1' ? 'var(--accent-gold)' : 'var(--accent-red)';

    // Only nav here in demo mode — real multiplayer navs via duel_battle_resolved
    after(1200, () => {
      const st = getState();
      if (!duelWs.isConnected() || !st.duelId) {
        if (_revealFailed) return; // reveal TX not confirmed — block navigation
        setState({ isWinner: winner === 'p1', battleResult: result, phase: 'loot' });
        document.dispatchEvent(new CustomEvent('nav:loot'));
      }
    });
  });
}

function flipCard(container, id, cardId) {
  const wrap = container.querySelector(`#${id}`);
  if (!wrap) return;
  wrap.classList.add('rev-card--flip');
  setTimeout(() => {
    wrap.innerHTML = CardFrameHTML({ id: cardId });
    wrap.classList.remove('rev-card--flip');
  }, 150);
}

function highlightPair(container, idx) {
  [`#rev-your-${idx}`, `#rev-opp-${idx}`].forEach(sel => {
    const el = container.querySelector(sel);
    if (!el) return;
    el.classList.add('rev-card--highlight');
    setTimeout(() => el.classList.remove('rev-card--highlight'), 800);
  });
}

function checkSynergy(factions) {
  const counts = {};
  factions.forEach(f => { if (f != null) counts[f] = (counts[f] ?? 0) + 1; });
  const entry = Object.entries(counts).find(([, n]) => n >= 3);
  return entry ? parseInt(entry[0], 10) : null;
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#rev-skip').addEventListener('click', () => {
    if (_revealFailed) return; // reveal TX not confirmed — block skip
    _skipped = true;
    if (_animTimeout) { clearTimeout(_animTimeout); _animTimeout = null; }
    const s = getState();
    const result = s.battleResult ?? { winner: 'p1' };
    setState({ isWinner: result.winner === 'p1', phase: 'loot' });
    document.dispatchEvent(new CustomEvent('nav:loot'));
  });
}

/* ── Style ──────────────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-rev')) return;
  const el = document.createElement('style');
  el.id = 'style-rev';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.rev-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.rev-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.rev-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-red); border-color: var(--accent-red); }
.rev-status { font-size: 20px; letter-spacing: 0.06em; transition: color 0.5s, font-size 0.3s; }
.rev-skip-btn { font-size: 14px; padding: 3px 10px; }

.rev-body {
  flex: 1; display: grid;
  grid-template-rows: 1fr auto 1fr;
  padding: 8px 12px;
  gap: 6px; overflow: hidden;
}

/* Fields */
.rev-opp-field, .rev-your-field {
  display: flex; flex-direction: column; justify-content: center; gap: 4px;
}
.rev-opp-field { align-items: flex-start; }
.rev-your-field { align-items: flex-start; }

.rev-field-label { font-size: 13px; letter-spacing: 0.1em; }

.rev-card-row {
  display: flex; gap: 8px; align-items: center;
}

.rev-card-wrap {
  transition: transform 0.3s, opacity 0.3s;
}
.rev-card--flip {
  transform: rotateY(90deg); opacity: 0.2;
}
.rev-card--highlight {
  filter: drop-shadow(0 0 8px rgba(201,162,39,0.8));
}
.rev-card--dead .card-frame { opacity: 0.3; filter: grayscale(1); }
.rev-card-wrap .card-frame { width: 140px; }

/* Center log */
.rev-center {
  display: flex; flex-direction: column; gap: 4px;
  border-top: var(--border-dim); border-bottom: var(--border-dim);
  padding: 4px 0;
}

.rev-log {
  flex: 1; overflow-y: auto; max-height: 80px;
  display: flex; flex-direction: column; gap: 1px;
}
.rev-log::-webkit-scrollbar { width: 2px; }
.rev-log-line { font-size: 13px; letter-spacing: 0.02em; line-height: 1.4; padding: 0 4px; }
.log-gold { color: var(--accent-gold); }
.log-red  { color: var(--accent-red); }
.log-dim  { color: var(--text-dim); }
.log-combat { color: var(--accent-blue); }

.rev-bp-totals {
  display: flex; align-items: center; justify-content: center; gap: 24px;
  font-size: 18px;
}
.rev-vs { color: var(--text-dim); font-size: 14px; }
`;
