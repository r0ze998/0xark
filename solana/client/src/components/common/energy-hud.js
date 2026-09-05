// Shared energy display + confirmed refill (F1-3, DESIGN.md energy-pips).
// Constants mirror programs/oxark/src/constants.rs. The chain is authoritative
// at spend time; countdowns project from the last known regeneration anchor.
import { pxIcon } from '../../lib/px-icons.js';
import { showToast, txLink } from '../../lib/ui-shared.js';

export const ENERGY_MAX = 5;
export const ENERGY_REGEN_SECS = 4 * 60 * 60;
export const ENERGY_REFILL_COST_SOL = 0.003;

// Keep missing account data distinct from a known, empty energy balance.
export function computeEnergy(ps, nowSecs = Math.floor(Date.now() / 1000)) {
  if (!Number.isInteger(ps?.energy) || ps.energy < 0 || ps.energy > ENERGY_MAX
    || !Number.isFinite(ps?.energyLastTs) || ps.energyLastTs < 0) {
    return { energyNow: null, nextPipInSecs: null, max: ENERGY_MAX };
  }
  const elapsed = Math.max(0, nowSecs - ps.energyLastTs);
  const energyNow = Math.min(ENERGY_MAX, ps.energy + Math.floor(elapsed / ENERGY_REGEN_SECS));
  const nextPipInSecs = energyNow >= ENERGY_MAX ? null : ENERGY_REGEN_SECS - (elapsed % ENERGY_REGEN_SECS);
  return { energyNow, nextPipInSecs, max: ENERGY_MAX };
}

function fmtCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function nextLabel(energyNow, nextPipInSecs) {
  return energyNow == null ? 'ENERGY UNKNOWN'
    : nextPipInSecs == null ? 'FULL' : `Next in ${fmtCountdown(nextPipInSecs)}`;
}

function pipsHTML(energyNow) {
  return Array.from({ length: ENERGY_MAX }, (_, i) =>
    `<span aria-hidden="true" class="ep ${energyNow != null && i < energyNow ? 'ep--on' : 'ep--off'}">${pxIcon('bolt', { size: 16 })}</span>`).join('');
}

function _innerHTML(ps, refill) {
  const { energyNow, nextPipInSecs } = computeEnergy(ps);
  const canRefill = energyNow != null && energyNow < ENERGY_MAX;
  const pips = pipsHTML(energyNow);
  return `
    ${refill ? `<button type="button" class="energy-pips" data-energy-open="1" aria-label="Refill energy for ${ENERGY_REFILL_COST_SOL} SOL" aria-expanded="false" ${canRefill ? '' : 'disabled'}>${pips}</button>`
      : `<span class="energy-pips">${pips}</span>`}
    <span class="energy-count">${energyNow ?? '—'}/${ENERGY_MAX}</span>
    <span class="energy-next label-dim" aria-live="polite">${nextLabel(energyNow, nextPipInSecs)}</span>`;
}

// Caller injects this mount point, then calls attachEnergyHud on its container.
export function EnergyHudHTML(ps, { refill = false, cls = '' } = {}) {
  return `<div class="energy-hud ${cls}" data-energy-hud data-refill="${refill ? 1 : 0}">${_innerHTML(ps, refill)}</div>`;
}

// Stop automatically on unmount, or explicitly through the returned disposer.
export function attachEnergyHud(container, { playerState, refill = false, onRefill, onChange } = {}) {
  const hud = container.querySelector('[data-energy-hud]');
  if (!hud) return () => {};
  let ps = playerState;
  let stopped = false;
  let pending = false;
  let popup = null;
  let tick;
  let previousEnergy;
  // Mount once. Tick updates below preserve keyboard focus and event targets.
  hud.innerHTML = _innerHTML(ps, refill);
  const trigger = hud.querySelector('[data-energy-open]');
  const count = hud.querySelector('.energy-count');
  const next = hud.querySelector('.energy-next');
  const pips = hud.querySelectorAll('.ep');

  const render = () => {
    if (stopped) return;
    if (!document.body.contains(hud)) { stop(); return; }
    const { energyNow, nextPipInSecs } = computeEnergy(ps);
    const countText = `${energyNow ?? '—'}/${ENERGY_MAX}`;
    const nextText = nextLabel(energyNow, nextPipInSecs);
    if (count.textContent !== countText) count.textContent = countText;
    if (next.textContent !== nextText) next.textContent = nextText;
    pips.forEach((pip, i) => {
      pip.className = `ep ${energyNow != null && i < energyNow ? 'ep--on' : 'ep--off'}`;
    });
    const unavailable = energyNow == null || energyNow >= ENERGY_MAX;
    if (trigger) trigger.disabled = pending || unavailable;
    const confirm = popup?.querySelector('[data-energy-do]');
    if (confirm) confirm.disabled = pending || unavailable;
    if (energyNow !== previousEnergy) {
      previousEnergy = energyNow;
      onChange?.(energyNow);
    }
  };

  function closePopup({ restoreFocus = true } = {}) {
    popup?.remove();
    popup = null;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger) {
      if (!trigger.disabled) trigger.focus();
      else { count.setAttribute('tabindex', '-1'); count.focus(); }
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && popup && !pending) {
      event.preventDefault();
      event.stopPropagation();
      closePopup();
    }
  }

  async function onClick(event) {
    if (stopped || pending) return;
    if (event.target.closest('[data-energy-cancel]')) { closePopup(); return; }
    const { energyNow } = computeEnergy(ps);
    if (energyNow == null || energyNow >= ENERGY_MAX) return;
    if (event.target.closest('[data-energy-open]') && !popup) {
      popup = _openRefill(hud);
      trigger.setAttribute('aria-expanded', 'true');
      popup.querySelector('[data-energy-do]').focus();
      return;
    }
    if (!event.target.closest('[data-energy-do]') || !popup) return;
    pending = true;
    const confirm = popup.querySelector('[data-energy-do]');
    const cancel = popup.querySelector('[data-energy-cancel]');
    const status = popup.querySelector('[data-energy-status]');
    confirm.disabled = true;
    cancel.disabled = true;
    confirm.textContent = 'REFILLING…';
    status.textContent = 'Waiting for transaction confirmation…';
    popup.setAttribute('aria-busy', 'true');
    render();
    let sig;
    try {
      if (typeof window.oxarkOnchain?.refillEnergy !== 'function') throw new Error('refill unavailable');
      sig = await window.oxarkOnchain.refillEnergy();
      if (typeof sig !== 'string' || !sig.trim()) throw new Error('no transaction confirmation received');
    } catch (err) {
      if (stopped || !document.body.contains(hud)) { stop(); return; }
      const msg = err?.message ?? String(err);
      status.textContent = /insufficient/i.test(msg) ? 'Not enough SOL for refill.' : `Refill failed: ${msg.slice(0, 100)}`;
      pending = false;
      popup.removeAttribute('aria-busy');
      cancel.disabled = false;
      confirm.innerHTML = `${pxIcon('bolt')} REFILL`;
      render();
      confirm.focus();
      return;
    }
    if (stopped || !document.body.contains(hud)) { stop(); return; }
    // refillEnergy resolves after confirmation; never change the projection
    // while a signature request or transaction is still pending.
    ps = { ...ps, energy: ENERGY_MAX, energyLastTs: Math.floor(Date.now() / 1000) };
    pending = false;
    closePopup({ restoreFocus: false });
    render();
    // The now-full trigger is disabled; preserve a focus destination instead.
    count.setAttribute('tabindex', '-1');
    count.focus();
    const toast = showToast('Energy refilled', 'success');
    toast.innerHTML = `${pxIcon('bolt')} Energy refilled ${txLink(sig)}`;
    onRefill?.(sig);
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(tick);
    hud.removeEventListener('click', onClick);
    hud.removeEventListener('keydown', onKeydown);
    closePopup({ restoreFocus: false });
  }

  if (refill) {
    hud.addEventListener('click', onClick);
    hud.addEventListener('keydown', onKeydown);
  }
  tick = setInterval(render, 1000);
  render();
  return stop;
}

function _openRefill(hud) {
  const pop = document.createElement('div');
  pop.className = 'energy-refill';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Refill energy');
  pop.innerHTML = `
    <div class="energy-refill-title">REFILL TO ${ENERGY_MAX}</div>
    <div class="energy-refill-cost">${ENERGY_REFILL_COST_SOL} SOL + network fee</div>
    <div class="energy-refill-actions">
      <button type="button" class="gba-btn gba-btn--primary" data-energy-do="1">${pxIcon('bolt')} REFILL</button>
      <button type="button" class="gba-btn gba-btn--ghost" data-energy-cancel="1">CANCEL</button>
    </div>
    <div class="energy-refill-status" data-energy-status role="status"></div>`;
  hud.appendChild(pop);
  return pop;
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
  position: relative; display: inline-flex; align-items: center; gap: var(--sp-2);
  font-family: var(--font-main); white-space: nowrap;
}
.energy-pips { display: inline-flex; gap: 2px; align-items: center; }
button.energy-pips {
  appearance: none; background: transparent; border: 1px solid transparent;
  padding: var(--sp-1); font: inherit; border-radius: 0; cursor: pointer;
}
button.energy-pips:hover:not(:disabled) { border-color: var(--accent-gold); }
button.energy-pips:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
button.energy-pips:disabled { cursor: default; }
.ep { line-height: 0; display: inline-flex; }
.ep--on { color: var(--accent-gold); }
.ep--off { color: var(--accent-gold); opacity: 0.25; }
.energy-count { font-size: var(--fs-ui); color: var(--text-cream); letter-spacing: var(--ls-caption); }
.energy-next { font-size: var(--fs-caption); }
.energy-refill {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: var(--z-dialog);
  background: var(--bg-panel); border: var(--border-gold);
  padding: var(--sp-3) var(--sp-4); display: flex; flex-direction: column;
  gap: var(--sp-2); width: 240px; white-space: normal;
}
.energy-refill-title { font-size: var(--fs-ui); letter-spacing: var(--ls-wide); color: var(--accent-gold); }
.energy-refill-cost { font-size: var(--fs-ui); color: var(--text-cream); }
.energy-refill-status { font-size: var(--fs-caption); color: var(--text-cream); }
.energy-refill-status:empty { display: none; }
.energy-refill-actions { display: flex; gap: var(--sp-2); }
.energy-refill-actions .gba-btn { font-size: var(--fs-ui); padding: var(--sp-1) var(--sp-2); flex: 1; justify-content: center; }
.energy-refill-actions .gba-btn:disabled { opacity: 0.45; cursor: default; }
`;
