/* ---------- onboarding: new riders answer a few questions, the plan builds itself ---------- */
const needsOnboard=()=>!!(window.MXSB&&S.db&&S.profReady&&(!S.prof||(!S.prof.cfg&&!S.prof.legacy))||S.obEdit);
const nextSat=()=>{let s=todayS();s=addD(s,1);while(dow(s)!==6)s=addD(s,1);return s};
function obInit(){if(S.ob)return;const c=(S.prof&&S.prof.cfg)||{};S.ob={step:S.obEdit?1:0,err:'',a:{name:(S.prof&&S.prof.name)||'',age:c.age||'',sex:c.sex||'m',height:c.height||'',weight:c.weight||'',goal:c.goal||'lose',diet:c.diet||'',r1:c.r1||'',races:(c.races||[]).filter(r=>r[0]!==c.r1),start:c.start||nextSat(),daily:c.daily||2,ride:c.ride||'both',style:c.style||'gym',devices:c.devices!=null?c.devices:'',maxHR:(S.prof&&S.prof.maxHR)||''}}}
const obF=(id,lab,val,o)=>'<div><label for="ob-'+id+'">'+lab+'</label><input id="ob-'+id+'" data-ob="'+id+'" value="'+esc(val)+'"'+(o&&o.type?' type="'+o.type+'"':'')+(o&&o.num?' inputmode="decimal"':'')+' placeholder="'+esc((o&&o.ph)||'')+'"></div>';
const obSeg=(k,opts)=>'<div class="obseg" role="radiogroup">'+opts.map(([v,t,d])=>'<button type="button" role="radio" aria-checked="'+(String(S.ob.a[k])===String(v))+'" class="'+(String(S.ob.a[k])===String(v)?'on':'')+'" data-obv="'+k+'|'+v+'"><b>'+t+'</b>'+(d?'<span>'+d+'</span>':'')+'</button>').join('')+'</div>';
function renderOnboard(){obInit();const st=S.ob.step,a=S.ob.a,N=5;let h='';
  const head=(t,sub)=>'<div class="obh"><span class="lab">'+(st?'STEP '+st+' OF '+N:'WELCOME')+'</span><h1>'+t+'</h1>'+(sub?'<p class="mut">'+sub+'</p>':'')+'</div>';
  if(st===0)h=head('Let\'s build your plan','Answer five quick sections and the app builds your year: gym, conditioning, track days, race weeks and food, all set to your race dates and your week. Takes about 2 minutes.')
    +'<ul class="steps"><li>About you</li><li>Your goal and food</li><li>Your race calendar</li><li>Your week</li><li>Check and build</li></ul>';
  if(st===1)h=head('About you','Used to set your heart-rate zones and how much you need to eat.')+'<div class="fields">'+obF('name','First name',a.name,{ph:'Your name'})+obF('age','Age',a.age,{num:1,ph:'21'})+obF('height','Height (cm)',a.height,{num:1,ph:'178'})+obF('weight','Weight (kg)',a.weight,{num:1,ph:'72'})+'</div><p class="al">Sex (for the calorie maths)</p>'+obSeg('sex',[['m','Male'],['f','Female']]);
  if(st===2)h=head('Your goal and food','')+obSeg('goal',[['lose','Get leaner','Small deficit until your taper starts, then fuel to race'],['maintain','Stay the same','Fuel to train and recover'],['build','Build muscle','Small surplus with strength as the priority']])
    +'<p class="al">Food you don\'t eat</p><div class="obseg">'+[['veg','Vegetarian'],['df','Dairy-free']].map(([v,t])=>{const on=String(a.diet).split(',').includes(v);return '<button type="button" role="checkbox" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-obd="'+v+'"><b>'+t+'</b></button>'}).join('')+'</div><p class="mut" style="font-size:13px">Meals swap automatically. Leave both off if you eat everything.</p>';
  if(st===3){const list=[[a.r1||'','Round 1',true]].concat(a.races.map((r,i)=>[r[0],r[1],false,i]));
    h=head('Your race calendar','Round 1 is the race your whole build peaks for. Add the rest of the season so race weeks taper automatically.')+'<div class="fields">'+obF('r1','Round 1 date',a.r1,{type:'date'})+'</div>'
    +(a.races.length?'<div class="obr">'+a.races.map((r,i)=>'<div class="chk" style="grid-template-columns:minmax(0,1fr) auto"><span><b>'+esc(nice(r[0]))+'</b> · '+esc(r[1])+'</span><button type="button" class="ghost" data-obx="'+i+'" aria-label="Remove '+esc(r[1])+'">Remove</button></div>').join('')+'</div>':'')
    +'<p class="al">Add another race</p><div class="fields">'+obF('rd','Date','',{type:'date'})+obF('rn','Name','',{ph:'Round 2, warm-up race…'})+'</div><button type="button" class="ghost" id="obAdd" style="margin-top:8px">Add race</button>'}
  if(st===4)h=head('Your week','')+'<div class="fields">'+obF('start','Plan starts (moves to the Saturday)',a.start,{type:'date'})+obF('maxHR','Max heart rate (leave blank if unsure)',a.maxHR,{num:1,ph:a.age?String(Math.round(208-0.7*a.age)):'200'})+'</div>'
    +'<p class="al">Training style</p>'+obSeg('style',[['gym','Gym','Barbell strength, Wattbike, rower'],['bw','No gym','Bodyweight at home + lots of cycling']])
    +'<p class="al">What do you wear? Pick all that apply</p><div class="obseg chips">'+DEVICES.map(([v,t,d])=>{const on=String(a.devices).split(',').includes(v);return '<button type="button" role="checkbox" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-obw="'+v+'"><b>'+t+'</b><span>'+d+'</span></button>'}).join('')+'</div>'
    +'<p class="al">Weekday training</p>'+obSeg('daily',[['2','Twice a day','Before and after work: conditioning AM, strength PM'],['1','Once a day','Strength Mon and Wed, intervals Tue and Thu']])
    +'<p class="al">Riding days</p>'+obSeg('ride',[['both','Sat and Sun'],['sat','Saturday'],['sun','Sunday']]);
  if(st===5){const cfg=obCfg();applyCfg(cfg);const f=fuel(plan(addD(cfg.start,9)));const wk=[0,1,2,3,4,5,6].map(i=>{const s=addD(cfg.start,7+i),p=plan(s);return '<div class="chk" style="grid-template-columns:52px minmax(0,1fr)"><b>'+DN[dow(s)]+'</b><span>'+esc(p.title)+'</span></div>'}).join('');applyCfg(S.prof&&S.prof.cfg);
    h=head('Check and build','Here\'s what your first full week looks like.')+'<div class="obsum"><div><span>Starts</span><b>'+esc(nice(cfg.start))+'</b></div><div><span>Round 1</span><b>'+esc(nice(cfg.r1))+'</b></div><div><span>Races</span><b>'+(cfg.races.length)+'</b></div><div><span>Training day</span><b>'+f.kcal+' kcal</b></div></div>'+wk
    +'<p class="mut" style="font-size:13px;margin-top:12px">Week 1 is testing: your gym numbers set every weight in the plan. You can change any of this later in Profile.</p>'}
  const nav='<div class="obnav">'+(st>0?'<button type="button" class="ghost" id="obBack">Back</button>':(S.obEdit?'<button type="button" class="ghost" id="obCancel">Cancel</button>':'<span></span>'))+'<button type="button" id="obNext">'+(st===0?'Start':st===N?(S.obEdit?'Save changes':'Build my plan'):'Next')+'</button></div>';
  return '<div class="ob"><div class="obbar" aria-hidden="true"><i style="width:'+(st/N*100)+'%"></i></div>'+h+(S.ob.err?'<p class="oberr" role="alert">'+esc(S.ob.err)+'</p>':'')+nav+'</div>'}
function obCfg(){const a=S.ob.a;return {name:String(a.name).trim().slice(0,30),age:+a.age,sex:a.sex,height:+a.height,weight:+a.weight,goal:a.goal,diet:a.diet,r1:a.r1,races:[[a.r1,'Round 1']].concat(a.races),start:a.start,daily:+a.daily,ride:a.ride,style:a.style,devices:a.devices||'none'}}
function obCheck(st){const a=S.ob.a,n=(v,lo,hi)=>v!==''&&isFinite(+v)&&+v>=lo&&+v<=hi;
  if(st===1){if(!String(a.name).trim())return 'Enter your first name.';if(!n(a.age,14,70))return 'Enter your age (14–70).';if(!n(a.height,130,215))return 'Enter your height in cm, like 178.';if(!n(a.weight,40,150))return 'Enter your weight in kg, like 72.'}
  if(st===3){if(!/^\d{4}-\d\d-\d\d$/.test(a.r1||''))return 'Pick your Round 1 date.';if(toN(a.r1)<toN(todayS())+14)return 'Round 1 needs to be at least 2 weeks away to build a plan.'}
  if(st===4){if(!/^\d{4}-\d\d-\d\d$/.test(a.start||''))return 'Pick a start date.';if(toN(a.start)>=toN(a.r1)-7)return 'Start at least a week before Round 1.';if(a.maxHR!==''&&!n(a.maxHR,150,225))return 'Max heart rate should be between 150 and 225, or leave it blank.';if(!String(a.devices||'').trim())return 'Pick what you wear, or Nothing.'}
  return ''}
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.ob||!S.ob)return;if(t.dataset.ob!=='rd'&&t.dataset.ob!=='rn')S.ob.a[t.dataset.ob]=t.value.trim();S.ob.err=''});
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#obNext,#obBack,#obCancel,#obAdd,[data-obv],[data-obd],[data-obw],[data-obx],#obEdit');if(!t)return;
  if(t.id==='obEdit'){S.ob=null;S.obEdit=true;render();window.scrollTo(0,0);return}
  if(!S.ob)return;const a=S.ob.a;
  if(t.dataset.obv){const [k,v]=t.dataset.obv.split('|');a[k]=v;render();return}
  if(t.dataset.obd){const set=new Set(String(a.diet).split(',').filter(Boolean));set.has(t.dataset.obd)?set.delete(t.dataset.obd):set.add(t.dataset.obd);a.diet=[...set].join(',');render();return}
  if(t.dataset.obw){const v=t.dataset.obw;let set=new Set(String(a.devices).split(',').filter(Boolean));if(set.has(v))set.delete(v);else{if(v==='none')set=new Set();else set.delete('none');set.add(v)}a.devices=[...set].join(',');S.ob.err='';render();return}
  if(t.dataset.obx!==undefined){a.races.splice(+t.dataset.obx,1);render();return}
  if(t.id==='obAdd'){const d=($('#ob-rd')||{}).value,nm=(($('#ob-rn')||{}).value||'').trim();if(!/^\d{4}-\d\d-\d\d$/.test(d||'')){S.ob.err='Pick the race date first.';render();return}a.races.push([d,nm||'Race']);a.races.sort((x,y)=>x[0].localeCompare(y[0]));S.ob.err='';render();return}
  if(t.id==='obBack'){S.ob.step=Math.max(S.obEdit?1:0,S.ob.step-1);S.ob.err='';render();window.scrollTo(0,0);return}
  if(t.id==='obCancel'){S.ob=null;S.obEdit=false;render();return}
  if(t.id==='obNext'){const st=S.ob.step,err=obCheck(st);if(err){S.ob.err=err;render();return}
    if(st<5){S.ob.step++;render();window.scrollTo(0,0);return}
    const cfg=obCfg();S.prof.cfg=cfg;S.prof.name=cfg.name;if(a.maxHR!=='')S.prof.maxHR=+a.maxHR;else if(!S.prof.maxHR)S.prof.maxHR=Math.round(208-0.7*cfg.age);
    save('profile/main',true);S.ob=null;S.obEdit=false;applyCfg(cfg);S.date=todayS();location.hash='today';render();window.scrollTo(0,0)}
});
