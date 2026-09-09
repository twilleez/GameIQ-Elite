import fs from 'node:fs';

const path='index.html';
let html=fs.readFileSync(path,'utf8');

function replaceOnce(from,to,label){
  const count=html.split(from).length-1;
  if(count!==1) throw new Error(`${label}: expected 1 match, found ${count}`);
  html=html.replace(from,to);
}

replaceOnce(
  'function is3pt(x,y){if(y>140)return false;if(x<=28||x>=372)return true;return Math.sqrt((x-200)**2+(y-17)**2)>174}',
  'function is3pt(x,y){const px=Number(x),py=Number(y);if(!Number.isFinite(px)||!Number.isFinite(py))return false;if(px<=28||px>=372)return true;return Math.hypot(px-200,py-17)>174}',
  'three point classifier',
);

const saveMarker='function saveGame(){';
const cloudHelpers=`let cloudSyncModulePromise=null;\nfunction loadCloudSync(){\n  if(!cloudSyncModulePromise)cloudSyncModulePromise=import('./src/services/cloud-sync.js');\n  return cloudSyncModulePromise;\n}\nfunction localTeamForSavedGame(game){\n  return {id:game.teamId||S.activeTeamId,name:game.teamName||'My Team',players:game.players||[]};\n}\nasync function syncSavedGameToCloud(game,localTeam){\n  if(!game||game.cloudSyncedAt||!sb||!authUser||!navigator.onLine)return false;\n  try{\n    const sync=await loadCloudSync();\n    const workspace=await sync.ensureWorkspace(sb,authUser);\n    const syncedTeam=await sync.syncTeam(sb,authUser,workspace.id,localTeam);\n    const shots=(game.shots||[]).map((shot,index)=>({\n      id:shot.id??(game.id+'-'+index),\n      playerId:shot.pid==null?null:(syncedTeam.playerMap.get(sync.clientRef('player',shot.pid))||null),\n      made:Boolean(shot.made),\n      points:is3pt(shot.x,shot.y)?3:2,\n      x:shot.x??null,y:shot.y??null,\n      period:shot.q??shot.period??game.quarter??1,\n      clockSeconds:shot.clockSeconds??null,\n      localUpdatedAt:game.localUpdatedAt\n    }));\n    await sync.syncGameBundle(sb,authUser,syncedTeam.team.id,{\n      id:game.id,date:game.date,awayName:game.away,quarter:game.quarter,\n      teamScore:game.teamPts,awayScore:game.awayScore,periodSeconds:S.clock?.periodSecs||600,\n      status:'final',localUpdatedAt:game.localUpdatedAt,shots\n    });\n    game.cloudSyncedAt=new Date().toISOString();\n    await persist();\n    setChip('Cloud synced ✓','saving');\n    return true;\n  }catch(e){\n    console.warn('GameIQ cloud sync deferred',e);\n    return false;\n  }\n}\nfunction queueCloudSync(game,localTeam){\n  if(!game)return;\n  setTimeout(()=>syncSavedGameToCloud(game,localTeam),0);\n}\nasync function retryPendingCloudSync(){\n  if(!sb||!authUser||!navigator.onLine)return;\n  const pending=(S.games||[]).filter(g=>!g.cloudSyncedAt);\n  for(const game of pending){\n    await syncSavedGameToCloud(game,localTeamForSavedGame(game));\n  }\n}\n\n`;
replaceOnce(saveMarker,cloudHelpers+saveMarker,'cloud helper insertion');

replaceOnce(
`    id:Date.now(),\n    date:$("gameDate")?.value||today(),`,
`    id:Date.now(),\n    teamId:S.activeTeamId,\n    localUpdatedAt:new Date().toISOString(),\n    date:$("gameDate")?.value||today(),`,
'game sync identity',
);

replaceOnce(
`  S.games.push(game);\n  persist();\n  renderSeasonView();`,
`  S.games.push(game);\n  persist();\n  queueCloudSync(game,localTeamForSavedGame(game));\n  renderSeasonView();`,
'queue after local save',
);

replaceOnce(
`  initAuth();\n  if($("gameDate")&&!$("gameDate").value)$("gameDate").value=today();`,
`  initAuth();\n  window.addEventListener('online',()=>retryPendingCloudSync());\n  if($("gameDate")&&!$("gameDate").value)$("gameDate").value=today();`,
'reconnect listener',
);

replaceOnce(
`  persist();updateTierUI();renderAccountUI();\n}\nasync function sendMagicLink(){`,
`  persist();updateTierUI();renderAccountUI();\n  retryPendingCloudSync();\n}\nasync function sendMagicLink(){`,
'sync after auth',
);

fs.writeFileSync(path,html);
console.log('Applied cloud sync + three point patch');
