import fs from 'node:fs';
const path='index.html';
let html=fs.readFileSync(path,'utf8');
function replaceOnce(source,target,replacement,label){const count=source.split(target).length-1;if(count!==1)throw new Error(`${label}: expected 1 match, found ${count}`);return source.replace(target,replacement)}
const anchor=`async function retryPendingCloudSync(){
  if(!sb||!authUser||!navigator.onLine)return;
  const pending=(S.games||[]).filter(g=>!g.cloudSyncedAt);
  for(const game of pending){
    await syncSavedGameToCloud(game,localTeamForSavedGame(game));
  }
}`;
const replacement=`async function retryPendingCloudSync(){
  if(!sb||!authUser||!navigator.onLine)return;
  const pending=(S.games||[]).filter(g=>!g.cloudSyncedAt);
  for(const game of pending){
    await syncSavedGameToCloud(game,localTeamForSavedGame(game));
  }
}
async function pullCloudGamesToDevice(){
  if(!sb||!authUser||!navigator.onLine)return false;
  try{
    const sync=await loadCloudSync();
    const hydrate=await import('./src/services/cloud-hydration.js');
    const workspace=await sync.ensureWorkspace(sb,authUser);
    const {data:cloudTeams,error}=await sb.from('teams').select('*').eq('organization_id',workspace.id).eq('archived',false).order('created_at',{ascending:true}).limit(1);
    if(error)throw error;
    const cloudTeam=cloudTeams?.[0];
    if(!cloudTeam)return false;
    const cloudState=await sync.pullTeamCloudState(sb,cloudTeam.id);
    const localTeam=S.teams.find(t=>t.id===S.activeTeamId)||S.teams[0];
    const hydrated=hydrate.cloudStateToLocal(cloudState,cloudTeam,localTeam?.id||'td');
    if(localTeam&&hydrated.team.players.length&&!localTeam.players.length)localTeam.players=hydrated.team.players.map(p=>({...p,stats:eq()}));
    S.games=hydrate.mergeCloudGames(S.games||[],hydrated.games||[]);
    await persist();
    setChip('Cloud up to date ✓','saving');
    doRender();
    return true;
  }catch(e){
    console.warn('GameIQ cloud pull deferred',e);
    return false;
  }
}`;
html=replaceOnce(html,anchor,replacement,'cloud hydration functions');
html=replaceOnce(html,`  retryPendingCloudSync();\n}`,`  retryPendingCloudSync().then(()=>pullCloudGamesToDevice());\n}`,'auth cloud pull');
html=replaceOnce(html,`  window.addEventListener("online",()=>{retryPendingCloudSync()});`,`  window.addEventListener("online",()=>{retryPendingCloudSync().then(()=>pullCloudGamesToDevice())});`,'online cloud pull');
html=replaceOnce(html,`    else if(navigator.onLine)retryPendingCloudSync();`,`    else if(navigator.onLine)retryPendingCloudSync().then(()=>pullCloudGamesToDevice());`,'foreground cloud pull');
fs.writeFileSync(path,html);
console.log('Applied second-device cloud hydration patch.');
