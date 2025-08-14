
const $=id=>document.getElementById(id);
const SKEY='HeatProFinal';
let st={
  heat:0,dead:0,bb:0,deadStreak:0,tumble:0,
  totals:{scatter:0,mult:0,fsWin:0,fsLose:0},
  cfg:{twarm:4,thot:7,tcold:12,tbb:2,ttumble:5,sound:true},
  theme:'dark',locked:false,logs:[],pos:{x:null,y:null}
};

function load(){
  try{const s=JSON.parse(localStorage.getItem(SKEY)||'{}'); st={...st,...s, cfg:{...st.cfg,...(s.cfg||{})}}}catch{}
  $('twarm').value=st.cfg.twarm; $('thot').value=st.cfg.thot; $('tcold').value=st.cfg.tcold;
  $('tbb').value=st.cfg.tbb; $('ttumble').value=st.cfg.ttumble; $('sound').checked=st.cfg.sound;
  if(st.theme==='light') document.documentElement.setAttribute('data-theme','light');
  refresh();
  if(st.pos.x!==null){const p=$('panel'); p.style.left=st.pos.x+'px'; p.style.top=st.pos.y+'px'; p.style.right='auto';}
  setLocked(st.locked);
}
function save(){localStorage.setItem(SKEY, JSON.stringify(st));}

function vibe(arr){if(!st.cfg.sound) return; if(navigator.vibrate) navigator.vibrate(arr);}
function setStatus(cls,txt){const s=$('status'); s.className='pill '+cls; s.textContent=txt;
  const mini=$('mini'); mini.className='mini '+cls; $('miniText').textContent=txt;}
function computeStatus(){
  let score=st.heat;
  if(st.bb>=st.cfg.tbb) score+=1; // bonus karena back-to-back
  if(st.tumble>=st.cfg.ttumble) score+=2; // bonus karena tumble besar
  if(st.dead>=st.cfg.tcold || st.deadStreak>=st.cfg.tcold) return {cls:'s-cold',txt:'COLD'};
  if(score>=st.cfg.thot) return {cls:'s-hot',txt:'HOT'};
  if(score>=st.cfg.twarm) return {cls:'s-warm',txt:'WARM'};
  return {cls:'s-ok',txt:'OK'};
}

function log(type, extra=''){
  const row={t:new Date().toLocaleTimeString(),type,heat:st.heat,dead:st.dead,bb:st.bb,deadStreak:st.deadStreak,tumble:st.tumble,extra};
  st.logs.push(row); if(st.logs.length>400) st.logs.shift();
}

function renderLog(){
  const el=$('log'); el.innerHTML='';
  st.logs.slice().reverse().forEach(v=>{
    const r=document.createElement('div'); r.className='logrow';
    r.innerHTML=`<span>${v.t} — ${v.type}${v.extra?(' ('+v.extra+')'):''}</span>
                 <span class="${v.type.includes('Lose')||v.type.includes('Dead')?'bad':'good'}">
                  H:${v.heat} D:${v.dead} BB:${v.bb} DS:${v.deadStreak}
                 </span>`;
    el.appendChild(r);
  });
}

function refresh(){
  $('heat').textContent=st.heat; $('dead').textContent=st.dead;
  $('bb').textContent=st.bb; $('deadStreak').textContent=st.deadStreak;
  const s=computeStatus(); setStatus(s.cls,s.txt); renderLog(); save();
}

function endSpin(){
  // finalize tumble: only apply bonus via computeStatus (already considered)
  st.tumble=0;
}

function win(){
  st.heat+=1; st.bb+=1; st.dead=Math.max(0,st.dead-1);
  if(st.deadStreak>0) st.deadStreak=0;
  log('Win/Connect'); vibe([120]);
  endSpin(); refresh();
}
function lose(){
  st.dead+=1; st.bb=0; st.heat=Math.max(0,st.heat-1);
  st.deadStreak+=1;
  log('Lose/Dead'); vibe([220,60,60]);
  endSpin(); refresh();
}
function tumblePlus(){
  st.tumble+=1; log('Tumble +1', 't='+st.tumble); refresh();
}
function scatter(){ st.totals.scatter++; st.heat+=2; log('Scatter +1'); refresh();}
function mult(){ st.totals.mult++; st.heat+=1; log('Multiplier +1'); refresh();}
function fsProfit(){ st.totals.fsWin++; st.heat+=3; log('FS Profit'); refresh();}
function fsLoss(){ st.totals.fsLose++; st.dead+=2; st.heat=Math.max(0,st.heat-1); log('FS Loss'); refresh();}

function resetAll(){
  st.heat=0; st.dead=0; st.bb=0; st.deadStreak=0; st.tumble=0; log('Reset'); refresh();
}
function clearLog(){ st.logs=[]; refresh();}

function saveCfg(){
  st.cfg.twarm=+$('twarm').value||4; st.cfg.thot=+$('thot').value||7; st.cfg.tcold=+$('tcold').value||12;
  st.cfg.tbb=+$('tbb').value||2; st.cfg.ttumble=+$('ttumble').value||5; st.cfg.sound=$('sound').checked;
  log('SaveCfg', JSON.stringify(st.cfg)); refresh();
}

function exportCSV(){
  const header='time,type,heat,dead,bb,deadStreak,tumble\n';
  const rows=st.logs.map(v=>[v.t,v.type,v.heat,v.dead,v.bb,v.deadStreak,v.tumble].join(','));
  download('heatpro_final.csv', header+rows.join('\n'), 'text/csv');
}
function exportJSON(){ download('heatpro_final.json', JSON.stringify(st,null,2),'application/json');}
function download(name,content,type){
  const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a');
  a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}

// Theme & Lock
function toggleTheme(){
  st.theme = (st.theme==='dark'?'light':'dark');
  if(st.theme==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  $('themeBtn').textContent = (st.theme==='light'?'☀️':'🌓'); save();
}
function setLocked(val){
  st.locked=val; const p=$('panel');
  if(val){ p.classList.add('locked'); $('lockBtn').textContent='🔒'; }
  else { p.classList.remove('locked'); $('lockBtn').textContent='🔓'; }
  save();
}

function drag(){
  const panel=$('panel'); const handle=$('dragHandle');
  let sx=0, sy=0, px=0, py=0, dragging=false;
  const onDown = (e)=>{
    if(st.locked) return;
    dragging=true; sx=(e.touches?e.touches[0].clientX:e.clientX); sy=(e.touches?e.touches[0].clientY:e.clientY);
    const rect=panel.getBoundingClientRect(); px=rect.left; py=rect.top; document.body.style.userSelect='none';
  };
  const onMove = (e)=>{
    if(!dragging) return; const cx=(e.touches?e.touches[0].clientX:e.clientX); const cy=(e.touches?e.touches[0].clientY:e.clientY);
    const nx=px+(cx-sx); const ny=py+(cy-sy); panel.style.left = nx+'px'; panel.style.top=ny+'px'; panel.style.right='auto';
  };
  const onUp = ()=>{
    if(!dragging) return; dragging=false; document.body.style.userSelect='';
    const rect=panel.getBoundingClientRect(); st.pos.x=rect.left; st.pos.y=rect.top; save();
  };
  handle.addEventListener('mousedown',onDown); handle.addEventListener('touchstart',onDown);
  window.addEventListener('mousemove',onMove,{passive:false}); window.addEventListener('touchmove',onMove,{passive:false});
  window.addEventListener('mouseup',onUp); window.addEventListener('touchend',onUp);
}

document.addEventListener('DOMContentLoaded', ()=>{
  load(); drag();
  $('winBtn').onclick=win; $('loseBtn').onclick=lose;
  $('tumbleBtn').onclick=tumblePlus; $('endSpinBtn').onclick=endSpin;
  $('scatterBtn').onclick=scatter; $('multBtn').onclick=mult;
  $('fsProfitBtn').onclick=fsProfit; $('fsLossBtn').onclick=fsLoss;
  $('resetBtn').onclick=resetAll; $('clearLogBtn').onclick=clearLog;
  $('saveCfgBtn').onclick=saveCfg; $('csvBtn').onclick=exportCSV; $('jsonBtn').onclick=exportJSON;
  $('themeBtn').onclick=toggleTheme; $('lockBtn').onclick=()=>setLocked(!st.locked);
  $('miniPlus').onclick=win; $('miniDead').onclick=lose;
});
