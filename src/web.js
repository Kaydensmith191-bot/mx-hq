/* ---------- web version: live satellite tiles, location search, Polar import ---------- */
function tilesSVG(P,x0,y0,w,h,zb){const ll=(x,y)=>P.inv(x,-y),nw=ll(x0,y0),se=ll(x0+w,y0+h),mpp=w/1100;
  let z=Math.round(Math.log2(156543.03*Math.cos(P.la0*Math.PI/180)/mpp))+(zb||0);z=Math.max(12,Math.min(19,z));
  const rng=z=>{const n=2**z,tx=lo=>(lo+180)/360*n,ty=la=>{const r=la*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n};return [Math.floor(tx(nw[1])),Math.floor(tx(se[1])),Math.floor(ty(nw[0])),Math.floor(ty(se[0]))]};
  let r=rng(z);while((r[1]-r[0]+1)*(r[3]-r[2]+1)>90&&z>12){z--;r=rng(z)}
  const n=2**z,lon2=t=>t/n*360-180,lat2=t=>180/Math.PI*Math.atan(Math.sinh(Math.PI-2*Math.PI*t/n));let s='';
  for(let X=r[0];X<=r[1];X++)for(let Y=r[2];Y<=r[3];Y++){const a=P.f(lat2(Y),lon2(X)),b=P.f(lat2(Y+1),lon2(X+1));
    s+='<image href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+Y+'/'+X+'" x="'+a[0].toFixed(2)+'" y="'+(-a[1]).toFixed(2)+'" width="'+(b[0]-a[0]+0.5).toFixed(2)+'" height="'+(a[1]-b[1]+0.5).toFixed(2)+'" preserveAspectRatio="none"/>'}
  return s}
const ATTR='<span class="attr">Imagery © Esri, Maxar, Earthstar Geographics</span>';
function satCard(tk){const t=S.tracks[tk]||{},g=trackGeo(tk),s=gsess(tk).find(x=>x.ll&&x.ll.length),res=(S.geoRes||{})[tk];let map='';
  if(g){const P=projN(g.lat,g.lon),pts=s?s.ll.map(p=>{const q=P.f(p[0],p[1]);return [q[0],-q[1]]}):null;let x0,y0,w,h;
    if(pts){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);x0=Math.min(...xs)-50;y0=Math.min(...ys)-50;w=Math.max(...xs)-x0+50;h=Math.max(...ys)-y0+50}else{x0=-450;y0=-320;w=900;h=640}
    if(w/h<1.3){const nw=h*1.3;x0-=(nw-w)/2;w=nw}else if(w/h>1.8){const nh=w/1.8;y0-=(nh-h)/2;h=nh}
    map='<div class="tmmapw" style="margin:10px 0 4px"><svg class="tmmap" viewBox="'+[x0,y0,w,h].map(n=>n.toFixed(1)).join(' ')+'" style="aspect-ratio:'+(w/h).toFixed(3)+'">'+tilesSVG(P,x0,y0,w,h,0)
      +(pts?'<polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="none" stroke="#000" stroke-width="7" opacity=".45"/><polyline points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'" fill="none" stroke="#ff4a12" stroke-width="3.5" stroke-linejoin="round"/>':'<circle cx="0" cy="0" r="'+(w/70).toFixed(1)+'" fill="#ff4a12" stroke="#fff" stroke-width="2.5"/>')+'</svg>'+ATTR+'</div>'
      +'<p class="mut" style="font-size:13px;margin:4px 0 0">'+(pts?'Your racing line from the latest GPS session. Every session here plays back on this map.':'Pin dropped on the track. Your laps will draw on top once you import a session.')+'</p>'}
  return '<div class="card"><span class="lab">TRACK MAP</span><div class="fields"><div style="grid-column:1/-1"><label for="tgeo">Find the track</label><div style="display:flex;gap:8px"><input id="tgeo" data-tk="'+esc(tk)+'" placeholder="Track name, postcode, Google Maps link or 52.25, 0.90" value="'+esc(t.geo?t.geo.lat+', '+t.geo.lon:'')+'" style="flex:1"><button id="tgeoGo" data-tk="'+esc(tk)+'" style="flex:none">Find</button></div></div></div>'
    +(res&&res.length?'<div class="geores">'+res.map(r=>'<button class="ghost" data-geo="'+esc(tk)+'|'+r.lat+'|'+r.lon+'">'+esc(r.name)+'</button>').join('')+'</div>':res&&!res.length?'<p class="mut">Nothing found. Try the town or postcode.</p>':'')
    +(map||'<p class="mut">Search for the track to see it from above.</p>')+'</div>'}
async function geoSearch(tk,q){S.geoRes=S.geoRes||{};S.geoRes[tk]=null;try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});const j=await r.json();
  S.geoRes[tk]=j.map(x=>({lat:+(+x.lat).toFixed(6),lon:+(+x.lon).toFixed(6),name:String(x.display_name||'').split(',').slice(0,3).join(',')}))}catch(e){S.geoRes[tk]=[]}render()}

/* ---------- Polar ---------- */
async function pf(body){const {data,error}=await window.MXSB.functions.invoke('polar',{body});if(error){let m=error.message;try{const j=await error.context.json();m=j.error||m}catch(_){}throw new Error(m)}return data}
const PMSG={polar_keys_missing:'Polar keys aren\'t added yet. See the setup steps Claude gave you.',not_connected:'Polar isn\'t connected yet.',polar_auth:'Polar access ended. Connect again.',not_signed_in:'Sign in again.'};
async function polarStatus(){S.polar={loading:true};try{const r=await pf({action:'status'});S.polar={connected:r.connected,keys:r.keys,since:r.since,msg:S.polarMsgOnce||''};S.polarMsgOnce='';try{const was=localStorage.getItem('mxp:on');localStorage.setItem('mxp:on',r.connected?'1':'0');if(r.connected&&was!=='1'&&typeof polarAuto==='function')polarAuto(true)}catch(_){}}catch(e){S.polar={err:PMSG[e.message]||'Could not reach Polar: '+e.message}}render()}
function polarCard(){if(!window.MXSB)return '';if(!S.polar){setTimeout(polarStatus,0);S.polar={loading:true}}const p=S.polar;let b='';
  const trkName=S.gtrk&&S.tracks[S.gtrk]?S.tracks[S.gtrk].name:(S.gname||'');const imported=new Set(Object.values(S.gpsx).map(d=>d&&d.polarId).filter(Boolean));
  if(p.loading)b='<p class="mut">Checking Polar…</p>';else if(p.err)b='<p style="color:var(--red);font-weight:600">'+esc(p.err)+'</p><button class="ghost" id="pstat">Try again</button>';
  else if(!p.keys)b='<p class="mut">Waiting on your Polar developer keys. Once they\'re added, a Connect button appears here.</p><button class="ghost" id="pstat">Check again</button>';
  else if(!p.connected)b='<p class="mut" style="margin-top:0">Link your Polar account once. After that, sessions you sync to Polar Flow show up here to import with one tap.</p><button id="pcon">Connect Polar</button>';
  else{b='<p class="mut" style="margin-top:0">Connected. Sync your watch to the Polar Flow app, then check here. Polar shares sessions from the last 30 days.</p><div class="row2"><button id="plist">'+(p.busy?'Checking…':'Check for new sessions')+'</button><button class="ghost" id="pdis">Disconnect</button></div>';
    if(p.ex){const ex=p.ex.slice().sort((a,b)=>String(b.start).localeCompare(String(a.start)));b+='<p class="mut" style="font-size:13px">'+(trkName?'Imports go to <b>'+esc(trkName)+'</b>. Change it in Import a session below.':'Pick the track in Import a session below, then tap Import.')+'</p>';b+=ex.length?ex.map(e=>{const done=imported.has(e.id),dur=String(e.duration||'').replace(/^PT/,'').replace(/(\d+)H/,'$1h ').replace(/(\d+)M/,'$1m ').replace(/([\d.]+)S/,'').trim();
      return '<div class="chk" style="grid-template-columns:minmax(0,1fr) auto"><span><b>'+esc(nice(String(e.start).slice(0,10)))+' · '+esc(String(e.start).slice(11,16))+'</b><br><small class="mut">'+esc(String(e.sport||'').toLowerCase().replace(/_/g,' '))+' · '+esc(dur)+(e.distance?' · '+(e.distance/1000).toFixed(1)+' km':'')+(e.route?'':' · no GPS')+'</small></span>'+(done?'<small style="color:var(--go);font-weight:700">Imported</small>':e.route?'<button data-pimp="'+esc(e.id)+'" data-pdate="'+esc(String(e.start).slice(0,10))+'">'+(p.imp===e.id?'Importing…':'Import')+'</button>':'<small class="mut">no GPS</small>')+'</div>'}).join(''):'<p class="mut">No sessions from the last 30 days yet. Polar only shares sessions synced after you connected.</p>'}}
  return '<div class="card"><span class="lab">POLAR · AUTOMATIC IMPORT</span>'+b+(p.msg?'<p style="color:var(--amb);font-weight:600">'+esc(p.msg)+'</p>':'')+'</div>'}
function gImportData(name,data,date,extra){let tid=$('#g-trk')?$('#g-trk').value:'',tname;const ses=$('#g-ses')?$('#g-ses').value.trim():'';
  if(tid&&S.tracks[tid])tname=S.tracks[tid].name;else{tname=$('#g-name')?$('#g-name').value.trim():'';if(!tname)throw new Error('Pick the track, or type its name, in Import a session first.');tid=slug(tname);if(!S.tracks[tid]){S.tracks[tid]={name:tname,ground:'mixed',setup:{}};save('tracks/'+tid,true)}}
  const P=G.prep(G.parse(name,data)),r=G.run(P,S.tracks[tid].timing||null),id=date+'-'+Math.random().toString(36).slice(2,7);
  const doc={date,trackId:tid,track:tname,file:name.slice(0,60),created:new Date().toISOString(),...r,...(extra||{})};if(ses)doc.ses=ses;
  S.gpsx[id]=doc;save('gps/'+id,true);const tr=S.tracks[tid];let c=false;if(!tr.timing||r.auto||JSON.stringify(tr.timing)!==JSON.stringify(r.gates)){tr.timing=r.gates;c=true}
  if(!tr.geo&&r.ll&&r.ll.length){let a=0,b=0;r.ll.forEach(p=>{a+=p[0];b+=p[1]});tr.geo={lat:+(a/r.ll.length).toFixed(6),lon:+(b/r.ll.length).toFixed(6)};c=true}if(c)save('tracks/'+tid,true);
  S.gtrk=tid;S.graw={id,P};S.gsel=id;S.glap=null;S.gb=null;S.gmode=null;S.gnote='';S.pb.t=0;S.pb.on=false;return id}
document.addEventListener('click',async e=>{const t=e.target.closest&&e.target.closest('#pcon,#plist,#pdis,#pstat,[data-pimp],#tgeoGo,[data-geo],#signout');if(!t)return;
  if(t.id==='signout'){window.MXsignOut&&window.MXsignOut();return}
  if(t.id==='tgeoGo'){const tk=t.dataset.tk,v=($('#tgeo')||{}).value||'',g=parseGeo(v);if(g){S.tracks[tk].geo=g;save('tracks/'+tk,true);render()}else if(v.trim())geoSearch(tk,v.trim());return}
  if(t.dataset.geo){const [tk,la,lo]=t.dataset.geo.split('|');if(S.tracks[tk]){S.tracks[tk].geo={lat:+la,lon:+lo};save('tracks/'+tk,true)}if(S.geoRes)S.geoRes[tk]=null;render();return}
  if(t.id==='pstat'){polarStatus();return}
  if(t.id==='pcon'){t.disabled=true;try{const r=await pf({action:'start',returnUrl:location.href.split('#')[0].split('?')[0]});location.href=r.url}catch(err){S.polar.msg=PMSG[err.message]||err.message;t.disabled=false;render()}return}
  if(t.id==='pdis'){try{await pf({action:'disconnect'})}catch(_){}S.polar=null;render();return}
  if(t.id==='plist'){S.polar.busy=true;S.polar.msg='';render();try{const r=await pf({action:'list'});S.polar.ex=r.exercises||[]}catch(err){S.polar.msg=PMSG[err.message]||'Could not load sessions: '+err.message}S.polar.busy=false;render();return}
  if(t.dataset.pimp){const id=t.dataset.pimp;S.polar.imp=id;S.polar.msg='';render();
    try{const r=await pf({action:'file',id}),bin=atob(r.fit),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);gImportData('polar.fit',u.buffer,t.dataset.pdate||todayS(),{polarId:id});window.scrollTo(0,0)}
    catch(err){S.polar.msg=err.message}S.polar.imp=null;render();return}
});
(()=>{try{const q=new URLSearchParams(location.search),p=q.get('polar');if(p){S.sub='gps';S.polar=null;S.polarMsgOnce=p==='ok'?'Polar connected. Sync your watch, then tap Check for new sessions.':'Polar connection didn\'t finish ('+p+'). Try Connect again.';history.replaceState(null,'',location.pathname+'#track')}}catch(e){}})();
document.addEventListener('input',e=>{const t=e.target;if(!t)return;if(t.id==='g-name')S.gname=t.value;else if(t.id==='g-ses')S.gses=t.value;else if(t.id==='g-date')S.gdate=t.value});
document.addEventListener('change',e=>{const t=e.target;if(t&&t.id==='g-trk')S.gtrk=t.value||null});

/* sessions timed by the old lap finder: fetch the ride again from Polar and re-time it once */
function gRetime(id,d){S.gfix=S.gfix||{};if(S.gfix[id])return;S.gfix[id]=1;S.gnote='Re-timing this session with the improved lap finder…';
  (async()=>{try{const r=await pf({action:'file',id:d.polarId}),bin=atob(r.fit),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const P=G.prep(G.parse('polar.fit',u.buffer)),before=d.laps.filter(l=>l.valid).length,x=G.run(P,d.gates||(S.tracks[d.trackId]||{}).timing||null);
    Object.assign(d,x);S.gpsx[id]=d;save('gps/'+id,true);S.graw={id,P};S.glap=null;S.gb=null;const after=x.laps.filter(l=>l.valid).length;
    S.gnote=after>before?'Re-timed: found '+(after-before)+' more lap'+(after-before>1?'s':'')+' that the old version missed.':''}
   catch(e){S.gnote='';d.v=2}render()})()}

/* app updates: spot a new version and offer a one-tap update, so nobody has to close and reopen the app */
const mxVer=()=>{const b=String(window.MXBUILD||'');return /^\d{14}$/.test(b)?+b.slice(6,8)+' '+MN[+b.slice(4,6)-1]+' '+b.slice(8,10)+':'+b.slice(10,12):'dev'};
async function mxCheck(manual){if(!/^\d{14}$/.test(String(window.MXBUILD||'')))return false;
  try{const r=await fetch('version.txt?'+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const v=(await r.text()).trim();
    if(/^\d{14}$/.test(v)&&v>window.MXBUILD){S.updReady=true;mxBanner();if(manual)render();return true}
    if(manual){S.updMsg='You\'re on the latest version';render()}}catch(_){if(manual){S.updMsg='Couldn\'t check: are you online?';render()}}return false}
async function mxUpdate(){try{const g=await navigator.serviceWorker?.getRegistration();if(g)await g.update()}catch(_){}try{const ks=await caches.keys();await Promise.all(ks.filter(k=>k!=='mxhq-tiles').map(k=>caches.delete(k)))}catch(_){}location.reload()}
function mxBanner(){if(document.getElementById('mxupdb'))return;const b=document.createElement('button');b.id='mxupdb';b.type='button';
  b.textContent='New version ready · Tap to update';b.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:9999;background:#ff5a1f;color:#fff;border:0;padding:12px 18px;font:600 14px/1.2 "Chakra Petch",system-ui,sans-serif;letter-spacing:.02em;box-shadow:0 6px 24px rgba(0,0,0,.5);width:auto';
  b.onclick=mxUpdate;document.body.appendChild(b)}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#mxupd');if(!t)return;if(S.updReady)mxUpdate();else{S.updMsg='Checking…';render();mxCheck(true)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')mxCheck()});
setTimeout(()=>mxCheck(),4000);setInterval(()=>mxCheck(),15*60*1000);

/* ---------- WHOOP: connect once, then recovery / HRV / resting HR / sleep / strain fill in by themselves ---------- */
async function wf(body){const {data,error}=await window.MXSB.functions.invoke('whoop',{body});if(error){let m=error.message;try{const j=await error.context.json();m=j.error||m}catch(_){}throw new Error(m)}return data}
const WMSG={whoop_keys_missing:'WHOOP keys aren\'t added yet. See the setup steps Claude gave you.',not_connected:'WHOOP isn\'t connected yet.',whoop_auth:'WHOOP access ended. Tap Connect WHOOP again.',not_signed_in:'Sign in again.'};
const wLS={get:k=>{try{return localStorage.getItem('mxw:'+k)}catch(_){return null}},set:(k,v)=>{try{localStorage.setItem('mxw:'+k,v)}catch(_){}}};
const agoTxt=t=>{if(!t)return 'never';const m=Math.round((Date.now()-new Date(t).getTime())/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
async function whoopStatus(){S.whoop={loading:true};try{const r=await wf({action:'status'});S.whoop={connected:r.connected,keys:r.keys,last:r.last,msg:S.whoopMsgOnce||''};S.whoopMsgOnce='';wLS.set('on',r.connected?'1':'0')}catch(e){S.whoop={err:WMSG[e.message]||'Could not reach WHOOP: '+e.message}}render()}
async function whoopSync(manual,days){if(!window.MXSB)return;const w=S.whoop||(S.whoop={});if(w.busy)return;w.busy=true;if(manual)w.msg='';if(manual)render();
  try{const r=await wf({action:'sync',days:days||7});w.last=new Date().toISOString();wLS.set('last',String(Date.now()));if(manual)w.msg=r.days?'Synced: latest is '+nice(r.latest)+(r.today&&r.today.rec!=null?' · recovery '+r.today.rec+'%':'')+'.':'Nothing new from WHOOP yet. Has your strap synced to the WHOOP app?'}
  catch(e){if(e.message==='whoop_auth'||e.message==='not_connected'){w.connected=false;wLS.set('on','0')}if(manual||e.message==='whoop_auth')w.msg=WMSG[e.message]||'Could not sync: '+e.message}
  w.busy=false;render()}
/* automatic: when the app opens or comes back to the front, at most every 20 minutes */
function whoopAuto(){if(!window.MXSB||wLS.get('on')!=='1')return;const last=+wLS.get('last')||0;if(Date.now()-last<20*60*1000)return;whoopSync(false,3)}
setTimeout(whoopAuto,2500);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')whoopAuto()});
function whoopCard(){if(!window.MXSB)return '';if(!S.whoop){setTimeout(whoopStatus,0);S.whoop={loading:true}}const w=S.whoop;let b='';
  if(w.loading)b='<p class="mut">Checking WHOOP…</p>';else if(w.err)b='<p style="color:var(--red);font-weight:600">'+esc(w.err)+'</p><button class="ghost" id="wstat">Try again</button>';
  else if(!w.keys)b='<p class="mut" style="margin-top:0">Waiting on the WHOOP developer keys. Once they\'re added, a Connect button appears here.</p><button class="ghost" id="wstat">Check again</button>';
  else if(!w.connected)b='<p class="mut" style="margin-top:0">Link WHOOP once. After that, recovery, HRV, resting HR, sleep and strain fill in on their own every morning, and your sessions adjust to them.</p><button id="wcon">Connect WHOOP</button>';
  else b='<p class="mut" style="margin-top:0">Connected. Recovery, HRV, resting HR, sleep and yesterday\'s strain fill in on their own when you open the app. Last synced: <b>'+esc(agoTxt(w.last))+'</b>.</p><div class="row2"><button id="wsync">'+(w.busy?'Syncing…':'Sync now')+'</button><button class="ghost" id="wdis">'+(S.wdis?'Tap again to disconnect':'Disconnect')+'</button></div>';
  return '<div class="card" style="max-width:760px"><span class="lab">WHOOP · AUTOMATIC</span>'+b+(w.msg?'<p style="color:var(--amb);font-weight:600">'+esc(w.msg)+'</p>':'')+'</div>'}
document.addEventListener('click',async e=>{const t=e.target.closest&&e.target.closest('#wcon,#wsync,#wdis,#wstat');if(!t)return;
  if(t.id==='wstat'){whoopStatus();return}
  if(t.id==='wsync'){whoopSync(true,14);return}
  if(t.id==='wdis'){if(!S.wdis){S.wdis=true;render();return}S.wdis=false;try{await wf({action:'disconnect'})}catch(_){}wLS.set('on','0');S.whoop=null;render();return}
  if(t.id==='wcon'){t.disabled=true;try{const r=await wf({action:'start',returnUrl:location.href.split('#')[0].split('?')[0]});location.href=r.url}catch(err){S.whoop.msg=WMSG[err.message]||err.message;t.disabled=false;render()}return}});
(()=>{try{const q=new URLSearchParams(location.search),p=q.get('whoop');if(p){S.ssub='profile';S.whoop=null;S.whoopMsgOnce=p==='ok'?'WHOOP connected. Your last 30 days are in.':'WHOOP connection didn\'t finish ('+p+'). Try Connect WHOOP again.';if(p==='ok'){wLS.set('on','1');wLS.set('last',String(Date.now()))}history.replaceState(null,'',location.pathname+'#stats')}}catch(e){}})();
