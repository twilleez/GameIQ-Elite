import fs from 'node:fs';

const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

if (s.includes('id="dlgWelcome"')) {
  console.log('First-launch onboarding already applied.');
  process.exit(0);
}

s = s.replace(
  'Pick Made / Miss / FT, then tap the court',
  'Pick Made or Miss, then tap the court. For FT, choose Made FT or Miss FT'
);

const settingsMarker = '<dialog id="dlgSettings">';
if (!s.includes(settingsMarker)) throw new Error('Settings dialog marker not found');

const welcome = `<dialog id="dlgWelcome" style="max-width:560px;width:calc(100% - 28px)">
  <div class="modal">
    <h3>Welcome to GameIQ Elite</h3>
    <p>Track the game. Understand your players. Make better coaching decisions.</p>
    <div style="display:grid;gap:10px;margin-top:16px">
      <button class="btn btn-primary" id="welcomeSignInBtn">👤 Sign In</button>
      <button class="btn btn-gold" id="welcomeStartFreeBtn">🏀 Start Free</button>
      <button class="btn btn-secondary" id="welcomeDemoBtn">See how it works</button>
    </div>
    <p class="api-key-note" style="text-align:center;margin-top:12px">Start Free requires no credit card. Sign in later to sync across devices.</p>
  </div>
</dialog>
<dialog id="dlgFirstSetup" style="max-width:560px;width:calc(100% - 28px)">
  <div class="modal">
    <h3>Set up your team</h3>
    <p id="firstSetupStepLabel">Step 1 of 3</p>
    <div id="firstSetupStep1">
      <label>Team name</label>
      <input id="firstTeamName" placeholder="e.g. Trailblazers" style="width:100%;margin:8px 0 14px">
      <button class="btn btn-primary" id="firstTeamNextBtn" style="width:100%">Continue</button>
    </div>
    <div id="firstSetupStep2" class="hidden">
      <h4>Add players</h4>
      <p>Add your roster now, or skip and add players from Teams later.</p>
      <button class="btn btn-primary" id="firstAddPlayersBtn" style="width:100%;margin-bottom:8px">Add players</button>
      <button class="btn btn-secondary" id="firstSkipPlayersBtn" style="width:100%">Skip for now</button>
    </div>
    <div id="firstSetupStep3" class="hidden">
      <h4>You're ready</h4>
      <p>Your team is set up. Start your first game when you're ready.</p>
      <button class="btn btn-gold" id="firstStartGameBtn" style="width:100%">Start first game</button>
    </div>
  </div>
</dialog>
`;
s = s.replace(settingsMarker, welcome + settingsMarker);

const settingsFn = 'function openSettings(){';
if (!s.includes(settingsFn)) throw new Error('openSettings marker not found');
const helpers = `const FIRST_LAUNCH_KEY="gameiq_first_launch_v1";
function finishFirstLaunch(){try{localStorage.setItem(FIRST_LAUNCH_KEY,"1")}catch(e){}}
function showWelcomeIfNeeded(){if(!localStorage.getItem(FIRST_LAUNCH_KEY)&&!authUser)setTimeout(()=>$("dlgWelcome")?.showModal(),180)}
function openFirstSetup(){
  $("dlgWelcome")?.close();
  firstSetupStep(1);
  $("dlgFirstSetup")?.showModal();
}
function firstSetupStep(n){
  for(let i=1;i<=3;i++)$("firstSetupStep"+i)?.classList.toggle("hidden",i!==n);
  if($("firstSetupStepLabel"))$("firstSetupStepLabel").textContent=\`Step \${n} of 3\`;
}
`;
s = s.replace(settingsFn, helpers + settingsFn);

const accountMarker = '  const accountBtn=$("accountBtn");';
if (!s.includes(accountMarker)) throw new Error('account button binding marker not found');
const bindings = `  const welcomeSignInBtn=$("welcomeSignInBtn");
  if(welcomeSignInBtn)welcomeSignInBtn.addEventListener("click",()=>{$("dlgWelcome")?.close();openSettings();setTimeout(()=>$("acctEmailInput")?.focus(),50)});
  const welcomeStartFreeBtn=$("welcomeStartFreeBtn");
  if(welcomeStartFreeBtn)welcomeStartFreeBtn.addEventListener("click",openFirstSetup);
  const welcomeDemoBtn=$("welcomeDemoBtn");
  if(welcomeDemoBtn)welcomeDemoBtn.addEventListener("click",()=>{$("dlgWelcome")?.close();finishFirstLaunch();toast("Explore GameIQ, then add your own team when ready","ok")});
  const firstTeamNextBtn=$("firstTeamNextBtn");
  if(firstTeamNextBtn)firstTeamNextBtn.addEventListener("click",()=>{const name=$("firstTeamName")?.value?.trim();if(!name){toast("Enter a team name","err");return;}const t=team();if(t)t.name=name;persist();renderAll();firstSetupStep(2)});
  const firstAddPlayersBtn=$("firstAddPlayersBtn");
  if(firstAddPlayersBtn)firstAddPlayersBtn.addEventListener("click",()=>{$("dlgFirstSetup")?.close();finishFirstLaunch();switchView("teams");toast("Add players, then start your first game","ok")});
  const firstSkipPlayersBtn=$("firstSkipPlayersBtn");
  if(firstSkipPlayersBtn)firstSkipPlayersBtn.addEventListener("click",()=>firstSetupStep(3));
  const firstStartGameBtn=$("firstStartGameBtn");
  if(firstStartGameBtn)firstStartGameBtn.addEventListener("click",()=>{$("dlgFirstSetup")?.close();finishFirstLaunch();switchView("live");toast("Ready for your first game","ok")});
`;
s = s.replace(accountMarker, bindings + accountMarker);

const scriptEnd = '</script>';
if (!s.includes(scriptEnd)) throw new Error('script end not found');
s = s.replace(scriptEnd, '\nwindow.addEventListener("load",showWelcomeIfNeeded,{once:true});\n' + scriptEnd);

fs.writeFileSync(path, s);
console.log('Applied first-launch onboarding.');
