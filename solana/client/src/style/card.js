// Base styles for common/Card.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const CARD_CSS = `
.ark-card {
  position: relative;
  width: 80px; height: 112px;
  display: flex; flex-direction: column; align-items: center;
  padding: 5px 4px 4px;
  background: var(--bg-mid);
  border: 1px solid color-mix(in srgb, var(--cc,var(--text-cream)) 40%, transparent);
  cursor: pointer;
  transition: border-color 80ms, box-shadow 80ms;
  flex-shrink: 0;
  overflow: hidden;
}
.ark-card:hover:not(.ark-card--locked):not(.ark-card--dead) {
  border-color: var(--cc,var(--text-cream));
  box-shadow: 0 0 6px color-mix(in srgb, var(--cc,var(--text-cream)) 40%, transparent);
}
.ark-card--selected {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 10px rgba(201,162,39,0.5);
}
.ark-card--legendary {
  border-color: var(--rarity-l);
  box-shadow: 0 0 8px rgba(216,176,52,0.4), inset 0 0 12px rgba(216,176,52,0.06);
}
.ark-card--legendary.ark-card--selected {
  box-shadow: 0 0 14px rgba(216,176,52,0.7);
}
.ark-card--locked { opacity: 0.3; cursor: default; filter: grayscale(0.6); }
.ark-card--dead { opacity: 0.35; filter: grayscale(1); }
.ark-card--facedown {
  width: 80px; height: 112px;
  background: repeating-linear-gradient(-45deg,var(--bg-mid),var(--bg-mid) 4px,var(--bg-deep) 4px,var(--bg-deep) 8px);
  border: 1px solid rgba(201,162,39,0.3);
  display: flex; align-items: center; justify-content: center;
}
.ark-card--empty { width: 80px; height: 112px; }
.ark-card-back { font-size: 32px; color: rgba(201,162,39,0.2); }

/* Tile floor (DESIGN.md): 13px minimum, emphasis via size+color not weight. */
.ark-card-header {
  width: 100%; display: flex; justify-content: space-between;
  font-size: var(--fs-caption); letter-spacing: var(--ls-caption); line-height: 1;
  margin-bottom: 2px; flex-shrink: 0;
}
.ark-card-rarity { color: var(--text-dim); }

/* BP is the tile's headline stat (24px). HP/INI moved to frame/detail. */
.ark-card-bp { flex-shrink: 0; line-height: 1; margin: 2px 0; }
.ark-card-bp b { font-size: var(--fs-heading); color: var(--text-cream); }

.ark-card-name {
  font-size: var(--fs-caption); text-align: center; line-height: 1.1;
  color: var(--text-cream); letter-spacing: var(--ls-normal);
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 2px 1px; width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.ark-card-legend {
  font-size: 14px; color: var(--rarity-l); line-height: 1; flex-shrink: 0;
  text-shadow: 0 0 6px rgba(216,176,52,0.8);
}

.ark-card-overlay, .ark-card-dead-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: rgba(232,223,200,0.3);
}
.ark-card-dead-overlay { color: rgba(214,59,59,0.5); font-size: 36px; }

/* ── Framed card (vault display) ─────────────────────────────────────── */
.card-frame {
  position: relative;
  aspect-ratio: 5 / 7;
  width: 100%;
  min-width: 112px;                 /* DESIGN.md card-frame minimum render width */
  container-type: inline-size;      /* enables the <140px stat-label hide below */
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: var(--font-main, 'VT323', monospace);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
  transition: filter 80ms;
}
.card-frame.rarity-c { background-image: url('public/img/frames/frame_common.png'); }
.card-frame.rarity-u { background-image: url('public/img/frames/frame_uncommon.png'); }
.card-frame.rarity-r { background-image: url('public/img/frames/frame_rare.png'); }
.card-frame.rarity-l { background-image: url('public/img/frames/frame_legendary.png'); }

.card-frame--locked  { opacity: 0.25; cursor: default; filter: grayscale(0.8); }
.card-frame--dead    { opacity: 0.3;  filter: grayscale(1); }
.card-frame--facedown {
  aspect-ratio: 5 / 7; width: 100%;
  background: repeating-linear-gradient(-45deg,var(--bg-mid),var(--bg-mid) 4px,var(--bg-deep) 4px,var(--bg-deep) 8px);
  border: 1px solid rgba(201,162,39,0.3);
  display: flex; align-items: center; justify-content: center;
}
.card-frame--empty { aspect-ratio: 5 / 7; width: 100%; }
.card-frame--selected { filter: drop-shadow(0 0 4px var(--accent-gold)); }

.card-frame .clan-bar {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 2;
}
.card-frame .rarity-bar {
  position: absolute; right: 0; top: 0; bottom: 0; width: 4px; z-index: 2;
}
.card-frame .name-banner {
  position: absolute; top: 10%; left: 18%; right: 18%; height: 10%;
  display: flex; align-items: center; justify-content: center;
  color: #1a0f0f; font-size: 0.85rem;
  text-align: center; z-index: 3; line-height: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-frame .art-window {
  position: absolute; top: 22%; left: 12%; right: 12%; bottom: 25%;
  display: flex; align-items: center; justify-content: center; z-index: 1;
  font-size: 3rem;
}
.card-frame .card-art-placeholder {
  font-size: 3rem; opacity: 0.75; line-height: 1;
  font-family: sans-serif;
}
.card-frame .card-art-img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
  image-rendering: auto;
}
.card-frame .stats-panel {
  position: absolute; bottom: 11%; left: 15%; right: 15%; height: 8%;
  display: flex; flex-direction: row; justify-content: space-around; align-items: center;
  padding: 0 8%;
  color: #1a0f0f; z-index: 3;
}
.card-frame .stat-badge {
  display: inline-flex; flex-direction: row; align-items: baseline; gap: 3px;
}
.card-frame .stat-label { font-size: var(--fs-caption); opacity: 0.7; }
.card-frame .stat-value { font-size: 0.95rem; }
.card-frame .cf-hp .stat-value { color: #2a6e3a; }
/* DESIGN.md: below 140px render width, keep stat VALUES, hide the labels. */
@container (max-width: 139px) {
  .card-frame .stat-label { display: none; }
}

/* Legendary rarity — crown decoration offset + stats bump */
.card-frame.rarity-l .name-banner { top: 13%; height: 9%; align-items: flex-end; }
.card-frame.rarity-l .stats-panel { bottom: 13%; }
`;
