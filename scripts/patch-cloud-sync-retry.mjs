import fs from 'node:fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

function replaceOnce(source, target, replacement, label) {
  const count = source.split(target).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  return source.replace(target, replacement);
}

const oldBlock = `async function syncSavedGameToCloud(game,localTeam){
  if(!game||game.cloudSyncedAt||!sb||!authUser||!navigator.onLine)return false;
  try{
    const sync=await loadCloudSync();
    const workspace=await sync.ensureWorkspace(sb,authUser);
    const syncedTeam=await sync.syncTeam(sb,authUser,workspace.id,localTeam);
    const shots=(game.shots||[]).map((shot,index)=>({
      id:shot.id??(game.id+'-'+index),
      playerId:shot.pid==null?null:(syncedTeam.playerMap.get(sync.clientRef('player',shot.pid))||null),
      made:Boolean(shot.made),
      points:is3pt(shot.x,shot.y)?3:2,
      x:shot.x??null,y:shot.y??null,
      period:shot.q??shot.period??game.quarter??1,
      clockSeconds:shot.clockSeconds??null,
      localUpdatedAt:game.localUpdatedAt
    }));
    await sync.syncGameBundle(sb,authUser,syncedTeam.team.id,{
      id:game.id,date:game.date,awayName:game.away,quarter:game.quarter,
      teamScore:game.teamPts,awayScore:game.awayScore,periodSeconds:S.clock?.periodSecs||600,
      status:'final',localUpdatedAt:game.localUpdatedAt,shots
    });
    game.cloudSyncedAt=new Date().toISOString();
    await persist();
    setChip('Cloud synced ✓','saving');
    return true;
  }catch(e){
    console.warn('GameIQ cloud sync deferred',e);
    return false;
  }
}`;

const newBlock = `async function syncSavedGameToCloud(game,localTeam){
  if(!game||game.cloudSyncedAt||!sb||!authUser||!navigator.onLine)return false;
  game.cloudSyncAttempts=Number(game.cloudSyncAttempts||0)+1;
  game.lastCloudSyncAttemptAt=new Date().toISOString();
  await persist();
  try{
    const sync=await loadCloudSync();
    await sync.withRetry(async()=>{
      const workspace=await sync.ensureWorkspace(sb,authUser);
      const syncedTeam=await sync.syncTeam(sb,authUser,workspace.id,localTeam);
      const shots=(game.shots||[]).map((shot,index)=>({
        id:shot.id??(game.id+'-'+index),
        playerId:shot.pid==null?null:(syncedTeam.playerMap.get(sync.clientRef('player',shot.pid))||null),
        made:Boolean(shot.made),
        points:is3pt(shot.x,shot.y)?3:2,
        x:shot.x??null,y:shot.y??null,
        period:shot.q??shot.period??game.quarter??1,
        clockSeconds:shot.clockSeconds??null,
        localUpdatedAt:game.localUpdatedAt
      }));
      await sync.syncGameBundle(sb,authUser,syncedTeam.team.id,{
        id:game.id,date:game.date,awayName:game.away,quarter:game.quarter,
        teamScore:game.teamPts,awayScore:game.awayScore,periodSeconds:S.clock?.periodSecs||600,
        status:'final',localUpdatedAt:game.localUpdatedAt,shots
      });
    },{attempts:3,baseMs:750,maxMs:3000});
    game.cloudSyncedAt=new Date().toISOString();
    game.cloudSyncError=null;
    await persist();
    setChip('Cloud synced ✓','saving');
    return true;
  }catch(e){
    game.cloudSyncError=String(e?.message||e||'Cloud sync deferred');
    await persist();
    console.warn('GameIQ cloud sync deferred',e);
    return false;
  }
}`;

html = replaceOnce(html, oldBlock, newBlock, 'cloud sync retry block');

const visibility = `  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden")persist();
  });`;
const listeners = `  window.addEventListener("online",()=>{retryPendingCloudSync()});

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden")persist();
    else if(navigator.onLine)retryPendingCloudSync();
  });`;
html = replaceOnce(html, visibility, listeners, 'online retry listener');

fs.writeFileSync(path, html);
console.log('Applied bounded cloud-sync retry patch.');
