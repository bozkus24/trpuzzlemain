/* Site-level advertising gate. Google CMP remains responsible for TCF/vendor consent. */
(function () {
  'use strict';
  if (window.TrPuzzlePrivacy) return;
  const KEY = 'trpuzzle.privacy.v1';
  const policyPage = /^\/(gizlilik|kosullar|hakkinda|iletisim|404)(\.html)?\/?$/.test(window.location.pathname || '');
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let choice = null, dialog, opener, adsLoaded = false, storageFailed = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.version === 1 && ['accepted', 'rejected'].includes(saved.choice) &&
        Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < MAX_AGE) choice = saved.choice;
  } catch (_) { /* Missing or unavailable storage means no advertising permission. */ }
  let googleState = 'idle', gdprApplies = null, apiSubscribed = false, googleTimer;
  function updateGoogleStatus() {
    if (!dialog) return;
    const status = dialog.querySelector('.tp-privacy-status');
    const button = dialog.querySelector('.tp-google-preferences');
    button.hidden = choice !== 'accepted' || policyPage || gdprApplies === false;
    button.disabled = googleState !== 'ready' && googleState !== 'decision';
    if (policyPage) status.textContent = 'Bu bilgilendirme sayfasında reklam ve Google izin kodu yüklenmez.';
    else if (choice !== 'accepted') status.textContent = choice === 'rejected' ? 'Reklam iznin kapalı.' : '';
    else if (googleState === 'unavailable') status.textContent = 'Site tercihin kaydedildi; Google izin sistemi bu oturumda doğrulanamadı. Bu, Google izni verdiğin anlamına gelmez. Reddet seçeneğiyle reklam hizmetini kapatabilirsin.';
    else if (gdprApplies === false) status.textContent = 'Google, bu oturum için Avrupa izin ekranının gerekli olmadığını bildirdi. Site reklam tercihini buradan değiştirebilirsin.';
    else if (googleState === 'decision') status.textContent = 'Google izin tercihin kendi sistemi tarafından kaydedildi. Tercihin kabul, ret veya kısmi izin olabilir; aşağıdan değiştirebilirsin.';
    else status.textContent = 'Site tercihin kaydedildi. Google’ın bölgeye ve sağlayıcılara özel izin durumu bekleniyor; bu seçim tek başına Google izni değildir.';
    if (choice === 'accepted' && !policyPage) status.textContent += ' Reddedersen reklamları durdurmak için sayfa yenilenir.';
    if (storageFailed) status.textContent += ' Tarayıcın tercihi kaydedemediği için sonraki ziyaretinde yeniden sorulabilir.';
  }
  function connectGoogle() {
    googleState = 'loading';
    const fc = window.googlefc = window.googlefc || {};
    fc.callbackQueue = fc.callbackQueue || [];
    googleTimer = setTimeout(function () {
      if (googleState === 'loading') { googleState = 'unavailable'; updateGoogleStatus(); }
    }, 10000);
    // API readiness is not consent. Never generate or overwrite a TC string.
    fc.callbackQueue.push({CONSENT_API_READY: function () {
      if (apiSubscribed || typeof window.__tcfapi !== 'function') return;
      apiSubscribed = true;
      window.__tcfapi('addEventListener', 2, function (data, success) {
        if (!success || !data || data.cmpStatus === 'error') {
          googleState = 'unavailable'; updateGoogleStatus(); return;
        }
        if (typeof data.gdprApplies === 'boolean') gdprApplies = data.gdprApplies;
        if (data.cmpStatus !== 'loaded') return;
        clearTimeout(googleTimer);
        googleState = ['tcloaded','useractioncomplete'].includes(data.eventStatus) ? 'decision' : 'ready';
        // A site modal must never cover the certified Google consent message.
        if (data.eventStatus === 'cmpuishown' && dialog?.open) dialog.close();
        updateGoogleStatus();
      });
    }});
  }
  function loadAds() {
    if (choice !== 'accepted' || adsLoaded || policyPage) return;
    adsLoaded = true;
    connectGoogle();
    const script = document.createElement('script');
    script.id = 'tp-consented-ads'; script.async = true; script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7993571496408496';
    script.addEventListener('error', function () { clearTimeout(googleTimer); googleState = 'unavailable'; updateGoogleStatus(); });
    document.head.append(script);
  }
  function save(next) {
    const wasLoaded = adsLoaded;
    choice = next;
    try { localStorage.setItem(KEY, JSON.stringify({version:1, choice:next, at:Date.now()})); }
    catch (_) { storageFailed = true; }
    dialog.close();
    if (next === 'rejected' && wasLoaded) {
      // Reload stops already-running advertising scripts; game records are untouched.
      window.location.reload();
      return;
    }
    loadAds();
  }
  function showPreferences(event) {
    event?.preventDefault();
    opener = document.activeElement;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'tp-privacy-dialog';
      dialog.setAttribute('aria-labelledby', 'tp-privacy-title');
      dialog.setAttribute('aria-describedby', 'tp-privacy-description');
      const title = document.createElement('h2');
      title.id = 'tp-privacy-title'; title.textContent = 'Çerez tercihlerin';
      const message = document.createElement('p');
      message.id = 'tp-privacy-description';
      message.textContent = 'Oyun ilerlemeni ve ayarlarını bu cihazda saklıyoruz. İzin verirsen reklam sunumu ve ölçümü için Google AdSense yüklenir; çerezler ve cihaz bilgileri kullanılabilir. Reddedersen reklam hizmetini yüklemeyiz, oyunları oynamaya devam edebilirsin.';
      const policy = document.createElement('a');
      policy.href = '/gizlilik.html'; policy.textContent = 'Gizlilik ve Çerez Politikası';
      const reject = document.createElement('button');
      reject.type = 'button'; reject.className = 'tp-consent-choice'; reject.textContent = 'Reddet';
      reject.addEventListener('click', function () { save('rejected'); });
      const accept = document.createElement('button');
      accept.type = 'button'; accept.className = 'tp-consent-choice'; accept.textContent = 'Kabul et';
      accept.addEventListener('click', function () { save('accepted'); });
      const note = document.createElement('p'); note.className = 'tp-privacy-note';
      note.textContent = 'Tercihini sayfanın altındaki Çerez tercihleri bağlantısından değiştirebilirsin. Google, bölgen ve tercihlerin doğrultusunda ek izin seçenekleri sunabilir.';
      const status = document.createElement('p'); status.className = 'tp-privacy-status'; status.setAttribute('role','status');
      const google = document.createElement('button'); google.type = 'button'; google.className = 'tp-google-preferences';
      google.textContent = 'Google izin seçenekleri';
      google.addEventListener('click', function () {
        const fc = window.googlefc;
        if (!fc || typeof fc.showRevocationMessage !== 'function' || gdprApplies === false) {
          googleState = 'unavailable'; updateGoogleStatus(); return;
        }
        try {
          fc.callbackQueue.push({CONSENT_API_READY: function () {
            if (choice !== 'accepted') return;
            dialog.close();
            fc.showRevocationMessage();
          }});
        } catch (_) { googleState = 'unavailable'; updateGoogleStatus(); }

      });
      // Escape closes the dialog without granting permission. The footer can reopen it.
      dialog.addEventListener('close', function () { opener?.focus(); });
      dialog.addEventListener('keydown', function (event) { event.stopPropagation(); });
      dialog.append(title, message, policy, reject, accept, note, status, google);
      document.body.append(dialog);
    }
    updateGoogleStatus();
    if (!dialog.open) dialog.showModal();
  }
  window.TrPuzzlePrivacy = Object.freeze({open: showPreferences, getStatus: function () { return {siteChoice: choice, googleState, gdprApplies, advertisingTagLoaded: adsLoaded, policyPage}; }});
  // Keep advertising permission in sync across tabs, including when the record is removed.
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) window.location.reload();
  });
  function init() {
    const style = document.createElement('style');
    style.textContent = `
      .footer-links{flex-wrap:wrap}
      .tp-privacy-link{font:inherit;color:inherit;text-decoration:underline;text-underline-offset:3px;border:0;background:none;padding:0;cursor:pointer}
      .tp-privacy-dialog{position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(92vw,480px);height:fit-content;max-height:calc(100dvh - 32px);overflow:auto;padding:36px 28px 28px;border:1px solid #e2dfd6;border-radius:24px;background:#f4f2ec;color:#1d1f24;text-align:center;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;box-shadow:0 24px 80px #1d1f2426}
      .tp-privacy-dialog::backdrop{background:rgba(29,31,36,.48);backdrop-filter:blur(4px)}
      .tp-privacy-dialog::before{content:"TRPUZZLE";display:block;margin:0 0 16px;color:#8a6508;font-size:11px;font-weight:750;letter-spacing:.22em}
      .tp-privacy-dialog h2{margin:0 0 16px;color:#1d1f24;font:600 clamp(25px,5vw,30px)/1.2 var(--display,Georgia,"Times New Roman",serif);letter-spacing:-.025em;text-wrap:balance}
      .tp-privacy-dialog p{margin:0;color:#5b6068;font-size:15px;line-height:1.7}
      .tp-privacy-dialog a{display:block;width:fit-content;max-width:100%;margin:20px auto 24px;color:#725308;font-size:14px;text-decoration:underline;text-underline-offset:4px}
      .tp-privacy-dialog button{box-sizing:border-box;display:inline-block;min-height:46px;width:calc(50% - 6px);padding:11px 14px;margin:0;border:1px solid #c9c5ba;border-radius:999px;background:#fff;color:#1d1f24;cursor:pointer;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;transition:background .15s,color .15s}
      .tp-privacy-dialog .tp-privacy-retry{margin-right:12px;background:#1d1f24;border-color:#1d1f24;color:#fff}
      .tp-privacy-dialog .tp-privacy-retry:hover{background:#383b42}
      .tp-privacy-dialog .tp-privacy-close:hover{background:#e9e6de}
      .tp-privacy-dialog a:hover{color:#1d1f24}
      .tp-privacy-link:focus-visible,.tp-privacy-dialog button:focus-visible,.tp-privacy-dialog a:focus-visible{outline:2px solid #8a6508;outline-offset:4px}
      @media(max-width:380px){.tp-privacy-dialog{padding:28px 20px 22px}.tp-privacy-dialog button{width:100%}.tp-privacy-dialog .tp-privacy-retry{margin:0 0 10px}}
      @media(prefers-reduced-motion:reduce){.tp-privacy-dialog button{transition:none}}
      .tp-privacy-dialog .tp-consent-choice{background:#fff;color:#1d1f24;border:1px solid #c9c5ba}
      .tp-privacy-dialog .tp-consent-choice + .tp-consent-choice{margin-left:12px}
      .tp-privacy-dialog .tp-consent-choice:hover{background:#e9e6de}
      .tp-privacy-dialog .tp-privacy-note{font-size:12px;margin-top:20px;line-height:1.6}
      .tp-privacy-dialog .tp-privacy-status{font-size:13px;margin-top:12px}
      .tp-privacy-dialog .tp-privacy-status:empty{display:none}
      .tp-privacy-dialog .tp-google-preferences{width:100%;margin-top:14px;font-size:13px}
      .tp-privacy-dialog button:disabled{opacity:.55;cursor:wait}
      .tp-privacy-dialog [hidden]{display:none!important}
      @media(max-width:380px){.tp-privacy-dialog .tp-consent-choice + .tp-consent-choice{margin:10px 0 0}}
    `;
    document.head.append(style);
    document.querySelectorAll('footer nav').forEach(function (nav) {
      if (nav.querySelector('[data-privacy-preferences]')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tp-privacy-link';
      button.dataset.privacyPreferences = ''; button.textContent = 'Çerez tercihleri';
      button.addEventListener('click', showPreferences);
      if (nav.closest('.tp-footer')) nav.append(document.createTextNode(' · '));
      nav.append(button);
    });
    document.querySelectorAll('[data-open-privacy]').forEach(function (button) { button.addEventListener('click', showPreferences); });
    if (choice === null && !policyPage) showPreferences();
    else loadAds();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
