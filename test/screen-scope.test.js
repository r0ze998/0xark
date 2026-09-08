import test from 'node:test';
import assert from 'node:assert/strict';
import { createScreenScope } from '../src/lib/screen-scope.js';

test('a disposed mount releases resources once and immediately releases late resources', () => {
  const scope = createScreenScope();
  const released = [];
  const releaseEarly = scope.defer(() => released.push('early'));
  scope.defer(() => { assert.equal(scope.active, false); released.push('last'); });
  releaseEarly(); releaseEarly();
  scope.dispose(); scope.dispose();
  scope.defer(() => released.push('late'));
  assert.deepEqual(released, ['early', 'last', 'late']);
});

test('unmount cancels nested animation timers without affecting another mount', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const oldScope = createScreenScope();
  const newScope = createScreenScope();
  const frames = [];
  oldScope.timeout(() => {
    frames.push('old start');
    oldScope.timeout(() => frames.push('old finish'), 140);
  }, 120);
  t.mock.timers.tick(120);
  oldScope.dispose();
  oldScope.timeout(() => frames.push('late old frame'), 0);
  newScope.timeout(() => frames.push('new frame'), 140);
  t.mock.timers.tick(140);
  assert.deepEqual(frames, ['old start', 'new frame']);
  newScope.dispose();
});

test('a timer can be cancelled independently of its screen', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const scope = createScreenScope();
  let calls = 0;
  const cancel = scope.timeout(() => calls++, 100);
  cancel(); cancel();
  t.mock.timers.tick(100);
  assert.equal(calls, 0);
  assert.equal(scope.active, true);
  scope.dispose();
});

test('a failed cleanup cannot leave the other screen resources alive', () => {
  const scope = createScreenScope();
  let released = false;
  scope.defer(() => { released = true; });
  scope.defer(() => { throw new Error('cleanup failure'); });
  assert.throws(() => scope.dispose(), AggregateError);
  assert.equal(scope.active, false);
  assert.equal(released, true);
  assert.doesNotThrow(() => scope.dispose());
});
