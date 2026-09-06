import fs from 'node:fs';

// One-time deterministic patch for the production candidate.
const path='index.html';
let html=fs.readFileSync(path,'utf8');

function replaceOnce(from,to,label){
  if(!html.includes(from)) throw new Error(`Missing expected source for ${label}`);
  html=html.replace(from,to);
}

replaceOnce(`      <div id="acctSignedIn" class="hidden">
        <p class="api-key-note" style="margin-top:0"><strong id="acctEmail" style="color:var(--text)"></strong> · plan: <span id="acctTier">free</span></p>
        <button class="btn btn-secondary" id="acctSignOutBtn" style="font-size:12px;min-height:34px">Sign out</button>
      </div>
    </div>
    <div class="settings-section">
      <h4>Hosted AI Coach</h4>`, `      <div id="acctSignedIn" class="hidden">
        <p class="api-key-note" style="margin-top:0"><strong id="acctEmail" style="color:var(--text)"></strong> · plan: <span id="acctTier">free</span></p>
        <button class="btn btn-secondary" id="acctSignOutBtn" style="font-size:12px;min-height:34px">Sign out</button>
      </div>
    </div>
    <div class="settings-section">
      <h4>Cloud Sync</h4>
      <div style="display:grid;gap:8px;font-size:12px">
        <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--muted)">Connection</span><strong id="syncDiagConnection">—</strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--muted)">Pending games</span><strong id="syncDiagPending">0</strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--muted)">Last cloud save</span><strong id="syncDiagLast">Never</strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--muted)">Last error</span><strong id="syncDiagError" style="text-align:right;max-width:250px">None</strong></div>
      </div>
      <button class="btn btn-secondary" id="retryCloudSyncBtn" style="font-size:12px;min-height:34px;margin-top:10px">↻ Retry cloud sync</button>
      <p class="api-key-note">Games always save on this device first. Cloud sync runs only when signed in and online.</p>
    </div>
    <div class="settings-section">
      <h4>Hosted AI Coach</h4>`, 'settings cloud sync panel');

replaceOnce(`function openSettings(){
  const dlg=$("dlgSettings");if(!dlg)return;
  const secs=S.clock.periodSecs||600;
  document.querySelectorAll(".period-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.secs)===secs));
  renderAccountUI();
  dlg.showModal();`, `function renderSyncDiagnostics(){
  const games=S.games||[];
  const pending=games.filter(g=>!g.cloudSyncedAt);
  const synced=games.filter(g=>g.cloudSyncedAt).sort((a,b)=>String(b.cloudSyncedAt).localeCompare(String(a.cloudSyncedAt)));
  const failed=[...pending].filter(g=>g.cloudSyncError).sort((a,b)=>String(b.lastCloudSyncAttemptAt||'').localeCompare(String(a.lastCloudSyncAttemptAt||'')));
  const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
  set('syncDiagConnection',!navigator.onLine?'Offline':authUser?'Online · signed in':'Online · sign in required');
  set('syncDiagPending',String(pending.length));
  set('syncDiagLast',synced[0]?.cloudSyncedAt?new Date(synced[0].cloudSyncedAt).toLocaleString():'Never');
  set('syncDiagError',failed[0]?.cloudSyncError||'None');
  const btn=$('retryCloudSyncBtn');if(btn)btn.disabled=!navigator.onLine||!authUser||pending.length===0;
}
function openSettings(){
  const dlg=$("dlgSettings");if(!dlg)return;
  const secs=S.clock.periodSecs||600;
  document.querySelectorAll(".period-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.secs)===secs));
  renderAccountUI();
  renderSyncDiagnostics();
  dlg.showModal();`, 'sync diagnostic renderer');

replaceOnce(`  const acctSignOutBtn=$("acctSignOutBtn");
  if(acctSignOutBtn)acctSignOutBtn.addEventListener("click",signOut);
  const proCheckout=$("startProCheckoutBtn");`, `  const acctSignOutBtn=$("acctSignOutBtn");
  if(acctSignOutBtn)acctSignOutBtn.addEventListener("click",signOut);
  const retryCloudSyncBtn=$("retryCloudSyncBtn");
  if(retryCloudSyncBtn)retryCloudSyncBtn.addEventListener("click",async()=>{
    retryCloudSyncBtn.disabled=true;
    await retryPendingCloudSync();
    renderSyncDiagnostics();
    toast((S.games||[]).some(g=>!g.cloudSyncedAt)?"Some games are still waiting to sync":"Cloud sync complete",(S.games||[]).some(g=>!g.cloudSyncedAt)?"":"ok");
  });
  const proCheckout=$("startProCheckoutBtn");`, 'sync retry handler');

replaceOnce(`  window.addEventListener('online',()=>retryPendingCloudSync());`, `  window.addEventListener('online',async()=>{await retryPendingCloudSync();renderSyncDiagnostics()});
  window.addEventListener('offline',renderSyncDiagnostics);`, 'connection diagnostics');

fs.writeFileSync(path,html);
console.log('Applied cloud sync diagnostics panel.');
