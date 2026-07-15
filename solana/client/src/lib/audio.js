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
// F2_SPEC §1.2 manifest — 12 normative ids (order per the spec list).
// Params tuned this pass to the §1.2 character column (shape/pitch/noise DIRECTION
// aligned per ZzFX semantics). STILL DRAFT for voicing: exact magnitudes are r0ze's
// ear-check gate (§1.2) — Claude/cc verify code-level only (arity, ranges, engine).
// Param order (ZzFX v1.3.2): [vol, rand, freq, attack, sustain, release, shape(0sin/
// 1tri/2saw/3tan/4noise), shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime,
// repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo].
// KNOWN LIMIT: victory/defeat/legendary describe multi-note MELODIES; one ZzFX call
// plays a single (bent) note — repeatTime re-triggers the SAME pitch. These are
// single-note approximations; a true jingle needs a tiny sequencer in the engine
// (SFX[id] as an array-of-param-arrays) — flagged for the PR-H audio-core decision.
export const SFX = {
  'sfx-ui-confirm': [0.4, 0,    500, 0,     0.01, 0.04, 1, 1, 0,  0,  8,  0.02],                          // short tri blip, quick up-chirp
  'sfx-ui-cancel':  [0.4, 0,    380, 0,     0.01, 0.05, 1, 1, 0, -4,  0,  0],                             // short tri blip, down (deltaSlide)
  'sfx-flip':       [0.45, 0.12, 520, 0,    0.02, 0.05, 0, 1, 0,  3,  0,  0,    0,    0.2],                // papery tick (noise) + tone
  'sfx-lock':       [0.7, 0.05, 140, 0.005, 0.04, 0.14, 2, 1, 0,  0, -6,  0.03, 0,    0.12, 0, 0, 0, 0.6, 0.05], // low saw metallic clack
  'sfx-crack':      [0.6, 0.2,  360, 0,     0.02, 0.10, 4, 1, 0,  4,  6,  0.02, 0,    0.6],                // noise splinter + pitch pop
  'sfx-hit':        [0.6, 0.1,  180, 0,     0.02, 0.07, 4, 1, 0, -2,  0,  0,    0,    0.4],                // punchy noise burst
  'sfx-ko':         [0.8, 0.1,  110, 0,     0.05, 0.20, 4, 1, 0, -3, -6,  0.1,  0,    0.3,  0, 20, 0, 0.5, 0.4], // descending noise + bitcrush
  'sfx-victory':    [0.6, 0,    523, 0.02,  0.10, 0.20, 1, 1, 0,  0,  10, 0.05, 0.08, 0,    0, 0, 0, 0.7, 0.05], // rising arp (FIX: v1.0 had repeatTime=6 → never looped)
  'sfx-defeat':     [0.55, 0,   300, 0.02,  0.12, 0.24, 1, 1, 0, -4, -8,  0.07, 0.12],                     // falling 2-note (repeatTime + down bend)
  'sfx-legendary':  [0.6, 0,    660, 0.04,  0.26, 0.50, 0, 1, 0,  0,  10, 0.08, 0.06, 0,    3],            // long shimmer arp (modulation + long tail)
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
