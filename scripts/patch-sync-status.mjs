import fs from 'node:fs';
const path='index.html'; let html=fs.readFileSync(path,'utf8');
const old=`  window.addEventListener("online",()=>{retryPendingCloudSync().then(()=>pullCloudGamesToDevice())});`;
const next=`  window.addEventListener("offline",()=>{setChip('Saved on device · waiting for internet')});\n  window.addEventListener("online",()=>{setChip('Syncing…','saving');retryPendingCloudSync().then(()=>pullCloudGamesToDevice())});`;
const count=html.split(old).length-1;if(count!==1)throw new Error('sync status listener expected once, found '+count);
html=html.replace(old,next);fs.writeFileSync(path,html);console.log('Applied cloud status UX patch.');
