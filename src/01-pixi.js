// Unregister any service workers and clear caches to prevent stale version serving
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(regs=>{regs.forEach(r=>r.unregister());});}
if('caches' in window){caches.keys().then(names=>{names.forEach(n=>caches.delete(n));});}
const c=document.getElementById('g');
c.width=960;c.height=640;
const W=960,H=640;
let g=c.getContext('2d');
const TW=32,TH=32;

// ═══════════════════════════════════════
// PIXI.JS APPLICATION (desktop only — mobile uses canvas direct)
// ═══════════════════════════════════════
const _isMobile=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.ROUND_PIXELS = true; // pixel-perfect snapping globally
const pixiApp = new PIXI.Application({
  width: W, height: H,
  backgroundAlpha: 0, // Transparent background — game canvas shown directly below PixiJS UI overlay
  antialias: false,
  roundPixels: true,
  resolution: 1,       // force 1:1 pixel mapping — no DPR scaling
  autoStart: false,
});
if(!_isMobile){
  // Desktop: game canvas shown directly; PixiJS canvas overlaid as transparent UI layer only
  // This eliminates the black flash caused by WebGL framebuffer clear when uploading canvas texture
  c.style.display='block';
  const _pixiView=pixiApp.view;
  // image-rendering:pixelated ensures WebGL canvas stays crisp on scaled displays
  _pixiView.style.cssText='display:block;position:absolute;top:0;left:0;width:960px;height:640px;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges;';
  document.getElementById('pixi-wrap').appendChild(_pixiView);
  pixiApp.stop();
  // Remove the Application's internal render listener so ticker.update() doesn't double-render
  try{pixiApp.ticker.remove(pixiApp.render,pixiApp);}catch(e){}
}else{
  // Mobile: show canvas directly, PixiJS runs offscreen for UI objects only
  c.style.display='block';
}

// Layer structure
const pixiLayers = {
  game: new PIXI.Container(),
  ui: new PIXI.Container(),
  fx: new PIXI.Container(),
};
pixiApp.stage.addChild(pixiLayers.game);
pixiApp.stage.addChild(pixiLayers.ui);
pixiApp.stage.addChild(pixiLayers.fx);

// Canvas texture kept for compat; game canvas is shown directly — NOT rendered via PixiJS sprite
const canvasTex = PIXI.Texture.from(c);
const gameSprite = new PIXI.Sprite(canvasTex);
// gameSprite NOT added to stage — canvas c displayed directly below transparent PixiJS overlay

// UI text style presets
const UI_STYLE = {
  hud: new PIXI.TextStyle({fontFamily:'VT323',fontSize:20,fill:'#f0e8c0',dropShadow:true,dropShadowColor:'#000',dropShadowDistance:1}),
  hudSmall: new PIXI.TextStyle({fontFamily:'VT323',fontSize:16,fill:'#c8c0a0',dropShadow:true,dropShadowColor:'#000',dropShadowDistance:1}),
  title: new PIXI.TextStyle({fontFamily:'VT323',fontSize:36,fill:'#f8f0e0',dropShadow:true,dropShadowColor:'#000',dropShadowDistance:2}),
  alert: new PIXI.TextStyle({fontFamily:'VT323',fontSize:22,fill:'#d04040',dropShadow:true,dropShadowColor:'#000',dropShadowDistance:1}),
  gold: new PIXI.TextStyle({fontFamily:'VT323',fontSize:20,fill:'#f0c830',dropShadow:true,dropShadowColor:'#000',dropShadowDistance:1}),
};

// PixiJS HUD elements (overlaid on canvas render)
const pixiHud = {
  seasonTimer: new PIXI.Text('',UI_STYLE.hud),
  battleCount: new PIXI.Text('',UI_STYLE.hudSmall),
  cardProgress: new PIXI.Text('',UI_STYLE.gold),
  rivalWarning: new PIXI.Text('⚠ RIVAL DANGER!',UI_STYLE.alert),
};
pixiHud.seasonTimer.x=10;pixiHud.seasonTimer.y=2;
pixiHud.battleCount.x=10;pixiHud.battleCount.y=24;
pixiHud.cardProgress.x=W-140;pixiHud.cardProgress.y=2;
pixiHud.rivalWarning.x=W/2-80;pixiHud.rivalWarning.y=42;pixiHud.rivalWarning.visible=false;
Object.values(pixiHud).forEach(t=>pixiLayers.ui.addChild(t));
// v307: HUD string caches — only rebuild when values change, not every frame
let _timeLblLastMin=-1,_timeLblCache='';
let _cardPrgKey=-1,_cardPrgCache='';
let _btlCountKey=-1,_btlCountCache='';

// ═══════════════════════════════════════
// PIXI FRLG UI FRAMEWORK
// ═══════════════════════════════════════
const PX_FRLG = {
  winBg: 0xF8F0D0,
  borderOuter: 0x484050,
  borderInner: 0x888078,
  textColor: 0x383830,
  selHighlight: 0xF8D830,
  hpGreen: 0x58A850,
  hpYellow: 0xF8C838,
  hpRed: 0xE85048,
};

// Create a FRLG-style window as PIXI.Graphics
function pxWin(w, h) {
  const g = new PIXI.Graphics();
  const bo = PX_FRLG.borderOuter, bi = PX_FRLG.borderInner, bg = PX_FRLG.winBg;
  // Outer border (rounded rect via pixel rows)
  g.beginFill(bo);
  g.drawRoundedRect(0, 0, w, h, 6);
  g.endFill();
  // Inner border
  g.beginFill(bi);
  g.drawRoundedRect(3, 3, w-6, h-6, 4);
  g.endFill();
  // Background fill
  g.beginFill(bg);
  g.drawRoundedRect(5, 5, w-10, h-10, 3);
  g.endFill();
  // Top-left highlight
  g.beginFill(0xFFFFFF, 0.35);
  g.drawRect(6, 5, w-12, 1);
  g.drawRect(5, 6, 1, h-12);
  g.endFill();
  return g;
}

// Create styled text (FRLG dark on cream)
function pxText(str, size, color) {
  return new PIXI.Text(str, new PIXI.TextStyle({
    fontFamily: 'VT323',
    fontSize: size || 20,
    fill: color || PX_FRLG.textColor,
    letterSpacing: 1,
  }));
}

// Create text with drop shadow (for dark backgrounds)
function pxTextShadow(str, size, color) {
  return new PIXI.Text(str, new PIXI.TextStyle({
    fontFamily: 'VT323',
    fontSize: size || 20,
    fill: color || 0xF0E8C0,
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowDistance: 1,
    dropShadowAlpha: 0.8,
    letterSpacing: 1,
  }));
}

// Typewriter text component
class PxTypewriter {
  constructor(style, maxWidth) {
    this.text = new PIXI.Text('', style || new PIXI.TextStyle({fontFamily:'VT323',fontSize:22,fill:PX_FRLG.textColor,wordWrap:true,wordWrapWidth:maxWidth||440}));
    this.target = '';
    this.current = '';
    this.idx = 0;
    this.done = true;
    this.speed = 2; // frames per char
    this.accum = 0;
  }
  set(str) { this.target = str; this.current = ''; this.idx = 0; this.done = false; this.accum = 0; this.text.text = ''; }
  tick(dt) {
    if (this.done) return;
    this.accum += dt;
    while (this.accum >= this.speed && this.idx < this.target.length) {
      this.current += this.target[this.idx]; this.idx++; this.accum -= this.speed;
      if (this.idx >= this.target.length) this.done = true;
    }
    this.text.text = this.current;
  }
  skip() { this.current = this.target; this.idx = this.target.length; this.done = true; this.text.text = this.current; }
}

// Bouncing cursor sprite (golden triangle)
function pxCursor() {
  const g = new PIXI.Graphics();
  g.beginFill(PX_FRLG.selHighlight);
  g.moveTo(0, 0); g.lineTo(8, 5); g.lineTo(0, 10); g.closePath();
  g.endFill();
  return g;
}

// HP bar component
function pxHPBar(w, h, ratio) {
  const g = new PIXI.Graphics();
  // Background
  g.beginFill(0x282838); g.drawRect(0, 0, w, h); g.endFill();
  // Fill
  const col = ratio > 0.5 ? PX_FRLG.hpGreen : ratio > 0.25 ? PX_FRLG.hpYellow : PX_FRLG.hpRed;
  g.beginFill(col); g.drawRect(0, 0, Math.floor(w * ratio), h); g.endFill();
  return g;
}

// Slide-in animation helper
function pxSlideIn(container, fromX, toX, fromY, toY, duration, onComplete) {
  let t = 0;
  const ticker = () => {
    t += pixiApp.ticker.deltaMS / 1000;
    const p = Math.min(1, t / duration);
    const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
    container.x = fromX + (toX - fromX) * ease;
    container.y = fromY + (toY - fromY) * ease;
    if (p >= 1) { pixiApp.ticker.remove(ticker); if (onComplete) onComplete(); }
  };
  pixiApp.ticker.add(ticker);
}

// Fade overlay for transitions
const pxFadeOverlay = new PIXI.Graphics();
pxFadeOverlay.beginFill(0x000000); pxFadeOverlay.drawRect(0, 0, W, H); pxFadeOverlay.endFill();
pxFadeOverlay.alpha = 0;
pixiLayers.fx.addChild(pxFadeOverlay);

// PixiJS player aura (golden glow when close to winning)
const pxPlayerAura = new PIXI.Graphics();
pixiLayers.fx.addChild(pxPlayerAura);

function updatePixiPlayerAura(){
  pxPlayerAura.clear();
  if(sc!=='map'||introActive){return;}
  const unique=hasUniqueCards(0).size;
  if(unique<10)return; // show aura when 10+ unique cards collected
  const px=pl[0].visualX-camX+TW/2, py=pl[0].visualY-camY+TH/2;
  const intensity=unique>=60?1:unique>=30?0.8:0.5;
  const pulse=_sFr10*0.15+0.85; // v370: cached
  // Golden radial glow
  for(let r=60;r>20;r-=8){
    pxPlayerAura.beginFill(0xF0C830,0.04*intensity*pulse);
    pxPlayerAura.drawCircle(px,py,r);
    pxPlayerAura.endFill();
  }
  // Sparkle particles around player occasionally
  if(fr%8===0){
    const angle=Math.random()*Math.PI*2;
    const dist=30+Math.random()*20;
    pxSpawnParticle(px+Math.cos(angle)*dist, py+Math.sin(angle)*dist, 0xF0C830, 1, 1, 20);
  }
}

// PixiJS circular vision overlay (Iwayama Tunnel style)
const pxVisionOverlay = new PIXI.Graphics();
pixiLayers.fx.addChild(pxVisionOverlay);

function updatePixiVision(){
  // Vision overlay only in dungeon — town is safe zone with no dark vignette
  if(sc!=='map'||introActive||!inDungeon||isTouchDevice){pxVisionOverlay.visible=false;return;}
  pxVisionOverlay.visible=true;
  pxVisionOverlay.clear();
  // Draw dark overlay with circular hole at player position
  const px=pl[0].visualX-camX+TW/2, py=pl[0].visualY-camY+TH/2;
  pxVisionOverlay.beginFill(0x000000, 0.35);
  pxVisionOverlay.drawRect(0, 0, W, H);
  pxVisionOverlay.endFill();
  pxVisionOverlay.beginHole();
  pxVisionOverlay.drawCircle(px, py, 180);
  pxVisionOverlay.endHole();
}

// ═══════════════════════════════════════
// PIXI TITLE SCREEN EFFECTS
// ═══════════════════════════════════════
const pxTitleEffects = new PIXI.Container();
pixiLayers.fx.addChild(pxTitleEffects);

// Shooting stars
const pxShootingStars = [];
for(let i=0;i<3;i++){
  const star=new PIXI.Graphics();
  star.beginFill(0xFFFFFF);star.drawRect(0,0,2,2);star.endFill();
  star.visible=false;
  star.life=0;star.trail=[];
  pxTitleEffects.addChild(star);
  pxShootingStars.push(star);
}

// Title sparkle emitter (around "0xARK" text)
const pxTitleSparkles = [];

function updatePixiTitleEffects(){
  pxTitleEffects.visible = (sc==='title' && !creditsActive && mp.mpScreen==='off');
  if(!pxTitleEffects.visible)return;

  // Spawn shooting stars occasionally
  for(let _si=0;_si<pxShootingStars.length;_si++){
    const star=pxShootingStars[_si];
    if(!star.visible && Math.random()<0.003){
      star.x = Math.random()*W;
      star.y = Math.random()*150;
      star.vx = 3+Math.random()*2;
      star.vy = 1+Math.random()*1;
      star.life = 40;
      star.visible = true;
      star.trail = [];
    }
    if(star.visible){
      star.x += star.vx;
      star.y += star.vy;
      star.life--;
      star.alpha = star.life/40;
      if(star.life<=0 || star.x>W+20){star.visible=false;}
    }
  }

  // Spawn title sparkles around the 0xARK text area
  if(Math.random()<0.15){
    const sparkle=new PIXI.Graphics();
    const c=Math.random()>0.5?0xF0C830:0xFFFFFF;
    sparkle.beginFill(c);sparkle.drawRect(0,0,2,2);sparkle.endFill();
    sparkle.x = W/2-80+Math.random()*160;
    sparkle.y = 180+Math.random()*40;
    sparkle.vx = (Math.random()-0.5)*0.5;
    sparkle.vy = -Math.random()*0.8;
    sparkle.life = 30+Math.random()*20;
    sparkle.maxLife = sparkle.life;
    pxTitleEffects.addChild(sparkle);
    pxTitleSparkles.push(sparkle);
  }
  for(let i=pxTitleSparkles.length-1;i>=0;i--){
    const s=pxTitleSparkles[i];
    s.x+=s.vx;s.y+=s.vy;s.life--;
    s.alpha = s.life/s.maxLife;
    if(s.life<=0){
      pxTitleEffects.removeChild(s);s.destroy();
      pxTitleSparkles.splice(i,1);
    }
  }
}

// PixiJS particle pool for sparkle effects
const pxParticles = [];
function pxSpawnParticle(x, y, color, count, speed, life) {
  for (let i = 0; i < (count||5); i++) {
    const p = new PIXI.Graphics();
    p.beginFill(color||0xFFFFFF); p.drawRect(0, 0, 2, 2); p.endFill();
    p.x = x; p.y = y;
    const angle = Math.random() * Math.PI * 2;
    const spd = (speed||2) * (0.5 + Math.random());
    p.vx = Math.cos(angle) * spd;
    p.vy = Math.sin(angle) * spd;
    p.life = (life||30) + Math.random() * 15;
    p.maxLife = p.life;
    pixiLayers.fx.addChild(p);
    pxParticles.push(p);
  }
}
function pxUpdateParticles() {
  for (let i = pxParticles.length - 1; i >= 0; i--) {
    const p = pxParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) { pixiLayers.fx.removeChild(p); p.destroy(); pxParticles.splice(i, 1); }
  }
}

// ═══════════════════════════════════════
// PIXI MENU SYSTEM
// ═══════════════════════════════════════
const pxMenuContainer = new PIXI.Container();
pxMenuContainer.visible = false;
pxMenuContainer.x = W; // start offscreen right
pixiLayers.ui.addChild(pxMenuContainer);

// Build menu
const MENU_ITEMS=['CARDS','MAP','LOG','STATS','USE CARD','DISCARD','WALLET','TEXT SPD','SAVE','RULES','NEW GAME','CLOSE'];
const MENU_COLORS=[0xF0E8C0,0xF0E8C0,0xC04040,0xF0E8C0,0x3090C0,0x9060C0,0xB06030,0x40D080,0xC0A040,0x40A0D0,0xD8B028,0xC04040,0x686868];
const pxMenuBg = pxWin(200, 340);
pxMenuContainer.addChild(pxMenuBg);
const pxMenuTexts = [];
const pxMenuCursor = pxCursor();
pxMenuCursor.x = 8; pxMenuCursor.y = 0;
pxMenuContainer.addChild(pxMenuCursor);
MENU_ITEMS.forEach((item, i) => {
  const t = new PIXI.Text(item, new PIXI.TextStyle({fontFamily:'VT323',fontSize:20,fill:MENU_COLORS[i]}));
  t.x = 24; t.y = 12 + i * 24;
  pxMenuContainer.addChild(t);
  pxMenuTexts.push(t);
});

let pxMenuOpen = false;
function pxOpenMenu() {
  pxMenuOpen = true; pxMenuContainer.visible = true;
  pxSlideIn(pxMenuContainer, W, W - 210, 10, 10, 0.15);
}
function pxCloseMenu() {
  pxMenuOpen = false; pxMenuDim.visible = false;
  pxSlideIn(pxMenuContainer, pxMenuContainer.x, W, 10, 10, 0.1, () => { pxMenuContainer.visible = false; });
}
function pxUpdateMenu() {
  if (!pxMenuOpen) return;
  // Update cursor position with bounce
  const targetY = 15 + mi * 24;
  pxMenuCursor.y = targetY + _sFr15 * 1.5;
  // Update dynamic labels (indices must match MENU_ITEMS order)
  const walletIdx = MENU_ITEMS.indexOf('WALLET');
  const textSpdIdx = MENU_ITEMS.indexOf('TEXT SPD');
  if (walletIdx>=0&&pxMenuTexts[walletIdx]) pxMenuTexts[walletIdx].text = walletConnected ? 'WALLET (' + walletAddressTruncated() + ')' : 'WALLET (OFF)';
  if (textSpdIdx>=0&&pxMenuTexts[textSpdIdx]) pxMenuTexts[textSpdIdx].text = 'TEXT SPD: ' + TEXT_SPEED_LABELS[textSpeedIdx];
  // Highlight selected
  for(let i=0;i<pxMenuTexts.length;i++){pxMenuTexts[i].alpha=i===mi?1:0.65;}
}

// Dim overlay behind menu
const pxMenuDim = new PIXI.Graphics();
pxMenuDim.beginFill(0x000000, 0.4); pxMenuDim.drawRect(0, 0, W, H); pxMenuDim.endFill();
pxMenuDim.visible = false;
pixiLayers.ui.addChildAt(pxMenuDim, 0);

// ═══════════════════════════════════════
// PIXI TEXTBOX (bottom screen FRLG dialog)
// ═══════════════════════════════════════
const pxTextbox = new PIXI.Container();
pxTextbox.visible = false;
const pxTextboxBg = pxWin(W - 40, 80);
pxTextboxBg.x = 20; pxTextboxBg.y = H - 100;
pxTextbox.addChild(pxTextboxBg);
const pxTextboxTw = new PxTypewriter(
  new PIXI.TextStyle({fontFamily:'VT323',fontSize:22,fill:PX_FRLG.textColor,wordWrap:true,wordWrapWidth:W-80}),
  W - 80
);
pxTextboxTw.text.x = 36; pxTextboxTw.text.y = H - 88;
pxTextbox.addChild(pxTextboxTw.text);
// Bouncing advance arrow
const pxTextboxArrow = pxTextShadow('\u25BC', 18, PX_FRLG.selHighlight);
pxTextboxArrow.x = W - 60; pxTextboxArrow.y = H - 30;
pxTextbox.addChild(pxTextboxArrow);
pixiLayers.ui.addChild(pxTextbox);

// Show/hide PIXI textbox
function pxShowTextbox(str) {
  pxTextbox.visible = true;
  pxTextboxTw.set(str);
}
function pxHideTextbox() { pxTextbox.visible = false; }

// Update PixiJS HUD each frame (called from game loop)
function updatePixiHud(){
  if(_isMobile)return; // mobile: canvas shown directly, skip PixiJS overhead
  // canvasTex.update() removed — canvas c shown directly below PixiJS overlay (no texture upload)
  // Update typewriter
  pxTextboxTw.tick(dt||1);
  // Bounce textbox arrow + auto-hide
  if(pxTextbox.visible){
    pxTextboxArrow.y = H - 30 + _sFr12 * 3; // v363: use pre-computed _sFr12
    pxTextboxArrow.visible = pxTextboxTw.done;
    // Auto-hide after 4 seconds of done
    if(pxTextboxTw.done){
      if(!pxTextbox._hideTimer)pxTextbox._hideTimer=0;
      pxTextbox._hideTimer++;
      if(pxTextbox._hideTimer>240){pxTextbox.visible=false;pxTextbox._hideTimer=0;}
    }else{pxTextbox._hideTimer=0;}
  }
  // Season timer — v307: update only when minute changes (not every frame)
  const sr=getSeasonRemaining();
  const _nowMin=Math.floor(Date.now()/60000);
  if(_timeLblLastMin!==_nowMin){_timeLblLastMin=_nowMin;_timeLblCache=formatTimeRemaining(sr);}
  pixiHud.seasonTimer.text=_timeLblCache;
  pixiHud.seasonTimer.style.fill=sr<3600000?'#d04040':sr<86400000?'#d0a030':'#40a040';
  // Card progress (GDD v1.0: X/60 cards) — v307: cache string, rebuild only on change
  const unique=hasUniqueCards(0).size;
  const _cpKey=unique*12+(inDungeon?currentFloor+6:0); // pack: unique(0-60)*12 + floor(0-5)+6 if dungeon
  if(_cardPrgKey!==_cpKey){_cardPrgKey=_cpKey;_cardPrgCache=unique+'/60'+(inDungeon?' [FLOOR '+currentFloor+']':'');}
  pixiHud.cardProgress.text=_cardPrgCache;
  pixiHud.cardProgress.style.fill=unique>=60?'#40d040':unique>=30?'#f0c830':'#c0d0f0';
  // Battle/status info — v307: cache, rebuild only when rd/sp change
  const _bcKey=rd*1000+sp.s*100+sp.b*10+sp.c;
  if(_btlCountKey!==_bcKey){_btlCountKey=_bcKey;_btlCountCache='Round '+rd+'  STL:'+sp.s+' BAR:'+sp.b+' SCT:'+sp.c;}
  pixiHud.battleCount.text=_btlCountCache;
  // Rival warning
  pixiHud.rivalWarning.visible=rivalWinWarning>0&&Math.floor(fr/15)%2===0;
  // Show HUD on map screen, menu always available
  const showHudText=(sc==='map'&&!introActive&&!mo);
  pixiHud.seasonTimer.visible=showHudText;
  pixiHud.battleCount.visible=showHudText;
  pixiHud.cardProgress.visible=showHudText;
  pixiHud.rivalWarning.visible=showHudText&&rivalWinWarning>0&&Math.floor(fr/15)%2===0;
  // Update PixiJS menu + intro + particles + vision + title + aura
  pxUpdateMenu();
  updatePixiIntro();
  pxUpdateParticles();
  updatePixiVision();
  updatePixiTitleEffects();
  updatePixiPlayerAura();
  // Sync menu close when mo changes
  if(!mo&&pxMenuOpen){pxCloseMenu();}
}

// ═══════════════════════════════════════
// KENNEY PIRATE SPRITE SHEET
// ═══════════════════════════════════════
const PIRATE_SHEET = new Image();
PIRATE_SHEET.src = 'pirates-tilemap.png';
let pirateSheetLoaded = false;
PIRATE_SHEET.onload = () => { pirateSheetLoaded = true; };

// Kenney tilemap: 272x128, 16x16 tiles, 1px spacing, 17 cols x 8 rows
function drawKenneyTile(col, row, destX, destY, scale) {
  if (!pirateSheetLoaded) return false;
  const sx = col * 17;
  const sy = row * 17;
  g.drawImage(PIRATE_SHEET, sx, sy, 16, 16, destX, destY, 16 * scale, 16 * scale);
  return true;
}

// Tinted version: draws monochrome Kenney tile with a color overlay
// Uses an offscreen canvas to avoid corrupting the main context compositing
const _kenneyTintCanvas = document.createElement('canvas');
_kenneyTintCanvas.width = 64; _kenneyTintCanvas.height = 64;
const _kenneyTintCtx = _kenneyTintCanvas.getContext('2d');

function drawKenneyTileTinted(col, row, destX, destY, scale, color) {
  if (!pirateSheetLoaded) return false;
  const w = 16 * scale, h = 16 * scale;
  // Ensure temp canvas is big enough
  if (_kenneyTintCanvas.width < w || _kenneyTintCanvas.height < h) {
    _kenneyTintCanvas.width = w; _kenneyTintCanvas.height = h;
  }
  _kenneyTintCtx.clearRect(0, 0, w, h);
  _kenneyTintCtx.globalCompositeOperation = 'source-over';
  _kenneyTintCtx.drawImage(PIRATE_SHEET, col * 17, row * 17, 16, 16, 0, 0, w, h);
  _kenneyTintCtx.globalCompositeOperation = 'source-atop';
  _kenneyTintCtx.fillStyle = color;
  _kenneyTintCtx.fillRect(0, 0, w, h);
  _kenneyTintCtx.globalCompositeOperation = 'source-over';
  g.drawImage(_kenneyTintCanvas, 0, 0, w, h, destX, destY, w, h);
  return true;
}

// ═══════════════════════════════════════
// WORLD TILESET (LPC Terrain v7, CC-BY-SA 3.0)
// world-tileset.png: 1024x2048, 32x32 tiles, 32 cols x 64 rows
// ═══════════════════════════════════════
const WORLD_SHEET = new Image();
WORLD_SHEET.src = 'world-tileset.png';
let worldSheetLoaded = false;
WORLD_SHEET.onload = () => { worldSheetLoaded = true; };

// LPC tile coordinate map (col, row) — identified by color sampling
// Each tile drawn at scale 1 = 32x32, matching game TW/TH
const WT = {
  grass:      [1,  8],  // solid green grass center
  grassAlt:   [2,  9],  // grass variant
  grassEdge:  [4, 10],  // grass with edge detail
  dirt:       [3,  1],  // dirt/brown ground
  dirtAlt:    [4,  1],  // dirt variant
  sand:       [16, 8],  // sandy/beige ground
  sandAlt:    [17, 9],  // sand variant
  water:      [4, 14],  // deep blue water
  waterAlt:   [5, 15],  // water variant
  waterShore: [22,14],  // water with lighter shore look
  snow:       [18, 9],  // white/snow tile
};

function drawWorldTile(col, row, destX, destY) {
  if (!worldSheetLoaded) return false;
  const sx = col * 32, sy = row * 32;
  g.drawImage(WORLD_SHEET, sx, sy, 32, 32, destX, destY, 32, 32);
  return true;
}

// ═══════════════════════════════════════
// DUNGEON TILESET (Kenney Tiny Dungeon, CC0)
// dungeon-tileset.png: 11 cols x 2 rows, 16x16 tiles, 1px gap
// ═══════════════════════════════════════
const DUNGEON_SHEET = new Image();
DUNGEON_SHEET.src = 'dungeon-tileset.png';
let dungeonSheetLoaded = false;
DUNGEON_SHEET.onload = () => { dungeonSheetLoaded = true; };

// Tile index → pixel position in sheet: col = idx%11, row = idx//11, x = col*17, y = row*17
const DT = {
  wallBrick:   0,   // solid red brick wall
  wallTop:     1,   // brick wall with stone cap
  wallDark:    2,   // dark brick variant
  platform:    3,   // stone platform/shelf
  platformC:   4,   // platform center
  wallLight:   5,   // lighter brick wall
  doorFrame:   6,   // blue/tech door frame
  floorGlyph:  7,   // gray stone with circular glyph
  floorGem:    8,   // gray stone with green gem
  floorChest:  9,   // gray stone with chest feature
  chest:       10,  // orange chest/box
  chestAlt:    11,  // chest variant / first of row2
  floorPlain:  14,  // plain gray stone floor
  floorAlt:    15,  // alt gray stone floor
  pillar:      16,  // vertical pillar element
  gargoyle1:   17,  // stone face left
  gargoyle2:   18,  // stone face center
  gargoyle3:   19,  // stone face right
};

function drawDungeonTile(idx, destX, destY, scale) {
  if (!dungeonSheetLoaded) return false;
  const col = idx % 11;
  const row = Math.floor(idx / 11);
  const sx = col * 17;
  const sy = row * 17;
  const dw = 16 * scale, dh = 16 * scale;
  g.imageSmoothingEnabled = false;
  g.drawImage(DUNGEON_SHEET, sx, sy, 16, 16, destX, destY, dw, dh);
  return true;
}

// ═══════════════════════════════════════
// CRAFTPIX ASSET SHEETS
// craftpix-exterior.png : 240x800 — town buildings, trees, props (16px base grid)
// craftpix-walls.png    : 144x176 — dungeon walls/floor tiles
// craftpix-ground.png   : 336x288 — grass/dirt scatter details
// craftpix-ruins1-5.png : individual ruin prop sprites (blue-gray, dark texture)
// craftpix-trees.png    : animated trees spritesheet
// ═══════════════════════════════════════
const CPX_EXT   = new Image(); CPX_EXT.src   = 'craftpix-exterior.png';
const CPX_WALL  = new Image(); CPX_WALL.src  = 'craftpix-walls.png';
const CPX_GND   = new Image(); CPX_GND.src   = 'craftpix-ground.png';
const CPX_TREES = new Image(); CPX_TREES.src = 'craftpix-trees.png';
let cpxExtLoaded=false, cpxWallLoaded=false, cpxGndLoaded=false, cpxTreesLoaded=false;
CPX_EXT.onload  = ()=>{ cpxExtLoaded=true; };
CPX_WALL.onload = ()=>{ cpxWallLoaded=true; };
CPX_GND.onload  = ()=>{ cpxGndLoaded=true; };
CPX_TREES.onload= ()=>{ cpxTreesLoaded=true; };

// Ruins props: 5 individual images per color variant
const CPX_RUINS = Array.from({length:5},(_,i)=>{ const img=new Image(); img.src=`craftpix-ruins${i+1}.png`; return img; });
const cpxRuinsLoaded = Array(5).fill(false);
CPX_RUINS.forEach((img,i)=>{ img.onload=()=>{ cpxRuinsLoaded[i]=true; }; });

// Draw a region from the exterior sheet at 1× scale (16px tiles)
// sx,sy = source pixel coords in craftpix-exterior.png; sw,sh = source size
function drawCpxExt(sx,sy,sw,sh,destX,destY,scale){
  if(!cpxExtLoaded)return false;
  const s=scale||2;
  g.imageSmoothingEnabled=false;
  g.drawImage(CPX_EXT,sx,sy,sw,sh,destX,destY,sw*s,sh*s);
  return true;
}

// Draw dungeon wall/floor region from craftpix-walls.png
function drawCpxWall(sx,sy,sw,sh,destX,destY,scale){
  if(!cpxWallLoaded)return false;
  const s=scale||2;
  g.imageSmoothingEnabled=false;
  g.drawImage(CPX_WALL,sx,sy,sw,sh,destX,destY,sw*s,sh*s);
  return true;
}

// Draw a ruins prop (idx 0-4) at dest position, optionally scaled
function drawCpxRuin(idx,destX,destY,scale){
  if(!cpxRuinsLoaded[idx])return false;
  const img=CPX_RUINS[idx];
  const s=scale||1;
  g.imageSmoothingEnabled=false;
  g.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,destX,destY,img.naturalWidth*s,img.naturalHeight*s);
  return true;
}

// ═══════════════════════════════════════
// MIDJOURNEY MAP BACKGROUNDS
// bg-town.jpg   : port town night scene   (map 0)
// bg-dungeon1.jpg : shallow dungeon       (maps 1-2)
// bg-dungeon2.jpg : mid dungeon           (maps 3-4)
// bg-dungeon3.jpg : deepest floor         (map 5)
// All 1280x960 (4:3) — drawn as scrolling base layer behind tiles
// ═══════════════════════════════════════
const BG_SHEETS = [null,null,null,null]; // indices: 0=town, 1=dung1-2, 2=dung3-4, 3=dung5
const BG_LOADED = [false,false,false,false];
const BG_FILES  = ['bg-town.jpg','bg-dungeon1.jpg','bg-dungeon2.jpg','bg-dungeon3.jpg'];
BG_FILES.forEach((f,i)=>{
  const img=new Image();
  img.src=f;
  img.onload=()=>{BG_SHEETS[i]=img;BG_LOADED[i]=true;};
  // no error handler — graceful fallback to tile-only rendering
});

// Returns the bg image for a given map index (0=town, 1-5=dungeon)
function getBgSheet(mapIdx){
  if(mapIdx===0)return BG_LOADED[0]?BG_SHEETS[0]:null;
  if(mapIdx<=2)return BG_LOADED[1]?BG_SHEETS[1]:null;
  if(mapIdx<=4)return BG_LOADED[2]?BG_SHEETS[2]:null;
  return BG_LOADED[3]?BG_SHEETS[3]:null;
}

// Draw Midjourney background behind tiles — scrolls with camera
// World is MW×MH tiles = 1280×960px; bg image matches exactly
function drawMapBg(mapIdx){
  const bg=getBgSheet(mapIdx);
  if(!bg)return;
  g.imageSmoothingEnabled=true;
  g.globalAlpha=1;
  g.drawImage(bg,-camX,-camY,MW*TW,MH*TH);
  g.imageSmoothingEnabled=false;
}

// ═══════════════════════════════════════
// ZELDA-LIKE CHARACTER SPRITES (CC0 / public domain)
// zelda-character.png: 272x256, 16x16 tiles, 17 cols x 16 rows, no gap
// Layout: each character occupies 3 cols (walk frames) × 4 rows (directions)
//   charIdx 0 → cols 0-2   (protagonist)
//   charIdx 1 → cols 3-5   (rival 1)
//   charIdx 2 → cols 6-8   (rival 2)
//   charIdx 3 → cols 9-11  (NPC type A)
//   charIdx 4 → cols 12-14 (NPC type B)
// Frame:  0=left-stride, 1=neutral, 2=right-stride
// Dir row: 0=down, 1=left, 2=right, 3=up
// ═══════════════════════════════════════
const ZELDA_CHAR_SHEET = new Image();
ZELDA_CHAR_SHEET.src = 'zelda-character.png';
let zeldaCharLoaded = false;
ZELDA_CHAR_SHEET.onload = () => { zeldaCharLoaded = true; };

function drawZeldaChar(charIdx, dir, frame, destX, destY, scale) {
  if (!zeldaCharLoaded) return false;
  const baseCol = charIdx * 3;
  const col = baseCol + (frame % 3);
  const row = dir;  // 0=down,1=left,2=right,3=up
  const sx = col * 16, sy = row * 16;
  g.imageSmoothingEnabled = false;
  g.drawImage(ZELDA_CHAR_SHEET, sx, sy, 16, 16, destX, destY, 16 * scale, 16 * scale);
  return true;
}

// ═══════════════════════════════════════
// ZELDA-LIKE OVERWORLD TILES (CC0 / public domain)
// zelda-overworld.png: 640x576, 16x16 tiles, 40 cols x 36 rows, no gap
// ═══════════════════════════════════════
const ZELDA_OVER_SHEET = new Image();
ZELDA_OVER_SHEET.src = 'zelda-overworld.png';
let zeldaOverLoaded = false;
ZELDA_OVER_SHEET.onload = () => { zeldaOverLoaded = true; if(typeof tileCacheDirty!=='undefined')tileCacheDirty=true; };

// Zelda overworld tile coordinates [col, row] (16×16 each)
const ZO = {
  grass:     [0, 0],    // green grass
  grassAlt:  [1, 0],    // grass variant
  path:      [2, 1],    // dirt path
  water:     [0, 4],    // water
  sand:      [4, 2],    // sand/beach
  tree:      [0, 8],    // tree top (2x2 tile structure)
  bush:      [3, 8],    // bush
  house1:    [4, 4],    // house wall
  roof:      [4, 3],    // roof
  cliff:     [0, 6],    // cliff/wall
  dock:      [6, 6],    // dock planks
};

function drawZeldaOverTile(col, row, destX, destY, scale) {
  if (!zeldaOverLoaded) return false;
  const s = scale || 2;
  g.imageSmoothingEnabled = false;
  g.drawImage(ZELDA_OVER_SHEET, col * 16, row * 16, 16, 16, destX, destY, 16 * s, 16 * s);
  return true;
}

// ═══════════════════════════════════════
// CRAFTPIX FOREST OBJECT SPRITES
// Individual top-down pixel art tree/mushroom PNGs (CC licensed from craftpix.net)
// ═══════════════════════════════════════
// CPX_FOREST: individual craftpix top-down tree/mushroom PNGs (different from CPX_TREES spritesheet)
const CPX_FOREST = [];
const _cpxForestFiles = [
  'cpx-forest-Curved_tree1.png',          // 128x128
  'cpx-forest-Curved_tree2.png',          // 128x128
  'cpx-forest-Willow1.png',               // 128x128
  'cpx-forest-Willow2.png',               // 128x128
  'cpx-forest-Blue-green_balls_tree1.png',// 128x128
  'cpx-forest-Luminous_tree1.png',        // 128x128
  'cpx-forest-Mega_tree1.png',            // 256x256
  'cpx-forest-Mega_tree2.png',            // 128x128
];
let cpxForestLoaded = 0; // count of successfully loaded forest props
_cpxForestFiles.forEach(f => {
  const img = new Image();
  img.src = f;
  img.onload = () => { cpxForestLoaded++; if(typeof tileCacheDirty!=='undefined')tileCacheDirty=true; };
  img.onerror = () => {}; // silently skip missing files
  CPX_FOREST.push(img);
});
const CPX_MUSHROOMS = [];
const _cpxMushFiles = [
  'cpx-forest-Beige_green_mushroom1.png', // 128x128
  'cpx-forest-Beige_green_mushroom2.png', // 64x64
];
_cpxMushFiles.forEach(f => {
  const img = new Image();
  img.src = f;
  img.onload = () => { cpxForestLoaded++; };
  img.onerror = () => {};
  CPX_MUSHROOMS.push(img);
});

// Draw a craftpix prop at destX,destY with smooth scaling
function drawCpxProp(img, destX, destY, drawW, drawH) {
  if (!img.complete || !img.naturalWidth) return false;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = true;
  g.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, destX, destY, drawW, drawH);
  g.imageSmoothingEnabled = prev;
  return true;
}

// Per-tile-type toggle: true = use Kenney sprites, false = keep fillRect art
const useKenney = {
  water: true,
  grass: true,
  path: true,
  sand: true,
  tree: true,
  pine: true,
  palm: true,
  bush: true,
  rock: true,
  building: true,
  dock: true,
  fence: true,
  signpost: true,
  fountain: true,
  mountain: true,
  cave: true,
  ruins: true,
  treasure: true,
  campfire: true,
  mushroom: true,
  // Keep custom art for these (Kenney monochrome doesn't add value)
  flower: false,
  tallGrass: false,
  lake: false,
  lighthouse: false,
  lava: false,
  crystal: false,
  altar: false,
  glowTile: false,
};

// Kenney tile coordinate map (col, row) for each game tile type
// Mapped from Kenney Monochrome Pirates tileset (17 cols x 8 rows, 16x16px, 1px spacing)
// Verified by visual inspection of tilemap.png
const K = {
  // ── WATER & TERRAIN TRANSITIONS (rows 0-1, cols 0-5) ──
  // The top-left area contains water body + land transition tiles
  treasureMap:  [0, 0],   // treasure/island map icon
  waterCenter:  [1, 0],   // open water (light, center)
  waterEdgeL:   [2, 0],   // water with land on left
  waterCornerTL:[3, 0],   // water corner: land top-left
  waterEdgeB:   [4, 0],   // water with land below
  waterEdgeR:   [5, 0],   // water with land on right

  // Row 1 terrain transitions
  waterEdgeT:   [0, 1],   // water with land above
  waterCornerTR:[1, 1],   // water corner: land top-right
  waterCornerBL:[2, 1],   // water corner: land bottom-left
  waterCornerBR:[3, 1],   // water corner: land bottom-right
  landCenter:   [4, 1],   // solid land/grass center
  landAlt:      [5, 1],   // alternate land tile

  // ── LARGE SHIP (rows 0-4, cols 6-16) ──
  // The right side of the tilemap is a large multi-tile ship
  shipTL:       [6, 0],
  shipTC1:      [7, 0],
  shipTC2:      [8, 0],
  shipTC3:      [9, 0],
  shipTC4:      [10, 0],
  shipTC5:      [11, 0],
  shipTR:       [12, 0],

  // ── STRUCTURES & BUILDINGS (rows 2-3, cols 0-5) ──
  wall1:        [0, 2],   // stone wall variant 1
  wall2:        [1, 2],   // stone wall variant 2
  wall3:        [2, 2],   // stone wall variant 3
  door:         [3, 2],   // wooden door
  window1:      [4, 2],   // window variant 1
  window2:      [5, 2],   // window variant 2

  fenceH:       [0, 3],   // horizontal fence
  fenceV:       [1, 3],   // vertical fence
  fencePost:    [2, 3],   // fence post / corner
  dock1:        [3, 3],   // dock plank
  dock2:        [4, 3],   // dock post
  bridge:       [5, 3],   // bridge segment

  // ── PROPS & VEGETATION (row 3, cols 6-16) ──
  well:         [6, 3],   // water well
  fountain:     [7, 3],   // stone fountain
  lamp:         [8, 3],   // street lamp
  bench:        [9, 3],   // wooden bench
  tree1:        [10, 3],  // leafy tree
  tree2:        [11, 3],  // pine/conifer tree
  palm1:        [12, 3],  // palm tree
  bush1:        [13, 3],  // bush/shrub
  rock1:        [14, 3],  // large rock
  rock2:        [15, 3],  // small rock
  campfire:     [16, 3],  // campfire

  // ── SMALL ITEMS (rows 4-5, cols 0-5) ──
  anchor:       [0, 4],   // ship anchor
  wheel:        [1, 4],   // ship wheel
  cannon:       [2, 4],   // cannon
  barrel:       [3, 4],   // barrel
  crate:        [4, 4],   // wooden crate
  sign:         [5, 4],   // signpost

  flag:         [0, 5],   // pirate flag
  bottle:       [1, 5],   // message bottle
  rope:         [2, 5],   // coiled rope
  net:          [3, 5],   // fishing net
  compass:      [4, 5],   // compass
  spyglass:     [5, 5],   // spyglass/telescope

  // ── BUILDING PIECES (row 2, cols 6-16) ──
  roofL:        [6, 2],   // roof left end
  roofM:        [7, 2],   // roof middle
  roofR:        [8, 2],   // roof right end
  building1:    [9, 2],   // building facade 1
  building2:    [10, 2],  // building facade 2
  building3:    [11, 2],  // building facade 3
  chimney:      [12, 2],  // chimney

  // ── SEA EFFECTS (row 4-5, cols 6-16) ──
  wave1:        [6, 4],   // wave animation frame 1
  wave2:        [7, 4],   // wave animation frame 2
  wave3:        [8, 4],   // wave animation frame 3
  plank:        [9, 4],   // wooden plank
  hullL:        [10, 4],
  hullM:        [11, 4],
  hullR:        [12, 4],

  // ── CHARACTERS (row 6) ──
  pirate1:      [0, 6],   // pirate with bandana
  pirate2:      [1, 6],   // pirate with hat
  pirate3:      [2, 6],   // pirate with eyepatch
  pirate4:      [3, 6],   // pirate crew
  captain:      [4, 6],   // captain
  parrot:       [5, 6],   // parrot
  skeleton:     [6, 6],   // skeleton
  ghost:        [7, 6],   // ghost
  crab:         [8, 6],   // crab
  octopus:      [9, 6],   // octopus
  shark:        [10, 6],  // shark
  fish:         [11, 6],  // fish
  seagull:      [12, 6],  // seagull
  monkey:       [13, 6],  // monkey
  snake:        [14, 6],  // snake
  rat:          [15, 6],  // rat
  mushroom1:    [16, 6],  // mushroom (last col)

  // ── ITEMS (row 7) ──
  chest:        [0, 7],   // closed treasure chest
  chestOpen:    [1, 7],   // open treasure chest
  coin:         [2, 7],   // gold coin
  gem:          [3, 7],   // gemstone
  key:          [4, 7],   // key
  map:          [5, 7],   // treasure map scroll
  scroll:       [6, 7],   // scroll
  sword:        [7, 7],   // sword
  hook:         [8, 7],   // pirate hook
  bomb:         [9, 7],   // bomb
  potion:       [10, 7],  // potion bottle
  hat:          [11, 7],  // pirate hat
  skull:        [12, 7],  // skull
  crossbones:   [13, 7],  // skull & crossbones
  lifering:     [14, 7],  // life ring
  jollyRoger:   [15, 7],  // jolly roger flag
};

// ═══════════════════════════════════════
// AUTO-TILING: neighbor-aware tile selection
// ═══════════════════════════════════════
// Water types for neighbor checks
const WATER_TILES = new Set([0, 17]);
const LAND_TILES = new Set([1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,22,23,24,25,26,27,28,29,30]);

function getWaterTileVariant(tx_, ty_) {
  const m = getMap();
  const get = (dx, dy) => {
    const nx = tx_ + dx, ny = ty_ + dy;
    if (nx < 0 || nx >= MW || ny < 0 || ny >= MH) return 0; // out of bounds = water
    return m[ny]?.[nx] ?? 0;
  };
  const landUp    = LAND_TILES.has(get(0, -1));
  const landDown  = LAND_TILES.has(get(0,  1));
  const landLeft  = LAND_TILES.has(get(-1, 0));
  const landRight = LAND_TILES.has(get( 1, 0));

  // Corners (two adjacent land sides)
  if (landUp && landLeft)  return K.waterCornerTL;
  if (landUp && landRight) return K.waterCornerTR;
  if (landDown && landLeft)  return K.waterCornerBL;
  if (landDown && landRight) return K.waterCornerBR;

  // Edges (one land side)
  if (landUp)    return K.waterEdgeT;
  if (landDown)  return K.waterEdgeB;
  if (landLeft)  return K.waterEdgeL;
  if (landRight) return K.waterEdgeR;

  // Open water center
  return K.waterCenter;
}

function getGrassTileVariant(tx_, ty_) {
  const m = getMap();
  const get = (dx, dy) => {
    const nx = tx_ + dx, ny = ty_ + dy;
    if (nx < 0 || nx >= MW || ny < 0 || ny >= MH) return 1;
    return m[ny]?.[nx] ?? 1;
  };
  // Check if neighbor is non-grass (water, sand, path, etc.)
  const diffUp    = WATER_TILES.has(get(0, -1)) || get(0, -1) === 4;
  const diffDown  = WATER_TILES.has(get(0,  1)) || get(0,  1) === 4;
  const diffLeft  = WATER_TILES.has(get(-1, 0)) || get(-1, 0) === 4;
  const diffRight = WATER_TILES.has(get( 1, 0)) || get( 1, 0) === 4;

  // If near an edge, use alternate land tile for subtle variation
  if (diffUp || diffDown || diffLeft || diffRight) return K.landAlt;

  // Interior grass: alternate between two variants
  return (tileHash(tx_, ty_) % 2 === 0) ? K.landCenter : K.landAlt;
}

// ═══════════════════════════════════════
// SMOOTH ANIMATION UTILITIES
// ═══════════════════════════════════════
function lerp(a,b,t){return a+(b-a)*t;}
function easeInOut(t){return t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);}
let lastTime=0,dt=1;

// Offscreen canvas caches for tile layer, edge blending, fog, vignette, and atmosphere
const tileCanvas=document.createElement('canvas');
tileCanvas.width=W;tileCanvas.height=H;
const tileCtx=tileCanvas.getContext('2d');
tileCtx.imageSmoothingEnabled=false;
let tileCacheDirty=true;
let tileCacheLastCamX=-9999,tileCacheLastCamY=-9999;
let tileCacheLastMap=-1;
let _tileCacheLastWt=-1; // track wt changes for lava/campfire animation

const edgeCanvas=document.createElement('canvas');
edgeCanvas.width=W;edgeCanvas.height=H;
const edgeCtx=edgeCanvas.getContext('2d');
let edgeCacheDirty=true;
let edgeCacheLastCamX=-9999,edgeCacheLastCamY=-9999;

const fogCanvas=document.createElement('canvas');
fogCanvas.width=W;fogCanvas.height=H;
const fogCtx=fogCanvas.getContext('2d');
let fogCacheDirty=true;
let fogCacheLastCamX=-9999,fogCacheLastCamY=-9999;

// Dungeon vignette (radial cone) — cached per player visual position + floor
const dungeonVigCanvas=document.createElement('canvas');
dungeonVigCanvas.width=W;dungeonVigCanvas.height=H;
const dungeonVigCtx=dungeonVigCanvas.getContext('2d');
let _dvLastPX=-9999,_dvLastPY=-9999,_dvLastFloor=-1;

// Atmosphere canvas — day/night overlay cached per camera pos + phase
const atmosCanvas=document.createElement('canvas');
atmosCanvas.width=W;atmosCanvas.height=H;
const atmosCtx=atmosCanvas.getContext('2d');
let _atmosDirty=true;
let _atmosLastCamX=-9999,_atmosLastCamY=-9999,_atmosLastPhase='';

// Ambient particle cache — dungeon/town floating particles (update every 2 frames)
const partCanvas=document.createElement('canvas');
partCanvas.width=W;partCanvas.height=H;
const partCtx=partCanvas.getContext('2d');
let _partFrame=-9999;
let _partMap=-1;

// Dungeon edge vignette cache — breathing color edge strips (update every 3 frames)
const dvigCanvas=document.createElement('canvas');
dvigCanvas.width=W;dvigCanvas.height=H;
const dvigCtx=dvigCanvas.getContext('2d');
let _dvigFrame=-9999;
let _dvigFloor=-1;

// Fog ambient particle cache — world-space dungeon floor motes (update every 3 frames)
const fogAmbCanvas=document.createElement('canvas');
fogAmbCanvas.width=W;fogAmbCanvas.height=H;
const fogAmbCtx=fogAmbCanvas.getContext('2d');
let _fogAmbFrame=-9999;
let _fogAmbFloor=-1;

// Minimap layer caches — base tiles (updated on fog/map change) + shimmer (updated every 4 frames)
const mmW_=130,mmH_=88;
const mmBaseCanvas=document.createElement('canvas');mmBaseCanvas.width=mmW_;mmBaseCanvas.height=mmH_;
const mmBaseCtx=mmBaseCanvas.getContext('2d');
let _mmBaseMap=-1,_mmBaseFrame=-9999;
const mmAnimCanvas=document.createElement('canvas');mmAnimCanvas.width=mmW_;mmAnimCanvas.height=mmH_;
const mmAnimCtx=mmAnimCanvas.getContext('2d');
let _mmAnimFrame=-9999;

// GBA-style scanlines — pre-baked once; single drawImage per frame (zero per-frame cost)
const scanCanvas=document.createElement('canvas');
scanCanvas.width=W;scanCanvas.height=H;
{
  const sc2=scanCanvas.getContext('2d');
  sc2.fillStyle='rgba(0,0,0,0.032)';
  for(let y=0;y<H;y+=2)sc2.fillRect(0,y,W,1);
}

// v210: Pre-baked battle rival vignettes — VEGA (magenta) + MIRA (gold), built once
const _btlVigVega=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  const gr=x.createRadialGradient(W*0.7,H*0.25,H*0.1,W*0.7,H*0.25,H*0.65);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(160,20,100,0.14)');
  x.fillStyle=gr;x.fillRect(0,0,W,H);
  return c;
})();
const _btlVigMira=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  const gr=x.createRadialGradient(W*0.75,H*0.2,H*0.1,W*0.75,H*0.2,H*0.65);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(160,120,0,0.13)');
  x.fillStyle=gr;x.fillRect(0,0,W,H);
  return c;
})();

// Set imageSmoothingEnabled=false globally on main context once canvases exist
g.imageSmoothingEnabled=false;

// ═══════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════
const AC=new(window.AudioContext||window.webkitAudioContext)();
let soundEnabled=localStorage.getItem('oxark_sound')!=='off';
// FRLG Text Speed setting: 0=SLOW, 1=NORMAL, 2=FAST
const TEXT_SPEEDS=[0.18,0.33,0.55];
const TEXT_SPEED_LABELS=['SLOW','NORMAL','FAST'];
let textSpeedIdx=parseInt(localStorage.getItem('oxark_textspeed')||'1',10);
if(textSpeedIdx<0||textSpeedIdx>2)textSpeedIdx=1;
function getTextSpeed(){return TEXT_SPEEDS[textSpeedIdx]||0.33;}
let audioResumed=false;
function resumeAudio(){if(!audioResumed&&AC.state==='suspended'){AC.resume();audioResumed=true;}}
document.addEventListener('keydown',resumeAudio,{once:true});
document.addEventListener('click',resumeAudio,{once:true});

// Noise buffer for wave/wind/whoosh effects
const NOISE_LEN=AC.sampleRate*2;
const noiseBuf=AC.createBuffer(1,NOISE_LEN,AC.sampleRate);
(function(){const d=noiseBuf.getChannelData(0);for(let i=0;i<NOISE_LEN;i++)d[i]=Math.random()*2-1;})();

function beep(f,d,v){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=f;gn.gain.value=v||.08;o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+(d||.06));}catch(e){}}
function sfxSelect(){if(!soundEnabled)return;beep(880,.04);setTimeout(()=>beep(1320,.04),40);}
function sfxMove(){if(!soundEnabled)return;beep(440,.02,.05);}
// FRLG-style distinct cursor click when moving between menu items
function sfxCursor(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=1200;gn.gain.setValueAtTime(.04,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.02);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.02);}catch(e){}}
function sfxConfirm(){if(!soundEnabled)return;beep(660,.05);setTimeout(()=>beep(990,.08),60);}
function sfxBack(){if(!soundEnabled)return;beep(330,.05,.06);}
function sfxVictory(){if(!soundEnabled)return;beep(262,.1);setTimeout(()=>beep(330,.1),100);setTimeout(()=>beep(392,.1),200);setTimeout(()=>beep(523,.2),300);}
// v420: descending minor-key arpeggio for defeat screen
function sfxDefeat(){if(!soundEnabled)return;beep(196,.12,.08);setTimeout(()=>beep(165,.10,.08),130);setTimeout(()=>beep(147,.10,.08),260);setTimeout(()=>beep(110,.18,.12),400);}
function sfxCardGet(){if(!soundEnabled)return;beep(440,.06);setTimeout(()=>beep(550,.06),60);setTimeout(()=>beep(660,.08),120);}
function sfxSlash(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,AC.currentTime);o.frequency.linearRampToValueAtTime(50,AC.currentTime+.1);gn.gain.value=.1;o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.1);}catch(e){}}
function sfxShield(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.setValueAtTime(300,AC.currentTime);o.frequency.linearRampToValueAtTime(800,AC.currentTime+.08);gn.gain.value=.07;o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.08);}catch(e){}}
function sfxDamage(){if(!soundEnabled)return;beep(100,.06,.1);setTimeout(()=>beep(100,.06,.1),80);}
function sfxEncounter(){if(!soundEnabled)return;beep(220,.08,.07);setTimeout(()=>beep(330,.06,.07),80);setTimeout(()=>beep(440,.1,.08),160);}
function sfxEvent(){if(!soundEnabled)return;beep(330,.06,.06);setTimeout(()=>beep(440,.04,.06),60);setTimeout(()=>beep(550,.06,.06),120);}
function sfxShop(){if(!soundEnabled)return;beep(660,.04,.06);setTimeout(()=>beep(880,.06,.06),50);}

// ── ENVIRONMENTAL SFX ──
function sfxStep(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=800;f.Q.value=1;gn.gain.setValueAtTime(.02,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.02);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.02);}catch(e){}}
function sfxGrassRustle(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=2000;gn.gain.setValueAtTime(.035,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.06);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.06);}catch(e){}}
function sfxWaterNear(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=600;f.Q.value=2;gn.gain.setValueAtTime(.03,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.08);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.08);}catch(e){}}
function sfxDoorOpen(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(200,AC.currentTime);o.frequency.linearRampToValueAtTime(600,AC.currentTime+.12);gn.gain.setValueAtTime(.06,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.12);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.12);}catch(e){}}
function sfxShopOpen(){if(!soundEnabled)return;try{const o1=AC.createOscillator(),o2=AC.createOscillator(),gn=AC.createGain();o1.type='square';o2.type='square';o1.frequency.value=880;o2.frequency.value=1100;gn.gain.value=.06;o1.connect(gn);gn.connect(AC.destination);o1.start();o1.stop(AC.currentTime+.06);setTimeout(()=>{try{o2.connect(gn);o2.start();o2.stop(AC.currentTime+.08);}catch(e){}},70);}catch(e){}}
function sfxShopTrade(){if(!soundEnabled)return;try{const notes=[660,880,1100,1320];notes.forEach((f,i)=>{setTimeout(()=>{try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=f;gn.gain.setValueAtTime(.05,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.08);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.08);}catch(e){}},i*50);});}catch(e){}}
function sfxSignRead(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=220;gn.gain.setValueAtTime(.06,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.06);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.06);}catch(e){}}
function sfxMapChange(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.setValueAtTime(3000,AC.currentTime);f.frequency.linearRampToValueAtTime(200,AC.currentTime+.25);f.Q.value=1;gn.gain.setValueAtTime(.07,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.25);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.25);}catch(e){}}
function sfxEventAlert(){if(!soundEnabled)return;beep(550,.05,.06);setTimeout(()=>beep(730,.05,.06),60);setTimeout(()=>beep(880,.08,.07),120);}
function sfxEncounterDramatic(){if(!soundEnabled)return;try{const notes=[220,330,220,440];const durs=[.08,.06,.08,.15];notes.forEach((f,i)=>{setTimeout(()=>{try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=f;gn.gain.setValueAtTime(.08,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+durs[i]);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+durs[i]);}catch(e){}},i*100);});}catch(e){}}

// ── AREA-SPECIFIC AMBIENT LOOPS ──
const ambientState={
  currentArea:-1,
  nodes:[], // active {source,gain,filter} sets
  targetGain:0.04,
  fadeSpeed:0.003,
  birdTimer:0,
  birdInterval:120+Math.random()*180
};

function createNoiseSource(loop){
  const s=AC.createBufferSource();
  s.buffer=noiseBuf;
  s.loop=loop!==false;
  return s;
}

function stopAmbientNodes(){
  for(let _ni=0;_ni<ambientState.nodes.length;_ni++){
    const n=ambientState.nodes[_ni];
    try{n.gain.gain.linearRampToValueAtTime(0,AC.currentTime+0.5);
    setTimeout(()=>{try{n.source.stop();n.source.disconnect();}catch(e){}},600);
    }catch(e){}
  }
  ambientState.nodes=[];
}

function startAmbientPort(){
  // Gentle ocean wave: low-pass filtered noise with cycling volume
  try{
    const s=createNoiseSource();
    const gn=AC.createGain();
    const f=AC.createBiquadFilter();
    f.type='lowpass';f.frequency.value=400;f.Q.value=0.5;
    gn.gain.value=0;
    s.connect(f);f.connect(gn);gn.connect(AC.destination);
    s.start();
    ambientState.nodes.push({source:s,gain:gn,filter:f,type:'wave'});
  }catch(e){}
}

function startAmbientForest(){
  // Subtle wind: band-pass filtered noise
  try{
    const s=createNoiseSource();
    const gn=AC.createGain();
    const f=AC.createBiquadFilter();
    f.type='bandpass';f.frequency.value=800;f.Q.value=0.3;
    gn.gain.value=0;
    s.connect(f);f.connect(gn);gn.connect(AC.destination);
    s.start();
    ambientState.nodes.push({source:s,gain:gn,filter:f,type:'wind'});
  }catch(e){}
}

function startAmbientRuins(){
  // Low ominous drone: very low freq oscillator with tremolo
  try{
    const o=AC.createOscillator();
    const gn=AC.createGain();
    const lfo=AC.createOscillator();
    const lfoGain=AC.createGain();
    o.type='sawtooth';o.frequency.value=55;
    lfo.type='sine';lfo.frequency.value=0.5;
    lfoGain.gain.value=0.015;
    gn.gain.value=0;
    lfo.connect(lfoGain);lfoGain.connect(gn.gain);
    o.connect(gn);gn.connect(AC.destination);
    o.start();lfo.start();
    ambientState.nodes.push({source:o,gain:gn,filter:null,type:'drone',lfo:lfo,lfoGain:lfoGain});
  }catch(e){}
}

function updateAmbient(){
  if(!soundEnabled||!audioResumed){
    if(ambientState.nodes.length>0)stopAmbientNodes();
    ambientState.currentArea=-1;
    return;
  }
  // Only run ambient on map screen
  if(sc!=='map'){
    for(let _ni=0;_ni<ambientState.nodes.length;_ni++){
      const n=ambientState.nodes[_ni];
      try{if(n.gain.gain.value>0.001)n.gain.gain.value=Math.max(0,n.gain.gain.value-ambientState.fadeSpeed);}catch(e){}
    }
    return;
  }
  // Switch ambient when map changes
  if(ambientState.currentArea!==currentMap){
    stopAmbientNodes();
    ambientState.currentArea=currentMap;
    if(currentMap===0)startAmbientPort();
    else if(currentMap===1)startAmbientForest();
    else if(currentMap===2)startAmbientRuins();
  }
  // Fade in active nodes
  const tgt=ambientState.targetGain;
  for(let _ni=0;_ni<ambientState.nodes.length;_ni++){
    const n=ambientState.nodes[_ni];
    try{
      const cur=n.gain.gain.value;
      if(cur<tgt)n.gain.gain.value=Math.min(tgt,cur+ambientState.fadeSpeed);
      // Cycling volume for ocean waves
      if(n.type==='wave'){
        const cycle=Math.sin(AC.currentTime*0.8)*0.5+0.5;
        n.gain.gain.value=tgt*0.5+tgt*0.5*cycle;
      }
    }catch(e){}
  }
  // Bird chirps in forest (random intervals)
  if(currentMap===1){
    ambientState.birdTimer--;
    if(ambientState.birdTimer<=0){
      ambientState.birdTimer=80+Math.floor(Math.random()*200);
      if(soundEnabled){
        try{
          const o=AC.createOscillator(),gn=AC.createGain();
          o.type='sine';
          const baseF=2000+Math.random()*1500;
          o.frequency.setValueAtTime(baseF,AC.currentTime);
          o.frequency.linearRampToValueAtTime(baseF+400,AC.currentTime+.03);
          o.frequency.linearRampToValueAtTime(baseF-200,AC.currentTime+.06);
          gn.gain.setValueAtTime(.025,AC.currentTime);
          gn.gain.linearRampToValueAtTime(0,AC.currentTime+.08);
          o.connect(gn);gn.connect(AC.destination);
          o.start();o.stop(AC.currentTime+.08);
        }catch(e){}
      }
    }
  }
}

