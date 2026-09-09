import fs from 'node:fs';

const path='index.html';
let html=fs.readFileSync(path,'utf8');

function replaceOnce(label,from,to){
  if(!html.includes(from)) throw new Error(`Patch failed: missing ${label}`);
  html=html.replace(from,to);
}

replaceOnce('legacy API key storage constant',
  'const SK="gameiq_v3",WK="gameiq_tutorial_v3",AK="gameiq_apikey";',
  'const SK="gameiq_v3",WK="gameiq_tutorial_v3";');

replaceOnce('free pricing button',
  '<button class="btn btn-secondary" style="width:100%" onclick="setTier(\'free\');document.getElementById(\'dlgPricing\').close()">Current plan</button>',
  '<button class="btn btn-secondary" style="width:100%" disabled>Free plan</button>');

replaceOnce('pro pricing button',
  '<button class="btn btn-pro" style="width:100%" onclick="setTier(\'pro\');document.getElementById(\'dlgPricing\').close()">Start Pro — $9.99/mo</button>',
  '<button class="btn btn-pro" id="startProCheckoutBtn" style="width:100%">Start Pro — $9.99/mo</button>');

replaceOnce('team feature promises',
  '<ul class="price-features"><li>Everything in Pro</li><li>Multi-coach access</li><li>Parent sharing portal</li><li>League admin dashboard</li><li>Custom branding</li><li>Priority support</li></ul>\n        <button class="btn btn-secondary" style="width:100%;border-color:rgba(157,126,252,.3);color:var(--team)" onclick="setTier(\'team\');document.getElementById(\'dlgPricing\').close()">Contact for Team plan</button>',
  '<ul class="price-features"><li>Everything in Pro</li><li>Program features are in controlled beta</li><li class="locked-feat">Multi-coach access — beta</li><li class="locked-feat">Parent sharing — planned</li><li class="locked-feat">League admin — planned</li><li class="locked-feat">Custom branding — planned</li></ul>\n        <button class="btn btn-secondary" style="width:100%;border-color:rgba(157,126,252,.3);color:var(--team)" disabled>Program plan — beta waitlist</button>');

replaceOnce('legal privacy copy',
  '<p style="font-size:11px;color:var(--dim)">Last updated 2025 · All data stored locally on your device only.</p>\n    <div style="font-size:12px;color:var(--muted);line-height:1.8;max-height:320px;overflow-y:auto;background:rgba(0,0,0,.2);border-radius:12px;padding:14px;margin-bottom:12px">\n      <strong style="color:var(--text)">Terms of Service</strong><br><br>GameIQ Elite is provided for personal coaching and statistical tracking. All data is stored locally in your browser. We do not collect, transmit, or sell your data.<br><br>\n      <strong style="color:var(--text)">Privacy Policy</strong><br><br>No personal data is sent to any server. The only external requests are Google Fonts and (when using AI Coach) Anthropic\'s API. Your API key is stored in localStorage only.<br><br>\n      <strong style="color:var(--text)">Children\'s Privacy</strong><br><br>If tracking minors, use jersey numbers or initials. Ensure appropriate consent from parents/guardians.\n    </div>',
  '<p style="font-size:11px;color:var(--dim)">Last updated August 26, 2026 · Local-first game data with optional account services.</p>\n    <div style="font-size:12px;color:var(--muted);line-height:1.8;max-height:320px;overflow-y:auto;background:rgba(0,0,0,.2);border-radius:12px;padding:14px;margin-bottom:12px">\n      <strong style="color:var(--text)">Terms of Service</strong><br><br>GameIQ Elite provides basketball coaching and statistical tools. Game statistics are stored locally in the browser in this release unless a feature explicitly states that it syncs to the cloud. Paid features are controlled by the signed-in account and server-side subscription status.<br><br>\n      <strong style="color:var(--text)">Privacy</strong><br><br>If you sign in, GameIQ uses Supabase to process account identifiers such as your email address and subscription tier. If you purchase a paid plan, billing is processed by Stripe. If you use hosted AI Coach, the question and relevant game context are sent through a protected GameIQ server function to the AI provider to generate a response. GameIQ does not require customers to provide an AI-provider API key.<br><br>\n      <strong style="color:var(--text)">Youth data</strong><br><br>Do not enter information that is unnecessary for basketball tracking. For minors, use jersey numbers or limited identifiers where practical and obtain any consent required by your organization and applicable law.\n    </div>');

replaceOnce('AI API key settings section',
  '    <div class="settings-section">\n      <h4>AI Coach — Anthropic API Key</h4>\n      <div class="api-key-wrap"><input type="password" id="apiKeyInput" placeholder="sk-ant-api03-…" autocomplete="off"/><button class="btn btn-primary" id="saveApiKeyBtn" style="white-space:nowrap">Save Key</button></div>\n      <p class="api-key-note">Stored only in this browser. Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>. Leave blank to clear.</p>\n    </div>\n',
  '    <div class="settings-section">\n      <h4>Hosted AI Coach</h4>\n      <p class="api-key-note">AI Coach uses the secure GameIQ server endpoint. No customer API key is stored in this browser. Sign in and maintain an eligible plan to use hosted AI.</p>\n    </div>\n');

replaceOnce('AI API key notice',
  '<div id="aiApiNotice" class="ai-api-notice hidden"><strong>Anthropic API key required</strong> AI Coach is powered by Claude. Add your API key in Settings.<br><button onclick="openSettings()">⚙ Open Settings</button></div>',
  '<div id="aiApiNotice" class="ai-api-notice hidden"><strong>Sign in required</strong> Hosted AI Coach is available to eligible signed-in accounts.<br><button onclick="openSettings()">⚙ Open account settings</button></div>');

replaceOnce('client tier setter',
  'function setTier(t){S.tier=t;persist();updateTierUI();toast("GameIQ "+t.toUpperCase()+" activated","ok")}',
  'function setTier(){toast("Plan access is controlled by your GameIQ account subscription.","err")}');

replaceOnce('legacy getApiKey/openSettings',
  'function openPricing(){$("dlgPricing").showModal()}\nfunction getApiKey(){return localStorage.getItem(AK)||""}\nfunction openSettings(){\n  const dlg=$("dlgSettings");if(!dlg)return;\n  const inp=$("apiKeyInput");if(inp)inp.value=getApiKey()?"············":"";\n  const secs=S.clock.periodSecs||600;',
  'function openPricing(){$("dlgPricing").showModal()}\nasync function requireSession(){\n  if(!sb){toast("Account services are unavailable","err");return null}\n  const {data,error}=await sb.auth.getSession();\n  if(error||!data?.session){toast("Sign in first to use this feature","err");openSettings();return null}\n  return data.session;\n}\nasync function startCheckout(plan){\n  const session=await requireSession();if(!session)return;\n  try{\n    const {data,error}=await sb.functions.invoke("gameiq-create-checkout",{body:{plan}});\n    if(error||!data?.url)throw new Error(error?.message||data?.error||"Checkout unavailable");\n    window.location.assign(data.url);\n  }catch(e){toast("Billing is not configured yet. Please try again later.","err")}\n}\nfunction openSettings(){\n  const dlg=$("dlgSettings");if(!dlg)return;\n  const secs=S.clock.periodSecs||600;');

replaceOnce('AI coach key visibility',
  'function renderAICoachView(){\n  const notice=$("aiApiNotice");\n  if(notice){\n    const hasKey=!!getApiKey();\n    notice.classList.toggle("hidden",hasKey||!isPro());\n  }',
  'function renderAICoachView(){\n  const notice=$("aiApiNotice");\n  if(notice)notice.classList.toggle("hidden",!!authUser||!isPro());');

const aiStart=html.indexOf('async function sendAIMessage(){');
const aiEnd=html.indexOf('\nfunction populateShotSel(){',aiStart);
if(aiStart<0||aiEnd<0)throw new Error('Patch failed: AI message function boundaries');
const hostedAI=`async function sendAIMessage(){
  if(!isPro()){openPricing();return}
  const session=await requireSession();if(!session)return;
  const inp=$("aiInput");if(!inp)return;
  const msg=inp.value.trim();if(!msg)return;
  inp.value="";
  const history=S.aiChat.slice(-8).map(m=>({role:m.role,content:m.content}));
  S.aiChat.push({role:"user",content:msg});
  renderAIChat();
  const wrap=$("aiChatMessages");
  if(wrap){const t=document.createElement("div");t.className="ai-msg assistant thinking";t.id="aiThinking";t.textContent="Analyzing your game data…";wrap.appendChild(t);wrap.scrollTop=wrap.scrollHeight;}
  const sendBtn=$("aiSendBtn");if(sendBtn)sendBtn.disabled=true;inp.disabled=true;
  try{
    const tt=totTeam();
    const context=\`You are an expert basketball coach AI. Current game data:
Team: \${team().name}
Score: Home \${pts(tt)} - Away \${S.awayScore}
Quarter: Q\${S.quarter}
Team stats: \${pts(tt)} pts, \${pct(fgm(tt),fga(tt))}% FG, \${efgpct(tt)}% eFG, \${tt.reb} reb, \${tt.ast} ast, \${tt.tov} tov
Players: \${team().players.map(p=>{const t=totPlayer(p);return \`#\${p.num} \${p.name}: \${pts(t)}pts \${pct(fgm(t),fga(t))}%FG \${t.fouls}fouls\`}).join("; ")}
Be concise, direct, and actionable. Max 3 sentences unless explaining something complex.\`;
    const {data,error}=await sb.functions.invoke("gameiq-ai-coach",{body:{message:msg,context,history}});
    if(error||!data?.reply)throw new Error(error?.message||data?.error||"AI unavailable");
    document.getElementById("aiThinking")?.remove();
    S.aiChat.push({role:"assistant",content:data.reply});persist();renderAIChat();
  }catch(e){
    document.getElementById("aiThinking")?.remove();
    S.aiChat.push({role:"assistant",content:"AI Coach is temporarily unavailable. Confirm your account and try again."});renderAIChat();
  }finally{if(sendBtn)sendBtn.disabled=false;inp.disabled=false;inp.focus()}
}
`;
html=html.slice(0,aiStart)+hostedAI+html.slice(aiEnd+1);

const saveKeyStart=html.indexOf('  const saveApiKeyBtn=$("saveApiKeyBtn");');
const periodStart=html.indexOf('  document.querySelectorAll(".period-btn")',saveKeyStart);
if(saveKeyStart<0||periodStart<0)throw new Error('Patch failed: legacy save API key handler');
html=html.slice(0,saveKeyStart)+html.slice(periodStart);

replaceOnce('checkout listener insertion',
  '  const acctSignOutBtn=$("acctSignOutBtn");\n  if(acctSignOutBtn)acctSignOutBtn.addEventListener("click",signOut);',
  '  const acctSignOutBtn=$("acctSignOutBtn");\n  if(acctSignOutBtn)acctSignOutBtn.addEventListener("click",signOut);\n  const proCheckout=$("startProCheckoutBtn");\n  if(proCheckout)proCheckout.addEventListener("click",()=>startCheckout("pro"));\n  const billingState=new URLSearchParams(location.search).get("billing");\n  if(billingState==="success")toast("Subscription checkout completed. Updating your plan…","ok");\n  if(billingState==="cancelled")toast("Checkout cancelled");');

replaceOnce('service worker registration anchor',
  '  doRender();\n}\n\nwindow.openPricing=openPricing;',
  '  doRender();\n  if("serviceWorker" in navigator){\n    navigator.serviceWorker.register("./sw.js").catch(()=>{});\n  }\n}\n\nwindow.openPricing=openPricing;');

replaceOnce('public setTier export',
  'window.setTier=setTier;\n',
  'window.setTier=setTier;\nwindow.startCheckout=startCheckout;\n');

fs.writeFileSync(path,html);
console.log('Production UI patch applied successfully.');
