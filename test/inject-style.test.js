import test from 'node:test';
import assert from 'node:assert/strict';
import { injectStyle } from '../src/lib/inject-style.js';

function styleHost() {
  const children = [{ tagName: 'LINK', id: 'presentation' }];
  return {
    children,
    getElementById: id => children.find(node => node.id === id) ?? null,
    createElement: tag => ({ tagName: tag.toUpperCase() }),
    head: { appendChild: node => { children.push(node); } },
  };
}

test('lazy styles are immediately available and repeated mounts preserve cascade order', t => {
  const previous = globalThis.document;
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const host = globalThis.document = styleHost();
  const css = '\n.card { color: var(--text-cream); }\n';
  const card = injectStyle('card-style', css);
  const dialog = injectStyle('dialog-style', '.dialog { display: flex; }');

  assert.equal(card.tagName, 'STYLE');
  assert.equal(card.textContent, css);
  assert.deepEqual(host.children.map(node => node.id), ['presentation', 'card-style', 'dialog-style']);
  assert.equal(injectStyle('card-style', '.unrelated {}'), card);
  assert.equal(card.textContent, css, 'a remount must not replace the first stylesheet');
  assert.equal(host.children.length, 3);
  assert.equal(host.children.at(-1), dialog, 'a remount must not reorder the cascade');

  host.children.splice(host.children.indexOf(card), 1);
  assert.notEqual(injectStyle('card-style', css), card, 'removed styles can be installed again');
  assert.equal(host.children.at(-1).textContent, css);
});

test('style deduplication belongs to the document, not module-global state', t => {
  const previous = globalThis.document;
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  globalThis.document = styleHost();
  const first = injectStyle('shared-style', '.shared {}');
  const nextDocument = globalThis.document = styleHost();
  const second = injectStyle('shared-style', '.shared {}');
  assert.notEqual(second, first);
  assert.equal(nextDocument.children.at(-1), second);
});
