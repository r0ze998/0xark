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

// ZzFX v1.3.2 param order: [vol, rand, freq, attack, sustain, release, shape(0sin/
//   1tri/2saw/3tan/4noise), shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
//   repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo].
//   Trailing params may be omitted.
//
// F2_SPEC §1.2 manifest — 12 normative ids (order per the spec list). Params are
// tuned to §1.2's character column but stay DRAFT for voicing: r0ze's ear-check
// gates PR-K, not this pass. Claude/cc verify code-level only (arity/ranges/engine).
//
// Each entry is EITHER a single ZzFX params array (one bent note) OR a MELODY: an
// array of { t, params } steps (t = ms offset), scheduled by sfx() below. The three
// melodic ids use the step form so they are true multi-note (PR-H mini-sequencer
// ruling): sfx-victory = 3 rising · sfx-defeat = 2 falling · sfx-legendary = 5 arp.
export const SFX = {
  'sfx-ui-confirm': [0.4, 0,    500, 0,     0.01, 0.04, 1, 1, 0,  0,  8,  0.02],                          // short tri blip, quick up-chirp
  'sfx-ui-cancel':  [0.4, 0,    380, 0,     0.01, 0.05, 1, 1, 0, -4,  0,  0],                             // short tri blip, down (deltaSlide)
  'sfx-flip':       [0.45, 0.12, 520, 0,    0.02, 0.05, 0, 1, 0,  3,  0,  0,    0,    0.2],                // papery tick (noise) + tone
  'sfx-lock':       [0.7, 0.05, 140, 0.005, 0.04, 0.14, 2, 1, 0,  0, -6,  0.03, 0,    0.12, 0, 0, 0, 0.6, 0.05], // low saw metallic clack
  'sfx-crack':      [0.6, 0.2,  360, 0,     0.02, 0.10, 4, 1, 0,  4,  6,  0.02, 0,    0.6],                // noise splinter + pitch pop
  'sfx-hit':        [0.6, 0.1,  180, 0,     0.02, 0.07, 4, 1, 0, -2,  0,  0,    0,    0.4],                // punchy noise burst
  'sfx-ko':         [0.8, 0.1,  110, 0,     0.05, 0.20, 4, 1, 0, -3, -6,  0.1,  0,    0.3,  0, 20, 0, 0.5, 0.4], // descending noise + bitcrush
  // MELODY: 3 rising notes (C5→E5→G5 major arp), last held — a "you won" jingle.
  'sfx-victory': [
    { t: 0,   params: [0.5,  0, 523, 0.01, 0.06, 0.10, 1, 1] },
    { t: 90,  params: [0.5,  0, 659, 0.01, 0.06, 0.10, 1, 1] },
    { t: 180, params: [0.55, 0, 784, 0.01, 0.10, 0.18, 1, 1] },
  ],
  // MELODY: 2 falling notes (G4→C4), second lower + held — a somber "you lost".
  'sfx-defeat': [
    { t: 0,   params: [0.5,  0, 392, 0.02, 0.10, 0.16, 1, 1] },
    { t: 140, params: [0.55, 0, 262, 0.02, 0.16, 0.28, 1, 1] },
  ],
  // MELODY: 5-note rising sparkle arp (C5-E5-G5-B5-C6), shimmer via modulation,
  // top note held on a long tail — the legendary flourish.
  'sfx-legendary': [
    { t: 0,   params: [0.5, 0, 523,  0.02, 0.05, 0.10, 0, 1, 0,0,0,0,0,0, 2] },
    { t: 80,  params: [0.5, 0, 659,  0.02, 0.05, 0.10, 0, 1, 0,0,0,0,0,0, 2] },
    { t: 160, params: [0.5, 0, 784,  0.02, 0.05, 0.10, 0, 1, 0,0,0,0,0,0, 2] },
    { t: 240, params: [0.5, 0, 988,  0.02, 0.05, 0.10, 0, 1, 0,0,0,0,0,0, 2] },
    { t: 320, params: [0.6, 0, 1047, 0.03, 0.22, 0.45, 0, 1, 0,0,0,0,0,0, 3] },
  ],
  'sfx-engrave':    [0.55, 0.08, 260, 0,    0.04, 0.20, 3, 1, 0,  0,  0,  0,    0.05, 0.1],                // tan chisel ×3 ticks (repeatTime) + ring tail
  'sfx-promote':    [0.6, 0,    392, 0.03,  0.15, 0.30, 0, 1, 0,  3,  9,  0.08, 0,    0,    3],            // transmute sweep up (deltaSlide + pitchJump + modulation)
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

// Mini-sequencer: an entry is a single ZzFX params array OR a melody of { t, params }
// steps (t = ms offset). Single arrays play at t=0; steps are scheduled. `sfx(id)`
// signature is unchanged — call sites (PR-K) don't care which form an id uses.
export function sfx(id) {
  if (_muted) return;
  const entry = SFX[id];
  if (!entry) { console.warn('[audio] unknown sfx id:', id); return; }
  const steps = typeof entry[0] === 'object' ? entry : [{ t: 0, params: entry }];
  for (const { t, params } of steps) {
    const play = () => {
      if (_muted) return; // honor a mute that lands mid-melody
      try { zzfx(...params); } catch (e) { console.warn('[audio] play failed:', e?.message ?? e); }
    };
    if (t > 0) setTimeout(play, t); else play();
  }
}

export function setMuted(m) {
  _muted = !!m;
  try { localStorage.setItem(MUTE_KEY, _muted ? '1' : '0'); } catch (_) { /* ignore */ }
}

export function isMuted() { return _muted; }
