// Version the deployed module graph, not just its entrypoint. Otherwise a new
// module can import an old cached config and fail on a newly added export.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function versionAsset(url, revision) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(url) || !/\.(?:js|css)(?:[?#][^\s]*)?$/.test(url) || /\s/.test(url)) return url;
  const hashAt = url.indexOf('#'), hash = hashAt < 0 ? '' : url.slice(hashAt);
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const path = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = new URLSearchParams(queryAt < 0 ? '' : beforeHash.slice(queryAt + 1));
  query.set('v', revision);
  return `${path}?${query}${hash}`;
}
export async function versionPages(directory, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('A full Git commit SHA is required');
  let changed = 0;
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'test'].includes(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { await visit(path); continue; }
      if (!/\.(?:js|html)$/.test(entry.name)) continue;
      const source = await readFile(path, 'utf8');
      // Covers static imports, literal dynamic imports, classic script loaders
      // and HTML script/stylesheet attributes. External SDK URLs stay pinned.
      const output = source.replace(/(["'])([^"'\r\n]+)\1/g, (match, quote, url) => {
        const next = versionAsset(url, revision);
        return next === url ? match : quote + next + quote;
      });
      if (output !== source) { await writeFile(path, output); changed++; }
    }
  }
  await visit(directory);
  return changed;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: version-pages-assets.mjs <staged-pages-root> <commit-sha>');
  console.log(`Versioned ${await versionPages(resolve(process.argv[2]), process.argv[3])} page/module files.`);
}
