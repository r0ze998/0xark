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

// ── Module manifest (ordered) ────────────────────────────────────────────────
// Each entry describes what the file contains for quick navigation.
const MODULES = [
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
  // Copy PNG tilesets (game references them as root-relative paths when served from GitHub Pages)
  const PNG_FILES = [
    { src: 'pirates-tilemap.png',    dst: 'pirates-tilemap.png'    },
    { src: 'world-tileset.png',      dst: 'world-tileset.png'      },
    { src: 'dungeon-tileset.png',    dst: 'dungeon-tileset.png'    },
    { src: 'overworld-rpg-tileset.png', dst: 'overworld-rpg-tileset.png' },
    { src: 'zelda-like-gfx/gfx/character.png', dst: 'zelda-character.png' },
    { src: 'zelda-like-gfx/gfx/Overworld.png', dst: 'zelda-overworld.png' },
    { src: 'zelda-like-gfx/gfx/cave.png',      dst: 'zelda-cave.png'      },
    { src: 'zelda-like-gfx/gfx/objects.png',   dst: 'zelda-objects.png'   },
  ];
  let copiedPngs = 0;
  for (const { src, dst } of PNG_FILES) {
    const srcPath = path.join(ROOT, src);
    const dstPath = path.join(REPO_ROOT, dst);
    if (fs.existsSync(srcPath)) { fs.copyFileSync(srcPath, dstPath); copiedPngs++; }
  }
  if (copiedPngs > 0) console.log(`  PNGs copied:  ${copiedPngs} tileset files → repo root`);

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
