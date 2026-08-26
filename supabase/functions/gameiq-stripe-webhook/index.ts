import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function verifyStripeSignature(raw:string,header:string,secret:string){
  const parts=header.split(',').map(p=>p.trim().split('='));
  const timestamp=parts.find(([k])=>k==='t')?.[1];
  const signatures=parts.filter(([k])=>k==='v1').map(([,v])=>v);
  if(!timestamp||!signatures.length)return false;
  if(Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected=hex(signed);return signatures.some(sig=>safeEqual(sig,expected));
}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const webhookSecret=Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!webhookSecret||!supabaseUrl||!serviceRole)return new Response('Server not configured',{status:503});
  const raw=await req.text();const signature=req.headers.get('stripe-signature')||'';
  if(!(await verifyStripeSignature(raw,signature,webhookSecret)))return new Response('Invalid signature',{status:400});
  let event:any;try{event=JSON.parse(raw)}catch{return new Response('Invalid JSON',{status:400})}
  const supabase=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false}});const obj=event?.data?.object||{};
  try{
    if(event.type==='checkout.session.completed'){
      const profileId=obj.client_reference_id||obj.metadata?.profile_id;const plan=obj.metadata?.plan;
      if(profileId&&(plan==='pro'||plan==='team'))await supabase.from('profiles').update({tier:plan,stripe_customer_id:typeof obj.customer==='string'?obj.customer:null}).eq('id',profileId);
    }
    if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'){
      const profileId=obj.metadata?.profile_id;const plan=obj.metadata?.plan;
      if(profileId&&(plan==='pro'||plan==='team')){
        await supabase.from('subscriptions').upsert({profile_id:profileId,stripe_subscription_id:obj.id,status:obj.status,price_id:obj.items?.data?.[0]?.price?.id||'',current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():new Date(0).toISOString(),updated_at:new Date().toISOString()},{onConflict:'stripe_subscription_id'});
        await supabase.from('profiles').update({tier:['active','trialing'].includes(obj.status)?plan:'free'}).eq('id',profileId);
      }
    }
    if(event.type==='customer.subscription.deleted'){
      const profileId=obj.metadata?.profile_id;
      if(profileId){
        await supabase.from('subscriptions').upsert({profile_id:profileId,stripe_subscription_id:obj.id,status:obj.status||'canceled',price_id:obj.items?.data?.[0]?.price?.id||'',current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():new Date(0).toISOString(),updated_at:new Date().toISOString()},{onConflict:'stripe_subscription_id'});
        await supabase.from('profiles').update({tier:'free'}).eq('id',profileId);
      }
    }
  }catch(error){console.error('Stripe webhook processing error',error);return new Response('Webhook processing failed',{status:500})}
  return new Response('ok',{status:200});
});
