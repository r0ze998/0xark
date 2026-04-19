#!/usr/bin/env node
/**
 * 0xARK Build Script
 * Concatenates src/*.js modules into a single deployable index.html
 *
 * Usage:
 *   node build.js          # builds index.html + ../../index.html
 *   node build.js --check  # verify build output matches current index.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src');
const TEMPLATE = path.join(ROOT, 'template.html');
const OUT_GAME = path.join(ROOT, 'index.html');
const OUT_ROOT = path.join(ROOT, '../../index.html');
const DESIGN_TOKENS_JSON = path.join(ROOT, '../../design/DESIGN_TOKENS.json');
const TOKENS_OUT = path.join(SRC_DIR, '00-tokens.js');

// ── Design-token generation ──────────────────────────────────────────────────
// Reads design/DESIGN_TOKENS.json and emits src/00-tokens.js as a flat
// window.TOKENS object. Semantic refs ({ "ref": "menu_blue" }) are resolved to
// hex at build time so the runtime never walks ref indirection.
// The file is committed to git but MUST NOT be hand-edited — regenerate via
// `node build.js`. Hand edits will be clobbered on next build.
function resolveSemanticPalette(palette) {
  const lookupGroups = [
    palette.locked,
    palette.npc_identity,
    palette.derived_overworld,
    palette.derived_dungeon,
  ];
  const resolveRef = (key) => {
    for (const group of lookupGroups) {
      if (group && Object.prototype.hasOwnProperty.call(group, key)) return group[key];
    }
    throw new Error(`DESIGN_TOKENS.json: semantic ref "${key}" not found in any palette group`);
  };
  const out = {};
  for (const [k, v] of Object.entries(palette.semantic)) {
    if (typeof v === 'string') {
      out[k] = v;
    } else if (v && typeof v === 'object' && typeof v.ref === 'string') {
      out[k] = resolveRef(v.ref);
    } else {
      throw new Error(`DESIGN_TOKENS.json: unexpected semantic value at "${k}": ${JSON.stringify(v)}`);
    }
  }
  return out;
}

function generateTokensModule() {
  if (!fs.existsSync(DESIGN_TOKENS_JSON)) {
    console.error(`ERROR: ${DESIGN_TOKENS_JSON} not found.`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(DESIGN_TOKENS_JSON, 'utf8'));

  const tokens = {
    color: {
      palette: {
        locked:            raw.palette.locked,
        npc_identity:      raw.palette.npc_identity,
        derived_overworld: raw.palette.derived_overworld,
        derived_dungeon:   raw.palette.derived_dungeon,
        semantic:          resolveSemanticPalette(raw.palette),
      },
    },
    type:      raw.typography,
    space:     raw.spacing_px,
    border:    raw.borders_px,
    radii:     raw.radii_px,
    viewport:  raw.viewport,
    z:         raw.z_layers,
    anim:      raw.animations_ms,
    component: raw.component_tokens,
  };

  const banner = [
    '// ═════════════════════════════════════════════════════════════════════════',
    '// GENERATED FILE — DO NOT EDIT BY HAND',
    '// Source:  design/DESIGN_TOKENS.json',
    '// Regen:   `node build.js` (runs generateTokensModule() at top of build())',
    `// Spec v:  ${raw.version}`,
    '// ═════════════════════════════════════════════════════════════════════════',
  ].join('\n');

  const runtime = [
    '',
    '// Runtime helpers (appended by build.js — not in JSON source).',
    '// document.fonts.ready resolves once web fonts (VT323) are usable.',
    '// B1 exposes the promise but does not gate rendering on it; callers opt in.',
    "window.TOKENS.fontReady = (typeof document !== 'undefined' && document.fonts && document.fonts.ready)",
    '  ? document.fonts.ready',
    '  : Promise.resolve();',
    '',
    '// resolveColor(key): walk semantic → locked → npc → derived groups, return hex.',
    '// Literal hex strings ("#rrggbb") pass through. Returns null if not found.',
    'window.TOKENS.resolveColor = function(key) {',
    "  if (typeof key !== 'string') return null;",
    "  if (key.charCodeAt(0) === 35 /* '#' */) return key;",
    '  var p = window.TOKENS.color.palette;',
    '  var groups = [p.semantic, p.locked, p.npc_identity, p.derived_overworld, p.derived_dungeon];',
    '  for (var i = 0; i < groups.length; i++) {',
    '    var g = groups[i];',
    '    if (g && Object.prototype.hasOwnProperty.call(g, key)) return g[key];',
    '  }',
    '  return null;',
    '};',
    '',
  ].join('\n');

  const body = `${banner}\nwindow.TOKENS = ${JSON.stringify(tokens, null, 2)};\n${runtime}`;
  fs.writeFileSync(TOKENS_OUT, body);
  console.log(`  Tokens:       src/00-tokens.js regenerated from design/DESIGN_TOKENS.json (v${raw.version})`);
}

// ── Module manifest (ordered) ────────────────────────────────────────────────
// Each entry describes what the file contains for quick navigation.
const MODULES = [
  { file: '00-tokens.js',        desc: 'Design tokens (GENERATED from design/DESIGN_TOKENS.json — do not hand-edit)' },
  { file: '01-pixi.js',          desc: 'PixiJS canvas setup · FRLG UI framework (PixiJS) · title effects · particles · menu · textbox · HUD · tile drawing · lerp/easeInOut · audio system' },
  { file: '01-draw.js',          desc: 'FRLG window system (canvas 2D) · bx/tx/win primitives · drawCardFrame · crypto utils · ZK proof system · Solana/wallet/blockchain helpers' },
  { file: '01-net.js',           desc: 'WebSocket multiplayer client · typewriter text · fade/wipe transitions · screen shake · hand inspect · rival news display · run summary' },
  { file: '02-data.js',          desc: 'Card definitions (CD[]) · map tile arrays (MAP_PORT, MAP_FOREST, MAP_RUINS, dungeonFloors)' },
  { file: '03-world-setup.js',   desc: 'exits[] · npcs[] · fog-of-war system · terrain rendering helpers' },
  { file: '04-state.js',         desc: 'Global game-state variables · card timers/decay · rival AI background · quest missions' },
  { file: '05-rendering.js',     desc: 'Tile rendering (TILE section) · card character sprites (drawCardCharacter) · sprite animation' },
  { file: '06-world-systems.js', desc: 'Camera · card mini-art · map transitions · location banner · minimap · encounters · NPCs · trading' },
  { file: '07-map.js',           desc: 'Terrain edge blending · atmosphere · fog of war · rival alert anim · pirate decorations · dMap (main world render) · dMenu' },
  { file: '07-battle.js',        desc: 'Battle screen FRLG rendering · card bar · opponent/player info boxes · VS splash · phase banner · action grid · select/confirming phases · card engine (addCardToPlayer/removeCardFromPlayer/checkWinAndTransition) · rival AI · generateResolveEvents' },
  { file: '07-battle-resolve.js', desc: 'Card effect animations (crystal/shadow/flame/storm/void) · drawResolvingPhase · drawResultPhase · dAct' },
  { file: '08-overlays.js',      desc: 'Card acquisition animation · dungeon confirm · marketplace · discard overlay · tutorial · intro · victory screen · cards collection screen · card detail panel · log screen' },
  { file: '08-world-interact.js', desc: 'Fishing minigame · forest trap · puzzle pillars · buildings interior · object interactions · fountain exchange' },
  { file: '08-screens.js',       desc: 'Floor-clear fanfare · object interact messages · exit tooltip · map card use overlay · stats screen · credits · game over screen' },
  { file: '09-game-loop.js',     desc: 'Main update() + draw() game loop · screen routing (title/map/battle/crd/log/stats)' },
  { file: '10-input.js',         desc: 'Keyboard event handlers · touch controls (d-pad, A/B buttons)' },
  { file: '11-save-init.js',     desc: 'Save/load system · game initialization · requestAnimationFrame bootstrap' },
];

function build() {
  // Regenerate design tokens module from JSON source before bundling.
  generateTokensModule();

  // Read template
  if (!fs.existsSync(TEMPLATE)) {
    console.error('ERROR: template.html not found. Run from solana/client/ directory.');
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE, 'utf8');

  // Concatenate modules
  const parts = MODULES.map(({ file, desc }) => {
    const fullPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: Missing module: src/${file}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return `// ${'─'.repeat(71)}\n// MODULE: src/${file}\n// ${desc}\n// ${'─'.repeat(71)}\n${content}`;
  });

  const js = parts.join('\n');
  const scriptBlock = `<script>\n${js}\n</script>`;
  const output = template.replace('<!-- GAME_SCRIPT -->', scriptBlock);

  if (!output.includes('<script>') || !output.includes('</script>')) {
    console.error('ERROR: Build produced malformed output — missing script tags.');
    process.exit(1);
  }

  // Write outputs
  fs.writeFileSync(OUT_GAME, output);
  fs.writeFileSync(OUT_ROOT, output);

  // Copy ZK artifacts + PNG tilesets to root so GitHub Pages can serve them alongside root index.html
  const ZK_FILES = ['commit_reveal.wasm', 'commit_reveal_final.zkey', 'verification_key.json'];
  const REPO_ROOT = path.join(ROOT, '../../');
  for (const f of ZK_FILES) {
    const src = path.join(ROOT, f);
    const dst = path.join(REPO_ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
  }
  // Legacy tileset/bg PNG copy step removed in v451 (Phase B2-0).
  // All prior entries (pirates-tilemap, world/dungeon/overworld tilesets, zelda-*,
  // craftpix-*, bg-town/dungeon*, cpx-forest-*) now live in assets/retired/.
  // Sprite Seas (道A) sources its art from assets/pirates/ (Kenney Monochrome Pirates)
  // and PixiJS Graphics procedurals — no root-relative PNG copies required.

  // Copy React UI bundle to repo root (served alongside root index.html on GitHub Pages)
  const REACT_DIST_SRC = path.join(ROOT, 'react-dist');
  const REACT_DIST_DST = path.join(REPO_ROOT, 'react-dist');
  if (fs.existsSync(REACT_DIST_SRC)) {
    if (!fs.existsSync(REACT_DIST_DST)) fs.mkdirSync(REACT_DIST_DST, { recursive: true });
    for (const f of fs.readdirSync(REACT_DIST_SRC)) {
      fs.copyFileSync(path.join(REACT_DIST_SRC, f), path.join(REACT_DIST_DST, f));
    }
    console.log(`  React UI:     react-dist/ → repo root/react-dist/`);
  }

  const lineCount = output.split('\n').length;
  const moduleCount = MODULES.length;
  const totalSrcLines = MODULES.reduce((sum, { file }) => {
    return sum + fs.readFileSync(path.join(SRC_DIR, file), 'utf8').split('\n').length;
  }, 0);

  console.log(`\n✓ 0xARK built successfully`);
  console.log(`  Modules:      ${moduleCount} files (${totalSrcLines} source lines)`);
  console.log(`  Output:       ${lineCount} lines`);
  console.log(`  → ${OUT_GAME}`);
  console.log(`  → ${OUT_ROOT}\n`);
}

build();
