// px-icons.js — the one pixel-icon set (DESIGN.md Iconography, F0-4).
// OS emoji are banned (anti-aliased, multi-color, off-palette). Every glyph is an
// inline-SVG symbol on a 16×16 unit grid, drawn from whole-pixel rects, rendered
// with shape-rendering:crispEdges and filled via currentColor so icons inherit
// token colors. Scale only by integers (16/32/48).
//
// Usage:  injectPxIconSheet()  once (like injectCardCSS), then
//         pxIcon('battle', { size: 16 })  ->  <svg class="px-icon">...<use/></svg>
//
// Each glyph is a list of [x, y, w, h] filled rects. Rects only ADD pixels, so
// "hollow" shapes (ring, eye, crate, skull, warn) are drawn as OUTLINES with the
// interior left empty and features placed in that empty space.
/* eslint-disable */
const G = {
  // -- Navigation / surfaces ----------------------------------------------
  home:   [[7,2,2,1],[6,3,4,1],[5,4,6,1],[4,5,8,1],[3,6,10,1],       // roof
           [4,7,1,7],[11,7,1,7],[4,13,8,1],[7,9,2,5]],                // hollow body + door
  back:   [[2,7,2,2],[4,5,2,2],[4,9,2,2],[6,3,2,2],[6,11,2,2],[2,7,12,2]], // <- arrow
  battle: [[11,2,3,3],[3,9,3,3],[5,7,6,2],[9,5,2,2],[7,7,2,2],[2,11,4,2],[10,3,2,4]], // crossed blades
  vault:  [[2,3,12,1],[2,13,12,1],[2,3,1,11],[13,3,1,11],            // crate outline
           [2,6,12,1],[7,7,2,3],[6,9,4,1]],                          // lid line + latch
  shop:   [[6,2,4,1],[5,3,6,1],[4,4,8,1],[3,5,10,8],[4,13,8,1]],     // money bag (silhouette)
  trade:  [[2,6,7,1],[2,7,7,1],[2,5,2,1],[2,8,2,1],                  // top arrow ->
           [7,9,7,1],[7,10,7,1],[12,8,2,1],[12,11,2,1]],             // bottom arrow <-

  // -- ActionTypes (all six are px-icons per DESIGN.md) -------------------
  crystal: [[7,2,2,2],[5,4,6,2],[3,6,10,2],[5,8,6,4],[7,12,2,2]],    // gem
  barrier: [[3,3,10,2],[3,3,2,6],[11,3,2,6],[5,9,6,2],[7,11,2,2]],   // shield
  flame:   [[7,2,2,3],[5,5,6,2],[4,7,8,4],[5,11,6,2],[7,4,2,2]],     // flame
  storm:   [[4,4,8,2],[4,4,2,4],[6,7,6,2],[10,9,2,4],[4,11,8,2]],    // swirl
  shadow:  [[4,4,8,1],[4,11,8,1],[4,4,1,8],[11,4,1,8],[7,7,2,2]],    // ring + dot (hollow)
  void:    [[7,1,2,14],[1,7,14,2],[4,4,2,2],[10,4,2,2],[4,10,2,2],[10,10,2,2]], // sparkle

  // -- Economy / energy ---------------------------------------------------
  bolt:  [[8,2,3,6],[5,6,4,2],[7,8,3,6],[4,8,4,2]],                  // energy bolt
  coin:  [[5,3,6,1],[5,12,6,1],[4,4,1,8],[11,4,1,8],[3,5,1,6],[12,5,1,6], // ring
          [8,6,1,4],[7,6,2,1],[9,9,2,1]],                            // $ mark inside
  burn:  [[7,2,2,3],[5,5,6,2],[4,7,8,5],[6,9,4,3],[7,4,2,2]],        // burn flame

  // -- Intel / AI ---------------------------------------------------------
  eye:   [[5,6,6,1],[5,9,6,1],[4,7,1,2],[11,7,1,2],[3,7,2,1],[12,7,2,1],[7,7,2,2]], // eye + pupil (hollow)
  chip:  [[4,4,8,1],[4,11,8,1],[4,4,1,8],[11,4,1,8],[6,6,4,4],       // chip body outline + core
          [7,1,2,3],[7,12,2,3],[1,7,3,2],[12,7,3,2]],                // pins

  // -- Rituals ------------------------------------------------------------
  lock:  [[5,3,1,4],[10,3,1,4],[6,2,4,1],                            // shackle
          [4,7,8,1],[4,13,8,1],[4,7,1,6],[11,7,1,6],[7,9,2,1],[7,10,1,2]], // body outline + keyhole
  chest: [[2,6,12,1],[2,13,12,1],[2,6,1,7],[13,6,1,7],[2,9,12,1],[7,10,2,2]], // chest outline + lid + latch
  crack: [[7,1,1,4],[8,4,1,3],[6,6,1,3],[9,8,1,4],[7,11,1,4]],       // jagged crack
  chisel:[[10,2,4,4],[8,4,4,4],[6,6,4,4],[3,9,4,4],[2,12,3,2]],      // chisel
  crown: [[2,6,12,1],[2,11,12,1],[2,4,2,7],[12,4,2,7],[7,3,2,6],[3,7,10,1]], // crown outline + peaks
  star:  [[7,1,2,14],[1,7,14,2],[5,5,6,6],[3,3,2,2],[11,3,2,2],[3,11,2,2],[11,11,2,2]], // star

  // -- Status -------------------------------------------------------------
  skull: [[4,3,8,1],[3,4,1,7],[12,4,1,7],[4,10,8,1],                 // dome + jaw outline
          [5,5,2,2],[9,5,2,2],[7,8,2,1],[5,11,1,2],[7,11,2,2],[10,11,1,2]], // eyes + nose + teeth
  check: [[3,8,2,2],[5,10,2,2],[7,6,2,6],[9,4,2,4],[11,2,2,4]],      // checkmark
  cross: [[3,3,2,2],[5,5,2,2],[7,7,2,2],[9,9,2,2],[11,11,2,2],[11,3,2,2],[9,5,2,2],[5,9,2,2],[3,11,2,2]], // X
  warn:  [[7,2,1,1],[8,2,1,1],[6,4,1,1],[9,4,1,1],[5,6,1,1],[10,6,1,1],[4,8,1,1],[11,8,1,1],[3,10,1,2],[12,10,1,2],[3,12,10,1], // triangle outline
          [7,5,2,4],[7,10,2,1]],                                     // ! inside
};

// Normalize any negative w/h (defensive).
function _rects(id) {
  return (G[id] || []).map(([x, y, w, h]) => {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    return [x, y, w, h];
  });
}

export const PX_ICON_IDS = Object.keys(G);

const SHEET_ID = 'px-icon-sheet';

export function injectPxIconSheet() {
  if (document.getElementById(SHEET_ID)) return;
  const symbols = Object.keys(G).map(id => {
    const rects = _rects(id)
      .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`)
      .join('');
    return `<symbol id="px-${id}" viewBox="0 0 16 16">${rects}</symbol>`;
  }).join('');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = SHEET_ID;
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = symbols;
  document.body.appendChild(svg);

  if (document.getElementById('px-icon-css')) return;
  const st = document.createElement('style');
  st.id = 'px-icon-css';
  st.textContent = `.px-icon{display:inline-block;width:1em;height:1em;vertical-align:-0.125em;`
    + `fill:currentColor;shape-rendering:crispEdges;flex-shrink:0;}`;
  document.head.appendChild(st);
}

// Returns the inline-SVG markup that references a sprite symbol. Icons are
// decorative (aria-hidden); keep the adjacent text label for a11y.
export function pxIcon(id, { size = null, cls = '' } = {}) {
  const style = size ? ` style="width:${size}px;height:${size}px;"` : '';
  const extra = cls ? ` ${cls}` : '';
  return `<svg class="px-icon${extra}"${style} aria-hidden="true"><use href="#px-${id}"/></svg>`;
}
