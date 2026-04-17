import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Card Data ────────────────────────────────────────────────────────────────
const CD = [
  // ATTACK (1-12)
  {n:'AEGIS',      t:'attack',   r:5, c:'#e86040', f:'Steal x2',      fl:'Shield of the last captain'},
  {n:'UMBRA',      t:'attack',   r:4, c:'#7858a0', f:'Invis 1T',      fl:'The shadow that sails with no ship'},
  {n:'IGNIS',      t:'attack',   r:3, c:'#d85840', f:'Burn card',      fl:'Fire that never drowns'},
  {n:'STRIKE',     t:'attack',   r:1, c:'#c04830', f:'Deal 1 dmg',     fl:'The simplest blow still cuts'},
  {n:'SLASH',      t:'attack',   r:1, c:'#b84030', f:'Quick atk',      fl:'Faster than a shadow at noon'},
  {n:'IMPALE',     t:'attack',   r:2, c:'#c05038', f:'Pierce',         fl:'No armor stops this'},
  {n:'CRUSH',      t:'attack',   r:2, c:'#b84828', f:'Break guard',    fl:'Force bends all things'},
  {n:'FLURRY',     t:'attack',   r:3, c:'#d06040', f:'Multi-hit',      fl:'A storm of fists and fury'},
  {n:'BERSERK',    t:'attack',   r:3, c:'#e05030', f:'Rage atk',       fl:'No mind, only red'},
  {n:'VENOM',      t:'attack',   r:3, c:'#984868', f:'Poison',         fl:'Death on the blade tip'},
  {n:'REAPER',     t:'attack',   r:4, c:'#786098', f:'Lifedrain',      fl:'The void collects its due'},
  {n:'VOIDBLADE',  t:'attack',   r:5, c:'#504078', f:'Reality cut',    fl:'Cuts what cannot be cut'},
  // DEFENSE (13-24)
  {n:'GUARD',      t:'defense',  r:1, c:'#4898d8', f:'Block 1',        fl:"The first lesson: don't get hit"},
  {n:'PARRY',      t:'defense',  r:1, c:'#4090c8', f:'Deflect',        fl:'Let their strength become yours'},
  {n:'IRON WALL',  t:'defense',  r:2, c:'#5090c8', f:'Block 2',        fl:'An immovable thing'},
  {n:'COUNTER',    t:'defense',  r:2, c:'#4898c8', f:'Reflect dmg',    fl:'Give back what was given'},
  {n:'AEGIS WARD', t:'defense',  r:3, c:'#58a8e0', f:'Magic barrier',  fl:'Ancient sigil of the sea'},
  {n:'MIRROR',     t:'defense',  r:3, c:'#60b0e8', f:'Spell reflect',  fl:'The face in still water'},
  {n:'FORTRESS',   t:'defense',  r:3, c:'#4888c0', f:'Immovable',      fl:'Stone does not care'},
  {n:'CRYSTAL',    t:'defense',  r:4, c:'#70c0f0', f:'Unbreakable',    fl:'Light passes through, harm does not'},
  {n:'NULLIFY',    t:'defense',  r:4, c:'#5898d0', f:'Cancel atk',     fl:'As if it never happened'},
  {n:'ABS GUARD',  t:'defense',  r:4, c:'#60a8e0', f:'Negate all',     fl:'Beyond perfect'},
  {n:'SANCTUARY',  t:'defense',  r:5, c:'#80c8f0', f:'Invincible',     fl:'Where gods refuse to tread'},
  {n:'TITAN',      t:'defense',  r:5, c:'#88b8e8', f:'Shield all',     fl:'Born from the deep earth'},
  // FLEE (25-36)
  {n:'DASH',       t:'flee',     r:1, c:'#38b878', f:'Quick exit',     fl:'Leave your shadow behind'},
  {n:'RETREAT',    t:'flee',     r:1, c:'#30b070', f:'Safe exit',      fl:'Wisdom knows when to run'},
  {n:'SMOKE',      t:'flee',     r:2, c:'#909898', f:'Blind foe',      fl:"What you can't see can still run"},
  {n:'PHASE',      t:'flee',     r:2, c:'#40c090', f:'Walk walls',     fl:'The void between the waves'},
  {n:'BLINK',      t:'flee',     r:3, c:'#48c898', f:'Teleport',       fl:'Here and gone and here'},
  {n:'SHADOW',     t:'flee',     r:3, c:'#506880', f:'Invisible',      fl:'Even hunters fear the dark'},
  {n:'WINDASH',    t:'flee',     r:3, c:'#58d0a0', f:'Supersonic',     fl:'Outrun lightning itself'},
  {n:'PHANTOM',    t:'flee',     r:4, c:'#60a890', f:'Ghost mode',     fl:'Between the living world'},
  {n:'VOIDSTEP',   t:'flee',     r:4, c:'#486878', f:'Dim-hop',        fl:'One foot in another world'},
  {n:'TIMESKIP',   t:'flee',     r:4, c:'#70b8c0', f:'Pause time',     fl:'The clock obeys no one'},
  {n:'ARK GATE',   t:'flee',     r:5, c:'#78c8d0', f:'Instant esc',    fl:'The door was always there'},
  {n:'GENESIS',    t:'flee',     r:5, c:'#90d0e0', f:'Rewind self',    fl:'Begin again from the start'},
  // MAGIC (37-48)
  {n:'TEMPEST',    t:'magic',    r:5, c:'#d8b028', f:'No barrier',     fl:'The storm answers to no flag'},
  {n:'NIHIL',      t:'magic',    r:4, c:'#9868d0', f:'Copy card',      fl:'What is nothing can be all things'},
  {n:'SPARK',      t:'magic',    r:1, c:'#c0b030', f:'1 magic dmg',    fl:'Seed of the thundercloud'},
  {n:'FROST',      t:'magic',    r:1, c:'#90c8d8', f:'Slow foe',       fl:'Cold has patience'},
  {n:'BLAZE',      t:'magic',    r:2, c:'#d89028', f:'Fire dmg',       fl:'The first element, oldest anger'},
  {n:'STATIC',     t:'magic',    r:2, c:'#c8b840', f:'Stun 1T',        fl:'The air before a strike'},
  {n:'INFERNO',    t:'magic',    r:3, c:'#e09820', f:'Area fire',      fl:'The ocean does not stop it'},
  {n:'BLIZZARD',   t:'magic',    r:3, c:'#a0d0e8', f:'Freeze area',    fl:'Even memories freeze in it'},
  {n:'THUNDER',    t:'magic',    r:3, c:'#d8c030', f:'Chain bolt',     fl:'One strike, many wounds'},
  {n:'MAELSTROM',  t:'magic',    r:4, c:'#5090c8', f:'Water vortex',   fl:'Drawn into the deep'},
  {n:'GRAVITY',    t:'magic',    r:4, c:'#806890', f:'Crush force',    fl:'Even light bends'},
  {n:'SINGULARITY',t:'magic',    r:5, c:'#302848', f:'Black hole',     fl:'Everything falls inward'},
  // RECOVERY (49-60)
  {n:'MEND',       t:'recovery', r:1, c:'#e0b030', f:'Heal 1 HP',      fl:'Small acts of repair'},
  {n:'REST',       t:'recovery', r:1, c:'#d8a828', f:'Restore SP',     fl:'The body knows what it needs'},
  {n:'POTION',     t:'recovery', r:2, c:'#e0b838', f:'Restore HP',     fl:'Old recipe, still works'},
  {n:'BANDAGE',    t:'recovery', r:2, c:'#d8c070', f:'Stop bleed',     fl:'Simple, but it saves lives'},
  {n:'REJUVEN',    t:'recovery', r:3, c:'#e8c040', f:'Full HP',        fl:'As if no wound was dealt'},
  {n:'WARD',       t:'recovery', r:3, c:'#e0c858', f:'Next-dmg:0',     fl:'Set a watch on the body'},
  {n:'LIFEDRAIN',  t:'recovery', r:3, c:'#c07850', f:'Steal HP',       fl:'Your health, my health'},
  {n:'PHOENIX',    t:'recovery', r:4, c:'#e88030', f:'Revive once',    fl:'The ash is just the beginning'},
  {n:'ELIXIR',     t:'recovery', r:4, c:'#f0c040', f:'Cure all',       fl:'What alchemists dreamed of'},
  {n:'HOLY LIGHT', t:'recovery', r:4, c:'#f0d860', f:'Heal+purify',    fl:'Light that cleans as well as heals'},
  {n:'GEN PULSE',  t:'recovery', r:5, c:'#f8e070', f:'Restore all',    fl:'From the source of all things'},
  {n:'ARK BLESS',  t:'recovery', r:5, c:'#fff0a0', f:'Ultimate heal',  fl:"The ARK's final gift"},
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const RARITY_NAMES = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const TYPE_ICONS = { attack: '⚔', defense: '◆', flee: '●', magic: '★', recovery: '◎' };
const TYPE_CAPS = { attack: 'Attack', defense: 'Defense', flee: 'Flee', magic: 'Magic', recovery: 'Recovery' };

const pad3 = (n) => String(n).padStart(3, '0');

// Parse hex color to rgb components
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Darken a hex color
function darken(hex, factor = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// Lighten a hex color
function lighten(hex, factor = 1.5) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r * factor))},${Math.min(255, Math.round(g * factor))},${Math.min(255, Math.round(b * factor))})`;
}

// Add alpha to hex
function hexAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Rarity Glow / Border ─────────────────────────────────────────────────────
function rarityBorderDef(r, id) {
  switch (r) {
    case 1: return { stroke: '#888888', filter: '', animDef: '' };
    case 2: return { stroke: '#4488ff', filter: `filter: drop-shadow(0 0 4px #4488ff88);`, animDef: '' };
    case 3: return { stroke: '#aa44ff', filter: `filter: drop-shadow(0 0 6px #aa44ffaa);`, animDef: '' };
    case 4: return { stroke: '#ffcc00', filter: `filter: drop-shadow(0 0 8px #ffcc0099);`, animDef: '' };
    case 5: return {
      stroke: `url(#rainbowGrad${id})`,
      filter: '',
      animDef: `
    <linearGradient id="rainbowGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#ff0080"/>
      <stop offset="20%"  stop-color="#ff8800"/>
      <stop offset="40%"  stop-color="#ffee00"/>
      <stop offset="60%"  stop-color="#00ff88"/>
      <stop offset="80%"  stop-color="#0088ff"/>
      <stop offset="100%" stop-color="#ff00ff"/>
      <animateTransform attributeName="gradientTransform" type="rotate"
        values="0 200 280; 360 200 280" dur="3s" repeatCount="indefinite"/>
    </linearGradient>`,
    };
  }
}

// ── Type-specific geometric art (unique per card) ─────────────────────────────
function attackArt(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.4);
  const cLight = lighten(c, 1.6);
  const seed = id * 137.508;

  // Warrior/weapon silhouette — varies per specific attack card
  const variants = [
    // AEGIS (id=1): Great shield + sword
    `<g opacity="0.95">
      <ellipse cx="200" cy="200" rx="55" ry="65" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="175" y="140" width="50" height="18" rx="4" fill="${c}"/>
      <polygon points="185,260 215,260 210,320 190,320" fill="${c}" opacity="0.9"/>
      <line x1="200" y1="180" x2="200" y2="130" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <polygon points="200,100 207,125 200,130 193,125" fill="${cLight}"/>
      <ellipse cx="200" cy="200" rx="35" ry="42" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <line x1="178" y1="200" x2="222" y2="200" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
    </g>`,
    // UMBRA (id=2): Shadow assassin with twin daggers
    `<g opacity="0.9">
      <ellipse cx="200" cy="165" rx="22" ry="26" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="188" y="191" width="24" height="60" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1"/>
      <polygon points="170,210 185,200 185,280 165,290" fill="${c}" opacity="0.8"/>
      <polygon points="230,210 215,200 215,280 235,290" fill="${c}" opacity="0.8"/>
      <line x1="155" y1="195" x2="180" y2="215" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="245" y1="195" x2="220" y2="215" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="200" cy="165" rx="12" ry="14" fill="${c}" opacity="0.3"/>
    </g>`,
    // IGNIS (id=3): Fire mage with flame hands
    `<g opacity="0.95">
      <ellipse cx="200" cy="165" rx="20" ry="23" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="190" y="188" width="20" height="55" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <ellipse cx="170" cy="235" rx="18" ry="22" fill="${c}" opacity="0.7"/>
      <ellipse cx="230" cy="235" rx="18" ry="22" fill="${c}" opacity="0.7"/>
      <ellipse cx="170" cy="235" rx="10" ry="13" fill="${cLight}" opacity="0.6"/>
      <ellipse cx="230" cy="235" rx="10" ry="13" fill="${cLight}" opacity="0.6"/>
      <path d="M170,213 Q160,200 170,190 Q175,210 170,213Z" fill="${cLight}"/>
      <path d="M230,213 Q240,200 230,190 Q225,210 230,213Z" fill="${cLight}"/>
    </g>`,
    // STRIKE (id=4): Punching fist
    `<g opacity="0.95">
      <rect x="180" y="180" width="60" height="45" rx="8" fill="${c}"/>
      <rect x="185" y="165" width="12" height="22" rx="4" fill="${c}"/>
      <rect x="200" y="160" width="12" height="25" rx="4" fill="${c}"/>
      <rect x="215" y="165" width="12" height="22" rx="4" fill="${c}"/>
      <rect x="168" y="195" width="18" height="22" rx="5" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <line x1="140" y1="202" x2="178" y2="202" stroke="${cLight}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      <line x1="135" y1="210" x2="178" y2="208" stroke="${cLight}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    </g>`,
    // SLASH (id=5): Curved sword in motion
    `<g opacity="0.95">
      <path d="M155,300 L175,160 L195,155 L200,165 L185,170 L165,300Z" fill="${c}"/>
      <path d="M195,155 L250,130 L248,145 L200,165Z" fill="${cLight}"/>
      <path d="M155,300 Q200,340 245,300" stroke="${cLight}" stroke-width="2" fill="none" opacity="0.5"/>
      <circle cx="195" cy="155" r="8" fill="${cDark}" stroke="${c}" stroke-width="2"/>
    </g>`,
    // IMPALE (id=6): Spear thrust
    `<g opacity="0.95">
      <rect x="195" y="100" width="10" height="230" rx="3" fill="${c}"/>
      <polygon points="200,85 213,115 187,115" fill="${cLight}"/>
      <rect x="185" y="200" width="30" height="8" rx="2" fill="${cDark}" stroke="${cLight}" stroke-width="1"/>
      <circle cx="200" cy="240" r="6" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
    </g>`,
    // CRUSH (id=7): Warhammer
    `<g opacity="0.95">
      <rect x="197" y="130" width="6" height="190" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1"/>
      <rect x="165" y="120" width="70" height="50" rx="5" fill="${c}"/>
      <rect x="168" y="123" width="64" height="44" rx="3" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <line x1="200" y1="120" x2="200" y2="110" stroke="${cLight}" stroke-width="3"/>
    </g>`,
    // FLURRY (id=8): Multiple blade trails
    `<g opacity="0.9">
      <line x1="140" y1="180" x2="260" y2="220" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
      <line x1="140" y1="200" x2="260" y2="240" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
      <line x1="140" y1="220" x2="260" y2="260" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <line x1="140" y1="160" x2="260" y2="200" stroke="${cLight}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <circle cx="145" cy="200" r="15" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="255" cy="230" r="8" fill="${c}" opacity="0.6"/>
    </g>`,
    // BERSERK (id=9): Raging warrior with axe
    `<g opacity="0.95">
      <ellipse cx="200" cy="158" rx="22" ry="25" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="189" y="183" width="22" height="65" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <path d="M230,130 Q260,140 255,170 Q240,175 225,165 Q235,155 230,130Z" fill="${c}"/>
      <path d="M170,130 Q140,140 145,170 Q160,175 175,165 Q165,155 170,130Z" fill="${c}"/>
      <line x1="200" y1="248" x2="185" y2="295" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <line x1="200" y1="248" x2="215" y2="295" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
    </g>`,
    // VENOM (id=10): Serpent coiled around a dagger
    `<g opacity="0.95">
      <path d="M200,120 Q220,140 215,160 Q205,165 200,180 Q195,165 185,160 Q180,140 200,120Z" fill="${c}"/>
      <path d="M200,180 Q220,200 215,230 Q200,250 185,230 Q180,200 200,180Z" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <path d="M200,120 Q260,150 250,200 Q240,230 200,240 Q160,230 150,200 Q140,150 200,120Z"
            fill="none" stroke="${c}" stroke-width="2.5" opacity="0.6"/>
      <ellipse cx="200" cy="118" rx="10" ry="7" fill="${cLight}"/>
      <line x1="195" y1="111" x2="193" y2="106" stroke="${cLight}" stroke-width="2"/>
      <line x1="205" y1="111" x2="207" y2="106" stroke="${cLight}" stroke-width="2"/>
    </g>`,
    // REAPER (id=11): Scythe wielder
    `<g opacity="0.95">
      <ellipse cx="200" cy="160" rx="20" ry="22" fill="${cDark}" stroke="${c}" stroke-width="1.5" opacity="0.8"/>
      <line x1="210" y1="175" x2="230" y2="310" stroke="${cDark}" stroke-width="6" stroke-linecap="round"/>
      <path d="M230,160 Q285,130 280,200 Q265,220 230,210 Q245,190 230,160Z" fill="${c}"/>
      <line x1="230" y1="210" x2="210" y2="200" stroke="${cLight}" stroke-width="2"/>
      <path d="M180,280 Q200,310 220,280" stroke="${c}" stroke-width="2" fill="none" opacity="0.5"/>
    </g>`,
    // VOIDBLADE (id=12): Ethereal black sword emanating void cracks
    `<g opacity="0.95">
      <rect x="196" y="100" width="8" height="220" rx="2" fill="${cDark}"/>
      <polygon points="200,85 210,110 190,110" fill="${c}"/>
      <line x1="200" y1="120" x2="200" y2="320" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <line x1="200" y1="150" x2="165" y2="185" stroke="${c}" stroke-width="2" opacity="0.7"/>
      <line x1="200" y1="180" x2="245" y2="205" stroke="${c}" stroke-width="2" opacity="0.7"/>
      <line x1="200" y1="220" x2="160" y2="250" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
      <line x1="200" y1="260" x2="240" y2="280" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
      <circle cx="200" cy="200" r="40" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.3"/>
    </g>`,
  ];
  return variants[id - 1] || variants[0];
}

function defenseArt(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.3);
  const cLight = lighten(c, 1.8);
  const idx = (id - 13);

  const variants = [
    // GUARD (13): Simple kite shield
    `<g opacity="0.95">
      <path d="M145,150 L255,150 L255,240 Q255,290 200,320 Q145,290 145,240Z" fill="${cDark}" stroke="${c}" stroke-width="3"/>
      <path d="M155,158 L245,158 L245,238 Q245,282 200,308 Q155,282 155,238Z" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <line x1="200" y1="150" x2="200" y2="320" stroke="${c}" stroke-width="2" opacity="0.4"/>
      <line x1="145" y1="235" x2="255" y2="235" stroke="${c}" stroke-width="2" opacity="0.4"/>
    </g>`,
    // PARRY (14): Buckler with deflection lines
    `<g opacity="0.95">
      <circle cx="200" cy="220" r="65" fill="${cDark}" stroke="${c}" stroke-width="3"/>
      <circle cx="200" cy="220" r="50" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <circle cx="200" cy="220" r="15" fill="${c}" opacity="0.8"/>
      <line x1="265" y1="155" x2="240" y2="190" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="270" y1="170" x2="248" y2="198" stroke="${cLight}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </g>`,
    // IRON WALL (15): Wall of metal plates
    `<g opacity="0.95">
      <rect x="145" y="155" width="110" height="155" rx="4" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <rect x="148" y="158" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="202" y="158" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="148" y="193" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="202" y="193" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="148" y="228" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="202" y="228" width="50" height="30" rx="2" fill="${c}" opacity="0.3"/>
      <rect x="148" y="263" width="104" height="44" rx="2" fill="${c}" opacity="0.3"/>
      <line x1="145" y1="175" x2="255" y2="175" stroke="${cLight}" stroke-width="0.5" opacity="0.3"/>
    </g>`,
    // COUNTER (16): Shield with arrow redirect
    `<g opacity="0.95">
      <path d="M155,160 L245,160 L245,250 Q245,290 200,315 Q155,290 155,250Z" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <path d="M250,180 L280,200 L250,220" fill="none" stroke="${cLight}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M120,200 L248,200" stroke="${cLight}" stroke-width="2.5" stroke-dasharray="8,4"/>
      <circle cx="200" cy="235" r="20" fill="none" stroke="${cLight}" stroke-width="2" opacity="0.7"/>
    </g>`,
    // AEGIS WARD (17): Hexagonal magic shield
    `<g opacity="0.95">
      <polygon points="200,145 250,173 250,227 200,255 150,227 150,173" fill="${cDark}" stroke="${c}" stroke-width="3"/>
      <polygon points="200,160 238,182 238,222 200,244 162,222 162,182" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <circle cx="200" cy="200" r="22" fill="${c}" opacity="0.5"/>
      <text x="200" y="208" text-anchor="middle" font-size="24" fill="${cLight}" opacity="0.8">⬡</text>
      <line x1="200" y1="145" x2="200" y2="125" stroke="${cLight}" stroke-width="2" opacity="0.5"/>
      <line x1="250" y1="173" x2="268" y2="163" stroke="${cLight}" stroke-width="2" opacity="0.5"/>
    </g>`,
    // MIRROR (18): Reflective oval with shimmer
    `<g opacity="0.95">
      <ellipse cx="200" cy="215" rx="60" ry="80" fill="${cDark}" stroke="${c}" stroke-width="3"/>
      <ellipse cx="200" cy="215" rx="50" ry="68" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <ellipse cx="183" cy="190" rx="12" ry="25" fill="${cLight}" opacity="0.15" transform="rotate(-15,183,190)"/>
      <line x1="200" y1="135" x2="200" y2="295" stroke="${cLight}" stroke-width="0.5" opacity="0.3"/>
      <ellipse cx="200" cy="215" rx="30" ry="40" fill="none" stroke="${c}" stroke-width="1" opacity="0.3"/>
    </g>`,
    // FORTRESS (19): Castle tower silhouette
    `<g opacity="0.95">
      <rect x="165" y="195" width="70" height="115" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="155" y="165" width="90" height="40" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="155" y="155" width="16" height="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="192" y="155" width="16" height="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="229" y="155" width="16" height="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="185" y="255" width="30" height="55" fill="${c}" opacity="0.4"/>
      <rect x="155" y="175" width="90" height="8" fill="${cLight}" opacity="0.2"/>
    </g>`,
    // CRYSTAL (20): Geometric crystal formation
    `<g opacity="0.95">
      <polygon points="200,130 225,180 220,260 200,290 180,260 175,180" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <polygon points="200,130 225,180 200,175" fill="${cLight}" opacity="0.4"/>
      <polygon points="200,175 225,180 220,260 200,250" fill="${c}" opacity="0.3"/>
      <polygon points="200,175 175,180 180,260 200,250" fill="${cLight}" opacity="0.2"/>
      <line x1="200" y1="130" x2="200" y2="290" stroke="${cLight}" stroke-width="1" opacity="0.5"/>
    </g>`,
    // NULLIFY (21): X-cross cancellation sigil
    `<g opacity="0.95">
      <circle cx="200" cy="215" r="68" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <circle cx="200" cy="215" r="55" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <line x1="155" y1="170" x2="245" y2="260" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="245" y1="170" x2="155" y2="260" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="200" cy="215" r="20" fill="none" stroke="${cLight}" stroke-width="2" opacity="0.6"/>
    </g>`,
    // ABS GUARD (22): Double-layered barrier
    `<g opacity="0.95">
      <ellipse cx="200" cy="215" rx="70" ry="80" fill="${cDark}" stroke="${c}" stroke-width="3"/>
      <ellipse cx="200" cy="215" rx="58" ry="65" fill="none" stroke="${cLight}" stroke-width="2" opacity="0.6"/>
      <ellipse cx="200" cy="215" rx="42" ry="48" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
      <ellipse cx="200" cy="215" rx="22" ry="25" fill="${c}" opacity="0.4"/>
      <line x1="200" y1="135" x2="200" y2="295" stroke="${cLight}" stroke-width="0.5" opacity="0.25"/>
      <line x1="130" y1="215" x2="270" y2="215" stroke="${cLight}" stroke-width="0.5" opacity="0.25"/>
    </g>`,
    // SANCTUARY (23): Divine arch and light rays
    `<g opacity="0.95">
      <path d="M150,310 L150,200 Q150,145 200,145 Q250,145 250,200 L250,310Z" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <path d="M163,310 L163,205 Q163,158 200,158 Q237,158 237,205 L237,310Z" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <line x1="200" y1="145" x2="200" y2="100" stroke="${cLight}" stroke-width="3" opacity="0.6"/>
      <line x1="200" y1="115" x2="175" y2="140" stroke="${cLight}" stroke-width="1.5" opacity="0.4"/>
      <line x1="200" y1="115" x2="225" y2="140" stroke="${cLight}" stroke-width="1.5" opacity="0.4"/>
      <circle cx="200" cy="220" r="25" fill="${c}" opacity="0.35"/>
    </g>`,
    // TITAN (24): Colossus figure with broad shoulders
    `<g opacity="0.95">
      <ellipse cx="200" cy="152" rx="28" ry="30" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="160" y="182" width="80" height="85" rx="5" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="128" y="185" width="35" height="65" rx="4" fill="${c}" opacity="0.7"/>
      <rect x="237" y="185" width="35" height="65" rx="4" fill="${c}" opacity="0.7"/>
      <rect x="172" y="267" width="25" height="50" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="203" y="267" width="25" height="50" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="148" y="190" width="32" height="10" rx="2" fill="${cLight}" opacity="0.3"/>
      <rect x="220" y="190" width="32" height="10" rx="2" fill="${cLight}" opacity="0.3"/>
    </g>`,
  ];
  return variants[idx] || variants[0];
}

function fleeArt(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.3);
  const cLight = lighten(c, 1.8);
  const idx = id - 25;

  const variants = [
    // DASH (25): Runner leaning forward
    `<g opacity="0.9">
      <ellipse cx="218" cy="158" rx="20" ry="22" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="207" y="180" width="18" height="55" rx="4" fill="${cDark}" stroke="${c}" stroke-width="1.5" transform="rotate(8,216,207)"/>
      <line x1="215" y1="235" x2="190" y2="295" stroke="${c}" stroke-width="7" stroke-linecap="round"/>
      <line x1="225" y1="235" x2="250" y2="295" stroke="${c}" stroke-width="7" stroke-linecap="round"/>
      <line x1="195" y1="207" x2="160" y2="235" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="225" y1="207" x2="255" y2="225" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="130" y1="220" x2="200" y2="220" stroke="${cLight}" stroke-width="2" stroke-dasharray="10,5" opacity="0.6"/>
      <line x1="130" y1="235" x2="195" y2="235" stroke="${cLight}" stroke-width="1.5" stroke-dasharray="8,5" opacity="0.4"/>
    </g>`,
    // RETREAT (26): Running figure moving away
    `<g opacity="0.9">
      <ellipse cx="185" cy="165" rx="18" ry="20" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="175" y="185" width="16" height="50" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5" transform="rotate(-5,183,210)"/>
      <line x1="183" y1="235" x2="162" y2="295" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="191" y1="235" x2="212" y2="295" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="183" y1="205" x2="155" y2="230" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <line x1="191" y1="205" x2="215" y2="220" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <path d="M215,200 Q235,195 245,205 Q235,210 220,208Z" fill="${cLight}" opacity="0.5"/>
      <path d="M215,215 Q240,210 252,220 Q240,224 218,222Z" fill="${cLight}" opacity="0.3"/>
    </g>`,
    // SMOKE (27): Smoke cloud billowing
    `<g opacity="0.85">
      <ellipse cx="180" cy="210" rx="38" ry="32" fill="${c}" opacity="0.6"/>
      <ellipse cx="215" cy="195" rx="35" ry="28" fill="${c}" opacity="0.55"/>
      <ellipse cx="245" cy="215" rx="28" ry="25" fill="${c}" opacity="0.5"/>
      <ellipse cx="195" cy="240" rx="30" ry="22" fill="${c}" opacity="0.45"/>
      <ellipse cx="225" cy="242" rx="25" ry="20" fill="${c}" opacity="0.4"/>
      <ellipse cx="200" cy="215" rx="50" ry="42" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.3"/>
      <ellipse cx="195" cy="200" rx="15" ry="12" fill="${cLight}" opacity="0.15"/>
    </g>`,
    // PHASE (28): Figure half-phased through a wall
    `<g opacity="0.9">
      <rect x="195" y="140" width="8" height="180" fill="${cDark}" stroke="${c}" stroke-width="1" opacity="0.8"/>
      <ellipse cx="175" cy="185" rx="16" ry="18" fill="${cDark}" stroke="${c}" stroke-width="1.5" opacity="0.9"/>
      <rect x="165" y="203" width="14" height="45" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5" opacity="0.9"/>
      <line x1="172" y1="248" x2="158" y2="295" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <line x1="179" y1="248" x2="193" y2="295" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
      <ellipse cx="225" cy="185" rx="16" ry="18" fill="${c}" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <rect x="215" y="203" width="14" height="45" rx="3" fill="${c}" opacity="0.35"/>
      <line x1="222" y1="248" x2="210" y2="295" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.3"/>
    </g>`,
    // BLINK (29): Afterimage trail
    `<g opacity="0.9">
      <ellipse cx="240" cy="168" rx="18" ry="20" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="230" y="188" width="16" height="48" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <line x1="238" y1="236" x2="222" y2="290" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="246" y1="236" x2="262" y2="290" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="200" cy="168" rx="18" ry="20" fill="${c}" opacity="0.4"/>
      <rect x="190" y="188" width="16" height="48" rx="3" fill="${c}" opacity="0.35"/>
      <ellipse cx="163" cy="168" rx="18" ry="20" fill="${c}" opacity="0.2"/>
      <rect x="153" y="188" width="16" height="48" rx="3" fill="${c}" opacity="0.15"/>
      <path d="M163,168 L240,168" stroke="${cLight}" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.5"/>
    </g>`,
    // SHADOW (30): Shadow silhouette on ground
    `<g opacity="0.9">
      <ellipse cx="200" cy="215" rx="65" ry="25" fill="${c}" opacity="0.3"/>
      <ellipse cx="200" cy="168" rx="18" ry="20" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="190" y="188" width="16" height="50" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <line x1="197" y1="238" x2="182" y2="295" stroke="${cDark}" stroke-width="6" stroke-linecap="round"/>
      <line x1="205" y1="238" x2="220" y2="295" stroke="${cDark}" stroke-width="6" stroke-linecap="round"/>
      <line x1="190" y1="208" x2="162" y2="232" stroke="${cDark}" stroke-width="5" stroke-linecap="round"/>
      <line x1="206" y1="208" x2="232" y2="225" stroke="${cDark}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="200" cy="300" rx="58" ry="10" fill="${c}" opacity="0.2"/>
    </g>`,
    // WINDASH (31): Sonic speed figure with wind lines
    `<g opacity="0.9">
      <ellipse cx="235" cy="162" rx="17" ry="19" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="226" y="181" width="15" height="45" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5" transform="rotate(12,233,203)"/>
      <line x1="233" y1="226" x2="215" y2="285" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="241" y1="226" x2="260" y2="285" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <line x1="140" y1="180" x2="225" y2="185" stroke="${cLight}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      <line x1="135" y1="198" x2="222" y2="200" stroke="${cLight}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
      <line x1="138" y1="215" x2="220" y2="215" stroke="${cLight}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <line x1="145" y1="230" x2="220" y2="228" stroke="${cLight}" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    </g>`,
    // PHANTOM (32): Translucent ghost figure
    `<g opacity="0.85">
      <ellipse cx="200" cy="165" rx="20" ry="22" fill="${c}" opacity="0.35" stroke="${cLight}" stroke-width="1.5"/>
      <rect x="188" y="187" width="18" height="55" rx="5" fill="${c}" opacity="0.3" stroke="${cLight}" stroke-width="1"/>
      <path d="M175,242 Q175,310 160,320 Q155,295 165,275 Q165,255 175,242Z" fill="${c}" opacity="0.3"/>
      <path d="M225,242 Q225,310 240,320 Q245,295 235,275 Q235,255 225,242Z" fill="${c}" opacity="0.3"/>
      <path d="M175,242 L225,242 L228,310 Q200,330 172,310Z" fill="${c}" opacity="0.25"/>
      <ellipse cx="195" cy="160" rx="5" ry="6" fill="${cLight}" opacity="0.6"/>
      <ellipse cx="208" cy="160" rx="5" ry="6" fill="${cLight}" opacity="0.6"/>
    </g>`,
    // VOIDSTEP (33): Portal/dimensional rift
    `<g opacity="0.9">
      <ellipse cx="200" cy="215" rx="52" ry="70" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <ellipse cx="200" cy="215" rx="38" ry="52" fill="none" stroke="${cLight}" stroke-width="1.5" opacity="0.5"/>
      <ellipse cx="200" cy="215" rx="22" ry="30" fill="${c}" opacity="0.4"/>
      <ellipse cx="200" cy="215" rx="8" ry="11" fill="${cLight}" opacity="0.7"/>
      <line x1="200" y1="145" x2="200" y2="285" stroke="${cLight}" stroke-width="0.5" opacity="0.3"/>
      <line x1="148" y1="215" x2="252" y2="215" stroke="${cLight}" stroke-width="0.5" opacity="0.3"/>
      <line x1="163" y1="162" x2="237" y2="268" stroke="${cLight}" stroke-width="0.5" opacity="0.2"/>
      <line x1="237" y1="162" x2="163" y2="268" stroke="${cLight}" stroke-width="0.5" opacity="0.2"/>
    </g>`,
    // TIMESKIP (34): Hourglass with frozen particles
    `<g opacity="0.9">
      <path d="M165,148 L235,148 L215,210 L235,275 L165,275 L185,210Z" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <path d="M168,151 L232,151 L213,210 L232,272 L168,272 L187,210Z" fill="none" stroke="${cLight}" stroke-width="0.5" opacity="0.3"/>
      <ellipse cx="200" cy="210" rx="20" ry="8" fill="${c}" opacity="0.6"/>
      <circle cx="195" cy="200" r="3" fill="${cLight}" opacity="0.7"/>
      <circle cx="205" cy="222" r="3" fill="${cLight}" opacity="0.7"/>
      <circle cx="200" cy="210" r="2" fill="${cLight}"/>
      <line x1="200" y1="148" x2="200" y2="120" stroke="${cLight}" stroke-width="2" opacity="0.5"/>
      <line x1="200" y1="275" x2="200" y2="305" stroke="${cLight}" stroke-width="2" opacity="0.5"/>
    </g>`,
    // ARK GATE (35): Glowing archway portal
    `<g opacity="0.95">
      <path d="M152,315 L152,200 Q152,145 200,145 Q248,145 248,200 L248,315Z" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <path d="M165,315 L165,204 Q165,160 200,160 Q235,160 235,204 L235,315Z" fill="${c}" opacity="0.3"/>
      <path d="M178,315 L178,210 Q178,175 200,175 Q222,175 222,210 L222,315Z" fill="${cLight}" opacity="0.25"/>
      <ellipse cx="200" cy="240" rx="18" ry="25" fill="${cLight}" opacity="0.5"/>
      <line x1="200" y1="145" x2="200" y2="115" stroke="${cLight}" stroke-width="3" opacity="0.7"/>
      <line x1="152" y1="200" x2="125" y2="200" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="248" y1="200" x2="275" y2="200" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
    </g>`,
    // GENESIS (36): Spiral of rebirth
    `<g opacity="0.9">
      <path d="M200,140 Q240,155 250,195 Q255,235 230,265 Q205,290 170,278 Q140,265 135,235 Q130,205 148,183 Q162,165 185,162"
            fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <path d="M185,162 Q193,160 200,165 Q205,172 198,178 Q190,183 184,177 Q179,170 185,162Z" fill="${cLight}"/>
      <circle cx="200" cy="215" r="18" fill="${cDark}" stroke="${c}" stroke-width="2" opacity="0.8"/>
      <circle cx="200" cy="215" r="8" fill="${c}" opacity="0.7"/>
      <circle cx="200" cy="215" r="3" fill="${cLight}"/>
    </g>`,
  ];
  return variants[idx] || variants[0];
}

function magicArt(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.3);
  const cLight = lighten(c, 1.8);
  const idx = id - 37;

  const variants = [
    // TEMPEST (37): Storm spellcaster raising arms
    `<g opacity="0.95">
      <ellipse cx="200" cy="165" rx="20" ry="22" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <rect x="190" y="187" width="18" height="52" rx="3" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <line x1="198" y1="200" x2="155" y2="158" stroke="${cDark}" stroke-width="7" stroke-linecap="round"/>
      <line x1="202" y1="200" x2="245" y2="158" stroke="${cDark}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="148" cy="152" r="16" fill="${c}" opacity="0.8"/>
      <circle cx="252" cy="152" r="16" fill="${c}" opacity="0.8"/>
      <path d="M148,152 Q170,175 160,200 Q145,210 135,195 Q140,175 148,152Z" fill="${cLight}" opacity="0.5"/>
      <path d="M252,152 Q230,175 240,200 Q255,210 265,195 Q260,175 252,152Z" fill="${cLight}" opacity="0.5"/>
      <path d="M145,120 Q160,130 158,140" stroke="${cLight}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M255,120 Q240,130 242,140" stroke="${cLight}" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`,
    // NIHIL (38): Void mirror / copy orb
    `<g opacity="0.9">
      <circle cx="200" cy="210" r="65" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <circle cx="200" cy="210" r="50" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <circle cx="178" cy="205" r="22" fill="${c}" opacity="0.5"/>
      <circle cx="222" cy="205" r="22" fill="${c}" opacity="0.5"/>
      <line x1="200" y1="145" x2="200" y2="275" stroke="${cLight}" stroke-width="1" opacity="0.3"/>
      <circle cx="178" cy="205" r="10" fill="${cLight}" opacity="0.3"/>
      <circle cx="222" cy="205" r="10" fill="${cLight}" opacity="0.3"/>
    </g>`,
    // SPARK (39): Lightning bolt
    `<g opacity="0.95">
      <polygon points="215,130 195,200 210,200 185,295 220,215 202,215 225,130" fill="${c}"/>
      <polygon points="215,130 195,200 210,200 185,295 220,215 202,215 225,130" fill="${cLight}" opacity="0.3"/>
      <line x1="215" y1="130" x2="200" y2="130" stroke="${cLight}" stroke-width="3" opacity="0.5"/>
    </g>`,
    // FROST (40): Ice shard cluster
    `<g opacity="0.9">
      <line x1="200" y1="145" x2="200" y2="295" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <line x1="145" y1="200" x2="255" y2="200" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <line x1="159" y1="159" x2="241" y2="241" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
      <line x1="241" y1="159" x2="159" y2="241" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="200" cy="145" r="6" fill="${cLight}"/>
      <circle cx="200" cy="295" r="6" fill="${cLight}"/>
      <circle cx="145" cy="200" r="6" fill="${cLight}"/>
      <circle cx="255" cy="200" r="6" fill="${cLight}"/>
      <circle cx="159" cy="159" r="5" fill="${cLight}"/>
      <circle cx="241" cy="241" r="5" fill="${cLight}"/>
      <circle cx="241" cy="159" r="5" fill="${cLight}"/>
      <circle cx="159" cy="241" r="5" fill="${cLight}"/>
      <circle cx="200" cy="200" r="12" fill="${c}" opacity="0.8"/>
    </g>`,
    // BLAZE (41): Flame wave
    `<g opacity="0.95">
      <path d="M155,300 Q155,250 170,220 Q175,245 180,225 Q185,200 200,170 Q215,200 220,225 Q225,245 230,220 Q245,250 245,300Z" fill="${c}"/>
      <path d="M165,300 Q165,260 178,235 Q183,250 187,235 Q193,215 200,190 Q207,215 213,235 Q217,250 222,235 Q235,260 235,300Z" fill="${cLight}" opacity="0.5"/>
      <ellipse cx="200" cy="165" rx="15" ry="20" fill="${cLight}" opacity="0.4"/>
    </g>`,
    // STATIC (42): Electrical discharge ring
    `<g opacity="0.9">
      <circle cx="200" cy="210" r="60" fill="none" stroke="${c}" stroke-width="3"/>
      <circle cx="200" cy="210" r="45" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/>
      <line x1="145" y1="178" x2="175" y2="195" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="255" y1="178" x2="225" y2="195" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="145" y1="242" x2="175" y2="225" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="255" y1="242" x2="225" y2="225" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="200" cy="210" r="18" fill="${c}" opacity="0.7"/>
      <circle cx="200" cy="210" r="8" fill="${cLight}" opacity="0.8"/>
    </g>`,
    // INFERNO (43): Area fire column
    `<g opacity="0.95">
      <ellipse cx="200" cy="295" rx="65" ry="18" fill="${c}" opacity="0.7"/>
      <path d="M148,300 Q150,245 170,210 Q178,235 183,215 Q190,185 200,155 Q210,185 217,215 Q222,235 230,210 Q250,245 252,300Z" fill="${c}"/>
      <path d="M162,300 Q163,255 180,225 Q186,242 190,228 Q196,205 200,178 Q204,205 210,228 Q214,242 220,225 Q237,255 238,300Z" fill="${cLight}" opacity="0.5"/>
    </g>`,
    // BLIZZARD (44): Snowflake mandala
    `<g opacity="0.9">
      <line x1="200" y1="145" x2="200" y2="295" stroke="${c}" stroke-width="3"/>
      <line x1="145" y1="200" x2="255" y2="200" stroke="${c}" stroke-width="3"/>
      <line x1="157" y1="157" x2="243" y2="243" stroke="${c}" stroke-width="3"/>
      <line x1="243" y1="157" x2="157" y2="243" stroke="${c}" stroke-width="3"/>
      <line x1="200" y1="155" x2="185" y2="168" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="200" y1="155" x2="215" y2="168" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="200" y1="285" x2="185" y2="272" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="200" y1="285" x2="215" y2="272" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="152" y1="200" x2="165" y2="185" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="152" y1="200" x2="165" y2="215" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="248" y1="200" x2="235" y2="185" stroke="${cLight}" stroke-width="1.5"/>
      <line x1="248" y1="200" x2="235" y2="215" stroke="${cLight}" stroke-width="1.5"/>
      <circle cx="200" cy="200" r="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="200" cy="200" r="8" fill="${c}"/>
    </g>`,
    // THUNDER (45): Chain lightning between orbs
    `<g opacity="0.95">
      <circle cx="155" cy="175" r="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="245" cy="175" r="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="200" cy="255" r="18" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <polyline points="165,180 178,195 192,175 206,200 218,178 232,180" stroke="${cLight}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="165,185 170,220 185,235 200,248" stroke="${cLight}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
      <polyline points="235,185 230,220 215,235 200,248" stroke="${cLight}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    </g>`,
    // MAELSTROM (46): Water vortex spiral
    `<g opacity="0.9">
      <path d="M200,200 Q230,175 240,200 Q245,225 220,240 Q195,250 175,230 Q155,210 165,185 Q178,165 200,165"
            fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <path d="M200,200 Q220,185 225,200 Q228,215 215,222 Q200,228 188,218 Q177,207 183,195 Q190,183 200,183"
            fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
      <circle cx="200" cy="200" r="8" fill="${cLight}" opacity="0.9"/>
      <circle cx="200" cy="200" r="3" fill="${c}"/>
      <path d="M200,165 L206,155 L200,145" stroke="${cLight}" stroke-width="2" fill="none"/>
    </g>`,
    // GRAVITY (47): Collapse rings
    `<g opacity="0.9">
      <circle cx="200" cy="210" r="68" fill="none" stroke="${c}" stroke-width="2" opacity="0.4"/>
      <circle cx="200" cy="210" r="52" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.55"/>
      <circle cx="200" cy="210" r="36" fill="none" stroke="${c}" stroke-width="3" opacity="0.7"/>
      <circle cx="200" cy="210" r="20" fill="none" stroke="${c}" stroke-width="3.5" opacity="0.85"/>
      <circle cx="200" cy="210" r="8" fill="${c}" opacity="0.95"/>
      <line x1="200" y1="142" x2="200" y2="210" stroke="${cLight}" stroke-width="1.5" opacity="0.3"/>
      <line x1="268" y1="210" x2="200" y2="210" stroke="${cLight}" stroke-width="1.5" opacity="0.3"/>
      <line x1="251" y1="161" x2="200" y2="210" stroke="${cLight}" stroke-width="1.5" opacity="0.3"/>
    </g>`,
    // SINGULARITY (48): Black hole accretion disk
    `<g opacity="0.95">
      <ellipse cx="200" cy="215" rx="68" ry="20" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>
      <ellipse cx="200" cy="215" rx="52" ry="14" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.7"/>
      <ellipse cx="200" cy="215" rx="38" ry="9" fill="${c}" opacity="0.5"/>
      <circle cx="200" cy="215" r="28" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <circle cx="200" cy="215" r="14" fill="#050308"/>
      <path d="M200,215 Q215,185 235,170" stroke="${cLight}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>
      <path d="M200,215 Q182,245 162,255" stroke="${cLight}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>
    </g>`,
  ];
  return variants[idx] || variants[0];
}

function recoveryArt(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.3);
  const cLight = lighten(c, 1.8);
  const idx = id - 49;

  const variants = [
    // MEND (49): Healing cross glow
    `<g opacity="0.95">
      <rect x="185" y="155" width="30" height="100" rx="6" fill="${c}"/>
      <rect x="155" y="185" width="90" height="30" rx="6" fill="${c}"/>
      <rect x="188" y="158" width="24" height="94" rx="4" fill="${cLight}" opacity="0.3"/>
      <rect x="158" y="188" width="84" height="24" rx="4" fill="${cLight}" opacity="0.3"/>
      <ellipse cx="200" cy="210" rx="45" ry="45" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.3"/>
    </g>`,
    // REST (50): Sleeping crescent moon
    `<g opacity="0.9">
      <path d="M200,150 Q240,165 245,200 Q248,235 225,258 Q205,275 185,268 Q205,255 212,233 Q220,210 215,188 Q208,165 200,150Z" fill="${c}"/>
      <circle cx="172" cy="215" r="5" fill="${cLight}" opacity="0.7"/>
      <circle cx="185" cy="245" r="4" fill="${cLight}" opacity="0.6"/>
      <circle cx="160" cy="235" r="3" fill="${cLight}" opacity="0.5"/>
      <circle cx="175" cy="190" r="3" fill="${cLight}" opacity="0.45"/>
      <circle cx="195" cy="175" r="2.5" fill="${cLight}" opacity="0.4"/>
    </g>`,
    // POTION (51): Bubbling flask
    `<g opacity="0.95">
      <rect x="186" y="145" width="28" height="35" rx="4" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <path d="M172,300 Q165,255 178,228 L186,180 L214,180 L222,228 Q235,255 228,300Z" fill="${c}"/>
      <path d="M175,302 Q168,257 181,230 L188,183 L212,183 L219,230 Q232,257 225,302Z" fill="${cLight}" opacity="0.25"/>
      <ellipse cx="200" cy="265" rx="20" ry="8" fill="${cLight}" opacity="0.35"/>
      <ellipse cx="190" cy="290" rx="8" ry="4" fill="${cLight}" opacity="0.25"/>
      <circle cx="208" cy="248" r="5" fill="${cLight}" opacity="0.4"/>
      <rect x="188" y="148" width="24" height="8" rx="3" fill="${cLight}" opacity="0.4"/>
    </g>`,
    // BANDAGE (52): Wrapped cross
    `<g opacity="0.9">
      <rect x="183" y="150" width="34" height="115" rx="10" fill="${c}"/>
      <rect x="150" y="183" width="100" height="34" rx="10" fill="${c}"/>
      <line x1="185" y1="155" x2="215" y2="155" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="185" y1="165" x2="215" y2="165" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="185" y1="220" x2="215" y2="220" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="185" y1="230" x2="215" y2="230" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="155" y1="185" x2="155" y2="215" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="165" y1="185" x2="165" y2="215" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="230" y1="185" x2="230" y2="215" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
      <line x1="240" y1="185" x2="240" y2="215" stroke="${cLight}" stroke-width="2" opacity="0.4"/>
    </g>`,
    // REJUVEN (53): Blooming flower of light
    `<g opacity="0.95">
      <ellipse cx="200" cy="220" rx="15" ry="40" fill="${c}" opacity="0.8"/>
      <ellipse cx="200" cy="220" rx="15" ry="40" fill="${c}" opacity="0.8" transform="rotate(45,200,220)"/>
      <ellipse cx="200" cy="220" rx="15" ry="40" fill="${c}" opacity="0.8" transform="rotate(90,200,220)"/>
      <ellipse cx="200" cy="220" rx="15" ry="40" fill="${c}" opacity="0.8" transform="rotate(135,200,220)"/>
      <circle cx="200" cy="220" r="18" fill="${cLight}" opacity="0.9"/>
      <circle cx="200" cy="220" r="10" fill="${c}"/>
      <line x1="200" y1="180" x2="200" y2="155" stroke="${cDark}" stroke-width="3" stroke-linecap="round"/>
    </g>`,
    // WARD (54): Guardian eye sigil
    `<g opacity="0.9">
      <ellipse cx="200" cy="210" rx="65" ry="38" fill="${cDark}" stroke="${c}" stroke-width="2.5"/>
      <ellipse cx="200" cy="210" rx="48" ry="26" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.5"/>
      <circle cx="200" cy="210" r="20" fill="${c}" opacity="0.7"/>
      <circle cx="200" cy="210" r="10" fill="${cDark}"/>
      <circle cx="195" cy="206" r="4" fill="${cLight}" opacity="0.8"/>
      <line x1="135" y1="210" x2="165" y2="210" stroke="${cLight}" stroke-width="1.5" opacity="0.4"/>
      <line x1="235" y1="210" x2="265" y2="210" stroke="${cLight}" stroke-width="1.5" opacity="0.4"/>
    </g>`,
    // LIFEDRAIN (55): Dual orbs connected by beam
    `<g opacity="0.9">
      <circle cx="160" cy="195" r="32" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="240" cy="245" r="32" fill="${c}" opacity="0.7" stroke="${cLight}" stroke-width="1.5"/>
      <path d="M185,205 Q200,215 215,225" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="160" cy="195" r="16" fill="${c}" opacity="0.5"/>
      <circle cx="240" cy="245" r="20" fill="${cLight}" opacity="0.35"/>
      <circle cx="160" cy="195" r="6" fill="${cDark}"/>
      <circle cx="240" cy="245" r="8" fill="${c}"/>
    </g>`,
    // PHOENIX (56): Rising bird silhouette in flames
    `<g opacity="0.95">
      <ellipse cx="200" cy="175" rx="22" ry="18" fill="${c}" opacity="0.9"/>
      <path d="M200,175 Q175,148 148,142 Q165,160 160,178 Q175,168 200,175Z" fill="${c}"/>
      <path d="M200,175 Q225,148 252,142 Q235,160 240,178 Q225,168 200,175Z" fill="${c}"/>
      <path d="M200,175 Q185,210 178,245 Q188,238 200,250 Q212,238 222,245 Q215,210 200,175Z" fill="${c}" opacity="0.8"/>
      <path d="M200,175 Q188,200 183,230" stroke="${cLight}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
      <path d="M200,175 Q212,200 217,230" stroke="${cLight}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
      <ellipse cx="200" cy="260" rx="35" ry="12" fill="${cLight}" opacity="0.3"/>
    </g>`,
    // ELIXIR (57): Golden chalice with overflow
    `<g opacity="0.95">
      <path d="M175,155 L225,155 L240,215 Q245,235 200,245 Q155,235 160,215Z" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <ellipse cx="200" cy="245" rx="45" ry="12" fill="${c}" opacity="0.6"/>
      <ellipse cx="200" cy="215" rx="30" ry="10" fill="${cLight}" opacity="0.4"/>
      <rect x="188" y="245" width="24" height="35" rx="2" fill="${cDark}" stroke="${c}" stroke-width="1.5"/>
      <rect x="175" y="278" width="50" height="12" rx="4" fill="${c}"/>
      <path d="M175,155 Q165,155 162,168 Q175,175 200,178 Q225,175 238,168 Q235,155 225,155Z" fill="${c}" opacity="0.6"/>
    </g>`,
    // HOLY LIGHT (58): Radiant burst
    `<g opacity="0.95">
      <circle cx="200" cy="210" r="45" fill="${cDark}" stroke="${c}" stroke-width="2"/>
      <circle cx="200" cy="210" r="32" fill="${c}" opacity="0.6"/>
      <circle cx="200" cy="210" r="18" fill="${cLight}" opacity="0.8"/>
      <line x1="200" y1="140" x2="200" y2="165" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <line x1="200" y1="255" x2="200" y2="280" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <line x1="130" y1="210" x2="155" y2="210" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <line x1="245" y1="210" x2="270" y2="210" stroke="${cLight}" stroke-width="4" stroke-linecap="round"/>
      <line x1="150" y1="160" x2="168" y2="178" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="250" y1="160" x2="232" y2="178" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="150" y1="260" x2="168" y2="242" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
      <line x1="250" y1="260" x2="232" y2="242" stroke="${cLight}" stroke-width="3" stroke-linecap="round"/>
    </g>`,
    // GEN PULSE (59): Concentric pulse rings
    `<g opacity="0.95">
      <circle cx="200" cy="210" r="68" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.3"/>
      <circle cx="200" cy="210" r="55" fill="none" stroke="${c}" stroke-width="2" opacity="0.45"/>
      <circle cx="200" cy="210" r="42" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.6"/>
      <circle cx="200" cy="210" r="30" fill="none" stroke="${c}" stroke-width="3" opacity="0.75"/>
      <circle cx="200" cy="210" r="18" fill="none" stroke="${c}" stroke-width="3.5" opacity="0.9"/>
      <circle cx="200" cy="210" r="8" fill="${cLight}" opacity="0.95"/>
      <circle cx="200" cy="210" r="3" fill="${c}"/>
    </g>`,
    // ARK BLESS (60): Divine crown with rays
    `<g opacity="0.95">
      <path d="M155,215 L165,175 L175,205 L185,165 L200,195 L215,165 L225,205 L235,175 L245,215Z" fill="${c}"/>
      <path d="M155,215 L245,215 L242,225 L158,225Z" fill="${cLight}" opacity="0.5"/>
      <path d="M158,228 Q200,260 242,228 L245,235 Q200,270 155,235Z" fill="${c}" opacity="0.7"/>
      <ellipse cx="200" cy="222" rx="45" ry="8" fill="none" stroke="${cLight}" stroke-width="1" opacity="0.4"/>
      <circle cx="200" cy="213" r="5" fill="${cLight}"/>
      <circle cx="180" cy="213" r="3.5" fill="${cLight}" opacity="0.8"/>
      <circle cx="220" cy="213" r="3.5" fill="${cLight}" opacity="0.8"/>
    </g>`,
  ];
  return variants[idx] || variants[0];
}

function getCardArt(card, id) {
  switch (card.t) {
    case 'attack':   return attackArt(card, id);
    case 'defense':  return defenseArt(card, id);
    case 'flee':     return fleeArt(card, id);
    case 'magic':    return magicArt(card, id);
    case 'recovery': return recoveryArt(card, id);
    default: return '';
  }
}

// ── SVG Generator ─────────────────────────────────────────────────────────────
function generateSVG(card, id) {
  const c = card.c;
  const cDark = darken(c, 0.25);
  const cVeryDark = darken(c, 0.12);
  const cLight = lighten(c, 1.6);
  const rarity = card.r;
  const border = rarityBorderDef(rarity, id);
  const icon = TYPE_ICONS[card.t];
  const typeCap = TYPE_CAPS[card.t];

  // Epic glow filter
  const epicFilter = rarity === 4 ? `
  <filter id="epicGlow${id}">
    <feGaussianBlur stdDeviation="4" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>` : '';

  // Legendary animated shine filter
  const legendaryFilter = rarity === 5 ? `
  <filter id="legendShine${id}">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <linearGradient id="legendaryBodyGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${cVeryDark}"/>
    <stop offset="100%" stop-color="#0a0a18"/>
    <animateTransform attributeName="gradientTransform" type="rotate" values="0 200 280;360 200 280" dur="6s" repeatCount="indefinite"/>
  </linearGradient>` : '';

  // Background gradient
  const bgGrad = rarity === 5
    ? `url(#legendaryBodyGrad${id})`
    : `url(#bgGrad${id})`;

  // Art section background color based on type
  const artBgColors = {
    attack:   ['#1a0808', '#2a0e0e'],
    defense:  ['#080818', '#0e1428'],
    flee:     ['#081408', '#0e1e0e'],
    magic:    ['#100818', '#180e28'],
    recovery: ['#181008', '#281808'],
  };
  const [artBg1, artBg2] = artBgColors[card.t] || ['#0a0a0a', '#141414'];

  // Rarity dot color
  const rarityDotColors = ['', '#888', '#4488ff', '#aa44ff', '#ffcc00', '#ff8800'];
  const rarityDotFill = rarityDotColors[rarity];

  // Name font-size: shrink for long names
  const nameLen = card.n.length;
  const nameFontSize = nameLen <= 7 ? 22 : nameLen <= 10 ? 19 : 16;

  // Wrap lore text at ~38 chars
  function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) lines.push(current);
    return lines;
  }
  const loreLines = wrapText(card.fl, 36);

  // Shine overlay for legendary
  const legendaryShineOverlay = rarity === 5 ? `
  <rect x="18" y="18" width="364" height="524" rx="14"
    fill="none" stroke="url(#rainbowGrad${id})" stroke-width="3"
    filter="url(#legendShine${id})"/>
  <rect x="22" y="22" width="356" height="516" rx="12"
    fill="none" stroke="url(#rainbowGrad${id})" stroke-width="1.5" opacity="0.5"/>` : '';

  // Epic glow ring
  const epicGlowRing = rarity === 4 ? `
  <rect x="18" y="18" width="364" height="524" rx="14"
    fill="none" stroke="${c}" stroke-width="2.5"
    filter="url(#epicGlow${id})" opacity="0.85"/>` : '';

  const cardArt = getCardArt(card, id);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="bgGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cVeryDark}"/>
      <stop offset="100%" stop-color="#080810"/>
    </linearGradient>
    <linearGradient id="artBgGrad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${artBg1}"/>
      <stop offset="100%" stop-color="${artBg2}"/>
    </linearGradient>
    <linearGradient id="bottomGrad${id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${cVeryDark}"/>
      <stop offset="100%" stop-color="#08080f"/>
    </linearGradient>
    <linearGradient id="nameBarGrad${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${c}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0.15"/>
    </linearGradient>
    <clipPath id="cardClip${id}">
      <rect x="16" y="16" width="368" height="528" rx="14"/>
    </clipPath>
    ${border.animDef}
    ${epicFilter}
    ${legendaryFilter}
  </defs>

  <!-- Card body -->
  <rect x="16" y="16" width="368" height="528" rx="14" fill="${bgGrad}"/>

  <!-- Art area background -->
  <rect x="20" y="60" width="360" height="280" fill="url(#artBgGrad${id})" clip-path="url(#cardClip${id})"/>

  <!-- Subtle grid lines in art area -->
  <g opacity="0.07" clip-path="url(#cardClip${id})">
    <line x1="20" y1="100" x2="380" y2="100" stroke="${c}" stroke-width="0.5"/>
    <line x1="20" y1="160" x2="380" y2="160" stroke="${c}" stroke-width="0.5"/>
    <line x1="20" y1="220" x2="380" y2="220" stroke="${c}" stroke-width="0.5"/>
    <line x1="20" y1="280" x2="380" y2="280" stroke="${c}" stroke-width="0.5"/>
    <line x1="100" y1="60" x2="100" y2="340" stroke="${c}" stroke-width="0.5"/>
    <line x1="200" y1="60" x2="200" y2="340" stroke="${c}" stroke-width="0.5"/>
    <line x1="300" y1="60" x2="300" y2="340" stroke="${c}" stroke-width="0.5"/>
  </g>

  <!-- Ambient glow blob behind art -->
  <ellipse cx="200" cy="200" rx="100" ry="90" fill="${c}" opacity="0.06" clip-path="url(#cardClip${id})"/>

  <!-- Card art -->
  <g clip-path="url(#cardClip${id})">
    ${cardArt}
  </g>

  <!-- Art area top fade -->
  <rect x="20" y="60" width="360" height="30" fill="${bgGrad}" opacity="0.5" clip-path="url(#cardClip${id})"/>

  <!-- Art-to-info divider -->
  <rect x="20" y="337" width="360" height="2" fill="${c}" opacity="0.4"/>

  <!-- Bottom info section -->
  <rect x="20" y="339" width="360" height="205" fill="url(#bottomGrad${id})" clip-path="url(#cardClip${id})"/>

  <!-- Top bar -->
  <rect x="20" y="20" width="360" height="42" fill="${bgGrad}" opacity="0.9" clip-path="url(#cardClip${id})"/>
  <line x1="20" y1="62" x2="380" y2="62" stroke="${c}" stroke-width="1" opacity="0.5"/>

  <!-- Card number top-left -->
  <text x="34" y="46" font-family="monospace" font-size="13" font-weight="bold"
        fill="${cLight}" opacity="0.75" letter-spacing="1">#${pad3(id)}</text>

  <!-- Type icon top-right -->
  <text x="355" y="47" font-family="serif" font-size="18" text-anchor="middle"
        fill="${c}">${icon}</text>

  <!-- Type label -->
  <text x="290" y="46" font-family="monospace" font-size="10" text-anchor="end"
        fill="${c}" opacity="0.6" letter-spacing="2">${typeCap.toUpperCase()}</text>

  <!-- Rarity dots -->
  ${Array.from({length: rarity}, (_, i) =>
    `<circle cx="${176 + i * 12}" cy="46" r="4" fill="${rarityDotFill}" opacity="${0.6 + i * 0.08}"/>`
  ).join('')}

  <!-- Name bar -->
  <rect x="24" y="345" width="352" height="40" rx="4" fill="url(#nameBarGrad${id})"/>
  <line x1="24" y1="345" x2="376" y2="345" stroke="${c}" stroke-width="0.5" opacity="0.4"/>

  <!-- Card name -->
  <text x="200" y="372" font-family="'Arial Black', sans-serif" font-size="${nameFontSize}"
        font-weight="900" text-anchor="middle" fill="${cLight}" letter-spacing="3"
        style="text-transform:uppercase">${card.n}</text>

  <!-- Divider -->
  <line x1="36" y1="392" x2="364" y2="392" stroke="${c}" stroke-width="0.5" opacity="0.4"/>

  <!-- Effect label -->
  <text x="36" y="410" font-family="monospace" font-size="9" fill="${c}" opacity="0.6"
        letter-spacing="2">EFFECT</text>
  <text x="364" y="410" font-family="monospace" font-size="9" fill="${c}" opacity="0.6"
        text-anchor="end" letter-spacing="1">RARITY: ${RARITY_NAMES[rarity].toUpperCase()}</text>

  <!-- Effect text -->
  <text x="200" y="430" font-family="'Arial', sans-serif" font-size="15" font-weight="bold"
        text-anchor="middle" fill="${cLight}" letter-spacing="1">${card.f}</text>

  <!-- Lore divider -->
  <line x1="36" y1="445" x2="364" y2="445" stroke="${c}" stroke-width="0.5" opacity="0.3"/>

  <!-- Lore text (italic, small) -->
  ${loreLines.map((line, i) =>
    `<text x="200" y="${463 + i * 16}" font-family="Georgia, serif" font-size="11"
          font-style="italic" text-anchor="middle" fill="${cLight}" opacity="0.65"
          letter-spacing="0.5">${line}</text>`
  ).join('\n  ')}

  <!-- Bottom logo -->
  <text x="200" y="536" font-family="monospace" font-size="9" text-anchor="middle"
        fill="${c}" opacity="0.4" letter-spacing="3">0xARK · SOLANA ZK PvP</text>

  <!-- Card border -->
  <rect x="18" y="18" width="364" height="524" rx="14"
        fill="none" stroke="${border.stroke}" stroke-width="${rarity >= 3 ? 2.5 : 1.5}"/>

  <!-- Inner border -->
  <rect x="22" y="22" width="356" height="516" rx="12"
        fill="none" stroke="${cLight}" stroke-width="0.5" opacity="0.15"/>

  ${legendaryShineOverlay}
  ${epicGlowRing}
</svg>`;
}

// ── Collection banner SVG ─────────────────────────────────────────────────────
function generateCollectionSVG() {
  const types = [
    { t: 'attack',   c: '#e86040', icon: '⚔', label: 'ATTACK',   r: 5 },
    { t: 'defense',  c: '#4898d8', icon: '◆', label: 'DEFENSE',  r: 5 },
    { t: 'flee',     c: '#38b878', icon: '●', label: 'FLEE',     r: 5 },
    { t: 'magic',    c: '#d8b028', icon: '★', label: 'MAGIC',    r: 5 },
    { t: 'recovery', c: '#f8e070', icon: '◎', label: 'RECOVERY', r: 5 },
  ];

  const cardW = 200;
  const cardH = 280;
  const totalW = 1200;
  const totalH = 400;
  const startX = (totalW - types.length * (cardW + 20)) / 2 + 10;
  const startY = (totalH - cardH) / 2;

  const cards = types.map((type, i) => {
    const x = startX + i * (cardW + 20);
    const y = startY;
    const c = type.c;
    const cDark = darken(c, 0.25);
    const cLight = lighten(c, 1.6);
    const cVeryDark = darken(c, 0.15);

    return `
    <!-- ${type.label} card -->
    <g transform="translate(${x},${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10"
            fill="${cVeryDark}" stroke="${c}" stroke-width="2"/>
      <rect x="2" y="2" width="${cardW-4}" height="${cardH-4}" rx="9"
            fill="none" stroke="${cLight}" stroke-width="0.5" opacity="0.2"/>
      <!-- Art area bg -->
      <rect x="4" y="35" width="${cardW-8}" height="165" fill="${cDark}" opacity="0.5" rx="4"/>
      <!-- Type icon large -->
      <text x="${cardW/2}" y="130" font-family="serif" font-size="52" text-anchor="middle"
            fill="${c}" opacity="0.85">${type.icon}</text>
      <!-- Rainbow border -->
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10"
            fill="none" stroke="url(#collRainbow${i})" stroke-width="2.5"/>
      <!-- Top label -->
      <text x="${cardW/2}" y="24" font-family="monospace" font-size="9" text-anchor="middle"
            fill="${cLight}" opacity="0.7" letter-spacing="2">${type.label}</text>
      <!-- Bottom label -->
      <text x="${cardW/2}" y="${cardH-8}" font-family="monospace" font-size="8" text-anchor="middle"
            fill="${c}" opacity="0.5" letter-spacing="1">0xARK</text>
      <!-- Glow effect -->
      <ellipse cx="${cardW/2}" cy="${cardH/2-20}" rx="50" ry="45" fill="${c}" opacity="0.08"/>
      <!-- Name -->
      <rect x="4" y="210" width="${cardW-8}" height="60" rx="4" fill="${c}" opacity="0.12"/>
      <text x="${cardW/2}" y="236" font-family="'Arial Black',sans-serif" font-size="13"
            font-weight="900" text-anchor="middle" fill="${cLight}" letter-spacing="2">${type.label}</text>
      <text x="${cardW/2}" y="254" font-family="monospace" font-size="9" text-anchor="middle"
            fill="${c}" opacity="0.7" letter-spacing="1">12 CARDS</text>
      <text x="${cardW/2}" y="268" font-family="monospace" font-size="8" text-anchor="middle"
            fill="${cLight}" opacity="0.5">LEGENDARY</text>
    </g>`;
  }).join('');

  const gradients = types.map((type, i) =>
    `<linearGradient id="collRainbow${i}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#ff0080"/>
      <stop offset="25%"  stop-color="#ff8800"/>
      <stop offset="50%"  stop-color="#00ff88"/>
      <stop offset="75%"  stop-color="#0088ff"/>
      <stop offset="100%" stop-color="#ff00ff"/>
      <animateTransform attributeName="gradientTransform" type="rotate"
        values="${i*72} 100 140;${i*72+360} 100 140" dur="4s" repeatCount="indefinite"/>
    </linearGradient>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <defs>
    <linearGradient id="collBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04020c"/>
      <stop offset="50%" stop-color="#08060f"/>
      <stop offset="100%" stop-color="#030208"/>
    </linearGradient>
    ${gradients}
  </defs>

  <!-- Background -->
  <rect width="${totalW}" height="${totalH}" fill="url(#collBg)"/>

  <!-- Subtle grid -->
  <g opacity="0.04">
    ${Array.from({length: 13}, (_, i) =>
      `<line x1="${i*100}" y1="0" x2="${i*100}" y2="${totalH}" stroke="#ffffff" stroke-width="0.5"/>`
    ).join('')}
    ${Array.from({length: 5}, (_, i) =>
      `<line x1="0" y1="${i*100}" x2="${totalW}" y2="${i*100}" stroke="#ffffff" stroke-width="0.5"/>`
    ).join('')}
  </g>

  <!-- Title -->
  <text x="600" y="55" font-family="'Arial Black',sans-serif" font-size="36" font-weight="900"
        text-anchor="middle" fill="#ffffff" letter-spacing="8" opacity="0.9">0xARK CARDS</text>
  <text x="600" y="78" font-family="monospace" font-size="12" text-anchor="middle"
        fill="#8888aa" letter-spacing="4">60 UNIQUE CARDS · SOLANA ZK PvP</text>

  <!-- Cards -->
  ${cards}

  <!-- Bottom tagline -->
  <text x="600" y="${totalH - 18}" font-family="monospace" font-size="11" text-anchor="middle"
        fill="#444466" letter-spacing="3">COLLECT ALL 60 TO CLAIM THE PRIZE POOL</text>
</svg>`;
}

// ── Metadata Generator ────────────────────────────────────────────────────────
function generateMetadata(card, id) {
  const typeCap = TYPE_CAPS[card.t];
  const rarityName = RARITY_NAMES[card.r];

  return {
    name: `0xARK #${pad3(id)} — ${card.n}`,
    symbol: '0xARK',
    description: `${card.fl} · ${card.f} · ${rarityName} ${typeCap} card from 0xARK, the on-chain ZK card PvP game on Solana.`,
    image: `https://r0ze998.github.io/0xark/nft/img/${id}.svg`,
    external_url: 'https://r0ze998.github.io/0xark',
    attributes: [
      { trait_type: 'Card ID',      value: id },
      { trait_type: 'Name',         value: card.n },
      { trait_type: 'Type',         value: typeCap },
      { trait_type: 'Rarity',       value: rarityName },
      { trait_type: 'Rarity Level', value: card.r },
      { trait_type: 'Effect',       value: card.f },
      { trait_type: 'Lore',         value: card.fl },
    ],
    properties: {
      files: [
        { uri: `https://r0ze998.github.io/0xark/nft/img/${id}.svg`, type: 'image/svg+xml' },
      ],
      category: 'image',
      creators: [{ address: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R', share: 100 }],
    },
    collection: { name: '0xARK Cards', family: '0xARK' },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const cardDir = join(ROOT, 'nft', 'card');
  const imgDir  = join(ROOT, 'nft', 'img');

  mkdirSync(cardDir, { recursive: true });
  mkdirSync(imgDir,  { recursive: true });

  console.log('Generating 60 metadata JSON files and 60 SVG images...');

  let jsonCount = 0;
  let svgCount  = 0;

  for (let i = 0; i < CD.length; i++) {
    const card = CD[i];
    const id   = i + 1;

    // Write metadata JSON
    const metadata = generateMetadata(card, id);
    writeFileSync(join(cardDir, `${id}.json`), JSON.stringify(metadata, null, 2));
    jsonCount++;

    // Write SVG
    const svg = generateSVG(card, id);
    writeFileSync(join(imgDir, `${id}.svg`), svg);
    svgCount++;

    process.stdout.write(`\r  [${id}/60] ${card.n.padEnd(12)} (${card.t}, r${card.r})`);
  }

  console.log('\n\nGenerating collection files...');

  // Write collection.json
  const collectionMeta = {
    name: '0xARK Cards',
    symbol: '0xARK',
    description: '60 unique cards from 0xARK — the on-chain ZK card PvP game on Solana. Collect all 60 to claim the Prize Pool.',
    image: 'https://r0ze998.github.io/0xark/nft/collection.svg',
    external_url: 'https://r0ze998.github.io/0xark',
    seller_fee_basis_points: 500,
    properties: {
      creators: [{ address: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R', share: 100 }],
    },
  };
  writeFileSync(join(ROOT, 'nft', 'collection.json'), JSON.stringify(collectionMeta, null, 2));

  // Write collection.svg
  const collectionSVG = generateCollectionSVG();
  writeFileSync(join(ROOT, 'nft', 'collection.svg'), collectionSVG);

  const total = jsonCount + svgCount + 2;
  console.log(`\nDone! Generated:`);
  console.log(`  ${jsonCount} metadata JSON files → nft/card/`);
  console.log(`  ${svgCount}  SVG images         → nft/img/`);
  console.log(`  1  collection.json    → nft/`);
  console.log(`  1  collection.svg     → nft/`);
  console.log(`  ─────────────────────────────`);
  console.log(`  ${total} total files`);
}

main();
