// ─────────────────────────────────────────────────────────────────────────────
//  ZzFX — Zuper Zmall Zound Zynth
//  MIT License · Copyright (c) 2019 Frank Force
//  Upstream: https://github.com/KilledByAPixel/ZzFX  (pin: v1.3.1, ZzFXMicro)
//
//  PROVENANCE NOTE (read before release): this file was produced in an OFFLINE
//  environment that could not fetch the upstream minified release byte-for-byte.
//  It is a FAITHFUL, readable RE-IMPLEMENTATION of the documented ZzFX algorithm
//  with the exact public parameter order, NOT a verified copy of ZzFXMicro.min.js.
//  Before shipping: replace this file with the real pinned upstream release (or
//  byte-diff this against it). audio.js depends ONLY on the stable zzfx(...params)
//  signature, so swapping in the canonical file requires no other changes.
//
//  The full MIT license text ships with the upstream repo; retain it on drop-in.
// ─────────────────────────────────────────────────────────────────────────────
/* eslint-disable */

// Master volume (0..1). audio.js sets this to 0.5. Kept as a module-level knob to
// mirror the upstream `zzfxV` global.
export let zzfxV = 0.3;
export function setMasterVolume(v) { zzfxV = v; }

let _ctx = null;
// Lazy AudioContext — created on first use so importing this module never triggers
// the browser autoplay warning before a user gesture.
export function zzfxContext() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

// zzfxG — generate the raw Float sample buffer for a sound. Parameter order and
// defaults match upstream ZzFX exactly so published param arrays are portable.
export function zzfxG(
  volume = 1, randomness = 0.05, frequency = 220, attack = 0, sustain = 0,
  release = 0.1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
  pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
  bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0,
) {
  const PI2 = Math.PI * 2;
  const sampleRate = 44100;
  const sign = (v) => (v > 0 ? 1 : -1);

  let startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
  let startFrequency = (frequency *=
    ((1 + randomness * 2 * Math.random() - randomness) * PI2) / sampleRate);
  const b = [];
  let t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0, f, length;

  attack = sampleRate * attack + 9;    // +9 sample minimum to avoid click
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= (500 * PI2) / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = (repeatTime * sampleRate) | 0;

  length = (attack + decay + sustain + release + delay) | 0;
  for (; i < length; b[i++] = s) {
    if (!(++c % ((bitCrush * 100) | 0))) {                     // bit crush
      s = shape
        ? shape > 1
          ? shape > 2
            ? shape > 3                                         // 4=noise-ish
              ? Math.sin((t % PI2) ** 3)
              : Math.max(Math.min(Math.tan(t), 1), -1)          // 3=tan
            : 1 - (((((2 * t) / PI2) % 2) + 2) % 2)             // 2=saw
          : 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2)     // 1=triangle
        : Math.sin(t);                                          // 0=sine

      s =
        (repeatTime
          ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime)
          : 1) *
        sign(s) *
        Math.abs(s) ** shapeCurve *                            // curve
        volume *
        zzfxV *
        (i < attack
          ? i / attack                                          // attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)  // decay
            : i < attack + decay + sustain
              ? sustainVolume                                   // sustain
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume // release
                : 0);

      s = delay
        ? s / 2 +
          (delay > i ? 0 : ((i < length - delay ? 1 : (length - i) / delay) * b[(i - delay) | 0]) / 2)
        : s;                                                    // echo
    }

    f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++); // freq
    t += f + f * noise * Math.sin(i ** 5);                      // noise

    if (j && ++j > pitchJumpTime) {                             // pitch jump
      frequency += pitchJump;
      startFrequency += pitchJump;
      j = 0;
    }
    if (repeatTime && !(i % repeatTime)) {                      // repeat
      frequency = startFrequency;
      slide = startSlide;
      j = j || 1;
    }
  }
  return b;
}

// zzfxP — play one or more sample buffers on the shared context. Returns the source.
export function zzfxP(...samples) {
  const ctx = zzfxContext();
  const length = Math.max(...samples.map((s) => s.length));
  const buffer = ctx.createBuffer(samples.length, length, 44100);
  samples.forEach((s, i) => buffer.getChannelData(i).set(s));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return source;
}

// zzfx — generate + play in one call (the common entry point).
export function zzfx(...params) {
  return zzfxP(zzfxG(...params));
}
