// Run only locally before removing client answer tables. Never logs plaintext data or keys.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {randomBytes,createCipheriv} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'), parent=path.dirname(root);
const read=(repo,file)=>fs.readFileSync(path.join(parent,repo,file),'utf8');
const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
function evaluate(code,expr){const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx,{timeout:10000});return vm.runInContext(expr,ctx,{timeout:10000});}
const h=read('harfle','words.js');
const harfle=evaluate(h,'({answers:ANSWERS,accepted:[...ACCEPTED]})');
const tilkile=evaluate(read('trpuzzle6','words.js'),'WORDS');
const f=scripts(read('word500turkce','index.html'));
const harf500=evaluate(f.find(s=>s.includes('var SOZLUK ='))+'\n'+f.find(s=>s.includes('var cekirdek =')),`(()=>{const v=Word500trVeri,k=Word500tr,z=v.HAVUZLAR.zor;v.HAVUZLAR.standart=z.filter(i=>new Set(v.SOZLUK[i]).size===5);v.HAVUZLAR.kolay=v.HAVUZLAR.standart.filter(i=>![...v.SOZLUK[i]].some(c=>k.KULLANILMAYAN.kolay.includes(c)));return {accepted:v.SOZLUK,pools:Object.fromEntries(k.SEVIYELER.map(l=>[l,k.karistir(v.HAVUZLAR[l],'kelime500-v1-'+l).map(i=>v.SOZLUK[i])]))}})()`);
const bagla=evaluate(scripts(read('trpuzzle1','index.html')).find(s=>s.includes('window.BaglantilarVeri =')),'BaglantilarVeri.BULMACALAR');
const b=read('trpuzzle4','index.html');
const baklava=evaluate(b.slice(b.indexOf('const PUZZLES ='),b.indexOf('const HOLES =')),'PUZZLES');
const a=read('arala','index.html');
const helpers=a.slice(a.indexOf('function cmp('),a.indexOf('function cmp(')+600);
// Alphabetic order uses the same Turkish alphabet as Arala, including dotless ı.
const alphabet='abcçdefgğhıijklmnoöprsştuüvyz';
const cmp=(a,b)=>{for(let i=0;i<5;i++){const d=alphabet.indexOf(a[i])-alphabet.indexOf(b[i]);if(d)return d;}return 0};
const parse=s=>[...new Set(s.toLocaleLowerCase('tr-TR').split(/\s+/).filter(w=>w.length===5&&[...w].every(c=>alphabet.includes(c))))].sort(cmp);
const arala={answers:parse(read('arala','cevaplar.txt')),accepted:parse(read('arala','cevaplar.txt')+'\n'+read('arala','kelimehavuzu.txt'))};
const k=read('trpuzzle2','index.html');
const rng='function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}';
const kesme=evaluate(rng+'\n'+k.slice(k.indexOf('function regular('),k.indexOf('/* ---------- geometri')),'POOL');
const {build}=await import(path.join(parent,'trpuzzle3/node_modules/esbuild/lib/main.js'));
const bundled=await build({stdin:{contents:"import {provinces} from './src/lib/provinces'; import {evaluateGuess} from './src/lib/game';export default {names:provinces.map(p=>p.name),matrix:provinces.map(t=>provinces.map(g=>{const {province,...e}=evaluateGuess(g,t);return e}))};",resolveDir:path.join(parent,'trpuzzle3')},bundle:true,platform:'node',format:'cjs',write:false});
const ctx={module:{exports:{}},console};vm.createContext(ctx);vm.runInContext(bundled.outputFiles[0].text,ctx,{timeout:120000});
const sehirle=ctx.module.exports.default;
const catalog={version:1,harfle,harf500,tilkile,bagla,baklava,arala,kesme,sehirle};
const envPath=path.join(root,'.env');
let key;
if(fs.existsSync(envPath)) key=fs.readFileSync(envPath,'utf8').match(/^TRPUZZLE_SERVER_KEY=([0-9a-f]{64})$/m)?.[1];
if(!key){key=randomBytes(32).toString('hex');fs.appendFileSync(envPath,'TRPUZZLE_SERVER_KEY='+key+'\n',{mode:0o600});}
fs.chmodSync(envPath,0o600);
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);cipher.setAAD(Buffer.from('trpuzzle-catalog-v1'));
const body=Buffer.concat([cipher.update(JSON.stringify(catalog)),cipher.final()]);
fs.writeFileSync(path.join(root,'server/catalog.enc'),Buffer.concat([iv,cipher.getAuthTag(),body]));
fs.writeFileSync(path.join(root,'.server-private/catalog.json'),JSON.stringify(catalog),{mode:0o600});
console.log('Encrypted catalog prepared for 8 games. Local key saved in ignored .env; no deployment.');
