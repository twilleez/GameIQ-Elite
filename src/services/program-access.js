const FUNCTION_NAME = 'gameiq-program-access';

function requireClient(supabase) {
  if (!supabase?.functions?.invoke) throw new Error('Program access is unavailable');
}

export function normalizeInviteCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function invokeProgramAccess(supabase, body) {
  requireClient(supabase);
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });
  if (error) throw new Error(error.message || 'Program access request failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createCoachInvite(supabase, organizationId, role = 'coach') {
  if (!organizationId) throw new Error('organizationId is required');
  const safeRole = role === 'viewer' ? 'viewer' : 'coach';
  return invokeProgramAccess(supabase, { action: 'create', organizationId, role: safeRole });
}

export async function acceptCoachInvite(supabase, code) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) throw new Error('Invite code is required');
  return invokeProgramAccess(supabase, { action: 'accept', code: normalized });
}

if (typeof window !== 'undefined') {
  window.GameIQProgramAccess = { createCoachInvite, acceptCoachInvite, normalizeInviteCode };
}
