export async function askGameIQAI(supabase, { message, context, history = [] }) {
  if (!supabase) throw new Error('Supabase client is required');
  const { data, error } = await supabase.functions.invoke('gameiq-ai-coach', {
    body: { message, context, history }
  });
  if (error) throw error;
  if (!data?.reply) throw new Error(data?.error || 'AI response was empty');
  return data.reply;
}
