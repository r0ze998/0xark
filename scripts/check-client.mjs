// The browser client has no build step. Parse every JS file and link its static
// ES-module graph without evaluating game code, reading wallets or using a DOM.
// SourceTextModule requires Node's --experimental-vm-modules flag (see npm check).
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relative, sep } from 'node:path';
import { SourceTextModule } from 'node:vm';

const client = new URL('../solana/client/', import.meta.url);
const clientPath = fileURLToPath(client);

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === 'react') return [];
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) return javascriptFiles(url);
    return entry.name.endsWith('.js') ? [fileURLToPath(url)] : [];
  }).sort();
}

const files = javascriptFiles(client);
const modules = new Map();

function sourceModule(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const path = fileURLToPath(url);
  const local = relative(clientPath, path);
  if (local === '..' || local.startsWith('..' + sep)) {
    throw new Error(`Client import escapes its deployment directory: ${url.href}`);
  }
  const module = new SourceTextModule(readFileSync(path, 'utf8'), { identifier: url.href });
  modules.set(url.href, module);
  return module;
}

try {
  // Required entrypoints also make a wrong/empty scan root fail explicitly.
  sourceModule(new URL('app.js', client));
  sourceModule(new URL('src/runtime.js', client));
  for (const file of files) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    const local = relative(clientPath, file);
    if (local === 'app.js' || local.startsWith('src' + sep)) {
      sourceModule(pathToFileURL(file));
    }
  }
  for (const module of modules.values()) {
    if (module.status !== 'unlinked') continue;
    await module.link((specifier, importer) => {
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        throw new Error(`Unsupported browser import ${JSON.stringify(specifier)} in ${importer.identifier}`);
      }
      return sourceModule(new URL(specifier, importer.identifier));
    });
  }
  console.log(`Client check passed: ${files.length} JS files parsed; ${modules.size} source modules linked.`);
} catch (error) {
  console.error(error.stderr?.toString() || error.stack || error.message);
  process.exitCode = 1;
}
