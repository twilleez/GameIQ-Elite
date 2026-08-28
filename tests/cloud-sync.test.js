import test from 'node:test';
import assert from 'node:assert/strict';
import { clientRef, shouldPushLocal } from '../src/services/cloud-sync.js';

test('clientRef is stable for the same local entity', () => {
  assert.equal(clientRef('team', 'td'), 'team:td');
  assert.equal(clientRef('game', 42), 'game:42');
});

test('clientRef rejects incomplete identity', () => {
  assert.throws(() => clientRef('', 'x'));
  assert.throws(() => clientRef('shot', null));
});

test('shouldPushLocal prefers newer local state', () => {
  assert.equal(shouldPushLocal('2026-08-27T12:00:00Z', '2026-08-27T11:59:00Z'), true);
  assert.equal(shouldPushLocal('2026-08-27T11:00:00Z', '2026-08-27T12:00:00Z'), false);
  assert.equal(shouldPushLocal('2026-08-27T12:00:00Z', null), true);
  assert.equal(shouldPushLocal(null, '2026-08-27T12:00:00Z'), false);
});
