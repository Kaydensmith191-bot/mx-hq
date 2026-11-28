
/* ---------- injury mode: tell the app what's hurt, the plan works around it in stages ---------- */
const INJ_AREAS=[['shoulder','Shoulder'],['collarbone','Collarbone'],['arm','Elbow, wrist or hand'],['back','Back'],['ribs','Ribs'],['hip','Hip or groin'],['knee','Knee'],['ankle','Ankle or foot'],['head','Concussion']];
const INJ_NAME=Object.fromEntries(INJ_AREAS);
const INJ_STAGES=['Protect','Rebuild','Return'];
const CONC_STAGES=['Rest','Light activity','Steady cardio','Gym and harder cardio','Riding practice','Racing'];
const CONC_DAY=[0,1,3,7,14,20]; // earliest day after the injury each stage can start (UK grassroots guidance: no racing before day 21)
const injNow=s=>{const i=S.prof&&S.prof.inj;return i&&i.area&&!i.done&&(!s||!i.start||s>=i.start)?i:null};
const injDays=(i,s)=>Math.max(0,toN(s||todayS())-toN(i.start||todayS()));
const injLabel=i=>(i.side&&i.side!=='na'&&i.area!=='head'&&i.area!=='ribs'&&i.area!=='back'?(i.side==='l'?'Left ':i.side==='r'?'Right ':'Both ')+INJ_NAME[i.area].toLowerCase():INJ_NAME[i.area]);
const injStageName=i=>i.area==='head'?CONC_STAGES[(i.stage||1)-1]:INJ_STAGES[(i.stage||1)-1];
const injStages=i=>i.area==='head'?6:3;

/* which exercises load which area (matched on the exercise name) */
const RX={
  up:/press|push-?up|pull-?up|chin|row|dip|bench|carry|hang|wring|grip|curl|burpee|plank|shoulder tap|mountain|pike|band pull|face pull|landmine|throw|slam|farmer|suitcase|turkish|bear crawl|arm|wall ball/i,
  grip:/pull-?up|chin|hang|wring|grip|carry|row|deadlift|rdl|farmer|suitcase|towel|clean|swing|press|push-?up|dip|bench|plank|burpee|pike|mountain|curl/i,
  low:/squat|lunge|split|step|jump|bound|hop|pogo|landing|broad|calf|nordic|wall sit|rdl|deadlift|hinge|hip thrust|bridge|copenhagen|skater|sled|leg|box|trap bar|clean|swing|burpee|mountain|attack/i,
  trunk:/deadlift|rdl|hinge|squat|carry|row|plank|v-up|knee raise|hollow|dead bug|bird dog|rotation|russian|sit-?up|crunch|slam|throw|burpee|clean|swing|good morning|back ext|pallof|side plank|copenhagen/i,
  impact:/jump|bound|broad|landing|pogo|hop|burpee|drop|sprint|skater|box|plyo|step-off/i,
  heavy:/back squat|front squat|deadlift|trap bar|bench|overhead press|clean|max|1rm|heavy/i,
  ankleOK:/bridge|hip thrust|nordic|copenhagen|leg curl|knee raise|v-up|hollow|dead bug|bird dog|side plank|plank/i,
  kneeOK:/bridge|hip thrust|copenhagen|knee raise|v-up|hollow|dead bug|bird dog|side plank|plank|calf/i,
  neck:/neck/i,
  held:/back squat|front squat|deadlift|rdl|romanian|ab wheel|rollout|air bike|trap bar|clean|snatch|swing|thruster|goblet|farmer|carry|pallof|landmine|med-?ball|sled/i
};
function injBlocks(area,name){const n=String(name||'');
  if(area==='shoulder'||area==='collarbone')return RX.up.test(n)||RX.held.test(n)||/pallof/i.test(n)||RX.neck.test(n)&&area==='collarbone';
  if(area==='arm')return RX.grip.test(n)||RX.held.test(n);
  if(area==='back')return RX.trunk.test(n)||RX.impact.test(n)||RX.heavy.test(n);
  if(area==='ribs')return RX.trunk.test(n)||/push-?up|pull-?up|chin|press|dip|bench|burpee|hang/i.test(n);
  if(area==='hip')return RX.low.test(n)||/knee raise|v-up|copenhagen/i.test(n);
  if(area==='knee')return RX.low.test(n)&&!RX.kneeOK.test(n)||/nordic/i.test(n);
  if(area==='ankle')return RX.low.test(n)&&!RX.ankleOK.test(n);
  return false}

/* rehab for each area and stage. Conservative: only what is usually safe, the physio has the final say */
const RH=(id,name,sets,reps,cue)=>E('rh_'+id,'Rehab: '+name,sets,reps,'Pain-free only','30 s',cue);
const REHAB={
  shoulder:[[RH('pend','Pendulum swings, arm hanging relaxed',3,'30 s','Lean on a table, let the arm swing in small circles. No effort from the shoulder.'),RH('scap','Shoulder-blade squeezes',3,'10 × 5 s','Squeeze the blades back and down, hold, relax.'),RH('iso','Isometric outward rotation against a wall',3,'5 × 10 s','Elbow at your side, push the back of the hand gently into the wall. 30% effort.')],
    [RH('ber','Band outward rotation',3,'15','Elbow tucked to your side, slow both ways.'),RH('brow','Band row',3,'15','Squeeze the shoulder blades at the end.'),RH('wsl','Wall slides',3,'10','Forearms on the wall, slide up only as far as it stays pain-free.')],
    [RH('pup','Push-up plus, hands on a bench',3,'10','At the top, push the floor away to spread the shoulder blades.'),RH('kp','Half-kneeling single-arm press, light',3,'10 each','Light dumbbell, ribs down, smooth.'),RH('hang','Bar hang with feet on the floor',3,'20 s','Take some weight through the arms, build up over the weeks.')]],
  collarbone:[[RH('hand','Hand squeezes and wrist and elbow movement on the sling side',3,'15','Keeps the arm moving while the bone heals. Keep the shoulder still.'),RH('scap','Shoulder-blade squeezes',3,'10 × 5 s','Gentle, no pain.'),RH('walk','Walk',1,'20–30 min','Daily. Easy pace.')],
    [RH('pend','Pendulum swings',3,'30 s','Only once your physio says the bone allows it.'),RH('iso','Isometric shoulder holds (forward, out, back)',3,'5 × 10 s each','30% effort against a wall.'),RH('ber','Band outward rotation',3,'12','Light band, elbow at your side.')],
    [RH('pup','Push-up plus, hands on a bench',3,'10','Smooth and pain-free.'),RH('brow','Band row',3,'15','Full squeeze.'),RH('kp','Half-kneeling single-arm press, light',3,'10 each','Light.')]],
  arm:[[RH('glide','Finger tendon glides and wrist circles',3,'10','Slow, full range that stays pain-free.'),RH('squeeze','Soft ball or putty squeeze',3,'15','Gentle. Stop if it hurts.')],
    [RH('wc','Wrist curls and reverse curls, light',3,'15 each','1–2 kg, slow on the way down.'),RH('rice','Rice bucket: open, close, twist',3,'30 s','Hand buried in a bucket of rice.')],
    [RH('wring','Towel wring',3,'20 s','Build the grip back up.'),RH('hang','Bar hang, feet on the floor',3,'20 s','Part bodyweight first.')]],
  back:[[RH('walk','Walk',1,'20–30 min','Twice a day if you can. Walking helps most backs settle.'),RH('cc','Cat-cow',2,'10','Slow, small range that feels easy.'),RH('db','Dead bug',3,'8 each','Low back stays flat on the floor.')],
    [RH('bd','Bird dog',3,'8 each','Reach long, hips level, no twisting.'),RH('gb','Glute bridge',3,'12','Squeeze the glutes, ribs down.'),RH('sp','Side plank on knees',3,'20 s each','Straight line from knees to head.')],
    [RH('slrdl','Single-leg RDL, light',3,'8 each','Hips square, slow.'),RH('suit','Suitcase carry, light',3,'30 m each side','Stand tall, don\'t lean.'),RH('bext','Back extension, bodyweight',3,'10','Smooth, no swinging.')]],
  ribs:[[RH('br','Deep breathing',5,'5 slow breaths','Every hour you\'re awake. Stops the chest stiffening up.'),RH('walk','Walk',1,'20–30 min','Easy pace.')],
    [RH('db','Dead bug',3,'8 each','Only if it doesn\'t hurt to breathe hard.'),RH('bd','Bird dog',3,'8 each','Slow.')],
    [RH('sp','Side plank',3,'20 s each','Build up the time.'),RH('pal','Pallof press',3,'10 each','Resist the twist.')]],
  hip:[[RH('gs','Glute squeezes lying down',3,'10 × 5 s','Gentle.'),RH('hs','Heel slides',3,'10 each','Only through the pain-free range.')],
    [RH('gb','Glute bridge',3,'12','Both legs.'),RH('sl','Side-lying leg raise',3,'12 each','Slow, toes forward.'),RH('cs','Clamshell',3,'15 each','Knees bent, feet together.')],
    [RH('ss','Split squat, part range',3,'8 each','Only as deep as stays pain-free.'),RH('cph','Copenhagen plank, knee on the bench',3,'15 s each','Short lever version first.')]],
  knee:[[RH('qs','Quad sets: tighten the thigh',3,'10 × 10 s','Leg straight, push the back of the knee down.'),RH('slr','Straight-leg raise',3,'10','Lock the knee first, then lift.'),RH('hs','Heel slides',3,'10','Bend only as far as stays pain-free.')],
    [RH('ws','Wall sit, pain-free depth',3,'30 s','Shallow first, deeper over the weeks.'),RH('gb','Glute bridge',3,'12','Drive through the heels.'),RH('su','Step-up, low step',3,'10 each','Slow, knee tracks over the toes.')],
    [RH('ss','Split squat',3,'8 each','Full range if pain-free.'),RH('slb','Single-leg balance',3,'30 s each','Eyes closed when it gets easy.'),RH('pogo','Small pogo hops',3,'15 s','Only once squats are pain-free.')]],
  ankle:[[RH('alpha','Ankle alphabet',2,'1 alphabet','Draw the letters with your toes.'),RH('cst','Towel calf stretch',3,'30 s','Gentle pull, no pain.')],
    [RH('cr','Calf raise, both legs',3,'15','Slow, full range.'),RH('slb','Single-leg balance',3,'30 s each','Near a wall for safety.')],
    [RH('scr','Single-leg calf raise',3,'12 each','Off a step when it\'s easy.'),RH('lh','Small side-to-side hops',3,'15 s','Land soft.'),RH('cush','Balance on a cushion',3,'30 s each','Ankle stability for the footpegs.')]]
};
/* work for the parts that aren't hurt, so sessions stay worth doing */
const ALT={
  upper:()=>[E('ia_pu',isBW()?'Push-up (or seated dumbbell press)':'Seated dumbbell press',3,'10','Moderate','90 s','Seated so the legs rest.'),E('ia_row',isBW()?'Inverted row under a table':'Seated cable row',3,'12','Moderate','90 s','Squeeze the shoulder blades.'),E('ia_bp','Band pull-apart',3,'15','Band','45 s','Open the chest.')],
  lower:()=>[E('ia_ws','Wall sit, hands off the legs',3,'45 s','Bodyweight','60 s','No arms needed.'),E('ia_slrdl','Single-leg RDL, hands free',3,'8 each','Bodyweight','60 s','Balance and hamstrings.'),E('ia_gb','Glute bridge',3,'12','Bodyweight','45 s','Drive through the heels.'),E('ia_cr','Calf raise',3,'15','Bodyweight','45 s','Full range.')],
  core:()=>[E('ia_db','Dead bug',3,'8 each','Bodyweight','45 s','Back flat.'),E('ia_bd','Bird dog',3,'8 each','Bodyweight','45 s','Slow.')]
};
const ALT_FOR={shoulder:['lower','core'],collarbone:['lower'],arm:['lower','core'],back:['upper'],ribs:['lower'],hip:['upper'],knee:['upper','core'],ankle:['upper','core']};
/* cardio that doesn't load the injury */
const SAFE={
  shoulder:['Static bike, hands resting light on the bars or off them. No rower, air bike, swimming or press-ups.','Static bike. Road bike only once you can hold the bars pain-free.','Any bike. Rower only if it\'s pain-free.'],
  collarbone:['Static bike only, sitting upright, hands off the bars. No road bike: a fall now could undo the healing.','Static bike, hands light on the bars.','Road bike once your physio is happy with the bone.'],
  arm:['Static bike sitting upright with a loose grip, or walking. No rower, air bike or grip work.','Static bike or easy run. Light grip only.','Any cardio that\'s pain-free.'],
  back:['Walking or static bike, sitting upright. No running, rower or jumping.','Static bike or walking. Short runs only if pain-free the next morning.','Any cardio that\'s pain-free the next morning.'],
  ribs:['Walking or very easy static bike. Keep breathing comfortable: no hard efforts.','Static bike at Zone 2 only. No hard breathing yet.','Any cardio, building back to hard efforts.'],
  hip:['Swim with a pull buoy (arms only) or a seated upper-body circuit. Bike only if pain-free.','Static bike, low resistance, if pain-free. Or swim with a pull buoy.','Any bike. Running only if pain-free.'],
  knee:['Swim with a pull buoy (arms only) or a seated upper-body circuit. No bike, running or jumping yet.','Static bike, low resistance, seat a little higher than usual, if pain-free.','Any bike. Running once single-leg squats are pain-free.'],
  ankle:['Swim with a pull buoy or a seated upper-body circuit. No weight-bearing cardio.','Static bike, low resistance, if pain-free.','Any bike. Running once hopping is pain-free.']
};
function injSess(sess,i,st,s){if(!sess)return sess;const a=i.area,nm=injLabel(i);
  if(sess.code==='TEST'&&st<3)return sess.id==='am'?injSess({...cond('z2',ctx(s).mode,1),id:'am'},i,st,s):{id:'pm',time:'17:45',title:'Rehab: '+nm.toLowerCase()+' (testing waits until you\'re back)',code:'REHAB',tier:'EASY',mins:20,ex:REHAB[a][st-1],inj:true};
  if(sess.ex){let ex=sess.ex.slice(),gone=0;
    const handsFree=/^(shoulder|collarbone|arm)$/.test(a)&&st<3;
    ex=ex.map(x=>{if(x.fin&&st<3){gone++;return null}
      if(!injBlocks(a,x.name))return handsFree&&!/^rh_/.test(x.id)&&RX.low.test(x.name)?{...x,load:'Bodyweight: nothing in your hands',cue:(x.cue||'')+' Injury: keep the arms relaxed, no weights held.'}:x;
      if(st===1){gone++;return null}
      if(st===2){if(RX.impact.test(x.name)||RX.heavy.test(x.name)){gone++;return null}return {...x,sets:Math.max(2,Math.round(x.sets*.6)),load:'Light, pain-free only (max 3/10 pain)',cue:(x.cue||'')+' Injury: stop if pain goes above 3/10.'}}
      return {...x,sets:Math.max(2,Math.round(x.sets*.8)),load:(x.load?x.load+' · ':'')+'about 70% of normal',cue:(x.cue||'')+' Coming back from injury: build up over 2 weeks.'}}).filter(Boolean);
    if(st===1&&gone){const pool=(ALT_FOR[a]||[]).flatMap(k=>ALT[k]()).filter(x=>!ex.some(y=>y.name===x.name));ex=ex.concat(pool.slice(0,Math.min(gone,3)))}
    if(st<3)ex=ex.concat(REHAB[a][st-1]);
    return {...sess,title:sess.title+' · injury version',ex,mins:Math.max(25,Math.min(sess.mins||45,60)),steps:sess.steps,inj:true,warm:sess.warm,post:(sess.post||[]).filter(p=>!(st<3&&p&&p.rows&&/dig|deep/i.test(p.title||'')))}}
  if(sess.kind){const kind=sess.kind,hard=!/^(z2|long|recov|mob|rest)$/.test(kind),eq=injEq(a,st);
    if((st===1&&hard)||(st===2&&kind==='circ')||(a==='ribs'&&st<3&&hard))return {...sess,kind:'z2',main:35,hr:hr(.65,.75),mins:45,title:'Zone 2, injury-safe',tier:'EASY',code:'Z2',amber:false,eq,inj:true};
    if(kind==='long'&&st<3)return {...sess,main:Math.min(sess.main||60,60),mins:Math.min(sess.mins||70,70),eq,inj:true};
    return {...sess,eq:eq||sess.eq,inj:true}}
  return sess}
function concDay(i,st,s){const day=injDays(i,s),lock=day<CONC_DAY[st-1];const P0=(title,am)=>({c:ctx(s),am,pm:null,track:null,type:'rec',title,inj:true});
  const A0=(title,mins,steps)=>({id:'am',time:'08:00',title,code:'CONC',tier:'EASY',mins,steps,inj:true});
  if(st===1)return P0('Concussion: rest',A0('Relative rest',20,['Day '+(day+1)+' since the concussion.','Normal daily life is fine: short easy walks, light screen time.','No training, no lifting, nothing that raises your heart rate much.','If headaches, dizziness or sickness get worse, or you feel confused or very sleepy: call 111, or 999 if it\'s severe.']));
  if(st===2)return P0('Concussion: light activity',A0('Light activity',20,['Walk or very easy static bike, 15–20 min, under '+Math.round(MAXHR()*.6)+' bpm.','Symptoms can go up a little but must settle within an hour. If they don\'t, go back a stage tomorrow.','No lifting, no riding.']));
  if(st===3)return P0('Concussion: steady cardio',A0('Steady cardio',30,['Static bike or jog, 20–30 min at '+hr(.6,.7)+'.','No head movement drills, no lifting yet.','Stay here at least 24 hours symptom-free before moving on.']));
  if(st===4)return null; // gym and harder cardio: normal plan, riding still blocked
  return null}
const INJ_EQN={shoulder:['Static bike','Static bike','Bike'],collarbone:['Static bike, hands off the bars','Static bike','Bike'],arm:['Static bike, loose grip','Static bike','Bike'],back:['Static bike or walk','Static bike or walk','Bike or run'],ribs:['Walk or easy static bike','Static bike','Bike'],hip:['Swim (pull buoy) or upper-body circuit','Static bike, low resistance','Bike'],knee:['Swim (pull buoy) or upper-body circuit','Static bike, low resistance','Bike'],ankle:['Swim (pull buoy) or seated upper-body circuit','Static bike, low resistance','Bike']};
function injEq(a,st){if(st>=3||!INJ_EQN[a])return null;const k='inj_'+a+st;EQ[k]=[INJ_EQN[a][st-1],'Injury: '+SAFE[a][st-1]];return k}
/* the hook plan() calls: rewrites a day around the injury */
function injDay(r,s){const i=injNow(s);if(!i)return r;const st=Math.max(1,Math.min(injStages(i),+i.stage||1));
  if(i.area==='head'){const c=concDay(i,st,s);if(c)return c;
    if(st<5&&(r.track||r.type==='track'||r.type==='race'))return {...r,type:'rec',track:null,title:'No riding: concussion stage '+st,am:cond('z2',ctx(s).mode,1),inj:true};
    if(st<6&&r.type==='race')return {...r,type:'rec',track:null,title:'No racing yet: not before day 21 and only once a doctor clears you',am:cond('z2',ctx(s).mode,1),inj:true};
    return {...r,inj:true}}
  let o={...r,inj:true};const rideOK=st===3&&i.ride;
  if((r.track||r.type==='track'||r.type==='race')&&!rideOK){const m=ctx(s).mode;o={...o,type:'rec',track:null,title:'No riding: '+injLabel(i).toLowerCase(),am:injSess(cond('z2',m,1),i,st,s)}}
  o.am=injSess(o.am,i,st,s);o.pm=injSess(o.pm,i,st,s);
  if(st<3&&!o.pm&&!(o.am&&o.am.ex))o.pm={id:'pm',time:'17:45',title:'Rehab: '+injLabel(i).toLowerCase(),code:'REHAB',tier:'EASY',mins:20,ex:REHAB[i.area][st-1],steps:null,inj:true};
  if(o.title&&!/^No riding/.test(o.title))o.title=o.title+' (injury)';
  return o}

/* ---------- injury UI ---------- */
const INJ_SEV=[['sore','Sore','I can still train around it'],['cant','Can\'t load it','It hurts to use it'],['break','Fracture or surgery','Bone broken or operated on']];
const INJ_NEXT=['Move on when pain at rest has gone, the rehab is pain-free (3/10 at most) and your physio agrees.','Move on when you have full pain-free movement, strength is close to the other side and your physio agrees.','You\'re back when you train at normal loads with no pain the next morning for a week.'];
const INJ_WHAT=['The injured area is rested. Everything else keeps training, with rehab every day.','The injured area comes back in, light and pain-free. No jumps or heavy lifts on it yet.','Full plan at about 70%, building back over 2 weeks. Riding only once you tick cleared to ride.'];
const CONC_WHAT=['Normal daily life and short walks only. At least 24–48 hours.','Walks or very easy static bike, 15–20 min.','20–30 min bike or jog. No lifting.','Back to the normal plan, no riding. Not before day 8.','Only once a doctor has cleared you. Not before day 15.','Not before day 21 after the injury, and only with a doctor\'s OK.'];
function injBanner(){const i=injNow(S.date);if(!i)return '';const st=+i.stage||1,head=i.area==='head';
  return '<div class="card injb"><span class="lab">INJURY MODE · '+esc(injLabel(i).toUpperCase())+' · STAGE '+st+' OF '+injStages(i)+'</span><p style="margin:4px 0 0"><b>'+esc(injStageName(i))+'.</b> '+esc((head?CONC_WHAT:INJ_WHAT)[st-1])+'</p><p class="mut" style="margin:6px 0 0;font-size:13px">Keep protein high and don\'t cut calories hard: healing needs fuel. Pain that gets worse, numbness, or swelling that won\'t settle: see a doctor. <a href="#stats" data-ss="profile">Update injury</a></p></div>'}
function injCard(){const i=S.prof&&S.prof.inj&&!S.prof.inj.done?S.prof.inj:null,F=S.injF;let b='';
  if(F){const area=F.area,sided=area&&!/^(head|ribs|back)$/.test(area),chip=(k,v,t,d)=>'<button type="button" class="'+(F[k]===v?'on':'')+'" aria-pressed="'+(F[k]===v)+'" data-injf="'+k+'|'+v+'"><b>'+t+'</b>'+(d?'<span>'+d+'</span>':'')+'</button>';
    b='<p class="al">What\'s injured?</p><div class="obseg chips">'+INJ_AREAS.map(([v,t])=>chip('area',v,t)).join('')+'</div>'
      +(sided?'<p class="al">Which side?</p><div class="obseg chips">'+[['l','Left'],['r','Right'],['b','Both']].map(([v,t])=>chip('side',v,t)).join('')+'</div>':'')
      +(area&&area!=='head'?'<p class="al">How bad?</p><div class="obseg">'+INJ_SEV.map(([v,t,d])=>chip('sev',v,t,d)).join('')+'</div>':'')
      +(area==='head'?'<p class="mut" style="font-size:13px">Any suspected concussion: no riding or training for at least 24 hours, and see a doctor (call 111). If symptoms get worse, call 999.</p>':'')
      +'<div class="fields" style="margin-top:8px"><div><label for="injd">When did it happen?</label><input id="injd" type="date" value="'+esc(F.start||todayS())+'"></div></div>'
      +(F.sev==='break'?'<p class="mut" style="font-size:13px">With a fracture or surgery, follow your surgeon\'s and physio\'s plan first. The app keeps the rest of you training and only adds rehab that\'s usually safe.</p>':'')
      +'<div class="row2" style="margin-top:10px"><button id="injSave"'+(area?'':' disabled')+'>Change my plan</button><button class="ghost" id="injCancel">Cancel</button></div>'}
  else if(!i)b='<p class="mut" style="margin-top:0">Hurt? Tell the app what\'s injured. Your plan works around it in stages, with rehab built in, until you\'re back to full training.</p><button id="injStart">I\'m injured</button>';
  else{const st=+i.stage||1,n=injStages(i),head=i.area==='head',day=injDays(i),gate=head&&st<n?CONC_DAY[st]:0,locked=head&&day<gate,needDoc=head&&st>=4&&!i.doc;
    b='<p style="margin:0"><b>'+esc(injLabel(i))+'</b> · day '+(day+1)+' · stage '+st+' of '+n+': <b>'+esc(injStageName(i))+'</b></p><p class="mut" style="margin:6px 0 0">'+esc((head?CONC_WHAT:INJ_WHAT)[st-1])+'</p>'
      +'<p class="mut" style="margin:6px 0 0;font-size:13px">'+esc(head?(st<n?'Each stage needs at least 24 hours without symptoms. If symptoms come back, go back a stage.':'Back to full training and racing.'):INJ_NEXT[st-1])+'</p>'
      +(head&&st>=4?'<button type="button" class="'+(i.doc?'':'ghost')+'" id="injDoc" style="margin-top:8px">'+(i.doc?'✓ A doctor has cleared me':'A doctor has cleared me to ride')+'</button>':'')
      +(!head?'<button type="button" class="'+(i.ride?'':'ghost')+'" id="injRide" style="margin-top:8px">'+(i.ride?'✓ Cleared to ride':'My physio has cleared me to ride')+'</button>'+(i.ride&&st<3?'<p class="mut" style="font-size:12px;margin:4px 0 0">Riding switches back on at stage 3.</p>':''):'')
      +'<div class="row2" style="margin-top:10px;flex-wrap:wrap">'+(st<n?'<button id="injNext"'+(locked||needDoc?' disabled':'')+'>Next stage</button>':'')+(st>1?'<button class="ghost" id="injBack">Back a stage</button>':'')+'<button class="ghost" id="injDone">'+(S.injDoneAsk?'Tap again: I\'m fully back':'I\'m recovered')+'</button></div>'
      +(locked?'<p class="mut" style="font-size:12px;margin:6px 0 0">The next stage unlocks on day '+(gate+1)+'.</p>':'')+(needDoc&&st<n?'<p class="mut" style="font-size:12px;margin:6px 0 0">Riding needs a doctor\'s all-clear first.</p>':'')}
  return '<div class="card" style="max-width:760px"><span class="lab">INJURY'+(i?' · ON':'')+'</span>'+b+'</div>'}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#injStart,#injCancel,#injSave,[data-injf],#injNext,#injBack,#injRide,#injDoc,#injDone');if(!t)return;
  const P=S.prof||(S.prof={}),i=P.inj,put=()=>{save('profile/main',true);render()};
  if(t.id==='injStart'){S.injF={area:'',side:'l',sev:'cant',start:todayS()};render();return}
  if(t.id==='injCancel'){S.injF=null;render();return}
  if(t.dataset.injf){const [k,v]=t.dataset.injf.split('|');const d=($('#injd')||{}).value;if(d)S.injF.start=d;S.injF[k]=v;render();return}
  if(t.id==='injSave'){const F=S.injF,d=($('#injd')||{}).value||todayS();if(!F||!F.area)return;
    P.inj={area:F.area,side:/^(head|ribs|back)$/.test(F.area)?'na':F.side,sev:F.area==='head'?'head':F.sev,stage:F.area!=='head'&&F.sev==='sore'?2:1,ride:false,doc:false,start:d,set:new Date().toISOString()};S.injF=null;put();return}
  if(!i)return;
  if(t.id==='injNext'){const n=injStages(i);i.stage=Math.min(n,(+i.stage||1)+1);put();return}
  if(t.id==='injBack'){i.stage=Math.max(1,(+i.stage||1)-1);put();return}
  if(t.id==='injRide'){i.ride=!i.ride;put();return}
  if(t.id==='injDoc'){i.doc=!i.doc;put();return}
  if(t.id==='injDone'){if(!S.injDoneAsk){S.injDoneAsk=true;render();return}S.injDoneAsk=false;P.injHist=(P.injHist||[]).concat([{...i,end:todayS()}]).slice(-10);P.inj=null;put();return}
});
