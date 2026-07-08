// stage-scaler.js — fit the 1024×576 logical stage to any display (F0-2).
//
// DESIGN.md Stage & Layout: screens author to a fixed 1024×576 box; ONE scaler
// makes it fit every display and never implements per-screen responsiveness.
//   scale = min(vw/1024, vh/576);  if scale >= 2, floor() (integer-pixel snap).
// Applied via CSS `zoom` (text re-renders crisply at fractional scales) with a
// `transform: scale()` fallback for engines without `zoom`. Portrait (vh > vw)
// dims the stage and shows the rotate overlay (this is desktop-first).
//
// One-time wiring — touches only #stage-viewport / #app / #rotate-overlay, never
// a screen's internal layout.

const LOGICAL_W = 1024;
const LOGICAL_H = 576;

const app = document.getElementById('app');

// Prefer `zoom` (crisp text). Firefox <126 lacks it → fall back to transform.
const SUPPORTS_ZOOM =
  (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('zoom', '1')) ||
  (app && 'zoom' in app.style);

let _rafId = 0;

function applyScale() {
  _rafId = 0;
  if (!app) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const portrait = vh > vw;
  document.documentElement.classList.toggle('is-portrait', portrait);

  let scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  if (scale >= 2) scale = Math.floor(scale); // integer-pixel authenticity on big displays
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;

  if (SUPPORTS_ZOOM) {
    app.style.zoom = String(scale);
    app.style.transform = '';
  } else {
    app.style.transform = `scale(${scale})`;
    app.style.transformOrigin = 'center center';
    app.style.zoom = '';
  }
}

// Coalesce bursts of resize/orientation events into one rAF-timed recompute.
function schedule() {
  if (_rafId) return;
  _rafId = requestAnimationFrame(applyScale);
}

window.addEventListener('resize', schedule, { passive: true });
window.addEventListener('orientationchange', schedule, { passive: true });

applyScale();
