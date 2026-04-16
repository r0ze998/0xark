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
// v389: pre-baked sin/cos for phase offsets used in card character animations
const _CSIN15=Math.sin(1.5),_CCOS15=Math.cos(1.5); // +1.5 offset (tentacle wave, cloak waver)
const _CSIN30=Math.sin(3.0),_CCOS30=Math.cos(3.0); // +3.0 offset
// Reveal sparkle particles
const revealSparkles=[];

function drawCardCharacter(x,y,cardId,scale,time){
  const s=scale||1;
  const t=(typeof time==='number')?time:((typeof fr!=='undefined')?fr:0);
  // Reveal: if this card is being revealed, apply silhouette->color effect
  const revealProg=getRevealProgress(cardId);
  const revealing=revealProg<1;
  // v402: name-based sprite lookup (fixes mismatch from card list reordering)
  const _cr0=CD[cardId-1];const _cn=_cr0?.n||'';

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
    const sway=_sFr035; // v389: cached (was Math.sin(t*0.035))
    const shieldGlow=0.3+0.3*_sFr052; // v389: cached (was Math.sin(t*0.052))
    const shieldBright=_rw(shieldGlow);
    // Crystal crest sparkle
    const sparkleOn=(_sFr08>0.85); // v389: cached

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
    const eyeGlow=(_sFr035>0.7)?1:0; // v389: cached
    const eyeColor=eyeGlow?'#e0a0ff':'#c080ff';
    const eyeColor2=eyeGlow?'#c080e0':'#a060d0';
    // Cloak bottom waver offsets — sin-addition with pre-baked phase constants
    const w0=Math.round(_sFr06);
    const w1=Math.round(_sFr06*_CCOS15+_cFr06*_CSIN15);
    const w2=Math.round(_sFr06*_CCOS30+_cFr06*_CSIN30);

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
    const crouch=Math.round(_sFr07); // v389: cached (was Math.sin(t*0.07))
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
      const p=pp[i];p.ry-=0.35;p.rx+=(_sFr10*_IDX_CI[i%60]+_cFr10*_IDX_SI[i%60])*0.15;p.life--;
      if(p.life<=0){pp.splice(i,1);continue;}
      const a=Math.min(1,p.life/10);
      g.fillStyle=p.c;g.globalAlpha=a;
      g.fillRect(x+p.rx*s,y+p.ry*s,s,s);
      g.globalAlpha=1;
    }
  }else if(_cn==='TEMPEST'){
    // TEMPEST — Storm Prophet (floating cloud being)
    // Idle: float up/down, lightning sparks, cloud shape shift
    const floatY=_sFr052*2; // v389: cached
    const cloudShift=Math.round(_sFr04); // v389: cached

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
  }else if(_cn==='NIHIL'){
    // NIHIL — Void Observer (ghost with single eye)
    // Idle: eye pulse, body sway, vortex rotation, tentacle wave
    const sway=_sFr042; // v389: cached
    const eyePulse=_sFr07; // v389: cached
    const eyeExtra=(eyePulse>0.3)?1:0;
    // Vortex spiral rotation — shift spiral line positions
    const spiralPhase=Math.floor(t/10)%4;
    // Tentacle wave — sin-addition with pre-baked phase offsets
    const tw0=Math.round(_sFr05);
    const tw1=Math.round(_sFr05*_CCOS15+_cFr05*_CSIN15);
    const tw2=Math.round(_sFr05*_CCOS30+_cFr05*_CSIN30);

    // Aura glow — pulsing
    const auraBright=0.15+0.1*_sFr04; // v389: cached
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

  // v402: Legendary card unique sprites (name-matched to survive CD reordering)
  else if(_cn==='VOIDBLADE'){
    // VOIDBLADE — Reality Cutter (void knight, Legendary attack)
    // Idle: void blade flicker, reality tear particles, dark mantle sway
    const sway=_sFr042;
    const bladePulse=0.6+0.4*_sFr06;
    const tearPhase=Math.floor(t/6)%3;
    // Dark hood/helm
    px(4,0,8,2,'#302858');px(5,0,6,1,'#3c3060');
    px(3,2,10,3,'#3c3060');px(4,2,8,2,'#504878');
    // Visor slit (void glow)
    px(4,3,8,1,'#201838');px(5,3,6,1,'#6048a0');
    // Void eyes
    px(5,4,2,1,'#9060f0');px(9,4,2,1,'#9060f0');
    // Dark mantle body — sway
    px(2+sway,5,12,5,'#201838');px(3+sway,5,10,4,'#302858');
    px(4+sway,5,8,3,'#3c3060');
    // Void runes on chest (flickering)
    if(tearPhase===0){px(6,7,1,2,'#9060f0');px(8,6,1,2,'#6048a0');}
    else if(tearPhase===1){px(7,6,2,3,'#7050b0');px(6,8,1,1,'#9060f0');}
    else{px(6,6,3,1,'#9060f0');px(7,7,2,3,'#6048a0');}
    // Reality blade extending down-right (void energy)
    px(9,9,2,8,'#201838');px(10,9,1,8,'#3c2868');
    g.globalAlpha=bladePulse*0.8;px(10,9,1,8,'#9060f0');g.globalAlpha=1;
    // Blade edge crackling
    px(10,10,2,1,'#b080ff');px(11,12,1,2,'#b080ff');px(10,15,2,1,'#b080ff');
    // Left arm (holding blade hilt)
    px(3+sway,9,3,4,'#302858');px(2+sway,10,2,2,'#3c3060');
    px(5+sway,9,3,4,'#3c3060');
    // Hilt
    px(7,8,3,2,'#c8a848');px(7,8,1,2,'#e0c060');
    // Void cloak lower edge (tattered)
    px(2+sway,13,4,2,'#201838');px(10+sway,13,3,2,'#201838');
    px(3,15,2,2,'#201838');px(11,15,2,1,'#201838');
    // Reality tears floating around (frame-based positions)
    g.globalAlpha=0.6;
    px(0,tearPhase*2,1,2,'#9060f0');
    px(15,4+tearPhase*2,1,2,'#6048a0');
    px(1,10+tearPhase,1,1,'#b080ff');
    g.globalAlpha=1;
  }else if(_cn==='TITAN'){
    // TITAN — Earth Guardian (colossal stone being, Legendary defense)
    // Idle: slow breath expansion, lava crack glow between plates
    const breathW=Math.round(_sFr007);
    const lavaPulse=0.4+0.5*_sFr04;
    const lavaCol='#f05010';
    // Stone helm (wide, angular)
    px(2,0,12,3,'#8898b0');px(3,0,10,2,'#9ab0c8');
    px(2,1,2,2,'#708098');px(12,1,2,2,'#708098');
    // Eye slits (lava-lit from within)
    px(4,2,3,1,lavaCol);px(9,2,3,1,lavaCol);
    g.globalAlpha=lavaPulse*0.7;px(4,2,3,1,'#f8a040');px(9,2,3,1,'#f8a040');g.globalAlpha=1;
    // Massive stone torso — breathing
    px(1,3,14+breathW,5,'#6888a0');px(2,3,12+breathW,4,'#8898b0');
    px(3,3,10+breathW,3,'#9ab0c8');
    // Chest crack (lava line)
    g.globalAlpha=lavaPulse;
    px(8,4,1,4,lavaCol);px(7,5,3,2,lavaCol);
    g.globalAlpha=lavaPulse*0.5;px(6,4,5,3,'#f8a040');g.globalAlpha=1;
    // Shoulder plates
    px(0,2,3,6,'#58788a');px(0,2,2,5,'#7090a8');
    px(13,2,3,6,'#58788a');px(14,2,2,5,'#7090a8');
    // Arms (column-like, stone)
    px(0,8,3,6,'#6888a0');px(1,8,2,5,'#8898b0');
    px(13,8,3,6,'#6888a0');px(14,8,2,5,'#8898b0');
    // Forearm cracks (lava seams)
    g.globalAlpha=lavaPulse*0.6;
    px(1,10,1,3,'#f05010');px(14,9,1,4,'#f05010');g.globalAlpha=1;
    // Lower torso
    px(2,8,12,5,'#5878a0');px(3,8,10,4,'#6888b0');
    // Lava crack at waist
    g.globalAlpha=lavaPulse;px(3,12,10,1,lavaCol);px(4,12,8,1,'#f8a040');g.globalAlpha=1;
    // Legs (wide stone pillars)
    px(3,13,4,5,'#5878a0');px(9,13,4,5,'#5878a0');
    px(3,13,3,4,'#6888b0');px(10,13,3,4,'#6888b0');
    // Foot cracks
    g.globalAlpha=lavaPulse*0.4;px(4,17,2,1,lavaCol);px(10,17,2,1,lavaCol);g.globalAlpha=1;
    // Floating rock fragments around titan (slow orbit)
    const orbPhase=Math.floor(t/15)%4;
    const _orbX=[-2,0,14,12],_orbY=[6,1,4,12];
    g.globalAlpha=0.6;px(_orbX[orbPhase],_orbY[orbPhase],2,2,'#8898b0');g.globalAlpha=1;
  }else if(_cn==='GENESIS'){
    // GENESIS — Temporal Revenant (rewind spirit, Legendary flee)
    // Idle: body phase in/out, temporal echo trails, clockwork shimmer
    const phaseA=0.6+0.4*_sFr035;
    const echoShift=Math.floor(t/8)%3;
    const clockSpin=Math.floor(t/4)%8;
    // Temporal echo (ghost trail behind main form)
    g.globalAlpha=0.22;
    px(6+echoShift,0,4,18,'#90d0e0');g.globalAlpha=1;
    // Main form (flowing temporal energy)
    g.globalAlpha=phaseA;
    // Upper body (ethereal silhouette)
    px(5,1,6,2,'#70b0c0');px(4,3,8,2,'#90d0e0');
    px(3,5,10,3,'#b0e8f0');px(4,5,8,2,'#d0f4f8');
    // Face (temporal void circle)
    px(6,2,4,2,'#201838');px(7,2,2,2,'#90d0e0');
    px(7,2,2,1,'#ffffff');
    g.globalAlpha=phaseA*0.9;
    // Arms (flowing streams of time)
    px(1,5,3,5,'#70b0c0');px(2,5,2,4,'#90d0e0');
    px(12,5,3,5,'#70b0c0');px(13,5,2,4,'#90d0e0');
    // Body center — clock face (temporal symbol)
    const _ckArms=[
      {x:7,y:6,w:2,h:4},{x:7,y:6,w:4,h:2}, // 12+3
      {x:7,y:7,w:2,h:3},{x:6,y:7,w:3,h:2}, // 6+9
      {x:7,y:6,w:2,h:3},{x:7,y:7,w:3,h:2}, // diagonal
      {x:7,y:7,w:2,h:3},{x:6,y:7,w:4,h:2},
      {x:7,y:6,w:2,h:4},{x:7,y:7,w:2,h:2},
      {x:7,y:7,w:2,h:4},{x:6,y:7,w:2,h:2},
      {x:7,y:7,w:2,h:3},{x:8,y:7,w:2,h:2},
      {x:7,y:7,w:2,h:2},{x:7,y:7,w:4,h:2}
    ];
    const _ca=_ckArms[clockSpin*2];const _cb=_ckArms[clockSpin*2+1];
    px(5,6,6,6,'#1a3040');px(_ca.x,_ca.y,_ca.w,_ca.h,'#90d0e0');px(_cb.x,_cb.y,_cb.w,_cb.h,'#90d0e0');
    // Clock rim
    px(5,6,6,1,'#70b0c0');px(5,11,6,1,'#70b0c0');px(5,6,1,6,'#70b0c0');px(10,6,1,6,'#70b0c0');
    // Lower temporal stream
    px(4,12,8,3,'#70b0c0');px(5,12,6,2,'#90d0e0');
    px(5,14,6,3,'#50a0b0');px(6,15,4,2,'#70c0d0');
    // Wispy temporal tails
    px(4,16,2,2,'#50a0b0');px(10,16,2,2,'#50a0b0');
    px(6,17,4,1,'#305870');
    g.globalAlpha=1;
    // Sparkle particles along time stream
    const _gp=Math.floor(t/3)%6;
    g.globalAlpha=0.7;px(5+_gp,8,1,1,'#ffffff');g.globalAlpha=1;
  }else if(_cn==='SINGULARITY'){
    // SINGULARITY — Black Hole Entity (Legendary magic)
    // Idle: accretion disk rotation, gravity distortion, matter absorption
    const spin=Math.floor(t/4)%12;
    const gravPulse=0.5+0.5*_sFr03;
    // Outer distortion ring (void)
    g.globalAlpha=0.35+gravPulse*0.15;
    px(0,7,16,2,'#302848');px(1,6,14,2,'#302848');px(1,11,14,2,'#302848');px(0,9,16,2,'#302848');
    g.globalAlpha=1;
    // Accretion disk (spinning colored matter)
    // Disk segments rotate around center
    const _diskSegs=[
      {x:1,y:8,w:4,h:2,c:'#8040d0'},{x:11,y:8,w:4,h:2,c:'#4080d0'},
      {x:4,y:5,w:2,h:3,c:'#d04080'},{x:10,y:10,w:2,h:3,c:'#40c080'},
      {x:3,y:11,w:3,h:2,c:'#c06040'},{x:10,y:5,w:3,h:2,c:'#60a0c0'},
    ];
    for(let _di=0;_di<_diskSegs.length;_di++){
      const _seg=_diskSegs[(_di+spin/2|0)%_diskSegs.length];
      g.globalAlpha=0.7;px(_seg.x,_seg.y,_seg.w,_seg.h,_seg.c);g.globalAlpha=1;
    }
    // Central black hole (pure void)
    px(5,6,6,6,'#0c080e');px(6,6,4,6,'#080408');px(5,7,6,4,'#080408');
    // Event horizon edge (faint rim)
    g.globalAlpha=gravPulse*0.6;
    px(5,6,6,1,'#6040a0');px(5,11,6,1,'#6040a0');px(5,6,1,6,'#6040a0');px(10,6,1,6,'#6040a0');
    g.globalAlpha=1;
    // Singularity core glow
    g.globalAlpha=gravPulse*0.4;px(7,8,2,2,'#c080ff');g.globalAlpha=1;
    // Matter being pulled in (4 streams at cardinal directions)
    const mPhase=(spin)%4;
    const _mStream=[[{x:1,y:8,w:4,h:1},{x:2,y:9,w:3,h:1}],[{x:7,y:2,w:2,h:4},{x:8,y:3,w:1,h:3}],
                    [{x:11,y:8,w:4,h:1},{x:12,y:9,w:3,h:1}],[{x:7,y:12,w:2,h:4},{x:8,y:13,w:1,h:3}]];
    g.globalAlpha=0.5;
    _mStream[mPhase].forEach(_s=>px(_s.x,_s.y,_s.w,_s.h,'#9060d0'));
    g.globalAlpha=1;
    // Gravity distortion sparkles
    const _gs=Math.floor(t/5)%8;
    const _gsX=[0,2,14,13,0,3,12,15],_gsY=[4,1,3,14,12,15,1,7];
    g.globalAlpha=0.4+0.3*_sFr08;px(_gsX[_gs],_gsY[_gs],1,1,'#c080ff');g.globalAlpha=1;
  }else if(_cn==='ARK BLESS'){
    // ARK BLESS — Divine Vessel (Legendary recovery)
    // Idle: wings pulse, healing particles rain down, golden radiance
    const wingSpread=0.5+0.5*_sFr04;
    const radiance=0.3+0.4*_sFr06;
    const healPhase=Math.floor(t/5)%5;
    // Outer radiance (golden halo)
    g.globalAlpha=radiance*0.25;
    px(-1,0,18,18,'#f8e870');g.globalAlpha=1;
    // Wings — left (spread pulse)
    const wL=Math.round(wingSpread*4);
    px(-wL,3,wL+3,8,'#f0e060');px(-wL,4,wL+2,6,'#f8f090');
    px(-wL,5,wL,4,'#ffffff');
    // Wing feather tips
    px(-wL-1,3,1,2,'rgba(248,240,144,0.5)');px(-wL-1,6,1,2,'rgba(248,240,144,0.3)');
    // Wings — right
    px(13,3,wL+3,8,'#f0e060');px(15,4,wL+2,6,'#f8f090');
    px(16,5,wL,4,'#ffffff');
    px(16+wL,3,1,2,'rgba(248,240,144,0.5)');px(16+wL,6,1,2,'rgba(248,240,144,0.3)');
    // Halo ring
    g.globalAlpha=radiance;
    px(4,0,8,1,'#f8e870');px(3,1,10,1,'#f8f090');
    g.globalAlpha=1;
    // Body (divine humanoid, flowing robes)
    px(5,1,6,2,'#f0e8c0');px(4,3,8,3,'#f8f0d8');
    px(4,3,8,1,'#ffffff'); // shoulder highlight
    // Face (serene, radiant)
    px(6,2,4,2,'#f8e8c8');px(7,2,2,1,'#ffffff');
    // Robe body
    px(3,6,10,6,'#e8d8a0');px(4,6,8,5,'#f0e0b0');
    px(5,6,6,3,'#f8eed0');
    // Sash/belt (gold)
    px(4,11,8,2,'#c8a840');px(5,11,6,1,'#e0c060');
    // Robe skirt (flowing)
    px(3,12,10,5,'#e8d8a0');px(4,12,8,4,'#f0e0b0');
    px(3,14,4,3,'#dcc890');px(9,14,4,3,'#dcc890');
    // Healing motes falling (5 positions cycling)
    const _hx=[2,6,11,4,9],_hy=[3,7,5,13,2];
    g.globalAlpha=0.8;px(_hx[healPhase],_hy[healPhase],2,2,'#ffffff');g.globalAlpha=1;
    g.globalAlpha=0.4;px(_hx[(healPhase+2)%5],_hy[(healPhase+2)%5]+2,1,1,'#f8f0a0');g.globalAlpha=1;
    // Arms raised in blessing
    px(1,6,3,4,'#f0e8c0');px(0,6,2,3,'#e8d8b0');
    px(12,6,3,4,'#f0e8c0');px(14,6,2,3,'#e8d8b0');
    // Hands glow
    g.globalAlpha=radiance*0.8;px(0,5,2,2,'#f8f090');px(14,5,2,2,'#f8f090');g.globalAlpha=1;
  }else if(_cn==='SANCTUARY'){
    // SANCTUARY — Sacred Keeper (divine guardian, Legendary defense)
    // Idle: aura pulse, sacred barrier shimmer, halo glow
    const sanAura=0.3+0.4*_sFr035;
    const sanBeam=0.4+0.4*_sFr052;
    const sanBarPhase=Math.floor(t/12)%4;
    // Background radiance
    g.globalAlpha=sanAura*0.15;px(-1,-1,18,22,'#a0dcf8');g.globalAlpha=1;
    // Halo (sacred crown ring)
    px(3,0,10,1,'#a0dcf8');px(5,0,6,1,'#f0f8ff');
    g.globalAlpha=sanAura*0.6;px(6,0,4,1,'#ffffff');g.globalAlpha=1;
    // Hood / head
    px(3,1,10,2,'#4888b8');px(4,1,8,1,'#60a8d8');
    // Face (serene white)
    px(5,3,6,4,'#f0f8ff');px(6,4,4,2,'#ffffff');
    // Glowing calm eyes
    px(6,4,2,1,'#80c8f0');px(9,4,2,1,'#80c8f0');
    px(6,5,2,1,'#a0dcf8');px(9,5,2,1,'#a0dcf8');
    // Hood frame
    px(3,2,2,5,'#38689a');px(11,2,2,5,'#38689a');
    // Body — flowing sacred robes
    px(4,7,8,4,'#80c8f0');px(5,7,6,3,'#a0dcf8');
    // Sacred cross emblem on chest
    px(7,7,2,4,'#f0f8ff');px(5,8,6,2,'#f0f8ff');
    px(7,8,2,1,'#c8f8ff'); // crystalline center
    // Robe side trim
    px(4,7,1,4,'#4888b8');px(11,7,1,4,'#4888b8');
    // Arms extended (barrier projection)
    px(1,7,4,3,'#80c8f0');px(0,7,2,3,'#a0dcf8');
    px(11,7,4,3,'#80c8f0');px(14,7,2,3,'#a0dcf8');
    // Glowing palms (divine barrier emitters)
    g.globalAlpha=sanBeam;px(-1,6,3,5,'#60c0e8');px(14,6,3,5,'#60c0e8');g.globalAlpha=1;
    // Sacred barrier arcs (animated)
    const _bpXL=[-1,0,0,-1],_bpXR=[14,15,15,14],_bpYa=[5,6,8,10];
    g.globalAlpha=sanBeam*0.55;
    px(_bpXL[sanBarPhase],_bpYa[sanBarPhase],2,5,'#a0dcf8');
    px(_bpXR[sanBarPhase],_bpYa[sanBarPhase],2,5,'#a0dcf8');
    g.globalAlpha=sanBeam*0.2;
    px(0,4,16,1,'#80c8f0');px(0,14,16,1,'#80c8f0'); // top/bottom barrier lines
    g.globalAlpha=1;
    // Lower robes
    px(3,11,10,4,'#60a8d8');px(4,11,8,3,'#80c8f0');
    px(5,13,6,1,'#a0dcf8'); // hem highlight
    px(4,15,3,2,'#4888b8');px(9,15,3,2,'#4888b8');
    px(4,16,4,1,'#38609a');px(8,16,4,1,'#38609a');
  }else if(_cn==='GEN PULSE'){
    // GEN PULSE — Genesis Core (primordial healing star, Legendary recovery)
    // Idle: radiant core pulses, rotating rays, expanding energy rings
    const genPulse=0.5+0.5*_sFr04;
    const genRay=Math.floor(t/5)%8; // 8-position ray flare
    const genRing=Math.floor(t/8)%3; // expanding ring phase
    const genGlow=0.3+0.4*_sFr06;
    // Outer golden radiance
    g.globalAlpha=genPulse*0.2;px(-1,-1,18,22,'#f8e070');g.globalAlpha=1;
    // Rotating ray flares (golden sparks at 8 positions)
    const _grx=[7,10,12,10,7,4,2,4],_gry=[0,1,5,9,12,9,5,1];
    g.globalAlpha=0.4+genPulse*0.4;
    px(_grx[genRay],_gry[genRay],2,2,'#ffffff');
    px(_grx[(genRay+4)%8],_gry[(genRay+4)%8],2,2,'#fff898');
    g.globalAlpha=1;
    // 4 main cardinal rays (golden)
    px(7,0,2,5,'#d0b848');px(7,13,2,5,'#d0b848');
    px(0,7,5,2,'#d0b848');px(11,7,5,2,'#d0b848');
    // Ray highlights (bright core end)
    px(7,1,2,2,'#f8e070');px(7,14,2,2,'#f8e070');
    px(1,7,2,2,'#f8e070');px(12,7,2,2,'#f8e070');
    // 4 diagonal shorter rays
    px(3,3,3,2,'#d0b848');px(10,3,3,2,'#d0b848');
    px(3,11,3,2,'#d0b848');px(10,11,3,2,'#d0b848');
    // Expanding energy ring (3 sizes)
    g.globalAlpha=genGlow*0.45;
    if(genRing===0){px(3,2,10,1,'#f8e070');px(3,13,10,1,'#f8e070');px(2,3,1,10,'#f8e070');px(13,3,1,10,'#f8e070');}
    else if(genRing===1){px(4,3,8,1,'#f8e070');px(4,12,8,1,'#f8e070');px(3,4,1,8,'#f8e070');px(12,4,1,8,'#f8e070');}
    else{px(5,4,6,1,'#f8e070');px(5,11,6,1,'#f8e070');px(4,5,1,6,'#f8e070');px(11,5,1,6,'#f8e070');}
    g.globalAlpha=1;
    // Core orb (warm golden)
    px(4,4,8,8,'#c8a030');px(5,4,6,8,'#e0b840');px(5,5,6,6,'#f8e070');
    px(6,5,4,6,'#fff898'); // bright inner core
    // Center (pure white, life source)
    g.globalAlpha=genPulse*0.9;px(6,6,4,4,'#ffffff');g.globalAlpha=1;
    px(7,7,2,2,'#ffffff');
    // Radiant shimmer overlay
    g.globalAlpha=genGlow*0.5;px(5,5,6,6,'#ffffff');g.globalAlpha=1;
  }else if(_cn==='REAPER'){
    // REAPER — Death Harvester (Lifedrain, Epic attack)
    // Idle: cloak billow, scythe glow, soul orbs orbit
    const reapSway=Math.round(_sFr035*0.7);
    const scytheGlow=0.3+0.4*_sFr06;
    const soulPhase=Math.floor(t/10)%4; // soul orb orbit
    // Ethereal dark aura
    g.globalAlpha=0.15;px(-1,-1,18,22,'#504070');g.globalAlpha=1;
    // Tall dark hood (imposing silhouette)
    px(5,0,6,2,'#302050');px(4,2,8,2,'#402868');px(3,4,10,2,'#504078');
    px(6,0,4,1,'#402868'); // hood peak
    // Empty eye sockets (purple glow, death sight)
    px(5,4,3,2,'#9060d0');px(9,4,3,2,'#9060d0');
    g.globalAlpha=scytheGlow;px(5,4,3,2,'#c090f0');px(9,4,3,2,'#c090f0');g.globalAlpha=1;
    // Hooded skull face (dark, gaunt)
    px(4,4,8,3,'#201030');px(6,5,5,2,'#1a0820');
    // Cloak body — billowing
    px(2,6+reapSway,12,5,'#302050');px(3,6+reapSway,10,4,'#402868');
    px(4,7+reapSway,8,3,'#302050');
    // Skeletal hands emerging
    px(2,9,2,3,'#c8b8a0');px(13,9,2,3,'#c8b8a0');
    px(1,11,2,1,'#b0a090');px(14,11,2,1,'#b0a090'); // finger tips
    // Scythe (dark crescent blade)
    px(11,0,3,1,'#9870c0');px(12,1,3,1,'#9870c0');px(13,2,3,1,'#786098'); // blade curve
    px(11,0,2,1,'#d0c0f0');px(13,2,2,1,'#d0c0f0'); // blade edge highlights
    // Scythe shaft
    px(10,2,2,7,'#504070');px(11,3,1,6,'#786098');
    g.globalAlpha=scytheGlow*0.7;px(11,0,5,4,'#9060d0');g.globalAlpha=1; // glow on blade
    // Lower cloak (tattered)
    px(2,11,12,5,'#302050');px(3,11,10,4,'#402868');
    px(1,14,2,2,'#302050');px(13,14,2,2,'#302050'); // tattered edges
    px(4,15,2,2,'#201030');px(10,15,2,2,'#201030');
    // Soul orbs orbiting (4 positions)
    const _sox=[-1,8,15,8],_soy=[9,0,9,16];
    g.globalAlpha=0.7;px(_sox[soulPhase],_soy[soulPhase],2,2,'#9060d0');g.globalAlpha=1;
    g.globalAlpha=0.35;px(_sox[(soulPhase+2)%4],_soy[(soulPhase+2)%4],2,2,'#c090f0');g.globalAlpha=1;
  }else if(_cn==='ARK GATE'){
    // ARK GATE — The Invisible Door (instant escape, Legendary flee)
    // Idle: portal swirl, rune pulse, dimensional shimmer
    const gateSwirl=Math.floor(t/6)%6;
    const runeGlow=0.4+0.4*_sFr04;
    const portalShim=0.5+0.5*_sFr035;
    // Faint dimensional aura
    g.globalAlpha=0.12;px(-1,-1,18,22,'#78c8d0');g.globalAlpha=1;
    // Gate arch frame (left pillar, right pillar, top arch)
    px(1,1,3,16,'#4888a0');px(1,1,2,15,'#5898b0');
    px(12,1,3,16,'#4888a0');px(13,1,2,15,'#5898b0');
    px(4,0,8,2,'#4888a0');px(5,0,6,1,'#5898b0');
    px(2,1,2,2,'#4888a0');px(12,1,2,2,'#4888a0');
    // Keystone (glowing cyan)
    px(7,0,2,1,'#98e0e8');
    // Ancient runes carved in pillars (glowing with runeGlow)
    g.globalAlpha=runeGlow*0.8;
    px(2,4,1,2,'#78c8d0');px(2,8,1,2,'#78c8d0');px(2,12,1,2,'#78c8d0');
    px(13,5,1,2,'#78c8d0');px(13,9,1,2,'#78c8d0');px(13,13,1,2,'#78c8d0');
    g.globalAlpha=1;
    // Portal interior (dimensional void)
    px(4,2,8,14,'#0a1820');px(5,3,6,12,'#071015');
    // Swirling portal energy (6-phase rotation)
    const _swx=[5,7,9,9,7,5],_swy=[4,3,5,9,11,9];
    g.globalAlpha=0.5+portalShim*0.3;
    px(_swx[gateSwirl],_swy[gateSwirl],3,2,'#58a0b0');
    px(_swx[(gateSwirl+3)%6],_swy[(gateSwirl+3)%6],3,2,'#78c8d0');
    g.globalAlpha=0.3;
    px(_swx[(gateSwirl+1)%6]+1,_swy[(gateSwirl+1)%6],2,1,'#98e0e8');
    g.globalAlpha=1;
    // Portal boundary shimmer
    g.globalAlpha=portalShim*0.65;
    px(4,2,8,1,'#98e0e8');px(4,15,8,1,'#98e0e8');
    px(4,2,1,14,'#78c8d0');px(11,2,1,14,'#78c8d0');
    g.globalAlpha=1;
    // Dimensional light at center
    g.globalAlpha=portalShim*0.45;px(6,6,4,5,'#78c8d0');g.globalAlpha=1;
    g.globalAlpha=portalShim*0.25;px(7,7,2,3,'#f0feff');g.globalAlpha=1;
    px(7,8,2,1,'#ffffff'); // core point of light
    // Gate base
    px(1,17,14,1,'#38708a');px(2,17,12,1,'#4888a0');
  }else if(_cn==='PHOENIX'){
    // PHOENIX — Fire Reborn (revive once, Epic recovery)
    // Idle: wing flap, tail flame flicker, ember particles
    const wingFl=Math.floor(t/8)%2; // wing up/down
    const flamePh=Math.floor(t/6)%3; // flame phase
    const phGlow=0.3+0.4*_sFr06;
    // Warm glow aura
    g.globalAlpha=phGlow*0.18;px(-1,-1,18,22,'#f8a040');g.globalAlpha=1;
    // Head (fierce bird head)
    px(6,1,4,3,'#e88030');px(7,1,2,2,'#f0a050');
    // Eye (golden)
    px(8,2,2,1,'#f8e040');
    // Beak (orange-red)
    px(10,2,3,1,'#d86020');px(11,2,2,1,'#f07030');
    // Crest feathers (flame tips on head)
    if(flamePh===0){px(5,0,3,2,'#f0c040');px(8,0,2,1,'#f8a030');}
    else if(flamePh===1){px(6,0,2,2,'#f0c040');px(9,0,2,1,'#f8a030');}
    else{px(5,0,4,1,'#f8c840');px(7,0,2,2,'#f0a030');}
    // Body (broad, powerful)
    px(5,4,6,4,'#d86020');px(6,4,4,3,'#e88030');px(6,5,4,2,'#f0a050');
    // Wings — left (flapping)
    if(wingFl===0){
      px(0,3,6,5,'#c05018');px(1,3,5,4,'#d86020');px(2,4,3,3,'#e88030');
      px(0,7,5,2,'#e88030');px(0,8,4,2,'#f0a050');
    }else{
      px(0,5,6,4,'#c05018');px(1,5,5,3,'#d86020');px(2,6,3,2,'#e88030');
      px(0,8,5,2,'#e88030');
    }
    // Wings — right (mirrored flap)
    if(wingFl===0){
      px(10,3,6,5,'#c05018');px(11,3,5,4,'#d86020');px(12,4,3,3,'#e88030');
      px(11,7,5,2,'#e88030');px(12,8,4,2,'#f0a050');
    }else{
      px(10,5,6,4,'#c05018');px(11,5,5,3,'#d86020');px(12,6,3,2,'#e88030');
      px(11,8,5,2,'#e88030');
    }
    // Tail feathers (flame trail below)
    px(5,8,6,4,'#d86020');px(6,8,4,3,'#e88030');
    // Flame tail tips (animated)
    if(flamePh===0){px(4,11,3,3,'#f0c040');px(8,12,3,2,'#f0a030');px(6,13,2,3,'#e88030');}
    else if(flamePh===1){px(5,11,2,3,'#f8c840');px(9,11,2,3,'#f0a030');px(7,12,2,3,'#e88030');}
    else{px(4,12,4,2,'#f0c040');px(8,11,3,3,'#f0a030');px(6,14,3,2,'#e88030');}
    // Talons
    px(5,16,2,2,'#c05018');px(9,16,2,2,'#c05018');
    // Ember particles
    const _pp=charParticles[cardId];
    if(t%10===0&&_pp.length<CHAR_PARTICLE_MAX){_pp.push({rx:4+Math.random()*8,ry:12,life:15+Math.random()*8,c:Math.random()>.5?'#f0c040':'#f08030'});}
    for(let _i=_pp.length-1;_i>=0;_i--){const _p=_pp[_i];_p.ry-=0.4;_p.life--;
      if(_p.life<=0){_pp.splice(_i,1);continue;}
      g.globalAlpha=Math.min(1,_p.life/8);g.fillStyle=_p.c;g.fillRect(x+_p.rx*s,y+_p.ry*s,s,s);g.globalAlpha=1;}
  }else if(_cn==='PHANTOM'){
    // PHANTOM — Ghost Walker (ghost mode, Epic flee)
    // Idle: phase shift (fade in/out), wisps drift, translucent form
    const phaseA=0.5+0.5*_sFr035; // phase in/out
    const wispPh=Math.floor(t/7)%4;
    // Main form (translucent teal ghost)
    g.globalAlpha=phaseA*0.85;
    // Head (round ghost head)
    px(5,1,6,5,'#408870');px(6,2,4,3,'#60a890');px(7,2,2,2,'#88c8a8');
    // Ghost eyes (glowing)
    px(6,3,2,2,'#d0f0e8');px(9,3,2,2,'#d0f0e8');
    px(7,4,1,1,'#60a890');px(10,4,1,1,'#60a890'); // pupils
    // Open mouth
    px(7,6,3,1,'#204838');
    // Body (flowing ghost form)
    px(4,6,8,6,'#408870');px(5,7,6,4,'#60a890');px(6,7,4,3,'#88c8a8');
    // Ghost hands (reaching)
    px(1,8,4,3,'#408870');px(2,8,3,2,'#60a890');
    px(11,8,4,3,'#408870');px(12,8,3,2,'#60a890');
    // Wispy bottom (ghost tail, tattered)
    px(3,12,10,3,'#408870');px(4,13,8,2,'#60a890');
    // Wispy tendrils at bottom (4-phase)
    const _wt=[{x:3,y:14,w:2,h:3},{x:7,y:15,w:2,h:3},{x:11,y:14,w:2,h:3},{x:5,y:16,w:2,h:2}];
    px(_wt[wispPh].x,_wt[wispPh].y,_wt[wispPh].w,_wt[wispPh].h,'#306858');
    px(_wt[(wispPh+2)%4].x,_wt[(wispPh+2)%4].y,_wt[(wispPh+2)%4].w,_wt[(wispPh+2)%4].h,'#60a890');
    g.globalAlpha=1;
    // Echo (ghost trail — opposite phase)
    g.globalAlpha=(1-phaseA)*0.3;px(6,2,4,14,'#88c8a8');g.globalAlpha=1;
  }else if(_cn==='GRAVITY'){
    // GRAVITY — Crush Force (even light bends, Epic magic)
    // Idle: gravity lens distortion, orbiting debris, crushing force
    const gravPh=Math.floor(t/6)%8; // 8-position debris orbit
    const crushPulse=0.4+0.4*_sFr04;
    const lensWarp=Math.round(_sFr03*1.5);
    // Dark gravity aura
    g.globalAlpha=crushPulse*0.15;px(-1,-1,18,22,'#503060');g.globalAlpha=1;
    // Gravity lens core (dark compressed space)
    px(5,3,6,10,'#281630');px(6,4,4,8,'#381e42');px(6,5,4,6,'#180c1a');
    // Core singularity (dense)
    px(7,7,2,2,'#0c0810');
    // Gravity distortion rings (nested ellipses)
    g.globalAlpha=crushPulse*0.6;
    px(3,6,1,4,'#9060c0');px(12,6,1,4,'#9060c0'); // left/right lens edge
    px(6,3,4,1,'#7040a0');px(6,12,4,1,'#7040a0'); // top/bottom
    g.globalAlpha=crushPulse*0.35;
    px(2,5,1,6,'#6040a0');px(13,5,1,6,'#6040a0');
    px(5,2,6,1,'#6040a0');px(5,13,6,1,'#6040a0');
    g.globalAlpha=1;
    // Orbiting debris (8 positions around gravity well)
    const _dbx=[7,10,12,10,7,4,2,4],_dby=[1,2,5,10,13,10,5,2];
    g.globalAlpha=0.7;px(_dbx[gravPh],_dby[gravPh],2,2,'#806890');g.globalAlpha=1;
    g.globalAlpha=0.4;px(_dbx[(gravPh+4)%8]+1,_dby[(gravPh+4)%8],1,1,'#a090c0');g.globalAlpha=1;
    // Light bending arcs (3 curved lines on each side)
    g.globalAlpha=crushPulse*0.5;
    px(1,7,3,1,'#6040a0'+lensWarp+'0');
    px(1,8,2,1,'#7050b0');
    px(12,7,3,1,'#6040a0');
    px(13,8,2,1,'#7050b0');
    g.globalAlpha=1;
    // Crushed matter at center
    g.globalAlpha=crushPulse*0.8;px(7,7,2,2,'#c0a0e0');g.globalAlpha=1;
  }else if(_cn==='CRYSTAL'){
    // CRYSTAL — Unbreakable (perfect defense, Epic defense)
    // Idle: crystal facets shimmer, prismatic glow pulses, refraction ripples
    const crysShim=Math.floor(t/7)%6; // shimmer position
    const prismPulse=0.4+0.4*_sFr052;
    const facetGlow=0.3+0.3*_sFr04;
    // Crystal aura (prismatic)
    g.globalAlpha=prismPulse*0.15;px(-1,-1,18,22,'#c0f0ff');g.globalAlpha=1;
    // Crystal golem body — main structure (angular crystalline form)
    // Core torso (large crystal shard)
    px(4,4,8,10,'#50a8d0');px(5,4,6,9,'#70c0f0');px(6,5,4,7,'#a0ddf8');
    // Crystal head (pointed, sharp)
    px(5,0,6,4,'#70c0f0');px(6,0,4,3,'#98d8f8');px(7,0,2,2,'#c0eeff');
    // Prismatic highlight (rotates around body)
    const _prx=[6,9,11,9,6,3,1,3],_pry=[1,2,5,10,12,10,5,2];
    g.globalAlpha=0.6+prismPulse*0.4;
    px(_prx[crysShim],_pry[crysShim],2,1,'#ffffff');
    px(_prx[(crysShim+3)%6],_pry[(crysShim+3)%6],1,2,'#e0f8ff');
    g.globalAlpha=1;
    // Crystal arms (angular shards)
    px(0,5,5,4,'#4898c0');px(0,6,4,2,'#60b0e0'); // left arm
    px(11,5,5,4,'#4898c0');px(12,6,4,2,'#60b0e0'); // right arm
    // Arm crystal spikes
    px(-1,4,2,2,'#90d0f0');px(-1,7,2,2,'#70b8e0');
    px(15,4,2,2,'#90d0f0');px(15,7,2,2,'#70b8e0');
    // Crystal legs (stable base)
    px(4,14,3,5,'#4898c0');px(9,14,3,5,'#4898c0');
    px(5,14,2,4,'#60b0e0');px(10,14,2,4,'#60b0e0');
    // Foot crystals
    px(3,18,4,1,'#3878a0');px(9,18,4,1,'#3878a0');
    // Internal light (core glow)
    g.globalAlpha=facetGlow*0.7;px(6,6,4,5,'#c0eeff');g.globalAlpha=1;
    g.globalAlpha=facetGlow*0.4;px(7,7,2,3,'#ffffff');g.globalAlpha=1;
    // Refraction lines (light splitting)
    g.globalAlpha=prismPulse*0.45;
    px(2,8,3,1,'#70c0f0');px(11,9,3,1,'#98d8f8');
    px(3,5,2,1,'#a0ddf8');px(11,6,2,1,'#c0eeff');
    g.globalAlpha=1;
  }else if(_cn==='MAELSTROM'){
    // MAELSTROM — Ocean Vortex (water vortex, Epic magic)
    // Idle: vortex spiral spins, waves crash, foam sprays
    const vortexSpin=Math.floor(t/4)%8; // spiral rotation
    const waveCrash=0.3+0.4*_sFr04;
    const foamBurst=Math.floor(t/6)%3;
    // Dark ocean background
    g.globalAlpha=0.2;px(-1,-1,18,22,'#1a3860');g.globalAlpha=1;
    // Vortex spiral (8 positions of spiral arms)
    const _vx=[7,10,12,11,7,3,2,4],_vy=[1,3,6,10,13,10,7,3];
    // Outer spiral arms (dark blue water)
    g.globalAlpha=0.6+waveCrash*0.2;
    px(_vx[vortexSpin],_vy[vortexSpin],3,2,'#2060a8');
    px(_vx[(vortexSpin+2)%8],_vy[(vortexSpin+2)%8],3,2,'#3070b8');
    px(_vx[(vortexSpin+4)%8],_vy[(vortexSpin+4)%8],2,2,'#4080c8');
    px(_vx[(vortexSpin+6)%8],_vy[(vortexSpin+6)%8],2,2,'#5090c8');
    g.globalAlpha=1;
    // Mid vortex (medium blue)
    px(3,4,10,8,'#2860a0');px(4,5,8,6,'#3870b0');px(5,6,6,4,'#4880c0');
    // Vortex center (dark abyss)
    px(6,7,4,3,'#0a1828');px(7,8,2,1,'#060e16');
    // Foam/white caps (wave crests)
    g.globalAlpha=waveCrash*0.8;
    const _fx=[2,9,12,4,11],_fy=[4,3,7,11,10];
    px(_fx[foamBurst],_fy[foamBurst],3,1,'#c0e0f8');
    px(_fx[(foamBurst+1)%5]+1,_fy[(foamBurst+1)%5],2,1,'#e0f4ff');
    g.globalAlpha=1;
    // Water walls (around vortex)
    px(1,5,3,6,'#2060a0');px(12,5,3,6,'#2060a0');
    px(1,6,2,4,'#3070b0');px(13,6,2,4,'#3070b0');
    // Surface ripples
    g.globalAlpha=waveCrash*0.5;
    px(4,2,8,1,'#4890c8');px(3,3,10,1,'#3878b8');
    px(4,13,8,1,'#4890c8');px(3,14,10,1,'#3878b8');
    g.globalAlpha=1;
    // Spray particles at top
    px(5,0,2,2,'#a0d0f0');px(9,1,2,1,'#c0e4f8');px(3,1,1,1,'#b0d8f4');
  }else if(_cn==='ELIXIR'){
    // ELIXIR — Ultimate Cure (cure all, Epic recovery)
    // Idle: golden liquid swirls, bubbles rise, magical glow pulses
    const liquidSwirl=Math.floor(t/8)%4; // swirl phase
    const glowPulse=0.4+0.4*_sFr06;
    const bubblePh=Math.floor(t/10)%5; // bubble position
    // Warm golden aura
    g.globalAlpha=glowPulse*0.18;px(-1,-1,18,22,'#f0c040');g.globalAlpha=1;
    // Flask body (large alchemical vessel)
    // Flask neck
    px(6,0,4,3,'#c89828');px(7,1,2,1,'#e8c040');
    // Flask stopper (cork)
    px(5,2,6,2,'#a07828');px(6,2,4,1,'#c09030');
    // Flask shoulder (widens)
    px(4,4,8,2,'#c89828');px(5,4,6,1,'#e0b030');
    // Flask body (wide, full of elixir)
    px(2,6,12,9,'#c89828');px(3,6,10,8,'#d8a828');px(3,7,10,6,'#e0b030');
    // Liquid inside (swirling golden)
    px(4,7,8,7,'#f0c040');px(5,8,6,5,'#f8d060');
    // Liquid swirl pattern (4 phases)
    if(liquidSwirl===0){px(5,9,3,2,'#ffe070');px(8,10,3,1,'#f0c040');}
    else if(liquidSwirl===1){px(6,8,4,2,'#ffe070');px(5,10,3,1,'#f0c040');}
    else if(liquidSwirl===2){px(7,9,3,2,'#ffe070');px(5,9,2,2,'#f0c040');}
    else{px(5,8,4,3,'#ffe070');px(9,9,2,2,'#f0c040');}
    // Inner light (magical golden glow)
    g.globalAlpha=glowPulse*0.7;px(6,9,4,3,'#ffffff');g.globalAlpha=1;
    g.globalAlpha=glowPulse*0.4;px(7,10,2,2,'#ffffff');g.globalAlpha=1;
    // Flask base
    px(3,15,10,2,'#c89828');px(4,15,8,1,'#e0b030');
    px(2,16,12,1,'#a07828'); // foot ridge
    // Rising bubbles (5 positions)
    const _bx=[5,7,9,6,8],_by=[6,7,8,9,7];
    g.globalAlpha=0.5+glowPulse*0.3;
    px(_bx[bubblePh],_by[bubblePh],1,1,'#ffffff');
    px(_bx[(bubblePh+2)%5],_by[(bubblePh+2)%5]-2,1,1,'#fff8c0');
    g.globalAlpha=1;
    // Flask highlights (glass glint)
    px(4,6,2,6,'#f8d060');px(4,7,1,4,'rgba(255,255,255,0.35)');
    // Magical sparkles outside flask
    g.globalAlpha=glowPulse*0.6;
    px(1,8,1,1,'#f0c040');px(14,9,1,1,'#f8d060');px(1,12,1,1,'#f0c040');
    g.globalAlpha=1;
  }else if(_cn==='NULLIFY'){
    // NULLIFY — Perfect Cancel (cancel attack, Epic defense)
    // Idle: hexagonal barrier pulses, nullification ring expands, static sparks
    const nullPulse=0.4+0.4*_sFr035;
    const staticPh=Math.floor(t/5)%6; // spark position
    const hexExpand=Math.floor(t/10)%3; // barrier expansion
    // Null field background (dark blue-grey)
    g.globalAlpha=nullPulse*0.12;px(-1,-1,18,22,'#2848a0');g.globalAlpha=1;
    // Hexagonal barrier frame (outer)
    px(4,0,8,2,'#3878b0');px(2,2,4,2,'#3878b0');px(10,2,4,2,'#3878b0');
    px(1,4,2,8,'#3878b0');px(13,4,2,8,'#3878b0');
    px(2,12,4,2,'#3878b0');px(10,12,4,2,'#3878b0');px(4,14,8,2,'#3878b0');
    // Inner barrier fill (semi-transparent)
    g.globalAlpha=nullPulse*0.3;px(2,2,12,12,'#1838a0');g.globalAlpha=1;
    // NULLIFY slash (X through the barrier — the cancellation)
    g.globalAlpha=nullPulse*0.8;
    // Diagonal slash 1 (top-left to bottom-right)
    px(3,2,2,2,'#80c0f0');px(5,4,2,2,'#5898d0');px(7,6,2,2,'#80c0f0');px(9,8,2,2,'#5898d0');px(11,10,2,2,'#80c0f0');
    // Diagonal slash 2 (top-right to bottom-left)
    px(11,2,2,2,'#80c0f0');px(9,4,2,2,'#5898d0');px(7,6,2,2,'#80c0f0');px(5,8,2,2,'#5898d0');px(3,10,2,2,'#80c0f0');
    g.globalAlpha=1;
    // Center void (pure cancel point)
    px(7,7,2,2,'#0a1020');
    // Expanding null ring (3 phases)
    g.globalAlpha=nullPulse*(0.6-hexExpand*0.15);
    if(hexExpand===0){px(5,5,6,1,'#5898d0');px(5,10,6,1,'#5898d0');px(5,5,1,6,'#5898d0');px(10,5,1,6,'#5898d0');}
    else if(hexExpand===1){px(4,4,8,1,'#4888c8');px(4,11,8,1,'#4888c8');px(4,4,1,8,'#4888c8');px(11,4,1,8,'#4888c8');}
    else{px(3,3,10,1,'#3878b8');px(3,12,10,1,'#3878b8');px(3,3,1,10,'#3878b8');px(12,3,1,10,'#3878b8');}
    g.globalAlpha=1;
    // Static sparks (6 positions cycling)
    const _nsx=[2,7,12,13,7,1],_nsy=[7,1,7,7,13,7];
    g.globalAlpha=0.7;px(_nsx[staticPh],_nsy[staticPh],2,1,'#a0d0f0');g.globalAlpha=1;
  }else if(_cn==='VOIDSTEP'){
    // VOIDSTEP — Dimension Hop (one foot in another world, Epic flee)
    // Idle: half-body phases, void portal below, dimensional drift
    const voidPh=0.5+0.5*_sFr025; // phase shift
    const stepCyc=Math.floor(t/8)%4; // step cycle
    const portalSpin=Math.floor(t/6)%8; // portal swirl
    // Void aura
    g.globalAlpha=voidPh*0.12;px(-1,-1,18,22,'#283840');g.globalAlpha=1;
    // Void portal beneath feet (dimensional gateway)
    const _pvx=[7,9,10,9,7,5,4,5],_pvy=[14,14,15,16,17,16,15,14];
    g.globalAlpha=0.4+voidPh*0.3;
    px(_pvx[portalSpin],_pvy[portalSpin],2,2,'#487888');
    px(_pvx[(portalSpin+4)%8],_pvy[(portalSpin+4)%8],2,2,'#68a8b8');
    g.globalAlpha=1;
    // Portal ring on floor
    px(4,16,8,1,'#305860');px(3,15,2,2,'#305860');px(11,15,2,2,'#305860');
    // Character body — half materialized (main-world half)
    g.globalAlpha=0.8+voidPh*0.15;
    // Upper body (solid)
    px(5,2,6,4,'#486878');px(6,3,4,2,'#68908a');
    // Eyes (teal glow)
    px(6,3,2,1,'#c0d8e0');px(9,3,2,1,'#c0d8e0');
    // Torso
    px(4,6,8,4,'#486878');px(5,7,6,2,'#68908a');
    // Arms
    px(1,6,4,3,'#486878');px(12,6,4,3,'#486878');
    g.globalAlpha=1;
    // Lower body — phasing (void-world half, faded)
    g.globalAlpha=voidPh*0.45;
    px(4,10,8,4,'#305060');px(5,11,6,2,'#486070');
    px(4,14,3,3,'#284858');px(9,14,3,3,'#284858');
    g.globalAlpha=1;
    // Void effect (ripples around transition point)
    g.globalAlpha=0.5;
    px(3,10,10,1,'#405868');px(4,10,8,1,'#486878');
    g.globalAlpha=1;
    // Step cycle trace (dimensional footprint)
    const _ftrx=[4,6,9,11],_ftry=[17,18,18,17];
    g.globalAlpha=0.25;px(_ftrx[stepCyc],_ftry[stepCyc],2,1,'#68a8b8');g.globalAlpha=1;
  }else if(_cn==='HOLY LIGHT'){
    // HOLY LIGHT — Divine Radiance (heal and purify, Epic recovery)
    // Idle: light column pulses, holy rays rotate, purification shimmer
    const holyPulse=0.4+0.4*_sFr06;
    const rayRot=Math.floor(t/5)%8; // ray rotation
    const purity=0.3+0.4*_sFr035;
    // Warm golden radiance
    g.globalAlpha=holyPulse*0.18;px(-1,-1,18,22,'#f8f060');g.globalAlpha=1;
    // Holy light column (vertical beam from above)
    g.globalAlpha=purity*0.6;px(6,0,4,18,'#f8f090');g.globalAlpha=1;
    g.globalAlpha=purity*0.3;px(5,0,6,18,'#ffffc0');g.globalAlpha=1;
    g.globalAlpha=purity*0.15;px(4,0,8,18,'#ffffe8');g.globalAlpha=1;
    // Rotating holy rays (8 positions)
    const _hrx=[7,9,10,9,7,5,4,5],_hry=[1,2,5,9,11,9,5,2];
    g.globalAlpha=holyPulse*0.8;
    px(_hrx[rayRot],_hry[rayRot],2,3,'#ffffff');
    px(_hrx[(rayRot+4)%8],_hry[(rayRot+4)%8],2,3,'#f8f0a0');
    g.globalAlpha=holyPulse*0.4;
    px(_hrx[(rayRot+2)%8],_hry[(rayRot+2)%8],1,2,'#f8e870');
    px(_hrx[(rayRot+6)%8],_hry[(rayRot+6)%8],1,2,'#f8e870');
    g.globalAlpha=1;
    // Central divine figure (abstract light being — cross/star shape)
    px(7,3,2,10,'#f0c840');px(4,7,8,2,'#f0c840'); // cross body
    px(7,3,2,10,'#f8e870'); // center highlight
    // Horizontal cross glow
    g.globalAlpha=holyPulse*0.6;px(3,7,10,2,'#f8f090');g.globalAlpha=1;
    // Vertical cross glow
    g.globalAlpha=purity*0.5;px(7,2,2,12,'#ffffff');g.globalAlpha=1;
    // Cross center (pure white)
    px(7,7,2,2,'#ffffff');
    g.globalAlpha=holyPulse*0.9;px(7,7,2,2,'#ffffff');g.globalAlpha=1;
    // Purification sparkles (4 corners)
    g.globalAlpha=purity*0.7;
    px(2,3,2,2,'#f8f090');px(12,3,2,2,'#f8f090');
    px(2,13,2,2,'#f8f090');px(12,13,2,2,'#f8f090');
    g.globalAlpha=1;
  }else if(_cn==='INFERNO'){
    // INFERNO — Area Fire (The ocean does not stop it, Rare magic)
    // Idle: fire column blazes, embers rise, heat shimmer
    const flamePh=Math.floor(t/5)%4;
    const heatPulse=0.4+0.4*_sFr06;
    // Heat shimmer aura
    g.globalAlpha=heatPulse*0.15;px(-1,-1,18,22,'#f08020');g.globalAlpha=1;
    // Fire base (wide, ground-level)
    px(2,14,12,4,'#a83020');px(3,13,10,4,'#c84028');px(4,12,8,5,'#e05030');
    // Fire body column (rising)
    px(3,8,10,6,'#d06020');px(4,7,8,7,'#e08030');px(5,5,6,7,'#f0a030');
    // Fire tips (animated phases)
    if(flamePh===0){px(5,1,6,4,'#f8c040');px(6,0,4,2,'#fff070');px(4,3,2,3,'#f0a030');px(10,3,2,3,'#f0a030');}
    else if(flamePh===1){px(6,1,4,5,'#f8c040');px(7,0,2,2,'#fff070');px(5,2,2,4,'#f0a030');px(9,2,2,3,'#f0a030');}
    else if(flamePh===2){px(5,2,6,4,'#f8c040');px(7,0,3,3,'#fff070');px(4,4,2,2,'#f0a030');px(10,2,2,4,'#f0a030');}
    else{px(6,0,4,6,'#f8c040');px(7,0,2,3,'#fff070');px(5,3,2,3,'#f0a030');px(9,3,2,2,'#f0a030');}
    // Core bright column
    px(7,4,2,12,'#fff080');px(7,3,2,10,'#f8c840');
    // Ember particles
    const _pp=charParticles[cardId];
    if(t%8===0&&_pp.length<CHAR_PARTICLE_MAX){_pp.push({rx:5+Math.random()*6,ry:10,life:18+Math.random()*8,c:Math.random()>.4?'#f0c040':'#f08030'});}
    for(let _i=_pp.length-1;_i>=0;_i--){const _p=_pp[_i];_p.ry-=0.5;_p.rx+=(Math.random()-.5)*0.3;_p.life--;
      if(_p.life<=0){_pp.splice(_i,1);continue;}
      g.globalAlpha=Math.min(1,_p.life/8);g.fillStyle=_p.c;g.fillRect(x+_p.rx*s,y+_p.ry*s,s,s);g.globalAlpha=1;}
  }else if(_cn==='BLIZZARD'){
    // BLIZZARD — Freeze Area (Even memories freeze in it, Rare magic)
    // Idle: snowflake crystals spin, ice shards shimmer, cold mist swirls
    const snowSpin=Math.floor(t/6)%8; // snowflake rotation
    const icePulse=0.4+0.3*_sFr04;
    const mistPh=Math.floor(t/10)%3;
    // Cold mist background
    g.globalAlpha=icePulse*0.15;px(-1,-1,18,22,'#a0d0e8');g.globalAlpha=1;
    // Mist layers (3 phases, horizontal bands)
    g.globalAlpha=0.2+mistPh*0.08;
    px(0,4,16,3,'#c0e8f8');px(0,9,16,3,'#b0d8f0');px(0,14,16,3,'#a8ccec');
    g.globalAlpha=1;
    // Snowflake crystals (6-arm, 4 sizes at different positions)
    // Large center snowflake (spinning)
    const _skx=[7,8,8,8,7,6,6,6],_sky=[4,5,6,7,8,7,6,5]; // 8-pos spiral
    g.globalAlpha=icePulse*0.9;
    // Main snowflake (cross + diagonal)
    px(6,6,4,1,'#d8f0ff');px(7,5,2,4,'#d8f0ff'); // cross arms
    px(6,6,1,1,'#c0e0f8');px(9,6,1,1,'#c0e0f8');px(7,5,1,1,'#c0e0f8');px(7,8,1,1,'#c0e0f8'); // arm tips
    // Diagonal arms
    px(6,5,1,1,'#e0f4ff');px(9,5,1,1,'#e0f4ff');px(6,8,1,1,'#e0f4ff');px(9,8,1,1,'#e0f4ff');
    g.globalAlpha=1;
    // Orbital snowflakes (spinning)
    const _sfx=[3,5,7,9,11,9,7,5],_sfy=[3,1,2,3,6,10,11,8];
    g.globalAlpha=0.6+icePulse*0.3;
    px(_sfx[snowSpin],_sfy[snowSpin],2,1,'#ffffff');px(_sfx[snowSpin]+1,_sfy[snowSpin]-1,1,3,'#ffffff');
    px(_sfx[(snowSpin+4)%8],_sfy[(snowSpin+4)%8],2,1,'#e0f0ff');px(_sfx[(snowSpin+4)%8]+1,_sfy[(snowSpin+4)%8]-1,1,3,'#e0f0ff');
    g.globalAlpha=1;
    // Ice shard ground (jagged ice at bottom)
    px(1,14,2,4,'#90c8e0');px(3,13,3,5,'#a0d0e8');px(6,12,2,6,'#b0d8f0');px(8,11,2,7,'#a0d0e8');px(10,13,3,5,'#90c8e0');px(13,14,2,4,'#88c0d8');
    // Shard highlights (white tips)
    px(1,14,2,1,'#d8f0ff');px(3,13,3,1,'#e0f4ff');px(6,12,2,1,'#e8f8ff');px(8,11,2,1,'#ffffff');px(10,13,3,1,'#e0f4ff');px(13,14,2,1,'#d8f0ff');
    // Falling snowflakes (small dots at random positions)
    g.globalAlpha=0.5;
    px(2,3,1,1,'#ffffff');px(5,7,1,1,'#e0f0ff');px(12,4,1,1,'#ffffff');px(14,9,1,1,'#e0f0ff');px(4,11,1,1,'#ffffff');
    g.globalAlpha=1;
  }else if(_cn==='BERSERK'){
    // BERSERK — Rage Attack (No mind, only red, Rare attack)
    // Idle: rage aura pulses, body shakes, red eyes glow
    const ragePulse=0.4+0.5*_sFr08;
    const shakeOff=Math.round(_sFr25*0.8); // micro-shake
    const rageSway=Math.round(_sFr018);
    // Rage aura (red)
    g.globalAlpha=ragePulse*0.2;px(-1,-1,18,22,'#a02020');g.globalAlpha=1;
    // Wild hair (spiky, all directions)
    px(4,0,8,2,'#181018');px(3,0,2,3,'#241020');px(11,0,2,3,'#241020');
    px(5,0,1,1,'#382030');px(7,0,1,1,'#382030');px(9,0,1,1,'#382030');px(11,0,1,1,'#382030');
    // Head (large, jaw clenched)
    px(3,2,10,6,'#c07050');px(4,3,8,4,'#d08060');
    // Rage eyes (glowing red)
    g.globalAlpha=ragePulse;
    px(4+shakeOff,3,3,2,'#e03020');px(9+shakeOff,3,3,2,'#e03020');
    px(5+shakeOff,3,2,1,'#ff5040');px(10+shakeOff,3,2,1,'#ff5040');
    g.globalAlpha=1;
    // Grimacing mouth (teeth)
    px(5,6,6,2,'#602828');px(6,6,1,2,'#e8e0d0');px(8,6,1,2,'#e8e0d0');px(10,6,1,2,'#e8e0d0');
    // Muscular neck
    px(6,8,4,2,'#c07050');
    // Massive torso (battle-worn)
    px(2+rageSway,10,12,6,'#8a4828');px(3+rageSway,10,10,5,'#a05830');
    // Torn shirt
    px(4,10,2,3,'rgba(0,0,0,.3)');px(10,11,2,2,'rgba(0,0,0,.25)');
    // War scars
    px(5,12,4,1,'#903030');px(8,14,3,1,'#903030');
    // Arms (thick, powerful)
    px(0+rageSway,10,3,7,'#c07050');px(13+rageSway,10,3,7,'#c07050');
    px(0+rageSway,14,4,2,'#d08060'); // forearm
    px(13+rageSway,13,4,2,'#d08060');
    // Clenched fists (raised)
    px(-1+rageSway,8,3,3,'#b06040');px(14+rageSway,8,3,3,'#b06040');
    // Red rage sparks
    g.globalAlpha=ragePulse*0.7;
    px(-1,5,2,2,'#e03020');px(15,6,2,2,'#e03020');
    px(0,12,2,2,'#ff5040');
    g.globalAlpha=1;
  }else if(_cn==='FORTRESS'){
    // FORTRESS — Immovable (Stone does not care, Rare defense)
    // Idle: torch flickers, stone permanence, battlements cast shadow
    const torchFlame=Math.floor(t/7)%2;
    const stonePulse=0.3+0.1*_sFr007; // very slow, barely moves
    // Stone tower body (wide, imposing)
    // Battlements (crenellations at top)
    px(1,0,3,4,'#585848');px(4,2,2,2,'#585848');px(6,0,3,4,'#585848');px(9,2,2,2,'#585848');px(11,0,4,4,'#585848');
    px(3,2,2,2,'#484838');px(8,2,2,2,'#484838'); // battlements slightly lighter
    // Tower walls (stone blocks)
    px(1,4,14,13,'#606050');px(2,4,12,12,'#686858');
    // Stone block seams (mortar lines)
    for(let br=0;br<4;br++){px(2,4+br*3,12,1,'#504840');}
    for(let bc=0;bc<4;bc++){px(2+bc*3,4,1,12,bc%2===0?'#504840':'#585848');}
    // Arrow slit windows (2 columns)
    px(4,7,2,4,'#181410');px(4+1,7+1,0,2,'#0c0a08');
    px(10,8,2,4,'#181410');
    // Castle gate/door at bottom center
    px(6,12,4,5,'#383028');px(7,12,2,5,'#282018');px(6,14,4,3,'#201808'); // arch
    // Gate ring
    px(7,14,2,1,'#907848');
    // Torches (on walls, beside arrow slits)
    px(3,7,1,2,'#a07030');
    if(torchFlame===0){px(3,6,1,1,'#f0a030');g.globalAlpha=0.4;px(2,5,2,2,'#f0a030');g.globalAlpha=1;}
    else{px(2,6,2,1,'#f8c040');g.globalAlpha=0.4;px(2,5,3,2,'#f0a030');g.globalAlpha=1;}
    px(12,8,1,2,'#a07030');
    if(torchFlame===1){px(12,7,1,1,'#f0a030');g.globalAlpha=0.4;px(11,6,2,2,'#f0a030');g.globalAlpha=1;}
    else{px(11,7,2,1,'#f8c040');g.globalAlpha=0.4;px(11,6,3,2,'#f0a030');g.globalAlpha=1;}
    // Wall shadow base
    px(1,17,14,1,'#383828');px(2,16,12,1,'#484838');
    // Stone highlight (light catching top)
    g.globalAlpha=stonePulse*0.5;px(2,4,12,1,'#888868');g.globalAlpha=1;
  }else if(_cn==='SHADOW'){
    // SHADOW — Invisible (Even hunters fear the dark, Rare flee)
    // Idle: barely visible dark form, shadow ripples, eyes glow in darkness
    const shadowAlpha=0.25+0.2*_sFr035; // barely visible
    const eyeGlow=_sFr06>0.5?0.9:0.7; // eyes pulse
    const ripplePh=Math.floor(t/8)%4;
    // Pure darkness background
    g.globalAlpha=0.35;px(-1,-1,18,22,'#080818');g.globalAlpha=1;
    // Shadow form (nearly invisible — just the outline)
    g.globalAlpha=shadowAlpha;
    // Head outline
    px(5,2,6,6,'#1a2030');px(6,3,4,4,'#222838');
    // Body (mass of darkness)
    px(4,8,8,8,'#141c28');px(3,9,10,6,'#1a2030');px(4,10,8,5,'#202838');
    // Arms (shadow tendrils)
    px(0,8,4,5,'#101828');px(12,8,5,5,'#101828');
    // Lower form fading
    px(4,16,8,3,'#0e1620');px(5,17,6,2,'#0c1018');
    g.globalAlpha=1;
    // Eyes (the ONLY visible thing — menacing glow)
    g.globalAlpha=eyeGlow;
    px(6,4,2,2,'#506880');px(9,4,2,2,'#506880');
    g.globalAlpha=0.9;
    px(6,4,2,1,'#c0d8e0');px(9,4,2,1,'#c0d8e0'); // bright sclera catch
    g.globalAlpha=eyeGlow;
    px(7,5,1,1,'#304858');px(10,5,1,1,'#304858');
    g.globalAlpha=1;
    // Shadow ripples (emanating from feet, 4-phase)
    const _rw=[14,12,10,8],_rY=[16,15,14,13];
    g.globalAlpha=0.2+(4-ripplePh)*0.06;
    px((16-_rw[ripplePh])/2,_rY[ripplePh],_rw[ripplePh],1,'#2a3848');
    g.globalAlpha=1;
    // Barely visible weapon glint
    g.globalAlpha=shadowAlpha*1.5;
    px(11,7,2,5,'#2a3848');px(12,6,1,2,'#40607a'); // dagger
    g.globalAlpha=1;
  }else if(_cn==='THUNDER'){
    // THUNDER — Chain Bolt (One strike, many wounds, Rare magic)
    // Idle: lightning bolt branches, static sparks, flash pulses
    const boltFlash=Math.floor(t/4)%4; // bolt phase
    const staticSpark=Math.floor(t/6)%6;
    const flashPulse=0.4+0.4*_sFr08;
    // Storm sky background
    g.globalAlpha=flashPulse*0.12;px(-1,-1,18,22,'#404010');g.globalAlpha=1;
    // Main lightning bolt (jagged, top to bottom)
    if(boltFlash===0){px(8,0,2,3,'#fff080');px(7,3,3,2,'#f8d040');px(9,5,3,2,'#fff080');px(8,7,3,3,'#f8d040');px(7,10,4,3,'#fff080');px(9,13,2,3,'#f8d040');}
    else if(boltFlash===1){px(7,0,3,3,'#fff080');px(9,3,2,3,'#f8e040');px(8,6,3,2,'#fff080');px(7,8,4,3,'#f8d040');px(9,11,2,4,'#fff080');}
    else if(boltFlash===2){px(8,0,3,4,'#ffffff');px(6,4,5,2,'#fff080');px(8,6,3,3,'#ffffff');px(7,9,4,2,'#f8e040');px(9,11,2,5,'#ffffff');}
    else{px(7,0,4,3,'#fff080');px(9,3,3,2,'#f8d040');px(7,5,4,3,'#fff080');px(8,8,3,4,'#f8d040');px(7,12,3,3,'#fff080');}
    // Chain arc branches (secondary bolts)
    g.globalAlpha=0.6+flashPulse*0.2;
    px(8,5,5,1,'#f8d040');px(3,8,6,1,'#e8c030');px(10,10,5,1,'#f8d040');
    g.globalAlpha=1;
    // Ground impact (radial sparks at base)
    g.globalAlpha=flashPulse*0.8;
    px(5,17,6,1,'#f8e040');px(4,16,2,2,'#f0c020');px(10,16,2,2,'#f0c020');
    g.globalAlpha=1;
    // Static sparks (6 positions)
    const _tsx=[1,3,7,11,13,8],_tsy=[6,2,4,3,7,11];
    g.globalAlpha=0.5+flashPulse*0.3;px(_tsx[staticSpark],_tsy[staticSpark],2,2,'#ffffff');g.globalAlpha=1;
    // Electric glow overlay on bolt
    g.globalAlpha=flashPulse*0.4;px(6,0,4,18,'#d8d020');g.globalAlpha=1;
  }else if(_cn==='VENOM'){
    // VENOM — Poison Blade (Death on the blade tip, Rare attack)
    // Idle: venom drips, purple-green poison cloud, fang gleam
    const venomDrip=Math.floor(t/10)%5; // drip position
    const poisonPulse=0.3+0.4*_sFr06;
    const fangSheen=_sFr08>0.7;
    // Poison cloud aura
    g.globalAlpha=poisonPulse*0.15;px(-1,-1,18,22,'#502858');g.globalAlpha=1;
    // Serpent head (top)
    px(5,0,6,4,'#5a3068');px(6,1,4,2,'#703878');
    // Forked tongue
    px(7,3,1,3,'#c04848');px(9,4,1,2,'#c04848');px(8,3,2,2,'#a03838');
    // Venom fangs (gleaming)
    px(6,2,2,3,'#e8e0d0');px(10,2,2,3,'#e8e0d0');
    if(fangSheen){px(6,2,1,1,'#ffffff');px(10,2,1,1,'#ffffff');}
    // Serpent eyes (slit pupils, eerie)
    px(6,1,2,1,'#40a840');px(10,1,2,1,'#40a840');px(7,1,1,1,'#286028');px(11,1,1,1,'#286028');
    // Serpent coiled body
    px(3,4,10,3,'#5a3068');px(4,4,8,2,'#703878');
    px(2,7,12,3,'#5a3068');px(3,7,10,2,'#703878');
    px(4,10,8,3,'#5a3068');px(5,10,6,2,'#703878');
    // Scales pattern
    px(4,5,2,1,'#402050');px(8,5,2,1,'#402050');px(3,8,2,1,'#402050');px(7,8,2,1,'#402050');px(11,8,2,1,'#402050');
    // Venom drip (animated)
    const _vdx=[6,8,5,10,7],_vdy=[12,13,15,14,16];
    g.globalAlpha=0.7;px(_vdx[venomDrip],_vdy[venomDrip],1,2,'#90e060');g.globalAlpha=1;
    g.globalAlpha=0.4;px(_vdx[(venomDrip+2)%5]+1,_vdy[(venomDrip+2)%5]+1,1,1,'#70c040');g.globalAlpha=1;
    // Poison puddle at base
    g.globalAlpha=poisonPulse*0.5;px(4,16,8,2,'#40a030');px(5,17,6,1,'#60c050');g.globalAlpha=1;
  }else if(_cn==='BLINK'){
    // BLINK — Teleport (Here and gone and here, Rare flee)
    // Idle: after-images at 3 positions, flash burst, location swap
    const blinkPh=Math.floor(t/8)%3; // 3 blink positions
    const flashA=0.3+0.4*_sFr08;
    const trailFade=0.15+0.15*_sFr04;
    // Teleport flash aura
    g.globalAlpha=flashA*0.12;px(-1,-1,18,22,'#40c898');g.globalAlpha=1;
    // After-image trails at previous positions (faded)
    const _bposx=[1,13,7],_bposy=[4,8,2]; // 3 positions
    for(let _bi=0;_bi<3;_bi++){
      if(_bi===blinkPh)continue; // skip current position (drawn solid)
      g.globalAlpha=trailFade;
      // Silhouette at past position
      px(_bposx[_bi]+2,_bposy[_bi],4,6,'#48c898');
      px(_bposx[_bi]+3,_bposy[_bi]+6,2,3,'#48c898');
      g.globalAlpha=1;
    }
    // Current position (bright, solid)
    const _cpx=_bposx[blinkPh],_cpy=_bposy[blinkPh];
    // Figure head
    px(_cpx+2,_cpy,4,4,'#50d0a0');px(_cpx+3,_cpy+1,2,2,'#70e8c0');
    // Eyes
    px(_cpx+3,_cpy+1,1,1,'#c0f8e8');px(_cpx+5,_cpy+1,1,1,'#c0f8e8');
    // Body (slim, aerodynamic)
    px(_cpx+1,_cpy+4,6,5,'#40b888');px(_cpx+2,_cpy+4,4,4,'#50c898');
    // Legs
    px(_cpx+2,_cpy+9,2,4,'#40b888');px(_cpx+4,_cpy+9,2,4,'#40b888');
    // Teleport ring (where they just left)
    g.globalAlpha=flashA*0.6;
    const _prv=(blinkPh+2)%3;
    px(_bposx[_prv],_bposy[_prv]+4,8,1,'#48c898');
    px(_bposx[_prv],_bposy[_prv]+4,1,6,'#48c898');px(_bposx[_prv]+7,_bposy[_prv]+4,1,6,'#48c898');
    px(_bposx[_prv],_bposy[_prv]+9,8,1,'#48c898');
    g.globalAlpha=1;
  }else if(_cn==='MIRROR'){
    // MIRROR — Spell Reflect (The face in still water, Rare defense)
    // Idle: reflection ripples, mirror surface shimmers, spell bounces
    const ripple=Math.floor(t/8)%4; // ripple expansion
    const shimmer=0.4+0.3*_sFr04;
    const bouncePos=Math.floor(t/12)%3;
    // Mirror frame (ornate, polished)
    // Outer frame (dark metal)
    px(2,0,12,2,'#606048');px(0,2,2,14,'#606048');px(14,2,2,14,'#606048');px(2,16,12,2,'#606048');
    // Frame corners (decorative)
    px(1,1,2,2,'#788060');px(13,1,2,2,'#788060');px(1,15,2,2,'#788060');px(13,15,2,2,'#788060');
    // Frame highlight
    px(2,0,12,1,'#888870');px(0,2,1,14,'#808868');
    // Mirror surface (pale blue-grey, reflective)
    px(2,2,12,14,'#c8d8e0');px(3,3,10,12,'#d8e8f0');
    // Reflection shimmer
    g.globalAlpha=shimmer*0.5;px(3,3,10,4,'rgba(255,255,255,.4)');g.globalAlpha=1;
    // Ripple rings from center (expanding, 4 phases)
    g.globalAlpha=0.3+shimmer*0.2;
    const _rrw=[2,4,6,8],_rrh=[1,2,3,4];
    const rrw=_rrw[ripple],rrh=_rrh[ripple];
    px(8-rrw/2,9-rrh/2,rrw,1,'#a0b8c8');
    px(8-rrw/2,9+rrh/2,rrw,1,'#a0b8c8');
    px(8-rrw/2,9-rrh/2,1,rrh,'#a0b8c8');
    px(8+rrw/2,9-rrh/2,1,rrh,'#a0b8c8');
    g.globalAlpha=1;
    // Reflected spell (bouncing back)
    const _bsx=[3,8,12],_bsy=[8,5,10];
    g.globalAlpha=0.6;px(_bsx[bouncePos],_bsy[bouncePos],3,2,'#f8e040');g.globalAlpha=1;
    // Mirror sheen diagonal
    g.globalAlpha=shimmer*0.4;px(3,3,5,1,'#ffffff');px(4,4,4,1,'rgba(255,255,255,.6)');g.globalAlpha=1;
  }else if(_cn==='LIFEDRAIN'){
    // LIFEDRAIN — Steal HP (Your health, my health, Rare recovery)
    // Idle: life energy siphon beam, red/orange vitality orb, drain pulse
    const drainPulse=Math.floor(t/6)%4; // drain phase
    const vitaGlow=0.4+0.4*_sFr06;
    const beamPh=0.3+0.4*_sFr04;
    // Dark drain aura
    g.globalAlpha=vitaGlow*0.15;px(-1,-1,18,22,'#602820');g.globalAlpha=1;
    // Victim silhouette (top, fading)
    g.globalAlpha=0.3+drainPulse*0.1;
    // Victim figure (weakening, grey)
    px(9,1,4,4,'#706860');px(10,2,2,2,'#807870');
    px(8,5,6,5,'#585048');px(9,5,4,4,'#605850');
    px(9,10,2,4,'#484038');
    g.globalAlpha=1;
    // Drain beam (connects victim to caster)
    g.globalAlpha=beamPh*0.7;
    px(7,4,3,12,'#c06030');px(8,5,2,10,'#e08040');
    g.globalAlpha=1;
    // Life orb (growing at caster end)
    const orbR=2+drainPulse;
    g.globalAlpha=vitaGlow*0.6;px(6-orbR/2,14,orbR,orbR,'#e07030');g.globalAlpha=1;
    g.globalAlpha=vitaGlow*0.8;px(7,15,2,2,'#f0a060');g.globalAlpha=1;
    // Energy sparks along beam
    const _lix=[7,8,9,7],_liy=[6,8,10,12];
    g.globalAlpha=0.6+vitaGlow*0.2;px(_lix[drainPulse],_liy[drainPulse],2,1,'#f0c070');g.globalAlpha=1;
    // Caster figure (bottom, receiving life)
    px(3,14,6,5,'#a04020');px(4,14,4,4,'#c05030');
    px(4,10,4,4,'#b04828');px(5,11,2,2,'#c05030');
    px(5,8,2,3,'#d06038'); // head
    px(5,8,2,1,'#e07848');px(6,9,1,1,'#f09060'); // face highlight
  }else if(_cn==='FLURRY'){
    // FLURRY — Multi-hit storm of fists (attack r:3, A storm of fists and fury)
    const furyPh=Math.floor(t/4)%4; // rapid punch phase
    const ragePulse=0.4+0.4*_sFr08;
    const trailA=0.2+0.3*_sFr06;
    // Speed trail behind figure
    g.globalAlpha=trailA*0.4;px(1,4,4,10,'#c04820');px(0,5,3,8,'#e06030');g.globalAlpha=1;
    // Body — warrior leaning forward
    px(5,2,4,4,'#c05030'); // head
    px(6,3,2,2,'#d06040');px(6,3,1,1,'#f09060'); // face
    px(4,6,7,5,'#a03828'); // torso
    px(5,7,5,4,'#d06040'); // torso highlight
    px(4,11,3,5,'#a03828');px(7,11,3,5,'#a03828'); // legs
    // Right fist — punching (4-phase)
    const _frx=[10,12,11,9],_fry=[6,5,7,6];
    px(_frx[furyPh],_fry[furyPh],3,2,'#e07848');
    // Left fist — opposite phase
    const _flx=[3,1,2,4],_fly=[7,6,8,7];
    px(_flx[furyPh],_fly[furyPh],3,2,'#e07848');
    // Hit spark on impact frames
    if(furyPh===1||furyPh===3){g.globalAlpha=0.8;px(12,4,2,2,'#ffec60');px(13,5,1,1,'#fff0a0');g.globalAlpha=1;}
    // Speed lines
    g.globalAlpha=ragePulse*0.4;
    px(0,4,4,1,'#f0a060');px(0,6,3,1,'#f0c080');px(0,8,4,1,'#f0a060');px(0,10,3,1,'#f0c080');
    g.globalAlpha=1;
  }else if(_cn==='AEGIS WARD'){
    // AEGIS WARD — Magic barrier shield (defense r:3, Ancient sigil of the sea)
    const wardPulse=0.4+0.4*_sFr04;
    const runePhase=Math.floor(t/8)%6; // rune rotation
    const shimmer=0.3+0.3*_sFr052;
    // Shield aura
    g.globalAlpha=wardPulse*0.12;px(-1,-1,18,22,'#58a8e0');g.globalAlpha=1;
    // Hexagonal shield frame
    px(4,1,8,2,'#3888b8');px(2,3,12,2,'#3888b8');
    px(1,5,14,8,'#58a8e0');px(2,13,12,2,'#3888b8');px(4,15,8,2,'#3888b8');
    // Inner panel
    px(3,4,10,10,'#80c8f8');px(4,5,8,8,'#a0d8ff');
    // Central sea sigil (cross + diamond)
    px(7,5,2,8,'#3888b8');px(4,9,8,2,'#3888b8');
    px(6,7,4,4,'#2070a0');px(7,8,2,2,'#e8f4ff');
    // Rotating rune at 6 positions around shield
    const _rwx=[7,10,11,7,4,4],_rwy=[3,5,9,14,9,5];
    g.globalAlpha=shimmer;px(_rwx[runePhase],_rwy[runePhase],2,2,'#c0e8ff');g.globalAlpha=1;
    // Top/bottom energy edge pulse
    g.globalAlpha=wardPulse*0.4;px(2,1,12,1,'#80d8ff');px(2,17,12,1,'#80d8ff');g.globalAlpha=1;
  }else if(_cn==='WINDASH'){
    // WINDASH — Supersonic flee (flee r:3, Outrun lightning itself)
    const dashPh=Math.floor(t/5)%4;
    const speedA=0.3+0.4*_sFr06;
    const windSwirl=Math.floor(t/8)%3;
    // Ghost trail (previous frame positions)
    g.globalAlpha=0.15;px(0,4,4,10,'#38a878');g.globalAlpha=1;
    g.globalAlpha=0.25;px(2,4,4,10,'#58d0a0');g.globalAlpha=1;
    // Main runner figure (leaning forward)
    px(6,2,4,4,'#38a878'); // head
    px(7,3,2,2,'#58d0a0');px(7,3,1,1,'#80e8b8'); // face
    px(4,6,8,4,'#38a878'); // torso leaning
    px(5,7,6,3,'#58d0a0'); // torso highlight
    // Alternating run legs
    if(dashPh%2===0){px(5,10,2,5,'#38a878');px(8,11,2,4,'#38a878');}
    else{px(5,11,2,4,'#38a878');px(8,10,2,5,'#38a878');}
    // Trailing arm
    const _tax=[2,1,3,2];
    px(_tax[dashPh],7,3,2,'#38a878');
    // Wind streak lines (left side)
    g.globalAlpha=speedA*0.5;
    px(0,5,5,1,'#80e8b8');px(0,7,4,1,'#80e8b8');px(0,9,5,1,'#80e8b8');px(0,11,3,1,'#80e8b8');
    g.globalAlpha=speedA*0.25;
    px(0,6,3,1,'#d0f8ec');px(0,10,4,1,'#d0f8ec');
    g.globalAlpha=1;
    // Swirl vortex trail
    const _swx=[1,0,2],_swy=[12,14,13];
    g.globalAlpha=0.35;px(_swx[windSwirl],_swy[windSwirl],4,2,'#58d0a0');g.globalAlpha=1;
  }else if(_cn==='REJUVEN'){
    // REJUVEN — Full HP recovery (recovery r:3, As if no wound was dealt)
    const healPulse=0.4+0.5*_sFr06;
    const auPh=Math.floor(t/8)%4; // ascending aura phase
    const goldShim=0.3+0.4*_sFr04;
    // Healing aura glow
    g.globalAlpha=healPulse*0.15;px(-1,-1,18,22,'#e8c040');g.globalAlpha=1;
    // Healer figure — robed mage
    px(5,2,6,5,'#b89820'); // hood
    px(6,3,4,3,'#e8c040');px(7,4,2,2,'#f8f8c0'); // face glow
    px(4,7,8,6,'#b89820'); // robe body
    px(5,8,6,5,'#e8c040'); // robe highlight
    px(3,13,10,5,'#b89820'); // robe bottom
    px(4,14,8,4,'#c8a020');
    // Ascending healing cross
    const _chy=4-auPh;
    g.globalAlpha=goldShim;
    px(7,_chy,2,5,'#ffec60');px(5,_chy+2,6,2,'#ffec60');
    g.globalAlpha=1;
    // Rising heal sparks (ascending phase)
    const _hpx=[3,7,11,5],_hpy=[8-auPh*2,6-auPh,9-auPh*2,7-auPh];
    g.globalAlpha=0.5+goldShim*0.3;px(_hpx[auPh],_hpy[auPh],2,2,'#ffffff');g.globalAlpha=1;
    // HP bar filling
    const hpFill=3+auPh*3;
    px(2,16,12,2,'#504030'); // bar bg
    g.globalAlpha=goldShim;px(2,16,hpFill,2,'#e8c040');g.globalAlpha=1;
    px(2,16,hpFill,1,'#fff8a0');
  }else if(_cn==='WARD'){
    // WARD — Next-dmg:0 protection (recovery r:3, Set a watch on the body)
    const wardGlow=0.4+0.4*_sFr04;
    const runeRot=Math.floor(t/10)%4; // slow corner rune rotation
    const shieldPulse=Math.floor(t/8)%3;
    // Figure with ward overlay
    px(5,2,5,5,'#b0a038'); // head
    px(6,3,3,3,'#e0c858');px(7,4,2,2,'#f8e078'); // face
    px(4,7,8,6,'#b0a038'); // body
    px(5,8,6,5,'#d4b840'); // highlight
    px(4,13,4,5,'#b0a038');px(8,13,4,5,'#b0a038'); // legs
    // Ward border (protective ring)
    g.globalAlpha=wardGlow*0.5;
    px(1,1,14,1,'#f8e078');px(1,17,14,1,'#f8e078');
    px(1,1,1,17,'#f8e078');px(14,1,1,17,'#f8e078');
    g.globalAlpha=1;
    // Shield aura fill
    g.globalAlpha=wardGlow*0.1;px(1,1,14,17,'#e0c858');g.globalAlpha=1;
    // Corner rune glyphs (slow rotation)
    const _rcx=[1,13,13,1],_rcy=[1,1,16,16];
    g.globalAlpha=wardGlow;px(_rcx[runeRot],_rcy[runeRot],2,2,'#ffffff');g.globalAlpha=1;
    // Central ward glyph (shield diamond)
    px(7,6,2,7,'#e0c858');px(5,9,6,2,'#e0c858');px(7,7,2,5,'#f8e078');
    // Expanding pulse ring
    const _pw=10-shieldPulse*2,_px2=3+shieldPulse,_py2=4+shieldPulse;
    g.globalAlpha=wardGlow*(0.4-shieldPulse*0.1);px(_px2,_py2,_pw,1,'#f8e078');px(_px2,_py2+8+shieldPulse*2,_pw,1,'#f8e078');g.globalAlpha=1;
  }

  // Generic renderer for all other cards (type-based pixel art)
  if(_cn==='AEGIS'||_cn==='UMBRA'||_cn==='IGNIS'||_cn==='TEMPEST'||_cn==='NIHIL'||
     _cn==='VOIDBLADE'||_cn==='TITAN'||_cn==='GENESIS'||_cn==='SINGULARITY'||_cn==='ARK BLESS'||
     _cn==='SANCTUARY'||_cn==='GEN PULSE'||_cn==='REAPER'||_cn==='ARK GATE'||
     _cn==='PHOENIX'||_cn==='PHANTOM'||_cn==='GRAVITY'||
     _cn==='CRYSTAL'||_cn==='MAELSTROM'||_cn==='ELIXIR'||
     _cn==='NULLIFY'||_cn==='VOIDSTEP'||_cn==='HOLY LIGHT'||
     _cn==='INFERNO'||_cn==='BLIZZARD'||_cn==='BERSERK'||_cn==='FORTRESS'||_cn==='SHADOW'||
     _cn==='THUNDER'||_cn==='VENOM'||_cn==='BLINK'||_cn==='MIRROR'||_cn==='LIFEDRAIN'||
     _cn==='FLURRY'||_cn==='AEGIS WARD'||_cn==='WINDASH'||_cn==='REJUVEN'||_cn==='WARD'){
    // named sprites already drawn above — fall through to sparkle/reveal below
  } else {
    const cr=CD[cardId-1];if(!cr)return;
    const type=cr.t||'attack';const rar=cr.r||1;
    const bob=_sFr05*1.5; // v389: cached
    const _cIdx=cardId%60;
    const glow=0.15+0.2*(_sFr04*_IDX_CI[_cIdx]+_cFr04*_IDX_SI[_cIdx]); // v389: sin-addition
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
      const orb=0.3+0.3*(_sFr06*_IDX_CI[_cIdx]+_cFr06*_IDX_SI[_cIdx]); // v389: sin-addition
      px(4,11+bob,8,6,cr.d);px(5,11+bob,6,5,cr.c);px(6,12+bob,4,3,cr.h);
      px(7,13+bob,2,1,_rw(orb));
      if(rar>=3){px(5,11+bob,6,2,'rgba(255,255,255,0.3)');}
    }else{
      // Recovery: cross / leaf
      px(7,2+bob,2,12,cr.c);px(3,6+bob,10,2,cr.c);
      px(7,2+bob,2,4,cr.h);px(3,6+bob,4,1,cr.h);
      if(rar>=3){const hg=0.2+0.3*(_sFr05*_IDX_CI[_cIdx]+_cFr05*_IDX_SI[_cIdx]);px(5,4+bob,6,6,_rw(hg));} // v389
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
  const pulse=0.5+0.5*_sFr07; // v389: cached

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
    const sc='#ffffff';
    // v389: use cached frame sin values and pre-baked phase constants
    if(_sFr12>0.5){bx(cx_,cy_,2,2,sc);bx(cx_+cw-2,cy_,2,2,sc);}
    const _sp08=_sFr12*0.6967+_cFr12*0.7174; // sin(fr*0.12+0.8): cos(0.8)≈0.6967, sin(0.8)≈0.7174
    if(_sp08>0.5){bx(cx_,cy_+ch-2,2,2,sc);bx(cx_+cw-2,cy_+ch-2,2,2,sc);}
    const _sp16=_sFr12*(-0.0292)+_cFr12*0.9996; // sin(fr*0.12+1.6): cos(1.6)≈-0.0292, sin(1.6)≈0.9996
    if(_sp16>0.7){bx(cx_+Math.floor(cw/2),cy_,1,2,sc);bx(cx_,cy_+Math.floor(ch/2),2,1,sc);}
    // Tiny rune cross sparkles
    if(_sFr08>0.3){
      g.globalAlpha=_sFr08*0.7;
      bx(cx_-3,cy_+Math.floor(ch/2),6,1,ARK.rune);bx(cx_+Math.floor(cw/2)-1,cy_-3,1,6,ARK.rune);
      g.globalAlpha=1;
    }
  }else if(rar>=4){
    // Epic: subtle gold glow
    const pulse=0.2+_sFr06*0.15; // v389: cached
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
  fogParticles.push({x:Math.random()*MW*TW,y:Math.random()*MH*TH,vx:0.1+Math.random()*0.15,vy:-0.05+Math.random()*0.1,phase,sinPh:Math.sin(phase),cosPh:Math.cos(phase),
    sinIPh:Math.sin(i*0.7),cosIPh:Math.cos(i*0.7), // v355: pre-baked for sin(fr*0.02+i*0.7) pattern
    life:Math.random()});
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
