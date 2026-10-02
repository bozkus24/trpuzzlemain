const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function env(extra={}){const ctx={window:{},...extra};vm.createContext(ctx);vm.runInContext(read('trpuzzlemain/assets/game-security.js'),ctx);ctx.TrPuzzleSecurity=ctx.window.TrPuzzleSecurity;return ctx;}
const probe='<img src=x onerror="window.securityProbe=true">';
test('Kayıt doğrulama HTML, negatif, taşmış ve yanlış türde sayıları reddeder; geçerli değerleri korur',()=>{
 const c=env(),s=c.TrPuzzleSecurity;
 for(const bad of [probe,-1,Infinity,NaN,Number.MAX_SAFE_INTEGER+1,'5',{},null])assert.equal(s.count(bad),0);
 assert.equal(s.count(12),12);
 assert.equal(JSON.stringify(s.stats({played:probe,dist:{1:probe,2:3}},['played'],[1,2])),JSON.stringify({played:0,dist:{1:0,2:3}}));
 assert.ok(!s.escape(probe).includes('<img'));
});
test('Harfle: kötü veya bozuk istatistik HTML çalıştırabilecek çıktıya ulaşmaz',()=>{
 const html=read('harfle/game.js'),nodes={};const element=()=>({innerHTML:'',children:[],appendChild(n){this.children.push(n)}});
 const c=env({store:{get:()=>({played:probe,dist:{1:probe,2:4}})},modalG:null,document:{getElementById:id=>nodes[id]||(nodes[id]=element()),createElement:element}});
 const source=html.slice(html.indexOf('function getStats(){'),html.indexOf('function updateStats('))+html.slice(html.indexOf('function renderStats(){'),html.indexOf('/* ---------- küçük ön-popup'));
 vm.runInContext(source+'renderStats()',c);assert.ok(!nodes.dist.children.some(n=>n.innerHTML.includes(probe)));assert.equal(nodes['st-played'].textContent,0);assert.ok(nodes.dist.children[1].innerHTML.includes('>4</div>'));
 for(const value of [null,[],{played:1},'broken']){c.store.get=()=>value;assert.doesNotThrow(()=>vm.runInContext('renderStats()',c));}
});
test('Tilkile: HTML çıktısı metin olarak kaçırılır, doğru sayılar korunur',()=>{
 const s=read('trpuzzle6/game.js'),c=env();vm.runInContext(s.slice(s.indexOf('  function statsSummaryHTML(s)'),s.indexOf('  // Galibiyet kaydı:')),c);
 const html=c.statsSummaryHTML({played:probe,wins:0,currentStreak:7,maxStreak:9});assert.ok(!html.includes(probe));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('>7</div>'));
});
test('Tilkile: geçerli eski kayıt yüklenir, bozuk sıra ve harfler reddedilir',()=>{
 const s=read('trpuzzle6/game.js'),c=env({WORDS:['KALEM','KİTAP'],ALPHABET:new Set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'),MAX_WRONG:8,localStorage:{getItem:()=>JSON.stringify(record)}});
 let record={order:[1,0],ptr:1,words:['KALEM'],guessed:['A'],absent:[],wrong:0,status:'playing',seed:-123};vm.runInContext(s.slice(s.indexOf('  function loadSaved(key)'),s.indexOf('  // ---- İstatistik')),c);
 assert.ok(c.loadSaved('foximax-daily-1'));record={...record,guessed:[probe]};assert.equal(c.loadSaved('foximax-daily-1'),null);
});
test('Sekiz oyunun normal gömülü scriptleri sözdizimi hatası içermiyor',()=>{
 for(const repo of ['harfle','word500turkce','trpuzzle4','arala','trpuzzle6','trpuzzle3','trpuzzle1','trpuzzle2']){
  const html=read(repo+'/index.html');assert.ok(html.includes('window.TrPuzzleSecurity ='),repo);
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/application\/ld\+json|type="module"/.test(m[1]))new vm.Script(m[2],{filename:repo});
 }
});
test('Yayın kaynakları debug cevap ve sıfırlama kısayolları içermez',()=>{
 assert.ok(!read('arala/index.html').includes('window.__aradle'));
 assert.ok(!read('trpuzzle2/index.html').includes('devReset'));
 assert.ok(!read('trpuzzle1/index.html').includes('BAGLANTILAR_ONIZLEME'));
});
test('Kesme: eski geçerli skor korunur, metin etiketleri skordan yeniden üretilir, bozuk kesim reddedilir',()=>{
 const s=read('trpuzzle2/index.html');let record={minPct:49.8,minor:50,major:50,label:probe,win:true,date:'2026-10-02',mode:'daily',cut:[0,0,1,1]};
 const c=env({localStorage:{getItem:()=>JSON.stringify(record)},POOL:[{}],todayUTC:()=>'2026-10-02'});
 const score=s.slice(s.indexOf('const WIN_LABELS='),s.indexOf('async function finalize('));
 const load=s.slice(s.indexOf('function readCutRecord('),s.indexOf('function loadDaily('));vm.runInContext(score+load,c);
 const normal=c.readCutRecord('test');assert.equal(normal.minor,50);assert.equal(normal.win,true);assert.ok(!normal.label.includes(probe));assert.equal(normal.minPct,49.8);
 record={pl:49,pr:51,cut:[0,0,1,1]};assert.equal(c.readCutRecord('test').minor,49);
 record={...record,cut:'bad'};assert.equal(c.readCutRecord('test'),null);
});
