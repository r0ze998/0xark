// Encode generated masters for the browser without changing their composition.
// Run from repository root after image generation. Requires ImageMagick convert.
import { readdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const directory = resolve('solana/client/public/img/cards/archive');
const masters = readdirSync(directory).filter(name => /^\d{3}-.+\.png$/.test(name));
let bytes = 0;
for (const name of masters) {
  const source = resolve(directory, name);
  const destination = source.replace(/\.png$/, '.webp');
  const temporary = destination.replace(/\.webp$/, '.encoding.webp');
  try {
    execFileSync('convert', [source, '-quality', '90', temporary]);
    if (!statSync(temporary).size) throw new Error(`Empty output for ${name}`);
    const dimensions = file => execFileSync('identify', ['-format', '%wx%h', file], { encoding: 'utf8' });
    if (dimensions(source) !== dimensions(temporary)) throw new Error(`Changed dimensions for ${name}`);
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
  bytes += statSync(destination).size;
}
console.log(`Encoded ${masters.length} individual masters as WebP; ${(bytes / 1024 / 1024).toFixed(2)} MiB. Original PNGs unchanged.`);
