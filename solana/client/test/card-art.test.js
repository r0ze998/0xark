import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ALL_CARD_IDS, getCard } from '../src/lib/cards.js';
import { CARD_NAMES, FACTION_NAMES } from '../src/components/common/Card.js';
import { ART_BRIEFS, cardArtUrl } from '../src/lib/card-art-briefs.js';

test('all 60 art briefs and unique image paths match actual catalog identities', () => {
  assert.deepEqual(ART_BRIEFS.map(brief => brief.id), ALL_CARD_IDS);
  assert.equal(new Set(ART_BRIEFS.map(brief => cardArtUrl(brief.id))).size, 60);
  const rarities = ['Common', 'Uncommon', 'Rare', 'Legendary'];
  for (const brief of ART_BRIEFS) {
    const card = getCard(brief.id);
    assert.equal(brief.name, CARD_NAMES[brief.id]);
    assert.equal(brief.faction, FACTION_NAMES[card.faction]);
    assert.equal(brief.rarity, rarities[card.rarity]);
    assert.match(cardArtUrl(brief.id), /^public\/img\/cards\/archive\/\d{3}-[a-z]+(?:-[a-z]+)*\.webp$/);
    for (const key of ['concept', 'silhouette', 'motifs', 'continuity']) {
      assert.ok(brief[key]?.trim(), `Card ${brief.id} requires ${key}`);
    }
  }
  assert.throws(() => cardArtUrl(0), RangeError);
  assert.throws(() => cardArtUrl(61), RangeError);
});

test('public art review imports only rendering and catalog modules', () => {
  const allowed = new Set([
    'src/card-art.js', 'src/lib/cards.js', 'src/lib/card-art-briefs.js',
    'src/components/common/Card.js', 'src/lib/inject-style.js',
    'src/style/card.js', 'src/lib/px-icons.js',
  ]);
  const root = new URL('../', import.meta.url);
  const visited = new Set();
  function visit(url) {
    const path = url.href.slice(root.href.length);
    assert.ok(allowed.has(path), `Unexpected art gallery dependency: ${path}`);
    if (visited.has(path)) return;
    visited.add(path);
    const source = readFileSync(url, 'utf8');
    for (const match of source.matchAll(/^import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm)) {
      visit(new URL(match[1], url));
    }
    assert.doesNotMatch(source, /\bimport\s*\(/, `Dynamic imports require an explicit review: ${path}`);
  }
  visit(new URL('src/card-art.js', root));
  assert.equal(visited.size, allowed.size);
});

test('all 60 catalog illustrations exist as distinct nonempty WebP assets', () => {
  const hashes = new Set();
  for (const id of ALL_CARD_IDS) {
    const bytes = readFileSync(new URL(`../${cardArtUrl(id)}`, import.meta.url));
    assert.ok(bytes.length > 1000, `Card ${id} has an empty or invalid illustration`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `Card ${id} is truncated`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.ok(!hashes.has(hash), `Card ${id} repeats another illustration`);
    hashes.add(hash);
  }
  assert.equal(hashes.size, 60);
});
