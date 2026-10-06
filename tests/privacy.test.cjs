const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),KEY='trpuzzle.consent.v2';
const head=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/<!-- trpuzzle-consent-start -->[\s\S]*?<!-- trpuzzle-consent-end -->/)[0];
const fixture=`<!doctype html><html lang="tr"><head><meta charset="utf-8">${head}</head><body>
<main><h1>Rıza doğrulaması</h1><button id="outside">Oyun</button></main>
<footer><nav><a href="/cerez-politikasi.html" data-privacy-preferences>Çerez Ayarları</a></nav></footer>
<script>document.addEventListener('keydown',()=>window.gameKeys=(window.gameKeys||0)+1)</script>
<script type="text/plain" data-tp-consent="analytics">window.analyticsRuns=(window.analyticsRuns||0)+1</script>
<script type="text/plain" data-tp-consent="functionality">window.functionalRuns=(window.functionalRuns||0)+1</script>
</body></html>`;
let server,browser,base;
before(async()=>{
 server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name.startsWith('/assets/')){
   const file=path.join(ROOT,name);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));
  }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
const record=(categories={},extras={})=>({version:2,policy:'2026-10-06',at:Date.now()-1000,expires:Date.now()+86400000,categories:{necessary:true,advertising:false,analytics:false,functionality:false,...categories},...extras});
async function setup(t,{saved,blocked=false,configured=false,pathname='/',viewport}={}){
 const context=await browser.newContext({viewport:viewport||{width:1280,height:900}});t.after(()=>context.close());
 const requests=[],errors=[];
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(base)){
   if(configured && url.includes('/assets/consent-config.js'))return route.fulfill({contentType:'text/javascript',body:`window.TrPuzzleConsentConfig={publisherId:'ca-pub-7993571496408496',googleCmpScript:'https://fundingchoicesmessages.google.com/i/pub-7993571496408496?ers=1',analyticsId:''};`});
   return route.continue();
  }
  requests.push(url);
  if(url.includes('fundingchoicesmessages'))return route.fulfill({contentType:'text/javascript',body:`window.__tcfapi=(cmd,v,fn)=>{window.notifyConsent=fn;fn({cmpStatus:'loading',cmpId:300},true)};window.googlefc.callbackQueue.forEach(x=>x.CONSENT_API_READY?.());`});
  if(url.includes('adsbygoogle.js'))return route.fulfill({contentType:'text/javascript',body:'window.adRuns=(window.adRuns||0)+1;'});
  return route.abort();
 });
 if(saved!==undefined || blocked)await context.addInitScript(({saved,blocked,key})=>{
  // Seed once per tab; a reload must observe the choice made by the test.
  if(!sessionStorage.getItem('seeded')){if(saved!==undefined)localStorage.setItem(key,JSON.stringify(saved));sessionStorage.setItem('seeded','1');}
  if(blocked){for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('Blocked','SecurityError')};}
 },{saved,blocked,key:KEY});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+pathname);
 await page.waitForFunction(()=>window.TrPuzzlePrivacy);
 t.after(()=>assert.deepEqual(errors,[]));
 return {page,context,requests,ads:()=>requests.filter(x=>x.includes('adsbygoogle.js')),status:()=>page.evaluate(()=>TrPuzzlePrivacy.getStatus()),click:action=>page.locator('.tp-consent-banner [data-action="'+action+'"]').click()};
}
const grant={cmpStatus:'loaded',cmpId:300,gdprApplies:true,eventStatus:'useractioncomplete',tcString:'test-only-cmp-record',vendor:{consents:{755:true},legitimateInterests:{755:true},disclosedVendors:{755:true}},purpose:{consents:{1:true,3:true,4:true},legitimateInterests:{2:true,7:true,9:true,10:true}}};
async function notify(e,data){await e.page.waitForFunction(()=>typeof window.notifyConsent==='function');await e.page.evaluate(data=>window.notifyConsent(data,true),data);}

test('first paint defaults denied before scripts; no optional requests or code runs',async t=>{
 const e=await setup(t);const defaults=await e.page.evaluate(()=>Array.from(dataLayer[0]));
 assert.equal(defaults[0],'consent');assert.equal(defaults[1],'default');
 for(const key of ['ad_storage','ad_user_data','ad_personalization','analytics_storage'])assert.equal(defaults[2][key],'denied');
 assert.deepEqual(e.requests,[]);assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),true);
 assert.equal(await e.page.evaluate(()=>window.analyticsRuns||window.functionalRuns||0),0);
 const styles=await e.page.locator('.tp-consent-banner button').evaluateAll(buttons=>buttons.map(b=>{const s=getComputedStyle(b);return [s.color,s.backgroundColor,s.fontSize,b.getBoundingClientRect().height,b.getBoundingClientRect().width]}));
 assert.deepEqual(styles[0],styles[1]);assert.deepEqual(styles[1],styles[2]);
});
test('reject persists across reload and other pages without touching game progress',async t=>{
 const e=await setup(t);await e.page.evaluate(()=>localStorage.setItem('baglantilar.2026-10-03.gunluk.1','keep'));
 await e.click('reject');await e.page.reload();await e.page.goto(base+'/bagla/');
 assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),false);assert.deepEqual(e.requests,[]);
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('baglantilar.2026-10-03.gunluk.1')),'keep');
 await e.page.locator('[data-privacy-preferences]').click();assert.equal(await e.page.locator('dialog').isVisible(),true);
});
test('manage offers independent choices; Escape and close do not imply consent',async t=>{
 const e=await setup(t);await e.click('manage');
 assert.equal(await e.page.locator('input:disabled').isChecked(),true);
 for(const category of ['advertising','analytics','functionality'])assert.equal(await e.page.locator(`[data-category="${category}"]`).isChecked(),false);
 await e.page.keyboard.press('Escape');assert.equal(await e.page.locator('dialog').isVisible(),false);
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('trpuzzle.consent.v2')),null);
 await e.click('manage');await e.page.locator('[data-category="analytics"]').check();await e.page.locator('[data-action="save"]').click();
 assert.equal((await e.status()).effective.analytics,true);assert.equal((await e.status()).effective.advertising,false);
 assert.equal(await e.page.evaluate(()=>window.analyticsRuns),1);assert.equal(await e.page.evaluate(()=>window.functionalRuns||0),0);assert.deepEqual(e.requests,[]);
});
test('functionality writes only with consent, revocation preserves game schemas',async t=>{
 const e=await setup(t);await e.page.evaluate(()=>{TrPuzzlePreferences.setItem('kesme-theme','dark');localStorage.setItem('kesme2-stats','keep');});
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('kesme-theme')),null);
 assert.equal(await e.page.evaluate(()=>TrPuzzlePreferences.getItem('kesme-theme')),'dark');
 await e.click('manage');await e.page.locator('[data-category="functionality"]').check();await e.page.locator('[data-action="save"]').click();
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('kesme-theme')),'dark');
 await e.page.locator('[data-privacy-preferences]').click();await e.page.locator('dialog [data-action="reject"]').click();
 await e.page.waitForLoadState('load');await e.page.waitForFunction(()=>window.TrPuzzlePrivacy && !TrPuzzlePrivacy.getStatus().categories.functionality);
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('kesme-theme')),null);
 assert.equal(await e.page.evaluate(()=>localStorage.getItem('kesme2-stats')),'keep');
});
test('local accept never substitutes for an unconfigured certified CMP',async t=>{
 const e=await setup(t);await e.click('accept');assert.deepEqual(e.requests,[]);
 assert.equal((await e.status()).categories.advertising,true);assert.equal((await e.status()).effective.advertising,false);assert.equal((await e.status()).cmpStatus,'unconfigured');
});
test('valid CMP grant loads once; denial, missing disclosure and publisher restrictions keep ads blocked',async t=>{
 const e=await setup(t,{configured:true});await e.click('accept');
 for(const data of [
  {cmpStatus:'loaded',cmpId:300,gdprApplies:true,eventStatus:'tcloaded'},
  {...grant,cmpId:999},
  {...grant,eventStatus:'cmpuishown'},
  {...grant,gdprApplies:undefined},
  {...grant,vendor:{...grant.vendor,consents:{755:false}}},
  {...grant,vendor:{...grant.vendor,disclosedVendors:{}}},
  {...grant,publisher:{restrictions:{3:{755:0}}}},
  {...grant,publisher:{restrictions:{3:{755:2}}}},
  {...grant,purpose:{...grant.purpose,consents:{1:true,3:false,4:true}}}
 ]){await notify(e,data);assert.equal(e.ads().length,0);}
 await notify(e,grant);await e.page.waitForFunction(()=>window.adRuns===1);
 await notify(e,grant);assert.equal(e.ads().length,1);
 assert.equal((await e.status()).effective.advertising,true);
 await e.page.locator('[data-privacy-preferences]').click();await e.page.locator('dialog [data-action="reject"]').click();
 await e.page.waitForFunction(()=>window.TrPuzzlePrivacy && !TrPuzzlePrivacy.getStatus().categories.advertising);
 assert.equal(await e.page.evaluate(()=>document.getElementById('tp-consented-ads')),null);
 assert.equal(e.ads().length,1);
});
test('saved acceptance still waits for current CMP; non-GDPR response can enable ads',async t=>{
 const e=await setup(t,{saved:record({advertising:true}),configured:true});assert.equal(e.ads().length,0);
 await notify(e,{cmpId:300,gdprApplies:false});await e.page.waitForFunction(()=>window.adRuns===1);assert.equal(e.ads().length,1);
});
test('invalid version, expired/future record and blocked storage fail closed',async t=>{
 for(const saved of [record({}, {version:1}),record({advertising:true},{expires:1}),record({advertising:true},{at:Date.now()+86400000}),record({advertising:'true'}),record({}, {policy:'old'})]){
  const e=await setup(t,{saved});assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),true);assert.deepEqual(e.requests,[]);
 }
 const e=await setup(t,{blocked:true});await e.click('reject');assert.equal((await e.status()).effective.advertising,false);assert.deepEqual(e.requests,[]);
 await e.page.reload();assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),true);
});
test('expiry in an open tab resets choices and redisplays the banner',async t=>{
 const e=await setup(t,{saved:record({functionality:true},{expires:Date.now()+800})});
 await e.page.waitForFunction(()=>window.TrPuzzlePrivacy && !TrPuzzlePrivacy.getStatus().categories.functionality);
 assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),true);
});
test('cross-tab withdrawal stops active ads without reloading them',async t=>{
 const e=await setup(t,{saved:record({advertising:true}),configured:true});await notify(e,grant);await e.page.waitForFunction(()=>window.adRuns===1);
 const second=await e.context.newPage();await second.goto(base+'/other');await second.waitForFunction(()=>window.TrPuzzlePrivacy);
 await second.locator('[data-privacy-preferences]').click();await second.locator('dialog [data-action="reject"]').click();
 await e.page.waitForFunction(()=>window.TrPuzzlePrivacy && !TrPuzzlePrivacy.getStatus().categories.advertising);
 assert.equal(e.ads().length,1);assert.equal(await e.page.locator('#tp-consented-ads').count(),0);
});
test('policy pages never load advertising or analytics, even after acceptance',async t=>{
 for(const pathname of ['/gizlilik.html','/cerez-politikasi.html','/kosullar.html','/hakkinda.html','/iletisim.html','/404.html']){
  const e=await setup(t,{pathname,configured:true,saved:record({advertising:true,analytics:true})});
  assert.deepEqual(e.requests,[]);assert.equal((await e.status()).effective.analytics,false);
 }
});
test('320px dialog is scrollable, keyboard-contained and returns focus on Escape',async t=>{
 const e=await setup(t,{viewport:{width:320,height:568}});await e.click('manage');
 const box=await e.page.locator('dialog').boundingBox();assert(box.x>=0 && box.x+box.width<=320 && box.height<=568);
 await e.page.keyboard.press('Tab');assert.equal(await e.page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true);
 await e.page.keyboard.press('Escape');assert.equal(await e.page.evaluate(()=>window.gameKeys||0),0);
 assert.equal(await e.page.evaluate(()=>document.activeElement.dataset.action),'manage');
 assert.equal(await e.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});

test('write failure while withdrawing cannot resurrect a saved grant after reload',async t=>{
 const e=await setup(t,{saved:record({advertising:true}),configured:true});await notify(e,grant);await e.page.waitForFunction(()=>window.adRuns===1);
 await e.page.evaluate(()=>{
  Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')};
  Storage.prototype.removeItem=function(){throw new DOMException('Blocked','SecurityError')};
 });
 await e.page.locator('[data-privacy-preferences]').click();await e.page.locator('dialog [data-action="reject"]').click();
 await e.page.waitForURL('**tp-consent-reset=1');await e.page.waitForFunction(()=>window.TrPuzzlePrivacy);
 assert.equal((await e.status()).effective.advertising,false);assert.equal(e.ads().length,1);
 // Once storage works again, a new explicit choice clears the recovery marker.
 await e.click('reject');assert.equal(new URL(e.page.url()).searchParams.has('tp-consent-reset'),false);
});

test('BFCache restoration rechecks a removed record instead of replaying an old grant',async t=>{
 const e=await setup(t,{saved:record({advertising:true}),configured:true});await notify(e,grant);await e.page.waitForFunction(()=>window.adRuns===1);
 await e.page.evaluate(()=>{localStorage.removeItem('trpuzzle.consent.v2');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await e.page.waitForFunction(()=>window.TrPuzzlePrivacy && !TrPuzzlePrivacy.getStatus().categories.advertising);
 assert.equal(e.ads().length,1);assert.equal(await e.page.locator('.tp-consent-banner').isVisible(),true);
});
