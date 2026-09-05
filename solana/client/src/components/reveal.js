// reveal.js — Screen 4: Reveal Phase + Battle Stage v2 (F2-2, PR-J)
// The playback is now a REPLAY of damageCalc().effects[] — the same deterministic
// events that decide the winner — so presentation and truth cannot diverge.
// mount(container, detail) / unmount(container)

import { getCard } from '../lib/cards.js';
import { damageCalc, computeSeed } from '../lib/damage-calc.js';
import { CardFrameHTML, injectCardCSS, FACTION_NAMES, CARD_NAMES, ACTION_LABELS } from './common/Card.js';
import { RoundHudHTML, injectRoundUiCSS, showRoundBridge } from './common/round-ui.js';
import { pxIcon } from '../lib/px-icons.js';
import { showToast } from '../lib/ui-shared.js';
import { getState, setState, advanceRound } from '../state/battle-state.js';
import * as duelWs from '../lib/duel-ws.js';
import { createScreenScope } from '../lib/screen-scope.js';

const POLL_MS = 1500; // getDuelStateFull poll cadence during resolution

let _generation = 0;
let _scope = null;
let _skipped          = false;
let _unsubOppReveal   = () => {};
let _revealPromise    = Promise.resolve(null);
let _revealFailed     = false;
let _revealReady      = false; // a pending transaction is not a successful reveal
let _uiAddLog         = null;

// ── round-loop resolution state ──
let _playbackDone       = false; // battle animation reached its end (or skipped)
let _resolutionStarted  = false; // resolveRound() has begun for this mount
let _resolutionAborted  = false; // set on unmount to stop the poll loop
let _navigated          = false; // guard against double navigation
let _bridgeDispose      = null;  // active round-bridge disposer

// Build card_ids [u64; 10]: first 5 are field card IDs, last 5 are 0n.
function _buildCardIds10(fieldCards) {
  return Array.from({ length: 10 }, (_, i) => BigInt(fieldCards[i]?.cardId ?? 0));
}

async function _submitRevealOnChain(s, generation) {
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
    if (generation !== _generation || _resolutionAborted || _navigated) return null;
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

// Which on-chain side am I? player1 === myPubkey when known, else isHost.
function _p1IsMe(ds, s) {
  const myPk = window.solana?.publicKey?.toBase58?.() ?? null;
  if (myPk && ds?.player1) return ds.player1 === myPk;
  return s.duelP1IsMe ?? s.isHost ?? true;
}

// Start (or resume) resolution once BOTH the battle playback finished AND our
// reveal tx is confirmed. Re-entrant: the reveal-retry handler calls this again.
function maybeStartResolution(container) {
  if (_resolutionStarted || _navigated || _resolutionAborted) return;
  if (!_playbackDone || !_revealReady || _revealFailed) return;
  _resolutionStarted = true;
  resolveRound(container, getState()).catch(err => {
    console.error('[Reveal] resolution error:', err);
  });
}

// The single resolution entry point (SEAM — unchanged from PR-E). Real mode reads
// chain truth via getDuelStateFull; demo resolves locally. Both funnel through
// _endDuel / _bridgeToNextRound so there is exactly one round-transition path.
async function resolveRound(container, s) {
  const realMode = duelWs.isConnected() && !!s.duelId
    && typeof window.oxarkOnchain?.getDuelStateFull === 'function';
  if (realMode) return _chainResolve(container, s);
  return _localResolve(container, s);
}

async function _chainResolve(container, s) {
  const generation = _generation;
  const duelId    = s.duelId;
  const prevRound = s.round ?? 1;
  const prevP1    = s.p1RoundWins ?? 0;
  const prevP2    = s.p2RoundWins ?? 0;
  const stallSecs = window.oxarkOnchain?.DUEL_STALL_TIMEOUT_SECONDS ?? 600;
  const t0 = Date.now();
  let claimShown = false;

  while (generation === _generation && !_resolutionAborted && !_navigated) {
    const ds = await _safeDuelState(duelId);
    if (generation !== _generation || _resolutionAborted || _navigated) return;
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

function _localResolve(container, s) {
  const p1IsMe = s.duelP1IsMe ?? s.isHost ?? true;
  const iWon   = s.battleResult?.winner === 'p1';
  const opponentWon = s.battleResult?.winner === 'p2';
  let p1w = s.p1RoundWins ?? 0;
  let p2w = s.p2RoundWins ?? 0;
  if (iWon) { p1IsMe ? p1w++ : p2w++; } else if (opponentWon) { p1IsMe ? p2w++ : p1w++; }

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
    outcome: iWon ? 'win' : opponentWon ? 'loss' : 'draw',
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
  const generation = _generation;
  btn.addEventListener('click', () => _onClaimTimeout(container, duelId, generation));
}

async function _onClaimTimeout(container, duelId, generation) {
  if (generation !== _generation || _resolutionAborted || _navigated) return;
  const btn = container.querySelector('#rev-claim');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = 'CLAIMING…';
  try {
    if (typeof window.oxarkOnchain?.claimTimeoutWin !== 'function') throw new Error('claim unavailable');
    await window.oxarkOnchain.claimTimeoutWin(duelId);
    if (generation !== _generation || _resolutionAborted || _navigated) return;
    for (let i = 0; i < 20 && generation === _generation && !_resolutionAborted && !_navigated; i++) {
      const ds = await _safeDuelState(duelId);
      if (generation !== _generation || _resolutionAborted || _navigated) return;
      if (ds && ds.endedAt > 0) { _endDuel(container, ds, _p1IsMe(ds, getState())); return; }
      await _sleep(500);
    }
    if (generation !== _generation || _resolutionAborted || _navigated) return;
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('warn')} CLAIM TIMEOUT WIN`;
  } catch (err) {
    if (generation !== _generation || _resolutionAborted || _navigated) return;
    const msg = err?.message ?? String(err);
    const friendly = /too\s*early/i.test(msg) ? 'Too early — keep waiting'
      : /not\s*reveal/i.test(msg) ? 'Reveal your hand first'
      : `Claim failed: ${msg.slice(0, 60)}`;
    showToast(friendly, 'error');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('warn')} CLAIM TIMEOUT WIN`;
  }
}

/* ── §3.1: deterministic playback seed ──────────────────────────────────
 * On-chain combat seeds INI tie-breaks with SHA-256(p1_salt‖p2_salt‖[round]).
 * Real mode reads both salts off DuelState (getRoundSalts) once both revealed;
 * demo mode derives them locally. Either way the seed is DETERMINISTIC — the old
 * crypto.getRandomValues() was a live source of replay non-determinism (v1.1). */
async function _playbackSeed(s) {
  const round = s.round ?? 1;
  const realMode = duelWs.isConnected() && !!s.duelId
    && typeof window.oxarkOnchain?.getRoundSalts === 'function';
  try {
    if (realMode) {
      const { p1Salt, p2Salt } = await window.oxarkOnchain.getRoundSalts(s.duelId, round);
      if (p1Salt && p2Salt) {
        // YKK-59 live-pass check: a real duel MUST take this branch (chain parity).
        console.log(`[Reveal] playback seed: CHAIN salts (round ${round})`);
        return await computeSeed(p1Salt, p2Salt, round);
      }
    }
    // Demo / not-yet-on-chain: local salt on both sides — same formula, deterministic.
    console.log(`[Reveal] playback seed: LOCAL fallback (round ${round})${realMode ? ' — chain salts not on-chain yet' : ' — demo/no-WS'}`);
    const local = s.salt instanceof Uint8Array ? s.salt : new Uint8Array(32);
    return await computeSeed(local, local, round);
  } catch (_) {
    return new Uint8Array(32); // last-resort deterministic zero seed
  }
}

export function mount(container, detail = {}) {
  _scope?.dispose();
  _bridgeDispose?.();
  _bridgeDispose = null;
  _unsubOppReveal();
  _unsubOppReveal = () => {};
  const generation = ++_generation;
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectStyle();
  injectCardCSS();
  injectRoundUiCSS();

  _scope = createScreenScope();
  _playbackDone      = false;
  _resolutionStarted = false;
  _resolutionAborted = false;
  _navigated         = false;
  _skipped           = false;
  _bridgeDispose     = null;

  const s = getState();
  setState({ phase: 'reveal' });

  const opponentField = s.opponentField ??
    s.fieldCards.filter(Boolean).map(c => ({ cardId: c.cardId, actionType: 0 }));

  // Skeleton first (fields render from state, not from the result).
  container.innerHTML = buildHTML(s);
  bindEvents(container, generation);

  // Subscribe to opponent's reveal (update opponentField if not from peek).
  if (!s.opponentField && duelWs.isConnected() && s.duelId) {
    _unsubOppReveal = duelWs.on('duel_hand_revealed', (msg) => {
      if (generation !== _generation || _resolutionAborted || _navigated) return;
      if (msg.playerId !== s.opponentPlayerId) return;
      _unsubOppReveal();
      const oppField = (msg.card_ids ?? []).map((id, i) => ({
        cardId: id,
        actionType: (msg.action_types ?? [])[i] ?? 0,
      }));
      setState({ opponentField: oppField });
    });
  }

  // ── reveal_hand on-chain submit (parallel with playback; gates resolution) ──
  _revealFailed = false;
  _revealReady = false;
  _revealPromise = _submitRevealOnChain(s, generation);

  const myCardIds     = s.fieldCards.filter(Boolean).map(c => c.cardId);
  const myActionTypes = s.fieldCards.filter(Boolean).map(c => c.actionType ?? 0);
  const round         = s.round ?? 1;

  _revealPromise.then(txHash => {
    if (generation !== _generation || _resolutionAborted || _navigated) return;
    _revealReady = !_revealFailed;
    if (!_revealReady) return;
    if (duelWs.isConnected() && s.duelId) {
      duelWs.sendHandRevealed(s.duelId, round, myCardIds, myActionTypes, txHash);
    }
    maybeStartResolution(container);
  }).catch(() => { /* _revealFailed already set inside _submitRevealOnChain */ });

  // ── Battle Stage v2: deterministic seed → damageCalc → effect-replay playback ─
  (async () => {
    const p1Field = s.fieldCards.filter(Boolean).map(c => ({ ...getCard(c.cardId), actionType: c.actionType }));
    const p2Field = opponentField.filter(Boolean).map(c => ({ ...getCard(c.cardId), actionType: c.actionType ?? 0 }));
    let result;
    try {
      const seed = await _playbackSeed(s);
      result = damageCalc({ p1Field, p2Field, seed });
    } catch {
      result = simpleBattleCalc(s.fieldCards, opponentField);
    }
    if (generation !== _generation || _navigated || _resolutionAborted) return;
    setState({ battleResult: result, isWinner: result?.winner === 'p1' });

    // Phase-11 server bookkeeping (chain truth drives navigation, not this).
    if (duelWs.isConnected() && s.duelId) {
      const p1BP = p1Field.reduce((a, c) => a + (c.bp ?? 0), 0);
      const p2BP = p2Field.reduce((a, c) => a + (c.bp ?? 0), 0);
      if (s.isHost) duelWs.sendBattleResolved(s.duelId, round, p1BP, p2BP, result?.winner ?? null);
      else          duelWs.sendDamageClaim(s.duelId, round, p1BP, p2BP);
    }

    await runPlayback(container, s, result, generation);
  })();
}

export function unmount(container) {
  _generation++;
  _scope?.dispose();
  _scope = null;
  _skipped           = true;               // stop any in-flight beat queue
  _resolutionAborted = true;               // stop any in-flight poll loop
  if (_bridgeDispose) { try { _bridgeDispose(); } catch (_) {} _bridgeDispose = null; }
  _unsubOppReveal();
  _unsubOppReveal  = () => {};
  _revealFailed      = false;
  _revealReady       = false;
  _revealPromise     = Promise.resolve(null);
  _uiAddLog          = null;
  _playbackDone      = false;
  _resolutionStarted = false;
  _navigated         = false;
  container.innerHTML = '';
}

/* ── Simple fallback battle calc (unchanged) ────────────────────────── */
function simpleBattleCalc(p1Field, p2Field) {
  const p1Cards = p1Field.filter(Boolean).map(s => ({ ...getCard(s.cardId), actionType: s.actionType, hpCurrent: getCard(s.cardId)?.hp ?? 0, dead: false }));
  const p2Cards = (p2Field || p1Field).filter(Boolean).map(s => ({ ...getCard(s.cardId), actionType: s.actionType ?? 0, hpCurrent: getCard(s.cardId)?.hp ?? 0, dead: false }));

  let p1BP = p1Cards.reduce((a, c) => a + (c.bp ?? 0), 0);
  let p2BP = p2Cards.reduce((a, c) => a + (c.bp ?? 0), 0);

  for (let i = 0; i < Math.min(p1Cards.length, p2Cards.length); i++) {
    const dmg = p1Cards[i]?.bp ?? 0;
    if (p2Cards[i]) p2Cards[i].hpCurrent = Math.max(0, (p2Cards[i].hpCurrent ?? 0) - dmg);
    if (p2Cards[i]?.hpCurrent === 0) p2Cards[i].dead = true;
  }

  const winner = p1BP >= p2BP ? 'p1' : 'p2';
  const finalize = (c) => ({ id: c.id, finalBp: c.bp ?? 0, finalHp: c.hpCurrent ?? 0, destroyed: !!c.dead, isLegendary: !!c.isLegendary });
  return { winner, p1BpTotal: p1BP, p2BpTotal: p2BP, p1Cards: p1Cards.map(finalize), p2Cards: p2Cards.map(finalize), effects: [] };
}

/* ── HTML (§3.4 layout: 140px frames · ΣBP counters · duel zone · 2-row telop) ─ */
function buildHTML(s) {
  const p1  = s.fieldCards.filter(Boolean);
  const p2  = s.opponentField ?? s.fieldCards;

  const row = (cards, side) => cards.map((c, i) =>
    `<div class="rev-card-wrap" id="rev-${side}-${i}" style="animation-delay:${i * 0.12}s;">
       ${CardFrameHTML({ id: c.cardId, faceDown: true })}
     </div>`).join('');

  return `
<div class="rev-root" role="main" aria-label="Reveal Phase">
  <header class="rev-topbar">
    <div class="chip rev-phase-label">REVEAL</div>
    <div class="rev-status label-gold" id="rev-status">Revealing hands…</div>
    ${RoundHudHTML(s)}
    <button class="gba-btn gba-btn--ghost rev-skip-btn" id="rev-skip" style="font-size:14px;">SKIP</button>
  </header>

  <div class="rev-wait" id="rev-wait" style="display:none;" role="status" aria-live="polite">
    <div class="rev-wait-msg">WAITING FOR OPPONENT…</div>
    <div class="rev-wait-elapsed" id="rev-wait-elapsed">0s</div>
    <button class="gba-btn gba-btn--primary rev-claim-btn" id="rev-claim" style="display:none;">
      ${pxIcon('warn')} CLAIM TIMEOUT WIN
    </button>
  </div>

  <div class="rev-arena-layout"><div class="rev-body">
    <section class="rev-opp-field" aria-label="Opponent field">
      <div class="rev-field-head">
        <span class="rev-field-label label-dim">OPPONENT</span>
        <span class="rev-bp" id="rev-p2-bp">ΣBP <b class="label-red">—</b></span>
      </div>
      <div class="rev-card-row" id="rev-opp-row">${row(p2, 'opp')}</div>
    </section>

    <!-- Center duel zone + 2-row telop (replaces the scripted center log) -->
    <div class="rev-stage" id="rev-stage" aria-hidden="true"><span>YOUR PLAN</span><i></i><strong>VS</strong><i></i><span>THEIR PLAN</span></div>
    <div class="rev-telop" id="rev-telop" role="log" aria-live="polite">
      <div class="rev-telop-line" id="rev-telop-0"></div>
      <div class="rev-telop-line" id="rev-telop-1"></div>
    </div>

    <section class="rev-your-field" aria-label="Your field">
      <div class="rev-card-row" id="rev-your-row">${row(p1, 'your')}</div>
      <div class="rev-field-head">
        <span class="rev-field-label label-dim">YOU</span>
        <span class="rev-bp" id="rev-p1-bp">ΣBP <b class="label-gold">—</b></span>
      </div>
    </section>
  </div><aside class="rev-journal" aria-label="Battle record"><div class="rev-journal-heading"><span class="archive-eyebrow">THE CONFRONTATION</span><h2>Battle record</h2><p>Follow each action as your sealed hand unfolds.</p></div><ol id="rev-record" aria-label="Actions in resolution order"></ol><div class="rev-journal-foot">The winner is decided by surviving battle power after actions resolve.</div></aside></div>
</div>`;
}

/* ── §3.3: effect string → beat mapping ─────────────────────────────────
 * damageCalc().effects[] is the timeline. Each string parses to a beat; the pair
 * `duel` beats are synthesized from p1Cards/p2Cards (the authoritative finals).
 * Unknown strings get a verbatim dim telop and no beat (forward-compat rule). */
const M = { t: 'var(--t-fast)' }; // motion token hint (durations below are ms)
function buildTimeline(result) {
  const fx = result?.effects ?? [];
  const beats = [];
  // §3.3 ordering: void-blocked SEALED stamps render first (before any actions).
  for (const e of fx) if (/_void_blocked_/.test(e)) beats.push({ kind: 'seal-stamp', e, dur: 160 });
  for (const e of fx) {
    let m;
    if (/_void_blocked_/.test(e)) continue; // already emitted
    if ((m = e.match(/^p([12])_synergy_(\d+)$/)))            beats.push({ kind: 'banner', side: 'p' + m[1], faction: +m[2], dur: 320, sfx: 'sfx-ui-confirm' });
    else if ((m = e.match(/^p([12])_legendary_(\d+)_present$/))) beats.push({ kind: 'crown', side: 'p' + m[1], id: +m[2], dur: 160, sfx: 'sfx-legendary' });
    else if ((m = e.match(/^(p[12])_crystal_(\d+)$/)))       beats.push({ kind: 'buff', side: m[1], id: +m[2], dur: 160 });
    else if ((m = e.match(/^(p[12])_barrier_(\d+)$/)))       beats.push({ kind: 'shield', side: m[1], id: +m[2], dur: 160 });
    else if ((m = e.match(/^(p[12])_flame_(\d+)_hits_(\d+)$/))) beats.push({ kind: 'ember', side: m[1], id: +m[2], target: +m[3], dur: 320, sfx: 'sfx-hit' });
    else if ((m = e.match(/^(p[12])_storm_sweeps_(p[12])$/))) beats.push({ kind: 'gust', side: m[1], opp: m[2], dur: 320, sfx: 'sfx-hit' });
    else if ((m = e.match(/^(p[12])_shadow_(\d+)$/)))        beats.push({ kind: 'fade', side: m[1], id: +m[2], dur: 160 });
    else if ((m = e.match(/^(p[12])_void_(\d+)$/)))          beats.push({ kind: 'spark', side: m[1], id: +m[2], dur: 160 });
    else if ((m = e.match(/^p([12])_shadow_skip_pair_(\d+)$/))) beats.push({ kind: 'skip', side: 'p' + m[1], pair: +m[2], dur: 240 });
    else if ((m = e.match(/^winner_(p[12])_bp_(\d+)_vs_(\d+)$/))) beats.push({ kind: 'verdict', winner: m[1], p1bp: +m[2], p2bp: +m[3], dur: 480, sfx: null });
    else if (/^loot_card_/.test(e)) { /* RESULT concern — ignored in playback */ }
    else if (/_barrier_blocked_pair_/.test(e)) { /* rendered inside the duel beat */ }
    else beats.push({ kind: 'telop', text: e, dur: 0 }); // forward-compat: verbatim dim telop
  }
  // Synthesize the 5 pair `duel` beats from the authoritative finals, in order.
  const barrierBlocked = new Set(fx.filter(e => /_barrier_blocked_pair_/.test(e)));
  for (let i = 0; i < 5; i++) {
    if (fx.includes(`p1_shadow_skip_pair_${i}`) || fx.includes(`p2_shadow_skip_pair_${i}`)) continue;
    beats.push({
      kind: 'duel', pair: i, dur: 640,
      p1: result?.p1Cards?.[i], p2: result?.p2Cards?.[i],
      p1Blocked: barrierBlocked.has(`p1_barrier_blocked_pair_${i}`),
      p2Blocked: barrierBlocked.has(`p2_barrier_blocked_pair_${i}`),
      sfx: 'sfx-hit',
    });
  }
  // Move the verdict to the very end (it hands off to the bridge).
  const vi = beats.findIndex(b => b.kind === 'verdict');
  if (vi >= 0) beats.push(beats.splice(vi, 1)[0]);
  return beats;
}

/* ── §3.5: async beat queue ─────────────────────────────────────────────
 * for (const beat of timeline) await play(beat); a `_skipped` flag short-circuits
 * to the end-state. Reduced-motion collapses beats to 0ms except three anchors. */
async function runPlayback(container, s, result, generation) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const p1 = s.fieldCards.filter(Boolean);
  const p2 = s.opponentField ?? s.fieldCards;

  setStatus(container, 'Revealing hands…');
  // Reveal flip (staggered), then the effect replay.
  p1.forEach((c, i) => flipCard(container, `rev-your-${i}`, c.cardId));
  p2.forEach((c, i) => flipCard(container, `rev-opp-${i}`, c.cardId));
  if (!reduce && !_skipped) await _sleep(400);
  if (generation !== _generation) return;

  setStatus(container, 'COMBAT');
  const timeline = buildTimeline(result);
  const anchors = new Set(['banner', 'verdict']); // + KO stills handled in the duel beat
  for (const beat of timeline) {
    if (generation !== _generation) return;
    if (_skipped) break;
    play(container, beat, result, p1, p2);
    const dur = reduce && !anchors.has(beat.kind) ? 0 : beat.dur;
    if (dur > 0) await _sleep(dur);
  }

  if (generation !== _generation) return;
  applyEndState(container, result, p1, p2); // idempotent — SKIP lands here directly too
  const winner = result?.winner ?? 'p1';
  setStatus(container, winner === 'p1' ? '◆ YOU WIN' : '◇ OPPONENT WINS');
  const st = container.querySelector('#rev-status');
  if (st) { st.style.fontSize = '24px'; st.style.color = winner === 'p1' ? 'var(--accent-gold)' : 'var(--accent-red)'; }

  await _sleep(_skipped ? 800 : 300); // 800ms verdict still on SKIP
  if (generation !== _generation) return;
  _playbackDone = true;
  maybeStartResolution(container);
}

function play(container, beat, result, p1, p2) {
  const telop = (text, ch = 'combat') => addTelop(container, text, ch);
  const frameOf = (side, id) => {
    const arr = side === 'p1' ? p1 : p2;
    const idx = arr.findIndex(c => c.cardId === id);
    return idx < 0 ? null : container.querySelector(`#rev-${side === 'p1' ? 'your' : 'opp'}-${idx}`);
  };
  const rowFrame = (side, i) => container.querySelector(`#rev-${side === 'p1' ? 'your' : 'opp'}-${i}`);
  const scope = _scope;
  const pulse = (el, cls, ms) => { if (!el) return; el.classList.add(cls); scope.timeout(() => el.classList.remove(cls), ms); };

  switch (beat.kind) {
    case 'banner':
      telop(`${FACTION_NAMES[beat.faction] ?? 'FACTION'} SYNERGY +10%`, beat.side === 'p1' ? 'gold' : 'red');
      pulse(container.querySelector(beat.side === 'p1' ? '#rev-your-row' : '#rev-opp-row'), 'rev-banner', beat.dur);
      sfx(beat.sfx); break;
    case 'crown':
      pulse(frameOf(beat.side, beat.id), 'rev-crown', beat.dur); telop('LEGENDARY', 'gold'); sfx(beat.sfx); break;
    case 'seal-stamp': { const m = beat.e.match(/^(p[12])_void_blocked_(\d+)$/);
      if (m) { pulse(frameOf(m[1], +m[2]), 'rev-sealed', beat.dur); telop('SEALED', 'dim'); } break; }
    case 'buff': pulse(frameOf(beat.side, beat.id), 'rev-buff', beat.dur); telop(`${CARD_NAMES[beat.id]} · CRYSTAL +5 BP`, beat.side === 'p1' ? 'gold' : 'red'); break;
    case 'shield': pulse(frameOf(beat.side, beat.id), 'rev-shield', beat.dur); telop(`${CARD_NAMES[beat.id]} · BARRIER`, beat.side === 'p1' ? 'gold' : 'red'); break;
    case 'ember': pulse(frameOf(beat.side, beat.id), 'rev-ember', beat.dur); telop(`${CARD_NAMES[beat.id]} · FLAME hits ${CARD_NAMES[beat.target]}`, 'red'); sfx(beat.sfx); break;
    case 'gust': pulse(container.querySelector(beat.opp === 'p1' ? '#rev-your-row' : '#rev-opp-row'), 'rev-gust', beat.dur); telop('STORM SWEEP', 'combat'); sfx(beat.sfx); break;
    case 'fade': pulse(frameOf(beat.side, beat.id), 'rev-fade', beat.dur); telop(`${CARD_NAMES[beat.id]} · SHADOW`, 'dim'); break;
    case 'spark': pulse(frameOf(beat.side, beat.id), 'rev-spark', beat.dur); telop(`${CARD_NAMES[beat.id]} · VOID`, 'combat'); break;
    case 'skip': pulse(rowFrame('p1', beat.pair), 'rev-sidestep', beat.dur); pulse(rowFrame('p2', beat.pair), 'rev-sidestep', beat.dur); telop('SKIP', 'dim'); break;
    case 'duel': {
      pulse(rowFrame('p1', beat.pair), 'rev-clash', beat.dur);
      pulse(rowFrame('p2', beat.pair), 'rev-clash', beat.dur);
      const koed = [];
      if (beat.p2?.destroyed) { rowFrame('p2', beat.pair)?.classList.add('rev-card--dead', 'rev-ko'); koed.push('OPP'); }
      if (beat.p1?.destroyed) { rowFrame('p1', beat.pair)?.classList.add('rev-card--dead', 'rev-ko'); koed.push('YOU'); }
      updateBpTotals(container, result);
      telop(koed.length ? `KO — ${koed.join(' & ')}` : `PAIR ${beat.pair + 1}`, koed.length ? 'red' : 'combat');
      sfx(koed.length ? 'sfx-ko' : 'sfx-hit'); break;
    }
    case 'verdict': {
      updateBpTotals(container, result);
      const w = beat.winner === 'p1' ? 'YOU' : 'OPP';
      telop(`${w} WIN — ${beat.p1bp} vs ${beat.p2bp} BP`, beat.winner === 'p1' ? 'gold' : 'red');
      sfx(beat.winner === 'p1' ? 'sfx-victory' : 'sfx-defeat'); break;
    }
    case 'telop': telop(beat.text, 'dim'); break;
  }
}

// SKIP / end: apply every final HP/KO + the final ΣBP tug in one shot.
function applyEndState(container, result, p1, p2) {
  updateBpTotals(container, result);
  const applyCards = (cards, row) => (cards ?? []).forEach((card, index) => {
    const slot = container.querySelector(`#rev-${row}-${index}`);
    if (!slot || !card) return;
    slot.classList.toggle('rev-card--dead', !!card.destroyed);
    const hp = slot.querySelector('.cf-hp .stat-value');
    if (hp && Number.isFinite(card.finalHp)) hp.textContent = String(Math.max(0, card.finalHp));
    const bp = slot.querySelector('.stat-badge:first-child .stat-value');
    if (bp && Number.isFinite(card.finalBp)) bp.textContent = String(card.finalBp);
  });
  applyCards(result?.p1Cards, 'your');
  applyCards(result?.p2Cards, 'opp');
}

function updateBpTotals(container, result) {
  const p1 = container.querySelector('#rev-p1-bp b');
  const p2 = container.querySelector('#rev-p2-bp b');
  if (p1) p1.textContent = result?.p1BpTotal ?? '—';
  if (p2) p2.textContent = result?.p2BpTotal ?? '—';
}

function sfx(id) { if (id) try { window.oxarkAudio?.sfx?.(id); } catch (_) {} }

function setStatus(container, text) {
  const el = container.querySelector('#rev-status');
  if (el) el.textContent = text;
}

// addLog is retained as the TELOP writer (§3.4). Two rolling rows.
function addTelop(container, text, ch = 'combat') {
  const record = container.querySelector('#rev-record');
  if (record) {
    const following = record.scrollHeight - record.scrollTop - record.clientHeight < 48;
    const item = document.createElement('li'); item.className = `record-${ch}`;
    item.textContent = text; record.appendChild(item);
    if (following) record.scrollTop = record.scrollHeight;
  }
  const rows = [container.querySelector('#rev-telop-0'), container.querySelector('#rev-telop-1')];
  if (!rows[0]) return;
  rows[0].textContent = rows[1]?.textContent ?? '';
  rows[0].className = `rev-telop-line ${rows[1]?.dataset.ch ? 'telop-' + rows[1].dataset.ch : ''}`;
  rows[1].textContent = text;
  rows[1].dataset.ch = ch;
  rows[1].className = `rev-telop-line telop-${ch}`;
}

function flipCard(container, id, cardId) {
  const wrap = container.querySelector(`#${id}`);
  if (!wrap) return;
  wrap.classList.add('rev-card--flip');
  _scope.timeout(() => {
    const field = getState()[id.startsWith('rev-your') ? 'fieldCards' : 'opponentField'] ?? [];
    const action = field.find(card => card?.cardId === cardId)?.actionType;
    wrap.innerHTML = CardFrameHTML({ id: cardId }) + `<span class="rev-card-action">${ACTION_LABELS[action] ?? ''}</span>`;
    wrap.classList.remove('rev-card--flip');
  }, 150);
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents(container, generation) {
  // reveal-tx failures surface on the telop; wire the writer so _submitRevealOnChain can use it.
  _uiAddLog = (text, cls) => addTelop(container, text, /error/.test(cls || '') ? 'red' : 'dim');
  container.querySelector('#rev-skip').addEventListener('click', () => {
    if (generation !== _generation || _resolutionAborted || _navigated) return;
    _skipped = true;
    // Let playback apply the computed result before resolving this round.
    container.querySelector('#rev-skip').disabled = true;
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
.rev-root { position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep); display: flex; flex-direction: column; }
.rev-topbar { height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; border-bottom: var(--border-dim); background: rgba(3,6,15,0.75); z-index: 10; }
.rev-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-red); border-color: var(--accent-red); }
.rev-status { font-size: 20px; letter-spacing: 0.06em; transition: color var(--t-slow, 0.5s), font-size var(--t-base, 0.3s); }
.rev-skip-btn { font-size: 14px; padding: 3px 10px; }

.rev-body { flex: 1; display: grid; grid-template-rows: 1fr auto auto 1fr; padding: 8px 12px; gap: 6px; overflow: hidden; }
.rev-opp-field, .rev-your-field { display: flex; flex-direction: column; justify-content: center; gap: 4px; align-items: flex-start; }
.rev-field-head { display: flex; align-items: center; gap: 14px; }
.rev-field-label { font-size: 13px; letter-spacing: 0.1em; }
.rev-bp { font-size: 15px; letter-spacing: 0.06em; color: var(--text-dim); }
.rev-bp b { font-size: 18px; }

.rev-card-row { display: flex; gap: 8px; align-items: center; transition: filter var(--t-base, 0.3s); }
.rev-card-wrap { transition: transform var(--t-base, 0.3s), opacity var(--t-base, 0.3s), filter var(--t-base, 0.3s); }
.rev-card-wrap .card-frame { width: 140px; }
.rev-card--flip { transform: rotateY(90deg); opacity: 0.2; }
.rev-card--dead .card-frame { opacity: 0.3; filter: grayscale(1); }

/* Center duel zone (~1024×200) + 2-row telop */
.rev-stage { min-height: 40px; display: flex; align-items: center; justify-content: center; }
.rev-telop { display: flex; flex-direction: column; gap: 1px; border-top: var(--border-dim); border-bottom: var(--border-dim); padding: 4px 8px; min-height: 40px; }
.rev-telop-line { font-size: 15px; letter-spacing: 0.03em; line-height: 1.4; min-height: 20px; transition: opacity var(--t-base, 0.3s); }
.telop-gold { color: var(--accent-gold); }
.telop-red  { color: var(--accent-red); }
.telop-dim  { color: var(--text-dim); }
.telop-combat { color: var(--accent-blue); }

/* Beat animations (compositor-friendly: transform / opacity / filter) */
@keyframes rev-clash { 0%,100% { transform: scale(1); } 40% { transform: scale(1.1) translateX(4px); } 55% { transform: translateX(-3px); } }
@keyframes rev-ko { 0% { transform: scale(1); } 60% { transform: scale(1.2) rotate(6deg); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.3; } }
@keyframes rev-pop { 0%,100% { filter: none; } 50% { filter: drop-shadow(0 0 8px rgba(201,162,39,0.9)); } }
@keyframes rev-sweep { 0% { filter: none; } 50% { filter: brightness(1.4); } 100% { filter: none; } }
.rev-clash .card-frame { animation: rev-clash 0.5s var(--ease-pop, ease-out); }
.rev-ko .card-frame { animation: rev-ko 0.32s var(--ease-pop, ease-out) forwards; }
.rev-crown .card-frame, .rev-buff .card-frame, .rev-spark .card-frame { animation: rev-pop 0.16s ease-out; }
.rev-shield .card-frame { filter: drop-shadow(0 0 6px rgba(74,144,217,0.8)); }
.rev-ember .card-frame { animation: rev-pop 0.32s ease-out; }
.rev-fade .card-frame { opacity: 0.4; filter: grayscale(0.6); }
.rev-sealed .card-frame { filter: grayscale(1) brightness(0.7); }
.rev-sidestep .card-frame { transform: translateX(6px); }
.rev-banner, .rev-gust { animation: rev-sweep 0.32s ease-out; }

/* Waiting-for-opponent / stall overlay */
.rev-wait { position: absolute; inset: 44px 0 0 0; z-index: 40; display: none; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; background: rgba(3,6,15,0.86); font-family: var(--font-main); }
.rev-wait-msg { font-size: 22px; letter-spacing: 0.12em; color: var(--accent-gold); }
.rev-wait-elapsed { font-size: 32px; color: var(--text-cream); letter-spacing: 0.05em; }
.rev-claim-btn { font-size: 18px; padding: 10px 18px; margin-top: 6px; }
`;
