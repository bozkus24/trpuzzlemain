import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {serverKey,decryptCatalog} from '../server/crypto.mjs';
import {createService} from '../server/service.mjs';
import {shuffle} from '../server/engines.mjs';
let keyHex=process.env.TRPUZZLE_SERVER_KEY;
if(!keyHex&&fs.existsSync(new URL('../.env',import.meta.url)))keyHex=fs.readFileSync(new URL('../.env',import.meta.url),'utf8').match(/^TRPUZZLE_SERVER_KEY=(.*)$/m)?.[1];
const key=keyHex?serverKey(keyHex):null,data=key?decryptCatalog(fs.readFileSync(new URL('../server/catalog.enc',import.meta.url)),key):null;
const local=(name,fn)=>test(name,{skip:!key},fn);
local('Encrypted production catalog: 16 Bağla puzzles, four distinct groups of four',()=>{
 assert.equal(data.bagla.length,16);for(const p of data.bagla){assert.equal(p.gruplar.length,4);assert.equal(new Set(p.gruplar.flatMap(g=>g.kelimeler)).size,16);for(const g of p.gruplar){assert.equal(g.kelimeler.length,4);assert.ok(g.tema.trim());assert.ok(g.kelimeler.every(w=>w===w.toLocaleUpperCase('tr')));}}
});
local('All 8 real catalogs start and resume without plaintext hidden answers',()=>{
 const svc=createService({data,key,cutover:'2026-10-03',clock:()=>new Date('2026-10-03T12:00:00Z')});
 for(const game of ['harfle','harf500','baklava','bagla','kesme','tilkile','arala','sehirle']){const r=svc({action:'start',game});assert.equal('answer' in r.view,false,game);assert.equal('solution' in r.view,false,game);assert.deepEqual(svc({action:'resume',token:r.token}).view,r.view);}
});
local('Harfle archive and all Harf500 level archives retain historical daily words',()=>{
 const svc=createService({data,key,cutover:'2026-10-03',clock:()=>new Date('2026-10-03T12:00:00Z')});
 const perm=shuffle(data.harfle.answers,20260101);
 for(const n of [61,62]){const date=new Date(Date.UTC(2026,7,1)+n*864e5).toISOString().slice(0,10);for(const game of ['harfle','harf500'])for(const level of game==='harfle'?['standart']:['kolay','standart','zor']){let r=svc({action:'start',game,date,mode:'archive',level});const answer=(game==='harfle'?perm[n%perm.length]:data.harf500.pools[level][n%data.harf500.pools[level].length]).toLocaleUpperCase('tr');r=svc({action:'move',token:r.token,move:answer});assert.equal(r.view.win,true,game+' '+level+' '+date);}}
});
local('Baklava legacy midgame board and Arala legacy interval survive the migration',()=>{
 const svc=createService({data,key,cutover:'2026-10-03',clock:()=>new Date('2026-10-03T12:00:00Z')});
 const date='2026-10-02';let b=svc({action:'start',game:'baklava',date,mode:'archive'});const p=[];for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(!(r%2&&c%2))p.push([r,c]);
 let pair;for(let i=0;i<p.length&&!pair;i++)for(let j=i+1;j<p.length;j++){const [r,c]=p[i],[rr,cc]=p[j];if(b.view.ranks[r][c]!==2&&b.view.ranks[rr][cc]!==2&&b.view.grid[r][c]!==b.view.grid[rr][cc]){pair=[i,j];break;}}
 b=svc({action:'move',token:b.token,move:pair});const migrated=svc({action:'start',game:'baklava',date,mode:'archive',legacyState:{letters:p.map(([r,c])=>b.view.grid[r][c]),swapsLeft:b.view.swapsLeft,phase:'play'}});assert.deepEqual(migrated.view.grid,b.view.grid);assert.equal(migrated.view.swapsLeft,14);
 let a=svc({action:'start',game:'arala',date,mode:'archive'});assert.equal(a.view.fraction,null);a=svc({action:'move',token:a.token,move:'KALEM'});const legacy={top:a.view.top,bot:a.view.bottom,ts:a.view.topSet,bs:a.view.botSet,steps:a.view.steps,done:a.view.done,lost:a.view.done&&!a.view.win,g:false,dr:a.view.dirs.join('')};const resumed=svc({action:'start',game:'arala',date,mode:'archive',legacyState:legacy});assert.equal(resumed.view.lo,a.view.lo);assert.equal(resumed.view.hi,a.view.hi);assert.equal(resumed.view.steps,1);
});
local('Kesme merge preserves 500 daily/300 practice silhouettes and their hole-aware scores',()=>{
 const k=data.kesme;assert.equal(k.daily.length,500);assert.equal(k.practice.length,300);
 assert.equal(new Set([...k.daily,...k.practice].map(s=>s.id)).size,800);
 const svc=createService({data,key,cutover:'2026-10-03',clock:()=>new Date('2028-03-01T12:00:00Z')});
 assert.throws(()=>svc({action:'start',game:'kesme',mode:'archive',date:'2026-09-30'}),/PUZZLE_UNAVAILABLE/);
 for(let i=0;i<500;i++){
  const date=new Date(Date.UTC(2026,9,2)+i*864e5).toISOString().slice(0,10);
  const r=svc({action:'start',game:'kesme',mode:'archive',date});assert.equal(r.view.shape.id,k.daily[i].id);
 }
 for(let i=0;i<20;i++){const r=svc({action:'start',game:'kesme',mode:'practice'});assert.ok(k.practice.some(s=>s.id===r.view.shape.id));}
});

local('All archive boundaries start October 1 except Bağla October 3',()=>{
 const svc=createService({data,key,cutover:'2026-10-03',clock:()=>new Date('2026-10-03T12:00:00Z')});
 for(const game of ['harfle','harf500','baklava','kesme','tilkile','arala','sehirle']){
  assert.throws(()=>svc({action:'start',game,mode:'archive',date:'2026-09-30'}),/PUZZLE_UNAVAILABLE/);
  assert.equal(svc({action:'start',game,mode:'archive',date:'2026-10-01'}).view.date,'2026-10-01');
 }
 assert.throws(()=>svc({action:'start',game:'bagla',mode:'archive',date:'2026-10-02'}),/PUZZLE_UNAVAILABLE/);
 assert.equal(svc({action:'start',game:'bagla',mode:'archive',date:'2026-10-03'}).view.date,'2026-10-03');
});
