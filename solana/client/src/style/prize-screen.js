export const PRIZE_SCREEN_CSS = `
#app .prize-screen { width:100%; height:100%; overflow:auto; background:linear-gradient(120deg,rgba(12,21,23,.94),rgba(12,21,23,.99)),var(--archive-scene) center/cover; color:var(--text-cream); font-family:var(--font-main); }
#app .prize-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 32px; border-bottom:var(--border-dim); font-size:13px; color:var(--text-dim); }
#app .prize-layout { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(280px,1fr); max-width:1320px; margin:auto; padding:48px 40px; gap:64px; }
#app .prize-eyebrow { color:var(--accent-gold); font-size:13px; letter-spacing:.12em; margin-bottom:18px; }
#app .prize-summary h1 { font:500 clamp(38px,4.5vw,64px)/1.08 var(--font-display); margin:0 0 24px; }
#app .prize-intro { color:var(--text-dim); font-size:16px; line-height:1.8; max-width:620px; }
#app .prize-metrics { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:32px 0; padding:28px 0; border-block:var(--border-dim); }
#app .prize-metrics span { font-size:13px; color:var(--text-dim); }
#app .prize-metrics strong { display:block; color:var(--accent-gold); font:36px/1.4 var(--font-display); overflow-wrap:anywhere; }
#app .prize-metrics small { font:13px var(--font-main); }
#app .prize-metrics p,#app .prize-rules p { color:var(--text-dim); font-size:14px; line-height:1.8; }
#app .prize-collection { display:flex; justify-content:space-between; gap:12px; font-size:14px; }
#app .prize-summary progress { display:block; width:100%; height:6px; margin:14px 0 28px; accent-color:var(--accent-gold); }
#app .prize-facts { display:grid; grid-template-columns:1fr 1fr; gap:14px; font-size:13px; line-height:1.6; }
#app .prize-facts dt { color:var(--text-dim); }
#app .prize-facts dd { margin:0; text-align:right; }
#app .prize-address { overflow-wrap:anywhere; }
#app .prize-feedback { min-height:52px; margin-top:20px; font-size:14px; line-height:1.6; color:var(--accent-gold); }
#app .prize-actions { display:flex; flex-wrap:wrap; gap:12px; }
#app .prize-actions button { min-height:48px; }
#app .prize-actions button:disabled { opacity:.55; }
#app .prize-receipt { color:var(--accent-blue); font-size:14px; text-underline-offset:4px; }
#app .prize-rules { padding:28px; border:var(--border-dim); background:rgba(0,0,0,.15); align-self:start; }
#app .prize-rules h2 { font:500 38px/1.12 var(--font-display); margin:0 0 24px; }
#app .prize-rules table { width:100%; border-collapse:collapse; margin:24px 0; font-size:14px; }
#app .prize-rules caption { text-align:left; color:var(--text-dim); margin-bottom:12px; font-size:13px; }
#app .prize-rules :is(th,td) { padding:12px 8px; text-align:left; border-bottom:var(--border-dim); }
#app .prize-rules th { font-weight:500; color:var(--text-dim); }
#app .is-your-tier { color:var(--accent-gold); background:rgba(217,190,135,.06); }
#app .prize-example { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin:16px 0; font-size:14px; }
#app .prize-example select { padding:10px; border:var(--border-dim); background:var(--bg-mid); color:var(--text-cream); min-height:44px; font-size:14px; }
#app .prize-notice { font-size:14px; line-height:1.7; border-left:2px solid var(--accent-blue); padding:12px 16px; background:var(--bg-mid); }
#app .home-prize-link { display:block; margin-top:20px; padding:12px 0; color:var(--accent-gold); font-size:14px; text-align:left; border:0; border-bottom:var(--border-dim); background:transparent; cursor:pointer; }
@media(max-width:1000px) { #app .prize-layout { grid-template-columns:1fr; gap:32px; padding:28px 24px; } }
@media(max-width:400px) { #app .prize-header { padding:16px 12px; } #app .prize-layout { padding:28px 16px; } #app .prize-metrics { grid-template-columns:1fr; } #app .prize-rules { padding:20px 16px; } #app .prize-facts { grid-template-columns:1fr; gap:8px; } #app .prize-facts dd { text-align:left; margin-bottom:12px; } }
`;
