import {randomUUID} from 'node:crypto';
import {seal,unseal} from './crypto.mjs';
import {GAMES,play} from './engines.mjs';
const limits={harfle:6,harf500:8,tilkile:29,bagla:8,baklava:60,arala:15,sehirle:13,kesme:1};
const dateKey=d=>new Date(d.getTime()+10800000).toISOString().slice(0,10);
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
function ensure(condition,code='INVALID_REQUEST'){if(!condition)throw new Error(code);}
export function createService({data,key,cutover,clock=()=>new Date()}){
  ensure(validDate(cutover),'SERVER_NOT_CONFIGURED');
  function validateSession(s){
    ensure(s&&s.v===1&&GAMES.includes(s.game)&&['daily','archive','practice'].includes(s.mode)&&validDate(s.date),'INVALID_SESSION');
    ensure(s.date>=(s.game==='bagla'?'2026-10-03':s.game==='kesme'?'2026-10-01':'2026-08-01')&&s.date<=dateKey(clock()),'PUZZLE_UNAVAILABLE');
    ensure(Array.isArray(s.moves)&&s.moves.length<=limits[s.game],'INVALID_SESSION');
    ensure(s.game!=='harf500'||['kolay','standart','zor'].includes(s.level),'INVALID_SESSION');
    ensure(s.cutover===cutover,'INVALID_SESSION');
  }
  return function handle(body){
    ensure(body&&typeof body==='object'&&!Array.isArray(body));
    let session;
    if(body.action==='start'){
      ensure(GAMES.includes(body.game));const mode=body.mode||'daily',date=body.date||dateKey(clock());
      ensure(['daily','archive','practice'].includes(mode));
      ensure(mode!=='practice'||['harf500','sehirle','kesme'].includes(body.game));
      ensure(mode!=='daily'||date===dateKey(clock()));
      session={v:1,id:randomUUID(),game:body.game,date,mode,level:body.game==='harf500'?(body.level||'standart'):null,cutover,moves:[]};
      if(body.game==='sehirle'&&mode==='practice'&&body.exclude!==undefined){ensure(typeof body.exclude==='string'&&data.sehirle.names.includes(body.exclude));session.exclude=body.exclude;}
      validateSession(session);
      // Legacy guesses can be replayed only for dates using the old schedule.
      if(body.legacyMoves!==undefined){ensure(date<cutover&&Array.isArray(body.legacyMoves)&&body.legacyMoves.length<=limits[body.game]);session.moves=body.legacyMoves;}
      if(body.legacyState!==undefined){ensure(date<cutover&&['baklava','arala'].includes(body.game)&&body.legacyState&&typeof body.legacyState==='object'&&!Array.isArray(body.legacyState));const fields=body.game==='baklava'?['letters','swapsLeft','phase']:['top','bot','steps','done','lost','ts','bs','g','dr'];session.legacy=Object.fromEntries(fields.filter(k=>Object.hasOwn(body.legacyState,k)).map(k=>[k,body.legacyState[k]]));}
    }else if(body.action==='resume'||body.action==='move'){
      session=unseal(body.token,key);validateSession(session);
      if(body.action==='move'){
        ensure(session.moves.length<limits[session.game],'GAME_FINISHED');
        ensure(!play(session,data,key,cutover).done,'GAME_FINISHED');
        ensure(body.move!==undefined);session.moves.push(body.move);
      }
    }else throw new Error('INVALID_REQUEST');
    const view={...play(session,data,key,cutover),cutover};
    return {token:seal(session,key),view};
  };
}
export async function httpHandler(request,service){
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method!=='POST')return out({error:'METHOD_NOT_ALLOWED'},405);
  const url=new URL(request.url),origin=request.headers.get('origin');
  const allowed=new Set(['https://trpuzzle.com','https://www.trpuzzle.com',...['harfle','harf500','baklava','bagla','kesme','tilkile','arala','sehirle'].map(g=>'https://trpuzzle-'+g+'.netlify.app')]);
  if(origin&&origin!==url.origin&&!allowed.has(origin))return out({error:'ORIGIN_NOT_ALLOWED'},403);
  if(request.headers.get('sec-fetch-site')==='cross-site'&&!allowed.has(origin))return out({error:'ORIGIN_NOT_ALLOWED'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return out({error:'JSON_REQUIRED'},415);
  if(Number(request.headers.get('content-length')||0)>32768)return out({error:'REQUEST_TOO_LARGE'},413);
  try{
    // Streaming bound also covers chunked bodies with no Content-Length.
    const reader=request.body?.getReader();if(!reader)return out({error:'INVALID_REQUEST'},400);
    const chunks=[];let total=0;
    for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>32768){await reader.cancel();return out({error:'REQUEST_TOO_LARGE'},413);}chunks.push(Buffer.from(value));}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return out({error:'INVALID_JSON'},400);}
    return out(service(body));
  }catch(e){const known=['INVALID_REQUEST','INVALID_SESSION','INVALID_MOVE','INVALID_GAME','PUZZLE_UNAVAILABLE','GAME_FINISHED'];return out({error:known.includes(e.message)?e.message:'SERVICE_UNAVAILABLE'},known.includes(e.message)?400:503);}
}
