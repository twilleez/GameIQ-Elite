export async function startCheckout(supabase, plan){
  if(!supabase) throw new Error('Supabase client is required');
  if(!['pro','team'].includes(plan)) throw new Error('Unknown plan');
  const {data,error}=await supabase.functions.invoke('gameiq-create-checkout',{body:{plan}});
  if(error) throw error;
  if(!data?.url) throw new Error(data?.error||'Checkout URL was not returned');
  return data.url;
}
