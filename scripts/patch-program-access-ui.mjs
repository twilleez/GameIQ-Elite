import fs from 'node:fs';

const path='index.html';
let html=fs.readFileSync(path,'utf8');

function replaceOnce(target,replacement,label){
  const count=html.split(target).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  html=html.replace(target,replacement);
}

const teamsBlock=`    <!-- TEAMS -->
    <div class="view" id="view-teams">
      <div class="gcols">
        <div class="card"><div class="card-head"><div><h2>Team Management</h2></div></div>
          <div class="card-body">
            <div style="display:flex;gap:8px;margin-bottom:14px"><input id="newTeamName" placeholder="New team name" style="flex:1" maxlength="40"/><button class="btn btn-primary" id="createTeamBtn">Create</button></div>
            <div id="teamsList"></div>
          </div>
        </div>
        <div class="card"><div class="card-head"><div><h2>Roster Summary</h2></div></div><div class="card-body" id="teamSummaryBody"></div></div>
      </div>
    </div>`;
const teamsReplacement=`    <!-- TEAMS -->
    <div class="view" id="view-teams">
      <div class="gcols">
        <div class="card"><div class="card-head"><div><h2>Team Management</h2></div></div>
          <div class="card-body">
            <div style="display:flex;gap:8px;margin-bottom:14px"><input id="newTeamName" placeholder="New team name" style="flex:1" maxlength="40"/><button class="btn btn-primary" id="createTeamBtn">Create</button></div>
            <div id="teamsList"></div>
          </div>
        </div>
        <div class="card"><div class="card-head"><div><h2>Roster Summary</h2></div></div><div class="card-body" id="teamSummaryBody"></div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-head"><div><h2>Program Access</h2><p>Invite another coach or join an existing program securely.</p></div><span class="chip" id="programAccessState">Sign in required</span></div>
        <div class="card-body">
          <div class="gcols">
            <div>
              <div style="font-size:12px;font-weight:800;margin-bottom:8px">Invite a coach</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <select id="programInviteRole" style="min-width:120px"><option value="coach">Coach</option><option value="viewer">Viewer</option></select>
                <button class="btn btn-primary" id="createProgramInviteBtn">Create invite code</button>
              </div>
              <div id="programInviteResult" class="hidden" style="margin-top:10px;padding:12px;border:1px solid var(--line2);border-radius:12px;background:rgba(77,159,255,.07)">
                <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px">Invite code</div>
                <div id="programInviteCode" style="font-family:'DM Mono',monospace;font-size:22px;font-weight:800;letter-spacing:2px;margin-top:4px"></div>
                <div style="font-size:11px;color:var(--muted);margin-top:5px">Valid for 7 days. Share only with the intended coach.</div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:800;margin-bottom:8px">Join a program</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <input id="programInviteInput" placeholder="8-character invite code" maxlength="8" autocomplete="off" style="flex:1;min-width:180px;text-transform:uppercase"/>
                <button class="btn btn-secondary" id="acceptProgramInviteBtn">Join program</button>
              </div>
              <p style="font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px">Joining adds your signed-in account to the program with the role assigned by the owner.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
replaceOnce(teamsBlock,teamsReplacement,'program access team UI');

const renderAnchor=`function renderCompareView(){`;
const functions=`let programAccessModulePromise=null;
function loadProgramAccess(){
  if(!programAccessModulePromise)programAccessModulePromise=import('./src/services/program-access.js');
  return programAccessModulePromise;
}
async function createProgramInviteFromUI(){
  if(!sb||!authUser){toast('Sign in before creating an invite','err');openSettings();return}
  const btn=$("createProgramInviteBtn");if(btn)btn.disabled=true;
  try{
    const sync=await loadCloudSync();
    const access=await loadProgramAccess();
    const workspace=await sync.ensureWorkspace(sb,authUser);
    const role=$("programInviteRole")?.value||'coach';
    const data=await access.createCoachInvite(sb,workspace.id,role);
    const code=$("programInviteCode"),box=$("programInviteResult");
    if(code)code.textContent=data.code||'';
    if(box)box.classList.remove('hidden');
    toast('Program invite created','ok');
  }catch(e){toast(e?.message||'Could not create invite','err')}
  finally{if(btn)btn.disabled=false}
}
async function acceptProgramInviteFromUI(){
  if(!sb||!authUser){toast('Sign in before joining a program','err');openSettings();return}
  const input=$("programInviteInput"),btn=$("acceptProgramInviteBtn");
  const code=input?.value||'';if(btn)btn.disabled=true;
  try{
    const access=await loadProgramAccess();
    await access.acceptCoachInvite(sb,code);
    if(input)input.value='';
    toast('Program joined ✓','ok');
    await pullCloudGamesToDevice();
    doRender();
  }catch(e){toast(e?.message||'Could not join program','err')}
  finally{if(btn)btn.disabled=false}
}
function renderProgramAccessUI(){
  const state=$("programAccessState");
  if(state)state.textContent=authUser?'Signed in':'Sign in required';
  const createBtn=$("createProgramInviteBtn"),acceptBtn=$("acceptProgramInviteBtn");
  if(createBtn)createBtn.disabled=!authUser;
  if(acceptBtn)acceptBtn.disabled=!authUser;
}

function renderCompareView(){`;
replaceOnce(renderAnchor,functions,'program access functions');

const renderTeamsTail=`  if(ts){
    ts.innerHTML=S.teams.map(t=>\`<option value="\${t.id}"\${t.id===S.activeTeamId?" selected":""}>\${esc(t.name)}</option>\`).join("");
  }
}`;
const renderTeamsTailReplacement=`  if(ts){
    ts.innerHTML=S.teams.map(t=>\`<option value="\${t.id}"\${t.id===S.activeTeamId?" selected":""}>\${esc(t.name)}</option>\`).join("");
  }
  renderProgramAccessUI();
}`;
replaceOnce(renderTeamsTail,renderTeamsTailReplacement,'program access render state');

const initAnchor=`  const proCheckout=$("startProCheckoutBtn");
  if(proCheckout)proCheckout.addEventListener("click",()=>startCheckout("pro"));`;
const initReplacement=`  const proCheckout=$("startProCheckoutBtn");
  if(proCheckout)proCheckout.addEventListener("click",()=>startCheckout("pro"));
  const createProgramInviteBtn=$("createProgramInviteBtn");
  if(createProgramInviteBtn)createProgramInviteBtn.addEventListener("click",createProgramInviteFromUI);
  const acceptProgramInviteBtn=$("acceptProgramInviteBtn");
  if(acceptProgramInviteBtn)acceptProgramInviteBtn.addEventListener("click",acceptProgramInviteFromUI);
  const programInviteInput=$("programInviteInput");
  if(programInviteInput)programInviteInput.addEventListener("keydown",e=>{if(e.key==="Enter")acceptProgramInviteFromUI()});`;
replaceOnce(initAnchor,initReplacement,'program access listeners');

fs.writeFileSync(path,html);
console.log('Applied Program Access UI patch.');
