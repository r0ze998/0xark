// Base styles for card-detail.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const CARD_DETAIL_CSS = `
.cd-overlay {
  position: absolute; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(2px);
}
.cd-modal {
  position: relative; width: 680px; max-height: 90%;
  background: var(--bg-mid); border: var(--border-dim);
  box-shadow: 0 0 40px rgba(0,0,0,0.8);
  padding: 20px; overflow: hidden;
}
.cd-close {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none; color: var(--text-dim);
  font-size: 18px; cursor: pointer; padding: 2px 6px;
  font-family: var(--font-main);
}
.cd-close:hover { color: var(--text-cream); }

/* ── 2-column layout: card (left) | details (right) ── */
.cd-top { display: flex; gap: 24px; align-items: flex-start; }

.cd-card-wrap {
  flex-shrink: 0;
  width: 240px;     /* 240 × 7/5 = 336px tall — fits in 576px game screen */
  position: relative;
}
.cd-card-wrap .card-frame { width: 100%; }

.cd-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 10px;
  overflow-y: auto; max-height: 360px;
}
.cd-name {
  font-size: 20px; letter-spacing: 0.06em;
  color: var(--text-cream); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.cd-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.cd-faction { border-color: var(--fc, var(--accent-gold)); color: var(--fc, var(--accent-gold)); }

.cd-stats { display: flex; gap: 16px; }
.cd-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cd-stat-label { font-size: 13px; color: var(--text-dim); letter-spacing: 0.08em; }
.cd-stat-val { font-size: 24px; color: var(--text-cream); line-height: 1; }

.cd-ability {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
}
.cd-ability-type {
  font-size: 13px; letter-spacing: 0.08em; flex-shrink: 0;
  padding: 1px 5px; border: 1px solid;
}
.cd-ability-type--burn    { border-color: var(--accent-red); color: var(--accent-red); }
.cd-ability-type--passive { border-color: #6a8a6a; color: #6a8a6a; }
.cd-ability-desc { font-size: 13px; color: var(--text-dim); }

.cd-actions { display: flex; gap: 8px; margin-top: 4px; }
.cd-burn-btn { background: rgba(214,59,59,0.15); border-color: var(--accent-red) !important; }
.cd-burn-btn:hover:not(:disabled) { background: rgba(214,59,59,0.3); }

.cd-feedback { font-size: 13px; min-height: 18px; }

/* ── PROMOTE section ── */
.cd-promote-box {
  border: var(--border-dim); padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; background: rgba(201,162,39,0.04);
}
.cd-promote-title { font-size: 14px; letter-spacing: 0.08em; color: var(--accent-gold); }
.cd-promote-copy { font-size: 13px; }
.cd-maxtier { font-size: 15px; letter-spacing: 0.08em; display: flex; align-items: center; gap: 4px; }
.cd-promote-loading { font-size: 13px; }
.cd-promote-conds { display: flex; flex-direction: column; gap: 4px; }
.cd-cond { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-dim); }
.cd-cond--met { color: var(--accent-gold); }
.cd-cond-label { display: flex; align-items: center; gap: 3px; min-width: 118px; }
.cd-cond-bar {
  flex: 1; height: 7px; background: rgba(255,255,255,0.08); overflow: hidden; min-width: 60px;
}
.cd-cond-fill { display: block; height: 100%; background: var(--accent-gold); transition: width 0.4s; }
.cd-cond-num { min-width: 46px; text-align: right; color: var(--text-cream); }
.cd-cond-note { font-size: 13px; }
.cd-promote-btn { justify-content: center; font-size: 15px; padding: 7px; }

.cd-card-wrap.cd-promote-flash::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: var(--rc, var(--accent-gold)); mix-blend-mode: screen;
  animation: cd-promote-flash 0.7s var(--ease-out, ease-out) forwards;
}
@keyframes cd-promote-flash { 0%{opacity:0} 30%{opacity:0.85} 100%{opacity:0} }
`;
