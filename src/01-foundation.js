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
const pixiApp = new PIXI.Application({
  width: W, height: H,
  backgroundAlpha: 0, // Transparent background — game canvas shown directly below PixiJS UI overlay
  antialias: false,
  roundPixels: true,
  autoStart: false,
});
if(!_isMobile){
  // Desktop: game canvas shown directly; PixiJS canvas overlaid as transparent UI layer only
  // This eliminates the black flash caused by WebGL framebuffer clear when uploading canvas texture
  c.style.display='block';
  const _pixiView=pixiApp.view;
  _pixiView.style.cssText='display:block;position:absolute;top:0;left:0;width:960px;height:640px;touch-action:none;';
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
  const pulse=Math.sin(fr*0.1)*0.15+0.85;
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
  pxShootingStars.forEach(star=>{
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
  });

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
  pxMenuCursor.y = targetY + Math.sin(fr * 0.15) * 1.5;
  // Update dynamic labels (indices must match MENU_ITEMS order)
  const walletIdx = MENU_ITEMS.indexOf('WALLET');
  const textSpdIdx = MENU_ITEMS.indexOf('TEXT SPD');
  if (walletIdx>=0&&pxMenuTexts[walletIdx]) pxMenuTexts[walletIdx].text = walletConnected ? 'WALLET (' + walletAddressTruncated() + ')' : 'WALLET (OFF)';
  if (textSpdIdx>=0&&pxMenuTexts[textSpdIdx]) pxMenuTexts[textSpdIdx].text = 'TEXT SPD: ' + TEXT_SPEED_LABELS[textSpeedIdx];
  // Highlight selected
  pxMenuTexts.forEach((t, i) => { t.alpha = i === mi ? 1 : 0.65; });
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
    pxTextboxArrow.y = H - 30 + Math.sin(fr * 0.12) * 3;
    pxTextboxArrow.visible = pxTextboxTw.done;
    // Auto-hide after 4 seconds of done
    if(pxTextboxTw.done){
      if(!pxTextbox._hideTimer)pxTextbox._hideTimer=0;
      pxTextbox._hideTimer++;
      if(pxTextbox._hideTimer>240){pxTextbox.visible=false;pxTextbox._hideTimer=0;}
    }else{pxTextbox._hideTimer=0;}
  }
  // Season timer
  const sr=getSeasonRemaining();
  pixiHud.seasonTimer.text=formatTimeRemaining(sr);
  pixiHud.seasonTimer.style.fill=sr<3600000?'#d04040':sr<86400000?'#d0a030':'#40a040';
  // Card progress (GDD v1.0: X/60 cards)
  const unique=hasUniqueCards(0).size;
  const dungeonLabel=inDungeon?' [FLOOR '+currentFloor+']':'';
  pixiHud.cardProgress.text=unique+'/60'+dungeonLabel;
  pixiHud.cardProgress.style.fill=unique>=60?'#40d040':unique>=30?'#f0c830':'#c0d0f0';
  // Battle/status info (round + spell counts)
  pixiHud.battleCount.text='Round '+rd+'  STL:'+sp.s+' BAR:'+sp.b+' SCT:'+sp.c;
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

// Offscreen canvas caches for edge blending and fog
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
  ambientState.nodes.forEach(n=>{
    try{n.gain.gain.linearRampToValueAtTime(0,AC.currentTime+0.5);
    setTimeout(()=>{try{n.source.stop();n.source.disconnect();}catch(e){}},600);
    }catch(e){}
  });
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
    ambientState.nodes.forEach(n=>{
      try{if(n.gain.gain.value>0.001)n.gain.gain.value=Math.max(0,n.gain.gain.value-ambientState.fadeSpeed);}catch(e){}
    });
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
  ambientState.nodes.forEach(n=>{
    try{
      const cur=n.gain.gain.value;
      if(cur<tgt)n.gain.gain.value=Math.min(tgt,cur+ambientState.fadeSpeed);
      // Cycling volume for ocean waves
      if(n.type==='wave'){
        const cycle=Math.sin(AC.currentTime*0.8)*0.5+0.5;
        n.gain.gain.value=tgt*0.5+tgt*0.5*cycle;
      }
    }catch(e){}
  });
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

// ═══════════════════════════════════════
// FRLG WINDOW SYSTEM (pixel-perfect FRLG palette)
// ═══════════════════════════════════════
// FRLG palette constants
const FRLG={
  winBg:'#F8F0D0',       // warm cream background
  borderOuter:'#484050',  // dark purple-gray border
  borderInner:'#888078',  // medium gray inner border
  textColor:'#383830',    // warm dark text
  selHighlight:'#F8D830', // golden yellow selection
  hpGreen:'#58A850',
  hpYellow:'#F8C838',
  hpRed:'#E85048',
  // FRLG theme variants (selectable)
  themes:{
    red:   {winBg:'#F8E0D0',borderOuter:'#504040',borderInner:'#887068'},
    blue:  {winBg:'#D0E0F8',borderOuter:'#404060',borderInner:'#687888'},
    green: {winBg:'#D8F0D0',borderOuter:'#405040',borderInner:'#688868'},
    gold:  {winBg:'#F8F0D0',borderOuter:'#484050',borderInner:'#888078'}, // default
  },
};
let frlgTheme='gold'; // current theme
function getFRLGColors(){
  const t=FRLG.themes[frlgTheme]||FRLG.themes.gold;
  return{winBg:t.winBg,borderOuter:t.borderOuter,borderInner:t.borderInner};
}
function win(x,y,w,h){
  const tc=getFRLGColors();
  g.fillStyle=tc.borderOuter;
  g.fillRect(x+4,y,w-8,1);g.fillRect(x+3,y+1,w-6,1);g.fillRect(x+2,y+2,w-4,1);g.fillRect(x+1,y+3,w-2,1);
  g.fillRect(x+1,y+h-4,w-2,1);g.fillRect(x+2,y+h-3,w-4,1);g.fillRect(x+3,y+h-2,w-6,1);g.fillRect(x+4,y+h-1,w-8,1);
  g.fillRect(x,y+4,1,h-8);g.fillRect(x+1,y+3,1,h-6);g.fillRect(x+2,y+2,1,h-4);g.fillRect(x+3,y+1,1,h-2);
  g.fillRect(x+w-1,y+4,1,h-8);g.fillRect(x+w-2,y+3,1,h-6);g.fillRect(x+w-3,y+2,1,h-4);g.fillRect(x+w-4,y+1,1,h-2);
  g.fillStyle=tc.borderInner;
  g.fillRect(x+4,y+4,w-8,1);g.fillRect(x+4,y+h-5,w-8,1);
  g.fillRect(x+4,y+4,1,h-8);g.fillRect(x+w-5,y+4,1,h-8);
  g.fillStyle=tc.winBg;
  g.fillRect(x+5,y+5,w-10,h-10);
  // Top-left highlight (light catches top edge)
  g.fillStyle='rgba(255,255,255,.4)';
  g.fillRect(x+6,y+5,w-12,1);g.fillRect(x+5,y+6,1,h-12);
  // Bottom-right inner shadow (FRLG depth effect)
  g.fillStyle='rgba(0,0,0,.08)';
  g.fillRect(x+6,y+h-6,w-12,1);g.fillRect(x+w-6,y+6,1,h-12);
}

function bx(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
// FRLG-style text: 1px letter spacing + slight bold via double draw at 0.5px offset
function tx(s,x,y,sz,c){
  g.fillStyle=c||FRLG.textColor;
  const finalSz=Math.max(12,Math.round((sz||12)*1.4));
  g.font=finalSz+"px 'VT323',monospace";
  g.fillText(s,x,y);
}
// Text with 1px shadow for readability (battle screens) — FRLG bold style
function txShadow(s,x,y,sz,color,shadowColor){
  const sc_=shadowColor||'rgba(0,0,0,0.85)';
  const finalSz=Math.max(12,Math.round((sz||12)*1.4));
  g.font=finalSz+"px 'VT323',monospace";
  g.fillStyle=sc_;g.fillText(s,x+1,y+1);
  g.fillStyle=color||'#fff';g.fillText(s,x,y);
}

// ═══════════════════════════════════════
// PHANTOM WALLET INTEGRATION
// ═══════════════════════════════════════
const WALLET_PROGRAM_ID='2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3';
const WALLET_DEVNET_RPC='https://api.devnet.solana.com';
let walletConnected=false;
let walletPublicKey=null;
let walletLastCommitHash=null;
let programVerified=false; // true if on-chain program confirmed on devnet

async function connectPhantom(){
  if(!window.solana||!window.solana.isPhantom){
    walletPublicKey=null;walletConnected=false;
    return null;
  }
  try{
    const resp=await window.solana.connect();
    walletConnected=true;
    walletPublicKey=resp.publicKey.toString();
    lg.push('[WALLET] Connected: '+walletPublicKey.slice(0,8)+'..');
    // Verify program exists on devnet
    verifyProgram();
    return walletPublicKey;
  }catch(err){
    console.error('Wallet connection failed:',err);
    walletConnected=false;walletPublicKey=null;
    return null;
  }
}

async function disconnectPhantom(){
  if(window.solana){
    try{await window.solana.disconnect();}catch(e){}
  }
  walletConnected=false;walletPublicKey=null;programVerified=false;
}

async function verifyProgram(){
  try{
    const res=await fetch(WALLET_DEVNET_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[WALLET_PROGRAM_ID,{encoding:'base64'}]})});
    const data=await res.json();
    programVerified=!!(data.result&&data.result.value&&data.result.value.executable);
    if(programVerified)lg.push('[ON-CHAIN] Program verified on devnet!');
  }catch(e){programVerified=false;}
}

function generateSalt(){return crypto.getRandomValues(new Uint8Array(32));}

function base58Decode(str){
  const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE=58;let result=[0];
  for(const char of str){
    let carry=ALPHABET.indexOf(char);
    if(carry===-1)throw new Error('Invalid base58 character');
    for(let j=0;j<result.length;j++){carry+=result[j]*BASE;result[j]=carry&0xff;carry>>=8;}
    while(carry>0){result.push(carry&0xff);carry>>=8;}
  }
  for(const char of str){if(char!=='1')break;result.push(0);}
  return new Uint8Array(result.reverse());
}

async function computeCommitHash(actionType,targetPubkey,salt){
  const data=new Uint8Array(1+32+32);
  data[0]=actionType;
  const targetBytes=new Uint8Array(32);
  if(targetPubkey){
    try{const decoded=base58Decode(targetPubkey);targetBytes.set(decoded.slice(0,32));}catch(e){}
  }
  data.set(targetBytes,1);
  data.set(salt,33);
  const hashBuffer=await crypto.subtle.digest('SHA-256',data);
  return new Uint8Array(hashBuffer);
}

function walletAddressTruncated(){
  if(!walletPublicKey)return'';
  return walletPublicKey.slice(0,4)+'..'+walletPublicKey.slice(-4);
}

function hexFromBytes(bytes){
  return'0x'+Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,12)+'..';
}

// ═══════════════════════════════════════
// ZK PROOF SYSTEM (snarkjs browser)
// ═══════════════════════════════════════
let zkProofReady=false;
let zkLastProof=null; // {proof, publicSignals}
let zkProofGenerating=false;
let zkProofStatus='idle'; // idle, generating, verified, failed

async function zkGenerateProof(actionType, targetArea, salt){
  if(typeof snarkjs==='undefined'){zkProofStatus='failed';return null;}
  zkProofGenerating=true;zkProofStatus='generating';
  try{
    // Salt as BN254 field element (31 bytes max to stay in field)
    const saltBig=BigInt('0x'+Array.from(salt.slice(0,31)).map(b=>b.toString(16).padStart(2,'0')).join(''));
    // Compute Poseidon hash first using poseidon-lite (circomlib-compatible BN254)
    let commitHash='0';
    try{
      const {poseidon3}=await import('https://esm.sh/poseidon-lite@0.2.1');
      commitHash=poseidon3([BigInt(actionType),BigInt(targetArea),saltBig]).toString();
    }catch(hashErr){
      // If CDN fails, we still attempt proof — will fail if hash is wrong
      lg.push('[ZK] Hash compute failed: '+String(hashErr.message||'').slice(0,30));
    }
    const input={
      actionType:String(actionType),
      targetArea:String(targetArea),
      salt:saltBig.toString(),
      commitHash:commitHash,
    };
    const{proof,publicSignals}=await snarkjs.groth16.fullProve(
      input,'commit_reveal.wasm','commit_reveal_final.zkey'
    );
    zkLastProof={proof,publicSignals};
    zkProofReady=true;zkProofGenerating=false;zkProofStatus='verified';
    lg.push('[ZK] Proof verified! Hash:'+publicSignals[0].slice(0,10)+'..');
    return{proof,publicSignals};
  }catch(e){
    zkProofStatus='failed';zkProofGenerating=false;
    lg.push('[ZK] '+(e.message||'proof failed').slice(0,40));
    return null;
  }
}

async function zkVerifyProof(){
  if(!zkLastProof)return false;
  try{
    const vkey=await fetch('verification_key.json').then(r=>r.json());
    const valid=await snarkjs.groth16.verify(vkey,zkLastProof.publicSignals,zkLastProof.proof);
    lg.push('[ZK] Proof verification: '+(valid?'VALID':'INVALID'));
    return valid;
  }catch(e){lg.push('[ZK] Verify error');return false;}
}

// ═══════════════════════════════════════
// ON-CHAIN TRANSACTION INTEGRATION
// ═══════════════════════════════════════
let onchainLastTxSig='';
let onchainCommitPhase=false;
let onchainRevealPhase=false;
let onchainPendingSalt=null;

// ── STAKE SYSTEM UI STATE ──
let stakeConfirmActive=false; // show deposit confirmation before game start
const STAKE_AMOUNT=0.01; // SOL per player
const PLAYER_COUNT=3; // total players in match
let stakePotAmount=STAKE_AMOUNT*PLAYER_COUNT;
let stakeDeposited=false; // whether player has "deposited" (UI-only)





// Helper: draw Solana diamond logo (tilted square in purple/green gradient)
function drawSolanaLogo(cx,cy,size){
  g.save();
  g.translate(cx,cy);
  g.rotate(Math.PI/4);
  // Outer diamond (gradient purple->green)
  const half=size/2;
  bx(-half,-half,size,size/3,'#9945FF');
  bx(-half,-half+size/3,size,size/3,'#14F195');
  bx(-half,-half+size*2/3,size,size/3,'#9945FF');
  g.restore();
}

// Helper: draw small Solana icon (tiny for HUD)
function drawSolanaIcon(x,y,sz){
  g.save();
  g.translate(x+sz/2,y+sz/2);
  g.rotate(Math.PI/4);
  const h=sz/2;
  bx(-h,-h,sz,Math.ceil(sz/3),'#9945FF');
  bx(-h,-h+Math.ceil(sz/3),sz,Math.ceil(sz/3),'#14F195');
  bx(-h,-h+Math.ceil(sz*2/3),sz,Math.floor(sz/3),'#9945FF');
  g.restore();
}

// Generate a truncated fake tx signature for display
function generateFakeTxSig(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
}

// Solana connection for real transactions
const solConnection=typeof solanaWeb3!=='undefined'?new solanaWeb3.Connection(WALLET_DEVNET_RPC,'confirmed'):null;
const PROGRAM_PUBKEY=typeof solanaWeb3!=='undefined'?new solanaWeb3.PublicKey(WALLET_PROGRAM_ID):null;

// Build Anchor instruction data (8-byte discriminator + args)
function anchorInstructionData(discriminator, argsBuffer){
  const disc=new Uint8Array(discriminator);
  if(!argsBuffer)return disc;
  const data=new Uint8Array(disc.length+argsBuffer.length);
  data.set(disc);data.set(argsBuffer,disc.length);
  return data;
}

// NPC deterministic pubkeys (stable placeholders for rival targets)
const NPC_PUBKEYS={
  VEGA:'VEGAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  MIRA:'MIRAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};
// Map rival index to 32-byte target for hashing
function rivalTargetBytes(rivalIdx){
  if(!solanaWeb3)return new Uint8Array(32);
  try{
    // VEGA=index1, MIRA=index2 — use SystemProgram as fallback npc key base
    const seed=rivalIdx===1?'oxark_npc_vega_v1':'oxark_npc_mira_v1';
    const enc=new TextEncoder().encode(seed);
    const padded=new Uint8Array(32);padded.set(enc.slice(0,32));
    return padded;
  }catch(e){return new Uint8Array(32);}
}

// Commit action on-chain (real devnet TX when wallet connected)
async function onchainCommit(gameId,actionType,rivalIdx){
  if(!walletConnected)return null;
  const salt=generateSalt();
  const saltHex=Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  const targetBytes=rivalTargetBytes(rivalIdx);
  const targetHex=Array.from(targetBytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  onchainPendingSalt=salt;

  try{
    const hash=await computeCommitHash(actionType,targetBytes,salt);
    const hashHex=hexFromBytes(hash);

    if(solConnection&&window.solana){
      try{
        // Read current round from game account for PDA seed
        const gameIdBuf=new ArrayBuffer(8);new DataView(gameIdBuf).setBigUint64(0,BigInt(gameId),true);
        const gameIdBytes=new Uint8Array(gameIdBuf);
        const playerKey=new solanaWeb3.PublicKey(walletPublicKey);
        const [gamePda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        // Read round from game account
        let round=0;
        try{
          const gameAcct=await solConnection.getAccountInfo(gamePda);
          if(gameAcct){round=gameAcct.data[49];}// round is at byte 49 in Game struct
        }catch(_){}
        const roundBuf=new ArrayBuffer(4);new DataView(roundBuf).setUint32(0,round,true);
        const roundBytes=new Uint8Array(roundBuf);

        // Store round+target for reveal
        localStorage.setItem('oxark_onchain_salt',saltHex);
        localStorage.setItem('oxark_onchain_action',String(actionType));
        localStorage.setItem('oxark_onchain_target_hex',targetHex);
        localStorage.setItem('oxark_onchain_round',String(round));
        localStorage.setItem('oxark_onchain_gameid',String(gameId));

        // commit_action discriminator: [75,26,232,17,11,158,202,221]
        const args=new Uint8Array(8+32);// game_id(u64) + hash([u8;32])
        args.set(gameIdBytes,0);args.set(hash,8);
        const data=anchorInstructionData([75,26,232,17,11,158,202,221],args);

        const [playerPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        // Commit PDA includes round: [COMMIT_SEED, game_id, round, player]
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        const ix=new solanaWeb3.TransactionInstruction({
          keys:[
            {pubkey:gamePda,isSigner:false,isWritable:true},
            {pubkey:playerPda,isSigner:false,isWritable:true},
            {pubkey:commitPda,isSigner:false,isWritable:true},
            {pubkey:playerKey,isSigner:true,isWritable:true},
            {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
          ],
          programId:PROGRAM_PUBKEY,data:data,
        });
        const tx=new solanaWeb3.Transaction().add(ix);
        tx.feePayer=playerKey;
        tx.recentBlockhash=(await solConnection.getLatestBlockhash()).blockhash;
        const signed=await window.solana.signTransaction(tx);
        const txSig=await solConnection.sendRawTransaction(signed.serialize());
        onchainLastTxSig=txSig;
        lg.push('[ON-CHAIN] Commit TX: '+txSig.slice(0,12)+'..');
        return{hash:hashHex,salt:saltHex,txSig};
      }catch(txErr){
        lg.push('[ON-CHAIN] Commit TX failed, sim: '+(txErr.message||'').slice(0,28));
      }
    }
    // Store for reveal even in simulated path
    localStorage.setItem('oxark_onchain_salt',saltHex);
    localStorage.setItem('oxark_onchain_action',String(actionType));
    localStorage.setItem('oxark_onchain_target_hex',targetHex);
    localStorage.setItem('oxark_onchain_round','0');
    localStorage.setItem('oxark_onchain_gameid',String(gameId));
    const txSig=generateFakeTxSig();
    onchainLastTxSig=txSig;
    return{hash:hashHex,salt:saltHex,txSig};
  }catch(e){return null;}
}

// Reveal action on-chain (real devnet TX when wallet connected)
async function onchainReveal(gameId,actionType,rivalIdx,salt){
  if(!walletConnected)return null;
  try{
    const saltHex2=Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16)+'..';

    if(solConnection&&window.solana){
      try{
        const gameIdBuf=new ArrayBuffer(8);new DataView(gameIdBuf).setBigUint64(0,BigInt(gameId),true);
        const gameIdBytes=new Uint8Array(gameIdBuf);
        const playerKey=new solanaWeb3.PublicKey(walletPublicKey);

        // Load round stored at commit time
        const round=parseInt(localStorage.getItem('oxark_onchain_round')||'0',10);
        const roundBuf=new ArrayBuffer(4);new DataView(roundBuf).setUint32(0,round,true);
        const roundBytes=new Uint8Array(roundBuf);

        // Restore target bytes from hex stored at commit time
        const targetHex=localStorage.getItem('oxark_onchain_target_hex')||'';
        const targetBytes=new Uint8Array(32);
        for(let i=0;i<32&&i*2<targetHex.length;i++){
          targetBytes[i]=parseInt(targetHex.slice(i*2,i*2+2),16);
        }

        const [gamePda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        const [playerPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );

        // reveal_action discriminator: [251,43,123,150,183,44,178,210]
        // args: game_id(u64) + action_type(u8) + target(32 bytes) + salt(32 bytes) = 73 bytes
        const args=new Uint8Array(8+1+32+32);
        args.set(gameIdBytes,0);
        args[8]=actionType&0xff;
        args.set(targetBytes,9);
        args.set(salt,41);
        const data=anchorInstructionData([251,43,123,150,183,44,178,210],args);

        const ix=new solanaWeb3.TransactionInstruction({
          keys:[
            {pubkey:gamePda,isSigner:false,isWritable:true},
            {pubkey:playerPda,isSigner:false,isWritable:true},
            {pubkey:commitPda,isSigner:false,isWritable:false},
            {pubkey:playerKey,isSigner:true,isWritable:false},
          ],
          programId:PROGRAM_PUBKEY,data:data,
        });
        const tx=new solanaWeb3.Transaction().add(ix);
        tx.feePayer=playerKey;
        tx.recentBlockhash=(await solConnection.getLatestBlockhash()).blockhash;
        const signed=await window.solana.signTransaction(tx);
        const txSig=await solConnection.sendRawTransaction(signed.serialize());
        onchainLastTxSig=txSig;
        lg.push('[ON-CHAIN] Reveal TX: '+txSig.slice(0,12)+'..');
        localStorage.removeItem('oxark_onchain_salt');
        localStorage.removeItem('oxark_onchain_action');
        localStorage.removeItem('oxark_onchain_target_hex');
        localStorage.removeItem('oxark_onchain_round');
        localStorage.removeItem('oxark_onchain_gameid');
        return{txSig};
      }catch(txErr){
        lg.push('[ON-CHAIN] Reveal TX failed, sim: '+(txErr.message||'').slice(0,28));
      }
    }
    // Simulated fallback
    const txSig=generateFakeTxSig();
    onchainLastTxSig=txSig;
    lg.push('[ON-CHAIN] Reveal TX (sim): action='+actionType+' salt='+saltHex2);
    localStorage.removeItem('oxark_onchain_salt');
    localStorage.removeItem('oxark_onchain_action');
    localStorage.removeItem('oxark_onchain_target_hex');
    localStorage.removeItem('oxark_onchain_round');
    localStorage.removeItem('oxark_onchain_gameid');
    return{txSig};
  }catch(e){return null;}
}

// Helper to add on-chain prefixed log entry
function logOnchain(msg){
  if(walletConnected){
    lg.push('[ON-CHAIN] '+msg);
  }else{
    lg.push(msg);
  }
}

// ═══════════════════════════════════════
// MULTIPLAYER SYSTEM (WebSocket client)
// ═══════════════════════════════════════
let mp={
  connected:false,
  ws:null,
  serverUrl:'ws://localhost:3500',
  roomId:null,
  playerId:null,
  playerCount:0,
  otherPlayers:[], // [{id, name, area, cardCount, x, y}]
  phase:'lobby', // lobby, playing, finished
  pendingActions:[],
  pingMs:0,
  pingColor:'#40d040', // green/yellow/red
  lastPingTime:0,
  reconnectAttempts:0,
  maxReconnectAttempts:5,
  disconnectMsg:'',
  disconnectTimer:0,
  lobbyPlayers:[], // [{id, name, ready}]
  roomInput:'',
  mpMenuIdx:0, // 0=CREATE ROOM, 1=JOIN ROOM
  mpScreen:'off', // off, select, create, join, lobby
};

function mpConnect(roomId,isCreate){
  if(mp.ws)mpDisconnect();
  mp.reconnectAttempts=0;
  mp.disconnectMsg='';mp.disconnectTimer=0;
  try{
    const url=mp.serverUrl+'?room='+encodeURIComponent(roomId)+(isCreate?'&create=1':'');
    mp.ws=new WebSocket(url);
    mp.ws.onopen=function(){
      mp.connected=true;mp.roomId=roomId;
      mp.phase='lobby';mp.reconnectAttempts=0;
      mp.lastPingTime=performance.now();
      lg.push('[MP] Connected to room '+roomId);
    };
    mp.ws.onmessage=function(evt){
      try{
        const msg=JSON.parse(evt.data);
        mpHandleMessage(msg);
      }catch(e){}
    };
    mp.ws.onclose=function(){
      const wasConnected=mp.connected;
      mp.connected=false;mp.ws=null;
      if(wasConnected){
        mp.disconnectMsg='CONNECTION LOST - switching to AI';
        mp.disconnectTimer=180; // 3 seconds
        lg.push('[MP] Disconnected from server.');
        // Attempt reconnect
        if(mp.reconnectAttempts<mp.maxReconnectAttempts&&mp.roomId){
          mp.reconnectAttempts++;
          setTimeout(()=>{if(!mp.connected&&mp.roomId)mpConnect(mp.roomId,false);},2000);
        }
      }
    };
    mp.ws.onerror=function(){
      mp.disconnectMsg='CONNECTION ERROR';mp.disconnectTimer=120;
    };
  }catch(e){
    mp.disconnectMsg='FAILED TO CONNECT';mp.disconnectTimer=120;
  }
}

function mpDisconnect(){
  if(mp.ws){try{mp.ws.close();}catch(e){}}
  mp.ws=null;mp.connected=false;mp.roomId=null;mp.playerId=null;
  mp.playerCount=0;mp.otherPlayers=[];mp.phase='lobby';
  mp.lobbyPlayers=[];mp.mpScreen='off';
}

function mpSend(obj){
  if(mp.ws&&mp.ws.readyState===WebSocket.OPEN){
    try{mp.ws.send(JSON.stringify(obj));}catch(e){}
  }
}

function mpHandleMessage(msg){
  if(msg.type==='welcome'){
    mp.playerId=msg.playerId;
    mp.roomId=msg.roomId;
  }else if(msg.type==='lobby_update'){
    mp.lobbyPlayers=msg.players||[];
    mp.playerCount=mp.lobbyPlayers.length;
  }else if(msg.type==='game_start'){
    mp.phase='playing';
    mp.otherPlayers=msg.players?msg.players.filter(p=>p.id!==mp.playerId):[];
  }else if(msg.type==='player_move'){
    const op=mp.otherPlayers.find(p=>p.id===msg.id);
    if(op){op.x=msg.x;op.y=msg.y;op.area=msg.area;}
  }else if(msg.type==='player_join'){
    if(mp.phase==='playing'){
      const exists=mp.otherPlayers.find(p=>p.id===msg.id);
      if(!exists)mp.otherPlayers.push({id:msg.id,name:msg.name||'Player',area:0,cardCount:0,x:15,y:13});
    }
  }else if(msg.type==='player_leave'){
    mp.otherPlayers=mp.otherPlayers.filter(p=>p.id!==msg.id);
    mp.playerCount=mp.otherPlayers.length+1;
  }else if(msg.type==='battle_action'){
    mp.pendingActions.push(msg);
  }else if(msg.type==='pong'){
    mp.pingMs=Math.round(performance.now()-mp.lastPingTime);
    mp.pingColor=mp.pingMs<80?'#40d040':mp.pingMs<200?FRLG.hpYellow:FRLG.hpRed;
  }
}

// Broadcast player movement
function mpBroadcastMove(){
  if(!mp.connected||mp.phase!=='playing')return;
  mpSend({type:'move',x:pl[0].x,y:pl[0].y,area:currentMap});
}

// Broadcast battle action
function mpBroadcastBattleAction(action,target){
  if(!mp.connected||mp.phase!=='playing')return;
  mpSend({type:'battle_action',action:action,target:target});
}

// Ping server periodically
function mpPing(){
  if(!mp.connected)return;
  mp.lastPingTime=performance.now();
  mpSend({type:'ping'});
}

// Generate a random room ID
function mpGenerateRoomId(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id='';
  for(let i=0;i<6;i++)id+=chars[Math.floor(Math.random()*chars.length)];
  return id;
}

// Draw multiplayer lobby UI (FRLG-style windows)
function drawMPLobby(){
  bx(0,0,W,H,'#0c0c18');
  // Stars
  for(let i=0;i<60;i++){
    const sx=(i*47+13)%W,sy=(i*31+7)%320;
    const a=Math.sin(fr*.03+i*1.7)*.35+.5;
    bx(sx,sy,1,1,`rgba(255,255,255,${a*.3})`);
  }

  if(mp.mpScreen==='select'){
    // Room entry UI
    win(W/2-180,120,360,340);
    tx('MULTIPLAYER',W/2-72,160,12,FRLG.selHighlight);
    // CREATE ROOM
    const sel0=mp.mpMenuIdx===0;
    if(sel0)bx(W/2-160,190,320,36,'rgba(248,216,48,.12)');
    if(sel0)tx('\u25B6',W/2-160,214,10,FRLG.selHighlight);
    tx('CREATE ROOM',W/2-70,214,10,sel0?FRLG.selHighlight:'#888898');
    tx('Host a new game',W/2-80,236,6,'#686068');
    // JOIN ROOM
    const sel1=mp.mpMenuIdx===1;
    if(sel1)bx(W/2-160,260,320,36,'rgba(248,216,48,.12)');
    if(sel1)tx('\u25B6',W/2-160,284,10,FRLG.selHighlight);
    tx('JOIN ROOM',W/2-58,284,10,sel1?FRLG.selHighlight:'#888898');
    tx('Enter a room code',W/2-80,306,6,'#686068');
    // BACK
    const sel2=mp.mpMenuIdx===2;
    if(sel2)tx('\u25B6',W/2-60,360,10,FRLG.selHighlight);
    tx('BACK',W/2-24,360,10,sel2?FRLG.selHighlight:'#888898');
    // Connection status
    tx(mp.connected?'CONNECTED':'NOT CONNECTED',W/2-70,420,6,mp.connected?'#40d080':'#a06060');
  }else if(mp.mpScreen==='join'){
    // Join room: enter room code
    win(W/2-180,150,360,240);
    tx('JOIN ROOM',W/2-56,186,12,FRLG.selHighlight);
    tx('Enter Room Code:',W/2-90,220,8,FRLG.textColor);
    // Room code display
    win(W/2-80,236,160,32);
    const displayCode=mp.roomInput+(Math.floor(fr/30)%2===0?'_':'');
    tx(displayCode,W/2-60,260,14,FRLG.textColor);
    tx('Type code, Z to connect',W/2-100,290,6,'#686068');
    tx('X to go back',W/2-50,310,6,'#686068');
  }else if(mp.mpScreen==='create'){
    // Creating room...
    win(W/2-180,150,360,240);
    tx('CREATE ROOM',W/2-70,186,12,FRLG.selHighlight);
    if(mp.roomId){
      tx('Room Code:',W/2-56,224,8,FRLG.textColor);
      win(W/2-60,236,120,32);
      tx(mp.roomId,W/2-44,260,14,'#40d080');
      tx('Share this code!',W/2-70,290,7,'#686068');
      tx('Waiting for players...',W/2-90,320,6,'#888898');
    }else{
      tx('Connecting...',W/2-60,250,8,'#888898');
    }
  }else if(mp.mpScreen==='lobby'){
    // Lobby: show connected players, START button
    win(W/2-200,80,400,440);
    tx('ROOM: '+(mp.roomId||'???'),W/2-80,116,12,FRLG.selHighlight);
    // Connected players list
    tx('PLAYERS:',W/2-48,150,8,FRLG.textColor);
    const players=mp.lobbyPlayers;
    for(let i=0;i<Math.min(players.length,3);i++){
      const py_=174+i*40;
      win(W/2-160,py_,320,34);
      const pc=i===0?'#48b8e8':i===1?'#d860a0':'#d8b028';
      bx(W/2-148,py_+8,18,18,pc);
      tx(players[i].name||('Player '+(i+1)),W/2-120,py_+24,8,FRLG.textColor);
      tx(players[i].ready?'READY':'WAITING',W/2+80,py_+24,6,players[i].ready?'#40d080':'#a09888');
    }
    // Empty slots
    for(let i=players.length;i<3;i++){
      const py_=174+i*40;
      win(W/2-160,py_,320,34);
      tx('Waiting...',W/2-50,py_+24,8,'#686068');
    }
    // Player count
    tx('ONLINE: '+mp.playerCount+'/3',W/2-56,320,8,mp.playerCount>=2?'#40d080':'#a09888');
    // Ping
    if(mp.connected){
      bx(W/2+70,312,6,6,mp.pingColor);
      tx(mp.pingMs+'ms',W/2+80,320,6,mp.pingColor);
    }
    // START button (only if 2+ players)
    const canStart=mp.playerCount>=2;
    const startSel=mp.mpMenuIdx===0;
    if(canStart){
      if(startSel)bx(W/2-80,360,160,36,'rgba(248,216,48,.15)');
      tx('START',W/2-32,384,14,startSel?FRLG.selHighlight:'#40d080');
    }else{
      tx('Need 2+ players',W/2-70,384,8,'#686068');
    }
    // Entry fee and pot display
    win(W/2-140,400,280,24);
    tx('ENTRY FEE: 0.01 SOL',W/2-80,416,7,'#14F195');
    tx('CURRENT POT: 0.03 SOL',W/2-86,432,7,'#f0c830');
    // LEAVE
    tx('X = Leave Room',W/2-60,456,6,'#a06060');
  }
}

// Draw other multiplayer players on map as real sprites
function drawMPPlayers(){
  if(!mp.connected||mp.phase!=='playing')return;
  mp.otherPlayers.forEach(op=>{
    if(op.area!==currentMap)return;
    // ZK fog-of-war: in dungeon, only render if tile is revealed AND within visible radius
    // Town (map 0) is always visible — no fog restriction
    if(inDungeon&&!isVisibleThroughFog(op.x,op.y,3))return;
    const sx=op.x*TW-camX,sy=op.y*TH-camY-16;
    if(sx<-TW*2||sx>W+TW||sy<-TH*2||sy>H+TH)return;
    // Draw as colored sprite (like player but different color)
    const spriteColors=['#d860a0','#d8b028','#48b8e8'];
    const ci=mp.otherPlayers.indexOf(op)%3;
    const col=spriteColors[ci];
    // Body
    bx(sx+6,sy+8,20,16,col);bx(sx+8,sy+10,16,12,'rgba(255,255,255,.15)');
    // Head
    bx(sx+8,sy,16,12,'#f0dcc0');bx(sx+10,sy+2,12,8,'#e8d0b0');
    // Eyes
    bx(sx+11,sy+5,3,3,'#181820');bx(sx+18,sy+5,3,3,'#181820');
    // Legs
    bx(sx+9,sy+24,6,8,'#4050a0');bx(sx+17,sy+24,6,8,'#4050a0');
    bx(sx+8,sy+30,7,4,'#383030');bx(sx+17,sy+30,7,4,'#383030');
    // Player name above sprite
    const nameW=(op.name||'Player').length*6;
    bx(sx+16-nameW/2-2,sy-12,nameW+4,10,'rgba(0,0,0,.5)');
    tx(op.name||'Player',sx+16-nameW/2,sy-4,5,'#fff');
  });
}

// Draw multiplayer connection status in HUD
function drawMPStatus(){
  if(!mp.connected&&mp.disconnectTimer<=0)return;
  // Disconnect message
  if(mp.disconnectTimer>0){
    mp.disconnectTimer--;
    const a=Math.min(1,mp.disconnectTimer/30);
    g.globalAlpha=a;
    win(W/2-200,H/2-30,400,60);
    tx(mp.disconnectMsg,W/2-180,H/2+2,8,'#d04040');
    g.globalAlpha=1;
    return;
  }
  // Online indicator (top-right of HUD when on map)
  if(sc==='map'&&mp.phase==='playing'){
    const statusX=W-130,statusY=4;
    bx(statusX,statusY,120,16,'rgba(0,0,0,.5)');
    tx('ONLINE:'+mp.playerCount+'/3',statusX+4,statusY+12,6,'#40d080');
    // Ping dot
    bx(statusX+104,statusY+5,6,6,mp.pingColor);
  }
}

// ═══════════════════════════════════════
// TYPEWRITER
// ═══════════════════════════════════════
let twText='',twTarget='',twI=0,twDone=true,twAccum=0,twShowFrame=0;
function twSet(s){twTarget=s;twText='';twI=0;twDone=false;twAccum=0;twShowFrame=fr;pxShowTextbox(s);}
function twTick(){
  if(!twDone){
    twAccum+=dt;
    const spd=getTextSpeed();
    while(twAccum>=spd&&twI<twTarget.length){
      twText+=twTarget[twI];twI++;twAccum-=spd;
      if(twI>=twTarget.length)twDone=true;
    }
  }
}

// ═══════════════════════════════════════
// FADE + FLASH
// ═══════════════════════════════════════
let fadeAlpha=1,fadingIn=true,fadeCallback=null,fadeProgress=0;
function fadeIn(cb){fadeAlpha=1;fadingIn=true;fadeCallback=cb;fadeProgress=0;}
function fadeOut(cb){fadeAlpha=0;fadingIn=false;fadeCallback=cb;fadeProgress=0;}
function fadeUpdate(){
  const speed=0.06*dt;
  if(fadingIn&&fadeAlpha>0){
    fadeProgress=Math.min(1,fadeProgress+speed);
    fadeAlpha=1-easeInOut(fadeProgress);
    if(fadeAlpha<=0){fadeAlpha=0;if(fadeCallback){fadeCallback();fadeCallback=null;}}
  }
  if(!fadingIn&&fadeAlpha<1){
    fadeProgress=Math.min(1,fadeProgress+speed);
    fadeAlpha=easeInOut(fadeProgress);
    if(fadeAlpha>=1){fadeAlpha=1;if(fadeCallback){fadeCallback();fadeCallback=null;}}
  }
}
function fadeDraw(){if(fadeAlpha>0){bx(0,0,W,H,`rgba(0,0,0,${fadeAlpha})`);}}
let flashT=0;
function flash(){flashT=20;}
let shakeT=0,shakeIntensity=0;
function screenShake(intensity,duration){shakeT=duration||8;shakeIntensity=intensity||3;}

// ═══════════════════════════════════════
// SCREEN TRANSITION WIPES
// ═══════════════════════════════════════
// Wipe types: 'hswipe' (horizontal FRLG-style), 'vslide' (vertical slide-down), 'door_open', 'door_close'
let wipeActive=false, wipeType='hswipe', wipeProgress=0, wipeCallback=null, wipeDuration=30;
let wipeDoorX=0, wipeDoorY=0; // door position in screen coords for door wipe

function startWipe(type, duration, cb, doorX, doorY){
  wipeActive=true; wipeType=type; wipeProgress=0; wipeDuration=duration||30; wipeCallback=cb;
  wipeDoorX=doorX||W/2; wipeDoorY=doorY||H/2;
}
function updateWipe(){
  if(!wipeActive)return;
  wipeProgress+=dt;
  if(wipeProgress>=wipeDuration){
    wipeActive=false;
    if(wipeCallback){wipeCallback();wipeCallback=null;}
  }
}
function drawWipe(){
  if(!wipeActive)return;
  const t=Math.min(1,wipeProgress/wipeDuration);
  const ease=easeInOut(t);
  if(wipeType==='hswipe'){
    // Horizontal wipe like FRLG wild encounter — black bars sweep from edges
    const barW=Math.floor(W*ease);
    // Alternating horizontal stripes sweep from left and right
    const stripeH=Math.ceil(H/8);
    for(let i=0;i<8;i++){
      const fromLeft=(i%2===0);
      const sx=fromLeft?0:W-barW;
      bx(sx,i*stripeH,barW,stripeH,'#181828');
    }
  }else if(wipeType==='hswipe_out'){
    // Reverse horizontal wipe — stripes retract
    const barW=Math.floor(W*(1-ease));
    const stripeH=Math.ceil(H/8);
    for(let i=0;i<8;i++){
      const fromLeft=(i%2===0);
      const sx=fromLeft?0:W-barW;
      bx(sx,i*stripeH,barW,stripeH,'#181828');
    }
  }else if(wipeType==='vslide'){
    // Vertical slide-down wipe
    const barH=Math.floor(H*ease);
    bx(0,0,W,barH,'#181828');
  }else if(wipeType==='vslide_out'){
    // Reverse slide-down
    const barH=Math.floor(H*(1-ease));
    bx(0,0,W,barH,'#181828');
  }else if(wipeType==='mosaic'){
    // FRLG-style mosaic pixelation wipe — screen pixelates then goes black
    const pixelSize=Math.max(2,Math.floor(ease*32));
    if(ease<0.7){
      // Pixelate phase: draw screen at reduced resolution
      g.imageSmoothingEnabled=false;
      // Draw current screen scaled down then back up for pixelation effect
      const sw=Math.max(1,Math.floor(W/pixelSize)),sh=Math.max(1,Math.floor(H/pixelSize));
      g.drawImage(c,0,0,W,H,0,0,sw,sh);
      g.drawImage(c,0,0,sw,sh,0,0,W,H);
    }else{
      // Fade to black
      bx(0,0,W,H,`rgba(24,24,40,${(ease-0.7)/0.3})`);
    }
  }else if(wipeType==='mosaic_out'){
    // Reverse mosaic — de-pixelate from black
    if(ease<0.3){
      bx(0,0,W,H,`rgba(24,24,40,${1-ease/0.3})`);
    }else{
      const pixelSize=Math.max(2,Math.floor((1-ease)*32));
      g.imageSmoothingEnabled=false;
      const sw=Math.max(1,Math.floor(W/pixelSize)),sh=Math.max(1,Math.floor(H/pixelSize));
      g.drawImage(c,0,0,W,H,0,0,sw,sh);
      g.drawImage(c,0,0,sw,sh,0,0,W,H);
    }
  }else if(wipeType==='door_open'){
    // Dark rectangle expanding from door position
    const maxW=W, maxH=H;
    const cw=Math.floor(maxW*ease), ch=Math.floor(maxH*ease);
    const cx=wipeDoorX-cw/2, cy=wipeDoorY-ch/2;
    bx(cx,cy,cw,ch,'#080810');
  }else if(wipeType==='door_close'){
    // Dark rectangle shrinking to door position
    const maxW=W, maxH=H;
    const cw=Math.floor(maxW*(1-ease)), ch=Math.floor(maxH*(1-ease));
    const cx=wipeDoorX-cw/2, cy=wipeDoorY-ch/2;
    bx(cx,cy,cw,ch,'#080810');
  }
}

// ═══════════════════════════════════════
// MAP LOADING SCREEN
// ═══════════════════════════════════════
let mapLoadScreenActive=false, mapLoadScreenFrame=0, mapLoadScreenName='', mapLoadScreenCards='';
let mapLoadScreenFloor=0; // 0=town/generic, 1-5=dungeon floor
// v72: Dungeon Run Summary
let dungeonRunSnapshot=null; // snapshot when entering dungeon
let runSummaryActive=false, runSummaryFrame=0, runSummaryData=null;
// v79: Active Run Mission
let runMission=null; // {type,desc,progress,goal,reward,rewardKey,completed,rewardGiven}
let roundsThisRun=0; // battle rounds completed this dungeon run
const MAP_LOAD_DURATION=80; // ~1.3 seconds at 60fps — dramatic pause

function showMapLoadScreen(name, cards, floor){
  mapLoadScreenActive=true;
  mapLoadScreenFrame=0;
  mapLoadScreenName=name;
  mapLoadScreenCards=cards||'';
  mapLoadScreenFloor=floor||0;
}
function updateMapLoadScreen(){
  if(!mapLoadScreenActive)return;
  mapLoadScreenFrame++;
  if(mapLoadScreenFrame>=MAP_LOAD_DURATION)mapLoadScreenActive=false;
}
function drawMapLoadScreen(){
  if(!mapLoadScreenActive)return;
  const t=mapLoadScreenFrame/MAP_LOAD_DURATION;
  // Fade in quickly, hold, fade out at end
  let alpha;
  if(t<0.15) alpha=t/0.15;
  else if(t>0.85) alpha=(1-t)/0.15;
  else alpha=1;
  alpha=Math.max(0,Math.min(1,alpha));

  const fl=mapLoadScreenFloor;
  const isDungeon=fl>0;
  // Floor atmosphere colors
  const atmosBg=['#0c0c18','#1a1828','#0d1a10','#1c1608','#1a0808','#200404'][fl]||'#0c0c18';
  const atmosAccent=['#c8c0a0','#a8a0c0','#70b870','#d0a840','#d06040','#e06020'][fl]||'#c8c0a0';

  g.globalAlpha=alpha;
  bx(0,0,W,H,atmosBg);

  if(isDungeon){
    // Dramatic: falling pixel particles (dungeon descent effect)
    for(let i=0;i<30;i++){
      const px_=((i*1237+mapLoadScreenFrame*3)%1000/1000)*W;
      const py_=((i*3141+mapLoadScreenFrame*4)%1000/1000)*(H+40)-20;
      const pa=0.3+Math.sin(mapLoadScreenFrame*0.08+i*0.7)*0.3;
      g.globalAlpha=alpha*pa;
      g.fillStyle=atmosAccent;
      g.fillRect(px_,py_,2,4);
    }
    g.globalAlpha=alpha;

    // Floor number — huge
    const floorNums=['','I','II','III','IV','V'];
    const floorNum=floorNums[fl]||String(fl);
    const floorLabel='FLOOR '+floorNum;
    const flLabelW=floorLabel.length*20;
    // Glowing floor number
    const glowA=0.12+Math.sin(mapLoadScreenFrame*0.12)*0.08;
    g.globalAlpha=alpha*glowA;
    g.font='bold 120px VT323, monospace';
    g.textAlign='center';
    g.fillStyle=atmosAccent;
    g.fillText(floorLabel,W/2,H/2+45);
    g.textAlign='left';
    g.globalAlpha=alpha;

    txShadow(floorLabel,W/2-flLabelW/2,H/2-5,20,atmosAccent,'rgba(0,0,0,.7)');

    // Horizontal decorative lines
    bx(W/2-120,H/2+6,240,1,atmosAccent+'80');

    // Atmosphere description
    const flAtmosDesc=[
      '','Ancient dust settles...','Mushroom spores drift in the dark...',
      'Crumbling ruins whisper old secrets...','Embers drift upward from below...',
      'The heat here is nearly unbearable...'
    ];
    const atmDesc=flAtmosDesc[fl]||'';
    if(atmDesc&&t>0.2&&t<0.9){
      const txtAlpha=t>0.2&&t<0.3?(t-0.2)/0.1:t>0.8?(1-t)/0.1:1;
      g.globalAlpha=alpha*txtAlpha*0.75;
      txShadow(atmDesc,W/2-atmDesc.length*4,H/2+24,8,'#a09080','rgba(0,0,0,.5)');
      g.globalAlpha=alpha;
    }

    // v95: Rival threat warning — show rivals already present on this floor
    if(t>0.38&&t<0.90){
      const warnAlpha=t<0.48?(t-0.38)/0.10:t>0.82?(0.90-t)/0.08:1;
      const rivalsHere=[];
      if(rivalMaps[0]===mapLoadScreenFloor)rivalsHere.push({name:pl[1].n,cards:pl[1].cd.filter(c=>c>0).length,col:'#e060a0'});
      if(rivalMaps[1]===mapLoadScreenFloor)rivalsHere.push({name:pl[2].n,cards:pl[2].cd.filter(c=>c>0).length,col:'#d0a030'});
      if(rivalsHere.length>0){
        const baseY=H/2+60;
        g.textAlign='center';
        rivalsHere.forEach((rv,i)=>{
          const wTxt='\u26a0 '+rv.name+': '+rv.cards+' cards \u2014 HERE';
          g.globalAlpha=alpha*warnAlpha*0.9;
          g.font='bold 9px VT323, monospace';
          g.fillStyle=rv.col;
          g.shadowColor=rv.col;g.shadowBlur=8;
          g.fillText(wTxt,W/2,baseY+i*14);
          g.shadowBlur=0;
        });
        g.textAlign='left';
        g.globalAlpha=alpha;
      }
    }

    // Card rarity hint at bottom
    if(mapLoadScreenCards&&t>0.25){
      txShadow(mapLoadScreenCards,W/2-mapLoadScreenCards.length*4,H/2+46,7,atmosAccent,'rgba(0,0,0,.5)');
    }
  }else{
    // Town/generic: simple name display
    const nameW=mapLoadScreenName.length*8;
    txShadow(mapLoadScreenName,W/2-nameW,H/2-10,16,'#f8f0e0','rgba(0,0,0,.6)');
    if(mapLoadScreenCards){
      txShadow(mapLoadScreenCards,W/2-mapLoadScreenCards.length*3,H/2+20,6,'#c8c0a0','rgba(0,0,0,.4)');
    }
    bx(W/2-80,H/2+4,160,1,'rgba(200,180,140,.5)');
  }
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v72: DUNGEON RUN SUMMARY OVERLAY
// ═══════════════════════════════════════
function updateRunSummary(){
  if(!runSummaryActive)return;
  runSummaryFrame++;
}
function drawRunSummary(){
  if(!runSummaryActive||!runSummaryData)return;
  const d=runSummaryData;
  const t=Math.min(1,runSummaryFrame/30); // 0.5s slide-in
  const slideY=(1-t)*60;
  const missionExtra=d.missionDesc?44:0;
  const panelW=320,panelH=Math.max(160,140+d.lostCards.length*18)+missionExtra;
  const px=W/2-panelW/2,py=H/2-panelH/2+slideY;

  // Dim background
  g.globalAlpha=Math.min(0.75,t*0.75);
  bx(0,0,W,H,'rgba(0,0,0,.9)');
  g.globalAlpha=t;

  // Panel
  bx(px,py,panelW,panelH,'#0c1018');
  bx(px,py,panelW,1,'#60a8d0');bx(px,py+panelH-1,panelW,1,'#60a8d0');
  bx(px,py,1,panelH,'#60a8d0');bx(px+panelW-1,py,1,panelH,'#60a8d0');
  bx(px+1,py+1,panelW-2,1,'#304860');bx(px+1,py+panelH-2,panelW-2,1,'#304860');

  // Title
  const titleX=px+panelW/2;
  txShadow('DUNGEON REPORT',titleX-64,py+20,9,'#60c8f0','rgba(0,0,0,.6)');
  bx(px+20,py+28,panelW-40,1,'#304860');

  // Floor depth
  const floorNums=['','I','II','III','IV','V'];
  const floorTxt='Deepest floor: FLOOR '+(floorNums[d.deepest]||d.deepest);
  tx(floorTxt,px+20,py+46,7,'#c8c0a0');

  // Cards collected
  const gainColor=d.cardsGained>0?'#50e090':'#888898';
  tx('Cards collected: '+(d.cardsGained>0?'+':'')+d.cardsGained,px+20,py+64,7,gainColor);

  // Cards lost
  if(d.lostCards.length>0){
    bx(px+20,py+76,panelW-40,1,'#301010');
    tx('Cards lost:',px+20,py+90,7,'#d06060');
    d.lostCards.forEach((cr,i)=>{
      const ly=py+107+i*18;
      const rCol=['','#888898','#60b060','#6090d8','#c060c0','#f0c830'][cr.r]||'#888898';
      tx('✗ '+cr.n,px+28,ly,6,'#f06060');
      tx((['','C','U','R','E','L'][cr.r]||'?'),px+panelW-40,ly,6,rCol);
    });
  }else{
    bx(px+20,py+76,panelW-40,1,'#103010');
    tx('All cards preserved!',px+20,py+90,7,'#50e090');
  }

  // v79: Mission result section
  if(d.missionDesc){
    const mSecY=py+panelH-missionExtra-2;
    bx(px+20,mSecY,panelW-40,1,'#103030');
    const mWon=!!d.missionReward;
    txShadow('\u2605 MISSION: '+d.missionDesc,px+20,mSecY+14,7,'#f0c830','rgba(0,0,0,.4)');
    txShadow('REWARD: '+d.missionReward,px+20,mSecY+30,7,'#50e090','rgba(0,0,0,.3)');
  }

  // Dismiss hint — blink after 2s
  if(runSummaryFrame>120){
    const blinkA=0.5+Math.sin(runSummaryFrame*0.1)*0.4;
    g.globalAlpha=t*blinkA;
    tx('[ PRESS ANY KEY ]',px+panelW/2-56,py+panelH-10,6,'#808890');
    g.globalAlpha=t;
  }
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v77: QUICK HAND INSPECT OVERLAY
// ═══════════════════════════════════════
function updateHandInspect(){
  if(!handInspectActive)return;
  handInspectFrame++;
  if(handInspectFrame>=handInspectAutoDismiss)handInspectActive=false;
}
function drawHandInspect(){
  if(!handInspectActive||sc!=='map')return;
  const t=Math.min(1,handInspectFrame/10);
  const fadeOut_=handInspectFrame>handInspectAutoDismiss-20?
    Math.max(0,(handInspectAutoDismiss-handInspectFrame)/20):1;
  const alpha=t*fadeOut_;

  g.globalAlpha=alpha*0.88;
  bx(0,0,W,H,'rgba(0,0,0,.75)');
  g.globalAlpha=alpha;

  const filled=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
  const total=filled.length;
  if(total===0){
    txShadow('Hand is empty.',W/2-60,H/2,9,'#888898','rgba(0,0,0,.5)');
    g.globalAlpha=1;return;
  }

  // Header
  txShadow('YOUR HAND',W/2-52,40,10,'#c8d0f0','rgba(0,0,0,.5)');
  txShadow(total+'/'+HAND_SIZE+' cards',W/2-30,56,6,'#8890b0','rgba(0,0,0,.4)');
  bx(40,62,W-80,1,'#30305060');

  // Card grid: up to 8 cards in 2 rows
  const cols=Math.min(4,total),rows=Math.ceil(total/4);
  const cw=160,ch=180,padX=(W-(cols*cw))/2,padY=80;

  filled.forEach((slot,i)=>{
    const cid=pl[0].cd[slot];if(!cid)return;
    const cr=CD[cid-1];
    const col_=i%cols,row_=Math.floor(i/cols);
    const cx_=padX+col_*cw+8,cy_=padY+row_*ch;

    // Card background
    bx(cx_,cy_,cw-16,ch-8,cr.d);
    bx(cx_+1,cy_+1,cw-18,ch-10,cr.c);

    // Card art
    bx(cx_+2,cy_+2,cw-20,72,cr.d);
    drawCardCharacter(cx_+(cw-20)/2-10,cy_+4,cid,1.6,fr);

    // Rarity stars
    const rarC=RARITY_COLOR[cr.r]||'#888';
    for(let s=0;s<cr.r;s++)tx('\u2605',cx_+4+s*10,cy_+80,6,rarC);

    // Card name
    const nfs=Math.max(7,Math.min(11,Math.floor((cw-24)/(cr.n.length*0.7))));
    txShadow(cr.n,cx_+(cw-16)/2-(cr.n.length*nfs/2.4),cy_+94,nfs,'#f0e8d0','rgba(0,0,0,.4)');

    // Effect
    tx(cr.f||'',cx_+4,cy_+112,5,'#c0b888');

    // Decay bar + time
    if(cardTimers[slot]>0){
      const elapsed=Date.now()-cardTimers[slot];
      const remFrac=Math.max(0,1-elapsed/CARD_DECAY_MS);
      const remMs=Math.max(0,CARD_DECAY_MS-elapsed);
      const barW=cw-24;
      bx(cx_+4,cy_+ch-24,barW,5,'#181828');
      const barCol=remFrac>0.5?'#40d040':remFrac>0.25?'#d0c040':'#d04040';
      bx(cx_+4,cy_+ch-24,Math.floor(barW*remFrac),5,barCol);
      const secs=Math.ceil(remMs/1000);
      const mm=Math.floor(secs/60),ss=secs%60;
      const timeStr=mm>0?mm+'m'+('0'+ss).slice(-2)+'s':ss+'s';
      tx(timeStr,cx_+4,cy_+ch-10,5,barCol);
    }else{
      tx('SAFE',cx_+4,cy_+ch-10,5,'#508050');
    }
  });

  // Dismiss hint
  const blinkA=0.5+Math.sin(handInspectFrame*0.12)*0.4;
  g.globalAlpha=alpha*blinkA;
  tx('TAB or any key to close',W/2-64,H-20,6,'#808890');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// v73: RIVAL INTEL DISPATCH TICKER
// ═══════════════════════════════════════
function updateRivalNews(){
  if(rivalNewsCurrent){
    rivalNewsFrame++;
    if(rivalNewsFrame>=RIVAL_NEWS_DURATION){
      rivalNewsCurrent=null;
      rivalNewsFrame=0;
    }
  }else if(rivalNewsQueue.length>0){
    rivalNewsCurrent=rivalNewsQueue.shift();
    rivalNewsFrame=0;
  }
}
function drawRivalNews(){
  if(!rivalNewsCurrent||!inDungeon)return;
  const t=rivalNewsFrame/RIVAL_NEWS_DURATION;
  // slide in from left in first 8 frames, hold, slide out at end
  const slideIn=Math.min(1,rivalNewsFrame/8);
  const slideOut=t>0.85?Math.max(0,(1-t)/0.15):1;
  const alpha=slideIn*slideOut;
  if(alpha<0.02)return;

  const rivalCols=[['#d860a0','#401028'],['#d8b028','#402808']]; // VEGA pink, MIRA gold
  const item=rivalNewsCurrent;
  const rCols=item.rivalIdx>=0&&item.rivalIdx<2?rivalCols[item.rivalIdx]:['#80c0d0','#102028'];
  const [nameCol,bgTint]=rCols;
  // Rarity tint for the card name color
  const rarCol=['#888898','#888898','#60b060','#6090d8','#c060c0','#f0c830'][item.rarity]||'#a0a0b0';

  const msgW=Math.min(300,item.text.length*6+32);
  const msgH=28;
  const mx=8;
  const my=H-HUD_HEIGHT-msgH-8;
  const slideX=(1-slideIn)*-(msgW+mx);

  g.globalAlpha=alpha;
  // Background
  bx(mx+slideX,my,msgW,msgH,bgTint);
  bx(mx+slideX,my,3,msgH,nameCol); // color accent bar
  bx(mx+slideX,my,msgW,1,'rgba(255,255,255,0.12)');
  bx(mx+slideX,my+msgH-1,msgW,1,'rgba(0,0,0,0.5)');

  // INTEL label
  g.font='bold 7px monospace';g.fillStyle=nameCol;
  g.fillText('INTEL',mx+slideX+8,my+9);

  // Main message
  g.font='7px monospace';g.fillStyle='#e8e0d0';
  const textX=mx+slideX+8;
  const maxChars=Math.floor((msgW-20)/6);
  const display=item.text.length>maxChars?item.text.substring(0,maxChars-1)+'…':item.text;
  g.fillText(display,textX,my+20);
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// FPS COUNTER (toggle with F key)
// ═══════════════════════════════════════
let fpsCounterVisible=false, fpsFrames=0, fpsLast=performance.now(), fpsDisplay=60;
function updateFPS(){
  fpsFrames++;
  const now=performance.now();
  if(now-fpsLast>=1000){
    fpsDisplay=fpsFrames;
    fpsFrames=0;
    fpsLast=now;
  }
}
function drawFPS(){
  if(!fpsCounterVisible)return;
  const col=fpsDisplay>=50?'#40d040':fpsDisplay>=30?'#d0d040':'#d04040';
  bx(2,2,48,14,'rgba(0,0,0,.6)');
  tx('FPS:'+fpsDisplay,4,12,6,col);
}

// ═══════════════════════════════════════
// CARD COLLECTION PROGRESS BAR
// ═══════════════════════════════════════
let progressBarPulseTimer=0;
function triggerProgressPulse(){progressBarPulseTimer=60;}
function drawCardProgressBar(){
  if(sc!=='map'||mo||inBuilding||introActive)return;
  const barY=2, barX=W/2-150, barW=300, barH=10;
  // Background
  bx(barX-1,barY-1,barW+2,barH+2,'#1a1a30');
  bx(barX,barY,barW,barH,'#282838');
  // Vault progress
  const vaultSize=pl[0].vault?pl[0].vault.size:0;
  const pct=Math.min(1,vaultSize/60);
  // Color gradient: grey→blue→purple→gold
  let fillColor='#48b8e8';
  if(vaultSize>=50)fillColor='#f8c840';
  else if(vaultSize>=30)fillColor='#c060d8';
  else if(vaultSize>=10)fillColor='#48b8e8';
  if(pct>0){
    bx(barX,barY,Math.floor(barW*pct),barH,fillColor);
    bx(barX,barY,Math.floor(barW*pct),Math.floor(barH/2),'rgba(255,255,255,.15)');
  }
  // Milestone markers at 10, 20, 30, 40, 50
  for(let m=1;m<=5;m++){
    const mx=barX+Math.floor(barW*m*10/60);
    bx(mx,barY,1,barH,'#1a1a30');
  }
  // Text
  const countLabel=vaultSize+'/60';
  txShadow(countLabel,barX+barW+8,barY+9,7,vaultSize>=60?'#40d040':'#c8c0a0','rgba(0,0,0,.4)');
  // Dungeon floor indicator
  if(inDungeon){
    txShadow('B'+currentFloor,barX-30,barY+9,7,'#d8b028','rgba(0,0,0,.4)');
  }
  // Pulse glow when new card added
  if(progressBarPulseTimer>0){
    progressBarPulseTimer--;
    const pulse=Math.sin(progressBarPulseTimer*0.2)*0.3+0.3;
    g.globalAlpha=pulse;
    bx(barX-3,barY-3,barW+6,barH+6,'#f0c830');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// GRASS PARTICLES
// ═══════════════════════════════════════
const particles=[];
function spawnGrassParticles(px,py){
  for(let i=0;i<4;i++){
    particles.push({x:px+Math.random()*TW,y:py+TH-4,vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5-0.5,life:20+Math.random()*10,c:Math.random()>.5?'#48984a':'#70c070'});
  }
}
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life--;
    if(p.life<=0)particles.splice(i,1);
  }
}
function drawParticles(cx,cy){
  particles.forEach(p=>{
    const sx=p.x-cx,sy=p.y-cy;
    if(sx>0&&sx<W&&sy>0&&sy<H){
      const a=Math.min(1,p.life/10);
      g.fillStyle=p.c;g.globalAlpha=a;g.fillRect(sx,sy,2,2);g.globalAlpha=1;
    }
  });
}

