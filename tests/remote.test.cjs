const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/game-remote.js'),'utf8');
function setup(){
  let now=0,id=0;const timers=new Map(),nodes=new Map(),calls=[];
  function node(){const attrs=new Map(),classes=new Set();return {hidden:false,textContent:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k)??null,removeAttribute:k=>attrs.delete(k)};}
  const document={getElementById:id=>nodes.get(id),createElement:node,head:{append:n=>nodes.set(n.id,n)},body:{append:n=>nodes.set(n.id,n)}};
  const ctx={window:{},document,AbortController,setTimeout:(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id;},clearTimeout:id=>timers.delete(id),fetch:(url,options)=>new Promise((resolve,reject)=>{
    const call={body:JSON.parse(options.body),signal:options.signal,resolve:result=>resolve({ok:true,status:200,json:async()=>result}),reject};calls.push(call);
    options.signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e);});
  })};
  vm.runInNewContext(source,ctx);
  return {api:ctx.window.TrPuzzleRemote,calls,nodes,target:node(),session:{token:'original',view:{attempts:0}},tick(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}};
}
const result={token:'next',view:{attempts:1}};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('Yazılan kelimeyi hazırlamak tahmini veya kaydı değiştirmez; GİR hazır yanıtı kullanır',async()=>{
  const e=setup();e.api.prepare(e.session,'KALEM');e.tick(100);assert.equal(e.calls.length,1);
  e.calls[0].resolve(result);await flush();assert.equal(e.session.token,'original');assert.equal(e.session.view.attempts,0);
  const view=await e.api.move(e.session,'KALEM',e.target);assert.equal(view.attempts,1);assert.equal(e.calls.length,1);assert.equal(e.session.token,'next');assert.equal(e.target.getAttribute('aria-busy'),null);
});
test('Hızlı GİR aynı devam eden isteği kullanır; çift gönderim bir tahmin sayılır',async()=>{
  const e=setup();e.api.prepare(e.session,'KALEM');const p=e.api.move(e.session,'KALEM',e.target);
  assert.equal(e.calls.length,1);assert.equal(e.target.getAttribute('aria-busy'),'true');
  await assert.rejects(e.api.move(e.session,'KALEM'),/Önceki hamle/);
  e.tick(200);assert.equal(e.nodes.get('tp-move-status').hidden,false);
  e.calls[0].resolve(result);await p;e.tick(1000);assert.equal(e.calls.length,1);assert.equal(e.nodes.get('tp-move-status').hidden,true);assert.equal(e.target.classList.contains('tp-move-pending'),false);
});
test('Silinen veya değiştirilen taslak iptal edilir; eski cevap yeni kelimeye uygulanmaz',async()=>{
  const e=setup();e.api.prepare(e.session,'KALEM');e.tick(100);e.api.prepare(e.session,null);assert.equal(e.calls[0].signal.aborted,true);
  e.api.prepare(e.session,'KADER');e.api.prepare(e.session,'KADER');e.tick(100);assert.equal(e.calls.length,2);
  const p=e.api.move(e.session,'KADER');e.calls[1].resolve(result);await p;assert.equal(e.calls[1].body.move,'KADER');
});
test('Hazırlık hatası sonraki gönderimi engellemez; ağ hatası kaydı ve tekrar denemeyi korur',async()=>{
  const e=setup();e.api.prepare(e.session,'KALEM');e.tick(100);e.calls[0].reject(new Error('offline'));await flush();
  const p=e.api.move(e.session,'KALEM',e.target);assert.equal(e.calls.length,2);e.calls[1].reject(new Error('offline'));await assert.rejects(p,/offline/);
  assert.equal(e.session.token,'original');assert.equal(e.target.classList.contains('tp-move-pending'),false);
  const retry=e.api.move(e.session,'KALEM');e.calls[2].resolve(result);await retry;assert.equal(e.session.token,'next');
});
test('Yeni oturum veya ilerlemiş token eski hazırlıktan etkilenmez',async()=>{
  const e=setup();e.api.prepare(e.session,'KALEM');e.tick(100);e.session.token='updated';
  const p=e.api.move(e.session,'KALEM');assert.equal(e.calls[0].signal.aborted,true);assert.equal(e.calls[1].body.token,'updated');
  e.calls[1].resolve(result);await p;
  const other={token:'other',view:{attempts:0}};const q=e.api.move(other,'KADER');e.calls[2].resolve(result);await q;assert.equal(e.calls[2].body.token,'other');
});
test('Eski oturum tamamlanırken yeni oturumun bekleme göstergesi kapanmaz',async()=>{
  const e=setup(),other={token:'other',view:{attempts:0}};
  const old=e.api.move(e.session,'KALEM');const current=e.api.move(other,'KADER');e.tick(200);
  e.calls[0].resolve(result);await old;assert.equal(e.nodes.get('tp-move-status').hidden,false);
  e.calls[1].resolve(result);await current;assert.equal(e.nodes.get('tp-move-status').hidden,true);
});
