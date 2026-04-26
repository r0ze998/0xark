// 00-canvas.js — canvas layout constants + duel canvas bootstrap
// Defines W, H, TW, TH, HUD_HEIGHT, dt, g that were previously in legacy/01-pixi.js.
// Must load before 04-state.js which uses TW/TH at module initialisation.

// Canvas dimensions used by duel scene
const W = 480, H = 270;
const TW = 32, TH = 32;
const HUD_HEIGHT = 72;

// Delta-time (seconds per frame at 60fps baseline). Set each tick in 09-game-loop.js.
let dt = 1;

// 2D rendering context — null until initDuelCanvas() runs.
let g = null;

function initDuelCanvas() {
  const scene = document.getElementById('scene-duel');
  if (!scene) return;
  let canvas = scene.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'duel-canvas';
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText =
      'display:block;max-width:100%;height:auto;' +
      'image-rendering:pixelated;image-rendering:crisp-edges;';
    scene.appendChild(canvas);
  }
  if (!g) g = canvas.getContext('2d');
}

// roundRect polyfill for iOS Safari < 15.4
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const _r = typeof r === 'number' ? [r, r, r, r] :
               Array.isArray(r) && r.length === 1 ? [r[0], r[0], r[0], r[0]] :
               Array.isArray(r) && r.length === 2 ? [r[0], r[1], r[0], r[1]] :
               Array.isArray(r) && r.length === 3 ? [r[0], r[1], r[2], r[1]] :
               Array.isArray(r) ? r : [0, 0, 0, 0];
    const _s = _r.map(v => Math.min(v, Math.min(w / 2, h / 2)));
    this.moveTo(x + _s[0], y);
    this.lineTo(x + w - _s[1], y);  this.arcTo(x + w, y,     x + w, y + _s[1], _s[1]);
    this.lineTo(x + w, y + h - _s[2]); this.arcTo(x + w, y + h, x + w - _s[2], y + h, _s[2]);
    this.lineTo(x + _s[3], y + h); this.arcTo(x, y + h, x, y + h - _s[3], _s[3]);
    this.lineTo(x, y + _s[0]);     this.arcTo(x, y, x + _s[0], y, _s[0]);
    this.closePath();
    return this;
  };
}
