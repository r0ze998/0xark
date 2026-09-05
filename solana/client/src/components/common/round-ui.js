import { injectStyle } from '../../lib/inject-style.js';
import { ROUND_UI_CSS } from '../../style/round-ui.js';
// round-ui.js — shared round HUD + round-bridge overlay (DESIGN.md round-pips).
// One source of truth for "which round / what's the score" chrome, mounted on
// preparation / intel / reveal headers and shown large on the between-round
// bridge. Pips are CSS-drawn discs (not unicode ○/● — those trip the emoji lint
// and render off-palette). Colors come from tokens.css.

import { getState } from '../../state/battle-state.js';

const WIN_TARGET = 3;   // 5-round best-of: first to 3 round wins (spec §2.7)
const MAX_ROUNDS = 5;
const BRIDGE_MS  = 1600; // auto-advance; tap to skip

// Map the on-chain p1/p2 tally to my-side. player1 === myPubkey in real mode is
// captured as duelP1IsMe by the resolver; before the first advanceRound it is
// null, so fall back to isHost (host inits the duel as player1).
export function roundWinsFor(s = getState()) {
  const p1IsMe = s.duelP1IsMe ?? s.isHost ?? true;
  const my  = p1IsMe ? (s.p1RoundWins ?? 0) : (s.p2RoundWins ?? 0);
  const opp = p1IsMe ? (s.p2RoundWins ?? 0) : (s.p1RoundWins ?? 0);
  return { my, opp };
}

function pipsHTML(my, opp) {
  const mine = Math.max(0, Math.min(WIN_TARGET, my));
  const theirs = Math.max(0, Math.min(WIN_TARGET, opp));
  const pending = Math.max(0, MAX_ROUNDS - mine - theirs);
  const cells = [];
  for (let i = 0; i < mine; i++)    cells.push('<span class="rpip rpip--mine"></span>');
  for (let i = 0; i < theirs; i++)  cells.push('<span class="rpip rpip--opp"></span>');
  for (let i = 0; i < pending; i++) cells.push('<span class="rpip rpip--pending"></span>');
  return cells.join('');
}

// Compact header fragment for topbars. `size` = 'sm' (default) | 'lg'.
export function RoundHudHTML(s = getState(), { size = 'sm' } = {}) {
  const { my, opp } = roundWinsFor(s);
  const round = s.round ?? 1;
  return `<div class="round-hud round-hud--${size}" role="status" aria-label="Round ${round} of ${MAX_ROUNDS}, you ${my} opponent ${opp}">
    <span class="round-hud-label">ROUND ${round}/${MAX_ROUNDS}</span>
    <span class="round-hud-pips">${pipsHTML(my, opp)}</span>
  </div>`;
}

export function injectRoundUiCSS() {
  injectStyle('style-round-ui', ROUND_UI_CSS);
}

// showRoundBridge — lightweight overlay shown between rounds (spec §2.6). Not a
// routed screen. Auto-advances after BRIDGE_MS; tap anywhere to skip. Calls
// onDone exactly once. Returns a disposer that removes the overlay early.
export function showRoundBridge(container, { round, myWins, oppWins, outcome, onDone }) {
  injectRoundUiCSS();
  const headline = outcome === 'win'  ? 'The round is yours.'
                 : outcome === 'loss' ? 'Their move prevailed.'
                 : 'An even match.';
  const cls = outcome === 'win' ? 'bridge--win' : outcome === 'loss' ? 'bridge--loss' : 'bridge--draw';
  const overlay = document.createElement('div');
  overlay.className = `round-bridge ${cls}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `Round ${round} result: ${headline}`);
  overlay.innerHTML = `
    <div class="bridge-inner">
      <div class="bridge-round">ROUND ${round}</div>
      <div class="bridge-headline">${headline}</div>
      <div class="bridge-score">${myWins} <span class="bridge-dash">–</span> ${oppWins}</div>
      <div class="bridge-pips">${pipsHTML(myWins, oppWins)}</div>
      <button type="button" class="gba-btn gba-btn--ghost bridge-skip">Build the next hand →</button>
    </div>`;

  let done = false;
  let timer = null;
  const dispose = () => {
    done = true;
    if (timer) { clearTimeout(timer); timer = null; }
    overlay.removeEventListener('click', finish);
    overlay.remove();
  };
  const finish = () => {
    if (done) return;
    dispose();
    onDone?.();
  };
  overlay.addEventListener('click', finish);
  (container ?? document.body).appendChild(overlay);
  overlay.querySelector('button')?.focus();
  if (!window.oxarkPreview) timer = setTimeout(finish, BRIDGE_MS);
  return dispose;
}
