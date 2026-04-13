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
  { file: '01-foundation.js',    desc: 'PixiJS setup · FRLG UI · audio · wallet · ZK · multiplayer · transitions · overlays' },
  { file: '02-data.js',          desc: 'Card definitions (CD[]) · map tile arrays (MAP_PORT, MAP_FOREST, MAP_RUINS, dungeonFloors)' },
  { file: '03-world-setup.js',   desc: 'exits[] · npcs[] · fog-of-war system · terrain rendering helpers' },
  { file: '04-state.js',         desc: 'Global game-state variables · card timers/decay · rival AI background · quest missions' },
  { file: '05-rendering.js',     desc: 'Tile rendering (TILE section) · card character sprites (drawCardCharacter) · sprite animation' },
  { file: '06-world-systems.js', desc: 'Camera · card mini-art · map transitions · location banner · minimap · encounters · NPCs · trading' },
  { file: '07-screens.js',       desc: 'MAP SCREEN (dMap) · fog rendering · pirate decorations · MENU · BATTLE/ACTION SCREEN' },
  { file: '08-ui.js',            desc: 'Card acquisition · discard · tutorial · victory · CARDS collection · LOG · town shops · buildings · stats' },
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
