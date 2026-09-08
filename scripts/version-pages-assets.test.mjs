import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { versionAsset, versionPages } from './version-pages-assets.mjs';
const sha = 'a'.repeat(40);
test('only local JS/CSS paths get a stable revision, preserving queries and fragments',()=>{
  assert.equal(versionAsset('../app.js',sha),`../app.js?v=${sha}`);
  assert.equal(versionAsset('./config.js?x=1#part',sha),`./config.js?x=1&v=${sha}#part`);
  for(const url of ['https://cdn.example/sdk.js','//cdn.example/style.css','data:text/css,a','card.webp','?view=prizes','No data.js here']) assert.equal(versionAsset(url,sha),url);
  assert.equal(versionAsset(versionAsset('src/runtime.js',sha),sha),`src/runtime.js?v=${sha}`);
});
test('entrypoints and transitive imports use the same revision without editing tests or assets',async()=>{
  const root=await mkdtemp(join(tmpdir(),'oxark-pages-'));
  try {
    await mkdir(join(root,'src'));await mkdir(join(root,'test'));
    await writeFile(join(root,'index.html'),'<script type="module" src="src/runtime.js"></script><link href="src/tokens.css" rel="stylesheet">');
    await writeFile(join(root,'src/runtime.js'),"import { x } from './config.js'; await import('../app.js'); classic('src/helper.js'); classic('https://cdn.example/sdk.js');");
    await writeFile(join(root,'app.js'),"import './src/screens.js';");
    await writeFile(join(root,'test/a.js'),"import '../app.js';");
    assert.equal(await versionPages(root,sha),3);
    assert.match(await readFile(join(root,'index.html'),'utf8'),new RegExp('runtime.js\\?v='+sha));
    const runtime=await readFile(join(root,'src/runtime.js'),'utf8');
    for(const name of ['config.js','app.js','helper.js']) assert.ok(runtime.includes(name+'?v='+sha));
    assert.ok(runtime.includes("'https://cdn.example/sdk.js'"));
    assert.equal(await readFile(join(root,'test/a.js'),'utf8'),"import '../app.js';");
    assert.equal(await versionPages(root,sha),0);
    await assert.rejects(versionPages(root,'short'),/full Git commit/);
  } finally { await rm(root,{recursive:true,force:true}); }
});
