// energy-hud.js — shared energy display + refill (spec F1-3, DESIGN.md energy-pips).
// 5 px-bolt pips + n/5 + a live "next energy in H:MM:SS" countdown. The chain is
// authoritative at spend time; this is a display projection off the last regen
// anchor. Mounted on home / vault topbar / battle lobby / preparation.
//
// mirror of constants.rs (solana/oxark/programs/oxark/src/constants.rs):
//   ENERGY_MAX, ENERGY_REGEN_INTERVAL_SECONDS, ENERGY_REFILL_COST_LAMPORTS
import { pxIcon } from '../../lib/px-icons.js';
import { showToast, txLink } from '../../lib/ui-shared.js';

export const ENERGY_MAX = 5;
export const ENERGY_REGEN_SECS = 4 * 60 * 60;    // 4h
export const ENERGY_REFILL_COST_SOL = 0.003;     // 3_000_000 lamports

// Client projection (spec §1.2). `nowSecs` = unix seconds.
export function computeEnergy(ps, nowSecs = Math.floor(Date.now() / 1000)) {
  const base = ps?.energy ?? 0;
  const ts   = ps?.energyLastTs ?? nowSecs;
  const elapsed = Math.max(0, nowSecs - ts);
  const energyNow = Math.min(ENERGY_MAX, base + Math.floor(elapsed / ENERGY_REGEN_SECS));
  const nextPipInSecs = energyNow >= ENERGY_MAX ? null : ENERGY_REGEN_SECS - (elapsed % ENERGY_REGEN_SECS);
  return { energyNow, nextPipInSecs, max: ENERGY_MAX };
}

function fmtCountdown(secs) {
  if (secs == null) return 'FULL';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function pipsHTML(energyNow) {
  let out = '';
  for (let i = 0; i < ENERGY_MAX; i++) {
    out += `<span class="ep ${i < energyNow ? 'ep--on' : 'ep--off'}">${pxIcon('bolt', { size: 14 })}</span>`;
  }
  return out;
}

function _innerHTML(ps, refill) {
  const { energyNow, nextPipInSecs } = computeEnergy(ps);
  const clickable = refill && energyNow < ENERGY_MAX;
  return `
    <span class="energy-pips" ${clickable ? 'data-energy-open="1" role="button" tabindex="0" aria-label="Refill energy"' : ''}>${pipsHTML(energyNow)}</span>
    <span class="energy-count">${energyNow}/${ENERGY_MAX}</span>
    <span class="energy-next label-dim">next ${pxIcon('bolt', { size: 11 })} in ${fmtCountdown(nextPipInSecs)}</span>`;
}

// Static markup for a mount point. Caller injects this, then calls attachEnergyHud
// on the same container to wire the live tick + optional refill.
export function EnergyHudHTML(ps, { refill = false, cls = '' } = {}) {
  return `<div class="energy-hud ${cls}" data-energy-hud data-refill="${refill ? 1 : 0}">${_innerHTML(ps, refill)}</div>`;
}

// Wire the live countdown + (optional) refill popover. Self-cleaning: stops when
// the node leaves the DOM. Returns a disposer for explicit unmount. onRefill(sig)
// is called after a confirmed refill so the caller can re-fetch fresh state.
export function attachEnergyHud(container, { playerState, refill = false, onRefill } = {}) {
  const hud = container.querySelector('[data-energy-hud]');
  if (!hud) return () => {};
  let ps = playerState;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    if (!document.body.contains(hud)) { stop(); return; }
    // preserve an open refill popover across ticks
    if (hud.querySelector('.energy-refill')) return;
    hud.innerHTML = _innerHTML(ps, refill);
  };
  const tick = setInterval(render, 1000);
  render();

  if (refill) {
    hud.addEventListener('click', async (e) => {
      const openEl = e.target.closest('[data-energy-open]');
      const doBtn  = e.target.closest('[data-energy-do]');
      const cancel = e.target.closest('[data-energy-cancel]');
      if (cancel) { render(); return; }
      if (openEl && !hud.querySelector('.energy-refill')) { _openRefill(hud); return; }
      if (doBtn) {
        const sig = await _doRefill(hud, doBtn);
        if (sig) {
          // optimistic: full now, anchor to now
          ps = { ...(ps ?? {}), energy: ENERGY_MAX, energyLastTs: Math.floor(Date.now() / 1000) };
          render();
          onRefill?.(sig);
        }
      }
    });
  }

  function stop() { stopped = true; clearInterval(tick); }
  return stop;
}

function _openRefill(hud) {
  const pop = document.createElement('div');
  pop.className = 'energy-refill';
  pop.innerHTML = `
    <div class="energy-refill-title">REFILL TO ${ENERGY_MAX}</div>
    <div class="energy-refill-cost label-dim">${ENERGY_REFILL_COST_SOL} SOL</div>
    <div class="energy-refill-actions">
      <button class="gba-btn gba-btn--primary" data-energy-do="1">${pxIcon('bolt')} REFILL</button>
      <button class="gba-btn gba-btn--ghost" data-energy-cancel="1">CANCEL</button>
    </div>`;
  hud.appendChild(pop);
}

async function _doRefill(hud, btn) {
  btn.disabled = true;
  btn.innerHTML = 'REFILLING…';
  try {
    if (typeof window.oxarkOnchain?.refillEnergy !== 'function') throw new Error('refill unavailable');
    const sig = await window.oxarkOnchain.refillEnergy();
    const pips = hud.querySelector('.energy-pips');
    if (pips) pips.classList.add('energy-pips--sweep');
    const t = showToast('Energy refilled', 'success');
    try { t.innerHTML = `${pxIcon('bolt')} Energy refilled ${txLink(sig)}`; } catch (_) {}
    return sig;
  } catch (err) {
    const msg = err?.message ?? String(err);
    showToast(/insufficient/i.test(msg) ? 'Not enough SOL for refill' : `Refill failed: ${msg.slice(0, 50)}`, 'error');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('bolt')} REFILL`;
    return null;
  }
}

export function injectEnergyCss() {
  if (document.getElementById('style-energy-hud')) return;
  const el = document.createElement('style');
  el.id = 'style-energy-hud';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.energy-hud {
  position: relative; display: inline-flex; align-items: center; gap: 7px;
  font-family: var(--font-main); white-space: nowrap;
}
.energy-pips { display: inline-flex; gap: 2px; align-items: center; }
.energy-pips[data-energy-open] { cursor: pointer; }
.ep { line-height: 0; display: inline-flex; }
.ep--on  { color: var(--accent-gold); }
.ep--off { color: var(--text-dim); opacity: 0.4; }
.energy-count { font-size: 14px; color: var(--text-cream); letter-spacing: 0.04em; }
.energy-next { font-size: 13px; display: inline-flex; align-items: center; gap: 3px; }
.energy-pips--sweep .ep--on { animation: energy-sweep 480ms var(--ease-out, ease-out) both; }
.energy-pips--sweep .ep:nth-child(1){animation-delay:0ms}
.energy-pips--sweep .ep:nth-child(2){animation-delay:80ms}
.energy-pips--sweep .ep:nth-child(3){animation-delay:160ms}
.energy-pips--sweep .ep:nth-child(4){animation-delay:240ms}
.energy-pips--sweep .ep:nth-child(5){animation-delay:320ms}
@keyframes energy-sweep { from { transform: scale(0.4); opacity: 0.2; } to { transform: none; opacity: 1; } }

.energy-refill {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
  background: var(--bg-mid); border: var(--border-dim);
  padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; min-width: 150px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.5);
}
.energy-refill-title { font-size: 14px; letter-spacing: 0.08em; color: var(--accent-gold); }
.energy-refill-cost { font-size: 13px; }
.energy-refill-actions { display: flex; gap: 5px; }
.energy-refill-actions .gba-btn { font-size: 13px; padding: 5px 8px; flex: 1; justify-content: center; }
`;
