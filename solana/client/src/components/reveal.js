// reveal.js — Screen 4: Reveal Phase + battle animation (~17s)
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { factionOf, isLegendaryOf } from '../lib/card-meta.js';
import { damageCalc } from '../lib/damage-calc.js';
import { CardFrameHTML, injectCardCSS, FACTION_NAMES, ACTION_LABELS, ACTION_NAMES, FACTION_COLORS } from './common/Card.js';
import { RoundHudHTML, injectRoundUiCSS, showRoundBridge } from './common/round-ui.js';
import { pxIcon } from '../lib/px-icons.js';
import { showToast } from '../lib/ui-shared.js';
import { getState, setState, advanceRound } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';

const POLL_MS = 1500; // getDuelStateFull poll cadence during resolution

let _animTimeout      = null;
let _skipped          = false;
let _unsubOppReveal   = () => {};
let _revealPromise    = Promise.resolve(null);
let _revealFailed     = false;
let _uiAddLog         = null;

// ── round-loop resolution state ──
let _playbackDone       = false; // battle animation reached its end (or skipped)
let _resolutionStarted  = false; // resolveRound() has begun for this mount
let _resolutionAborted  = false; // set on unmount to stop the poll loop
let _navigated          = false; // guard against double navigation
let _bridgeDispose       = null; // active round-bridge disposer

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
    _uiAddLog?.(`reveal TX failed — tap to retry: ${msg.slice(0, 80)}`, 'log-error rev-retry-reveal');
    return null;
  }
}

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function _safeDuelState(duelIdStr) {
  if (typeof window.oxarkOnchain?.getDuelStateFull !== 'function') return null;
  try { return await window.oxarkOnchain.getDuelStateFull(duelIdStr); }
  catch (_) { return null; }
}

// Which on-chain side am I? player1 === myPubkey when known, else isHost
// (the host inits the duel as player1).
function _p1IsMe(ds, s) {
  const myPk = window.solana?.publicKey?.toBase58?.() ?? null;
  if (myPk && ds?.player1) return ds.player1 === myPk;
  return s.duelP1IsMe ?? s.isHost ?? true;
}

// Start (or resume) resolution once BOTH the battle playback finished AND our
// reveal tx is confirmed. Re-entrant: the reveal-retry handler calls this again
// after a successful retry.
function maybeStartResolution(container) {
  if (_resolutionStarted || _navigated || _resolutionAborted) return;
  if (!_playbackDone || _revealFailed) return;
  _resolutionStarted = true;
  resolveRound(container, getState()).catch(err => {
    console.error('[Reveal] resolution error:', err);
  });
}

// The single resolution entry point. Real mode (WS connected) reads chain truth
// via getDuelStateFull; demo mode resolves locally. Both funnel through
// _endDuel / _bridgeToNextRound so there is exactly one round-transition path.
async function resolveRound(container, s) {
  const realMode = duelWs.isConnected() && !!s.duelId
    && typeof window.oxarkOnchain?.getDuelStateFull === 'function';
  if (realMode) return _chainResolve(container, s);
  return _localResolve(container, s);
}

// Poll the chain until this round resolves (round advances) or the duel ends.
// While waiting on the opponent, surface WAITING + a 600s CLAIM TIMEOUT WIN.
async function _chainResolve(container, s) {
  const duelId    = s.duelId;
  const prevRound = s.round ?? 1;
  const prevP1    = s.p1RoundWins ?? 0;
  const prevP2    = s.p2RoundWins ?? 0;
  const stallSecs = window.oxarkOnchain?.DUEL_STALL_TIMEOUT_SECONDS ?? 600;
  const t0 = Date.now();
  let claimShown = false;

  while (!_resolutionAborted && !_navigated) {
    const ds = await _safeDuelState(duelId);
    if (ds) {
      const p1IsMe = _p1IsMe(ds, s);
      if (ds.endedAt > 0) { _endDuel(container, ds, p1IsMe); return; }
      if ((ds.round ?? prevRound) > prevRound) {
        _bridgeToNextRound(container, ds, p1IsMe, prevRound, prevP1, prevP2);
        return;
      }
    }
    const elapsed = Math.floor((Date.now() - t0) / 1000);
    _showWaiting(container, elapsed);
    if (elapsed >= stallSecs && !claimShown) {
      claimShown = true;
      _showClaimTimeout(container, duelId);
    }
    await _sleep(POLL_MS);
  }
}

// Demo / no-server path: decide the round from the local battle result, keep a
// local best-of-3 tally, and end at first-to-3 or after round 5.
function _localResolve(container, s) {
  const p1IsMe = s.duelP1IsMe ?? s.isHost ?? true;
  const iWon   = (s.battleResult?.winner ?? 'p1') === 'p1';
  let p1w = s.p1RoundWins ?? 0;
  let p2w = s.p2RoundWins ?? 0;
  if (iWon) { p1IsMe ? p1w++ : p2w++; } else { p1IsMe ? p2w++ : p1w++; }

  const myWins  = p1IsMe ? p1w : p2w;
  const oppWins = p1IsMe ? p2w : p1w;
  const round   = s.round ?? 1;
  const ended   = myWins >= 3 || oppWins >= 3 || round >= 5;

  setState({ p1RoundWins: p1w, p2RoundWins: p2w, duelP1IsMe: p1IsMe });

  if (ended) {
    _navigate(() => {
      setState({ isWinner: myWins >= oppWins, phase: 'loot' });
      document.dispatchEvent(new CustomEvent('nav:loot'));
    });
    return;
  }
  _hideWait(container);
  _bridgeDispose = showRoundBridge(container, {
    round, myWins, oppWins,
    outcome: iWon ? 'win' : 'loss',
    onDone: () => _navigate(() => advanceRound({ round: round + 1, p1RoundWins: p1w, p2RoundWins: p2w, p1IsMe })),
  });
}

function _endDuel(container, ds, p1IsMe) {
  const myPk = window.solana?.publicKey?.toBase58?.() ?? null;
  const isWinner = myPk ? ds.winner === myPk : false;
  _navigate(() => {
    setState({
      isWinner,
      p1RoundWins: ds.p1RoundWins ?? 0,
      p2RoundWins: ds.p2RoundWins ?? 0,
      duelP1IsMe: p1IsMe,
      phase: 'loot',
    });
    document.dispatchEvent(new CustomEvent('nav:loot'));
  });
}

function _bridgeToNextRound(container, ds, p1IsMe, prevRound, prevP1, prevP2) {
  const iWon   = p1IsMe ? (ds.p1RoundWins > prevP1) : (ds.p2RoundWins > prevP2);
  const oppWon = p1IsMe ? (ds.p2RoundWins > prevP2) : (ds.p1RoundWins > prevP1);
  const myWins  = p1IsMe ? ds.p1RoundWins : ds.p2RoundWins;
  const oppWins = p1IsMe ? ds.p2RoundWins : ds.p1RoundWins;
  _hideWait(container);
  _bridgeDispose = showRoundBridge(container, {
    round: prevRound,
    myWins, oppWins,
    outcome: iWon ? 'win' : oppWon ? 'loss' : 'draw', // neither incremented = draw (§2.6)
    onDone: () => _navigate(() => advanceRound({
      round: ds.round, p1RoundWins: ds.p1RoundWins, p2RoundWins: ds.p2RoundWins, p1IsMe,
    })),
  });
}

function _navigate(fn) {
  if (_navigated) return;
  _navigated = true;
  fn();
}

/* ── Waiting / stall UI ─────────────────────────────────────────────── */
function _showWaiting(container, elapsedSecs) {
  const panel = container.querySelector('#rev-wait');
  if (!panel) return;
  panel.style.display = 'flex';
  const el = container.querySelector('#rev-wait-elapsed');
  if (el) el.textContent = `${elapsedSecs}s`;
}

function _hideWait(container) {
  const panel = container.querySelector('#rev-wait');
  if (panel) panel.style.display = 'none';
}

function _showClaimTimeout(container, duelId) {
  const btn = container.querySelector('#rev-claim');
  if (!btn || btn.dataset.wired) return;
  btn.style.display = 'inline-flex';
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => _onClaimTimeout(container, duelId));
}

async function _onClaimTimeout(container, duelId) {
  const btn = container.querySelector('#rev-claim');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = 'CLAIMING…';
  try {
    if (typeof window.oxarkOnchain?.claimTimeoutWin !== 'function') throw new Error('claim unavailable');
    await window.oxarkOnchain.claimTimeoutWin(duelId);
    for (let i = 0; i < 20 && !_resolutionAborted; i++) {
      const ds = await _safeDuelState(duelId);
      if (ds && ds.endedAt > 0) { _endDuel(container, ds, _p1IsMe(ds, getState())); return; }
      await _sleep(500);
    }
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('warn')} CLAIM TIMEOUT WIN`;
  } catch (err) {
    const msg = err?.message ?? String(err);
    // "too early" → keep waiting; "claimer not revealed" can't originate here
    // (we gate on our own reveal) but map defensively.
    const friendly = /too\s*early/i.test(msg) ? 'Too early — keep waiting'
      : /not\s*reveal/i.test(msg) ? 'Reveal your hand first'
      : `Claim failed: ${msg.slice(0, 60)}`;
    showToast(friendly, 'error');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('warn')} CLAIM TIMEOUT WIN`;
  }
}

export function mount(container, detail = {}) {
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();
  injectRoundUiCSS();

  _playbackDone      = false;
  _resolutionStarted = false;
  _resolutionAborted = false;
  _navigated         = false;
  _bridgeDispose     = null;

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

  // ── reveal_hand on-chain submit (parallel with animation; gates resolution) ─
  // Resolution (round bridge / RESULT) is blocked until this tx confirms — the
  // chain is the sole arbiter of round wins and duel end. _revealPromise resolves
  // to the tx hash (or null on failure, with _revealFailed set + retry line).
  _revealFailed = false;
  _revealPromise = _submitRevealOnChain(s);

  const myCardIds     = s.fieldCards.filter(Boolean).map(c => c.cardId);
  const myActionTypes = s.fieldCards.filter(Boolean).map(c => c.actionType ?? 0);
  const round         = s.round ?? 1;

  // Send hand reveal to server only after reveal TX confirms.
  if (duelWs.isConnected() && s.duelId) {
    _revealPromise.then(txHash => {
      if (!_revealFailed) {
        duelWs.sendHandRevealed(s.duelId, round, myCardIds, myActionTypes, txHash);
      }
      maybeStartResolution(container);
    }).catch(() => { /* _revealFailed already set inside _submitRevealOnChain */ });

    // Phase-11 server bookkeeping (no longer drives navigation — chain truth does).
    const p1BP = s.fieldCards.filter(Boolean).reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    const p2BP = opponentField.filter(Boolean).reduce((a, c) => a + (getCard(c.cardId)?.bp ?? 0), 0);
    if (s.isHost) {
      duelWs.sendBattleResolved(s.duelId, round, p1BP, p2BP, result?.winner ?? null);
    } else {
      duelWs.sendDamageClaim(s.duelId, round, p1BP, p2BP);
    }
  } else {
    // Demo / no-chain: nothing gates us; resolution runs once playback ends.
    _revealPromise.then(() => maybeStartResolution(container)).catch(() => {});
  }

  runAnimation(container, s, result);
}

export function unmount(container) {
  if (_animTimeout) { clearTimeout(_animTimeout); _animTimeout = null; }
  _resolutionAborted = true;           // stop any in-flight poll loop
  if (_bridgeDispose) { try { _bridgeDispose(); } catch (_) {} _bridgeDispose = null; }
  _unsubOppReveal();
  _unsubOppReveal  = () => {};
  _skipped           = false;
  _revealFailed      = false;
  _revealPromise     = Promise.resolve(null);
  _uiAddLog          = null;
  _playbackDone      = false;
  _resolutionStarted = false;
  _navigated         = false;
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
    ${RoundHudHTML(s)}
    <button class="gba-btn gba-btn--ghost rev-skip-btn" id="rev-skip" style="font-size:14px;">
      SKIP
    </button>
  </header>

  <!-- Waiting-for-opponent / stall overlay (shown during resolution) -->
  <div class="rev-wait" id="rev-wait" style="display:none;" role="status" aria-live="polite">
    <div class="rev-wait-msg">WAITING FOR OPPONENT…</div>
    <div class="rev-wait-elapsed" id="rev-wait-elapsed">0s</div>
    <button class="gba-btn gba-btn--primary rev-claim-btn" id="rev-claim" style="display:none;">
      ${pxIcon('warn')} CLAIM TIMEOUT WIN
    </button>
  </div>

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
            line.textContent = `◈ reveal TX confirmed (${tx.slice(0,8)}…)`;
            line.className = 'rev-log-line log-gold';
            if (duelWs.isConnected() && s.duelId) {
              const myCardIds     = s.fieldCards.filter(Boolean).map(c => c.cardId);
              const myActionTypes = s.fieldCards.filter(Boolean).map(c => c.actionType ?? 0);
              duelWs.sendHandRevealed(s.duelId, s.round ?? 1, myCardIds, myActionTypes, tx);
            }
            maybeStartResolution(container); // retry cleared the block — resume resolution
          } else {
            line.textContent = 'retry failed — check wallet';
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
        addLog(`${FACTION_NAMES[factionOf(c.cardId)]} LEGENDARY ACTIVATES!`, 'log-gold');
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
        addLog(`[${c.side.toUpperCase()}] ${ACTION_NAMES[c.actionType] ?? '—'} (INI ${card?.ini})`, '');
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

    // Playback finished — hand off to the unified resolver. It reads chain truth
    // (getDuelStateFull) in real mode or the local tally in demo, then routes to
    // RESULT (duel ended) or the round bridge → advanceRound (duel continues).
    after(1200, () => {
      _playbackDone = true;
      maybeStartResolution(container);
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
    _skipped = true;
    if (_animTimeout) { clearTimeout(_animTimeout); _animTimeout = null; }
    _playbackDone = true;
    // Resolver is gated on reveal-confirmed; if the reveal tx failed it stays put
    // and the retry line remains actionable.
    maybeStartResolution(container);
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

/* Waiting-for-opponent / stall overlay */
.rev-wait {
  position: absolute; inset: 44px 0 0 0; z-index: 40;
  display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(3,6,15,0.86); font-family: var(--font-main);
}
.rev-wait-msg { font-size: 22px; letter-spacing: 0.12em; color: var(--accent-gold); }
.rev-wait-elapsed { font-size: 32px; color: var(--text-cream); letter-spacing: 0.05em; }
.rev-claim-btn { font-size: 18px; padding: 10px 18px; margin-top: 6px; }
`;
