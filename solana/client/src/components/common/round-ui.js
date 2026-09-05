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
  if (document.getElementById('style-round-ui')) return;
  const el = document.createElement('style');
  el.id = 'style-round-ui';
  el.textContent = CSS;
  document.head.appendChild(el);
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

const CSS = `
.round-hud {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-main); white-space: nowrap;
}
.round-hud-label { font-size: 14px; letter-spacing: 0.1em; color: var(--text-cream); }
.round-hud--lg .round-hud-label { font-size: 20px; }
.round-hud-pips { display: inline-flex; gap: 4px; align-items: center; }
.rpip { width: 9px; height: 9px; border-radius: 50%; display: inline-block; box-sizing: border-box; }
.round-hud--lg .rpip { width: 13px; height: 13px; }
.rpip--mine    { background: var(--accent-gold); box-shadow: 0 0 4px rgba(201,162,39,0.6); }
.rpip--opp     { background: var(--accent-red);  box-shadow: 0 0 4px rgba(214,59,59,0.6); }
.rpip--pending { background: transparent; border: 1px solid var(--text-dim); }

/* Between-round bridge overlay */
.round-bridge {
  position: absolute; inset: 0; width: 1024px; height: 576px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 42%, rgba(10,14,26,0.94), rgba(3,6,15,0.98));
  z-index: 50; cursor: pointer; font-family: var(--font-main);
  animation: bridge-in 220ms var(--ease-out, ease-out);
}
@keyframes bridge-in { from { opacity: 0; } to { opacity: 1; } }
.bridge-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.bridge-round { font-size: 16px; letter-spacing: 0.24em; color: var(--text-dim); }
.bridge-headline {
  font-size: 48px; letter-spacing: 0.06em; line-height: 1;
  text-shadow: 0 2px 0 rgba(0,0,0,0.6);
}
.bridge--win  .bridge-headline { color: var(--accent-gold); }
.bridge--loss .bridge-headline { color: var(--accent-red); }
.bridge--draw .bridge-headline { color: var(--text-cream); }
.bridge-score { font-size: 40px; color: var(--text-cream); letter-spacing: 0.08em; }
.bridge-dash { color: var(--text-dim); padding: 0 6px; }
.bridge-pips { display: inline-flex; gap: 7px; margin-top: 2px; }
.bridge-pips .rpip { width: 15px; height: 15px; }
.bridge-skip { font-size: 13px; color: var(--text-dim); letter-spacing: 0.14em; margin-top: 14px; }
`;
