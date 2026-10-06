/* Site tercihleri + gerçek Google CMP sinyalleri. TC String üretmez. */
(function () {
  'use strict';
  if (window.TrPuzzlePrivacy || !window.TrPuzzleConsentState) return;
  const state=window.TrPuzzleConsentState, config=window.TrPuzzleConsentConfig || {};
  const policyPage=/\/(gizlilik|cerez-politikasi|kosullar|hakkinda|iletisim|404)(\.html)?\/?$/.test(location.pathname);
  let banner,dialog,opener,status,timer,expiryTimer,cmpStarted=false,subscribed=false;
  let cmpStatus='idle',tcData=null,adLoaded=false,analyticsLoaded=false,reloading=false;
  let active={advertising:false,analytics:false,functionality:false};
  const executed=new Set();
  function purposeAllowed(data,id,consentOnly) {
    const restriction=data.publisher?.restrictions?.[id]?.[755];
    if (restriction === 0) return false;
    if (consentOnly && restriction === 2) return false;
    const consent=data.purpose?.consents?.[id] === true && data.vendor?.consents?.[755] === true;
    const interest=data.purpose?.legitimateInterests?.[id] === true && data.vendor?.legitimateInterests?.[755] === true;
    if (restriction === 1 || consentOnly) return consent;
    if (restriction === 2) return interest;
    return consent || interest;
  }
  function googleAllowsAds() {
    const d=tcData;
    if (!d || d.cmpId !== 300) return false;
    if (d.gdprApplies === false && (!d.cmpStatus || d.cmpStatus === 'loaded')) return true;
    if (d.cmpStatus !== 'loaded') return false;
    return d.gdprApplies === true && typeof d.tcString === 'string' && d.tcString.length > 0 &&
      ['tcloaded','useractioncomplete'].includes(d.eventStatus) &&
      d.vendor?.disclosedVendors?.[755] === true &&
      [1,3,4].every(id => purposeAllowed(d,id,true)) && [2,7,9,10].every(id => purposeAllowed(d,id,false));
  }
  function signal(next) {
    const value=allowed => allowed ? 'granted' : 'denied';
    window.gtag('consent','update',{
      ad_storage:value(next.advertising),ad_user_data:value(next.advertising),
      ad_personalization:value(next.advertising),analytics_storage:value(next.analytics),
      functionality_storage:value(next.functionality),personalization_storage:value(next.functionality),security_storage:'granted'
    });
    window.dispatchEvent(new CustomEvent('trpuzzle:consentchange',{detail:{...next,necessary:true}}));
  }
  function reloadSafely() {
    if (reloading) return;
    reloading=true;
    if (state.storageFailed()) {
      const url=new URL(location.href);url.searchParams.set('tp-consent-reset','1');location.replace(url.href);
    } else location.reload();
  }
  function cleanCookies(category) {
    const pattern=category === 'analytics' ? /^(_ga(?:_|$)|_gid$|_gat(?:_|$))/ : /^(__gads$|__gpi$|__eoi$|_gcl_)/;
    const paths=['/'];
    location.pathname.split('/').filter(Boolean).reduce((p,part) => { p+='/'+part;paths.push(p,p+'/');return p; },'');
    const hosts=location.hostname.split('.'),domains=[''];
    while (hosts.length > 1) { domains.push(hosts.join('.'));hosts.shift(); }
    document.cookie.split(';').forEach(item => {
      const name=item.trim().split('=')[0];
      if (!pattern.test(name)) return;
      paths.forEach(path => domains.forEach(domain => {
        document.cookie=name+'=; Max-Age=0; path='+path+(domain ? '; domain='+domain : '')+'; SameSite=Lax';
      }));
    });
  }
  function loadScript(id,src) {
    if (document.getElementById(id)) return;
    const script=document.createElement('script');
    script.id=id;script.async=true;script.src=src;script.crossOrigin='anonymous';document.head.append(script);return script;
  }
  function activateScripts(next) {
    document.querySelectorAll('script[type="text/plain"][data-tp-consent]').forEach(source => {
      const category=source.dataset.tpConsent;
      if (!Object.hasOwn(next,category) || !next[category] || source.dataset.tpExecuted) return;
      source.dataset.tpExecuted='true';executed.add(category);
      const script=document.createElement('script');
      for (const a of source.attributes) {
        if (!['type','src','data-src','data-tp-consent','data-tp-executed'].includes(a.name)) script.setAttribute(a.name,a.value);
      }
      if (source.dataset.src) { script.src=source.dataset.src;script.async=false; }
      else script.textContent=source.textContent;
      source.after(script);
    });
  }
  function statusText() {
    let text='';
    if (state.categories().advertising) {
      if (cmpStatus === 'unconfigured') text='Tercihin kaydedildi. Reklam hizmeti henüz etkin değil.';
      else if (cmpStatus === 'error') text='Reklam izin hizmetine ulaşılamadı. Reklamlar kapalı tutuluyor.';
      else if (cmpStatus === 'loading' || cmpStatus === 'waiting') text='Reklamlar için sağlayıcı izin tercihin bekleniyor.';
      else if (!googleAllowsAds()) text='Sağlayıcı izinlerine göre kişiselleştirilmiş reklamlar kapalı.';
    }
    if (state.storageFailed()) text+=' Tarayıcın tercihini kalıcı kaydedemedi; sonraki sayfada yeniden sorulabilir.';
    return text.trim();
  }
  function updateStatus() {
    if (!status) return;
    status.textContent=statusText();
    const google=dialog.querySelector('[data-action="google"]');
    google.hidden=!cmpStarted || tcData?.gdprApplies === false;google.disabled=!subscribed;
  }
  function apply() {
    const choice=state.categories();
    const next={advertising:choice.advertising && googleAllowsAds() && !policyPage,
      analytics:choice.analytics && !policyPage,functionality:choice.functionality};
    signal(next);
    const withdrawn=Object.keys(active).filter(k => active[k] && !next[k]);
    withdrawn.forEach(k => { if (k !== 'functionality') cleanCookies(k); });
    const mustReload=withdrawn.some(k => executed.has(k) || (k === 'advertising' && adLoaded) || (k === 'analytics' && analyticsLoaded));
    active=next;
    if (mustReload) { reloadSafely();return; }
    if (next.advertising && !adLoaded && /^ca-pub-\d{16}$/.test(config.publisherId || '')) {
      adLoaded=true;
      loadScript('tp-consented-ads','https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+config.publisherId);
    }
    if (next.analytics && !analyticsLoaded && /^G-[A-Z0-9]+$/.test(config.analyticsId || '')) {
      analyticsLoaded=true;window.gtag('js',new Date());
      window.gtag('config',config.analyticsId,{allow_google_signals:false,allow_ad_personalization_signals:false});
      loadScript('tp-consented-analytics','https://www.googletagmanager.com/gtag/js?id='+config.analyticsId);
    }
    activateScripts(next);updateStatus();
  }
  function subscribe() {
    if (subscribed || typeof window.__tcfapi !== 'function') return;
    subscribed=true;
    try {
      window.__tcfapi('addEventListener',2,function (data,success) {
        if (!success || !data || data.cmpStatus === 'error') { tcData=null;cmpStatus='error';apply();return; }
        tcData=data;cmpStatus=data.cmpStatus === 'loaded' || data.gdprApplies === false ? 'ready' : 'waiting';
        if (cmpStatus === 'ready') clearTimeout(timer);
        if (data.eventStatus === 'cmpuishown' && dialog?.open) dialog.close();
        apply();
      });
    } catch (_) { subscribed=false;tcData=null;cmpStatus='error';apply(); }
  }
  function connectGoogle() {
    if (!state.categories().advertising || policyPage || cmpStarted) return;
    // Hesaba ait bağımsız CMP etiketi yoksa reklamı açmayın.
    let url;
    try { url=new URL(config.googleCmpScript); } catch (_) {}
    if (!url || url.protocol !== 'https:' || url.hostname !== 'fundingchoicesmessages.google.com' ||
        url.pathname !== '/i/'+String(config.publisherId).replace('ca-','')) {
      cmpStatus='unconfigured';updateStatus();return;
    }
    cmpStarted=true;cmpStatus='loading';
    const fc=window.googlefc=window.googlefc || {};fc.callbackQueue=fc.callbackQueue || [];
    fc.callbackQueue.push({CONSENT_API_READY:subscribe});
    timer=setTimeout(() => { if (!tcData || tcData.cmpStatus !== 'loaded') { cmpStatus='error';updateStatus(); } },10000);
    const script=loadScript('tp-google-cmp',url.href);
    script?.addEventListener('error',() => { clearTimeout(timer);cmpStatus='error';tcData=null;apply(); });
    subscribe();updateStatus();
  }
  function armExpiry() {
    clearTimeout(expiryTimer);
    const record=state.record();if (!record) return;
    expiryTimer=setTimeout(() => {
      if (!state.record()) { state.clearPreferences();apply();if (banner) banner.hidden=false; }
      else armExpiry();
    },Math.min(record.expires-Date.now()+10,2147483647));
  }
  function save(categories) {
    state.save(categories);
    if (!categories.advertising) cleanCookies('advertising');
    if (!categories.analytics) cleanCookies('analytics');
    banner.hidden=true;if (dialog.open) dialog.close();
    apply();connectGoogle();armExpiry();
    document.getElementById('tp-consent-notice').textContent=statusText() || 'Çerez tercihlerin kaydedildi.';
  }
  function open(event) {
    event?.preventDefault();if (!dialog) return;
    opener=document.activeElement;
    const values=state.categories();
    dialog.querySelectorAll('input[data-category]').forEach(input => { input.checked=values[input.dataset.category]; });
    updateStatus();if (!dialog.open) dialog.showModal();
  }
  function googleSettings() {
    const fc=window.googlefc;
    if (!subscribed || !fc || typeof fc.showRevocationMessage !== 'function') return;
    fc.callbackQueue.push({CONSENT_API_READY:function () { dialog.close();fc.showRevocationMessage(); }});
  }
  function actions(event) {
    const action=event.target.closest('[data-action]')?.dataset.action;if (!action) return;
    if (action === 'manage') open(event);
    else if (action === 'accept') save({advertising:true,analytics:true,functionality:true});
    else if (action === 'reject') save(state.empty());
    else if (action === 'close') dialog.close();
    else if (action === 'google') googleSettings();
    else if (action === 'save') {
      const next=state.empty();
      dialog.querySelectorAll('input[data-category]').forEach(input => { next[input.dataset.category]=input.checked; });save(next);
    }
  }
  function init() {
    const host=document.createElement('div');host.id='tp-consent';
    const links='<a href="/gizlilik.html">Gizlilik Politikası</a><a href="/cerez-politikasi.html">Çerez Politikası</a>';
    host.innerHTML=`
      <section class="tp-consent-banner" aria-labelledby="tp-consent-title" hidden>
        <div><span class="tp-consent-eyebrow">TRPUZZLE · GİZLİLİK</span><h2 id="tp-consent-title">Çerezlerde seçim senin.</h2>
          <p>Oyunlarını ve izin tercihlerini saklamak için gerekli depolamayı kullanıyoruz. Reklam, analitik ve kalıcı görünüm tercihleri için iznini istiyoruz. Reddetsen de tüm oyunları oynayabilirsin.</p>
          <div class="tp-consent-links">${links}</div></div>
        <div class="tp-consent-actions"><button type="button" data-action="accept">Tümünü Kabul Et</button><button type="button" data-action="reject">Tümünü Reddet</button><button type="button" data-action="manage">Ayarları Yönet</button></div>
      </section>
      <dialog class="tp-consent-dialog" aria-modal="true" aria-labelledby="tp-preferences-title" aria-describedby="tp-preferences-description">
        <div class="tp-consent-heading"><span class="tp-consent-eyebrow">GİZLİLİK TERCİHLERİ</span><button type="button" data-action="close" aria-label="Ayarları kaydetmeden kapat">Kapat</button></div>
        <h2 id="tp-preferences-title">Neyi hatırlayacağımıza sen karar ver.</h2>
        <p id="tp-preferences-description">İsteğe bağlı kategoriler başlangıçta kapalıdır. Seçimini 180 gün hatırlarız. İznini alt bilgideki Çerez Ayarları bağlantısından her zaman değiştirebilirsin.</p>
        <div class="tp-consent-categories">
          <label><span><strong>Gerekli / Temel Çerezler</strong><small>Rıza kaydı, oyun ilerlemesi ve skorların için gerekli yerel depolama. Her zaman açık.</small></span><input type="checkbox" checked disabled aria-label="Gerekli / Temel Çerezler: her zaman açık"></label>
          <label><span><strong>Reklam ve Kişiselleştirme</strong><small>Google AdSense ile reklam sunumu, kişiselleştirme ve reklam ölçümü. Gerekli sağlayıcı izinleri ayrıca sorulur.</small></span><input type="checkbox" data-category="advertising" aria-label="Reklam ve Kişiselleştirme Çerezleri"></label>
          <label><span><strong>Analitik / Performans</strong><small>Ziyaretçi trafiğini ve kullanımı ölçmek için. Şu anda bağımsız bir analitik hizmeti etkin değil.</small></span><input type="checkbox" data-category="analytics" aria-label="Analitik / Performans Çerezleri"></label>
          <label><span><strong>İşlevsellik</strong><small>Tema, klavye ve yardım ekranı gibi tercihlerini sonraki ziyaretlerinde hatırlamak için. Kapalıyken bu ayarlar yalnızca açık sayfada tutulur.</small></span><input type="checkbox" data-category="functionality" aria-label="İşlevsellik Çerezleri"></label>
        </div>
        <div class="tp-consent-links">${links}</div><p class="tp-consent-status" role="status"></p>
        <button type="button" data-action="google" hidden>Google sağlayıcı izinlerini yönet</button>
        <div class="tp-consent-actions"><button type="button" data-action="accept">Tümünü Kabul Et</button><button type="button" data-action="reject">Tümünü Reddet</button><button type="button" data-action="save">Seçimlerimi Kaydet</button></div>
      </dialog><p id="tp-consent-notice" class="tp-consent-sr" role="status" aria-live="polite"></p>`;
    document.body.append(host);
    banner=host.querySelector('section');dialog=host.querySelector('dialog');status=host.querySelector('.tp-consent-status');
    host.addEventListener('click',actions);
    ['keydown','keyup','keypress'].forEach(type => host.addEventListener(type,event => event.stopPropagation()));
    dialog.addEventListener('close',() => { if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus(); });
    document.addEventListener('click',event => { if (event.target.closest('[data-privacy-preferences],[data-open-privacy]')) open(event); });
    if (!document.querySelector('[data-privacy-preferences]')) {
      const footer=document.querySelector('footer nav, footer') || document.body;
      const link=document.createElement('a');link.href='/cerez-politikasi.html';link.dataset.privacyPreferences='';
      link.className='tp-privacy-link';link.textContent='Çerez Ayarları';footer.append(link);
    }
    banner.hidden=!!state.record();
    if (config.analyticsId) dialog.querySelector('[data-category="analytics"]').previousElementSibling.querySelector('small').textContent='Google Analytics ile ziyaretçi trafiğini ve site kullanımını ölçmek için.';
    apply();connectGoogle();armExpiry();
  }
  window.TrPuzzlePrivacy=Object.freeze({open,getStatus:() => ({categories:state.categories(),effective:{...active},cmpStatus,advertisingTagLoaded:adLoaded,analyticsTagLoaded:analyticsLoaded,policyPage})});
  function refresh() {
    state.refresh();if (!state.categories().functionality) state.clearPreferences();
    apply();connectGoogle();armExpiry();if (banner) banner.hidden=!!state.record();
  }
  window.addEventListener('storage',event => { if (event.key === state.key || event.key === null) refresh(); });
  window.addEventListener('pageshow',event => { if (event.persisted) refresh(); });
  document.addEventListener('visibilitychange',() => { if (!document.hidden && !state.record()) refresh(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
