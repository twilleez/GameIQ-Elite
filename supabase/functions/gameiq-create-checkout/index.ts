import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
function decodeJwt(token:string){const part=token.split('.')[1];if(!part)throw new Error('Invalid token');const n=part.replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(n.padEnd(Math.ceil(n.length/4)*4,'=')));}

const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false});
async function vaultSecret(name:string){const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${name} limit 1`;return rows?.[0]?.decrypted_secret?String(rows[0].decrypted_secret):'';}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  const stripeKey=Deno.env.get('STRIPE_SECRET_KEY')||await vaultSecret('gameiq_stripe_api_key');
  const proPrice=Deno.env.get('STRIPE_PRO_PRICE_ID')||await vaultSecret('gameiq_stripe_pro_price_id');
  const appUrl=Deno.env.get('GAMEIQ_APP_URL')||'https://twilleez.github.io/GameIQ-Elite/';
  if(!stripeKey||!proPrice)return json({error:'Billing is not configured'},503);

  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Authentication required'},401);
  let claims:any;try{claims=decodeJwt(token)}catch{return json({error:'Invalid access token'},401)}
  if(!claims?.sub)return json({error:'Invalid user identity'},401);

  let body:any;try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}
  if(body?.plan!=='pro')return json({error:'Only the Pro plan is available for purchase'},400);

  const form=new URLSearchParams();
  form.set('mode','subscription');
  form.set('line_items[0][price]',proPrice);
  form.set('line_items[0][quantity]','1');
  form.set('success_url',`${appUrl}?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url',`${appUrl}?billing=cancelled`);
  form.set('client_reference_id',claims.sub);
  if(claims.email)form.set('customer_email',claims.email);
  form.set('metadata[profile_id]',claims.sub);
  form.set('metadata[plan]','pro');
  form.set('subscription_data[metadata][profile_id]',claims.sub);
  form.set('subscription_data[metadata][plan]','pro');
  form.set('allow_promotion_codes','true');

  const stripeRes=await fetch('https://api.stripe.com/v1/checkout/sessions',{
    method:'POST',
    headers:{Authorization:`Bearer ${stripeKey}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:form
  });
  const data=await stripeRes.json();
  if(!stripeRes.ok){console.error('Stripe checkout error',stripeRes.status,data?.error?.message||data);return json({error:'Unable to start checkout'},502)}
  return json({url:data.url});
});
