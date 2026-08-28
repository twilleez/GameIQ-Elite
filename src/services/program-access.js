export async function createCoachInvite(supabase, organizationId, role='coach') {
  if (!supabase?.functions || !organizationId) throw new Error('Program access is unavailable');
  const { data, error } = await supabase.functions.invoke('gameiq-program-access', { body: { action:'create', organizationId, role } });
  if (error) throw error; if (data?.error) throw new Error(data.error); return data;
}

export async function acceptCoachInvite(supabase, code) {
  if (!supabase?.functions || !String(code||'').trim()) throw new Error('Invite code is required');
  const { data, error } = await supabase.functions.invoke('gameiq-program-access', { body: { action:'accept', code:String(code).trim().toUpperCase() } });
  if (error) throw error; if (data?.error) throw new Error(data.error); return data;
}
