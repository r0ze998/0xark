// Shared Archive interface icons. Historical pxIcon names and sprite IDs stay
// stable; fine strokes now match the engraved brass and illustrated card world.
// Icons remain decorative. Adjacent text communicates the action or state.
const G = {
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
  back: '<path d="m9 5-7 7 7 7M2 12h20"/>',
  battle: '<path d="m4 3 6 4 9 12M20 3l-6 4-9 12M2 18l5 4M17 22l5-4M4 3v5M20 3v5"/>',
  vault: '<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M12 9v6m-3 0h6"/>',
  shop: '<path d="M8 3h8l-2 5c5 3 7 6 6 10-.5 3-15.5 3-16 0-1-4 1-7 6-10L8 3Z"/><path d="M9 8h6"/>',
  trade: '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
  crystal: '<path d="m12 2 8 9-8 11-8-11 8-9ZM4 11h16M12 2l3 9-3 11-3-11 3-9Z"/>',
  barrier: '<path d="m12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4Z"/><path d="M12 6v12"/>',
  flame: '<path d="M13 2c2 7-4 7-4 12 3 0 4-2 4-4 8 6 6 12-1 12-8 0-11-8-6-13-1 4 1 5 2 5-1-5 2-7 5-12Z"/>',
  storm: '<path d="M3 8h11a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
  shadow: '<path d="M19 4A10 10 0 1 0 20 19 9 9 0 0 1 19 4Z"/>',
  void: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
  bolt: '<path d="m14 2-10 12h7l-1 8 10-12h-7l1-8Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M12 8v8"/>',
  burn: '<path d="M13 2c1 6-5 7-4 12 2 0 4-2 4-4 5 4 5 9-1 9-6 0-8-6-4-10M4 22h16M3 18l-1-2m19 2 1-2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  chip: '<rect x="5" y="5" width="14" height="14" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  chest: '<path d="M3 10V8a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v2M3 10h18v11H3V10ZM8 3v7m8-7v7M3 14h7m4 0h7"/><rect x="10" y="12" width="4" height="5"/>',
  crack: '<path d="m13 2-4 6 5 3-5 5 4 6"/>',
  chisel: '<path d="m15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6M3 15l6 6"/>',
  'arrow-up': '<path d="M12 22V3m-8 8 8-8 8 8"/>',
  crown: '<path d="m3 6 5 5 4-8 4 8 5-5-2 14H5L3 6ZM5 16h14"/>',
  star: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
  skull: '<path d="M8 21v-4H5V9a7 7 0 0 1 14 0v8h-3v4H8Zm4-4v4"/><circle cx="8" cy="11" r="1.5"/><circle cx="16" cy="11" r="1.5"/><path d="m12 13-1 2h2l-1-2Z"/>',
  check: '<path d="m3 12 6 6L21 5"/>',
  cross: '<path d="m5 5 14 14M19 5 5 19"/>',
  warn: '<path d="M12 2 2 21h20L12 2ZM12 9v5m0 3v1"/>',
  'chest-lg': '<path d="M3 10V8a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v2M3 10h18v11H3V10ZM8 3v7m8-7v7M3 14h7m4 0h7"/><rect x="10" y="12" width="4" height="5"/>',
  scroll: '<path d="M6 3h13a2 2 0 0 1 0 4h-2V5H7v14h10v-2h2a2 2 0 0 1 0 4H6a2 2 0 0 1 0-4M7 3H5a2 2 0 0 0 0 4h2M10 9h4m-4 3h4m-4 3h4"/>',
  'padlock-lg': '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  pack: '<path d="M5 2h14v20H5V2Zm0 4h14M5 18h14m-7-10 4 4-4 4-4-4 4-4Z"/>',
};

const symbols = Object.entries(G).map(([id, shape]) =>
  `<symbol id="px-${id}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></symbol>`
).join('');
export const PX_ICON_IDS = Object.keys(G);

const SHEET_ID = 'px-icon-sheet';

export function injectPxIconSheet() {
  if (document.getElementById(SHEET_ID)) return;
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
    + `fill:none;shape-rendering:geometricPrecision;flex-shrink:0;}`;
  document.head.appendChild(st);
}

// Returns the inline-SVG markup that references a sprite symbol. Icons are
// decorative (aria-hidden); keep the adjacent text label for a11y.
export function pxIcon(id, { size = null, cls = '' } = {}) {
  const style = size ? ` style="width:${size}px;height:${size}px;"` : '';
  const extra = cls ? ` ${cls}` : '';
  return `<svg class="px-icon${extra}"${style} aria-hidden="true"><use href="#px-${id}"/></svg>`;
}
