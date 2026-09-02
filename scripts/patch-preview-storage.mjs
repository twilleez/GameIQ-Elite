import fs from 'node:fs';

const path='preview/index.html';
let html=fs.readFileSync(path,'utf8');

const replacements=[
  ['const SK="gameiq_v3",WK="gameiq_tutorial_v3";','const SK="gameiq_preview_v3",WK="gameiq_preview_tutorial_v3";'],
  ['localStorage.getItem("gameiq_onboard_dismissed")','localStorage.getItem("gameiq_preview_onboard_dismissed")'],
  ['localStorage.setItem("gameiq_onboard_dismissed","1")','localStorage.setItem("gameiq_preview_onboard_dismissed","1")']
];
for(const [from,to] of replacements){
  if(!html.includes(from)) throw new Error(`Expected preview pattern missing: ${from}`);
  html=html.replaceAll(from,to);
}

fs.writeFileSync(path,html);
console.log('Preview storage isolated from production data.');
