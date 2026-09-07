import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ArchiveCardStudy } from '../src/components/common/ArchiveCardStudy.js';
import { ALL_CARD_IDS, getCard } from '../src/lib/cards.js';
import { CARD_NAMES } from '../src/components/common/Card.js';

test('all card samples retain catalog identity, stats and existing icons', () => {
  const icons = readFileSync(new URL('../src/lib/px-icons.js', import.meta.url), 'utf8');
  for (const id of ALL_CARD_IDS) {
    const card = getCard(id);
    const html = ArchiveCardStudy({ id });
    assert.ok(html.includes(CARD_NAMES[id]));
    assert.ok(html.includes(`BP ${card.bp}, HP ${card.hp} of ${card.hp}, initiative ${card.ini}`));
    for (const [, icon] of html.matchAll(/href="#px-([a-z-]+)"/g)) assert.match(icons, new RegExp(`\\b${icon}:`));
    assert.doesNotMatch(html, /undefined|NaN/);
  }
});

test('sealed card samples hide identity and KO retains zero HP', () => {
  assert.doesNotMatch(ArchiveCardStudy({ id: 10, hidden: true }), /Sentinel|knight|LEGENDARY|010/);
  const html = ArchiveCardStudy({ id: 1, hp: 0, destroyed: true, action: 1 });
  assert.match(html, /HP 0 of 8/);
  assert.match(html, /KNOCKED OUT/);
});
