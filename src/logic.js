
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MS=864e5;
const toN=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/MS;
const toS=n=>new Date(n*MS).toISOString().slice(0,10);
const dow=s=>{const d=new Date(toN(s)*MS).getUTCDay();return d===0?7:d};
const DN=['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const nice=s=>DN[dow(s)]+' '+(+s.slice(8,10))+' '+MN.at(+s.slice(5,7)-1);
const todayS=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const START='2026-11-28',END='2027-11-25';
const RACES=[['2027-02-05','Warm-up race'],['2027-02-20','Round 1'],['2027-03-21','Round 2'],['2027-04-11','Round 3'],['2027-05-02','Round 4'],['2027-05-16','Round 5'],['2027-06-06','Round 6'],['2027-07-11','Round 7'],['2027-08-08','Round 8'],['2027-09-19','Round 9']];
const PH=[['2026-11-28','2026-12-20','Build','#111'],['2026-12-21','2026-12-27','Deload','#8a8a86'],['2026-12-28','2027-01-24','Strength + power','#e4002b'],['2027-01-25','2027-02-19','Taper','#111'],['2027-02-20','2027-09-19','Race season','#3a3a3a'],['2027-09-20','2027-10-10','Rest','#8a8a86'],['2027-10-11','2027-11-25','Off-season','#5c5c58']];

/* ---------- state ---------- */
const S={days:{},track:{},tracks:{},reviews:{},gpsx:{},prof:{},view:'today',date:null,trk:null,tk:null,db:null,msg:'',del:null};
S.date=toN(todayS())<toN(START)?START:todayS();

/* ---------- phase logic ---------- */
function ctx(s){
  const n=toN(s),w=dow(s),c={s,n,w,mode:'p1',wk:1,k:null,race:null,label:''};
  for(const [r,name] of RACES){const k=toN(r)-n;if(k>=-1&&k<=6){c.k=k;c.race=name;break}}
  const wkOf=a=>Math.floor((n-toN(a))/7)+1;
  if(n<toN(START)){c.mode='pre';c.label='Starts Sat 28 Nov'}
  else if(n<=toN('2026-12-01')){c.mode='test';c.label='Week 1 · Testing'}
  else if(n<=toN('2026-12-20')){c.mode='p1';c.wk=wkOf('2026-11-30');c.label='Phase 1 · Build · Week '+c.wk}
  else if(n<=toN('2026-12-27')){c.mode='dl';c.label='Deload week'}
  else if(n<=toN('2027-01-24')){c.mode='p2';c.wk=wkOf('2026-12-28');c.label='Phase 2 · Strength + power · Week '+c.wk}
  else if(n<=toN('2027-02-19')){c.mode='p3';c.wk=wkOf('2027-01-25');c.label='Phase 3 · Sharpen + taper · Week '+c.wk}
  else if(n<=toN('2027-09-19')){
    let prev=null,next=null;for(const [r] of RACES){const rn=toN(r);if(rn<=n)prev=rn;else if(next===null)next=rn}
    if(prev!==null&&next!==null&&prev>=toN('2027-06-06')&&next-prev>=28){c.mode='mini';c.wk=(Math.floor(Math.max(0,n-prev-1)/7)%4)+1;c.label='In-season · Mini-build · Week '+c.wk}
    else{c.mode='in';c.wk=Math.floor((n-toN('2027-02-22'))/7)+1;c.label='In-season · Maintenance'}
  }
  else if(n<=toN('2027-10-10')){c.mode='tr';c.label='Transition · Active rest'}
  else{c.wk=(Math.floor((n-toN('2027-10-11'))/7)%4)+1;c.mode=c.wk===4?'dl':'off';c.label='Off-season build · Week '+c.wk}
  return c;
}
const big=m=>m==='p2'||m==='mini';
const hardBlock=m=>m==='p1'||m==='p2'||m==='mini'||m==='off';
function pctFor(m,wk){
  if(m==='dl')return .6;if(m==='p3')return .85;if(m==='in')return .78;if(m==='race')return .75;
  if(big(m))return [.8,.825,.85,.875].at(Math.min(wk,4)-1);
  return [.7,.725,.75,.75].at(Math.min(wk,4)-1);
}
const TS={EASY:1,MOD:2,HARD:3,KEY:4};
const tierHTML=t=>t?'<span class="tier '+t+'"><span class="m">'+[1,2,3,4].map(i=>'<u class="'+(i<=TS[t]?'f':'')+'"></u>').join('')+'</span>'+({EASY:'Easy',MOD:'Moderate',HARD:'Hard',KEY:'Key session'}[t])+'</span>':'';

/* ---------- exercise library ---------- */
const E=(id,name,sets,reps,load,rest,cue,o)=>({id,name,sets,reps,load,rest,cue,...(o||{})});
const MAXHR=()=>+S.prof.maxHR||200;
const hr=(a,b)=>Math.round(MAXHR()*a)+'–'+Math.round(MAXHR()*b)+' bpm';
const bench=(k)=>{const b=(S.prof.bench||{})[k]||{};for(const p of ['oct','jun','jan','wk1'])if(+b[p]>0)return +b[p];return 0};
function e1(of){
  if(of==='squat'){const v=bench('squat');return v?v*1.1:0}
  if(of==='trap'){const v=bench('trap');return v?v*1.1:0}
  const t=S.prof.tests||{};
  if(of==='ohp')return +t.ohp>0?t.ohp*1.167:0;
  if(of==='bench')return +t.bench>0?t.bench*1.267:0;
  return 0;
}
function loadTxt(l){
  if(typeof l==='string'){const r=l.match(/RPE (\d)/);if(r&&!/kg/.test(l)&&!/weight/.test(l))return l+': a weight you could lift '+(10-+r[1])+' more reps with';if(l==='Light')return 'Light: a weight you could do 10+ more reps with';if(l==='Light band or plate')return 'Light band, or a 2.5–5 kg plate';if(l==='Light band')return 'Light resistance band';return l}
  const v=e1(l.of);
  if(v>0){const st=l.step||2.5;const kg=Math.round(v*l.pct/st)*st;return (Number.isInteger(kg)?kg:kg.toFixed(1))+' kg'+(l.note?' '+l.note:'')}
  return 'RPE 7–8 · '+(l.of==='squat'||l.of==='trap'?'kg appear after your week 1 test':'add your test in Profile for kg');
}
const CORE={
  1:[E('c_abw','Core: ab wheel',3,'10','Bodyweight','45 s','Ribs down, no arch.'),E('c_db','Core: dead bug',3,'8 each side','Bodyweight','45 s','Low back pressed into the floor.')],
  2:[E('c_suit','Core: suitcase carry',3,'30 m each side',{pct:.25,of:'trap',step:2,note:'one hand'},'45 s','Stay tall, don\'t lean.'),E('c_ph','Core: Pallof hold',3,'20 s each side','RPE 7','45 s','Arms locked out, resist the turn.')],
  3:[E('c_sp','Core: side plank',3,'Max minus 10 s each side','Bodyweight','45 s','Straight line, hips high.')],
  4:[E('c_rot','Core: med-ball rotational throw',3,'6 each side','4–6 kg ball','45 s','Turn from the hips, throw hard into the wall.'),E('c_hlr','Core: hanging leg raise',3,'Max','Bodyweight','60 s','No swing.')]
};
function finisher(key,m){
  if(!hardBlock(m))return null;const p2=big(m);
  if(key==='A')return E('fin_a','Finisher: bike + hold',p2?8:6,'Air bike: 30 s all-out ('+hr(.9,1)+') → 30 s attack-position hold with dumbbells','Max effort','45 s','The hard part of the day. Legs will be gone: hold the position anyway. Last round: hold the attack position until you physically cannot. Log the time.',{rounds:true,fin:true});
  if(key==='D')return E('fin_d','Finisher: arm-pump killer',p2?5:4,'60 s gripper → 30 s dead hang → 20 push-ups','Light gripper','45 s','Forearms full of pump: relax the grip between, breathe through it. Last round: dead hang until your hands open. Lap 12 feels like this.',{rounds:true,fin:true});
  return null;
}
function DIGDEEP(m){const p2=big(m);return {title:'Dig Deep · 30 min + 2 laps',dd:true,rows:[
  {id:'dd0',label:'The rules',detail:'30 minutes continuous, then 2 laps. No sitting down, no phone. If you stop moving, 5 burpees before you carry on. When your mind says you are done, do 10 more reps: that gap is what you are training.'},
  {id:'dd1',label:'One round = 6 stations, about 4 min',detail:'1 Air bike 60 s at '+hr(.88,.93)+' · 2 Kettlebell swings × '+(p2?15:12)+' · 3 Farmer\'s carry 2 × 20 m · 4 Lateral bounds × 10 · 5 Attack-position hold 30 s, dumbbells at bar height · 6 Burpee box jumps × '+(p2?8:6)},
  {id:'dd2',label:'Minutes 0–10: settle in at '+hr(.82,.88),detail:'Smooth and steady. Count your rounds.',secs:600,fields:[['r','Rounds done'],['hr','Avg HR']]},
  {id:'dd3',label:'Minutes 10–20: hold the pace at '+hr(.85,.9),detail:'This is where you want to slow down. Don\'t. Same reps, same speed.',secs:600,fields:[['r','Rounds done'],['hr','Avg HR']]},
  {id:'dd4',label:'Minutes 20–30: race the clock at '+hr(.88,.95),detail:'Your body has more than your mind thinks. Pick up the pace.',secs:600,fields:[['r','Rounds done'],['hr','Avg HR']]},
  {id:'dd5',label:'Lap 1: air bike, 2 min all-out',detail:'30 s walk, then straight into lap 2',secs:120,fields:[['cal','Cals'],['hr','Max HR']]},
  {id:'dd6',label:'Lap 2: air bike, 2 min all-out',detail:'Beat lap 1. This is the last 2 laps of a moto.',secs:120,fields:[['cal','Cals'],['hr','Max HR']]},
  {id:'dd7',label:'Log your total',detail:'Total rounds + both laps\' cals. Beat it next week. Stop only for sharp pain, dizziness or chest pain: pushing through fatigue is the point, pushing through injury is not.',fields:[['tot','Total rounds'],['score','Total cals']]}]}}
function strength(key,m,wk){
  const p2=big(m),P=pctFor(m==='dl'?'dl':(m==='off'?'p1':m),wk);
  const L={
  A:()=>[E('squat','Back squat',p2?5:4,p2?'3–5':'6–8',{pct:P,of:'squat'},'2–3 min','Brace, sit between your heels, drive up hard. Stop 2 reps short.'),
    p2&&E('jsq','Jump squat',4,'5','Bodyweight or 2 × 10 kg DBs','90 s','Land soft and quiet, reset every rep.'),
    E('rdl','Romanian deadlift',3,p2?'6':'8',{pct:p2?.55:.5,of:'trap'},'2 min','Hinge back, bar close, flat back, feel the hamstrings.'),
    E('bss','Bulgarian split squat',3,p2?'6 each leg':'8 each leg',{pct:p2?.22:.18,of:'squat',step:2,note:'per hand'},'90 s','Front shin near vertical, slow down, drive up.'),
    E('aph','MX: attack-position squat hold',3,p2?'60 s':'45 s',{pct:p2?.15:.12,of:'squat',step:2,note:'per hand'},'60 s','Dumbbells at bar height, elbows up, chest over the bars, knees bent. Breathe.'),
    E('calf','MX: single-leg calf raise off a step',3,p2?'20–25 each':'15 each','Bodyweight','45 s','Full stretch at the bottom, 1 s pause at the top.'),
    E('hlr','Hanging leg raise',3,'12','Bodyweight','60 s','No swing. Knees to chest, lower slowly.'),
    E('pallof','Pallof press',3,'10 each side','RPE 7','45 s','Press out, hold 2 s, don\'t let it twist you.')],
  B:()=>[E('pull','Pull-up',p2?5:4,p2?'4–6':'6–8',p2?'Add weight · RPE 8':'Bodyweight · RPE 8','2–3 min','Start from a dead hang, chin over the bar, 2 s down.'),
    E('csrow','Chest-supported row',4,p2?'6':'8','RPE 8','2 min','Squeeze the shoulder blades, no bounce.'),
    E('arow','MX: single-arm band or cable row in attack position',3,p2?'12 each arm':'10 each arm','RPE 7','60 s','Hold attack position; row without twisting.'),
    E('face','Face pull',3,'15','Light','60 s','Pull to your forehead, thumbs back.'),
    E('farm','Farmer\'s carry',4,'40 m',{pct:p2?.32:.28,of:'trap',step:2,note:'per hand'},'90 s','Tall, shoulders down, grip as relaxed as you can.'),
    E('hang','Dead hang',3,'Max time','Bodyweight','90 s','Shoulders engaged, breathe, relax the forearms.'),
    E('neck','Neck, 4 directions',p2?3:2,p2?'12 each way':'15 each way','Light band or plate','45 s','Slow and controlled. Never jerk.')],
  C:()=>[E('box','Box jump',p2?5:4,p2?'3':'4',p2?'Higher box':'Knee-height box','90 s','First, while fresh. Step down, never jump down.'),
    E('drop','MX: drop landing into attack position',3,p2?'5':'4',p2?'Higher box':'Low box','60 s','Step off, land and freeze 2 s in attack position.'),
    E('trap','Trap-bar deadlift',p2?5:4,p2?'3':'5',{pct:P+(p2?.03:.05),of:'trap'},'2–3 min','Push the floor away, lock the hips, flat back.'),
    E('lat','MX: lateral bound and stick',3,p2?'6 each side':'5 each side','Bodyweight','60 s','Jump sideways, stick on one leg for 2 s.'),
    E('slrdl','Single-leg RDL',3,p2?'6 each leg':'8 each leg','RPE 7','60 s','Hips square, reach long.'),
    E('nordic','Nordic curl',3,p2?'6':'5','Bodyweight','90 s','Lower as slowly as you can.'),
    E('cph','Copenhagen plank',3,p2?'30 s each side':'20 s each side','Bodyweight','45 s','Hips high, straight line.')],
  D:()=>[E('dbb','Dumbbell bench press',4,p2?'6':'8',{pct:P,of:'bench',step:2,note:'per hand'},'2 min','Shoulder blades pinned, control the lowering.'),
    E('ohp','Standing overhead press',p2?4:3,p2?'5':'8',{pct:p2?P:P-.03,of:'ohp'},'2 min','Squeeze glutes, bar over mid-foot, head through.'),
    E('dips','MX: dips',3,p2?'6–8':'8–12',p2?'Add weight · RPE 8':'Bodyweight','90 s','Slight lean forward, full lockout.'),
    p2&&E('slam','Medicine-ball slam',4,'6','6–8 kg ball','60 s','Full reach, slam hard.'),
    E('wrist','Wrist roller',3,'Up and down','Light','60 s','Smooth; burn, not cramp.'),
    E('pinch','Plate pinch hold',3,p2?'45 s':'30 s','2 × 10 kg plates','60 s','Fingers only.'),
    E('neck','Neck, 4 directions',p2?3:2,p2?'12 each way':'15 each way','Light band or plate','45 s','Slow and controlled.')],
  A3:()=>[E('squat','Back squat',3,'3',{pct:.85,of:'squat'},'3 min','Heavy but fast. Stop with 2 in the tank.'),E('jsq','Jump squat',3,'3','Bodyweight','90 s','Max height, soft landing.'),E('bss','Bulgarian split squat',2,'5 each leg',{pct:.22,of:'squat',step:2,note:'per hand'},'90 s','Heavy, controlled.'),E('aph','MX: attack-position squat hold',2,'45 s',{pct:.15,of:'squat',step:2,note:'per hand'},'60 s','Elbows up, breathe.'),E('hlr','Hanging leg raise',2,'10','Bodyweight','60 s','No swing.'),E('pallof','Pallof press',2,'10 each side','RPE 7','45 s','Resist the turn.')],
  C3:()=>[E('box','Box jump',3,'3','Higher box','90 s','Fresh and explosive.'),E('trap','Trap-bar deadlift',3,'3',{pct:.85,of:'trap'},'3 min','Fast off the floor.'),E('pull','Weighted pull-up',3,'4','Add weight · RPE 8','2 min','Dead hang to chin over.'),E('csrow','Chest-supported row',2,'6','RPE 8','90 s','No bounce.'),E('cph','Copenhagen plank',2,'20 s each side','Bodyweight','45 s','Straight line.'),E('abw','Ab wheel',2,'10','Bodyweight','45 s','Ribs down.')],
  GN:()=>[E('pinch','Plate pinch hold',3,'30 s','2 × 10 kg plates','60 s','Fingers only.'),E('grip','Grip endurance, light gripper',3,'60 s','Light','60 s','Relaxed rhythm.'),E('neck','Neck, 4 directions',2,'12 each way','Light','45 s','Slow and controlled.')],
  FBA:()=>[E('squat','Back squat',3,'5',{pct:.78,of:'squat'},'2–3 min','Crisp reps, RPE 7.'),E('pull','Pull-up',3,'6','Bodyweight · RPE 8','2 min','Full range.'),E('dbb','Dumbbell bench press',3,'6',{pct:.78,of:'bench',step:2,note:'per hand'},'2 min','Controlled.'),E('aph','MX: attack-position squat hold',2,'45 s',{pct:.15,of:'squat',step:2,note:'per hand'},'60 s','Elbows up.'),E('pallof','Pallof press',2,'10 each side','RPE 7','45 s','Resist the turn.'),E('neck','Neck, 4 directions',2,'12 each way','Light','45 s','Slow.')],
  FBB:()=>[E('trap','Trap-bar deadlift',3,'4',{pct:.8,of:'trap'},'2–3 min','Fast and clean.'),E('ohp','Standing overhead press',3,'5',{pct:.78,of:'ohp'},'2 min','Glutes tight.'),E('csrow','Chest-supported row',3,'8','RPE 8','90 s','Squeeze.'),E('lat','MX: lateral bound and stick',3,'5 each side','Bodyweight','60 s','Stick 2 s.'),E('c_sp','Side plank',2,'Max minus 10 s each side','Bodyweight','45 s','Hips high.'),E('grip','Grip endurance, light gripper',2,'60 s','Light','60 s','Relaxed.')],
  FBC:()=>[E('box','Box jump',3,'3','Knee-height box','90 s','Explosive.'),E('bss','Bulgarian split squat',2,'6 each leg',{pct:.2,of:'squat',step:2,note:'per hand'},'90 s','Controlled.'),E('arow','MX: single-arm row in attack position',2,'10 each arm','RPE 7','60 s','No twist.'),E('dips','MX: dips',2,'8','Bodyweight','90 s','Full lockout.'),E('farm','Farmer\'s carry',3,'40 m',{pct:.28,of:'trap',step:2,note:'per hand'},'90 s','Relaxed grip.')],
  FBM:()=>[E('squat','Back squat',3,'5',{pct:.75,of:'squat'},'2 min','RPE 7. Nothing heavy this week.'),E('pull','Pull-up',3,'5','Bodyweight','90 s','Smooth.'),E('dbb','Dumbbell bench press',3,'5',{pct:.75,of:'bench',step:2,note:'per hand'},'90 s','Smooth.'),E('pallof','Pallof press',2,'10 each side','RPE 6','45 s','Easy.')],
  PR:()=>[E('box','Box jump',3,'3','Knee-height box','90 s','Snappy, not tiring.'),E('squat','Back squat',2,'3',{pct:.7,of:'squat'},'2 min','Fast reps only.'),E('band','Band pull-apart',2,'15','Light band','45 s','Open the chest.')]
  };
  let list=(L[key]||L.A)().filter(Boolean);
  if(m==='dl')list=list.map(x=>({...x,sets:Math.max(2,Math.round(x.sets*.6)),load:typeof x.load==='object'?{...x.load,pct:Math.min(x.load.pct,.6)}:x.load}));
  return list;
}
const SNAME={A:'Strength A · Lower body',B:'Strength B · Pull, grip, neck',C:'Strength C · Power, hinge, single leg',D:'Strength D · Push, arm-pump endurance',A3:'Strength A · Heavy, low volume',C3:'Strength C + pulls · Heavy, low volume',GN:'Mobility + grip and neck',FBA:'Full body A',FBB:'Full body B',FBC:'Full body C · Light',FBM:'Full body · Race week',PR:'Primer'};
const STIER={A:'HARD',B:'MOD',C:'HARD',D:'HARD',A3:'HARD',C3:'HARD',GN:'EASY',FBA:'MOD',FBB:'MOD',FBC:'MOD',FBM:'MOD',PR:'EASY'};
const WARM=()=>({title:'Warm-up · 15 min',steps:['Rower: 5 min, damper 4–5, 20–24 strokes a minute, building from easy to '+hr(.65,.7),'Leg swings: 10 forward-and-back, then 10 side-to-side, each leg','World\'s greatest stretch: 5 each side, 2 s in each position','Bodyweight squats: 10 with a 2 s pause at the bottom','Glute bridges: 10 with a 2 s squeeze at the top','Band pull-aparts: 15 with a light resistance band','Reaction drops: catch a tennis ball before its second bounce, 6 catches (wall or partner)','Reaction starts: 6 × 5 m sprints from attack position on a clap or app beep','Single-leg balance on a cushion: 30 s each leg, last 10 s eyes closed']});
const restS=r=>{r=String(r||'');const n=(r.match(/\d+/g)||[]).map(Number);if(!n.length)return 0;const a=n.length>1?(n[0]+n[1])/2:n[0];return /min/.test(r)?a*60:a};
const exMin=x=>x.unit==='min'?x.sets:(x.sets*(restS(x.rest)+50)/60)*(/each (leg|side|arm)/.test(x.reps)?1.5:1);
const CDROWS=()=>[{id:'cd1',label:'Wattbike or spin bike: 5 min easy under '+Math.round(MAXHR()*.6)+' bpm, 80–90 rpm',detail:'Let your heart rate come all the way down',secs:300},{id:'cd2',label:'Couch stretch: 60 s each side',detail:'Squeeze the glute of the back leg',secs:120},{id:'cd3',label:'Child\'s pose with side reach: 60 s',detail:'Walk the hands left, then right, 30 s each',secs:60},{id:'cd4',label:'Forearm flexor stretch: 60 s each arm',detail:'Palm flat on the floor or wall, fingers pointing back',secs:120}];
const MOB=['Hip 90/90 switches, 2 min','Couch stretch, 60 s each side','Thoracic rotations on all fours, 10 each side','Deep squat hold, 2 × 45 s','Wrist and forearm flexor stretch, 60 s each arm','Neck circles, slow, 5 each way'];
function pmStrength(key,m,wk,w,core){
  const ex=strength(key,m,wk);
  const first=ex[0];
  const warm=WARM();
  if(first){const lo=first.load,rk=x=>Math.max(20,Math.round(x/2.5)*2.5);
    if(lo&&typeof lo==='object'&&!lo.note){const v=e1(lo.of);if(v>0){const top=v*lo.pct;warm.steps.push('Ramp-up sets for '+first.name.toLowerCase()+': empty bar × 10, '+[.4,.6,.8].map((f,i)=>rk(top*f)+' kg × '+[5,3,2][i]).join(', ')+', then start your working sets')}else warm.steps.push('Ramp-up sets for '+first.name.toLowerCase()+': empty bar × 10, then 3 sets of 5, 3 and 2, adding weight each time, then start your working sets')}
    else if(lo&&typeof lo==='object'&&lo.note){const v=e1(lo.of);const kg=v>0?Math.round(v*lo.pct/2)*2:null;warm.steps.push('Ramp-up sets for '+first.name.toLowerCase()+': 1 × 8 at about half your working weight'+(kg?' ('+Math.max(2,Math.round(kg*.5/2)*2)+' kg per hand)':'')+', then 1 × 4 at about three-quarters'+(kg?' ('+Math.round(kg*.75/2)*2+' kg per hand)':''))}
    else if(first.id==='pull')warm.steps.push('Ramp-up for pull-ups: 5 scapular pull-ups (shoulders only), then 3 easy pull-ups')
    else if(first.id==='box')warm.steps.push('Ramp-up for box jumps: 3 easy jumps onto a low box, then 2 at your working height')}
  {const bb=ex.find(x=>x.load&&typeof x.load==='object'&&!x.load.note);if(bb&&bb!==first){const v=e1(bb.load.of),rk=x=>Math.max(20,Math.round(x/2.5)*2.5);warm.steps.push('Before your first working set of '+bb.name.toLowerCase()+': '+(v>0?'empty bar × 10, '+[.4,.6,.8].map((f,i)=>rk(v*bb.load.pct*f)+' kg × '+[5,3,2][i]).join(', '):'empty bar × 10, then 3 lighter sets of 5, 3 and 2'))}}
  const dd=key==='C'&&hardBlock(m);
  let all=core&&CORE[w]&&!dd?ex.concat(CORE[w]):ex;
  if(dd)all=all.filter(x=>x.id!=='lat');
  const fin=finisher(key,m);if(fin)all=all.concat([fin]);
  const tier=(fin&&big(m))||dd?'KEY':STIER[key];
  const race=key==='PR'||key==='FBM';
  let steps=null,post=[];
  if(key==='GN')steps=MOB;
  const lift=all.reduce((a,x)=>a+exMin(x),0)+(steps?15:0);
  let est=15+lift;
  if(dd){post.push(DIGDEEP(m));est+=34}
  if(key==='GN'){post.push({title:'Easy aerobic · 30 min',rows:[{id:'z2',label:'Wattbike or spin bike: 30 min easy at '+hr(.6,.7)+', 85–95 rpm',detail:'Conversational pace',secs:1800}]},{title:'Race visualisation · 10 min',rows:[{id:'vis',label:'Sit quietly, eyes closed: run your gate routine, the start and the first 3 corners in your head, 5 times',detail:'See the lines, feel the clutch, breathe out on the drop of the gate',secs:600}]});est+=40}
  else if(!race){const fl=Math.min(30,Math.max(0,Math.round((90-est-10)/5)*5));if(fl>=5){post.push({title:'Engine add-on · '+fl+' min',rows:[{id:'fl',label:'Wattbike or spin bike: '+fl+' min Zone 2 at '+hr(.6,.7)+', 85–95 rpm',detail:'Easy and steady after lifting: builds the aerobic base without extra fatigue',secs:fl*60}]});est+=fl}}
  post.push({title:'Cool-down · '+(race?6:10)+' min',rows:race?CDROWS().slice(0,2):CDROWS()});est+=race?6:10;
  const mins=Math.round(est/5)*5;
  return {id:'pm',time:'17:45',title:SNAME[key],code:key.replace('3',''),mins,tier,warm,ex:all,steps,post};
}
function cond(kind,m,wk){
  const z2={p1:50,p2:50,mini:50,p3:45,dl:40,in:45,off:50,race:30}[m]||45;
  const A=o=>({id:'am',time:'05:30',...o});
  if(kind==='z2')return A({kind:'z2',main:z2,title:'Zone 2 aerobic',code:'Z2',tier:'EASY',mins:m==='race'?40:60,hr:hr(.6,.7),steps:['Warm up 5 min easy',z2+' min steady at '+hr(.6,.7)+'. You should be able to talk in full sentences.','Air bike, rower, run or road bike','10 min mobility after: '+MOB.slice(0,3).join(' · ')],why:'Easy on purpose. This builds the aerobic base that makes you recover faster between efforts and between motos. Going harder here ruins it.'});
  if(kind==='long'){const mins=big(m)&&wk<4?120:90;return {kind:'long',main:mins,id:'pm',time:'17:30',title:'Long Zone 2 ride',code:'LONG',tier:'MOD',mins,hr:hr(.6,.7),steps:[mins+' min continuous at '+hr(.6,.7)+' on the road bike, turbo or air bike','Hold the zone: no surges, no racing the clock','After the first hour: 40–60 g carbs and 500 ml of drink per hour','Whoop red today? Skip it. Amber? Cut it to 60 min'],why:'Long aerobic volume is what pro riders build in the winter. It is easy per minute but long enough to tire you.',drop:false}}
  if(kind==='ap'){const n=(m==='p1'||m==='off')?[4,5,5,5].at(Math.min(wk,4)-1):big(m)?[5,6,6,6].at(Math.min(wk,4)-1):({p3:3,in:4,dl:3}[m]||4);const sp=big(m)?'6 × 15 s all-out, 45 s easy':(m==='p3'?'6 × 10 s all-out, 50 s easy':null);
    return A({kind:'ap',n,dig:big(m)||((m==='p1'||m==='off')&&wk>=3),sp:big(m)?'15 s all-out, then 45 s easy':(m==='p3'?'10 s all-out, then 50 s easy':null),spOn:big(m)?15:10,title:'Aerobic power',code:n+'×4',tier:big(m)?'KEY':'HARD',mins:60,hr:hr(.9,.95),steps:['Warm up 10 min, building',n+' × 4 min at '+(m==='dl'?hr(.85,.9):hr(.9,.95))+', 3 min easy between',sp&&('Then repeat sprints: '+sp),'Log your HR at the end of the last 4-min effort, then 60 s later','Cool down 5 min'].filter(Boolean),why:'Raises your ceiling: how high your heart rate can work and still hold pace. Every effort should be the same pace or faster than the one before.',drop:true})}
  if(kind==='th'){
    if((big(m)||m==='in')&&wk%2===0)return A({kind:'circ',title:'Moto circuit',code:'MOTO',tier:'KEY',mins:60,hr:hr(.85,.95),steps:['Warm up 8 min','60 s per station, no rest between stations, 2 min easy after each round. 3 rounds:','1 Rower or air bike, hard · 2 Attack-position squat hold · 3 Lateral bounds, stick each landing · 4 Band row in attack position · 5 Plank with shoulder taps · 6 Light farmer\'s hold, relaxed grip · 7 Bodyweight jump squats · 8 Skipping','Finish: 4 min all-out on the rower. That is your last 2 laps','Target '+hr(.85,.95)+' throughout'],why:'A full moto\'s length of effort with bike-specific strength stations.',drop:true});
    if(big(m))return A({kind:'sim',dig:true,title:'Race simulation',code:'SIM',tier:'KEY',mins:60,hr:hr(.85,.92),steps:['Warm up 10 min','30 min at race effort ('+hr(.85,.92)+') with a 10 s surge every 90 s: corners, exits, passes','Then 4 min all-out: your last 2 laps','Cool down 5 min. Log HR at finish and 60 s later'],why:'Holds a high heart rate for a full 30 min + 2 laps moto.',drop:true});
    if(m==='p3')return A({kind:'sim3',title:'Race effort + start sprints',code:'SIM',tier:'HARD',mins:60,hr:hr(.85,.92),steps:['Warm up 10 min','2 × 10 min at race effort ('+hr(.85,.92)+'), 3 min easy between','6 × 10 s start sprints, full recovery','Cool down 5 min'],why:'Keeps race fitness sharp while volume drops.',drop:true});
    return A({kind:'thr',n:m==='dl'?2:3,len:m==='dl'?8:10,title:'Threshold',code:'THR',tier:m==='dl'?'MOD':'KEY',mins:60,hr:hr(.85,.9),steps:['Warm up 10 min',(m==='dl'?'2 × 8 min':'3 × 10 min')+' at '+hr(.85,.9)+', 2 min easy between','Cool down 5 min. Log HR at finish and 60 s later'],why:'Teaches you to hold a high heart rate for longer: the engine for a 30-minute moto.',drop:true})}
  if(kind==='short')return A({kind:'short',title:'Short intervals',code:'4×2',tier:'MOD',mins:35,hr:hr(.88,.92),steps:['Warm up 10 min','4 × 2 min hard at '+hr(.88,.92)+', 2 min easy','Cool down 5 min'],why:'Keeps you sharp without tiring you before the race.'});
  if(kind==='recov')return A({kind:'recov',title:'Recovery session',code:'REC',tier:'EASY',mins:60,hr:'under '+Math.round(MAXHR()*.6)+' bpm',steps:['Easy spin 30 min','Mobility 20 min','Foam roll and breathing 10 min'],why:'Blood flow and mobility so you are fresh for two days on track. Lighter than Zone 2.'});
  if(kind==='mob')return A({kind:'mob',title:'Mobility',code:'MOB',tier:'EASY',mins:25,steps:MOB,why:'Recovery. Nothing hard.'});
  if(kind==='rest')return A({kind:'rest',title:'Active rest',code:'REST',tier:'EASY',mins:40,steps:['30–45 min of anything easy you enjoy: bike, swim, walk','10 min mobility','Get any niggles checked by a physio'],why:'Recover fully before the next build.'});
}
function testSess(which){
  if(which==='row')return {id:'am',time:'05:30',title:'Test: 2 km row',code:'TEST',tier:'KEY',mins:30,steps:['Rower, damper 5: warm up 10 min easy, then 3 × 20 s hard','Rower: 2 km all-out. Log your time in seconds','Log heart rate at the finish and 60 s later'],tests:[['row','2 km row (seconds)'],['hrdrop','HR drop after 60 s (bpm)']]};
  if(which==='t1')return {id:'pm',time:'17:45',title:'Test: squat, core, grip, calves',code:'TEST',tier:'KEY',mins:75,warm:WARM(),steps:['Back squat: 5 at 40 kg, 3 at 60 kg, then add 5–10 kg sets of 3 until it is hard but clean. Log the best set of 3','Dead hang: one max hold','Side plank: max hold each side, log the weaker','Strict hanging leg raise: max reps','Single-leg calf raise off a step: max reps each leg, log the weaker'],tests:[['squat','Back squat best set of 3 (kg)'],['hang','Dead hang (s)'],['plank','Side plank, weaker side (s)'],['hlr','Hanging leg raises (reps)'],['calf','Calf raises, weaker leg (reps)']]};
  if(which==='t2')return {id:'pm',time:'17:45',title:'Test: trap-bar + 10-minute chin-ups',code:'TEST',tier:'KEY',mins:60,warm:WARM(),steps:['Trap-bar deadlift: ramp in sets of 3 to a hard, clean set of 3','Rest 10 min','Chin-ups: as many as possible in 10 minutes. Overhand grip, wider than shoulders, dead hang start, rest when needed'],tests:[['trap','Trap-bar best set of 3 (kg)'],['chin','Chin-ups in 10 min']]};
}
const EQ={bike:['Wattbike or spin bike','85–95 rpm, seated'],air:['Air bike (Assault or Echo)','Arms and legs together. No air bike: Wattbike'],row:['Rower','Damper 5. 18–22 strokes a minute easy, 24–28 for hard blocks'],tread:['Treadmill incline walk','8–10% incline, 5.5–6.5 km/h. Raise the incline to lift HR, never run'],road:['Road bike outdoors','Or the Wattbike indoors if it is wet or dark'],mixed:['Rower + stations','See each station']};
const equip=(k,w)=>({z2:w===3?'tread':'bike',ap:'air',thr:'row',sim:'air',sim3:'air',short:'air',circ:'mixed',long:'road',recov:'bike'}[k]||null);
function plan(s){const r=plan0(s),w=dow(s);for(const k of ['am','pm'])if(r[k]&&r[k].kind&&!r[k].eq)r[k]={...r[k],eq:equip(r[k].kind,w)};return r}
function plan0(s){
  const c=ctx(s),w=c.w,m=c.mode,wk=c.wk;
  const P=(o)=>({c,am:null,pm:null,track:null,type:'gym',...o});
  if(m==='pre')return P({type:'rec',title:'Plan starts Saturday 28 November'});
  if(c.k!==null&&c.n>=toN('2027-01-25')){
    const k=c.k,we=w>=6;
    if(k===0)return P({type:'race',title:c.race+': race day',track:{kind:'race',tier:'KEY'}});
    if(k===-1)return P({type:'rec',title:'Day after racing: full rest',am:cond('mob',m,wk)});
    if(we&&k>=1)return P({type:'track',title:'Track: race-week sharpener',track:{kind:'light',tier:'MOD'}});
    if(k===1)return P({type:'rec',title:'Prep day: travel, bike prep',am:cond('mob',m,wk)});
    if(k===2)return P({type:'rec',title:'Off: rest before race day'});
    if(k===3)return P({title:'Primer',pm:pmStrength('PR','race',1,w,false)});
    if(k===4)return P({title:'Short intervals',am:cond('short',m,wk)});
    if(k===5)return P({title:'Full body, moderate',pm:pmStrength('FBM','race',1,w,false)});
    if(k===6)return P({type:'rec',title:'Easy Zone 2',am:cond('z2','race',wk)});
  }
  if(m==='test'){
    if(s==='2026-11-28')return P({type:'track',title:'Day 1 · Track: baseline day',track:{kind:'base',tier:'KEY'}});
    if(s==='2026-11-29')return P({type:'track',title:'Track: speed + starts',track:{kind:'sun',tier:'HARD'}});
    if(s==='2026-11-30')return P({title:'Test day 1',am:testSess('row'),pm:testSess('t1')});
    if(s==='2026-12-01')return P({title:'Zone 2 + test day 2',am:cond('z2','p1',1),pm:testSess('t2')});
  }
  if(m==='tr'){if(w>=6)return P({type:'rec',title:'Optional fun ride. No plan, no stopwatch',am:cond('rest',m,wk)});return P({type:'rec',title:'Active rest',am:cond('rest',m,wk)})}
  const deloadWeek=m==='dl';
  if(w===6)return P({type:'track',title:'Track: technique + race motos',track:{kind:'sat',tier:big(m)||m==='p3'?'KEY':'HARD'}});
  if(w===7)return deloadWeek?P({type:'rec',title:'Deload: Sunday off'}):P({type:'track',title:'Track: speed, lines, starts',track:{kind:'sun',tier:'HARD'}});
  if(w===5){if(hardBlock(m))return P({type:'gym',title:'Recovery + long Zone 2 ride',am:cond('recov',m,wk),pm:cond('long',m,wk)});return P({type:'rec',title:'Recovery: mobility, prep the bike, eat, sleep',am:cond('recov',m,wk)})}
  if(m==='p3'){const k=['A3','GN','C3','GN'][w-1];return P({title:['Zone 2 + heavy lower','Intervals + grip/neck','Zone 2 + heavy hinge and pulls','Race effort + grip/neck'][w-1],am:cond(['z2','ap','z2','th'][w-1],m,wk),pm:pmStrength(k,m,wk,w,false)})}
  if(m==='in'){const k=['FBA',null,'FBB','FBC'][w-1];return P({title:['Zone 2 + full body A','Aerobic power','Zone 2 + full body B','Threshold + full body C'][w-1],am:cond(['z2','ap','z2','th'][w-1],m,wk),pm:k?pmStrength(k,m,wk,w,false):null})}
  const key=['A','B','C','D'][w-1];
  return P({title:['Zone 2 + Strength A','Aerobic power + Strength B','Zone 2 + Strength C','Threshold + Strength D'][w-1],am:cond(['z2','ap','z2','th'][w-1],m,wk),pm:pmStrength(key,m,wk,w,true)});
}
function dayLoad(p){let a=0,k=false;for(const x of [p.am,p.pm,p.track]){if(x&&x.tier){a+=TS[x.tier];if(x.tier==='KEY')k=true}}return {a,k}}

/* ---------- track plans ---------- */
const TT={sand:'Sand',hardpack:'Hardpack',loam:'Loam / intermediate',mud:'Mud / wet',mixed:'Mixed'};
const TIP={sand:'Sand: stay on the throttle, weight back through whoops, momentum over braking. Fitness costs more here: drink between every session.',hardpack:'Hardpack: braking points and smooth throttle matter most. Keep weight on the front wheel into turns; find the traction lines.',loam:'Loam: ruts form fast. Commit to a line, look through the rut. Re-walk the key corners before session 3.',mud:'Mud: line choice and momentum. Shorter motos, extra tear-offs, skip hot laps if it is unsafe.',mixed:'Mixed: walk it first and note where the ground changes; adjust braking and lines for each section.'};
const FOCUS=['Corners: ruts, inside lines, body forward','Braking: late, hard, straight-line braking','Jumps and rhythm sections','Whoops and rough ground','Starts and the first corner','Different ground (try a new track)','Passing and line choice','Full race-day simulation'];
function focusFor(s){return FOCUS[(Math.floor((toN(s)-toN('2026-11-28'))/7)%8+8)%8]}
function trackPlan(kind,s,type,n,len){
  const c=ctx(s),long=c.mode!=='test'&&c.mode!=='p1'&&c.mode!=='dl'&&c.mode!=='off';
  const moto=long?'30 min + 2 laps':'20 min',L=len||20;
  const T={
    sat:[['Warm-up + body position','2 easy laps, then build to 80% ('+hr(.7,.8)+'). Elbows up, grip with your knees. Pick 2 test corners and a sprint section.'],['Corner block + technique','Corner block: brake later, carry speed, drive out on your 2 corners; time the sector. Then this week\'s focus: '+focusFor(s)+'.'],['Race moto 1','Gate or line start, then '+moto+' at race pace ('+hr(.85,.95)+'). Log every lap. Stay relaxed on the bars.'],['Starts + race moto 2','5 starts into the first corner, then '+(long?moto:'15–20 min')+' at '+hr(.85,.95)+'. Compare last 2 laps to your best.']],
    sun:[['Warm-up + sprint sections','2 easy laps, then 6 timed runs through one corner and the straight after it. Early throttle, clean shifts.'],['Hot laps','3 × 3 laps flat out ('+hr(.9,1)+'), full rest between until HR is under '+Math.round(MAXHR()*.65)+' bpm. Qualifying simulation: best lap counts.'],['Corner sectors + follow','Time the same 2–3 corners; change one thing per run (line, braking point, gear). Then 10 min following a faster rider.'],['Starts + moto','10 starts with a full first corner, then a 15–20 min moto at race pace ('+hr(.85,.95)+').']],
    base:[['Warm-up + pick test markers','Build pace. Choose 2 test corners and 1 sprint section you will time all year.'],['Baseline hot laps','3 × 3 laps flat out ('+hr(.9,1)+'). Log your best lap: this is your baseline.'],['Baseline moto','30 min + 2 laps at race pace ('+hr(.85,.95)+'). Log every lap; the gap between best and last 2 laps is your engine baseline.'],['Starts + corner sector baseline','10 starts, then time your test corners 6 times.']],
    light:[['Warm-up','Easy laps, check the bike and set-up.'],['Starts','8–10 starts. Same routine you will use on race day.'],['Short race-pace run','10 min at race pace ('+hr(.85,.92)+'). Stop while it feels good.'],['Optional','Skip it if session 3 felt sharp. Rest is the priority.']],
    race:[['Practice 1','Learn the track at 80%. Find 2 lines per section.'],['Practice 2 / qualifying','Clear-track laps matter most. Do not waste them in traffic.'],['Moto 1','Warm up 20 min before the gate. Run your gate routine. Hard first 3 laps, steady middle, push the last 5 min.'],['Moto 2','Drink, eat carbs, stay out of the sun between motos. Same routine.']]
  };
  let base=(T[kind]||T.sat).map(x=>({title:x[0],focus:x[1],items:[]}));
  n=Math.max(1,Math.min(8,+n||4));
  while(base.length<n)base.push({title:'Extra: technique',focus:'Repeat this week\'s focus ('+focusFor(s)+') on a different section.',items:[]});
  return base.slice(0,n).map(x=>({...x,mins:kind==='race'?null:L}));
}
const SETF=[['fork.comp','Fork compression (clicks out)'],['fork.reb','Fork rebound (clicks out)'],['fork.height','Fork height in clamps (mm)'],['shock.hsc','Shock high-speed comp (turns out)'],['shock.lsc','Shock low-speed comp (clicks out)'],['shock.reb','Shock rebound (clicks out)'],['shock.sag','Race sag (mm)'],['tyre.front','Front tyre'],['tyre.rear','Rear tyre'],['tyre.fp','Front pressure (psi)'],['tyre.rp','Rear pressure (psi)'],['gear.front','Front sprocket'],['gear.rear','Rear sprocket'],['bike.map','Engine map'],['bike.other','Bars, levers, clutch, other']];
const setupSum=st=>{if(!st)return '';const g=k=>getK(st,k);const a=[];if(g('fork.comp')!=null||g('fork.reb')!=null)a.push('Fork C'+(g('fork.comp')??'–')+'/R'+(g('fork.reb')??'–'));if(g('shock.lsc')!=null||g('shock.reb')!=null)a.push('Shock L'+(g('shock.lsc')??'–')+'/R'+(g('shock.reb')??'–'));if(g('shock.sag')!=null)a.push('Sag '+g('shock.sag'));if(g('tyre.rp')!=null)a.push(g('tyre.fp')+'/'+g('tyre.rp')+' psi');if(g('gear.front')!=null)a.push(g('gear.front')+'/'+(g('gear.rear')??'–'));return a.join(' · ')};

/* ---------- nutrition ---------- */
function fuel(p){
  const cut=p.c.n<toN('2027-01-25');
  const t=(cut?{gym:[3100,160,455,70,3.5],rec:[2800,160,380,70,3],track:[3500,160,560,70,4.5],race:[3800,150,650,70,4.5]}:{gym:[3400,155,525,75,3.5],rec:[3000,155,440,75,3],track:[3800,150,620,75,4.5],race:[3800,150,650,70,4.5]})[p.type];
  const G=[['05:00','1 slice toast with jam or honey',100],['06:30','Overnight oats: 80 g oats, 300 ml semi-skimmed milk, 150 g 0% Greek yoghurt, frozen berries blended in, 1 tsp honey',550],['10:00','2 tuna, chicken or egg wraps',450],['13:00','Prep box',700],['15:30','Bagel with jam + 250 g 0% Greek yoghurt',350],['17:15','2 rice cakes with jam (fuel for the PM session)',150],['19:15','Pasta bolognese: 100 g pasta (dry), 150 g 5% mince, sauce with blended hidden veg',600],['20:45','250 g cottage cheese or 0% Greek yoghurt',200]];
  let meals=p.type==='gym'?G:p.type==='rec'?G.filter((x,i)=>i!==0&&i!==5):[['Wake','500 ml water + electrolyte tab or a pinch of salt',0],['3–4 h before','Oats with honey, 2 slices toast with jam, 2 eggs',750],['60–90 min before','Bagel with jam or honey + 500 ml electrolyte drink',350],['Between sessions','30–60 g carbs: jam sandwich, rice cakes with honey or jelly sweets + 500–750 ml fluid (every break)',600],['After last session','Chicken wraps + 500 ml milk',700],['Evening','Big dinner: rice or pasta, chicken or mince, veg',900],['Before bed','250 g cottage cheese or 0% Greek yoghurt',200]];
  if(!cut&&(p.type==='gym'||p.type==='rec'))meals=meals.concat([['16:30','Extra for maintenance: bagel with peanut butter + 300 ml milk',300]]);
  return {kcal:t[0],p:t[1],c:t[2],f:t[3],water:t[4],meals,cut};
}

/* ---------- storage ---------- */
const pend={},busy={},tmr={};
const BOX={days:'days',track:'track',tracks:'tracks',reviews:'reviews',gps:'gpsx'};
function docObj(path){const [col,id]=path.split('/');if(col==='profile')return S.prof;const box=S[BOX[col]];return box[id]||(box[id]={})}
async function flush(path){
  if(busy[path]||!pend[path])return;busy[path]=true;const o=pend[path];delete pend[path];
  const q='mxq:'+path;try{localStorage.setItem(q,JSON.stringify(o))}catch(e){}
  try{if(S.db){if(o.__del)await S.db.doc(path).delete();else await S.db.doc(path).set(JSON.parse(JSON.stringify(o)))}else{try{if(o.__del)localStorage.removeItem('mx:'+path);else localStorage.setItem('mx:'+path,JSON.stringify(o))}catch(e){}}
    try{localStorage.removeItem(q)}catch(e){}
    if(S.msg.startsWith('No signal')){S.msg='';renderMsg()}}
  catch(e){if(e&&e.code==='quota_exceeded'){S.msg='Storage is full: tell Claude.'}else{if(!pend[path])pend[path]=o;S.msg='No signal: saved on this phone, it will sync when you are back online.';setTimeout(()=>flush(path),8000)}renderMsg()}
  busy[path]=false;if(pend[path]&&!S.msg.startsWith('No signal'))flush(path);
}
function save(path,now){pend[path]=docObj(path);clearTimeout(tmr[path]);tmr[path]=setTimeout(()=>flush(path),now?0:500)}
function remove(path){const [col,id]=path.split('/');delete S[BOX[col]][id];clearTimeout(tmr[path]);pend[path]={__del:true};flush(path)}
function setK(o,k,v){const ks=k.split('.');let x=o;for(let i=0;i<ks.length-1;i++){x=x[ks[i]]&&typeof x[ks[i]]==='object'?x[ks[i]]:(x[ks[i]]={})}if(v===''||v===null)delete x[ks.at(-1)];else x[ks.at(-1)]=v}
const getK=(o,k)=>k.split('.').reduce((x,p)=>x&&x[p],o);

/* ---------- helpers ---------- */
function parseT(v){v=String(v).trim();if(!v)return '';if(v.includes(':')){const [a,b]=v.split(':');const s=(+a)*60+(+b);return isFinite(s)?s:''}const n=+v;return isFinite(n)?n:''}
const fmtT=s=>{if(s===''||s==null||!isFinite(s))return '';s=+s;if(s<60)return s.toFixed(1);const m=Math.floor(s/60);return m+':'+(s-m*60).toFixed(1).padStart(4,'0')};
const fid=(doc,k)=>(doc+'-'+k).replace(/[^a-z0-9]/gi,'_');
function inp(doc,k,o={}){const v=getK(docObj(doc),k);const val=o.time?fmtT(v):(v??'');return '<input id="'+esc(fid(doc,k))+'" data-doc="'+esc(doc)+'" data-k="'+esc(k)+'"'+(o.time?' data-t="1" inputmode="decimal"':(o.text?'':' inputmode="decimal"'))+' value="'+esc(val)+'" placeholder="'+esc(o.ph||'')+'" aria-label="'+esc(o.lab||k)+'">'}
function chk(doc,k,lab){const v=getK(docObj(doc),k);return '<input type="checkbox" id="'+esc(fid(doc,k))+'" data-doc="'+esc(doc)+'" data-k="'+esc(k)+'" '+(v?'checked':'')+' aria-label="'+esc(lab||k)+'">'}
function fld(doc,k,lab,o){return '<div><label for="'+esc(fid(doc,k))+'">'+esc(lab)+'</label>'+inp(doc,k,{lab,...(o||{})})+'</div>'}
function lastFor(id,before){
  const ds=Object.keys(S.days).filter(d=>d<before).sort().reverse();
  for(const d of ds){const sets=(S.days[d]||{}).sets||{};for(const key of Object.keys(sets)){if(key.split(':')[1]!==id)continue;const arr=Object.values(sets[key]||{}).filter(x=>x&&+x.kg>0);if(arr.length){const top=arr.reduce((a,b)=>(+b.kg>+a.kg?b:a));const allDone=Object.values(sets[key]).every(x=>x&&x.done);return {d,kg:+top.kg,reps:top.reps||'',allDone}}}}
  return null;
}
function verdict(day,prevDay){
  const r=+getK(day,'whoop.rec');if(!(r>0))return ['n','Log your Whoop recovery to get today\'s call.'];
  const pr=+getK(prevDay||{},'whoop.rec');
  if(r<34&&pr>0&&pr<34)return ['r','Red two days running: take today off, eat 300 kcal more and get an extra hour of sleep.'];
  if(r<34)return ['r','Red ('+r+'%): swap the hard session for Zone 2 or mobility.'];
  if(r<67)return ['a','Amber ('+r+'%): do the session, cut sets by a third, no maximal intervals.'];
  return ['g','Green ('+r+'%): train as written. Hit the key session hard.'];
}
const tdays=()=>Object.entries(S.track).filter(([i,t])=>t&&t.date).map(([id,t])=>({id,...t}));
const bestOf=t=>{const v=Object.values(t.log||{}).map(x=>+x.best).filter(x=>x>0);return v.length?Math.min(...v):null};
const gapOf=t=>{const v=Object.values(t.log||{}).filter(x=>+x.best>0&&+x.last2>0).map(x=>x.last2-x.best);return v.length?Math.min(...v):null};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'track';

