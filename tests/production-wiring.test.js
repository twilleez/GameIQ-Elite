import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ai=fs.readFileSync(new URL('../supabase/functions/gameiq-ai-coach/index.ts',import.meta.url),'utf8');
const checkout=fs.readFileSync(new URL('../supabase/functions/gameiq-create-checkout/index.ts',import.meta.url),'utf8');

test('browser uses hosted AI and ships no provider key workflow',()=>{
  assert.match(html,/functions\.invoke\("gameiq-ai-coach"/);
  assert.doesNotMatch(html,/api\.anthropic\.com/);
  assert.doesNotMatch(html,/gameiq_apikey/);
  assert.doesNotMatch(html,/id="apiKeyInput"/);
});

test('browser uses server checkout and cannot client-activate paid tiers',()=>{
  assert.match(html,/functions\.invoke\("gameiq-create-checkout"/);
  assert.match(html,/id="startProCheckoutBtn"/);
  assert.match(html,/Plan access is controlled by your GameIQ account subscription/);
  assert.doesNotMatch(html,/setTier\('pro'\)/);
  assert.doesNotMatch(html,/setTier\('team'\)/);
});

test('paid entitlement fails closed until server confirms it',()=>{
  assert.match(html,/if\(!authUser\)\{\s*S\.tier="free"/);
  assert.match(html,/catch\(e\)\{\s*S\.tier="free"/);
  assert.match(html,/await hydrate\(\);\s*S\.tier="free"/);
});

test('service worker is registered and Program plan is gated',()=>{
  assert.match(html,/navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(html,/Program plan — beta waitlist/);
  assert.doesNotMatch(html,/Contact for Team plan/);
});

test('privacy copy matches account, billing and AI data flows',()=>{
  assert.match(html,/Supabase to process account identifiers/);
  assert.match(html,/billing is processed by Stripe/);
  assert.match(html,/protected GameIQ server function/);
  assert.doesNotMatch(html,/No personal data is sent to any server/);
});

test('AI Edge Function enforces paid tier and uses current Sonnet identifier',()=>{
  assert.match(ai,/select\("tier"\)/);
  assert.match(ai,/profile\.tier !== "pro" && profile\.tier !== "team"/);
  assert.match(ai,/Pro subscription required/);
  assert.match(ai,/model: "claude-sonnet-5"/);
});

test('checkout Edge Function only sells launch-ready Pro plan',()=>{
  assert.match(checkout,/body\?\.plan!==['"]pro['"]/);
  assert.match(checkout,/Only the Pro plan is available for purchase/);
  assert.doesNotMatch(checkout,/STRIPE_TEAM_PRICE_ID/);
});

test('critical courtside controls expose keyboard focus and labels',()=>{
  assert.match(html,/button:focus-visible/);
  assert.match(html,/aria-label="Undo last stat change"/);
  assert.match(html,/role="button" tabindex="0" aria-label="Game clock/);
  assert.match(html,/aria-label="Interactive basketball shot chart/);
  assert.match(html,/document\.body\.classList\.toggle\("game-focus"/);
});
