// 10-input.js — input handlers (v2 DOM-based)
// DOM scenes handle their own input via event listeners in scenes/*.js
// This file: duel canvas key/click/wheel handlers only

// ── Battle quip arrays (used by duel battle logic) ───────────────────────
const _VEGA_WIN=['Mine now.','As expected.','Collect the spoils.','The ARK rewards the strong.','Don\'t beg. It\'s beneath you.'];
const _MIRA_WIN=['Outcome nominal.','Your card is now an asset.','Transfer complete. As computed.','Data confirms: you are suboptimal.','Deviation corrected.'];
const _VEGA_KO=['You cheated.','This isn\'t over.','The ARK will remember this.','I underestimated you. Once.','Take them. You\'ve earned nothing yet.'];
const _MIRA_KO=['Recalculating...','Model error. Noted.','This outcome was <1% probability.','You disrupted the variable. Impressive.','Retreat. New strategy required.'];
const _VEGA_WIN_STEAL=['Your cards were never yours.','Hunters take what they want.','Hesitation is a gift to me.'];
const _VEGA_WIN_BARRIERBRK=['Your shield was paper.','Barriers mean nothing to me.','Defense is just a slower loss.'];
const _MIRA_WIN_DOMINATED=['Outcome: decisive. Next.','Your hand was statistically inferior.','The gap was too large to overcome.'];
const _MIRA_WIN_CLOSE=['Closer than projected. Noted.','Margin: 0.3 rounds. You improved.','Near-optimal play. Still insufficient.'];

function _pickDefeatContext(q, winnerIdx) {
  if (!q || !q.length) return null;
  let rivalSteals = 0, playerBarrierBroken = false, playerStole = false;
  for (let _qi = 0; _qi < q.length; _qi++) {
    const ev = q[_qi];
    if (ev.effect === 'steal_get' && ev.who !== 'You') rivalSteals++;
    if (ev.effect === 'barrier_break' && ev.who === 'You') playerBarrierBroken = true;
    if (ev.effect === 'steal_get' && ev.who === 'You') playerStole = true;
  }
  const pool = winnerIdx === 1 ? _VEGA_WIN : _MIRA_WIN;
  if (winnerIdx === 1) {
    if (rivalSteals >= 2) return _VEGA_WIN_STEAL[Math.floor(Math.random() * _VEGA_WIN_STEAL.length)];
    if (playerBarrierBroken) return _VEGA_WIN_BARRIERBRK[Math.floor(Math.random() * _VEGA_WIN_BARRIERBRK.length)];
  } else {
    if (rivalSteals >= 2) return _MIRA_WIN_DOMINATED[Math.floor(Math.random() * _MIRA_WIN_DOMINATED.length)];
    if (playerStole) return _MIRA_WIN_CLOSE[Math.floor(Math.random() * _MIRA_WIN_CLOSE.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Held-key tracking (used by duel input; harmless in DOM scenes) ────────
const keysHeld = new Set();
let _lastDirCode = '';
document.addEventListener('keydown', e => {
  keysHeld.add(e.code);
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') _lastDirCode = e.code;
});
document.addEventListener('keyup', e => { keysHeld.delete(e.code); });

// ── Global Escape → back navigation for DOM scenes ────────────────────────
document.addEventListener('keydown', e => {
  if (e.code !== 'Escape') return;
  if (typeof sc !== 'undefined' && (sc === 'duel' || sc === 'duel_victory')) return;
  const backBtn = document.querySelector('.scene.active [data-back]');
  if (backBtn) backBtn.click();
});

// ── Legacy scene navigation stubs (Phase C callers removed) ──────────────
function ss(s) {}
function ub() {}

// ── Canvas click handler (duel + card-storage scenes) ────────────────────
document.addEventListener('click', e => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = (typeof W !== 'undefined' ? W : 480) / rect.width;
  const scaleY = (typeof H !== 'undefined' ? H : 270) / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;

  if (typeof sc !== 'undefined' && sc === 'duel' && typeof handleDuelInput === 'function') {
    handleDuelInput(px, py);
    return;
  }
  if (typeof sc !== 'undefined' && sc === 'duel_victory' && typeof handleVictoryInput === 'function') {
    handleVictoryInput(px, py);
    return;
  }
  if (typeof sc !== 'undefined' && sc === 'card_detail' && typeof handleCardDetailInput === 'function') {
    handleCardDetailInput(px, py);
    return;
  }
  if (typeof sc !== 'undefined' && sc === 'card_storage' && typeof handleCardStorageInput === 'function') {
    handleCardStorageInput(px, py);
    return;
  }
});

// ── Duel scene keydown handler ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (typeof sc !== 'undefined' && sc === 'duel' && typeof handleDuelKey === 'function') {
    handleDuelKey(e.code);
  }
}, { capture: false });

// ── Card Storage scroll ───────────────────────────────────────────────────
document.addEventListener('wheel', e => {
  if (typeof sc !== 'undefined' && sc === 'card_storage' && typeof cardStorageScroll === 'function') {
    e.preventDefault();
    cardStorageScroll(e.deltaY * 0.4);
  }
}, { passive: false });
