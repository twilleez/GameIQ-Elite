import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoachInvite, acceptCoachInvite, normalizeInviteCode } from '../src/services/program-access.js';

test('normalizeInviteCode trims and uppercases', () => {
  assert.equal(normalizeInviteCode(' ab12cd34 '), 'AB12CD34');
});

test('createCoachInvite calls protected Edge Function with safe role', async () => {
  let call;
  const supabase = { functions: { invoke: async (name, options) => { call = { name, options }; return { data: { code: 'ABC12345' }, error: null }; } } };
  const result = await createCoachInvite(supabase, 'org-1', 'admin');
  assert.equal(call.name, 'gameiq-program-access');
  assert.deepEqual(call.options.body, { action: 'create', organizationId: 'org-1', role: 'coach' });
  assert.equal(result.code, 'ABC12345');
});

test('acceptCoachInvite sends normalized code', async () => {
  let body;
  const supabase = { functions: { invoke: async (_name, options) => { body = options.body; return { data: { organizationId: 'org-1', role: 'coach' }, error: null }; } } };
  await acceptCoachInvite(supabase, ' xy98zz76 ');
  assert.deepEqual(body, { action: 'accept', code: 'XY98ZZ76' });
});

test('program access rejects incomplete requests', async () => {
  const supabase = { functions: { invoke: async () => ({ data: {}, error: null }) } };
  await assert.rejects(createCoachInvite(supabase, ''), /organizationId/);
  await assert.rejects(acceptCoachInvite(supabase, '   '), /Invite code/);
});
