import test from 'node:test';
import assert from 'node:assert/strict';
import { clientRef, retryDelayMs, withRetry, shouldPushLocal } from '../src/services/cloud-sync.js';

test('clientRef is stable for the same local entity', () => {
  assert.equal(clientRef('team', 'td'), 'team:td');
  assert.equal(clientRef('game', 42), 'game:42');
});

test('clientRef rejects incomplete identity', () => {
  assert.throws(() => clientRef('', 'x'));
  assert.throws(() => clientRef('shot', null));
});

test('retryDelayMs backs off and caps', () => {
  assert.equal(retryDelayMs(0, 500, 3000), 500);
  assert.equal(retryDelayMs(1, 500, 3000), 1000);
  assert.equal(retryDelayMs(2, 500, 3000), 2000);
  assert.equal(retryDelayMs(3, 500, 3000), 3000);
  assert.equal(retryDelayMs(8, 500, 3000), 3000);
});

test('withRetry succeeds after transient failures and stays bounded', async () => {
  let calls = 0;
  const sleeps = [];
  const value = await withRetry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary');
    return 'ok';
  }, { attempts: 3, baseMs: 10, sleep: async (ms) => { sleeps.push(ms); } });
  assert.equal(value, 'ok');
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [10, 20]);
});

test('withRetry stops after configured attempts', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; throw new Error('offline'); }, { attempts: 2, sleep: async () => {} }),
    /offline/,
  );
  assert.equal(calls, 2);
});

test('shouldPushLocal prefers newer local state', () => {
  assert.equal(shouldPushLocal('2026-08-27T12:00:00Z', '2026-08-27T11:59:00Z'), true);
  assert.equal(shouldPushLocal('2026-08-27T11:00:00Z', '2026-08-27T12:00:00Z'), false);
  assert.equal(shouldPushLocal('2026-08-27T12:00:00Z', null), true);
  assert.equal(shouldPushLocal(null, '2026-08-27T12:00:00Z'), false);
});
