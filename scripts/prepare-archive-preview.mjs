// Stage the existing buildless client for an isolated private design review.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const source = new URL('solana/client/', root);
const output = new URL('dist/', root);
await mkdir(output, { recursive: true });
for (const item of ['src', 'public', 'app.js']) {
  await cp(new URL(item, source), new URL(item, output), { recursive: true });
}
let html = await readFile(new URL('index.html', source), 'utf8');
// Force isolation even if someone deletes or changes the query string.
html = html.replace('<head>', `<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
  <script>window.OXARK_PREVIEW_ONLY = true;</script>`);
await writeFile(new URL('index.html', output), html);
console.log('Isolated practice assets prepared:', fileURLToPath(output));
