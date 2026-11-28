
/* ---------- wearables: what each rider wears decides where recovery, sleep and strain come from ---------- */
const DEVICES=[['whoop','WHOOP','Syncs on its own'],['polar','Polar','Syncs on its own'],['garmin','Garmin','2 numbers each morning'],['apple','Apple Watch','2 numbers each morning'],['none','Nothing','How-you-feel check-in']];
/* null = never asked (the original riders): keep the Whoop-style check-in */
const devs=()=>{if(!CFG)return new Set(['whoop','polar']);if(CFG.devices==null)return null;return new Set(String(CFG.devices).split(',').filter(Boolean))};
const hasWhoop=()=>{const d=devs();return !d||d.has('whoop')};
const hasPolar=()=>{const d=devs();return !d||d.has('polar')};
/* readiness for riders without WHOOP: how they feel, adjusted by sleep and resting HR against their own week */
const FEEL=[[1,'Wrecked'],[2,'Tired'],[3,'OK'],[4,'Good'],[5,'Great']];
function readyCalc(doc){const o=docObj(doc),w=o.whoop||{};if(w.src==='whoop'||w.src==='polar')return;const f=+w.feel;if(!(f>=1&&f<=5))return;
  let r=[0,20,40,60,75,90][f];const sl=sleepH(w.sleep);if(sl>0){if(sl<6)r-=15;else if(sl<7)r-=8;else if(sl>=8)r+=5}
  const day=doc.split('/')[1],base=[];for(let i=1;i<=7;i++){const v=+getK(S.days[toS(toN(day)-i)]||{},'whoop.rhr');if(v>0)base.push(v)}
  const rh=+w.rhr;if(rh>0&&base.length>=3){const b=base.reduce((x,y)=>x+y,0)/base.length;if(rh>=b+5)r-=10;else if(rh>=b+3)r-=5;else if(rh<=b-3)r+=3}
  setK(o,'whoop.rec',Math.max(5,Math.min(99,Math.round(r))));setK(o,'whoop.src','feel')}
function feelRow(doc){const o=docObj(doc),cur=+getK(o,'whoop.feel');
  return '<p class="al" style="margin-top:12px">How do you feel this morning?</p><div class="feel">'+FEEL.map(([v,t])=>'<button type="button" class="'+(cur===v?'on':'')+'" aria-pressed="'+(cur===v)+'" data-feel="'+v+'" data-fdoc="'+esc(doc)+'"><b>'+v+'</b><span>'+t+'</span></button>').join('')+'</div>'}
/* the morning check-in fields, matched to what the rider wears */
function checkinFields(doc,s){const d=devs(),o=docObj(doc),w=o.whoop||{},auto=w.src==='polar'||w.src==='whoop';
  if(hasWhoop())return null; // keep the Whoop form
  const watch=d&&d.has('garmin')?'Garmin':d&&d.has('apple')?'Apple Watch':d&&d.has('polar')?'Polar':'';
  return (auto?'<p class="mut" style="margin:12px 0 0;font-size:13px">Synced from Polar: readiness '+(+w.rec||'—')+'%, sleep '+(sleepH(w.sleep)>0?fmtH(sleepH(w.sleep)):'—')+(w.hrv?', HRV '+w.hrv+' ms':'')+(w.rhr?', resting HR '+w.rhr:'')+'.</p>':feelRow(doc))
    +'<div class="fields" style="margin-top:8px">'+(auto?'':fld(doc,'whoop.sleep','Sleep (e.g. 7:50)')+fld(doc,'whoop.rhr',watch?'Resting HR ('+watch+')':'Resting HR (optional)'))+fld(doc,'weight','Weight (kg)')+(dow(s)===1?fld(doc,'waist','Waist (cm), Mondays'):'')+'</div>'
    +(auto||!watch?'':'<p class="mut" style="font-size:12px;margin:6px 0 0">Sleep and resting HR are in the '+watch+' app. Your readiness score uses how you feel, your sleep and your resting HR against your normal.</p>')}
const recLabel=()=>hasWhoop()?'RECOVERY':'READINESS';
/* third ring: WHOOP strain, else Polar training load, else what's planned */
function strainRing(d,L){const w=(d&&d.whoop)||{},st=+w.strain,cl=+w.cload;
  if(st>0)return ring(st,21,'var(--blue)','STRAIN',st.toFixed(1),'yesterday','#log');
  if(cl>0)return ring(cl,150,'var(--blue)','LOAD',String(Math.round(cl)),'yesterday','#log');
  return ring(L.a/12*21,21,'var(--blue)',hasWhoop()?'STRAIN':'LOAD',L.k?'Key':L.a>=4?'High':L.a>=2?'Med':'Low','planned','#log')}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-feel]');if(!t)return;const doc=t.dataset.fdoc,o=docObj(doc);
  setK(o,'whoop.feel',+t.dataset.feel);readyCalc(doc);save(doc,true);render()});
/* Polar sleep + Nightly Recharge + load: synced automatically like WHOOP, at most every 20 minutes */
function polarAuto(force){if(!window.MXSB||!hasPolar())return;let on=null,last=0;try{on=localStorage.getItem('mxp:on');last=+localStorage.getItem('mxp:last')||0}catch(_){}
  if(on==='0'||(!force&&Date.now()-last<20*60*1000))return;try{localStorage.setItem('mxp:last',String(Date.now()))}catch(_){}
  pf({action:'daily',days:on===null?14:4}).then(()=>{try{localStorage.setItem('mxp:on','1')}catch(_){}}).catch(e=>{if(e.message==='not_connected'||e.message==='polar_auth'){try{localStorage.setItem('mxp:on','0')}catch(_){}}})}
setTimeout(()=>polarAuto(false),3500);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')polarAuto(false)});
