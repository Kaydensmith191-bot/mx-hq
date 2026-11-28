/* ---------- GPS lap timing engine ---------- */
const G=(()=>{
const R=6371008.8,RAD=Math.PI/180,FIT0=631065600,SC=180/2147483648;
const tparse=s=>{s=String(s).trim();const d=Date.parse(s);return isFinite(d)?d/1000:null};
const med=a=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1]};

/* ----- parsers: all return [{t,lat,lon,v(m/s|null),hr}] ----- */
function gpx(x){const o=[],re=/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;let m;
  while((m=re.exec(x))){const a=m[1],b=m[2]||'';const la=/lat\s*=\s*["']([^"']+)/.exec(a),lo=/lon\s*=\s*["']([^"']+)/.exec(a),tm=/<time>([^<]+)<\/time>/.exec(b);if(!la||!lo||!tm)continue;
    const hr=/<(?:\w+:)?(?:hr|heartrate)>([\d.]+)</i.exec(b),sp=/<(?:\w+:)?speed>([\d.]+)</i.exec(b);o.push({t:tparse(tm[1]),lat:+la[1],lon:+lo[1],v:sp?+sp[1]:null,hr:hr?+hr[1]:null})}
  return o}
function tcx(x){const o=[],re=/<(?:\w+:)?Trackpoint>([\s\S]*?)<\/(?:\w+:)?Trackpoint>/g;let m;
  while((m=re.exec(x))){const b=m[1];const tm=/<(?:\w+:)?Time>([^<]+)</.exec(b),la=/<(?:\w+:)?LatitudeDegrees>([^<]+)</.exec(b),lo=/<(?:\w+:)?LongitudeDegrees>([^<]+)</.exec(b);if(!tm||!la||!lo)continue;
    const hr=/<(?:\w+:)?HeartRateBpm[^>]*>\s*<(?:\w+:)?Value>([\d.]+)</.exec(b),sp=/<(?:\w+:)?Speed>([\d.]+)</.exec(b);o.push({t:tparse(tm[1]),lat:+la[1],lon:+lo[1],v:sp?+sp[1]:null,hr:hr?+hr[1]:null})}
  return o}
function csv(x){const L=x.split(/\r?\n/).filter(l=>l.trim());const hi=L.slice(0,60).findIndex(l=>/lat/i.test(l)&&/lon|lng/i.test(l));if(hi<0)return [];
  const sep=[',',';','\t'].sort((a,b)=>L[hi].split(b).length-L[hi].split(a).length)[0];
  const cl=s=>s.trim().replace(/^"|"$/g,'');const H=L[hi].split(sep).map(h=>cl(h).toLowerCase());const f=fn=>H.findIndex(fn);
  const iLa=f(h=>/^lat|latitude/.test(h)),iLo=f(h=>/^lon|^lng|longitude/.test(h)),iD=f(h=>/^date$|^utc date$/.test(h)),
    iT=f(h=>/time|timestamp|^elapsed/.test(h)&&!/lap|split|sector|delta|best|zone/.test(h)),iV=f(h=>/speed|velocity/.test(h)&&!/max|avg|vert/.test(h)),iH=f(h=>/heart|^hr\b|bpm/.test(h));
  if(iLa<0||iLo<0||iT<0)return [];
  const hv=iV>=0?H[iV]:'';const k=/km\/?h|kph/.test(hv)?1/3.6:/mph/.test(hv)?0.44704:/knot|kts/.test(hv)?0.514444:/m\/s|mps|\(ms\)/.test(hv)?1:null;
  const o=[];o.vAuto=iV>=0&&k==null;
  for(let r=hi+1;r<L.length;r++){const c=L[r].split(sep).map(cl);const la=+c[iLa],lo=+c[iLo];if(!isFinite(la)||!isFinite(lo)||c[iLa]==='')continue;
    let t=null,tv=c[iT];
    if(iD>=0&&iD!==iT)t=tparse(c[iD]+' '+tv);
    if(t==null){const n=+tv;if(tv!==''&&isFinite(n))t=n>1e11?n/1000:n;else{t=tparse(tv);if(t==null){const m=/(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(tv);if(m)t=(+m[1])*3600+(+m[2])*60+(+m[3])}}}
    if(t==null)continue;const v=iV>=0&&c[iV]!==''&&isFinite(+c[iV])?+c[iV]*(k||1):null;const hr=iH>=0&&isFinite(+c[iH])&&c[iH]!==''?+c[iH]:null;
    o.push({t,lat:la,lon:lo,v,hr})}
  return o}
function fit(buf){const dv=new DataView(buf),hs=dv.getUint8(0),ds=dv.getUint32(4,true);
  if(String.fromCharCode(dv.getUint8(8),dv.getUint8(9),dv.getUint8(10),dv.getUint8(11))!=='.FIT')throw new Error('This is not a FIT file.');
  const end=Math.min(hs+ds,dv.byteLength),defs={},o=[];let p=hs,lastT=null;
  const rd=(f,q,le)=>{switch(f.b){case 0x85:if(f.s!==4)return null;{const v=dv.getInt32(q,le);return v===0x7FFFFFFF?null:v}
      case 0x86:case 0x8C:if(f.s!==4)return null;{const v=dv.getUint32(q,le);return v===0xFFFFFFFF||(f.b===0x8C&&v===0)?null:v}
      case 0x84:case 0x8B:if(f.s!==2)return null;{const v=dv.getUint16(q,le);return v===0xFFFF||(f.b===0x8B&&v===0)?null:v}
      case 0x83:if(f.s!==2)return null;{const v=dv.getInt16(q,le);return v===0x7FFF?null:v}
      case 0x00:case 0x02:case 0x0A:if(f.s!==1)return null;{const v=dv.getUint8(q);return v===0xFF||(f.b===0x0A&&v===0)?null:v}
      case 0x88:return f.s===4?dv.getFloat32(q,le):null;default:return null}};
  const WANT={253:1,0:1,1:1,3:1,6:1,73:1};
  const msg=(d,q)=>{const r={};for(const f of d.fs)if(WANT[f.n])r[f.n]=rd(f,q+f.o,!d.big);return r};
  const push=(r,t)=>{if(d20(r)&&t!=null){const v=r[73]!=null?r[73]/1000:r[6]!=null?r[6]/1000:null;o.push({t:t+FIT0,lat:r[0]*SC,lon:r[1]*SC,v,hr:r[3]})}};
  const d20=r=>r[0]!=null&&r[1]!=null;
  while(p<end){const h=dv.getUint8(p++);
    if(h&0x80){const d=defs[(h>>5)&3];if(!d||p+d.size>end)break;const off=h&31;if(lastT!=null){let t=lastT-(lastT%32)+off;if(off<lastT%32)t+=32;lastT=t}const r=msg(d,p);p+=d.size;if(d.g===20)push(r,lastT);continue}
    const lt=h&15;
    if(h&0x40){p++;const big=dv.getUint8(p++)===1,g=dv.getUint16(p,!big);p+=2;const n=dv.getUint8(p++),fs=[];let size=0;
      for(let i=0;i<n;i++){fs.push({n:dv.getUint8(p),s:dv.getUint8(p+1),b:dv.getUint8(p+2),o:size});size+=dv.getUint8(p+1);p+=3}
      if(h&0x20){const nd=dv.getUint8(p++);for(let i=0;i<nd;i++){size+=dv.getUint8(p+1);p+=3}}
      defs[lt]={g,big,fs,size};continue}
    const d=defs[lt];if(!d||p+d.size>end)break;const r=msg(d,p);p+=d.size;if(r[253]!=null)lastT=r[253];if(d.g===20)push(r,r[253]!=null?r[253]:lastT)}
  return o}
function parse(name,data){const n=String(name||'').toLowerCase();
  if(n.endsWith('.fit'))return fit(data);
  const x=typeof data==='string'?data:new TextDecoder().decode(data);
  if(n.endsWith('.gpx')||/<gpx[\s>]/i.test(x.slice(0,2000)))return gpx(x);
  if(n.endsWith('.tcx')||/<TrainingCenterDatabase/i.test(x.slice(0,2000)))return tcx(x);
  if(n.endsWith('.csv')||n.endsWith('.txt'))return csv(x);
  throw new Error('Use a .gpx, .tcx, .fit or .csv file.')}

/* ----- prep: clean, project to metres, speeds ----- */
function prep(raw){const vAuto=!!raw.vAuto;let pts=raw.filter(p=>p&&isFinite(p.t)&&isFinite(p.lat)&&isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&!(p.lat===0&&p.lon===0));
  pts.sort((a,b)=>a.t-b.t);pts=pts.filter((p,i)=>!i||p.t-pts[i-1].t>1e-3);
  if(pts.length<30)throw new Error('Not enough GPS points in this file. Was GPS switched on?');
  let la=0,lo=0;pts.forEach(p=>{la+=p.lat;lo+=p.lon});la/=pts.length;lo/=pts.length;const cx=Math.cos(la*RAD),o={lat0:la,lon0:lo,cx};
  pts.forEach(p=>{p.x=(p.lon-lo)*RAD*R*cx;p.y=(p.lat-la)*RAD*R});
  {const dts0=[];for(let i=1;i<Math.min(pts.length,400);i++)dts0.push(pts[i].t-pts[i-1].t);const hz0=1/(med(dts0)||1);
   if(hz0>=4){const sg=Math.max(1,0.15*hz0),r=Math.ceil(sg*2.5),X=pts.map(p=>p.x),Y=pts.map(p=>p.y);
    for(let i=0;i<pts.length;i++){let sx=0,sy=0,n=0;for(let k=-r;k<=r;k++){const q=i+k;if(q<0||q>=pts.length||Math.abs(pts[q].t-pts[i].t)>r/hz0+0.5)continue;const w=Math.exp(-k*k/(2*sg*sg));sx+=X[q]*w;sy+=Y[q]*w;n+=w}pts[i].x=sx/n;pts[i].y=sy/n}}}
  let d=0;pts.forEach((p,i)=>{if(i){const q=pts[i-1];p.brk=p.t-q.t>5;if(!p.brk)d+=Math.hypot(p.x-q.x,p.y-q.y)}p.d=d});
  const dts=[];for(let i=1;i<pts.length;i++)dts.push(pts[i].t-pts[i-1].t);const dt=med(dts)||1;o.hz=Math.round(10/dt)/10;
  const w=Math.max(1,Math.round(0.5/dt)),n=pts.length;
  const vp=pts.map((p,i)=>{const a=pts[Math.max(0,i-w)],b=pts[Math.min(n-1,i+w)],tt=b.t-a.t;return tt>0&&tt<8?(b.d-a.d)/tt:0});
  let f=1;if(vAuto){const r=[];pts.forEach((p,i)=>{if(p.v!=null&&vp[i]>4)r.push(p.v/vp[i])});const m=med(r);f=[1,3.6,2.23694,1.94384].reduce((b,c)=>Math.abs(Math.log(m/c))<Math.abs(Math.log(m/b))?c:b,1)}
  pts.forEach((p,i)=>{p.v=p.v!=null&&isFinite(p.v)?p.v/f:vp[i]});
  o.spacing=med(pts.slice(1).map((p,i)=>p.d-pts[i].d).filter(x=>x>0.3))||5;
  o.t0=pts[0].t;o.dur=pts[n-1].t-pts[0].t;o.n=n;o.hasHr=pts.some(p=>p.hr>0);
  return {pts,o}}
const toLL=(o,g)=>({lat:+(o.lat0+g.y/R/RAD).toFixed(7),lon:+(o.lon0+g.x/(R*o.cx)/RAD).toFixed(7),hd:+g.hd.toFixed(4)});
const fromLL=(o,g)=>({x:(g.lon-o.lon0)*RAD*R*o.cx,y:(g.lat-o.lat0)*RAD*R,hd:g.hd});
function gateAt(pts,i){let a=i,b=i;while(a>0&&pts[i].d-pts[a].d<6&&!pts[a].brk)a--;while(b<pts.length-1&&pts[b].d-pts[i].d<6&&!pts[b+1].brk)b++;
  return {x:pts[i].x,y:pts[i].y,hd:Math.atan2(pts[b].y-pts[a].y,pts[b].x-pts[a].x)}}
function nearest(pts,x,y){let bi=0,bd=Infinity;for(let i=0;i<pts.length;i++){const d=(pts[i].x-x)**2+(pts[i].y-y)**2;if(d<bd){bd=d;bi=i}}return bi}

/* ----- gate crossings & laps ----- */
function cross(pts,g,w,gap){w=w||24;const dx=Math.cos(g.hd),dy=Math.sin(g.hd),nx=-dy,ny=dx,e1x=g.x+nx*w/2,e1y=g.y+ny*w/2,qx=-nx*w,qy=-ny*w,lim=(w+40)**2,out=[];
  for(let i=1;i<pts.length;i++){const B=pts[i];if(B.brk)continue;const A=pts[i-1];if((A.x-g.x)**2+(A.y-g.y)**2>lim)continue;
    const rx=B.x-A.x,ry=B.y-A.y;if(rx*dx+ry*dy<=0)continue;const den=rx*qy-ry*qx;if(Math.abs(den)<1e-9)continue;const ex=e1x-A.x,ey=e1y-A.y,u=(ex*qy-ey*qx)/den,s=(ex*ry-ey*rx)/den;
    if(u<0||u>1||s<0||s>1)continue;const t=A.t+u*(B.t-A.t);if(out.length&&t-out[out.length-1].t<gap)continue;out.push({t,i,u})}
  return out}
/* GPS on a watch drifts 5-15 m, so a fixed 24 m line placed a few metres off the racing line misses laps.
   fitGate: move the line to where you actually cross it, then make it as wide as the track allows
   without picking up another part of the track (that would show up as laps that are far too short). */
function xpt(pts,z){const A=pts[z.i-1],B=pts[z.i];return {x:A.x+(B.x-A.x)*z.u,y:A.y+(B.y-A.y)*z.u}}
function shortN(c,m){let n=0;for(let k=1;k<c.length;k++)if(c[k].t-c[k-1].t<m*0.6)n++;return n}
function fitGate(pts,g,gap){let c=cross(pts,g,24,gap);if(c.length<3)return g;
  const nx=-Math.sin(g.hd),ny=Math.cos(g.hd),off=med(c.map(z=>{const p=xpt(pts,z);return (p.x-g.x)*nx+(p.y-g.y)*ny}));
  const g2={x:g.x+nx*off,y:g.y+ny*off,hd:g.hd};const c2=cross(pts,g2,24,gap),base=c2.length>=c.length?c2:c,b=c2.length>=c.length?g2:g;
  const m=med(base.slice(1).map((z,k)=>z.t-base[k].t)),s0=shortN(base,m);
  for(const w of [60,48,36]){const cw=cross(pts,b,w,gap);if(cw.length>=base.length&&shortN(cw,m)<=s0)return {...b,w}}
  return {...b,w:24}}
/* a lap that is 2, 3, 4… times the normal time is missed crossings, not a slow lap: find where each missing crossing happened */
function fillMissed(pts,g,c){if(c.length<3)return c;const ints=[];for(let k=1;k<c.length;k++)ints.push(c[k].t-c[k-1].t);const m=med(ints.filter(x=>x>=20));if(!(m>0))return c;
  const dl=med(c.slice(1).map((z,k)=>pts[z.i].d-pts[c[k].i].d).filter((x,k)=>Math.abs(ints[k]-m)<m*0.2));if(!(dl>0))return c;
  const dx=Math.cos(g.hd),dy=Math.sin(g.hd),nx=-dy,ny=dx,out=[c[0]];
  for(let k=1;k<c.length;k++){const a=c[k-1],b=c[k],r=(b.t-a.t)/m,n=Math.round(r);
    let brk=false;for(let i=a.i+1;i<=b.i;i++)if(pts[i].brk){brk=true;break}
    if(!brk&&n>=2&&n<=8&&Math.abs(r-n)<0.3){let prev=a;
      for(let j=1;j<n;j++){const want=pts[a.i].d+j*dl;let best=null;
        for(let i=prev.i+1;i<b.i;i++){const A=pts[i-1],B=pts[i];if(B.brk)continue;if(Math.abs(B.d-want)>dl*0.3)continue;
          const fa=(A.x-g.x)*dx+(A.y-g.y)*dy,fb=(B.x-g.x)*dx+(B.y-g.y)*dy;if(!(fa<0&&fb>=0))continue;
          const u=fa/(fa-fb),lat=Math.abs((A.x+(B.x-A.x)*u-g.x)*nx+(A.y+(B.y-A.y)*u-g.y)*ny);if(lat>45)continue;
          const sc=Math.abs(B.d-want)+lat*2;if(!best||sc<best.sc)best={t:A.t+u*(B.t-A.t),i,u,sc,fill:true}}
        if(best&&best.t-prev.t>m*0.6&&b.t-best.t>m*0.6){out.push(best);prev=best}}}
    out.push(b)}
  return out}
const crossW=(pts,g,gap)=>cross(pts,g,g.w||24,gap);
function mkLaps(pts,c){const L=[];for(let k=1;k<c.length;k++){const a=c[k-1],b=c[k];let brk=false;for(let i=a.i+1;i<=b.i;i++)if(pts[i].brk){brk=true;break}L.push({t0:a.t,t1:b.t,i0:a.i,i1:b.i,u0:a.u,u1:b.u,time:b.t-a.t,brk})}
  const m=med(L.filter(l=>!l.brk&&l.time>=20).map(l=>l.time));L.forEach(l=>l.valid=!l.brk&&l.time>=20&&m>0&&l.time<=m*1.35&&l.time>=m*0.7);return L}
function autoSF(pts){const n=pts.length,a=Math.floor(n*0.2),b=Math.floor(n*0.8),step=Math.max(1,Math.floor((b-a)/180));let best=null;
  for(let i=a;i<b;i+=step){if(pts[i].v<5||pts[i].brk)continue;const g=gateAt(pts,i),c=cross(pts,g,24,15);if(c.length<4)continue;const v=mkLaps(pts,c).filter(l=>l.valid);if(v.length<3)continue;
    const m=med(v.map(l=>l.time)),cov=v.filter(l=>Math.abs(l.time-m)/m<0.12).reduce((s,l)=>s+l.time,0),sc=cov+m*0.5+pts[i].v*0.05;if(!best||sc>best.sc)best={sc,g}}
  return best&&best.g}
function autoSplits(pts,l){const d0=pts[l.i0].d,D=pts[l.i1].d-d0,g=[];let i=l.i0;for(const f of [0.25,0.5,0.75]){while(i<l.i1&&pts[i].d-d0<f*D)i++;g.push(gateAt(pts,i))}return g}

/* ----- lap profiles on a distance grid ----- */
const lerp=(A,B,u)=>({x:A.x+(B.x-A.x)*u,y:A.y+(B.y-A.y)*u,t:A.t+(B.t-A.t)*u,v:A.v+(B.v-A.v)*u,hr:A.hr});
function lapPts(pts,l){const a=[lerp(pts[l.i0-1],pts[l.i0],l.u0)];for(let i=l.i0;i<l.i1;i++)a.push(pts[i]);a.push(lerp(pts[l.i1-1],pts[l.i1],l.u1));
  let s=0;return a.map((p,i)=>{if(i)s+=Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y);return {x:p.x,y:p.y,t:p.t-l.t0,v:p.v,hr:p.hr,s}})}
function grid(lp,ds){const D=lp[lp.length-1].s,N=Math.floor(D/ds),x=[],y=[],t=[],v=[];let j=0;
  for(let k=0;k<=N;k++){const s=k*ds;while(j<lp.length-2&&lp[j+1].s<s)j++;const A=lp[j],B=lp[j+1],u=B.s>A.s?Math.min(1,Math.max(0,(s-A.s)/(B.s-A.s))):0;x.push(A.x+(B.x-A.x)*u);y.push(A.y+(B.y-A.y)*u);t.push(A.t+(B.t-A.t)*u);v.push(A.v+(B.v-A.v)*u)}
  return {x,y,t,v,D,N}}
function mapTo(ref,lp){const N=ref.N,s=[],res=[];let j=0;
  lp.forEach((p,i)=>{if(i===0){s.push(0);return}if(i===lp.length-1){s.push(ref.D);return}let bk=j,bd=Infinity;for(let k=Math.max(0,j-8);k<=Math.min(N,j+90);k++){const d=(ref.x[k]-p.x)**2+(ref.y[k]-p.y)**2;if(d<bd){bd=d;bk=k}}
    j=Math.max(j,bk);s.push(Math.max(s[s.length-1],bk*2));res.push(Math.sqrt(bd))});
  return {s,res:med(res)}}
function onGrid(sArr,vals,ds,D){const N=Math.floor(D/ds),out=[];let j=0;for(let k=0;k<=N;k++){const s=k*ds;while(j<sArr.length-2&&sArr[j+1]<=s)j++;const a=sArr[j],b=sArr[j+1],u=b>a?Math.min(1,Math.max(0,(s-a)/(b-a))):1;out.push(vals[j]+(vals[j+1]-vals[j])*u)}return out}
function smooth(a,sig){const r=Math.ceil(sig*2.5),w=[];let ws=0;for(let i=-r;i<=r;i++){const x=Math.exp(-i*i/(2*sig*sig));w.push(x);ws+=x}
  return a.map((_,k)=>{let s=0,n=0;for(let i=-r;i<=r;i++){const q=k+i;if(q<0||q>=a.length)continue;s+=a[q]*w[i+r];n+=w[i+r]}return s/n})}
const at=(arr,s,ds)=>{const k=s/ds,i=Math.floor(k);if(i>=arr.length-1)return arr[arr.length-1];if(i<0)return arr[0];return arr[i]+(arr[i+1]-arr[i])*(k-i)};
function corners(v,ds){const n=v.length,w=Math.round(15/ds),win=Math.round(120/ds),c=[];
  for(let k=w;k<n-w;k++){let lo=true;for(let i=k-w;i<=k+w;i++)if(v[i]<v[k]){lo=false;break}if(!lo)continue;
    let pre=0,post=0;for(let i=Math.max(0,k-win);i<k;i++)pre=Math.max(pre,v[i]);for(let i=k+1;i<Math.min(n,k+win);i++)post=Math.max(post,v[i]);
    if(pre-v[k]>=6&&post-v[k]>=5){if(c.length&&(k-c[c.length-1])*ds<30){if(v[k]<v[c[c.length-1]])c[c.length-1]=k}else c.push(k)}}
  return c.map(k=>k*ds)}

/* ----- full analysis -> storable summary ----- */
function run(P,gates){const {pts,o}=P;let sf=gates&&gates.sf?fromLL(o,gates.sf):null,auto=false;
  if(sf){sf=fitGate(pts,sf,15);const c=crossW(pts,sf,15);if(mkLaps(pts,c).filter(l=>l.valid).length<2)sf=null}
  if(!sf){sf=autoSF(pts);auto=true;if(sf)sf=fitGate(pts,sf,15)}
  if(!sf)throw new Error('Could not find repeated laps. Check the file is from a track session, or tap the finish line on the map.');
  const L=mkLaps(pts,fillMissed(pts,sf,crossW(pts,sf,15))),V=L.filter(l=>l.valid);if(!V.length)throw new Error('No complete laps found.');
  const refL=V.reduce((a,b)=>b.time<a.time?b:a);
  let sp=gates&&gates.sp&&gates.sp.length===3&&!auto?gates.sp.map(g=>fromLL(o,g)):autoSplits(pts,refL);
  sp=sp.map(g=>fitGate(pts,g,5));const sc=sp.map(g=>crossW(pts,g,5));
  L.forEach(l=>{if(!l.valid)return;const s=[];let prev=l.t0;for(const c of sc){const x=c.find(z=>z.t>prev+1&&z.t<l.t1-1);if(!x){l.sec=null;return}s.push(x.t);prev=x.t}l.sec=[s[0]-l.t0,s[1]-s[0],s[2]-s[1],l.t1-s[2]]});
  if(V.filter(l=>l.sec).length<Math.ceil(V.length/2)&&!auto&&gates&&gates.sp){sp=autoSplits(pts,refL).map(g=>fitGate(pts,g,5));const sc2=sp.map(g=>crossW(pts,g,5));L.forEach(l=>{if(!l.valid)return;const s=[];let prev=l.t0;for(const c of sc2){const x=c.find(z=>z.t>prev+1&&z.t<l.t1-1);if(!x){l.sec=null;return}s.push(x.t);prev=x.t}l.sec=[s[0]-l.t0,s[1]-s[0],s[2]-s[1],l.t1-s[2]]})}
  const ds=2,ref=grid(lapPts(pts,refL),ds),D=ref.D,sig=Math.max(3,o.spacing*0.5)/ds;
  const prof=new Map();
  V.forEach(l=>{const lp=lapPts(pts,l),m=l===refL?{s:lp.map(p=>Math.min(D,p.s)),res:0}:mapTo(ref,lp);if(m.res>20)return;
    prof.set(l,{t:onGrid(m.s,lp.map(p=>p.t),ds,D),v:smooth(onGrid(m.s,lp.map(p=>p.v*3.6),ds,D),sig),x:onGrid(m.s,lp.map(p=>p.x),ds,D),y:onGrid(m.s,lp.map(p=>p.y),ds,D)})});
  const cs=corners(prof.get(refL).v,ds),bounds=[0];for(let i=1;i<cs.length;i++)bounds.push((cs[i-1]+cs[i])/2);bounds.push(D);
  const r1=x=>Math.round(x*10)/10,r2=x=>Math.round(x*100)/100;
  const cm=(p)=>cs.map((a,j)=>{const b0=bounds[j],b1=bounds[j+1],k0=Math.round(b0/ds),k1=Math.min(p.v.length-1,Math.round(b1/ds));
    let ka=Math.round(a/ds),lo=Infinity;for(let k=Math.max(k0,ka-10);k<=Math.min(k1,ka+10);k++)if(p.v[k]<lo){lo=p.v[k];ka=k}
    let kb=k0,hi=-1;for(let k=k0;k<=ka;k++)if(p.v[k]>hi){hi=p.v[k];kb=k}
    let g=0;for(let k=kb;k<ka;k++){const v=p.v[k]/3.6,dv=(p.v[k+1]-p.v[k])/3.6/ds;g=Math.max(g,-v*dv/9.81)}
    let top=0;for(let k=ka;k<=k1;k++)top=Math.max(top,p.v[k]);const ex=p.v[Math.min(k1,ka+Math.round(30/ds))];
    return [Math.round(hi),Math.round((ka-kb)*ds),r2(g),Math.round(lo),Math.round(ex),Math.round(top),r2(at(p.t,b1,ds)-at(p.t,b0,ds))]});
  const G5=5,N5=Math.floor(D/G5);
  const laps=L.map((l,i)=>{const lp=pts.slice(l.i0,l.i1),hr=lp.map(p=>p.hr).filter(h=>h>0),x={n:i+1,time:r2(l.time),valid:!!l.valid,start:Math.round(l.t0-o.t0),
      vmax:Math.round(Math.max(...lp.map(p=>p.v))*3.6)};if(hr.length){x.hrAvg=Math.round(hr.reduce((a,b)=>a+b,0)/hr.length);x.hrMax=Math.max(...hr)}
    x.avg=Math.round(D/l.time*36)/10;if(l.sec)x.sec=l.sec.map(r2);const p=prof.get(l);if(p){x.cm=cm(p);const t5=[],v5=[],o5=[];for(let k=0;k<=N5;k++){const s=k*G5,s0=Math.max(0,s-3),s1=Math.min(D,s+3);let tx=at(ref.x,s1,ds)-at(ref.x,s0,ds),ty=at(ref.y,s1,ds)-at(ref.y,s0,ds);const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
      t5.push(r2(at(p.t,s,ds)));v5.push(Math.round(at(p.v,s,ds)));o5.push(l===refL?0:Math.max(-30,Math.min(30,r1((at(p.x,s,ds)-at(ref.x,s,ds))*-ty+(at(p.y,s,ds)-at(ref.y,s,ds))*tx))))}x.t5=t5;x.v5=v5;x.o5=o5}return x});
  let hr5=null,hrs=null;if(o.hasHr){const H=pts.filter(p=>p.hr>0),nb=Math.floor(o.dur/5)+1,sm=new Array(nb).fill(0),cn=new Array(nb).fill(0);H.forEach(p=>{const k=Math.min(nb-1,Math.floor((p.t-o.t0)/5));sm[k]+=p.hr;cn[k]++});hr5=sm.map((v,k)=>cn[k]?Math.round(v/cn[k]):null);const hv=H.map(p=>p.hr);hrs={min:Math.min(...hv),avg:Math.round(hv.reduce((a,b)=>a+b,0)/hv.length),max:Math.max(...hv)}}
  const secS=sp.map(g=>{let bk=0,bd=Infinity;for(let k=0;k<=ref.N;k++){const d=(ref.x[k]-g.x)**2+(ref.y[k]-g.y)**2;if(d<bd){bd=d;bk=k}}return bk*ds});
  const ll=[];for(let k=0;k<=N5;k++){const g=toLL(o,{x:at(ref.x,k*G5,ds),y:at(ref.y,k*G5,ds),hd:0});ll.push([g.lat,g.lon])}
  const S=laps.filter(l=>l.sec),aSec=S.length?[0,1,2,3].map(k=>Math.min(...S.map(l=>l.sec[k]))):null,C=laps.filter(l=>l.cm);
  const aCor=C.length&&cs.length?cs.map((_,j)=>Math.min(...C.map(l=>l.cm[j][6]))):null;
  return {v:2,hz:o.hz,dur:Math.round(o.dur),hasHr:o.hasHr,len:Math.round(D),best:L.indexOf(refL),laps,aSec,aLap:aSec?r2(aSec.reduce((a,b)=>a+b,0)):null,
    aCor,aCorLap:aCor?r2(aCor.reduce((a,b)=>a+b,0)):null,corners:cs.map(s=>Math.round(s)),bounds:bounds.map(s=>Math.round(s)),g5:G5,ll,auto,
    gates:{sf:toLL(o,sf),sp:sp.map(g=>toLL(o,g))},secS:secS.map(Math.round),hr5,hrs,dist:Math.round(pts[pts.length-1].d),t0:Math.round(o.t0)}}
function moveGate(P,gates,which,lat,lon){const {pts,o}=P,g=fromLL(o,{lat,lon,hd:0}),i=nearest(pts,g.x,g.y),ng=toLL(o,gateAt(pts,i));
  const out={sf:gates.sf,sp:(gates.sp||[]).slice()};if(which==='sf'){out.sf=ng;out.sp=null}else out.sp[+which.slice(1)-1]=ng;return out}
return {parse,prep,run,moveGate,_:{fit,gpx,tcx,csv,cross,corners}}})();
