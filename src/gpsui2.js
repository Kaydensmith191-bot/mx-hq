/* ---------- Timing screen v2: satellite map, playback, compare ---------- */
const K_M=6371008.8*Math.PI/180;
const projN=(la0,lo0)=>{const cx=Math.cos(la0*Math.PI/180);return {la0,lo0,f:(la,lo)=>[(lo-lo0)*K_M*cx,(la-la0)*K_M],inv:(x,y)=>[la0+y/K_M,lo0+x/(K_M*cx)]}};
const tsp=s=>{if(s==null||!isFinite(s))return '—';s=+s;const m=Math.floor(s/60),r=s-m*60,w=Math.floor(r),c=Math.round((r-w)*100);const cc=c===100?0:c,ww=c===100?w+1:w;return '<span class="tb">'+(m?m+':'+String(ww).padStart(2,'0'):ww)+'</span><small>.'+String(cc).padStart(2,'0')+'</small>'};
const clock=t=>{try{return new Date(t*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})}catch(e){return ''}};
function parseGeo(v){v=String(v||'');let m=/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(v)||/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(v)||/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(v)||/^\s*(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/.exec(v);
  if(!m)return null;const lat=+m[1],lon=+m[2];return Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat:+lat.toFixed(6),lon:+lon.toFixed(6)}:null}
const satLink=g=>'https://www.google.com/maps/@'+g.lat+','+g.lon+',17z/data=!3m1!1e3';
const satSrc=sat=>sat.src||('/_blob/'+sat.id);
function trackGeo(tid){const t=S.tracks[tid];if(t&&t.geo)return t.geo;const s=gsess(tid)[0];if(s&&s.ll&&s.ll.length){let a=0,b=0;s.ll.forEach(p=>{a+=p[0];b+=p[1]});return {lat:+(a/s.ll.length).toFixed(6),lon:+(b/s.ll.length).toFixed(6)}}return null}

/* geometry: reference line + each lap's real line, in north-up metres */
function refGeo(d,P){const r=d.ll.map(p=>P.f(p[0],p[1])),n=r.map((p,i)=>{const a=r[Math.max(0,i-1)],b=r[Math.min(r.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;return [-ty/l,tx/l]});return {r,n}}
const lapXY=(G0,L)=>G0.r.map((p,i)=>{const o=L.o5?L.o5[i]||0:0;return [p[0]+G0.n[i][0]*o,p[1]+G0.n[i][1]*o]});
function lapX(d){const V=d.laps.filter(l=>l.sec&&l.t5);if(!d.aSec||!d.secS||!V.length)return null;const g5=d.g5,n=V[0].t5.length,b=[0,...d.secS.map(s=>Math.round(s/g5)),n-1];
  const who=[0,1,2,3].map(k=>V.reduce((a,l)=>l.sec[k]<a.sec[k]?l:a));const t5=[],v5=[],o5=[];let T=0;
  for(let k=0;k<4;k++){const L=who[k],i0=b[k],i1=b[k+1];for(let i=i0;i<(k===3?i1+1:i1);i++){t5.push(+(T+L.t5[i]-L.t5[i0]).toFixed(2));v5.push(L.v5[i]);o5.push(L.o5?L.o5[i]:0)}T+=L.t5[i1]-L.t5[i0]}
  return {n:'X',x:true,time:d.aLap,t5,v5,o5,who:who.map(l=>l.n)}}
function lapAt(L,xy,t){const T=L.t5,n=T.length;if(t<=0)return {x:xy[0][0],y:xy[0][1],v:L.v5[0],s:0};if(t>=T[n-1])return {x:xy[n-1][0],y:xy[n-1][1],v:L.v5[n-1],s:(n-1),end:true};
  let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T[m]<=t)lo=m;else hi=m}const f=T[hi]>T[lo]?(t-T[lo])/(T[hi]-T[lo]):0;
  return {x:xy[lo][0]+(xy[hi][0]-xy[lo][0])*f,y:xy[lo][1]+(xy[hi][1]-xy[lo][1])*f,v:L.v5[lo]+(L.v5[hi]-L.v5[lo])*f,s:lo+f}}
const tAt=(L,i)=>{const T=L.t5,k=Math.floor(i);if(k>=T.length-1)return T[T.length-1];return T[k]+(T[k+1]-T[k])*(i-k)};

/* ---------- session view ---------- */
function gLapSel(d){const V=d.laps.filter(l=>l.valid&&l.t5);let A=S.glap!=null&&d.laps[S.glap]&&d.laps[S.glap].t5?d.laps[S.glap]:d.laps[d.best];if(!A||!A.t5)A=V[0];
  const X=lapX(d);let B=null;if(S.gb==null)B=X&&A!==d.laps[d.best]?d.laps[d.best]:X;else if(S.gb==='x')B=X;else if(S.gb!==''&&d.laps[+S.gb]&&d.laps[+S.gb].t5)B=d.laps[+S.gb];if(B===A)B=null;return {A,B,X}}
function tmMap(id,d,A,B){const tr=S.tracks[d.trackId]||{},sat=tr.sat,P=sat?projN(sat.lat0,sat.lon0):projN(d.ll[0][0],d.ll[0][1]);S.gproj=P;
  const G0=refGeo(d,P),xyA=lapXY(G0,A),xyB=B?lapXY(G0,B):null,sv=a=>a.map(p=>[p[0],-p[1]]);
  const xs=G0.r.map(p=>p[0]),ys=G0.r.map(p=>-p[1]),pad=28;let x0=Math.min(...xs)-pad,y0=Math.min(...ys)-pad,w=Math.max(...xs)-x0+pad,h=Math.max(...ys)-y0+pad;
  const ar=Math.min(1.7,Math.max(0.8,w/h));if(w/h<ar){const nw=h*ar;x0-=(nw-w)/2;w=nw}else{const nh=w/ar;y0-=(nh-h)/2;h=nh}
  const fs=Math.max(w,h)/30,mode=S.gmm||'speed',a=sv(xyA),b=xyB?sv(xyB):null,seg=(p,i,c,wd)=>'<line x1="'+p[i-1][0].toFixed(1)+'" y1="'+p[i-1][1].toFixed(1)+'" x2="'+p[i][0].toFixed(1)+'" y2="'+p[i][1].toFixed(1)+'" stroke="'+c+'" stroke-width="'+wd+'"/>';
  const poly=(p,c,wd,op)=>'<polyline points="'+p.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="'+wd+'"'+(op?' opacity="'+op+'"':'')+' stroke-linejoin="round" stroke-linecap="round"/>';
  let lines=poly(a,'#000',9,.45);
  if(mode==='line'){if(b)lines+=poly(b,'#000',9,.45)+poly(b,'var(--tmB)',4);lines+=poly(a,'var(--tmA)',4)}
  else if(mode==='brake'){const v=A.v5;for(let i=1;i<a.length;i++){const vm=(v[i]+v[i-1])/7.2,ac=vm*((v[i]-v[i-1])/3.6)/d.g5;lines+=seg(a,i,ac>0.35?'#2fe37a':ac<-0.6?'#ff3b4a':'rgba(255,255,255,.75)',5)}}
  else{const v=A.v5,lo=Math.min(...v),hi=Math.max(...v);for(let i=1;i<a.length;i++)lines+=seg(a,i,spdCol(((v[i]+v[i-1])/2-lo)/Math.max(1,hi-lo)),5)}
  const gate=(g,lab,col)=>{if(!g)return '';const [x,yn]=P.f(g.lat,g.lon),y=-yn,dx=Math.cos(g.hd),dy=-Math.sin(g.hd),nx=-dy,ny=dx,L=14;return '<line x1="'+(x+nx*L).toFixed(1)+'" y1="'+(y+ny*L).toFixed(1)+'" x2="'+(x-nx*L).toFixed(1)+'" y2="'+(y-ny*L).toFixed(1)+'" stroke="'+col+'" stroke-width="4"/><text x="'+(x+nx*(L+fs*.8)).toFixed(1)+'" y="'+(y+ny*(L+fs*.8)+fs*.33).toFixed(1)+'" font-size="'+(fs*.9).toFixed(1)+'" font-weight="800" fill="'+col+'" stroke="#000" stroke-width="'+(fs*.12).toFixed(2)+'" paint-order="stroke" text-anchor="middle">'+lab+'</text>'};
  const gs=d.gates||{};let c='';if(false)(d.corners||[]).forEach((s,j)=>{const k=Math.min(G0.r.length-1,Math.round(s/d.g5)),x=G0.r[k][0],y=-G0.r[k][1];c+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(fs*.55).toFixed(1)+'" fill="rgba(10,12,18,.8)" stroke="#fff" stroke-width="1.2"/><text x="'+x.toFixed(1)+'" y="'+(y+fs*.27).toFixed(1)+'" font-size="'+(fs*.66).toFixed(1)+'" font-weight="700" fill="#fff" text-anchor="middle">'+(j+1)+'</text>'});
  const img=!sat?tilesSVG(P,x0,y0,w,h,1):'<image href="'+esc(satSrc(sat))+'" x="'+(sat.cx-sat.w/2).toFixed(1)+'" y="'+(-sat.cy-sat.h/2).toFixed(1)+'" width="'+sat.w.toFixed(1)+'" height="'+sat.h.toFixed(1)+'" preserveAspectRatio="none" transform="rotate('+(sat.rot||0)+' '+sat.cx.toFixed(1)+' '+(-sat.cy).toFixed(1)+')"/>';
  const dot=(idd,col,lab,up)=>'<g id="'+idd+'"><circle r="'+(fs*.5).toFixed(1)+'" fill="'+col+'" stroke="#fff" stroke-width="2.5"/><g transform="translate('+(fs*.7).toFixed(1)+','+(up?-fs*2.3:fs*.6).toFixed(1)+')"><rect width="'+(fs*5.2).toFixed(1)+'" height="'+(fs*1.6).toFixed(1)+'" rx="'+(fs*.4).toFixed(1)+'" fill="'+col+'" stroke="rgba(0,0,0,.35)" stroke-width="1"/><text x="'+(fs*.4).toFixed(1)+'" y="'+(fs*1.15).toFixed(1)+'" font-size="'+(fs*1.0).toFixed(1)+'" font-weight="800" fill="#fff">'+lab+'</text></g></g>';
  S.pbx={id,A,B,xyA:sv(xyA),xyB:xyB?sv(xyB):null,vb:[x0,y0,w,h],dur:Math.max(A.time,B?B.time:0)};
  return '<svg id="tmMap" class="tmmap'+(S.gmode?' pick':'')+'" viewBox="'+[x0,y0,w,h].map(n=>n.toFixed(1)).join(' ')+'" style="aspect-ratio:'+(w/h).toFixed(3)+'" preserveAspectRatio="xMidYMid meet">'+img+'<g>'+lines+'</g>'+gate(gs.sf,'F','#fff')+(gs.sp||[]).map((g,i)=>gate(g,String(i+1),'#c7b8ff')).join('')+c+(B?dot('dgB','var(--tmB)','—',false):'')+dot('dgA','var(--tmA)','—',true)+'</svg>';
}
function pbDraw(){const c=S.pbx,svg=document.getElementById('tmMap');if(!c||!svg)return;const t=Math.min(S.pb.t,c.dur),pa=lapAt(c.A,c.xyA,t),z=S.gz||1,vb=c.vb,vw=vb[2]/z,vh=vb[3]/z;
  let vx=vb[0],vy=vb[1];if(z>1){vx=Math.min(Math.max(pa.x-vw/2,vb[0]),vb[0]+vb[2]-vw);vy=Math.min(Math.max(pa.y-vh/2,vb[1]),vb[1]+vb[3]-vh)}svg.setAttribute('viewBox',vx.toFixed(1)+' '+vy.toFixed(1)+' '+vw.toFixed(1)+' '+vh.toFixed(1));
  const put=(idd,p)=>{const g=document.getElementById(idd);if(!g)return;g.setAttribute('transform','translate('+p.x.toFixed(1)+','+p.y.toFixed(1)+') scale('+(1/z).toFixed(3)+')');const tx=g.querySelector('text');if(tx)tx.textContent=Math.round(p.v)+' km/h'};
  put('dgA',pa);const set=(i,v)=>{const e=document.getElementById(i);if(e)e.innerHTML=v};set('ovTA',tsp(Math.min(t,c.A.time)));
  if(c.B){const pb=lapAt(c.B,c.xyB,t);put('dgB',pb);set('ovTB',tsp(Math.min(t,c.B.time)));const dm=(pa.s-pb.s)*5;let dt;if(pa.s>=pb.s)dt=tAt(c.B,pa.s)-t;else dt=-(tAt(c.A,pb.s)-t);
    if(pa.end&&pb.end)dt=c.B.time-c.A.time;set('ovGap','<b class="'+(dt>=0?'up':'dn')+'">'+(dt>=0?'+':'−')+Math.abs(dt).toFixed(1)+'<small> s</small></b><b class="'+(dm>=0?'up':'dn')+'">'+(dm>=0?'+':'−')+Math.abs(dm).toFixed(1)+'<small> m</small></b>')}
  const r=document.getElementById('pbr');if(r&&document.activeElement!==r)r.value=String(Math.round(t/c.dur*1000));const b=document.getElementById('pbBtn');if(b)b.innerHTML=S.pb.on?'<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>':'<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'}
function pbLoop(ts){if(!S.pb.on)return;const dt=S.pb.last?Math.min(0.1,(ts-S.pb.last)/1000):0;S.pb.last=ts;S.pb.t+=dt*S.pb.spd;const D=S.pbx?S.pbx.dur:0;if(!document.getElementById('tmMap')){S.pb.on=false;return}
  if(S.pb.t>=D){S.pb.t=D;S.pb.on=false}pbDraw();if(S.pb.on)requestAnimationFrame(pbLoop)}
S.pb={t:0,on:false,spd:1,last:0};S.gz=1;

function gHR(d){if(!d.hrs||!d.hr5)return '<div class="tmc"><h3>Heart rate</h3><p class="mut">No heart rate in this file. Record the session on your Polar with heart rate on and export it as TCX, GPX or FIT. On the bike, wrist readings drop out from vibration and grip; a Polar chest strap (H10) or arm band (Verity Sense) paired to the watch is far more reliable.</p></div>';
  const h=d.hr5,n=h.length,W=640,H=200,pl=38,pb=26,lo=Math.floor((d.hrs.min-8)/10)*10,hi=Math.ceil((d.hrs.max+5)/10)*10,X=i=>pl+(W-pl-8)*i/Math.max(1,n-1),Y=v=>(H-pb)-(H-pb-8)*(v-lo)/Math.max(1,hi-lo);
  let g='';for(let v=lo;v<=hi;v+=20)g+='<line x1="'+pl+'" x2="'+W+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+5).toFixed(1)+'" font-size="13" fill="var(--mut)" text-anchor="end">'+v+'</text>';
  const step=n*5>1200?240:120;for(let s=0;s<=n*5;s+=step)g+='<text x="'+X(s/5).toFixed(1)+'" y="'+(H-6)+'" font-size="12" fill="var(--mut)" text-anchor="middle">'+String(Math.floor(s/60)).padStart(2,'0')+':00</text>';
  d.laps.filter(l=>l.valid).forEach(l=>{const x=X(l.start/5);g+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="8" y2="'+(H-pb)+'" stroke="var(--line)" stroke-dasharray="2 4"/>'});
  let p='',on=false;h.forEach((v,i)=>{if(v==null){on=false;return}p+=(on?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1);on=true});
  const Z=[[170,999,'#ff3b4a'],[150,169,'#ff8a1e'],[130,149,'#2fd17a'],[110,129,'#33c6e6'],[0,109,'#8a8d95']],cnt=Z.map(z=>h.filter(v=>v!=null&&v>=z[0]&&v<=z[1]).length*5/60),mx=Math.max(...cnt,0.1);
  const md=(a=>a[a.length>>1]||0)(d.laps.filter(l=>l.valid).map(l=>l.time).sort((a,b)=>a-b)),L=d.laps.filter(l=>l.valid&&l.hrAvg),LP=L.filter(l=>l.time<=md*1.05),hmx=Math.max(...L.map(l=>l.hrMax||l.hrAvg),1),hmn=Math.min(...L.map(l=>l.hrAvg),hmx)-10;
  let ins='';if(LP.length>=4){const h2=Math.floor(LP.length/2),a=LP.slice(0,h2),b=LP.slice(-h2),av=(x,k)=>x.reduce((s,l)=>s+l[k],0)/x.length,dh=av(b,'hrAvg')-av(a,'hrAvg'),dt=av(b,'time')-av(a,'time');
    ins='<div class="hrx">'+(dt>0.25?'<b>Your pace drops as your heart rate climbs.</b> Second half of the session: '+(dh>=0?'+':'')+dh.toFixed(0)+' bpm and '+dt.toFixed(2)+' s a lap slower than the first half. That fade is what the long Zone 2 rides and threshold intervals are there to fix.':dt<-0.25?'<b>You got faster as the session went on</b> ('+Math.abs(dt).toFixed(2)+' s a lap quicker in the second half, '+(dh>=0?'+':'')+dh.toFixed(0)+' bpm). Good. If the first laps are always slow, your warm-up before the session isn\'t doing its job.':'<b>Pace held steady</b> through the session ('+(dt>=0?'+':'')+dt.toFixed(2)+' s a lap, '+(dh>=0?'+':'')+dh.toFixed(0)+' bpm from first half to second). That\'s the fitness doing its job.')+'</div>'}
  return '<div class="tmc"><h3>Heart rate</h3><div class="hrt"><div><span>Peak</span><b>'+d.hrs.max+'<small> bpm</small></b></div><div><span>Average</span><b>'+d.hrs.avg+'<small> bpm</small></b></div><div><span>Lowest</span><b>'+d.hrs.min+'<small> bpm</small></b></div></div>'
    +'<svg class="gch" viewBox="0 0 '+W+' '+H+'">'+g+'<path d="'+p+'" fill="none" stroke="#ff5a4f" stroke-width="2.2"/></svg><p class="mut" style="font-size:12px;margin:2px 0 8px">From your Polar. Dotted lines = start of each lap.</p>'+ins
    +(L.length?'<span class="lab" style="display:block;margin-top:12px">HEART RATE EACH LAP</span>'+L.map(l=>'<div class="hrl"><span>Lap '+l.n+'</span><i><b style="width:'+Math.max(4,(l.hrAvg-hmn)/(hmx-hmn)*100).toFixed(1)+'%"></b></i><em>'+l.hrAvg+'<small> avg</small></em><span class="lt">'+tsp(l.time)+'</span></div>').join(''):'')
    +'<span class="lab" style="display:block;margin-top:14px">TIME IN EACH RANGE</span>'
    +Z.map((z,i)=>'<div class="hrz"><span>'+(z[1]>300?z[0]+'+':z[0]?z[0]+'–'+z[1]:'under 110')+' bpm</span><i><b style="width:'+(cnt[i]/mx*100).toFixed(1)+'%;background:'+z[2]+'"></b></i><em>'+(cnt[i]<10?cnt[i].toFixed(1):Math.round(cnt[i]))+' min</em></div>').join('')+'</div>'}

function gView(id,d){
  if(d.polarId&&(d.v||1)<2&&typeof gRetime==='function')gRetime(id,d);
  if(!d.laps.some(l=>l.t5))return '<p class="empty">This session has no lap data.</p>';
  const {A,B,X}=gLapSel(d),best=d.laps[d.best],V=d.laps.filter(l=>l.valid),q=gq(d.hz),raw=S.graw&&S.graw.id===id,tr=S.tracks[d.trackId]||{};
  if(S.pbx&&S.pbx.id!==id){S.pb.t=0;S.pb.on=false}
  const avgLap=V.reduce((a,l)=>a+l.time,0)/V.length,secWho=d.aSec?[0,1,2,3].map(k=>{const l=d.laps.find(l=>l.sec&&Math.abs(l.sec[k]-d.aSec[k])<0.005);return l?l.n:'—'}):null;
  const hd='<div class="tmhd"><a href="#track" data-gs="" aria-label="All sessions">‹</a><div><b>'+esc(nice(d.date))+(d.t0?' · '+clock(d.t0):'')+'</b><span>'+esc((d.track||'').toUpperCase())+(d.ses?' · SESSION '+esc(d.ses):'')+'</span></div><button class="tmgear" data-gset="1" aria-label="Settings">⚙</button></div>';
  const map='<div class="tmmapw">'+tmMap(id,d,A,B)
    +'<div class="tmov"><div><i style="background:var(--tmA)"></i><span>Lap '+A.n+'</span><b id="ovTA">'+tsp(0)+'</b></div>'+(B?'<div id="ovGap" class="gap"></div><div><i style="background:var(--tmB)"></i><span>'+(B.x?'Lap X':'Lap '+B.n)+'</span><b id="ovTB">'+tsp(0)+'</b></div>':'')+'</div>'
    +'<div class="tmzoom"><button data-gz="1" aria-label="Zoom in">+</button><button data-gz="-1" aria-label="Zoom out">−</button></div>'
    +(!tr.sat?ATTR:'')+'</div>'
    +'<div class="tmbar"><button id="pbBtn" class="pbb" aria-label="Play"></button><input id="pbr" type="range" min="0" max="1000" value="0" aria-label="Lap position"><button class="spd" data-gspd="1">'+S.pb.spd+'×</button></div>'
    +'<div class="tmctl"><div class="tseg">'+[['speed','Speed'],['brake','Brake / gas'],['line','Lines']].map(([k,v])=>'<button data-gmm="'+k+'" class="'+((S.gmm||'speed')===k?'on':'')+'">'+v+'</button>').join('')+'</div>'
    +'<label class="vs">vs <select id="gvs"><option value="">nothing</option>'+(X?'<option value="x"'+(B&&B.x?' selected':'')+'>Lap X '+f2(d.aLap)+'</option>':'')+d.laps.map((l,i)=>l.t5&&l!==A?'<option value="'+i+'"'+(B===l?' selected':'')+'>Lap '+l.n+' '+f2(l.time)+'</option>':'').join('')+'</select></label></div>'
    +((S.gmm||'speed')==='brake'?'<p class="tmkey"><i style="background:#2fe37a"></i>on the gas <i style="background:#ff3b4a"></i>braking <i style="background:#ddd"></i>rolling'+(d.hz<4?' · watch GPS: rough':'')+'</p>':(S.gmm||'speed')==='line'?'<p class="tmkey"><i style="background:var(--tmA)"></i>Lap '+A.n+(B?' <i style="background:var(--tmB)"></i>'+(B.x?'Lap X (best sectors)':'Lap '+B.n):'')+(d.hz<4?' · watch GPS: lines ±3 m':'')+'</p>':'<p class="tmkey">Lap '+A.n+' coloured by speed: blue slow → red fast</p>')
    +(S.gmode?'<p class="tmpick">Tap the map where '+(S.gmode==='sf'?'the finish line':'split '+S.gmode[1])+' should go.</p>':'');
  const sum='<div class="tmsum"><div><b>'+tsp(avgLap)+'</b><span>Average laptime</span></div><div><b><span class="tb">'+(d.dist/1000).toFixed(2)+'</span><small> km</small></b><span>Total distance</span></div><div><b>'+tsp(best.time)+'</b><span>Best lap</span></div><div><b><span class="tb">'+V.length+'</span></b><span>Laps</span></div></div>';
  const bs=d.aSec?'<h3>Best sectors</h3><div class="tmbs">'+d.aSec.map((s,k)=>'<div><span>SECTOR '+(k+1)+'</span><b>'+tsp(s)+'</b><em>Lap '+secWho[k]+'</em></div>').join('')+'</div>':'';
  const dots=l=>'<span class="dots">'+[0,1,2,3].map(k=>'<i class="'+(l.sec&&d.aSec&&Math.abs(l.sec[k]-d.aSec[k])<0.005?'on':'')+'"></i>').join('')+'</span>';
  const rows=d.laps.map((l,i)=>l.valid?'<div class="tmrow'+(l===A?' a':'')+(l===B?' b':'')+(i===d.best?' best':'')+'" data-gl="'+i+'" role="button" tabindex="0"><span class="n">'+l.n+'</span><span class="sp">'+(l.avg||'')+'<small> km/h</small></span>'+dots(l)+'<span class="lt">'+tsp(l.time)+'</span><span class="cv">›</span></div>':'<div class="tmrow out"><span class="n">'+l.n+'</span><span class="sp">out lap</span><span class="dots"></span><span class="lt">'+tsp(l.time)+'</span><span class="cv"></span></div>').join('')
    +(d.aLap?'<div class="tmrow x'+(B&&B.x?' b':'')+'" data-gx="1" role="button" tabindex="0"><span class="n">X</span><span class="sp">'+(Math.round(d.len/d.aLap*36)/10)+'<small> km/h</small><em>Best lap in theory</em></span><span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span><span class="lt">'+tsp(d.aLap)+'</span><span class="cv">›</span></div>':'');
  const laps='<h3>Laps</h3><div class="tmhead"><span>Lap</span><span>Avg speed</span><span>Best sectors</span><span>Lap time</span></div><div class="tml">'+rows+'</div><p class="tmhint">Tap a lap to play it. '+(d.aLap?'Lap X is your 4 best sectors joined up, '+(best.time-d.aLap).toFixed(2)+' s quicker than your best lap.':'')+'</p>';
  const notes=gNotes(d,A),coach=notes?'<div class="tmc" style="margin-bottom:16px"><h3>Where the time is · Lap '+A.n+'</h3>'+notes+'</div>':'';
  const trace='<div class="tmc"><h3>Speed trace</h3>'+gChart(d,A,B&&B.v5?B:null)+gDelta(d,A,B&&B.t5?B:null)+'</div>';
  const set=S.gset?'<div class="tmc"><h3>Settings</h3><span class="pill" style="background:'+q.c+';color:#fff">'+esc(q.t)+'</span><p class="mut">File: '+esc(d.file||'')+'</p>'
    +(raw?'<div class="row2" style="flex-wrap:wrap">'+['sf','s1','s2','s3'].map(m=>'<button class="'+(S.gmode===m?'':'ghost')+'" data-gm="'+m+'">'+(m==='sf'?'Move finish line':'Move split '+m[1])+'</button>').join('')+'</div>':'<p class="mut">To move the finish line or splits, import this file again.</p>')
    +'<div class="row2" style="flex-wrap:wrap"><button class="'+(S.gdel===id?'warn':'ghost')+'" id="gdel">'+(S.gdel===id?'Tap again to delete':'Delete session')+'</button></div>'+(S.gnote?'<p style="color:var(--amb);font-weight:600">'+esc(S.gnote)+'</p>':'')+'</div>':'';
  setTimeout(pbDraw,0);
  return '<div class="tm">'+hd+'<div class="tmg"><div class="tmL">'+map+'</div><div class="tmR">'+set+sum+bs+laps+'</div></div>'+'<div class="tmg2">'+gHR(d)+'<div>'+coach+trace+'</div></div></div>';
}

/* ---------- satellite alignment ---------- */
function alignSrc(tid){const s=gsess(tid).find(x=>x.ll&&x.ll.length);return s||null}
function renderAlign(){const tid=S.galign,t=S.tracks[tid],a=S.gal;if(!t||!a)return '<p class="empty">Nothing to align.</p>';const s=alignSrc(tid);
  const P=projN(a.lat0,a.lon0),ref=s?s.ll.map(p=>P.f(p[0],p[1])):[];const xs=ref.map(p=>p[0]),ys=ref.map(p=>-p[1]);
  let x0,y0,w,h;if(ref.length){const pw=(Math.max(...xs)-Math.min(...xs)),ph=(Math.max(...ys)-Math.min(...ys)),m=Math.max(pw,ph)*0.35+30;x0=Math.min(...xs)-m;y0=Math.min(...ys)-m;w=pw+2*m;h=ph+2*m}else{x0=a.cx-a.w/2;y0=-a.cy-a.h/2;w=a.w;h=a.h}
  S.galv={x0,y0,w,h};const sl=Math.round(Math.log(a.w/a.w0)/Math.log(3)*50+50);
  return '<div class="tm"><div class="tmhd"><a href="#track" data-galx="1" aria-label="Cancel">‹</a><div><b>Line up the satellite photo</b><span>'+esc((t.name||'').toUpperCase())+'</span></div><span></span></div>'
    +'<div class="tmg"><div class="tmL"><div class="tmmapw"><svg id="alMap" class="tmmap" viewBox="'+[x0,y0,w,h].map(n=>n.toFixed(1)).join(' ')+'" style="aspect-ratio:'+(w/h).toFixed(3)+';touch-action:none;cursor:grab">'
    +'<image id="alImg" href="'+esc(a.src||('/_blob/'+a.id))+'" preserveAspectRatio="none"/>'+(ref.length?'<polyline points="'+ref.map(p=>p[0].toFixed(1)+','+(-p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="#000" stroke-width="7" opacity=".5" stroke-linejoin="round"/><polyline points="'+ref.map(p=>p[0].toFixed(1)+','+(-p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linejoin="round"/>':'')+'</svg></div></div>'
    +'<div class="tmR"><div class="tmc"><h3>How to line it up</h3><ol class="steps"><li>Drag the photo until the yellow line sits on the dirt.</li><li>Use <b>Size</b> until the corners match, then drag again.</li><li>Only use <b>Rotate</b> if your screenshot wasn\'t north-up.</li><li>Get the start straight and the far end spot on. The middle follows.</li></ol>'
    +(ref.length?'':'<p style="color:var(--amb);font-weight:600">Import one GPS session at this track first so there is a line to match.</p>')
    +'<label class="al" for="alSize">Size</label><input id="alSize" type="range" min="0" max="100" step="0.1" value="'+sl+'"><label class="al" for="alRot">Rotate <span id="alRv">'+(a.rot||0)+'°</span></label><input id="alRot" type="range" min="-45" max="45" step="0.5" value="'+(a.rot||0)+'">'
    +'<div class="nudge"><button data-nud="0,1">↑</button><button data-nud="-1,0">←</button><button data-nud="1,0">→</button><button data-nud="0,-1">↓</button></div>'
    +'<div class="row2" style="flex-wrap:wrap"><button id="alSave">Save</button><label class="filebtn ghostf" for="gsatf">Use a different photo</label><button class="ghost" data-galx="1">Cancel</button></div>'+(S.gerr2?'<p style="color:var(--red);font-weight:600">'+esc(S.gerr2)+'</p>':'')+'</div></div></div><input id="gsatf" class="vh" type="file" accept="image/*"></div>'}
function alDraw(){const a=S.gal,im=document.getElementById('alImg');if(!a||!im)return;im.setAttribute('x',(a.cx-a.w/2).toFixed(1));im.setAttribute('y',(-a.cy-a.h/2).toFixed(1));im.setAttribute('width',a.w.toFixed(1));im.setAttribute('height',a.h.toFixed(1));im.setAttribute('transform','rotate('+(a.rot||0)+' '+a.cx.toFixed(1)+' '+(-a.cy).toFixed(1)+')');const rv=document.getElementById('alRv');if(rv)rv.textContent=(a.rot||0)+'°'}
function alStart(tid,id,natW,natH,src){const t=S.tracks[tid],old=t&&t.sat,s=alignSrc(tid);let lat0,lon0;
  if(old){lat0=old.lat0;lon0=old.lon0}else if(s){lat0=s.ll[0][0];lon0=s.ll[0][1]}else{const g=trackGeo(tid)||{lat:52.2,lon:0.9};lat0=g.lat;lon0=g.lon}
  const P=projN(lat0,lon0);let cx=0,cy=0,span=600;if(s){const r=s.ll.map(p=>P.f(p[0],p[1])),xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);cx=(Math.min(...xs)+Math.max(...xs))/2;cy=(Math.min(...ys)+Math.max(...ys))/2;span=Math.max((Math.max(...xs)-Math.min(...xs))*1.5,(Math.max(...ys)-Math.min(...ys))*1.5*natW/natH,150)}
  const w=old&&old.id===id?old.w:span;S.gal={tid,id,src,natW,natH,lat0,lon0,cx:old&&old.id===id?old.cx:cx,cy:old&&old.id===id?old.cy:cy,w,w0:w,h:w*natH/natW,rot:old&&old.id===id?old.rot||0:0};S.galign=tid;S.gerr2=''}
async function satUpload(file){S.gerr2='';try{if(!S.assets){S.assets=window.claude&&window.claude.use?await window.claude.use('assets'):null}if(!S.assets)throw {message:'Uploading photos only works when the app is open on claude.ai or in the Claude app.'};
  const bmp=await createImageBitmap(file),sc=Math.min(1,2400/Math.max(bmp.width,bmp.height)),cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.86));const up=await S.assets.upload(blob,{type:'image/jpeg'});return {id:up.id,w:cv.width,h:cv.height,url:up.url}}
  catch(e){S.gerr2=e&&e.code==='too_large'?'That image is too big.':e&&e.code==='quota_or_state'?'Photo storage is full.':(e&&e.message)||'Could not upload that photo.';return null}}

/* ---------- track page: satellite card ---------- */
function satCardOld(tk){const t=S.tracks[tk]||{},g=trackGeo(tk),sat=t.sat;
  return '<div class="card"><span class="lab">SATELLITE VIEW</span><p class="mut" style="margin-top:0">Your laps play back on top of a satellite photo of this track.</p><div class="fields"><div style="grid-column:1/-1"><label for="tgeo">Track location</label><input id="tgeo" data-tk="'+esc(tk)+'" placeholder="Paste a Google Maps link or 52.25, 0.90" value="'+esc(t.geo?t.geo.lat+', '+t.geo.lon:'')+'"></div></div>'
    +(g?'<ol class="steps"><li><a href="'+esc(satLink(g))+'" target="_blank" rel="noopener">Open this track in Google Maps (satellite)</a>.</li><li>Zoom so the whole track fills the screen, north at the top.</li><li>Screenshot it (Mac: ⌘ Shift 4 and drag over the map. iPhone: side + volume up, then crop).</li><li>Upload it below and line it up.</li></ol>':'<p class="mut">Add the location, or import one GPS session here, and the satellite link appears.</p>')
    +(sat?'<img src="'+esc(satSrc(sat))+'" alt="Satellite view of '+esc(t.name||'track')+'" style="width:100%;border-radius:12px;display:block;margin:8px 0">':'')
    +'<div class="row2" style="flex-wrap:wrap"><label class="filebtn" for="gsatf" data-tk="'+esc(tk)+'">'+(sat?'Replace photo':'Upload satellite screenshot')+'</label>'+(sat?'<button class="ghost" data-gsat="'+esc(tk)+'">Re-align</button>':'')+'</div><input id="gsatf" class="vh" type="file" accept="image/*" data-tk="'+esc(tk)+'">'+(S.gerr2&&S.gsatTk===tk?'<p style="color:var(--red);font-weight:600">'+esc(S.gerr2)+'</p>':'')+'</div>'}

/* ---------- events ---------- */
function gTap(e,svg){const raw=S.graw,id=S.gsel,d=S.gpsx[id];if(!raw||raw.id!==id||!d||!S.gproj)return;const m=svg.getScreenCTM();if(!m)return;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(m.inverse()),[la,lo]=S.gproj.inv(q.x,-q.y);
  try{const r=G.run(raw.P,G.moveGate(raw.P,d.gates,S.gmode,la,lo));Object.assign(d,r);S.gnote=r.auto?'That line didn\'t give clean laps, so it was put back automatically.':'';save('gps/'+id,true);
    if(d.trackId&&S.tracks[d.trackId]){S.tracks[d.trackId].timing=d.gates;save('tracks/'+d.trackId,true)}}catch(err){S.gnote=err&&err.message||'Could not move that line.'}
  S.gmode=null;S.glap=null;render()}
const gOpenAlign=tid=>{const t=S.tracks[tid];if(t&&t.sat){const s=t.sat;S.gal={tid,id:s.id,src:s.src,natW:s.w,natH:s.h,lat0:s.lat0,lon0:s.lon0,cx:s.cx,cy:s.cy,w:s.w,w0:s.w,h:s.h,rot:s.rot||0};S.galign=tid;S.gerr2='';render();window.scrollTo(0,0)}
  else{S.gsatTk=tid;const f=document.getElementById('gsatf')||(()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.id='gsatf';i.className='vh';document.body.appendChild(i);return i})();f.dataset.tk=tid;f.click()}};
document.addEventListener('click',e=>{
  const gm=e.target.closest&&e.target.closest('#tmMap');if(gm&&S.gmode){gTap(e,gm);return}
  const t=e.target.closest&&e.target.closest('[data-gs],[data-gl],[data-gx],[data-gm],[data-gmm],[data-gz],[data-gspd],[data-gset],[data-gsat],[data-galx],[data-gturn],[data-nud],#gdel,#pbBtn,#alSave');if(!t)return;
  if(t.dataset.gs!==undefined){e.preventDefault();S.sub='gps';S.gsel=t.dataset.gs||null;S.glap=null;S.gb=null;S.gmode=null;S.gdel=null;S.gnote='';S.gset=false;S.galign=null;S.pb.on=false;S.pb.t=0;if(location.hash!=='#track')location.hash='track';else render();window.scrollTo(0,0);return}
  if(t.dataset.gl!==undefined){S.glap=+t.dataset.gl;if(S.gb!=null&&S.gb!==''&&+S.gb===S.glap)S.gb=null;S.pb.t=0;S.pb.on=false;S.gnote='';render();return}
  if(t.dataset.gx){S.gb='x';S.pb.t=0;render();return}
  if(t.dataset.gm){S.gmode=S.gmode===t.dataset.gm?null:t.dataset.gm;render();if(S.gmode){const m=document.getElementById('tmMap');if(m)m.scrollIntoView({behavior:'smooth',block:'center'})}return}
  if(t.dataset.gmm){S.gmm=t.dataset.gmm;render();return}
  if(t.dataset.gz){S.gz=Math.max(1,Math.min(4,(S.gz||1)+(+t.dataset.gz)));pbDraw();return}
  if(t.dataset.gspd){S.pb.spd=S.pb.spd>=4?1:S.pb.spd*2;t.textContent=S.pb.spd+'×';return}
  if(t.dataset.gset){S.gset=!S.gset;render();return}
  if(t.dataset.gturn){S.gturns=S.gturns===false;render();return}
  if(t.dataset.gsat){e.preventDefault();gOpenAlign(t.dataset.gsat);return}
  if(t.dataset.galx){e.preventDefault();S.galign=null;S.gal=null;render();return}
  if(t.dataset.nud&&S.gal){const [dx,dy]=t.dataset.nud.split(',').map(Number),st=S.gal.w/120;S.gal.cx+=dx*st;S.gal.cy+=dy*st;alDraw();return}
  if(t.id==='pbBtn'){if(!S.pbx)return;if(S.pb.t>=S.pbx.dur)S.pb.t=0;S.pb.on=!S.pb.on;S.pb.last=0;pbDraw();if(S.pb.on)requestAnimationFrame(pbLoop);return}
  if(t.id==='alSave'&&S.gal){const a=S.gal,tr=S.tracks[a.tid];if(tr){tr.sat={id:a.id,lat0:+a.lat0.toFixed(7),lon0:+a.lon0.toFixed(7),cx:+a.cx.toFixed(2),cy:+a.cy.toFixed(2),w:+a.w.toFixed(2),h:+a.h.toFixed(2),rot:a.rot||0};if(a.src&&a.src.startsWith('data:'))tr.sat.src=a.src;save('tracks/'+a.tid,true)}S.galign=null;S.gal=null;render();return}
  if(t.id==='gdel'){if(S.gdel===S.gsel){remove('gps/'+S.gsel);if(S.graw&&S.graw.id===S.gsel)S.graw=null;S.gsel=null;S.gdel=null}else S.gdel=S.gsel;render();return}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.tmrow[role=button]')){e.preventDefault();e.target.click()}});
document.addEventListener('input',e=>{const t=e.target;
  if(t.id==='pbr'&&S.pbx){S.pb.t=(+t.value)/1000*S.pbx.dur;S.pb.on=false;pbDraw();return}
  if(t.id==='alSize'&&S.gal){const a=S.gal,nw=a.w0*Math.pow(3,(+t.value-50)/50);a.w=nw;a.h=nw*a.natH/a.natW;alDraw();return}
  if(t.id==='alRot'&&S.gal){S.gal.rot=+t.value;alDraw();return}});
document.addEventListener('change',async e=>{const t=e.target;if(!t)return;
  if(t.id==='gvs'){S.gb=t.value;S.pb.t=0;S.pb.on=false;render();return}
  if(t.id==='tgeo'){const tk=t.dataset.tk,g=parseGeo(t.value);if(!S.tracks[tk])return;if(g){S.tracks[tk].geo=g;save('tracks/'+tk,true)}else if(t.value.trim()){t.blur();geoSearch(tk,t.value.trim());return}else{delete S.tracks[tk].geo;save('tracks/'+tk,true)}t.blur();render();return}
  if(t.id==='gsatf'&&t.files&&t.files[0]){const tk=t.dataset.tk||S.galign||S.gsatTk;S.gsatTk=tk;const f=t.files[0];t.value='';t.blur();S.gerr2='Uploading…';render();const up=await satUpload(f);if(up){alStart(tk,up.id,up.w,up.h,null)}else if(S.gerr2==='Uploading…')S.gerr2='';render();window.scrollTo(0,0)}});
let alDrag=null;
document.addEventListener('pointerdown',e=>{const m=e.target.closest&&e.target.closest('#alMap');if(!m||!S.gal)return;const ctm=m.getScreenCTM();if(!ctm)return;alDrag={x:e.clientX,y:e.clientY,cx:S.gal.cx,cy:S.gal.cy,k:ctm.a};try{m.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
document.addEventListener('pointermove',e=>{if(!alDrag||!S.gal)return;S.gal.cx=alDrag.cx+(e.clientX-alDrag.x)/alDrag.k;S.gal.cy=alDrag.cy-(e.clientY-alDrag.y)/alDrag.k;alDraw()});
document.addEventListener('pointerup',()=>{alDrag=null});
document.addEventListener('change',async e=>{const t=e.target;if(!t||t.id!=='gfile'||!t.files||!t.files[0])return;const file=t.files[0];
  S.gdate=$('#g-date').value||todayS();let tid=$('#g-trk').value,name;const ses=$('#g-ses').value.trim();
  if(tid&&S.tracks[tid])name=S.tracks[tid].name;else{name=$('#g-name').value.trim();if(!name){S.gerr='Pick the track, or type its name, before choosing the file.';t.value='';t.blur();render();return}tid=slug(name);if(!S.tracks[tid]){S.tracks[tid]={name,ground:'mixed',setup:{}};save('tracks/'+tid,true)}}
  S.gtrk=tid;S.gerr='';S.gbusy=true;t.blur();render();
  try{const data=/\.fit$/i.test(file.name)?await file.arrayBuffer():await file.text();await new Promise(r=>setTimeout(r,30));
    const P=G.prep(G.parse(file.name,data)),r=G.run(P,S.tracks[tid].timing||null),id=S.gdate+'-'+Math.random().toString(36).slice(2,7);
    const doc={date:S.gdate,trackId:tid,track:name,file:file.name.slice(0,60),created:new Date().toISOString(),...r};if(ses)doc.ses=ses;
    S.gpsx[id]=doc;save('gps/'+id,true);const tr=S.tracks[tid];let ch=false;if(!tr.timing||r.auto){tr.timing=r.gates;ch=true}
    if(!tr.geo&&r.ll&&r.ll.length){let a=0,b=0;r.ll.forEach(p=>{a+=p[0];b+=p[1]});tr.geo={lat:+(a/r.ll.length).toFixed(6),lon:+(b/r.ll.length).toFixed(6)};ch=true}if(ch)save('tracks/'+tid,true);
    S.graw={id,P};S.gsel=id;S.glap=null;S.gb=null;S.gmode=null;S.gnote='';S.pb.t=0;S.pb.on=false}
  catch(err){S.gerr=err&&err.message||'Could not read that file.'}
  S.gbusy=false;render();window.scrollTo(0,0)});
