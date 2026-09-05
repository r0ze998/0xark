import test from 'node:test';
import assert from 'node:assert/strict';
import { computeEnergy, EnergyHudHTML, ENERGY_MAX, ENERGY_REGEN_SECS } from '../src/components/common/energy-hud.js';

const anchor = 1_000_000;

test('missing or malformed chain data stays unknown instead of becoming zero or regenerating', () => {
  for (const ps of [null, undefined, {}, { energy: 0 }, { energyLastTs: anchor },
    { energy: null, energyLastTs: anchor }, { energy: -1, energyLastTs: anchor },
    { energy: 6, energyLastTs: anchor }, { energy: 1, energyLastTs: NaN }]) {
    assert.deepEqual(computeEnergy(ps, anchor + 10 * ENERGY_REGEN_SECS), {
      energyNow: null, nextPipInSecs: null, max: ENERGY_MAX,
    });
  }
});

test('known zero remains playable-state truth, then regenerates at the four-hour boundary', () => {
  const ps = { energy: 0, energyLastTs: anchor };
  assert.equal(computeEnergy(ps, anchor).energyNow, 0);
  assert.equal(computeEnergy(ps, anchor + ENERGY_REGEN_SECS - 1).nextPipInSecs, 1);
  assert.deepEqual(computeEnergy(ps, anchor + ENERGY_REGEN_SECS), {
    energyNow: 1, nextPipInSecs: ENERGY_REGEN_SECS, max: ENERGY_MAX,
  });
});

test('projection caps at five and future anchors do not subtract energy', () => {
  assert.deepEqual(computeEnergy({ energy: 3, energyLastTs: anchor }, anchor + 10 * ENERGY_REGEN_SECS), {
    energyNow: ENERGY_MAX, nextPipInSecs: null, max: ENERGY_MAX,
  });
  assert.deepEqual(computeEnergy({ energy: 2, energyLastTs: anchor }, anchor - 60), {
    energyNow: 2, nextPipInSecs: ENERGY_REGEN_SECS, max: ENERGY_MAX,
  });
});

test('unknown HUD explains unavailability and disables its native refill button', () => {
  const markup = EnergyHudHTML(null, { refill: true });
  assert.match(markup, /ENERGY UNKNOWN/);
  assert.match(markup, /—\/5/);
  assert.match(markup, /<button[^>]*aria-label="Refill energy for 0\.003 SOL"[^>]*disabled/);
  assert.doesNotMatch(markup, /class="ep ep--on"/);
});
