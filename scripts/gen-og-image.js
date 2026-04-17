/**
 * Generate og-image.png from og-image.svg
 *
 * Usage:
 *   npm install @resvg/resvg-js  # one-time
 *   node scripts/gen-og-image.js
 *
 * Outputs: og-image.png (1200x630)
 * Requires: @resvg/resvg-js (pure Rust SVG renderer, no system deps)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function main() {
  let Resvg;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch {
    console.error('Missing @resvg/resvg-js — run: npm install @resvg/resvg-js');
    process.exit(1);
  }

  const svgPath = join(root, 'og-image.svg');
  const pngPath = join(root, 'og-image.png');

  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render().asPng();
  writeFileSync(pngPath, pngData);
  console.log(`og-image.png written (${pngData.length} bytes)`);
}

main();
