import {seed} from './crypto.mjs';
export const GAMES=['harfle','harf500','baklava','bagla','kesme','tilkile','arala','sehirle'];
const day=s=>Date.parse(s+'T00:00:00Z')/864e5;
const alphabet='ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
export const upper=s=>s.toLocaleUpperCase('tr-TR');
export const lower=s=>s.toLocaleLowerCase('tr-TR');
export function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,s){a=a.slice();const r=mulberry32(s);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const reject=()=>{throw new Error('INVALID_MOVE');};
export function score(guess,answer){
  const out=Array(5).fill('absent'),counts={};
  for(const c of answer)counts[c]=(counts[c]||0)+1;
  for(let i=0;i<5;i++)if(guess[i]===answer[i]){out[i]='correct';counts[guess[i]]--;}
  for(let i=0;i<5;i++)if(out[i]!=='correct'&&counts[guess[i]]>0){out[i]='present';counts[guess[i]]--;}
  return out;
}
const positions=()=>Array.from({length:25},(_,i)=>[Math.floor(i/5),i%5]).filter(([r,c])=>!(r%2&&c%2));
function solution(p){const g=Array.from({length:5},()=>Array(5).fill(null));[0,2,4].forEach((r,i)=>{for(let c=0;c<5;c++)g[r][c]=p.across[i][c];});[0,2,4].forEach((c,i)=>{for(let r=0;r<5;r++)g[r][c]=p.down[i][r];});return g;}
function colors(cur,sol){const a=Array.from({length:5},()=>Array(5).fill(-1)),rank={absent:0,present:1,correct:2};[0,2,4].forEach(r=>score(cur[r].join(''),sol[r].join('')).forEach((s,c)=>a[r][c]=Math.max(a[r][c],rank[s])));[0,2,4].forEach(c=>score(cur.map(r=>r[c]).join(''),sol.map(r=>r[c]).join('')).forEach((s,r)=>a[r][c]=Math.max(a[r][c],rank[s])));return a;}
export function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(a)/2;}
export function clipHalf(pts,A,N){const res=[],side=p=>N[0]*(p[0]-A[0])+N[1]*(p[1]-A[1]);for(let i=0;i<pts.length;i++){const cur=pts[i],nxt=pts[(i+1)%pts.length],sc=side(cur),sn=side(nxt);if(sc>=0)res.push(cur);if((sc>=0)!==(sn>=0)){const t=sc/(sc-sn);res.push([cur[0]+t*(nxt[0]-cur[0]),cur[1]+t*(nxt[1]-cur[1])]);}}return res;}
function konturlar(sh){return sh.c||[{s:1,p:sh.p}];}
function sekilAlani(cs){return Math.max(0,cs.reduce((a,c)=>a+c.s*polyArea(c.p),0));}
function kesilmisAlan(cs,A,N){return Math.max(0,cs.reduce((a,c)=>a+c.s*polyArea(clipHalf(c.p,A,N)),0));}
function sekleSigdir(sh,box,pad){
  const cs=konturlar(sh);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  cs.forEach(c=>c.p.forEach(([x,y])=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}));
  const w=maxX-minX,h=maxY-minY,s=(box-2*pad)/Math.max(w,h);
  const ox=(box-w*s)/2-minX*s,oy=(box-h*s)/2-minY*s;
  return cs.map(c=>({s:c.s,p:c.p.map(([x,y])=>[x*s+ox,y*s+oy])}));
}
function sekilIcinde(cs,pt){
  let ic=false;
  for(const c of cs)for(let i=0,j=c.p.length-1;i<c.p.length;j=i++){
    const a=c.p[i],b=c.p[j];
    if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])ic=!ic;
  }
  return ic;
}
/* a->b doğrusunun poligon kenarlarını kestiği noktaların t parametreleri (a=0, b=1) */
function lineCrossings(pts,a,b){
  const d=[b[0]-a[0],b[1]-a[1]];const ts=[];
  for(let i=0;i<pts.length;i++){
    const p=pts[i],q=pts[(i+1)%pts.length];
    const e=[q[0]-p[0],q[1]-p[1]];
    const den=d[0]*e[1]-d[1]*e[0];
    if(Math.abs(den)<1e-12)continue;
    const t=((p[0]-a[0])*e[1]-(p[1]-a[1])*e[0])/den;
    const u=((p[0]-a[0])*d[1]-(p[1]-a[1])*d[0])/den;
    if(u>=0&&u<1)ts.push(t);
  }
  return ts;
}
/* geçerli kesim: çizilen PARÇA şekli baştan başa geçmeli -
   doğrunun tüm sınır kesişimleri [0,1] parametre aralığında kalmalı */
function validSegmentCut(cs,a,b){
  const ts=cs.flatMap(c=>lineCrossings(c.p,a,b)).sort((x,y)=>x-y).filter((t,i,all)=>!i||Math.abs(t-all[i-1])>1e-7);
  let malzeme=false;
  for(let i=1;i<ts.length;i++){
    const t=(ts[i-1]+ts[i])/2;
    if(!sekilIcinde(cs,[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]))continue;
    if(ts[i-1]<-1e-6||ts[i]>1+1e-6)return false;
    malzeme=true;
  }
  const total=sekilAlani(cs),left=kesilmisAlan(cs,a,[-(b[1]-a[1]),b[0]-a[0]]);
  return malzeme&&left>total*1e-8&&total-left>total*1e-8;
}


export function fitShape(p){const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,s=.63/Math.max(w,h);return p.map(p=>[(p[0]-x)*s+(1-w*s)/2,(p[1]-y)*s+(1-h*s)/2]);}
// All private state stays in this module. Only the returned view reaches the client.
export function play(session,data,key,cutover){
  const {game,date,mode,level,moves}=session, d=day(date),no=d-day('2026-08-01');
  const privateSeed=seed(key,[game,date,mode==='practice'?session.id:'',level||''].join(':'));
  const old=mode!=='practice'&&date<cutover;
  let v={game,date,mode,done:false,win:false,attempts:moves.length};
  if(game==='harfle'||game==='harf500'){
    const isH=game==='harfle',pool=isH?shuffle(data.harfle.answers,20260101):data.harf500.pools[level];
    // A keyed permutation preserves non-repeating daily play, rather than random picks.
    const ordered=old?pool:shuffle(pool,seed(key,game+':'+(level||'')+':'+cutover));
    const i=mode==='practice'?privateSeed%pool.length:((no%pool.length)+pool.length)%pool.length;
    const answer=upper(ordered[i]),accepted=new Set((isH?data.harfle.accepted:data.harf500.accepted).map(upper));
    v.guesses=[];v.scores=[];
    for(const move of moves){if(v.done||typeof move!=='string'||!accepted.has(move)||(!isH&&v.guesses.includes(move)))reject();const s=score(move,answer);v.guesses.push(move);v.scores.push(isH?s:{yesil:s.filter(c=>c==='correct').length,sari:s.filter(c=>c==='present').length,kirmizi:s.filter(c=>c==='absent').length});v.win=move===answer;v.done=v.win||v.guesses.length>=(isH?6:8);}
    if(v.done)v.answer=isH?answer:lower(answer);
    return v;
  }
  if(game==='tilkile'){
    const order=shuffle(data.tilkile,old?(0x9e3779b1^(no+1)):privateSeed);let ptr=0,words=[],guessed=[],absent=[],wrong=0;
    const next=()=>{for(let n=0;n<order.length;n++){const w=order[ptr++%order.length];if(!words.includes(w)&&![...w].every(c=>guessed.includes(c)))return w;}return null;};
    words.push(next());
    for(const m of moves){if(v.done||typeof m!=='string'||m.length!==1||!alphabet.includes(m)||guessed.includes(m))reject();guessed.push(m);if(!words.some(w=>w.includes(m))){absent.push(m);wrong++;if(wrong<8){const w=next();if(w)words.push(w);}}v.win=words.every(w=>[...w].every(c=>guessed.includes(c)));v.done=v.win||wrong>=8;}
    return {...v,words:words.map(w=>v.done?w:[...w].map(c=>guessed.includes(c)?c:'_').join('')),guessed,absent,wrong,status:v.done?(v.win?'won':'lost'):'playing'};
  }
  if(game==='bagla'){
    const n=d-day('2026-10-03'),p=data.bagla[n];if(!p)throw new Error('PUZZLE_UNAVAILABLE');
    const solved=[],history=[],attempts=[];let errors=0;
    const all=p.gruplar.flatMap(g=>g.kelimeler);
    let last=null;
    for(const m of moves){if(v.done||!Array.isArray(m)||m.length!==4||new Set(m).size!==4||!m.every(w=>all.includes(w)&&!solved.some(i=>p.gruplar[i].kelimeler.includes(w))))reject();const signature=m.slice().sort().join('|');if(history.includes(signature))reject();history.push(signature);const groups=m.map(w=>p.gruplar.findIndex(g=>g.kelimeler.includes(w))),counts=[0,0,0,0];groups.forEach(i=>counts[i]++);const matched=counts.indexOf(4);last={matched,oneAway:counts.includes(3)};attempts.push(groups.map(i=>i+1));if(matched>=0)solved.push(matched);else errors++;v.win=solved.length===4;v.done=v.win||errors>=4;}
    return {...v,words:shuffle(all,privateSeed),solved,errors,last,history,revealed:p.gruplar.map((g,i)=>v.done||solved.includes(i)?{id:i,...g}:null).filter(Boolean),colors:v.done?attempts:null};
  }
  if(game==='baklava'){
    const index=(old?d:privateSeed)%data.baklava.length,p=data.baklava[index],sol=solution(p),pos=positions();
    let letters=typeof p.start==='string'?[...p.start]:null;
    if(!letters||letters.length!==21||letters.slice().sort().join('')!==pos.map(([r,c])=>sol[r][c]).sort().join('')){
      letters=pos.map(([r,c])=>sol[r][c]);const rnd=mulberry32(((index+1)*2654435761)>>>0);let n=0,guard=0;while(n<13&&guard++<600){const i=Math.floor(rnd()*21),j=Math.floor(rnd()*21);if(i===j||letters[i]===letters[j])continue;[letters[i],letters[j]]=[letters[j],letters[i]];n++;}
    }
    const cur=Array.from({length:5},()=>Array(5).fill(null));pos.forEach(([r,c],i)=>cur[r][c]=letters[i]);let left=15,ranks=colors(cur,sol);
    if(session.legacy){
      const l=session.legacy;
      if(!old||!Array.isArray(l.letters)||l.letters.length!==21||!l.letters.every(c=>typeof c==='string'&&c.length===1)||l.letters.slice().sort().join('')!==pos.map(([r,c])=>sol[r][c]).sort().join('')||!Number.isInteger(l.swapsLeft)||l.swapsLeft<0||l.swapsLeft>15||!['play','win','lose'].includes(l.phase))reject();
      pos.forEach(([r,c],i)=>cur[r][c]=l.letters[i]);left=l.swapsLeft;ranks=colors(cur,sol);
      const solved=pos.every(([r,c])=>cur[r][c]===sol[r][c]);
      if(l.phase==='win'&&!solved)reject();
      v.win=l.phase==='win';v.done=l.phase==='win'||l.phase==='lose';
    }
    for(const m of moves){if(v.done||!Array.isArray(m)||m.length!==2||!m.every(i=>Number.isInteger(i)&&i>=0&&i<21)||m[0]===m[1])reject();const [ar,ac]=pos[m[0]],[br,bc]=pos[m[1]];if(ranks[ar][ac]===2||ranks[br][bc]===2)reject();if(cur[ar][ac]!==cur[br][bc])left--;[cur[ar][ac],cur[br][bc]]=[cur[br][bc],cur[ar][ac]];ranks=colors(cur,sol);v.win=pos.every(([r,c])=>cur[r][c]===sol[r][c]);v.done=v.win||left===0;}
    return {...v,grid:cur,ranks,swapsLeft:left,...(v.done?{solution:sol}:{})};
  }
  if(game==='arala'){
    const {answers,accepted}=data.arala;const N=accepted.length;let x=Math.imul(d-day('2026-01-01')+11,2654435761)>>>0;x=(x^(x>>>13))>>>0;x=Math.imul(x,1274126177)>>>0;x=(x^(x>>>16))>>>0;
    let base=(old?x:privateSeed)%answers.length,idx=1;for(let t=0;t<answers.length;t++){const i=accepted.indexOf(answers[(base+t)%answers.length]);if(i>0&&i<N-1){idx=i;break;}}
    let lo=0,hi=N-1,ts=false,bs=false,steps=0,gaveUp=false,dirs=[];
    if(session.legacy){
      const l=session.legacy,li=accepted.indexOf(l.top),hi_=accepted.indexOf(l.bot);
      if(!old||li<0||hi_<0||li>=hi_||!Number.isInteger(l.steps)||l.steps<0||l.steps>14||typeof l.done!=='boolean'||typeof l.lost!=='boolean'||(!l.done&&!(li<idx&&idx<hi_)))reject();
      lo=li;hi=hi_;steps=l.steps;ts=!!l.ts;bs=!!l.bs;gaveUp=!!l.g;dirs=typeof l.dr==='string'&&/^[duw]*$/.test(l.dr)?l.dr.split(''):[];v.done=l.done;v.win=l.done&&!l.lost;
    }
    for(const m of moves){if(v.done)reject();if(m==='giveup'){v.done=true;gaveUp=true;continue;}if(typeof m!=='string')reject();const i=accepted.indexOf(lower(m));if(i<0||i<=lo||i>=hi)reject();steps++;if(i===idx){v.win=true;v.done=true;dirs.push('w');}else{if(i<idx){lo=i;ts=true;dirs.push('d');}else{hi=i;bs=true;dirs.push('u');}if(steps===14)v.done=true;}}
    return {...v,lo,hi,top:accepted[lo],bottom:accepted[hi],topSet:ts,botSet:bs,steps,dirs,gaveUp,topPct:ts?(Math.abs(idx-lo)/(N-1)*100).toFixed(1):null,botPct:bs?(Math.abs(hi-idx)/(N-1)*100).toFixed(1):null,fraction:ts||bs?(idx-lo)/(hi-lo):null,...(v.done?{answer:accepted[idx]}:{})};
  }
  if(game==='sehirle'){
    const names=data.sehirle.names;let i=(old?hash('iller-globle-'+date):privateSeed)%names.length;
    if(mode==='practice'&&session.exclude&&names.includes(session.exclude)){const choices=names.filter(n=>n!==session.exclude);i=names.indexOf(choices[privateSeed%choices.length]);}
    const guesses=[],evaluations=[];let gaveUp=false;
    for(const m of moves){if(v.done)reject();if(m==='giveup'){v.done=true;gaveUp=true;continue;}const j=data.sehirle.names.indexOf(m);if(j<0||guesses.includes(m))reject();guesses.push(m);evaluations.push({name:m,...data.sehirle.matrix[i][j]});v.win=i===j;v.done=v.win||guesses.length>=12;}
    return {...v,guesses,evaluations,gaveUp,...(v.done?{answer:data.sehirle.names[i]}:{})};
  }
  if(game==='kesme'){
    const catalog=data.kesme,modern=!Array.isArray(catalog),dailyNew=modern&&date>=catalog.start;
    const pool=modern?(mode==='practice'?catalog.practice:dailyNew?catalog.daily:catalog.legacy):catalog;
    const index=(mode==='practice'?privateSeed:dailyNew?d-day(catalog.start):hash(date))%pool.length,shape=pool[index],polygon=sekleSigdir(shape,1,.185);let result=null;
    for(const m of moves){if(v.done||!Array.isArray(m)||m.length!==4||!m.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1))reject();const a=m.slice(0,2),b=m.slice(2);if(!validSegmentCut(polygon,a,b))reject();const N=[-(b[1]-a[1]),b[0]-a[0]],total=sekilAlani(polygon),L=kesilmisAlan(polygon,a,N),pct=Math.min(L,Math.max(0,total-L))/total*100,minor=Math.max(0,Math.min(50,Math.round(pct+1e-9)));v.win=minor>=45;v.done=true;result={minPct:pct,minor,major:100-minor,cut:m};}
    return {...v,shape,shapeIndex:index,result};
  }
  throw new Error('INVALID_GAME');
}
