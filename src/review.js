
/* ---------- weekly review: built in the app from what's been logged, no chat needed ---------- */
function weekReview(){
  const end=toS(toN(todayS())-1),from=toS(toN(end)-6),pFrom=toS(toN(from)-7),pEnd=toS(toN(from)-1);
  const rng=(a,b)=>{const o=[];for(let n=toN(a);n<=toN(b);n++)o.push(toS(n));return o};
  const W=rng(from,end),PW=rng(pFrom,pEnd),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,r1=x=>Math.round(x*10)/10;
  const val=(d,k)=>{const v=+getK(S.days[d]||{},k);return v>0?v:null},list=(ds,k)=>ds.map(d=>val(d,k)).filter(x=>x!=null);
  const slp=ds=>ds.map(d=>sleepH(getK(S.days[d]||{},'whoop.sleep'))).filter(x=>x>0);
  // sessions
  let pl=0,dn=0,keyPl=0,keyDn=0;const missed=[];
  for(const d of W){if(d<START)continue;const p=plan(d),o=S.days[d]||{};for(const k of ['am','pm']){const x=p[k];if(!x)continue;pl++;const done=!!(o.done&&o.done[k]);if(done)dn++;if(x.tier==='KEY'||x.tier==='HARD'){keyPl++;if(done)keyDn++;else missed.push(DN[dow(d)]+' '+x.title)}}}
  // recovery, HRV, RHR, sleep
  const rec=list(W,'whoop.rec'),prec=list(PW,'whoop.rec'),hrv=list(W,'whoop.hrv'),phrv=list(PW,'whoop.hrv'),rhr=list(W,'whoop.rhr'),prhr=list(PW,'whoop.rhr'),sl=slp(W),psl=slp(PW);
  const reds=rec.filter(x=>x<34).length,short=sl.filter(x=>x<7).length,good=sl.filter(x=>x>=8).length;
  // weight
  const wts=W.map(d=>[d,val(d,'weight')]).filter(x=>x[1]),pw=PW.map(d=>val(d,'weight')).filter(Boolean);
  const wNow=wts.length?avg(wts.map(x=>x[1])):null,wPrev=pw.length?avg(pw):null,wCh=wNow!=null&&wPrev!=null?wNow-wPrev:null;
  const goal=CFG?CFG.goal:'lose',cutting=goal==='lose'&&toN(end)<toN(D.p3s);
  // food
  let mPl=0,mDn=0;for(const d of W){if(d<START)continue;const f=fuel(plan(d)),o=S.days[d]||{};mPl+=f.meals.length;f.meals.forEach((m,i)=>{if(getK(o,'meals.'+i))mDn++})}
  // check-ins
  const ci=W.filter(d=>val(d,'whoop.rec')!=null||val(d,'weight')!=null).length;
  // lap times
  const gs=(typeof gsess==='function'?gsess():[]).filter(s=>s.date>=from&&s.date<=end&&s.laps),laps=gs.map(s=>{const b=s.laps[s.best];return b?{track:s.track,date:s.date,best:b.time,a:s.aLap,n:s.laps.filter(l=>l.valid).length}:null}).filter(Boolean);
  const prevBest=t=>{const o=(typeof gsess==='function'?gsess():[]).filter(s=>s.track===t&&s.date<from&&s.laps&&s.laps[s.best]).map(s=>s.laps[s.best].time);return o.length?Math.min(...o):null};
  const fmtT=t=>{const m=Math.floor(t/60),s=(t-m*60).toFixed(2);return m+':'+(s<10?'0':'')+s};
  const inj=typeof injNow==='function'?injNow(end):null;

  const shows=[],probs=[],next=[];
  if(pl)shows.push('Sessions: '+dn+' of '+pl+' done ('+Math.round(dn/pl*100)+'%). Hard and key sessions: '+keyDn+' of '+keyPl+'.');
  if(rec.length)shows.push('Recovery: average '+Math.round(avg(rec))+'%'+(prec.length?' ('+(avg(rec)>=avg(prec)?'up':'down')+' from '+Math.round(avg(prec))+'%)':'')+', '+reds+' red day'+(reds===1?'':'s')+'.');
  if(hrv.length)shows.push('HRV: '+Math.round(avg(hrv))+' ms'+(phrv.length?' (last week '+Math.round(avg(phrv))+')':'')+'. Resting HR: '+(rhr.length?Math.round(avg(rhr))+' bpm'+(prhr.length?' (last week '+Math.round(avg(prhr))+')':''):'not logged')+'.');
  if(sl.length)shows.push('Sleep: average '+fmtH(avg(sl))+(psl.length?' (last week '+fmtH(avg(psl))+')':'')+'. '+good+' night'+(good===1?'':'s')+' over 8 h, '+short+' under 7 h.');
  if(wNow!=null)shows.push('Weight: '+r1(wNow)+' kg average'+(wCh!=null?' ('+(wCh>0?'+':'')+r1(wCh)+' kg on last week)':'')+'.');
  if(mPl)shows.push('Food: '+mDn+' of '+mPl+' meals ticked off ('+Math.round(mDn/mPl*100)+'%).');
  laps.forEach(l=>{const pb=prevBest(l.track);shows.push('Lap times, '+l.track+' '+nice(l.date)+': best '+fmtT(l.best)+(l.a?', A lap '+fmtT(l.a):'')+' over '+l.n+' laps'+(pb?' ('+(l.best<pb?fmtT(pb-l.best).replace(/^0:/,'')+' s quicker than':(l.best-pb).toFixed(2)+' s off')+' your previous best there)':'')+'.')});
  if(inj)shows.push('Injury: '+injLabel(inj).toLowerCase()+', stage '+(inj.stage||1)+' ('+injStageName(inj)+').');

  // problems, worst first
  if(ci<4){probs.push([9,'Only '+ci+' morning check-in'+(ci===1?'':'s')+' this week. Without them the app can\'t adjust your training to how recovered you are.']);next.push('Do the morning check-in every day: it takes 30 seconds.')}
  if(pl&&dn/pl<0.7){probs.push([8,'You missed '+(pl-dn)+' of '+pl+' sessions'+(missed.length?', including '+missed.slice(0,3).join(', '):'')+'. Fitness is built on the weeks you complete, not the sessions you plan.']);next.push(missed.length?'Protect the key sessions first: if a day goes wrong, move the key session, don\'t drop it.':'Plan the week around work now: put every session in your calendar.')}
  else if(keyPl&&keyDn<keyPl){probs.push([6,'Missed hard sessions: '+missed.slice(0,3).join(', ')+'.']);next.push('Hit every hard and key session next week, even if the easy ones get cut short.')}
  if(reds>=2){probs.push([7,reds+' red recovery days. Your body is not absorbing the training.']);next.push('Bed 30–45 minutes earlier and keep easy days truly easy until recovery is back above 50%.')}
  if(hrv.length>=3&&phrv.length>=3&&avg(hrv)<avg(phrv)*0.9){probs.push([6,'HRV is down '+Math.round((1-avg(hrv)/avg(phrv))*100)+'% on last week. That usually means fatigue, stress, poor sleep or illness building.']);next.push('Take the amber call seriously next week: cut sets by a third on low-recovery days.')}
  if(rhr.length>=3&&prhr.length>=3&&avg(rhr)>avg(prhr)+3){probs.push([5,'Resting HR is up '+Math.round(avg(rhr)-avg(prhr))+' bpm on last week. Watch for illness or overreaching.']);}
  if(sl.length&&avg(sl)<7.5){probs.push([7,'Average sleep '+fmtH(avg(sl))+'. Below 8 hours you recover slower and make worse decisions on the bike.']);next.push('Set a fixed lights-out time that gets you 8 hours before your alarm.')}
  if(wCh!=null&&cutting&&wCh<-0.5){probs.push([7,'Weight is dropping too fast ('+r1(wCh)+' kg in a week). Losing more than 0.5 kg a week costs muscle and strength.']);next.push('Add 200 kcal a day: an extra bagel or a bigger evening meal.')}
  if(wCh!=null&&cutting&&wCh>0.2){probs.push([5,'Weight went up '+r1(wCh)+' kg while you\'re meant to be getting leaner.']);next.push('Tick off every meal so you can see where the extra is coming from, and skip anything not on the plan.')}
  if(wCh!=null&&goal==='build'&&wCh<0){probs.push([5,'Weight went down while you\'re trying to build muscle.']);next.push('Eat every meal on the plan, including the extras: you\'re not eating enough.')}
  if(mPl&&mDn/mPl<0.6){probs.push([6,'Only '+Math.round(mDn/mPl*100)+'% of meals ticked off. If it\'s not logged, the plan can\'t tell whether the food is the problem.']);next.push('Tick off meals as you eat them, not at the end of the day.')}
  if(!probs.length){probs.push([1,'Nothing major. Sessions, recovery and food all look on track.']);next.push('Keep doing exactly this. Push the key sessions a little harder if recovery stays green.')}
  probs.sort((a,b)=>b[0]-a[0]);
  const title='Week review · '+nice(from)+' to '+nice(end);
  const text='WHAT THE DATA SHOWS\n'+(shows.length?shows.map(x=>'• '+x).join('\n'):'• Not enough logged this week to say much.')
    +'\n\nBIGGEST PROBLEMS\n'+probs.slice(0,3).map((x,i)=>(i+1)+'. '+x[1]).join('\n')
    +'\n\nNEXT WEEK\n'+[...new Set(next)].slice(0,3).map(x=>'• '+x).join('\n');
  return {title,text,date:todayS(),by:'app',from,end}}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#revGo');if(!t)return;
  const r=weekReview(),id='w-'+r.end;S.reviews[id]=r;save('reviews/'+id,true);S.revMsg='Done. Your review is at the top.';render();window.scrollTo(0,0)});
