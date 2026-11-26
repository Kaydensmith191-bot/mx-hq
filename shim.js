/* Supabase-backed stand-in for the Claude page runtime: login, sync, offline cache */
(()=>{
const SB_URL='https://zsgsriuncsdorlcyjixz.supabase.co',SB_KEY='sb_publishable_GO_bw8yL9c3uMwqlrZcGkg_t6Uw5Qyx';
const sb=window.supabase&&window.supabase.createClient?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'mxhq-auth'}}):null;
window.MXSB=sb;
const cacheGet=c=>{try{return JSON.parse(localStorage.getItem('mxc:'+c)||'{}')}catch(e){return {}}};
const cachePut=(c,m)=>{try{localStorage.setItem('mxc:'+c,JSON.stringify(m))}catch(e){}};
const clone=o=>JSON.parse(JSON.stringify(o||{}));
let uid=null,channel=null;const listeners={},docListeners={},mem={};
function snap(changes,fromCache){return {metadata:{fromCache},docChanges:()=>changes}}
const ch=(type,id,data)=>({type,doc:{id,data:()=>clone(data)}});
function emitCol(col,changes,fromCache){(listeners[col]||[]).forEach(f=>{try{f(snap(changes,fromCache))}catch(e){console.error(e)}})}
function emitDoc(path){const [col,id]=path.split('/'),m=mem[col]||{},has=Object.prototype.hasOwnProperty.call(m,id);(docListeners[path]||[]).forEach(f=>{try{f({exists:has,data:()=>clone(m[id])})}catch(e){console.error(e)}})}
async function loadCol(col){const m=cacheGet(col);mem[col]=m;
  emitCol(col,Object.keys(m).map(id=>ch('added',id,m[id])),true);Object.keys(docListeners).filter(p=>p.startsWith(col+'/')&&(p.split('/')[1] in m)).forEach(emitDoc);
  try{const {data,error}=await sb.from('docs').select('id,data').eq('col',col);if(error)throw error;
    const fresh={};data.forEach(r=>fresh[r.id]=r.data);const changes=[];
    Object.keys(m).forEach(id=>{if(!(id in fresh))changes.push(ch('removed',id,null))});
    Object.keys(fresh).forEach(id=>changes.push(ch(id in m?'modified':'added',id,fresh[id])));
    mem[col]=fresh;cachePut(col,fresh);emitCol(col,changes,false);Object.keys(docListeners).filter(p=>p.startsWith(col+'/')).forEach(emitDoc)}
  catch(e){console.warn('offline: using saved copy of',col)}}
function startRealtime(){if(channel)return;channel=sb.channel('docs-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'user_id=eq.'+uid},p=>{
    const row=p.new&&p.new.col?p.new:p.old;if(!row||!row.col)return;const col=row.col,id=row.id,m=mem[col]||(mem[col]={});
    if(p.eventType==='DELETE'){delete m[id];cachePut(col,m);emitCol(col,[ch('removed',id,null)],false)}else{m[id]=p.new.data;cachePut(col,m);emitCol(col,[ch('modified',id,p.new.data)],false)}
    emitDoc(col+'/'+id)}).subscribe()}
const db={
  collection(col){return {onSnapshot(f){(listeners[col]||(listeners[col]=[])).push(f);loadCol(col);return ()=>{}}}},
  doc(path){const [col,id]=path.split('/');return {
    async set(o){const {error}=await sb.from('docs').upsert({user_id:uid,col,id,data:o,updated_at:new Date().toISOString()},{onConflict:'user_id,col,id'});if(error){const e=new Error(error.message);e.code=error.code==='54000'?'quota_exceeded':'network';throw e}
      const m=mem[col]||(mem[col]={});m[id]=clone(o);cachePut(col,m)},
    async delete(){const {error}=await sb.from('docs').delete().eq('user_id',uid).eq('col',col).eq('id',id);if(error)throw new Error(error.message);const m=mem[col]||{};delete m[id];cachePut(col,m)},
    onSnapshot(f){(docListeners[path]||(docListeners[path]=[])).push(f);if(mem[col])emitDoc(path);else loadCol(col);return ()=>{}}}}};
/* ---------- sign in ---------- */
function loginUI(){return new Promise(res=>{const d=document.createElement('div');d.id='login';
  d.innerHTML='<div class="lg"><img src="icon.png" alt="" width="72" height="72"><h1>MX HQ</h1><p>Sign in to your training app.</p><label for="lg-e">Email</label><input id="lg-e" type="email" autocomplete="email" inputmode="email"><label for="lg-p">Password</label><input id="lg-p" type="password" autocomplete="current-password"><button id="lg-in">Sign in</button><button id="lg-up" class="ghost">Create account</button><p id="lg-m" role="status"></p></div>';
  document.body.appendChild(d);const msg=t=>{document.getElementById('lg-m').textContent=t};
  const go=async up=>{const email=document.getElementById('lg-e').value.trim(),password=document.getElementById('lg-p').value;if(!email||password.length<8){msg('Enter your email and a password of at least 8 characters.');return}
    msg(up?'Creating your account…':'Signing in…');
    let r=up?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});
    let out=r;if(up&&!r.error&&!r.data.session){out=await sb.auth.signInWithPassword({email,password})}
    if(out.error){const m=out.error.message||'';msg(/database error|saving new user|invite/i.test(m)?'This app is invite only. Ask the person who invited you to add this email.':/invalid login/i.test(m)?'Email or password is wrong.':/confirm/i.test(m)?'Account created. Check your email to confirm it, then sign in.':m);return}
    if(!out.data.session){msg('Account created. Check your email to confirm it, then sign in.');return}
    r=out;
    d.remove();res(r.data.session)};
  document.getElementById('lg-in').onclick=()=>go(false);document.getElementById('lg-up').onclick=()=>go(true);
  d.addEventListener('keydown',e=>{if(e.key==='Enter')go(false)})})}
let ready=null;
async function session(){if(!sb)return null;const {data}=await sb.auth.getSession();if(data&&data.session)return data.session;
  if(!navigator.onLine&&localStorage.getItem('mxhq-uid'))return {user:{id:localStorage.getItem('mxhq-uid')},offline:true};return loginUI()}
window.claude={use:async name=>{
  if(name==='db'){if(!ready)ready=(async()=>{const s=await session();if(!s)return null;uid=s.user.id;try{localStorage.setItem('mxhq-uid',uid)}catch(e){}if(!s.offline)startRealtime();return db})();return ready}
  return null}};
window.MXsignOut=async()=>{try{await sb.auth.signOut()}catch(e){}try{Object.keys(localStorage).filter(k=>/^mx[cq]?:|^mxhq-uid/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
