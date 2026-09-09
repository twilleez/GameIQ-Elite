import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const auth=req.headers.get('Authorization')||'';
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
    const admin=createClient(url,service); const body=await req.json();
    if(body.action==='create'){
      const orgId=String(body.organizationId||''); const role=body.role==='viewer'?'viewer':'coach';
      const {data:membership}=await admin.from('organization_members').select('role').eq('organization_id',orgId).eq('profile_id',user.id).maybeSingle();
      if(!membership||!['owner','admin'].includes(membership.role))return new Response(JSON.stringify({error:'Not authorized'}),{status:403,headers:cors});
      const code=crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
      const {error}=await admin.from('organization_invites').insert({organization_id:orgId,code,role,created_by:user.id}); if(error)throw error;
      return new Response(JSON.stringify({code,expiresInDays:7}),{headers:cors});
    }
    if(body.action==='accept'){
      const code=String(body.code||'').trim().toUpperCase();
      const {data:invite,error}=await admin.from('organization_invites').select('*').eq('code',code).is('accepted_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
      if(error)throw error; if(!invite)return new Response(JSON.stringify({error:'Invite is invalid or expired'}),{status:400,headers:cors});
      const {error:memberError}=await admin.from('organization_members').upsert({organization_id:invite.organization_id,profile_id:user.id,role:invite.role},{onConflict:'organization_id,profile_id'}); if(memberError)throw memberError;
      const {error:updateError}=await admin.from('organization_invites').update({accepted_by:user.id,accepted_at:new Date().toISOString()}).eq('id',invite.id).is('accepted_at',null); if(updateError)throw updateError;
      return new Response(JSON.stringify({organizationId:invite.organization_id,role:invite.role}),{headers:cors});
    }
    return new Response(JSON.stringify({error:'Unknown action'}),{status:400,headers:cors});
  }catch(error){return new Response(JSON.stringify({error:String(error?.message||error)}),{status:500,headers:cors});}
});
