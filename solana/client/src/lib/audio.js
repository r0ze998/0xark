// audio.js — tiny SFX layer over vendored ZzFX (F2_SPEC §1.2).
// API: sfx(id) · setMuted(bool) · isMuted() · SFX_IDS.
// - master volume 0.5
// - mute persisted in localStorage 'oxark-muted'
// - AudioContext unlocked on the first pointerdown (browsers block pre-gesture audio)
//
// UNWIRED: nothing calls sfx() yet — call-site wiring lands in PR-K. Not added to
// design-lint enforced symbols until then.
//
// NOTE (manifest provenance): F2_SPEC was NOT found in the repo or uploads, so the 12
// ids below are INFERRED from the game's actual events, and their params are DRAFT
// presets. Reconcile the id list against F2_SPEC §1.2 and let r0ze ear-check/tune
// before PR-K. The vendored ZzFX itself is a re-implementation pending byte-verify
// (see src/vendor/zzfx.js header).
import { zzfx, zzfxContext, setMasterVolume } from '../vendor/zzfx.js';

const MUTE_KEY = 'oxark-muted';
const MASTER_VOLUME = 0.5;
setMasterVolume(MASTER_VOLUME);

// ZzFX param order: [volume, randomness, frequency, attack, sustain, release,
//   shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime,
//   noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
// Trailing params may be omitted. DRAFT — tune by ear.
export const SFX = {
  click:   [0.4, 0, 150, 0, 0.01, 0.03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4],       // UI tap
  commit:  [0.8, 0.02, 300, 0.02, 0.10, 0.16, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.05], // SEAL hand
  peek:    [0.6, 0.05, 620, 0, 0.06, 0.12, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6],    // INTEL peek chirp
  reveal:  [0.6, 0, 420, 0, 0.04, 0.09, 0, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0.5],       // card flip
  win:     [0.9, 0, 523, 0.02, 0.14, 0.26, 0, 1, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0.7, 0.05], // round/duel win
  lose:    [0.8, 0, 196, 0.02, 0.18, 0.30, 1, 1, 0, -4, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.1],  // loss, descending
  bridge:  [0.6, 0, 700, 0, 0.05, 0.12, 0, 1, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0.5],       // round transition sweep
  promote: [0.9, 0, 392, 0.03, 0.18, 0.30, 0, 1, 0, 0, 9, 0.06, 0, 0, 0, 0, 0, 0.7, 0.05], // tier-up rise
  engrave: [0.8, 0.03, 240, 0.05, 0.22, 0.36, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.1],  // chisel carve
  burn:    [0.7, 0.2, 130, 0, 0.10, 0.22, 4, 1, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0.4, 0.5],    // noisy fire
  refill:  [0.7, 0, 300, 0, 0.10, 0.16, 0, 1, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0.1],     // energy charge-up
  error:   [0.6, 0, 110, 0.01, 0.05, 0.09, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4],    // blocked/invalid buzz
};
export const SFX_IDS = Object.keys(SFX); // 12

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
