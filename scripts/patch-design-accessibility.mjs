import fs from 'node:fs';

const path='index.html';
let html=fs.readFileSync(path,'utf8');
function replaceOnce(label,from,to){
  if(!html.includes(from)) throw new Error(`Design patch failed: missing ${label}`);
  html=html.replace(from,to);
}

replaceOnce('focus visible styling',
  'button{cursor:pointer;border:none;background:none}\n.sr-only',
  'button{cursor:pointer;border:none;background:none}\nbutton:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--accent2);outline-offset:3px}\n.sr-only');

replaceOnce('game focus CSS',
  '.score-adj:hover{background:rgba(77,159,255,.18);border-color:rgba(77,159,255,.35);color:var(--text)}\n@media(max-width:1200px)',
  '.score-adj:hover{background:rgba(77,159,255,.18);border-color:rgba(77,159,255,.35);color:var(--text)}\n.game-focus #newBtn,.game-focus .btn-gold,.game-focus #settingsBtn,.game-focus #gameOverBtn{display:none}\n.game-focus .brand-sub{opacity:.45}\n.game-focus .topbar-row1{padding-bottom:6px}\n@media(max-width:1200px)');

const navMap=[
  ['<button class="nav-btn active" data-view="dashboard">','<button class="nav-btn active" data-view="dashboard" aria-label="Dashboard">'],
  ['<button class="nav-btn" data-view="live">','<button class="nav-btn" data-view="live" aria-label="Live game">'],
  ['<button class="nav-btn" data-view="coach">','<button class="nav-btn" data-view="coach" aria-label="Coach analytics">'],
  ['<button class="nav-btn" data-view="compare">','<button class="nav-btn" data-view="compare" aria-label="Compare players">'],
  ['<button class="nav-btn" data-view="teams">','<button class="nav-btn" data-view="teams" aria-label="Teams">'],
  ['<button class="nav-btn" data-view="season">','<button class="nav-btn" data-view="season" aria-label="Season trends">'],
  ['<button class="nav-btn" data-view="aicoach" id="aiNavBtn">','<button class="nav-btn" data-view="aicoach" id="aiNavBtn" aria-label="AI Coach">'],
];
for(const [from,to] of navMap) replaceOnce('nav aria label',from,to);

replaceOnce('undo aria label','<button class="btn btn-secondary" id="undoBtn">↩</button>','<button class="btn btn-secondary" id="undoBtn" aria-label="Undo last stat change">↩</button>');
replaceOnce('clock keyboard semantics','<div id="clockDisplay" class="clock-display" title="Click to start/stop">10:00</div>','<div id="clockDisplay" class="clock-display" title="Click to start/stop" role="button" tabindex="0" aria-label="Game clock. Activate to start or stop">10:00</div>');
replaceOnce('away minus aria','<button class="score-adj" id="awayScoreMinus">−</button>','<button class="score-adj" id="awayScoreMinus" aria-label="Decrease away score">−</button>');
replaceOnce('away plus aria','<button class="score-adj" id="awayScorePlus">+</button>','<button class="score-adj" id="awayScorePlus" aria-label="Increase away score">+</button>');
replaceOnce('shot court semantics','<svg id="court" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg">','<svg id="court" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactive basketball shot chart. Select a player and shot result, then tap the court location.">');

replaceOnce('tile accessibility',
  'function tile(id,stat,label,val){return \'<div class="stat-tile"><div class="th"><div class="tn">\'+label+\'</div><div class="tv">\'+val+\'</div></div><div class="stepper"><button class="step-minus" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="-1">−</button><div class="step-display">\'+val+\'</div><button class="step-plus" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="1">+</button></div></div>\'}',
  'function tile(id,stat,label,val){return \'<div class="stat-tile"><div class="th"><div class="tn">\'+label+\'</div><div class="tv">\'+val+\'</div></div><div class="stepper"><button class="step-minus" aria-label="Decrease \'+label+\'" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="-1">−</button><div class="step-display" aria-live="polite">\'+val+\'</div><button class="step-plus" aria-label="Increase \'+label+\'" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="1">+</button></div></div>\'}');

replaceOnce('mini accessibility',
  'function mini(id,stat,label,val){return \'<div class="mini-card"><h4>\'+label+\'</h4><div class="stepper"><button class="step-minus" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="-1">−</button><div class="step-display">\'+val+\'</div><button class="step-plus" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="1">+</button></div></div>\'}',
  'function mini(id,stat,label,val){return \'<div class="mini-card"><h4>\'+label+\'</h4><div class="stepper"><button class="step-minus" aria-label="Decrease \'+label+\'" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="-1">−</button><div class="step-display" aria-live="polite">\'+val+\'</div><button class="step-plus" aria-label="Increase \'+label+\'" data-pid="\'+id+\'" data-stat="\'+stat+\'" data-delta="1">+</button></div></div>\'}');

replaceOnce('quick mode body class',
  'function doRender(){\n  renderNav();',
  'function doRender(){\n  document.body.classList.toggle("game-focus",!!S.quickMode);\n  renderNav();');

replaceOnce('clock keyboard handler',
  '  if(clockDisplay)clockDisplay.addEventListener("click",()=>{\n    S.clock.running?stopClock():startClock();\n  });',
  '  if(clockDisplay){\n    clockDisplay.addEventListener("click",()=>{S.clock.running?stopClock():startClock()});\n    clockDisplay.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();S.clock.running?stopClock():startClock()}});\n  }');

fs.writeFileSync(path,html);
console.log('Courtside design/accessibility patch applied successfully.');
