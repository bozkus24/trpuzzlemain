const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/privacy-controls.js'),'utf8');
function setup(saved, blocked=false, pathname="/"){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.dataset={};}
  append(...items){this.children.push(...items);}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  querySelector(s){return this.children.find(c=>s.startsWith('.')?c.className===s.slice(1):c.dataset?.privacyPreferences!==undefined);}
  closest(){return false;}
  showModal(){this.open=true;}
  close(){this.open=false;this.events.close?.();}
  focus(){this.focused=true;}
 }
 const store=new Map(saved===undefined?[]:[['trpuzzle.privacy.v1',saved]]);
 const localStorage={getItem:k=>{if(blocked)throw Error();return store.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error();store.set(k,v);}};
 const nav=new Element('nav');let reloads=0;
 const document={readyState:'complete',head:new Element('head'),body:new Element('body'),activeElement:new Element('button'),createElement:t=>new Element(t),createTextNode:text=>({textContent:text}),querySelectorAll:s=>s==='footer nav'?[nav]:[]};
 const window={location:{pathname,reload(){reloads++;}},events:{},addEventListener(k,fn){this.events[k]=fn;}};
 const timers=[]; const context=vm.createContext({window,document,localStorage,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}});vm.runInContext(source,context);
 return {window,document,store,nav,context,timers,dialog:()=>document.body.children[0],click:text=>document.body.children[0].children.find(c=>c.textContent===text).events.click(),ads:()=>document.head.children.filter(c=>c.id==='tp-consented-ads'),reloads:()=>reloads};
}
const record=choice=>JSON.stringify({version:1,choice,at:Date.now()});
test('first visit asks and never loads advertising before a choice',()=>{const e=setup();assert.equal(e.dialog().open,true);assert.equal(e.ads().length,0);e.dialog().close();assert.equal(e.ads().length,0);});
test('reject persists without touching games or loading advertising',()=>{const e=setup();e.store.set('game-progress','keep');e.click('Reddet');assert.equal(e.ads().length,0);assert.equal(JSON.parse(e.store.get('trpuzzle.privacy.v1')).choice,'rejected');assert.equal(e.store.get('game-progress'),'keep');assert.equal(setup(record('rejected')).dialog(),undefined);});
test('accept loads exactly one ad tag; returning users retain their choice',()=>{const e=setup();e.click('Kabul et');assert.equal(e.ads().length,1);e.window.TrPuzzlePrivacy.open();e.click('Kabul et');assert.equal(e.ads().length,1);assert.equal(setup(record('accepted')).ads().length,1);});
test('withdrawal persists rejection and reloads to stop active ad scripts',()=>{const e=setup(record('accepted'));e.window.TrPuzzlePrivacy.open();e.click('Reddet');assert.equal(e.reloads(),1);assert.equal(JSON.parse(e.store.get('trpuzzle.privacy.v1')).choice,'rejected');});
test('invalid, stale, future, or unavailable storage never grants consent',()=>{for(const s of ['bad','null',JSON.stringify({version:1,choice:'accepted',at:1}),JSON.stringify({version:1,choice:'accepted',at:Date.now()+86400000})]){const e=setup(s);assert.equal(e.ads().length,0);assert.equal(e.dialog().open,true);}const e=setup(undefined,true);e.click('Reddet');assert.equal(e.ads().length,0);});
test('local acceptance does not fabricate Google consent; readiness is asynchronous',()=>{
 const e=setup(record('accepted'));
 assert.equal(e.window.TrPuzzlePrivacy.getStatus().googleState,'loading');
 assert.equal(e.window.TrPuzzlePrivacy.getStatus().gdprApplies,null);
 let notify;e.window.__tcfapi=(cmd,version,fn)=>{assert.equal(cmd,'addEventListener');assert.equal(version,2);notify=fn;};
 e.window.googlefc.callbackQueue[0].CONSENT_API_READY();
 notify({cmpStatus:'loaded',gdprApplies:true,eventStatus:'cmpuishown'},true);
 assert.equal(e.window.TrPuzzlePrivacy.getStatus().googleState,'ready');
 notify({cmpStatus:'loaded',gdprApplies:true,eventStatus:'useractioncomplete',purpose:{consents:{}}},true);
 assert.equal(e.window.TrPuzzlePrivacy.getStatus().googleState,'decision');
 assert.equal(JSON.parse(e.store.get('trpuzzle.privacy.v1')).choice,'accepted');
 e.window.TrPuzzlePrivacy.open();
 let calls=0;e.window.googlefc.showRevocationMessage=()=>calls++;
 e.window.googlefc.callbackQueue={push:o=>o.CONSENT_API_READY()};
 e.click('Google izin seçenekleri');assert.equal(calls,1);assert.equal(e.dialog().open,false);
});
test('CMP failure is not consent and a late CMP can recover',()=>{
 const e=setup(record('accepted'));e.timers[0]();assert.equal(e.window.TrPuzzlePrivacy.getStatus().googleState,'unavailable');
 e.window.__tcfapi=(cmd,v,fn)=>fn({cmpStatus:'loaded',gdprApplies:false,eventStatus:'tcloaded'},true);
 e.window.googlefc.callbackQueue[0].CONSENT_API_READY();
 assert.equal(e.window.TrPuzzlePrivacy.getStatus().gdprApplies,false);
 e.window.TrPuzzlePrivacy.open();assert.equal(e.dialog().querySelector('.tp-google-preferences').hidden,true);
});
test('disclosure pages stay readable without Google tags or automatic modals',()=>{
 for(const path of ['/gizlilik','/gizlilik.html','/kosullar.html']){
  const e=setup(record('accepted'),false,path);assert.equal(e.ads().length,0);assert.equal(e.dialog(),undefined);
 }
 const e=setup(undefined,false,'/gizlilik');assert.equal(e.dialog(),undefined);
});
test('cross-tab withdrawal reloads and duplicate loader is harmless',()=>{const e=setup();vm.runInContext(source,e.context);assert.equal(e.nav.children.length,1);e.window.events.storage({key:'trpuzzle.privacy.v1'});assert.equal(e.reloads(),1);});
