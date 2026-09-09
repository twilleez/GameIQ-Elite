import fs from 'node:fs';
const path='index.html';
let html=fs.readFileSync(path,'utf8');
function replaceOnce(label,from,to){if(!html.includes(from))throw new Error(`Entitlement patch failed: missing ${label}`);html=html.replace(from,to)}

replaceOnce('account signed-out copy',
  '<p class="api-key-note">Sign in to unlock Pro/Team billing and the hosted AI Coach (no API key needed). We\'ll email you a one-time sign-in link — no password.</p>',
  '<p class="api-key-note">Sign in to manage Pro billing and use the hosted AI Coach (no API key needed). We\'ll email you a one-time sign-in link — no password.</p>');

replaceOnce('auth state handler',
`async function onAuthChange(){
  renderAccountUI();
  if(!authUser){return}
  // Pull server-side tier and reconcile into local state.
  // Phase 1: profiles.tier is always 'free' until Stripe (Phase 2) writes to it.
  // This intentionally never *lowers* trust below what Phase 2/3 will enforce —
  // it only ever sets S.tier from the server, never lets the client invent a tier.
  try{
    const {data,error}=await sb.from("profiles").select("tier,email").eq("id",authUser.id).single();
    if(!error&&data){
      S.tier=data.tier;
      persist();updateTierUI();renderAccountUI();
    }
  }catch(e){/* offline or RLS misconfigured — fail closed, keep local tier */}
}`,
`async function onAuthChange(){
  if(!authUser){
    S.tier="free";
    persist();updateTierUI();renderAccountUI();
    return;
  }
  try{
    const {data,error}=await sb.from("profiles").select("tier,email").eq("id",authUser.id).single();
    if(error||!data)throw error||new Error("Profile unavailable");
    S.tier=(data.tier==="pro"||data.tier==="team")?data.tier:"free";
  }catch(e){
    S.tier="free";
  }
  persist();updateTierUI();renderAccountUI();
}`);

replaceOnce('sign out fail closed',
`async function signOut(){
  if(!sb)return;
  await sb.auth.signOut();
  authUser=null;
  renderAccountUI();
  toast("Signed out");
}`,
`async function signOut(){
  if(!sb)return;
  await sb.auth.signOut();
  authUser=null;
  S.tier="free";
  persist();updateTierUI();renderAccountUI();
  toast("Signed out");
}`);

replaceOnce('startup fail closed',
`  await openDB();
  await hydrate();
  initAuth();`,
`  await openDB();
  await hydrate();
  S.tier="free";
  updateTierUI();
  initAuth();`);

fs.writeFileSync(path,html);
console.log('Fail-closed entitlement patch applied successfully.');
