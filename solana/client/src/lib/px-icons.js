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
  battle: [[3,2,2,2],[5,4,2,2],[7,6,2,2],[9,8,2,2],[11,10,2,2],       // crossed swords
           [11,2,2,2],[9,4,2,2],[5,8,2,2],[3,10,2,2],
           [2,12,4,1],[10,12,4,1],
           [3,13,2,1],[11,13,2,1]],
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
          [7,6,2,4]],                                                // vertical slot
  burn:  [[7,2,2,3],[7,4,2,2],[5,5,6,2],[4,7,8,4],                   // flame
          [3,12,10,1],[2,10,1,1],[13,10,1,1]],                       // pyre base + embers

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
  'arrow-up': [[7,2,2,1],[6,3,4,1],[5,4,6,1],[4,5,8,1],[3,6,10,1],[6,7,4,7]], // promote (up arrow)
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

// -- XL glyphs (F2 pre-assets) -------------------------------------------------
// Large 32×32-grid glyphs for big surfaces (vault chest, card packs, lock states).
// Same rule as G: rects only ADD pixels, so hollow shapes are drawn as outlines
// with features in the negative space. Rendered via 32-viewBox symbols. Ids carry
// their own names; call them exactly like the 16-grid set: pxIcon('chest-lg', {size:64}).
// UNWIRED: no screen references these yet (F2 wiring lands in PR-H/I/K).
const GXL = {
  'chest-lg': [                                                      // closed treasure chest
    [10,5,12,1],[8,6,2,1],[22,6,2,1],[7,7,1,6],[24,7,1,6],[7,13,18,1], // domed lid
    [11,6,1,7],[20,6,1,7],[15,5,2,8],                                  // lid straps + center
    [7,12,3,2],[22,12,3,2],                                            // hinges on the seam
    [14,12,4,2],                                                       // lock-plate straddling the seam (2px)
    [6,13,20,1],[6,14,1,13],[25,14,1,13],[6,26,20,1],                  // body outline
    [14,16,4,1],[14,21,4,1],[14,16,1,6],[17,16,1,6],[15,18,2,1],[15,19,1,2], // latch + keyhole
  ],
  'scroll': [                                                        // rolled scroll, band at middle
    [6,5,20,1],[5,6,22,1],[5,7,1,2],[26,7,1,2],[5,9,22,1],[8,7,2,1],[13,7,2,1],[18,7,2,1],[22,7,2,1], // top roll
    [7,10,18,1],[7,10,1,12],[24,10,1,12],[7,22,18,1],                 // sheet (hollow)
    [5,23,22,1],[5,24,1,2],[26,24,1,2],[6,26,20,1],[8,24,2,1],[13,24,2,1],[18,24,2,1],[22,24,2,1], // bottom roll
    [4,15,24,1],[4,18,24,1],[4,15,1,4],[27,15,1,4],[15,14,3,1],[15,19,3,1], // ribbon band + knot
  ],
  'padlock-lg': [                                                    // chunky padlock, keyhole
    [10,4,12,1],[9,5,2,1],[21,5,2,1],[9,6,1,6],[22,6,1,6],[13,6,1,6],[18,6,1,6],[13,6,6,1], // shackle (top bar widened x10-21 — closes the 1px corner gap)
    [6,12,20,1],[6,13,1,14],[25,13,1,14],[6,27,20,1],                 // body outline
    [14,16,4,1],[13,17,1,3],[18,17,1,3],[14,20,4,1],[15,21,2,3],      // keyhole ring + slot
  ],
  'pack': [                                                          // SEALED foil booster (not a card fan — the fan is F2-3's animation, not the glyph)
    [9,8,1,20],[22,8,1,20],[9,27,14,1],                              // foil pouch body (hollow tall rect)
    [9,7,1,1],[10,6,1,1],[11,7,1,1],[12,6,1,1],[13,7,1,1],[14,6,1,1],[15,7,1,1],
    [16,6,1,1],[17,7,1,1],[18,6,1,1],[19,7,1,1],[20,6,1,1],[21,7,1,1],[22,6,1,1], // zigzag tear-crimp top edge
    [9,8,14,1],                                                      // seal band under the crimp
    [15,16,2,1],[14,17,4,1],[15,18,2,1],                             // center sigil (gem)
    [12,11,1,1],[13,12,1,1],[14,13,1,1],                            // shine glint
  ],
};

// Normalize any negative w/h (defensive). `map` defaults to the 16-grid set.
function _rects(id, map = G) {
  return (map[id] || []).map(([x, y, w, h]) => {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    return [x, y, w, h];
  });
}

const _symbols = (map, vb) => Object.keys(map).map(id => {
  const rects = _rects(id, map)
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`)
    .join('');
  return `<symbol id="px-${id}" viewBox="0 0 ${vb} ${vb}">${rects}</symbol>`;
}).join('');

export const PX_ICON_IDS = [...Object.keys(G), ...Object.keys(GXL)];

const SHEET_ID = 'px-icon-sheet';

export function injectPxIconSheet() {
  if (document.getElementById(SHEET_ID)) return;
  const symbols = _symbols(G, 16) + _symbols(GXL, 32);
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
