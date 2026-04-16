// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════
// Card types: 'attack'|'defense'|'flee'|'magic'|'recovery'
// Rarities: 1=Common 2=Uncommon 3=Rare 4=Epic 5=Legendary
// Cards 1-12: Attack  13-24: Defense  25-36: Flee  37-48: Magic  49-60: Recovery
const CD=[
  // ── ATTACK (1-12) ──
  {n:'AEGIS',   t:'attack',r:5,c:'#e86040',d:'#b83828',h:'#f89070',a:'#f8c840',i:'\u2694',f:'Steal x2',   fl:'Shield of the last captain'},
  {n:'UMBRA',   t:'attack',r:4,c:'#7858a0',d:'#503878',h:'#a080c8',a:'#302050',i:'\u2694',f:'Invis 1T',   fl:'The shadow that sails with no ship'},
  {n:'IGNIS',   t:'attack',r:3,c:'#d85840',d:'#a83828',h:'#f08060',a:'#f0c040',i:'\u2694',f:'Burn card',  fl:'Fire that never drowns'},
  {n:'STRIKE',  t:'attack',r:1,c:'#c04830',d:'#902820',h:'#e07060',a:'#d0a030',i:'\u2694',f:'Deal 1 dmg', fl:'The simplest blow still cuts'},
  {n:'SLASH',   t:'attack',r:1,c:'#b84030',d:'#882018',h:'#d86858',a:'#c89828',i:'\u2694',f:'Quick atk',  fl:'Faster than a shadow at noon'},
  {n:'IMPALE',  t:'attack',r:2,c:'#c05038',d:'#903030',h:'#e07860',a:'#e0b030',i:'\u2694',f:'Pierce',     fl:'No armor stops this'},
  {n:'CRUSH',   t:'attack',r:2,c:'#b84828',d:'#882820',h:'#d86848',a:'#d0a828',i:'\u2694',f:'Break guard', fl:'Force bends all things'},
  {n:'FLURRY',  t:'attack',r:3,c:'#d06040',d:'#a03828',h:'#e88868',a:'#f0c038',i:'\u2694',f:'Multi-hit',  fl:'A storm of fists and fury'},
  {n:'BERSERK', t:'attack',r:3,c:'#e05030',d:'#b02818',h:'#f07860',a:'#f8b830',i:'\u2694',f:'Rage atk',   fl:'No mind, only red'},
  {n:'VENOM',   t:'attack',r:3,c:'#984868',d:'#703050',h:'#c07090',a:'#90d068',i:'\u2694',f:'Poison',     fl:'Death on the blade tip'},
  {n:'REAPER',  t:'attack',r:4,c:'#786098',d:'#504070',h:'#9880c0',a:'#e0d0f8',i:'\u2694',f:'Lifedrain',  fl:'The void collects its due'},
  {n:'VOIDBLADE',t:'attack',r:5,c:'#504078',d:'#302858',h:'#7068a8',a:'#d0c8f8',i:'\u2694',f:'Reality cut',fl:'Cuts what cannot be cut'},
  // ── DEFENSE (13-24) ──
  {n:'GUARD',   t:'defense',r:1,c:'#4898d8',d:'#2870a8',h:'#70c0f8',a:'#b0c8e8',i:'\u25C6',f:'Block 1',   fl:'The first lesson: don\'t get hit'},
  {n:'PARRY',   t:'defense',r:1,c:'#4090c8',d:'#2068a0',h:'#68b8f0',a:'#a8c0e0',i:'\u25C6',f:'Deflect',   fl:'Let their strength become yours'},
  {n:'IRON WALL',t:'defense',r:2,c:'#5090c8',d:'#3070a0',h:'#78b8f0',a:'#c0cce0',i:'\u25C6',f:'Block 2',   fl:'An immovable thing'},
  {n:'COUNTER', t:'defense',r:2,c:'#4898c8',d:'#2878a0',h:'#70bce8',a:'#c8d8f0',i:'\u25C6',f:'Reflect dmg',fl:'Give back what was given'},
  {n:'AEGIS WARD',t:'defense',r:3,c:'#58a8e0',d:'#3888b8',h:'#80c8f8',a:'#c0d8f0',i:'\u25C6',f:'Magic barrier',fl:'Ancient sigil of the sea'},
  {n:'MIRROR',  t:'defense',r:3,c:'#60b0e8',d:'#4090c0',h:'#88d0f8',a:'#d0e8f8',i:'\u25C6',f:'Spell reflect',fl:'The face in still water'},
  {n:'FORTRESS',t:'defense',r:3,c:'#4888c0',d:'#2868a0',h:'#70b0e8',a:'#b8c8e0',i:'\u25C6',f:'Immovable', fl:'Stone does not care'},
  {n:'CRYSTAL', t:'defense',r:4,c:'#70c0f0',d:'#50a0d0',h:'#98d8f8',a:'#e0f0f8',i:'\u25C6',f:'Unbreakable',fl:'Light passes through, harm does not'},
  {n:'NULLIFY', t:'defense',r:4,c:'#5898d0',d:'#3878b0',h:'#80c0f0',a:'#d0e8f8',i:'\u25C6',f:'Cancel atk', fl:'As if it never happened'},
  {n:'ABS GUARD',t:'defense',r:4,c:'#60a8e0',d:'#4088c0',h:'#88c8f8',a:'#d8ecf8',i:'\u25C6',f:'Negate all', fl:'Beyond perfect'},
  {n:'SANCTUARY',t:'defense',r:5,c:'#80c8f0',d:'#60a8d8',h:'#a0dcf8',a:'#f0f8ff',i:'\u25C6',f:'Invincible', fl:'Where gods refuse to tread'},
  {n:'TITAN',   t:'defense',r:5,c:'#88b8e8',d:'#6898c8',h:'#a8d0f8',a:'#ffffff',i:'\u25C6',f:'Shield all',  fl:'Born from the deep earth'},
  // ── FLEE (25-36) ──
  {n:'DASH',    t:'flee',r:1,c:'#38b878',d:'#207848',h:'#60d090',a:'#a0e8c0',i:'\u25CF',f:'Quick exit',fl:'Leave your shadow behind'},
  {n:'RETREAT', t:'flee',r:1,c:'#30b070',d:'#187040',h:'#58c888',a:'#98e0b8',i:'\u25CF',f:'Safe exit',  fl:'Wisdom knows when to run'},
  {n:'SMOKE',   t:'flee',r:2,c:'#909898',d:'#686870',h:'#b0b8b8',a:'#e0e8e0',i:'\u25CF',f:'Blind foe',  fl:'What you can\'t see can still run'},
  {n:'PHASE',   t:'flee',r:2,c:'#40c090',d:'#288060',h:'#68d8a8',a:'#c0f0e0',i:'\u25CF',f:'Walk walls', fl:'The void between the waves'},
  {n:'BLINK',   t:'flee',r:3,c:'#48c898',d:'#308868',h:'#70e0b0',a:'#c8f8e8',i:'\u25CF',f:'Teleport',   fl:'Here and gone and here'},
  {n:'SHADOW',  t:'flee',r:3,c:'#506880',d:'#385060',h:'#7090a0',a:'#b0c8d0',i:'\u25CF',f:'Invisible',  fl:'Even hunters fear the dark'},
  {n:'WINDASH', t:'flee',r:3,c:'#58d0a0',d:'#38a878',h:'#80e8b8',a:'#d0f8ec',i:'\u25CF',f:'Supersonic', fl:'Outrun lightning itself'},
  {n:'PHANTOM', t:'flee',r:4,c:'#60a890',d:'#408870',h:'#88c8a8',a:'#d0f0e8',i:'\u25CF',f:'Ghost mode',  fl:'Between the living world'},
  {n:'VOIDSTEP',t:'flee',r:4,c:'#486878',d:'#305860',h:'#68908a',a:'#c0d8e0',i:'\u25CF',f:'Dim-hop',    fl:'One foot in another world'},
  {n:'TIMESKIP',t:'flee',r:4,c:'#70b8c0',d:'#509098',h:'#90d0d8',a:'#e0f0f8',i:'\u25CF',f:'Pause time',  fl:'The clock obeys no one'},
  {n:'ARK GATE',t:'flee',r:5,c:'#78c8d0',d:'#58a0b0',h:'#98e0e8',a:'#f0feff',i:'\u25CF',f:'Instant esc', fl:'The door was always there'},
  {n:'GENESIS', t:'flee',r:5,c:'#90d0e0',d:'#70b0c0',h:'#b0e8f0',a:'#ffffff',i:'\u25CF',f:'Rewind self',  fl:'Begin again from the start'},
  // ── MAGIC (37-48) ──
  {n:'TEMPEST', t:'magic',r:5,c:'#d8b028',d:'#a88818',h:'#f0d850',a:'#ffffff',i:'\u2605',f:'No barrier', fl:'The storm answers to no flag'},
  {n:'NIHIL',   t:'magic',r:4,c:'#9868d0',d:'#7048a8',h:'#c090e8',a:'#f0e8ff',i:'\u2605',f:'Copy card',  fl:'What is nothing can be all things'},
  {n:'SPARK',   t:'magic',r:1,c:'#c0b030',d:'#908818',h:'#e0d050',a:'#f8f090',i:'\u2605',f:'1 magic dmg', fl:'Seed of the thundercloud'},
  {n:'FROST',   t:'magic',r:1,c:'#90c8d8',d:'#70a8b8',h:'#b0e0f0',a:'#e8f8ff',i:'\u2605',f:'Slow foe',   fl:'Cold has patience'},
  {n:'BLAZE',   t:'magic',r:2,c:'#d89028',d:'#a87018',h:'#f0b050',a:'#f8d870',i:'\u2605',f:'Fire dmg',   fl:'The first element, oldest anger'},
  {n:'STATIC',  t:'magic',r:2,c:'#c8b840',d:'#988820',h:'#e8d860',a:'#f8f0a0',i:'\u2605',f:'Stun 1T',    fl:'The air before a strike'},
  {n:'INFERNO', t:'magic',r:3,c:'#e09820',d:'#b07010',h:'#f0c040',a:'#f8e870',i:'\u2605',f:'Area fire',  fl:'The ocean does not stop it'},
  {n:'BLIZZARD',t:'magic',r:3,c:'#a0d0e8',d:'#80b0c8',h:'#c0e8f8',a:'#f0feff',i:'\u2605',f:'Freeze area', fl:'Even memories freeze in it'},
  {n:'THUNDER', t:'magic',r:3,c:'#d8c030',d:'#a89010',h:'#f0e050',a:'#ffffff',i:'\u2605',f:'Chain bolt',  fl:'One strike, many wounds'},
  {n:'MAELSTROM',t:'magic',r:4,c:'#5090c8',d:'#3070a8',h:'#78b8e8',a:'#d0e8f8',i:'\u2605',f:'Water vortex',fl:'Drawn into the deep'},
  {n:'GRAVITY', t:'magic',r:4,c:'#806890',d:'#605070',h:'#a088b8',a:'#e0d8f0',i:'\u2605',f:'Crush force', fl:'Even light bends'},
  {n:'SINGULARITY',t:'magic',r:5,c:'#302848',d:'#201838',h:'#504870',a:'#c0b8e0',i:'\u2605',f:'Black hole',fl:'Everything falls inward'},
  // ── RECOVERY (49-60) ──
  {n:'MEND',    t:'recovery',r:1,c:'#e0b030',d:'#b08820',h:'#f8d050',a:'#fff8c0',i:'\u25CE',f:'Heal 1 HP',  fl:'Small acts of repair'},
  {n:'REST',    t:'recovery',r:1,c:'#d8a828',d:'#a87818',h:'#f0c850',a:'#f8e8a0',i:'\u25CE',f:'Restore SP', fl:'The body knows what it needs'},
  {n:'POTION',  t:'recovery',r:2,c:'#e0b838',d:'#b09020',h:'#f8d860',a:'#fff0b0',i:'\u25CE',f:'Restore HP', fl:'Old recipe, still works'},
  {n:'BANDAGE', t:'recovery',r:2,c:'#d8c070',d:'#a89848',h:'#f0d888',a:'#fffff0',i:'\u25CE',f:'Stop bleed', fl:'Simple, but it saves lives'},
  {n:'REJUVEN', t:'recovery',r:3,c:'#e8c040',d:'#b89820',h:'#f8e060',a:'#ffffff',i:'\u25CE',f:'Full HP',    fl:'As if no wound was dealt'},
  {n:'WARD',    t:'recovery',r:3,c:'#e0c858',d:'#b0a038',h:'#f8e078',a:'#fff8d0',i:'\u25CE',f:'Next-dmg:0', fl:'Set a watch on the body'},
  {n:'LIFEDRAIN',t:'recovery',r:3,c:'#c07850',d:'#a06038',h:'#e09870',a:'#f8e0d0',i:'\u25CE',f:'Steal HP',  fl:'Your health, my health'},
  {n:'PHOENIX', t:'recovery',r:4,c:'#e88030',d:'#c06020',h:'#f8a860',a:'#fff0e0',i:'\u25CE',f:'Revive once', fl:'The ash is just the beginning'},
  {n:'ELIXIR',  t:'recovery',r:4,c:'#f0c040',d:'#c09820',h:'#f8e070',a:'#ffffff',i:'\u25CE',f:'Cure all',   fl:'What alchemists dreamed of'},
  {n:'HOLY LIGHT',t:'recovery',r:4,c:'#f0d860',d:'#c0a840',h:'#f8f090',a:'#ffffff',i:'\u25CE',f:'Heal+purify',fl:'Light that cleans as well as heals'},
  {n:'GEN PULSE',t:'recovery',r:5,c:'#f8e070',d:'#d0b848',h:'#fff898',a:'#ffffff',i:'\u25CE',f:'Restore all',fl:'From the source of all things'},
  {n:'ARK BLESS',t:'recovery',r:5,c:'#fff0a0',d:'#e8c870',h:'#fffff0',a:'#ffffff',i:'\u25CE',f:'Ultimate heal',fl:'The ARK\'s final gift'},
];

// ═══════════════════════════════════════
// CARD CHARACTER SPRITES (pixel art) — with idle animations
// ═══════════════════════════════════════

// Particle pools for each character (indexed by cardId 1-60)
const charParticles={};
for(let _ci=1;_ci<=60;_ci++)charParticles[_ci]=[];
const CHAR_PARTICLE_MAX=3;

// v354: pre-baked rgba tables for card animation — eliminates .toFixed string alloc per frame
const _RGBA_W101=(()=>{const a=new Array(101);for(let i=0;i<=100;i++)a[i]='rgba(255,255,255,'+(i/100).toFixed(2)+')';return a;})();
const _RGBA_VOID101=(()=>{const a=new Array(101);for(let i=0;i<=100;i++)a[i]='rgba(48,32,80,'+(i/100).toFixed(2)+')';return a;})();
const _RGBA_AURA101=(()=>{const a=new Array(101);for(let i=0;i<=100;i++)a[i]='rgba(96,200,168,'+(i/100).toFixed(2)+')';return a;})();
function _rw(v){return _RGBA_W101[Math.min(100,Math.max(0,v*100+0.5|0))];}
function _rv(v){return _RGBA_VOID101[Math.min(100,Math.max(0,v*100+0.5|0))];}
function _ra(v){return _RGBA_AURA101[Math.min(100,Math.max(0,v*100+0.5|0))];}
// v354: pre-baked per-card full glow rgba table [cardIdx][alpha0-100] — zero alloc per frame
const _CARD_GLOW_RGBA=(()=>{const t=[];for(let i=0;i<CD.length;i++){const cr=CD[i];const r=parseInt(cr.c.slice(1,3),16),g_=parseInt(cr.c.slice(3,5),16),b=parseInt(cr.c.slice(5,7),16);const a=new Array(101);for(let j=0;j<=100;j++)a[j]='rgba('+r+','+g_+','+b+','+(j/100).toFixed(2)+')';t.push(a);}return t;})();
// Card reveal animation state: {cardId, startFrame, done}
let cardRevealState=null;
function startCardReveal(cardId){cardRevealState={cardId:cardId,startFrame:fr,done:false};}
function getRevealProgress(cardId){
  if(!cardRevealState||cardRevealState.cardId!==cardId)return 1;
  const elapsed=fr-cardRevealState.startFrame;
  if(elapsed>=30){cardRevealState.done=true;return 1;}
  return elapsed/30;
}
// Reveal sparkle particles
const revealSparkles=[];

function drawCardCharacter(x,y,cardId,scale,time){
  const s=scale||1;
  const t=(typeof time==='number')?time:((typeof fr!=='undefined')?fr:0);
  // Reveal: if this card is being revealed, apply silhouette->color effect
  const revealProg=getRevealProgress(cardId);
  const revealing=revealProg<1;

  function px(rx,ry,w,h,c){
    let finalColor=c;
    if(revealing){
      // Reveal from top to bottom: pixels above the reveal line show color, below show black
      const pixelNormY=ry/20; // normalize to 0..1 range (char is ~20px tall)
      if(pixelNormY>revealProg){
        finalColor='#111118';
      }
    }
    g.fillStyle=finalColor;g.fillRect(x+rx*s,y+ry*s,w*s,h*s);
  }

  if(cardId===1){
    // AEGIS — Crystal Knight
    // Idle: body sway
    const sway=Math.sin(t*0.035)*1; // 1px left/right, ~3s cycle at 60fps
    const shieldGlow=0.3+0.3*Math.sin(t*0.052); // pulse ~2s cycle
    const shieldBright=_rw(shieldGlow);
    // Crystal crest sparkle
    const sparkleOn=(Math.sin(t*0.08)>0.85);

    // Helmet crest (blue crystal)
    px(6+sway,0,4,2,'#80d0f0');px(7+sway,0,2,1,'#b0e8ff');
    px(5+sway,2,6,1,'#48b8e8');px(6+sway,1,4,1,'#48b8e8');
    if(sparkleOn)px(8+sway,0,1,1,'#ffffff');
    // Helmet body
    px(4+sway,3,8,3,'#c0c8d0');px(5+sway,3,6,1,'#d8dce0');
    // Visor with glowing blue eyes
    px(4+sway,6,8,2,'#808890');px(5+sway,6,2,1,'#48b8e8');px(9+sway,6,2,1,'#48b8e8');
    px(5+sway,7,2,1,'#2088b0');px(9+sway,7,2,1,'#2088b0');
    // Armor body
    px(3+sway,8,10,2,'#c0c8d0');px(4+sway,8,8,1,'#d8dce0');
    px(3+sway,10,10,4,'#a0a8b8');px(4+sway,10,8,3,'#c0c8d0');
    // Blue trim on armor
    px(3+sway,10,1,4,'#48b8e8');px(12+sway,10,1,4,'#48b8e8');
    px(5+sway,13,6,1,'#2088b0');
    // Shield in left hand — with glow pulse
    px(0+sway,9,3,5,'#2088b0');px(0+sway,10,3,3,'#48b8e8');
    px(1+sway,10,1,3,'#ffffff');px(0+sway,11,3,1,'#ffffff');
    // Shield glow overlay
    px(0+sway,9,3,5,shieldBright);
    // Right arm
    px(13+sway,9,2,4,'#c0c8d0');px(14+sway,10,1,2,'#a0a8b8');
    // Legs with boots (no sway — grounded)
    px(5,14,2,4,'#a0a8b8');px(9,14,2,4,'#a0a8b8');
    px(4,17,3,2,'#606870');px(9,17,3,2,'#606870');
    px(4,18,4,1,'#484850');px(9,18,4,1,'#484850');
    // Armor highlight
    px(6+sway,9,4,1,'rgba(255,255,255,0.25)');
  }else if(cardId===2){
    // UMBRA — Shadow Rogue
    // Idle: cloak edge waver, eye glow pulse, shadow particles
    const eyeGlow=(Math.sin(t*0.035)>0.7)?1:0; // bright flash every ~3s
    const eyeColor=eyeGlow?'#e0a0ff':'#c080ff';
    const eyeColor2=eyeGlow?'#c080e0':'#a060d0';
    // Cloak bottom waver offsets
    const w0=Math.round(Math.sin(t*0.06)*1);
    const w1=Math.round(Math.sin(t*0.06+1.5)*1);
    const w2=Math.round(Math.sin(t*0.06+3.0)*1);

    // Hood top
    px(5,0,6,2,'#503878');px(4,2,8,2,'#503878');
    px(6,0,4,1,'#604090');
    // Hood sides
    px(3,4,10,3,'#503878');px(4,4,8,2,'#604090');
    // Glowing purple eyes
    px(5,5,2,1,eyeColor);px(9,5,2,1,eyeColor);
    px(5,6,2,1,eyeColor2);px(9,6,2,1,eyeColor2);
    // Cloak body
    px(2,7,12,4,'#503878');px(3,7,10,3,'#604090');
    px(4,7,8,2,'#7858a0');
    // Crescent moon on chest
    px(7,8,1,2,'#a080c8');px(6,9,1,1,'#a080c8');px(8,9,1,1,'#a080c8');
    // Lower cloak (tattered) — with waver
    px(2+w0,11,12,4,'#503878');px(3,11,10,3,'#604090');
    px(1+w1,14,2,2,'#503878');px(13+w2,14,2,2,'#503878');
    // Wispy edges — with waver
    px(1+w1,15,1,2,'#402868');px(14+w2,15,1,2,'#402868');
    px(4+w0,15,2,1,'#7858a0');px(10+w0,15,2,1,'#7858a0');
    // Shadow trail below — with waver
    px(3+w0,16,10,1,'#402868');px(4+w1,17,8,1,'#302050');
    px(5+w2,18,6,1,'#201840');px(6,19,4,1,'rgba(48,32,80,0.5)');
    // Cloak highlight
    px(4,4,1,3,'#a080c8');px(11,4,1,3,'#a080c8');

    // Shadow particles drifting down
    const pp=charParticles[2];
    if(t%20===0&&pp.length<CHAR_PARTICLE_MAX){
      pp.push({rx:4+Math.random()*8,ry:16,life:15+Math.random()*10});
    }
    for(let i=pp.length-1;i>=0;i--){
      const p=pp[i];p.ry+=0.3;p.life--;
      if(p.life<=0){pp.splice(i,1);continue;}
      const a=Math.min(1,p.life/8);
      g.fillStyle=_rv(a);
      g.fillRect(x+p.rx*s,y+p.ry*s,s,s);
    }
  }else if(cardId===3){
    // IGNIS — Fire Beast (four-legged wolf/fox)
    // Idle: flame flicker on horns/tail, body crouch, ember particles
    const crouch=Math.round(Math.sin(t*0.07)*1); // 1px up/down, ~1.5s cycle
    const flamePhase=(Math.floor(t/8)%2===0); // alternate flame shapes every 8 frames

    // Horns (burning) — flickering between two shapes
    if(flamePhase){
      px(3,0+crouch,2,3,'#f0c040');px(3,0+crouch,1,1,'#ffe060');
      px(11,0+crouch,2,3,'#f0c040');px(12,0+crouch,1,1,'#ffe060');
    }else{
      px(3,1+crouch,2,2,'#ffe060');px(4,0+crouch,1,1,'#f0c040');
      px(11,1+crouch,2,2,'#ffe060');px(12,0+crouch,1,1,'#f0c040');
    }
    // Head
    px(4,3+crouch,8,4,'#d85840');px(5,3+crouch,6,3,'#e87060');
    // Glowing yellow eyes
    px(5,4+crouch,2,2,'#f0c040');px(9,4+crouch,2,2,'#f0c040');
    px(6,5+crouch,1,1,'#d85840');px(10,5+crouch,1,1,'#d85840');
    // Open mouth with teeth
    px(6,7+crouch,4,2,'#a83828');px(7,7+crouch,1,1,'#ffffff');px(9,7+crouch,1,1,'#ffffff');
    // Fur body
    px(2,8+crouch,12,5,'#d85840');px(3,8+crouch,10,4,'#e87060');
    // Flame patterns on body
    px(4,9+crouch,2,2,'#f08060');px(8,8+crouch,3,2,'#f08060');px(11,9+crouch,1,3,'#f0c040');
    // Front legs
    px(3,13,2,5,'#d85840');px(6,13,2,5,'#d85840');
    px(3,17,2,1,'#a83828');px(6,17,2,1,'#a83828');
    // Back legs
    px(9,13,2,5,'#d85840');px(12,13,2,5,'#d85840');
    px(9,17,2,1,'#a83828');px(12,17,2,1,'#a83828');
    // Flame-tipped tail — flickering
    if(flamePhase){
      px(14,7+crouch,2,2,'#d85840');px(15,6+crouch,2,2,'#f08060');px(16,5+crouch,2,2,'#f0c040');px(17,4+crouch,1,2,'#ffe060');
    }else{
      px(14,7+crouch,2,2,'#d85840');px(15,6+crouch,2,2,'#f0c040');px(16,5+crouch,1,3,'#ffe060');px(17,5+crouch,1,1,'#f08060');
    }
    // Body highlight
    px(5,8+crouch,6,1,'rgba(255,255,255,0.15)');

    // Ember particles floating up
    const pp=charParticles[3];
    if(t%12===0&&pp.length<CHAR_PARTICLE_MAX){
      pp.push({rx:4+Math.random()*8,ry:8+crouch,life:18+Math.random()*8,c:Math.random()>0.5?'#f0c040':'#f08060'});
    }
    for(let i=pp.length-1;i>=0;i--){
      const p=pp[i];p.ry-=0.35;p.rx+=Math.sin(t*0.1+i)*0.15;p.life--;
      if(p.life<=0){pp.splice(i,1);continue;}
      const a=Math.min(1,p.life/10);
      g.fillStyle=p.c;g.globalAlpha=a;
      g.fillRect(x+p.rx*s,y+p.ry*s,s,s);
      g.globalAlpha=1;
    }
  }else if(cardId===4){
    // TEMPEST — Storm Prophet (floating cloud being)
    // Idle: float up/down, lightning sparks, cloud shape shift
    const floatY=Math.sin(t*0.052)*2; // 2px range, ~2s cycle
    const cloudShift=Math.round(Math.sin(t*0.04)*1); // 1px cloud variation

    // Head/face area
    px(5,0+floatY,6,3,'#d8b028');px(6,0+floatY,4,2,'#f0d850');
    // Golden eyes
    px(6,2+floatY,2,1,'#ffffff');px(9,2+floatY,1,1,'#ffffff');
    px(6,3+floatY,2,1,'#d8b028');px(9,3+floatY,1,1,'#d8b028');
    // Upper body (swirling cloud) — with shift
    px(3+cloudShift,4+floatY,10,3,'#e0d0a0');px(4+cloudShift,4+floatY,8,2,'#f0e8c0');
    // Lightning bolt on chest
    px(7,5+floatY,2,1,'#ffffff');px(6,6+floatY,2,1,'#ffffff');px(7,7+floatY,2,1,'#ffffff');px(8,8+floatY,2,1,'#ffffff');
    // Cloud arms — with shift
    px(1+cloudShift,5+floatY,2,3,'#e0d0a0');px(0+cloudShift,6+floatY,2,2,'#d0c890');
    px(13-cloudShift,5+floatY,2,3,'#e0d0a0');px(14-cloudShift,6+floatY,2,2,'#d0c890');
    // Mid body (cloud swirl) — with shift
    px(2+cloudShift,7+floatY,12,4,'#e0d0a0');px(3+cloudShift,7+floatY,10,3,'#f0e8c0');
    px(4,8+floatY,3,2,'#f8f0d0');px(9,9+floatY,3,1,'#f8f0d0');
    // Lightning sparks — random positions that flash for ~2 frames
    const sparkPositions=[
      {rx:1,ry:4},{rx:14,ry:3},{rx:0,ry:8},{rx:15,ry:5},{rx:0,ry:3},{rx:14,ry:9},
      {rx:-1,ry:6},{rx:16,ry:7},{rx:2,ry:2},{rx:13,ry:10}
    ];
    // Pick 1-2 sparks based on time, each visible for 2 frames
    for(let si=0;si<sparkPositions.length;si++){
      const sparkPhase=(t+si*7)%18;
      if(sparkPhase<2){
        const sp=sparkPositions[si];
        px(sp.rx,sp.ry+floatY,1,1,'#ffffff');
      }
    }
    // Cloud lower body (no legs)
    px(3-cloudShift,11+floatY,10,2,'#d0c890');px(4-cloudShift,11+floatY,8,1,'#e0d0a0');
    px(4,13+floatY,8,2,'#c8c080');px(5,13+floatY,6,1,'#d0c890');
    // Wispy cloud bottom
    px(5,15+floatY,6,1,'#b8b070');px(6,16+floatY,4,1,'#a8a060');
    px(7,17+floatY,2,1,'rgba(168,160,96,0.5)');
  }else if(cardId===5){
    // NIHIL — Void Observer (ghost with single eye)
    // Idle: eye pulse, body sway, vortex rotation, tentacle wave
    const sway=Math.sin(t*0.042)*1; // 1px sway, ~2.5s cycle
    const eyePulse=Math.sin(t*0.07); // ~1.5s cycle
    const eyeExtra=(eyePulse>0.3)?1:0; // eye grows 1px when pulse is high
    // Vortex spiral rotation — shift spiral line positions
    const spiralPhase=Math.floor(t/10)%4;
    // Tentacle wave
    const tw0=Math.round(Math.sin(t*0.05)*1);
    const tw1=Math.round(Math.sin(t*0.05+1.5)*1);
    const tw2=Math.round(Math.sin(t*0.05+3.0)*1);

    // Aura glow — pulsing
    const auraBright=0.15+0.1*Math.sin(t*0.04);
    px(3+sway,0,10,1,_ra(auraBright));
    px(2+sway,1,12,1,_ra(auraBright*0.75));
    // Upper body (spiral start)
    px(4+sway,1,8,3,'#38a880');px(5+sway,1,6,2,'#48b898');
    // Large single eye — with pulse
    px(5+sway-eyeExtra,4-eyeExtra,6+eyeExtra*2,4+eyeExtra,'#ffffff');
    px(6+sway-eyeExtra,4-eyeExtra,4+eyeExtra*2,3+eyeExtra,'#e8f0e8');
    // Teal iris
    px(7+sway,5,3,2,'#38a880');px(7+sway,5,2,2,'#60c8a8');
    // Pupil
    px(8+sway,5,1,2,'#207858');
    // Eye highlight
    px(6+sway-eyeExtra,4-eyeExtra,1,1,'rgba(255,255,255,0.7)');
    // Vortex body (spiral pattern) — with sway
    px(3+sway,8,10,2,'#38a880');px(4+sway,8,8,1,'#48b898');
    px(2+sway,10,12,2,'#207858');px(3+sway,10,10,1,'#38a880');
    // Spiral lines — rotating positions
    const spiralPositions=[
      [{rx:5,ry:9},{rx:9,ry:10},{rx:4,ry:11},{rx:10,ry:8}],
      [{rx:6,ry:8},{rx:10,ry:9},{rx:5,ry:10},{rx:9,ry:11}],
      [{rx:7,ry:8},{rx:10,ry:10},{rx:6,ry:11},{rx:8,ry:9}],
      [{rx:8,ry:9},{rx:5,ry:10},{rx:9,ry:11},{rx:6,ry:8}]
    ];
    const sp=spiralPositions[spiralPhase];
    for(let si=0;si<sp.length;si++){
      px(sp[si].rx+sway,sp[si].ry,2,1,'#60c8a8');
    }
    // Lower body
    px(3+sway,12,10,2,'#207858');px(4+sway,12,8,1,'#38a880');
    px(4+sway,14,8,2,'#186848');px(5+sway,14,6,1,'#207858');
    // Tentacle wisps at bottom — waving
    px(4+tw0,16,2,2,'#186848');px(7+tw1,16,2,3,'#186848');px(11+tw2,16,2,2,'#186848');
    px(4+tw0,17,1,1,'#105838');px(7+tw1,18,2,1,'#105838');px(12+tw2,17,1,1,'#105838');
    // Faint aura — with sway
    px(2+sway,4,1,8,_ra(auraBright));
    px(13+sway,4,1,8,_ra(auraBright));
  }

  // Generic renderer for cards 6-60 (type-based pixel art)
  if(cardId>=6){
    const cr=CD[cardId-1];if(!cr)return;
    const type=cr.t||'attack';const rar=cr.r||1;
    const bob=Math.sin(t*0.05)*1.5;
    const glow=0.15+0.2*Math.sin(t*0.04+cardId);
    // Outer glow for Epic/Legendary
    if(rar>=4){px(-1,-1,18,22,_CARD_GLOW_RGBA[cardId-1][Math.min(100,Math.max(0,glow*100+0.5|0))]);} // v354: zero-alloc glow
    if(type==='attack'){
      // Sword silhouette
      px(7,1+bob,2,8,cr.h);px(7,1+bob,2,6,cr.c);
      px(5,8+bob,6,2,cr.d);px(7,10+bob,2,6,cr.d);px(6,10+bob,4,1,cr.c);
      if(rar>=3){px(7,2+bob,2,2,'rgba(255,255,255,0.4)');}
    }else if(type==='defense'){
      // Shield silhouette
      px(4,2+bob,8,2,cr.d);px(3,4+bob,10,6,cr.c);px(3,4+bob,10,3,cr.h+'44');
      px(4,10+bob,8,2,cr.c);px(5,12+bob,6,2,cr.d);px(7,14+bob,2,2,cr.d);
      if(rar>=3){px(7,6+bob,2,4,'rgba(255,255,255,0.5)');}
    }else if(type==='flee'){
      // Boot / wind silhouette
      px(6,1+bob,4,2,cr.c);px(5,3+bob,6,3,cr.c);px(5,3+bob,3,2,cr.h);
      px(4,6+bob,8,2,cr.d);px(3,8+bob,5,2,cr.d);px(8,7+bob,5,2,cr.d);
      // Wind trails
      px(10,4+bob,5,1,cr.c+'88');px(11,6+bob,4,1,cr.c+'66');px(12,8+bob,3,1,cr.c+'44');
      if(rar>=3){px(4,4+bob,2,2,'rgba(255,255,255,0.4)');}
    }else if(type==='magic'){
      // Orb / staff silhouette
      px(7,1+bob,2,10,cr.d);px(6,1+bob,4,1,cr.c);
      const orb=0.3+0.3*Math.sin(t*0.06+cardId);
      px(4,11+bob,8,6,cr.d);px(5,11+bob,6,5,cr.c);px(6,12+bob,4,3,cr.h);
      px(7,13+bob,2,1,_rw(orb));
      if(rar>=3){px(5,11+bob,6,2,'rgba(255,255,255,0.3)');}
    }else{
      // Recovery: cross / leaf
      px(7,2+bob,2,12,cr.c);px(3,6+bob,10,2,cr.c);
      px(7,2+bob,2,4,cr.h);px(3,6+bob,4,1,cr.h);
      if(rar>=3){const hg=0.2+0.3*Math.sin(t*0.05+cardId);px(5,4+bob,6,6,_rw(hg));}
    }
    // Rarity stars at bottom
    for(let ri=0;ri<rar;ri++)px(2+ri*3,17,2,2,cr.h);
    return;
  }

  // Reveal sparkle burst when fully revealed
  if(cardRevealState&&cardRevealState.cardId===cardId&&cardRevealState.done){
    // Spawn sparkles once
    if(revealSparkles.length===0){
      for(let i=0;i<8;i++){
        const angle=Math.PI*2*i/8;
        revealSparkles.push({
          rx:8,ry:10,
          vx:Math.cos(angle)*0.8,vy:Math.sin(angle)*0.8,
          life:12+Math.random()*6
        });
      }
    }
    for(let i=revealSparkles.length-1;i>=0;i--){
      const p=revealSparkles[i];p.rx+=p.vx;p.ry+=p.vy;p.life--;
      if(p.life<=0){revealSparkles.splice(i,1);continue;}
      const a=Math.min(1,p.life/8);
      g.fillStyle=_rw(a);
      g.fillRect(x+p.rx*s,y+p.ry*s,s,s);
    }
    if(revealSparkles.length===0)cardRevealState=null;
  }
}

// Draw card frame with character sprite inside
// Card rarity accent colors (C U R E L)
const CARD_RARITY_COL=['#606870','#4888d0','#8848d0','#c89020','#e8c840'];
const CARD_RARITY_DIM=['#303438','#243858','#381858','#484010','#584810'];
const CARD_RARITY_LABEL=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'];
const CARD_TYPE_ICON={attack:'\u2694',defense:'\u25C6',flee:'\u21af',magic:'\u2605',recovery:'\u2665'};

function drawCardFrame(cx_,cy_,cw,ch,cardIdx,showName,showFlavor){
  const cr=CD[cardIdx];if(!cr)return;
  const rar=Math.max(1,Math.min(5,cr.r||1));
  const rarCol=CARD_RARITY_COL[rar-1];
  const rarDim=CARD_RARITY_DIM[rar-1];
  const t=(typeof fr!=='undefined'?fr:0);
  const pulse=0.5+0.5*Math.sin(t*0.07);

  // ── Outer rarity glow (rare+) ──
  if(rar>=3){
    const glowA=(rar>=5?0.5:rar>=4?0.38:0.25)*pulse;
    g.globalAlpha=glowA;
    g.shadowColor=rarCol;g.shadowBlur=rar>=5?14:8;
    g.strokeStyle=rarCol;g.lineWidth=rar>=5?2:1.5;
    g.strokeRect(cx_-1,cy_-1,cw+2,ch+2);
    g.shadowBlur=0;g.globalAlpha=1;
    if(rar>=5){
      g.globalAlpha=glowA*0.5;g.lineWidth=1;
      g.strokeRect(cx_-4,cy_-4,cw+8,ch+8);g.globalAlpha=1;
    }
  }

  // ── Card body — dark with rarity-tinted edge ──
  // Outer frame (rarity color)
  bx(cx_,cy_,cw,ch,rarDim);
  // 1px inner border (rarity lit)
  bx(cx_+1,cy_+1,cw-2,ch-2,rarCol.replace('#','#').slice(0,4)+'404');
  g.globalAlpha=0.35;bx(cx_+1,cy_+1,cw-2,ch-2,rarCol);g.globalAlpha=1;
  // Card body
  bx(cx_+2,cy_+2,cw-4,ch-4,'#08101e');

  // ── Type color header band (top ~22% of card) ──
  const headerH=Math.floor(ch*0.22);
  bx(cx_+2,cy_+2,cw-4,headerH,cr.d||'#102030');
  // Diagonal stripe accent on header
  g.save();g.rect(cx_+2,cy_+2,cw-4,headerH);g.clip();
  g.globalAlpha=0.12;g.fillStyle=cr.h||'#ffffff';
  for(let si=-ch;si<cw+ch;si+=6)g.fillRect(cx_+si,cy_+2,3,headerH*2);
  g.restore();g.globalAlpha=1;
  // Header bottom divider
  bx(cx_+2,cy_+2+headerH,cw-4,1,rarCol);
  g.globalAlpha=0.3;bx(cx_+2,cy_+2+headerH+1,cw-4,1,cr.c||'#406080');g.globalAlpha=1;

  // ── Type icon + rarity dot (header area) ──
  const iSz=Math.max(5,Math.floor(cw/7));
  const icon=CARD_TYPE_ICON[cr.t]||'\u2605';
  txShadow(icon,cx_+5,cy_+2+headerH-2,iSz,cr.h||'#fff','rgba(0,0,0,.7)');
  // Rarity dot (top-right of header)
  const dotX=cx_+cw-6-rar*4;
  for(let ri=0;ri<rar;ri++){
    const dc=ri<rar?rarCol:'#202840';
    bx(cx_+cw-6-(ri)*5,cy_+5,3,3,dc);
  }

  // ── Art area (between header and name plate) ──
  const nameH=Math.floor(ch*0.22);
  const artY=cy_+2+headerH+2;
  const artH=ch-4-headerH-nameH-2;
  // Art bg (slightly lit hull)
  bx(cx_+2,artY,cw-4,artH,'#0a1424');
  // Subtle diagonal pattern
  g.save();g.rect(cx_+2,artY,cw-4,artH);g.clip();
  g.globalAlpha=0.04;g.fillStyle=cr.c||'#406080';
  for(let si=-artH;si<cw+artH;si+=4)g.fillRect(cx_+si,artY,2,artH*2);
  g.restore();g.globalAlpha=1;
  // Character sprite centered in art area
  const charScale=Math.max(0.35,Math.min(2.5,cw/28));
  drawCardCharacter(cx_+cw/2-8*charScale,artY+artH/2-10*charScale,cardIdx+1,charScale,t);

  // ── Name plate (bottom) ──
  const npY=cy_+ch-nameH-2;
  bx(cx_+2,npY,cw-4,nameH,cr.d||'#102030');
  g.globalAlpha=0.08;bx(cx_+2,npY,cw-4,nameH,rarCol);g.globalAlpha=1;
  // Top divider of name plate
  bx(cx_+2,npY,cw-4,1,rarCol);
  // Card name
  const nameSz=Math.max(4,Math.min(8,Math.floor(cw/8)));
  const nameY=npY+Math.floor(nameH*0.55);
  txShadow(cr.n,cx_+cw/2-cr.n.length*nameSz/2.1,nameY,nameSz,ARK.textBright,'rgba(0,0,0,.8)');
  // Rarity label (very small, below name)
  if(nameH>16&&rar>=3){
    const rlSz=Math.max(3,Math.floor(cw/13));
    g.globalAlpha=0.7;
    txShadow(CARD_RARITY_LABEL[rar-1],cx_+cw/2-CARD_RARITY_LABEL[rar-1].length*rlSz/2.1,npY+nameH-3,rlSz,rarCol,'rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }

  // ── Legendary rune glow + corner sparkles ──
  if(rar>=5){
    // Pulsing purple aura around entire card
    drawRuneGlow(cx_,cy_,cw,ch,ARK.rune,t);
    const sp=t*0.12;
    const sc='#ffffff';
    if(Math.sin(sp)>0.5){bx(cx_,cy_,2,2,sc);bx(cx_+cw-2,cy_,2,2,sc);}
    if(Math.sin(sp+0.8)>0.5){bx(cx_,cy_+ch-2,2,2,sc);bx(cx_+cw-2,cy_+ch-2,2,2,sc);}
    if(Math.sin(sp+1.6)>0.7){bx(cx_+Math.floor(cw/2),cy_,1,2,sc);bx(cx_,cy_+Math.floor(ch/2),2,1,sc);}
    // Tiny rune cross sparkles at card corners
    const rsp=t*0.08;
    if(Math.sin(rsp)>0.3){
      g.globalAlpha=Math.sin(rsp)*0.7;
      bx(cx_-3,cy_+Math.floor(ch/2),6,1,ARK.rune);bx(cx_+Math.floor(cw/2)-1,cy_-3,1,6,ARK.rune);
      g.globalAlpha=1;
    }
  }else if(rar>=4){
    // Epic: subtle gold glow
    const pulse=0.2+Math.sin(t*0.06)*0.15;
    g.globalAlpha=pulse;
    bx(cx_-1,cy_,cw+2,1,'#e0a020');bx(cx_-1,cy_+ch,cw+2,1,'#e0a020');
    bx(cx_-1,cy_,1,ch+1,'#e0a020');bx(cx_+cw,cy_,1,ch+1,'#e0a020');
    g.globalAlpha=1;
  }

  // ── Outer frame corner overlays (rivet-style) ──
  bx(cx_,cy_,4,1,rarCol);bx(cx_,cy_,1,4,rarCol);
  bx(cx_+cw-4,cy_,4,1,rarCol);bx(cx_+cw-1,cy_,1,4,rarCol);
  bx(cx_,cy_+ch-1,4,1,rarCol);bx(cx_,cy_+ch-4,1,4,rarCol);
  bx(cx_+cw-4,cy_+ch-1,4,1,rarCol);bx(cx_+cw-1,cy_+ch-4,1,4,rarCol);
}

// ═══════════════════════════════════════
// MULTI-MAP SYSTEM
// ═══════════════════════════════════════
// Tile legend:
// 0=water 1=grass 2=path 3=tree 4=sand 5=building(red) 6=cave 7=flower
// 8=rock 9=fence 10=dock 11=tallgrass 12=bush 13=pine 14=palm
// 15=building2(blue) 16=building3(green) 17=lake 18=mountain
// 19=signpost 20=fountain 21=lighthouse 22=ruins_wall 23=ruins_pillar
// 24=glow_tile 25=lava 26=crystal 27=altar 28=mushroom 29=campfire
// 30=treasure

const MW=40, MH=30;

// ── MAP 0: PORT TOWN (港町) ──
const MAP_PORT=[
// 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//0
  [ 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 2, 2, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0],//1
  [ 0, 0, 3, 3, 3, 1, 1,11, 1, 1, 1, 1, 1, 7, 1, 2, 2, 1, 7, 1, 1, 1, 1, 1,11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 0, 0],//2
  [ 0, 3, 3, 1, 1, 1, 9, 9, 9, 9, 9, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 9, 9, 9, 9, 9,11, 1, 1, 1,18,18,18,18, 1, 1, 1, 3, 0, 0],//3
  [ 0, 3, 1, 1, 1, 9, 1, 7, 1, 7, 9, 1, 1, 1, 1, 2, 2, 1, 1, 1, 9, 1, 1, 7, 1, 9, 1, 1, 1,18,18, 8,21,18,18, 1, 1, 3, 0, 0],//4
  [ 0, 3, 1, 1, 1, 9, 1, 1, 5, 1, 9, 1, 1,19, 1, 2, 2, 1,19, 1, 9, 1,15, 1, 1, 9, 1, 1,18,18, 8, 8, 8,18,18, 1, 1, 3, 4, 0],//5
  [ 0, 3, 1, 1, 1, 9, 9, 2, 2, 9, 9, 1, 1, 1, 1, 2, 2, 1, 1, 1, 9, 9, 2, 2, 9, 9, 1, 1,18, 2, 2, 2, 2,18, 1, 1, 1, 4, 4, 0],//6
  [ 0, 3, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 4, 4, 4, 0],//7
  [ 0, 3, 1, 1,12, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 4, 4, 4, 0, 0],//8
  [ 0, 3, 1,11, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2, 1, 4, 4, 0, 0, 0, 0],//9
  [ 0, 3, 1, 7, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 4, 4, 0, 0, 0, 0, 0],//10
  [ 0, 3, 1, 1, 1, 1, 2, 1, 1,16, 1, 1, 1, 2, 1,20, 1, 2, 1, 1, 5, 1, 1, 1, 1, 2, 1,24, 1, 1, 1, 4, 4, 4, 0, 0, 0, 0, 0, 0],//11
  [ 0, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1,11, 1, 2, 1,24, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],//12
  [ 0, 3, 1, 1, 3, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1,24, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0],//13
  [ 0, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//14
  [ 0, 3,11, 7, 1, 1, 2, 1, 1, 1,11, 1, 1, 2, 1, 1, 1, 2, 1,16, 1, 1, 5, 1, 1, 2, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//15
  [ 0, 3, 1, 1,12, 1, 2, 1, 1, 5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//16
  [ 0, 3, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//17
  [ 0, 3, 1, 1,11, 1, 1, 1, 1,11, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//18
  [ 0, 3, 3, 1, 1, 7, 1, 3, 1, 1,12, 1, 1, 2, 1, 1, 1, 2, 1, 1, 7,11, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//19
  [ 0, 0, 3, 3, 1, 1, 1, 1, 3, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//20
  [ 0, 0, 0, 3, 3, 1, 1, 1, 1, 1, 3, 1, 1, 2, 1,19, 1, 2, 1, 1,14, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//21
  [ 0, 0, 0, 0, 3, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//22
  [ 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4, 4,10,10,10,10,10, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//23
  [ 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0,10,10,10,10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//24
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10,10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//25
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//26
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//27
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//28
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],//29
];

// ── MAP 1: DEEP FOREST (深い森) ──
const MAP_FOREST=[
  [ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//0
  [ 3, 3, 3, 3,13, 3, 3, 3, 3,13, 3, 3,18,18, 2, 2, 2,18,18, 3, 3,13, 3, 3, 3, 3,13, 3, 3, 3, 3, 3,13, 3, 3, 3, 3, 3, 3, 3],//1
  [ 3, 3,13, 3, 3, 3, 1, 1, 3, 3, 3, 3,18, 2, 2, 1, 2, 2,18, 3, 3, 3, 3, 1, 1, 3, 3, 3,13, 3, 3, 3, 3, 3, 3,13, 3, 3, 3, 3],//2
  [ 3, 3, 3, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1, 2, 1, 1, 1, 2, 1, 3, 3, 1, 1, 1,28, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//3
  [ 3, 3, 1, 1,11,11, 1,30, 1, 1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1,28, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//4
  [ 3, 3, 1,11,11,11, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1,13, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//5
  [ 3, 3, 1, 1,11, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//6
  [ 3, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 2, 1, 1, 1, 3, 3, 3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//7
  [ 3, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//8
  [ 3, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 2, 2, 2, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//9
  [ 3, 1, 1, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 3, 3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//10
  [ 3, 1, 1, 3, 3, 3, 3, 1, 1,11,11, 1, 1, 2, 1, 1, 2, 1, 1,11,11, 1, 1, 3, 3, 1, 1,11,11, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3],//11
  [ 3, 1, 1, 1, 3, 3, 1, 1,11,11,11, 1, 1, 2, 1, 1, 2, 1,11,11,11, 1, 1, 1, 1, 1,11,11, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3],//12
  [ 3, 3, 1, 1, 1, 1, 1, 1,11, 1, 1, 1, 2, 2, 1, 1, 2, 2, 1,11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3],//13
  [ 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 3, 1, 1, 1,29, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3],//14
  [ 3, 3, 3, 3, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1,17,17,17, 1, 2, 2, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3],//15
  [ 3, 3, 3, 3, 3, 1, 1, 1, 2, 2, 1, 1,17,17,17,17,17,17, 1, 2, 2, 1, 3, 3, 3, 3, 1, 1, 1,30, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3],//16
  [ 3, 3, 3, 3, 3, 3, 1, 1, 2, 1, 1,17,17,17,17,17,17,17,17, 1, 2, 1, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1,11,11, 1, 1, 3, 3, 3, 3],//17
  [ 3, 3, 3, 3, 3, 3, 3, 1, 2, 1,17,17,17,17,17,17,17,17,17, 1, 2, 1, 3, 3, 1, 1, 1, 1, 3, 3, 1,11,11,11, 1, 1, 3, 3, 3, 3],//18
  [ 3, 3, 3, 3, 3, 3, 3, 1, 2, 1,17,17,17,17,17,17,17,17,17, 1, 2, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1,11,11, 1, 1, 3, 3, 3, 3, 3],//19
  [ 3, 3, 3, 3, 3, 3, 1, 1, 2, 1, 1,17,17,17,17,17,17,17, 1, 1, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3],//20
  [ 3, 3, 3, 3, 3, 1, 1, 2, 2, 1, 1, 1,17,17,17,17,17, 1, 1, 2, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 3, 3, 3, 3, 3, 3, 3],//21
  [ 3, 3, 3, 3, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//22
  [ 3, 3, 3, 1, 1, 2, 2, 1, 1, 1, 1, 3, 1, 1, 8, 8, 1, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//23
  [ 3, 3, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 1,22,22, 1, 3, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//24
  [ 3, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 1,23, 1, 1, 3, 3, 1, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//25
  [ 3, 1, 2, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 3, 3, 3, 3, 1, 1, 2, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//26
  [ 3, 1, 2, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//27
  [ 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//28
  [ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],//29
];

// ── MAP 2: ANCIENT RUINS (古代遺跡) ──
const MAP_RUINS=[
  [18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//0
  [18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//1
  [18,18, 8, 8, 1, 1, 1,22,22, 1, 1, 8,18,18,18,18,18,18,18,18,18,18,18, 8, 1, 1, 1, 1, 8,18,18,18,18,18,18,18,18,18,18,18],//2
  [18, 8, 1, 1, 1,23, 1, 1, 1, 1,23, 1, 1, 8,18,18,18,18,18,18,18,18, 8, 1, 1,24, 1,24, 1, 8,18,18,18,18,18,18,18,18,18,18],//3
  [18, 8, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 8,18,18,18,18,18,18, 8, 1, 1, 1, 1,26, 1, 1, 1, 8,18,18,18,18,18,18,18,18,18],//4
  [18, 1, 1,24, 2, 1, 1, 1, 1, 2,24, 1, 1, 1, 1,18,18,18,18,18, 8, 1, 1,26, 1, 1, 1, 1,26, 1, 1, 8,18,18,18,18,18,18,18,18],//5
  [18, 1, 1, 1, 2, 1,25,25, 1, 2, 1, 1, 1, 1, 1, 8,18,18,18, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8,18,18,18,18,18,18,18,18],//6
  [18, 1, 1, 1, 2, 1,25,25, 1, 2, 1, 1,22, 1, 1, 1, 8, 8, 8, 1, 1, 1, 1, 1, 1,27, 1, 1, 1, 1, 1, 1, 8,18,18,18,18,18,18,18],//7
  [18, 8, 1,24, 2, 1, 1, 1, 1, 2,24, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8,18,18,18,18,18,18,18,18],//8
  [18,18, 8, 1, 2, 2, 2, 2, 2, 2, 1, 1, 1,23, 1, 1, 1, 1, 1, 1, 1,23, 1, 1,26, 1, 1,26, 1, 1, 8,18,18,18,18,18,18,18,18,18],//9
  [18,18,18, 1, 1, 1, 2, 1, 1, 1, 1, 8, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8,18,18,18,18,18,18,18,18,18,18],//10
  [18,18,18, 8, 1, 1, 2, 1, 1, 1, 8,18, 8, 1, 1, 2, 2, 2, 2, 1, 1, 8,18, 8, 1, 1, 1, 1, 8,18,18,18,18,18,18,18,18,18,18,18],//11
  [18,18,18,18, 8, 1, 2, 1, 1, 8,18,18,18, 1, 2, 2, 1, 1, 2, 2, 1,18,18,18,18, 8, 8,18,18,18,18,18,18,18,18,18,18,18,18,18],//12
  [18,18,18,18,18, 1, 2, 1, 8,18,18,18, 1, 1, 2, 1,30, 1, 1, 2, 1, 1,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//13
  [18,18,18,18,18, 8, 2, 8,18,18,18,18, 1, 2, 2, 1, 1, 1, 2, 2, 1,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//14
  [18,18,18,18,18,18, 2,18,18,18,18, 1, 1, 2, 1, 1,24, 1, 1, 2, 1, 1,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//15
  [18,18,18,18,18,18, 2,18,18,18,18, 1, 2, 2, 1,25,25, 1, 2, 2, 1,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//16
  [18,18,18,18,18, 8, 2, 8,18,18, 8, 1, 2, 1, 1,25,25, 1, 1, 2, 1, 8,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//17
  [18,18,18,18,18, 1, 2, 1,18,18, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//18
  [18,18,18,18, 8, 1, 2, 1, 1, 8, 1, 2, 2, 1,22,22,22,22, 1, 2, 2, 1, 8,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//19
  [18,18,18, 8, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1,22, 1, 1,22, 1, 1, 2, 2, 1, 8,18,18,18,18,18,18,18,18,18,18,18,18, 2, 2,18,18],//20
  [18,18, 8, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1,22,22, 1, 1,22,22, 1, 1, 2, 2, 1, 8,18,18,18,18,18,18,18,18,18,18, 8, 2, 2, 8,18],//21
  [18,18, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1,22,22, 1, 1, 1, 1,22,22, 1, 1, 2, 2, 1,18,18,18,18,18,18,18,18,18, 8, 1, 2, 1, 8,18],//22
  [18, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1,22,22, 1, 1,24, 1, 1, 1,22,22, 1, 1, 2, 2, 1, 8,18,18,18,18,18,18, 8, 1, 1, 2, 1, 1,18],//23
  [18, 1, 2, 2, 1, 1, 1,23, 1, 1,22,22, 1, 1, 1, 1, 1, 1, 1, 1,22,22, 1, 1, 2, 2, 1, 8, 8, 8, 8, 8, 8, 1, 1, 2, 2, 1, 1,18],//24
  [18, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,23,27,23, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1,18],//25
  [18, 8, 2, 2, 1, 1,24, 1, 1,22,22, 1, 1, 1, 1, 1, 1, 1, 1,22,22, 1, 1, 1, 8, 8,18,18,18,18,18,18,18, 8, 8, 1, 1, 1,18,18],//26
  [18,18, 8, 2, 2, 1, 1, 8,22,22,18,18, 8, 1, 1, 1, 1, 8,18,18,22, 8, 1, 8,18,18,18,18,18,18,18,18,18,18,18, 8, 1, 8,18,18],//27
  [18,18,18, 8, 2, 2, 8,18,18,18,18,18,18, 8, 8, 8, 8,18,18,18,18,18, 8,18,18,18,18,18,18,18,18,18,18,18,18,18, 8,18,18,18],//28
  [18,18,18,18, 8, 8,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18],//29
];

// ── CARD HAND SIZE ──
const HAND_SIZE=20; // max cards you carry (battle hand, TBD)

// ── DUNGEON SYSTEM (GDD v1.0) ──
const MAX_DUNGEON_FLOORS=5;
let inDungeon=false;   // true when player is on a dungeon floor
let currentFloor=0;    // 1-5, 0 when in town

// Procedural dungeon floor generator — PMD Red Rescue Team style
// BSP sector-based room placement, 1-tile corridors, dedicated stair tiles
function generateDungeonFloor(floorNum,seed){
  const map=[];
  const rng=(n)=>{let h=seed^(n*2654435761+floorNum*40503);h^=h>>>16;h=(h*0x45d9f3b)>>>0;h^=h>>>16;return(h&0xFFFF)/65535;};
  // Fill with walls
  for(let y=0;y<MH;y++){map[y]=[];for(let x=0;x<MW;x++)map[y][x]=18;}

  // ── FLOOR-SPECIFIC DECOR FUNCTION ──
  function addRoomDecor(r){
    for(let ry=r.y+1;ry<r.y+r.h-1;ry++){
      for(let rx=r.x+1;rx<r.x+r.w-1;rx++){
        if(r.isBoss&&rx===r.cx&&ry===r.cy){map[ry][rx]=27;continue;} // boss room altar center
        const rv=rng(ry*100+rx+floorNum*7777);
        if(floorNum===1){
          if(rv<0.05)map[ry][rx]=7;
          else if(rv>0.96)map[ry][rx]=26;
        }else if(floorNum===2){
          if(rv<0.05)map[ry][rx]=28;
          else if(rv>0.95)map[ry][rx]=26;
        }else if(floorNum===3){
          if(rv<0.04)map[ry][rx]=27;
          else if(rv>0.95)map[ry][rx]=26;
          else if(rv>0.90&&rv<0.92)map[ry][rx]=28;
        }else if(floorNum===4){
          if(rv<0.06)map[ry][rx]=25;
          else if(rv>0.94)map[ry][rx]=27;
        }else if(floorNum===5){
          if(rv<0.08)map[ry][rx]=25;
          else if(rv>0.94)map[ry][rx]=27;
          else if(rv>0.90&&rv<0.92)map[ry][rx]=26;
        }
      }
    }
  }

  // ── BSP SECTOR GRID ──
  const ENTRY_X=3,ENTRY_Y=14;
  const DESCEND_X=36,DESCEND_Y=14;
  const GCOLS=floorNum<=2?4:5; // 4 or 5 sector columns
  const GROWS=3;               // always 3 sector rows
  const SW=Math.floor((MW-2)/GCOLS);
  const SH=Math.floor((MH-2)/GROWS);
  const rooms=[];

  for(let sr=0;sr<GROWS;sr++){
    for(let sc=0;sc<GCOLS;sc++){
      const si=sr*GCOLS+sc;
      // Always place room in first and last sector; 15% skip elsewhere
      if(si>0&&si<GCOLS*GROWS-1&&rng(si*100+floorNum*13)<0.15)continue;
      // Room size: PMD-style small-medium rooms (4-9 wide, 3-6 tall)
      const rw=4+Math.floor(rng(si*10+1+floorNum)*5);
      const rh=3+Math.floor(rng(si*10+2+floorNum)*3);
      // Position within sector
      const sx=1+sc*SW;const sy=1+sr*SH;
      const maxRX=Math.min(MW-rw-2,sx+SW-rw-1);
      const maxRY=Math.min(MH-rh-2,sy+SH-rh-1);
      if(maxRX<sx||maxRY<sy)continue;
      const rx=sx+Math.floor(rng(si*10+3+floorNum)*(maxRX-sx+1));
      const ry=sy+Math.floor(rng(si*10+4+floorNum)*(maxRY-sy+1));
      if(rx<1||ry<1||rx+rw>=MW-1||ry+rh>=MH-1)continue;
      rooms.push({x:rx,y:ry,w:rw,h:rh,cx:Math.floor(rx+rw/2),cy:Math.floor(ry+rh/2),si});
    }
  }

  // Floor 5: Special large boss room in center
  if(floorNum===5){
    const bw=10,bh=7;
    const bx_=Math.floor(MW/2-bw/2),by_=Math.floor(MH/2-bh/2);
    if(bx_>1&&by_>1&&bx_+bw<MW-1&&by_+bh<MH-1){
      rooms.push({x:bx_,y:by_,w:bw,h:bh,cx:Math.floor(bx_+bw/2),cy:Math.floor(by_+bh/2),isBoss:true,si:999});
    }
  }

  // Carve rooms (PMD: interior is walkable, no separate edge type — walls are the uncarved tiles)
  for(const r of rooms){
    for(let ry=r.y;ry<r.y+r.h;ry++)
      for(let rx=r.x;rx<r.x+r.w;rx++)
        map[ry][rx]=1;
    if(!r.isBoss)addRoomDecor(r);
  }

  // 1-tile wide L-shaped corridors connecting rooms
  function carveCorridor(x1,y1,x2,y2,si_){
    // Alternate H-first vs V-first per sector for variety
    const hFirst=rng(si_*17+x1+y2)<0.5;
    if(hFirst){
      for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)if(map[y1][x]===18)map[y1][x]=2;
      for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)if(map[y][x2]===18)map[y][x2]=2;
    }else{
      for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)if(map[y][x1]===18)map[y][x1]=2;
      for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)if(map[y2][x]===18)map[y2][x]=2;
    }
  }

  // Connect rooms in sector order (chain + cross-connect for loops)
  if(rooms.length>1){
    const sorted=[...rooms].sort((a,b)=>a.si-b.si);
    for(let i=0;i<sorted.length-1;i++){
      carveCorridor(sorted[i].cx,sorted[i].cy,sorted[i+1].cx,sorted[i+1].cy,sorted[i].si);
    }
    // Extra connection for larger floors (prevents dead ends)
    if(rooms.length>=4){
      const a=sorted[0],b=sorted[Math.floor(sorted.length/2)];
      carveCorridor(a.cx,a.cy,b.cx,b.cy,a.si+500);
    }
  }

  // ── FIXED STAIR POSITIONS ──
  // Carve entry area (up-stairs / escape)
  for(let dy=-1;dy<=1;dy++)for(let dx=0;dx<=2;dx++){
    const ex=Math.max(1,Math.min(MW-2,ENTRY_X+dx));
    const ey=Math.max(1,Math.min(MH-2,ENTRY_Y+dy));
    map[ey][ex]=2;
  }
  map[ENTRY_Y][ENTRY_X]=32; // tile 32 = STAIRS_UP (dedicated)
  // Carve descend area (down-stairs)
  for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=0;dx++){
    const ex=Math.max(1,Math.min(MW-2,DESCEND_X+dx));
    const ey=Math.max(1,Math.min(MH-2,DESCEND_Y+dy));
    map[ey][ex]=2;
  }
  map[DESCEND_Y][DESCEND_X]=31; // tile 31 = STAIRS_DOWN (dedicated)
  // Connect entry/descend to nearest room
  if(rooms.length>0){
    const nearEntry=rooms.reduce((a,b)=>Math.abs(b.cx-ENTRY_X)+Math.abs(b.cy-ENTRY_Y)<Math.abs(a.cx-ENTRY_X)+Math.abs(a.cy-ENTRY_Y)?b:a);
    carveCorridor(ENTRY_X+2,ENTRY_Y,nearEntry.cx,nearEntry.cy,0);
    const nearDesc=rooms.reduce((a,b)=>Math.abs(b.cx-DESCEND_X)+Math.abs(b.cy-DESCEND_Y)<Math.abs(a.cx-DESCEND_X)+Math.abs(a.cy-DESCEND_Y)?b:a);
    carveCorridor(DESCEND_X-2,DESCEND_Y,nearDesc.cx,nearDesc.cy,GCOLS*GROWS-1);
  }

  // Treasure chest in a mid room (not the boss room)
  const midRooms=rooms.filter(r=>!r.isBoss&&r.si!==0&&r.si!==GCOLS*GROWS-1);
  if(midRooms.length>0){
    const mid=midRooms[Math.floor(midRooms.length/2)];
    if(mid.y+2<mid.y+mid.h-1&&mid.x+2<mid.x+mid.w-1)map[mid.y+2][mid.x+2]=30;
  }

  return {map,rooms};
}

// Generate dungeon floors — random seed every page load (PMD-style: new dungeon each run)
const dungeonFloors=[];
const dungeonRooms=[null]; // index 0 = town (no rooms)
const _initDungeonSeed=Date.now();
for(let f=1;f<=MAX_DUNGEON_FLOORS;f++){
  const result=generateDungeonFloor(f,_initDungeonSeed+f*7919);
  dungeonFloors.push(result.map);
  dungeonRooms.push(result.rooms);
}

// Map array: index 0 = Town, indices 1..MAX_DUNGEON_FLOORS = dungeon floors
const maps=[MAP_PORT,...dungeonFloors];
const mapNames=['TOWN - はじまりのまち','SUNKEN GALLERIES — B1','DROWNED ARCHIVES — B2','ECHO CHAMBERS — B3','THE DEEP VAULT — B4','ARK CORE — B5'];
const mapColors=['#3060b0','#302848','#403058','#503060','#403850','#503848'];
let currentMap=0;

// Map dimensions helper
function getMap(){return maps[currentMap];}

// Walkable tiles (31=stairs-down, 32=stairs-up are new dedicated stair tiles)
const WALKABLE=new Set([1,2,4,7,10,11,24,25,30,31,32]);

// ═══════════════════════════════════════
// FOG OF WAR SYSTEM
// ═══════════════════════════════════════
const FOG_MAP_COUNT=1+MAX_DUNGEON_FLOORS; // town + dungeon floors
const fogRevealed=[];
for(let m=0;m<FOG_MAP_COUNT;m++){
  fogRevealed[m]=[];
  for(let y=0;y<MH;y++){
    fogRevealed[m][y]=[];
    for(let x=0;x<MW;x++) fogRevealed[m][y][x]=false;
  }
}
// Fog color tints: town=blue-black, dungeon floors=deep purple-black
const FOG_COLORS=['#0a0a1e','#0a0818','#0c0818','#0e0820','#0c0a1c','#100818'];
// Fog particle pool for atmospheric drifting specks over hidden areas
// v229: pre-compute sinPh/cosPh at creation so sin-addition formula avoids per-frame sin() calls
const fogParticles=[];
for(let i=0;i<40;i++){
  const phase=Math.random()*Math.PI*2;
  fogParticles.push({x:Math.random()*MW*TW,y:Math.random()*MH*TH,vx:0.1+Math.random()*0.15,vy:-0.05+Math.random()*0.1,phase,sinPh:Math.sin(phase),cosPh:Math.cos(phase),life:Math.random()});
}

function fogRevealAll(mapIdx){
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)fogRevealed[mapIdx][y][x]=true;
  fogCacheDirty=true;_fogPctDirty[mapIdx]=true;
}

function fogRevealRadius(mapIdx,cx,cy,radius){
  let changed=false;
  const newlyRevealed=[];
  for(let dy=-radius;dy<=radius;dy++){
    for(let dx=-radius;dx<=radius;dx++){
      if(Math.abs(dx)+Math.abs(dy)<=radius){
        const nx=cx+dx,ny=cy+dy;
        if(nx>=0&&nx<MW&&ny>=0&&ny<MH){
          if(!fogRevealed[mapIdx][ny][nx]){
            fogRevealed[mapIdx][ny][nx]=true;changed=true;
            // v218: Only spawn sparkles on outer edge of reveal radius (newly exposed tiles)
            if(Math.abs(dx)+Math.abs(dy)===radius)newlyRevealed.push([nx,ny]);
          }
        }
      }
    }
  }
  if(changed){
    fogCacheDirty=true;_fogPctDirty[mapIdx]=true;
    // v218: Fog-reveal sparkle particles — brief shimmer on newly uncovered tiles
    if(particles&&newlyRevealed.length>0&&newlyRevealed.length<30){
      newlyRevealed.forEach(([rx,ry])=>{
        if(Math.random()>0.5)return; // sparse, not every tile
        particles.push({
          x:rx*TW+TW/2,y:ry*TH+TH/2,
          vx:(Math.random()-.5)*0.8,vy:-Math.random()*0.6-0.2,
          life:14+Math.random()*8,c:'rgba(180,220,255,1)'
        });
      });
    }
  }
}

// Reveal every tile inside a given room object {x,y,w,h}
function fogRevealRoom(mapIdx,room){
  if(!room)return;
  let changed=false;
  let newRoomTiles=0;
  for(let ry=room.y;ry<room.y+room.h;ry++){
    for(let rx=room.x;rx<room.x+room.w;rx++){
      if(rx>=0&&rx<MW&&ry>=0&&ry<MH&&!fogRevealed[mapIdx][ry][rx]){
        fogRevealed[mapIdx][ry][rx]=true;changed=true;newRoomTiles++;
      }
    }
  }
  // Also reveal 1-tile border around room (catches corridors leading in)
  for(let ry=room.y-1;ry<=room.y+room.h;ry++){
    for(let rx=room.x-1;rx<=room.x+room.w;rx++){
      if(rx>=0&&rx<MW&&ry>=0&&ry<MH&&!fogRevealed[mapIdx][ry][rx]){
        fogRevealed[mapIdx][ry][rx]=true;changed=true;
      }
    }
  }
  if(changed){
    fogCacheDirty=true;_fogPctDirty[mapIdx]=true;
    // v218: Room discovery burst — sprinkle sparkle particles across newly revealed room
    if(particles&&newRoomTiles>=4){
      const roomCX=(room.x+room.w/2)*TW,roomCY=(room.y+room.h/2)*TH;
      const burstCount=Math.min(10,newRoomTiles);
      for(let bi=0;bi<burstCount;bi++){
        const bx_=room.x*TW+Math.random()*room.w*TW;
        const by_=room.y*TH+Math.random()*room.h*TH;
        const ang=(bi/burstCount)*Math.PI*2;
        particles.push({
          x:bx_,y:by_,
          vx:Math.cos(ang)*1.1*(0.5+Math.random()),
          vy:Math.sin(ang)*0.7*(0.5+Math.random())-0.8,
          life:18+Math.random()*12,c:'rgba(220,240,255,1)'
        });
      }
    }
  }
}

// Check if player is inside a dungeon room; if so reveal the whole room
function fogRevealCurrentRoom(mapIdx,px,py){
  const rooms=dungeonRooms[mapIdx];
  if(!rooms)return;
  for(const r of rooms){
    if(px>=r.x&&px<r.x+r.w&&py>=r.y&&py<r.y+r.h){
      fogRevealRoom(mapIdx,r);
      return;
    }
  }
  // Not in a room — corridor: just do radius reveal
  fogRevealRadius(mapIdx,px,py,2);
}

function fogSave(){
  try{
    const compact=[];
    for(let m=0;m<FOG_MAP_COUNT;m++){
      compact[m]=[];
      for(let y=0;y<MH;y++){
        let row='';
        for(let x=0;x<MW;x++) row+=fogRevealed[m]&&fogRevealed[m][y]&&fogRevealed[m][y][x]?'1':'0';
        compact[m][y]=row;
      }
    }
    localStorage.setItem('oxark_fog',JSON.stringify(compact));
  }catch(e){}
}

function fogLoad(){
  try{
    const data=localStorage.getItem('oxark_fog');
    if(!data)return false;
    const compact=JSON.parse(data);
    for(let m=0;m<FOG_MAP_COUNT;m++){
      if(!compact[m])continue;
      for(let y=0;y<MH;y++){
        for(let x=0;x<MW;x++){
          if(fogRevealed[m]&&fogRevealed[m][y])fogRevealed[m][y][x]=compact[m][y]&&compact[m][y][x]==='1';
        }
      }
    }
    return true;
  }catch(e){return false;}
}

function fogClear(){
  for(let m=0;m<FOG_MAP_COUNT;m++)
    for(let y=0;y<MH;y++)
      for(let x=0;x<MW;x++){if(fogRevealed[m]&&fogRevealed[m][y])fogRevealed[m][y][x]=false;}
  fogSave();
}

// v280: exploration % cache — avoids 1200-cell scan every frame; dirty when fog changes
const _fogPctCache=new Array(FOG_MAP_COUNT).fill(-1);
const _fogPctDirty=new Array(FOG_MAP_COUNT).fill(true);
function fogExploredPercent(mapIdx){
  if(!_fogPctDirty[mapIdx]&&_fogPctCache[mapIdx]>=0)return _fogPctCache[mapIdx];
  _fogPctDirty[mapIdx]=false;
  const m=maps[mapIdx];
  let total=0,revealed=0;
  for(let y=0;y<MH;y++){
    for(let x=0;x<MW;x++){
      if(WALKABLE.has(m[y]?.[x])){total++;if(fogRevealed[mapIdx][y][x])revealed++;}
    }
  }
  const pct=total===0?0:Math.round((revealed/total)*100);
  _fogPctCache[mapIdx]=pct;
  return pct;
}

// Tile noise hash for fog texture
function fogNoise(x,y,seed){return((x*2654435761+y*40503+seed*7919)&0xFFFF)/65535;}

// Load fog from localStorage on init
fogLoad();

// ── EXIT ZONES (GDD v1.0) ──
// Town→Dungeon: walk to east edge of town (x=38-39)
// Dungeon floor→next floor: step on glow tile at far end
// Dungeon floor→town (escape): step on treasure tile near entrance
