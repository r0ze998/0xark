// audio.js — tiny SFX layer over vendored ZzFX (F2_SPEC §1.2).
// API: sfx(id) · setMuted(bool) · isMuted() · SFX_IDS.
// - master volume 0.5
// - mute persisted in localStorage 'oxark-muted'
// - AudioContext unlocked on the first pointerdown (browsers block pre-gesture audio)
//
// UNWIRED: nothing calls sfx() yet — call-site wiring lands in PR-K. Not added to
// design-lint enforced symbols until then.
//
// NOTE (manifest): the 12 ids below are the NORMATIVE F2_SPEC §1.2 manifest (r0ze
// ruling R-A — the spec's §2/§3 beat tables cite them literally, so PR-I/J wiring
// depends on these exact ids). The PARAM arrays are still DRAFT presets — reconcile
// against §1.2's character column and let r0ze ear-check/tune before PR-K.
import { zzfx, zzfxContext, setMasterVolume } from '../vendor/zzfx.js';

const MUTE_KEY = 'oxark-muted';
const MASTER_VOLUME = 0.5;
setMasterVolume(MASTER_VOLUME);

// ZzFX param order: [volume, randomness, frequency, attack, sustain, release,
//   shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime,
//   noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
// Trailing params may be omitted. DRAFT — tune by ear.
// F2_SPEC §1.2 manifest — 12 normative ids (order per the spec list). Params DRAFT.
// Provenance of each preset noted (renamed/kept from A1, or new draft this pass).
export const SFX = {
  'sfx-ui-confirm': [0.4, 0, 150, 0, 0.01, 0.03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4],        // was click
  'sfx-ui-cancel':  [0.4, 0, 200, 0, 0.01, 0.05, 0, 1, 0, -3, 0, 0, 0, 0, 0, 0, 0, 0.4],       // NEW: soft descending back
  'sfx-flip':       [0.5, 0.1, 500, 0, 0.03, 0.06, 0, 1, 0, 4, 0, 0, 0, 0.1, 0, 0, 0, 0.5],    // NEW: card swish
  'sfx-lock':       [0.8, 0.02, 300, 0.02, 0.10, 0.16, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.05], // was commit (SEAL)
  'sfx-crack':      [0.6, 0, 420, 0, 0.04, 0.09, 0, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0.5],        // was reveal (chest crack)
  'sfx-hit':        [0.7, 0.05, 160, 0, 0.04, 0.10, 1, 1, 0, -2, 0, 0, 0, 0.05, 0, 0, 0, 0.4], // NEW: combat hit
  'sfx-ko':         [0.9, 0.1, 90, 0, 0.06, 0.18, 4, 1, 0, -2, 0, 0, 0, 0.2, 0, 0, 0, 0.4, 0.6], // NEW: knockout thud
  'sfx-victory':    [0.9, 0, 523, 0.02, 0.14, 0.26, 0, 1, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0.7, 0.05], // was win
  'sfx-defeat':     [0.8, 0, 196, 0.02, 0.18, 0.30, 1, 1, 0, -4, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.1],  // was lose
  'sfx-legendary':  [0.9, 0, 660, 0.02, 0.20, 0.35, 0, 1, 0, 0, 12, 0.05, 0, 0, 0, 0, 0, 0.7, 0.05], // NEW: bright rising sparkle
  'sfx-engrave':    [0.8, 0.03, 240, 0.05, 0.22, 0.36, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.1],   // kept (chisel carve)
  'sfx-promote':    [0.9, 0, 392, 0.03, 0.18, 0.30, 0, 1, 0, 0, 9, 0.06, 0, 0, 0, 0, 0, 0.7, 0.05],  // kept (tier-up rise)
};
export const SFX_IDS = Object.keys(SFX); // 12 (F2_SPEC §1.2)
// DROPPED from A1 (not in the manifest; may return later): peek, bridge, burn, refill, error.

let _muted = false;
try { _muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { /* storage blocked */ }

// First-gesture unlock: resume the (suspended) AudioContext once the user interacts.
if (typeof window !== 'undefined') {
  const unlock = () => {
    try { zzfxContext().resume(); } catch (_) { /* not created yet — fine */ }
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
}

export function sfx(id) {
  if (_muted) return;
  const params = SFX[id];
  if (!params) { console.warn('[audio] unknown sfx id:', id); return; }
  try { zzfx(...params); } catch (e) { console.warn('[audio] play failed:', e?.message ?? e); }
}

export function setMuted(m) {
  _muted = !!m;
  try { localStorage.setItem(MUTE_KEY, _muted ? '1' : '0'); } catch (_) { /* ignore */ }
}

export function isMuted() { return _muted; }
