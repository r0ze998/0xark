// Base styles for common/round-ui.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const ROUND_UI_CSS = `
.round-hud {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-main); white-space: nowrap;
}
.round-hud-label { font-size: 14px; letter-spacing: 0.1em; color: var(--text-cream); }
.round-hud--lg .round-hud-label { font-size: 20px; }
.round-hud-pips { display: inline-flex; gap: 4px; align-items: center; }
.rpip { width: 9px; height: 9px; border-radius: 50%; display: inline-block; box-sizing: border-box; }
.round-hud--lg .rpip { width: 13px; height: 13px; }
.rpip--mine    { background: var(--accent-gold); box-shadow: 0 0 4px rgba(201,162,39,0.6); }
.rpip--opp     { background: var(--accent-red);  box-shadow: 0 0 4px rgba(214,59,59,0.6); }
.rpip--pending { background: transparent; border: 1px solid var(--text-dim); }

/* Between-round bridge overlay */
.round-bridge {
  position: absolute; inset: 0; width: 1024px; height: 576px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 42%, rgba(10,14,26,0.94), rgba(3,6,15,0.98));
  z-index: 50; cursor: pointer; font-family: var(--font-main);
  animation: bridge-in 220ms var(--ease-out, ease-out);
}
@keyframes bridge-in { from { opacity: 0; } to { opacity: 1; } }
.bridge-inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.bridge-round { font-size: 16px; letter-spacing: 0.24em; color: var(--text-dim); }
.bridge-headline {
  font-size: 48px; letter-spacing: 0.06em; line-height: 1;
  text-shadow: 0 2px 0 rgba(0,0,0,0.6);
}
.bridge--win  .bridge-headline { color: var(--accent-gold); }
.bridge--loss .bridge-headline { color: var(--accent-red); }
.bridge--draw .bridge-headline { color: var(--text-cream); }
.bridge-score { font-size: 40px; color: var(--text-cream); letter-spacing: 0.08em; }
.bridge-dash { color: var(--text-dim); padding: 0 6px; }
.bridge-pips { display: inline-flex; gap: 7px; margin-top: 2px; }
.bridge-pips .rpip { width: 15px; height: 15px; }
.bridge-skip { font-size: 13px; color: var(--text-dim); letter-spacing: 0.14em; margin-top: 14px; }
`;
