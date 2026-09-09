import fs from 'node:fs';

const path='index.html';
let html=fs.readFileSync(path,'utf8');

function replaceOnce(oldText,newText,label){
  if(!html.includes(oldText)) throw new Error(`Missing source pattern: ${label}`);
  html=html.replace(oldText,newText);
}

replaceOnce(
`function is3pt(x,y){const px=Number(x),py=Number(y);if(!Number.isFinite(px)||!Number.isFinite(py))return false;if(px<=28||px>=372)return true;return Math.hypot(px-200,py-17)>174}`,
`function is3pt(x,y){const px=Number(x),py=Number(y);if(!Number.isFinite(px)||!Number.isFinite(py))return false;if(py<=140)return px<=28||px>=372;if(px<=28||px>=372)return true;const r=174,half=172,cy=140-Math.sqrt(r*r-half*half);return Math.hypot(px-200,py-cy)>r}`,
'inline three point classifier');

replaceOnce(
`                <button class="pill" data-shot="ft">FT</button>`,
`                <button class="pill" id="ftModeBtn" type="button" aria-expanded="false" aria-controls="ftResultControls">FT</button>\n                <div id="ftResultControls" class="hidden" style="display:flex;gap:6px;align-items:center">\n                  <button class="pill" id="ftMadeBtn" type="button" style="border-color:rgba(157,126,252,.45);color:#c4b5fd">✓ Made FT</button>\n                  <button class="pill" id="ftMissBtn" type="button" style="border-color:rgba(239,64,64,.45);color:#fca5a5">✗ Miss FT</button>\n                </div>`,
'free throw controls');

replaceOnce(
`                <div class="ss-cell"><div class="ssv" id="ssFt" style="color:#f0be3e">0/0</div><div class="ssl">FT</div></div>`,
`                <div class="ss-cell"><div class="ssv" id="ssFt" style="color:#9d7efc">0/0</div><div id="ssFtMiss" style="font-size:9px;color:#ef4040;margin-top:2px">0 missed</div><div class="ssl">FT</div></div>`,
'free throw summary');

const oldStats=`function renderShotStats(){\n  const pid=Number($("shotPlayerSel")?.value||0),sh=pid?S.shots.filter(s=>s.pid===pid):S.shots;\n  const m2=sh.filter(s=>s.type==="made"&&s.det==="2pt").length,a2=sh.filter(s=>s.type!=="ft"&&s.det==="2pt").length;\n  const m3=sh.filter(s=>s.type==="made"&&s.det==="3pt").length,a3=sh.filter(s=>s.type!=="ft"&&s.det==="3pt").length;\n  const mft=sh.filter(s=>s.type==="ft").length,tm=m2+m3+mft,ta=a2+a3+mft;\n  const v=(id,val)=>{const el=$(id);if(el)el.textContent=val};\n  v("ssFg",pct(tm,ta)+"%");v("ss2pt",m2+"/"+a2);v("ss3pt",m3+"/"+a3);v("ssFt",mft+"/"+mft);\n  v("ssEfg",(ta?Math.round(((m2+m3+mft+.5*m3)/ta)*100):0)+"%");\n  const p=pid?team().players.find(x=>x.id===pid):null;\n  if($("shotNote"))$("shotNote").textContent=p?"Showing "+p.name+"'s shots. Tap court to log.":"Select player → tap court to log shots.";\n}`;
const newStats=`function renderShotStats(){\n  const pid=Number($("shotPlayerSel")?.value||0),sh=pid?S.shots.filter(s=>s.pid===pid):S.shots;\n  const m2=sh.filter(s=>s.type==="made"&&s.det==="2pt").length,a2=sh.filter(s=>s.det==="2pt").length;\n  const m3=sh.filter(s=>s.type==="made"&&s.det==="3pt").length,a3=sh.filter(s=>s.det==="3pt").length;\n  const statSource=pid?totPlayer(team().players.find(x=>x.id===pid)||{}):totTeam();\n  const mft=statSource.ftm||0,aft=statSource.fta||0,missft=Math.max(0,aft-mft);\n  const tm=m2+m3,ta=a2+a3;\n  const v=(id,val)=>{const el=$(id);if(el)el.textContent=val};\n  v("ssFg",pct(tm,ta)+"%");v("ss2pt",m2+"/"+a2);v("ss3pt",m3+"/"+a3);v("ssFt",mft+"/"+aft);v("ssFtMiss",missft+" missed");\n  v("ssEfg",(ta?Math.round(((m2+m3+.5*m3)/ta)*100):0)+"%");\n  const p=pid?team().players.find(x=>x.id===pid):null;\n  if($("shotNote"))$("shotNote").textContent=p?"Showing "+p.name+"'s shots. Use FT for free throws; tap court only for 2PT/3PT shots.":"Select player → tap court for field goals or use FT.";\n}\n\nfunction recordFreeThrow(made){\n  const pid=Number($("shotPlayerSel")?.value||0);if(!pid){toast("Pick a player first","err");return}\n  const player=team().players.find(p=>p.id===pid);if(!player)return;\n  pushH();if(!player.q)player.q={};if(!player.q[aq()])player.q[aq()]=eq();\n  const q=player.q[aq()];q.fta=(q.fta||0)+1;if(made)q.ftm=(q.ftm||0)+1;\n  persist();vibe(12);scheduleRender();\n  toast(made?"Made FT recorded ✓":"Missed FT recorded ✗",made?"ok":"");\n}`;
replaceOnce(oldStats,newStats,'shot stats and free throw recorder');

replaceOnce(
`  const q=player.q[aq()];let det="2pt";\n  if(S.shotMode==="ft"){q.ftm++;q.fta++;det="ft"}\n  else if(S.shotMode==="made"){if(is3pt(x,y)){q.p3m++;q.p3a++;det="3pt"}else{q.p2m++;q.p2a++}}\n  else{if(is3pt(x,y)){q.p3a++;det="3pt"}else{q.p2a++}}\n  S.shots.push({pid,x,y,type:S.shotMode,det,q:aq(),t:Date.now()});vibe([10,5,10]);scheduleRender();`,
`  const q=player.q[aq()];let det="2pt";\n  if(S.shotMode==="made"){if(is3pt(x,y)){q.p3m++;q.p3a++;det="3pt"}else{q.p2m++;q.p2a++}}\n  else{if(is3pt(x,y)){q.p3a++;det="3pt"}else{q.p2a++}}\n  S.shots.push({pid,x,y,type:S.shotMode,det,q:aq(),t:Date.now()});vibe([10,5,10]);scheduleRender();`,
'court tap excludes free throws');

const oldEvents=`  document.querySelectorAll(".pill[data-shot]").forEach(b=>b.addEventListener("click",()=>{\n    S.shotMode=b.dataset.shot;\n    document.querySelectorAll(".pill[data-shot]").forEach(x=>x.classList.toggle("active",x.dataset.shot===b.dataset.shot));\n    renderShotStats();\n  }));`;
const newEvents=`  document.querySelectorAll(".pill[data-shot]").forEach(b=>b.addEventListener("click",()=>{\n    S.shotMode=b.dataset.shot;\n    document.querySelectorAll(".pill[data-shot]").forEach(x=>x.classList.toggle("active",x.dataset.shot===b.dataset.shot));\n    const ftMode=$("ftModeBtn"),ftControls=$("ftResultControls");\n    if(ftMode){ftMode.classList.remove("active");ftMode.setAttribute("aria-expanded","false")}\n    if(ftControls)ftControls.classList.add("hidden");\n    renderShotStats();\n  }));\n  const ftModeBtn=$("ftModeBtn"),ftResultControls=$("ftResultControls");\n  if(ftModeBtn)ftModeBtn.addEventListener("click",()=>{\n    const open=ftResultControls?.classList.contains("hidden");\n    if(ftResultControls)ftResultControls.classList.toggle("hidden",!open);\n    ftModeBtn.classList.toggle("active",!!open);ftModeBtn.setAttribute("aria-expanded",open?"true":"false");\n  });\n  const ftMadeBtn=$("ftMadeBtn");if(ftMadeBtn)ftMadeBtn.addEventListener("click",()=>recordFreeThrow(true));\n  const ftMissBtn=$("ftMissBtn");if(ftMissBtn)ftMissBtn.addEventListener("click",()=>recordFreeThrow(false));`;
replaceOnce(oldEvents,newEvents,'free throw event handlers');

fs.writeFileSync(path,html);
console.log('Applied FT result UX and exact 3-point arc geometry.');
