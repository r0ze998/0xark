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
const { execSync } = require('child_process');

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
  { file: '00-constants.js',     desc: 'Shared named constants — SCENE_IDS, GAME_CONSTANTS (economy values). Loaded first so all modules can reference without import.' },
  { file: '01-pixi.js',          desc: 'PixiJS canvas setup · FRLG UI framework (PixiJS) · title effects · particles · menu · textbox · HUD · tile drawing · lerp/easeInOut · audio system' },
  { file: '01-draw.js',          desc: 'FRLG window system (canvas 2D) · bx/tx/win primitives · drawCardFrame · crypto utils · ZK proof system · Solana/wallet/blockchain helpers' },
  { file: '01-magicblock.js',    desc: 'MagicBlock Ephemeral Rollups · Magic Router connection · sendViaMagicRouter · checkDelegationStatus · delegation stubs (window.oxarkMB)' },
  { file: '01-net.js',           desc: 'WebSocket multiplayer client · typewriter text · fade/wipe transitions · screen shake · hand inspect · rival news display · run summary' },
  { file: '02-data.js',          desc: 'Card definitions (CD[]) · map tile arrays (MAP_PORT, MAP_FOREST, MAP_RUINS, dungeonFloors)' },
  { file: '03-zk-prove.js',     desc: 'ZK dungeon position module · Poseidon commitment · Groth16 proof generation · initPosition/verifyDungeonMove browser helpers (window.zkDungeon)' },
  { file: '03-world-setup.js',   desc: 'exits[] · npcs[] · fog-of-war system · terrain rendering helpers' },
  { file: '04-state.js',         desc: 'Global game-state variables · card timers/decay · rival AI background · quest missions' },
  { file: '05-rendering.js',     desc: 'Tile rendering (TILE section) · card character sprites (drawCardCharacter) · sprite animation' },
  { file: '05-lobby.js',         desc: 'Phase D LobbyScene — Crown Plaza 25×18 tilemap · 6 buildings · block character sprites · 5 clan tints · HUD panels · bottom bar · WebSocket presence' },
  { file: '06-matchmaking.js',   desc: 'Matchmaking queue client · enter_queue/leave_queue Anchor instructions · 2s PDA polling · lobbyFindMatch() wire-up' },
  { file: '06-world-systems.js', desc: 'Camera · card mini-art · map transitions · location banner · minimap · encounters · NPCs · trading' },
  { file: '07-map.js',           desc: 'Terrain edge blending · atmosphere · fog of war · rival alert anim · pirate decorations · dMap (main world render) · dMenu' },
  { file: '07-battle.js',        desc: 'Battle screen FRLG rendering · card bar · opponent/player info boxes · VS splash · phase banner · action grid · select/confirming phases · card engine (addCardToPlayer/removeCardFromPlayer/checkWinAndTransition) · rival AI · generateResolveEvents' },
  { file: '07-battle-resolve.js', desc: 'Card effect animations (crystal/shadow/flame/storm/void) · drawResolvingPhase · drawResultPhase · dAct' },
  { file: '07-deck-editor.js',   desc: 'Deck editor UI skeleton · 2-panel canvas overlay (storage left, deck right) · filter bar · 30pt cost cap validation · deckEditorOpen/drawDeckEditor/deckEditorKeydown' },
  { file: '08-duel-scene.js',   desc: 'Duel Board M2 — 4-phase state machine (Draw/Energy/Summon/Battle) · 5 rounds · element affinity · Defender mechanic · Shards · Extra Action · Scout Peek · Hotseat + AI stub modes' },
  { file: '09-victory-scene.js', desc: 'T-D13-D M4 Victory/Defeat scene — card fly-in animation · reward panels · TX hash + Solscan link · NFT transfer card selection (selectTransferCards)' },
  { file: '08-overlays.js',      desc: 'Card acquisition animation · dungeon confirm · marketplace · discard overlay · tutorial · intro · victory screen · cards collection screen · card detail panel · log screen' },
  { file: '08-world-interact.js', desc: 'Fishing minigame · forest trap · puzzle pillars · buildings interior · object interactions · fountain exchange' },
  { file: '08-screens.js',       desc: 'Floor-clear fanfare · object interact messages · exit tooltip · map card use overlay · stats screen · credits · game over screen' },
  { file: '09-game-loop.js',     desc: 'Main update() + draw() game loop · screen routing (title/map/battle/crd/log/stats/lobby)' },
  { file: '10-animations.js',    desc: 'Reusable animation primitives — playFinisherAnimation / playVictoryAnimation / playDefeatAnimation (stubs for Day 12-13)' },
  { file: '10-card-detail.js',   desc: 'T-D14-B M5 Card Detail scene — 3-panel layout (owner/card/battle+lore) · ADD TO DECK · SELL TO SHOP · lore shard typewriter UX' },
  { file: '11-card-storage.js',  desc: 'T-D14-C PC Box Card Storage grid — 8-col card grid · clan filter · dup/deck toggles · tap→Card Detail · PC Box building integration' },
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

  // Prepend BUILD_VERSION (v452, phase-b2-title) — read by dTitle() for the Title
  // version label. Parses the vNN prefix from HEAD's commit subject (matches the
  // project's "vNN: <change>" convention). Appends "+" when the working tree is
  // dirty so local builds are distinguishable from clean ones. Falls back to 'dev'
  // if git is unavailable or no vNN prefix is found.
  let buildVersion = 'dev';
  try {
    const subject = execSync('git log -1 --format=%s', {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const m = subject.match(/\bv\d+[a-z]?\b/i);
    if (m) buildVersion = m[0];
    // Mark dirty working tree so pre-commit builds don't masquerade as clean.
    try {
      const dirty = execSync('git status --porcelain', {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (dirty) buildVersion += '+';
    } catch (_) { /* ignore */ }
  } catch (_) { /* not a git tree — keep 'dev' */ }
  const versionHeader = `window.BUILD_VERSION = ${JSON.stringify(buildVersion)};`;

  // Bundle onchain.js (Solana/Metaplex on-chain interaction layer) into the output
  const ONCHAIN_PATH = path.join(ROOT, 'onchain.js');
  const onchainJs = fs.existsSync(ONCHAIN_PATH)
    ? `\n// ${'─'.repeat(71)}\n// ONCHAIN: onchain.js\n// Solana wallet + program instructions (Anchor CPI, NFT mint, ZK proof)\n// ${'─'.repeat(71)}\n${fs.readFileSync(ONCHAIN_PATH, 'utf8')}`
    : '/* onchain.js not found — wallet features disabled */';

  const js = parts.join('\n') + onchainJs;
  const scriptBlock = `<script>\n${versionHeader}\n${js}\n</script>`;
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
  console.log(`  Version:      ${buildVersion}`);
  console.log(`  → ${OUT_GAME}`);
  console.log(`  → ${OUT_ROOT}\n`);
}

build();
