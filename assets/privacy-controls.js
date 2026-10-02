/* Google CMP owns consent storage and ad-vendor choices. Never infer consent here. */
(function () {
  'use strict';
  if (window.TrPuzzlePrivacy) return;
  function openGooglePreferences() {
    const fc = window.googlefc;
    if (!fc || typeof fc.showRevocationMessage !== 'function') return false;
    fc.callbackQueue = fc.callbackQueue || [];
    fc.callbackQueue.push(function () { fc.showRevocationMessage(); });
    return true;
  }
  let dialog, opener;
  function showPreferences(event) {
    event?.preventDefault();
    try { if (openGooglePreferences()) return; } catch (_) { /* Offer a retry. */ }
    opener = document.activeElement;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'tp-privacy-dialog';
      dialog.setAttribute('aria-labelledby', 'tp-privacy-title');
      const title = document.createElement('h2');
      title.id = 'tp-privacy-title'; title.textContent = 'Gizlilik ve çerez tercihleri';
      const message = document.createElement('p');
      message.setAttribute('role', 'status');
      message.textContent = 'Google’ın çerez tercihleri penceresi şu anda açılamıyor. Lütfen daha sonra yeniden dene. Bu işlem izin tercihlerini değiştirmedi.';
      const policy = document.createElement('a');
      policy.href = '/gizlilik.html'; policy.textContent = 'Gizlilik ve Çerez Politikası';
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Yeniden dene';
      retry.addEventListener('click', function () {
        try {
          // Close first so our native modal never covers Google's dialog.
          dialog.close();
          if (!openGooglePreferences()) dialog.showModal();
        } catch (_) { if (!dialog.open) dialog.showModal(); }
      });
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = 'Kapat';
      close.addEventListener('click', function () { dialog.close(); });
      dialog.addEventListener('close', function () { opener?.focus(); });
      dialog.addEventListener('keydown', function (event) { event.stopPropagation(); });
      dialog.append(title, message, policy, retry, close);
      document.body.append(dialog);
    }
    if (!dialog.open) dialog.showModal();
  }
  window.TrPuzzlePrivacy = Object.freeze({open: showPreferences});
  function init() {
    const style = document.createElement('style');
    style.textContent = '.footer-links{flex-wrap:wrap}.tp-privacy-link{font:inherit;color:inherit;text-decoration:underline;border:0;background:none;padding:0;cursor:pointer}.tp-privacy-dialog{position:fixed;inset:0;margin:auto;box-sizing:border-box;height:fit-content;max-height:calc(100dvh - 32px);overflow:auto;text-align:center;width:min(92vw,480px);border:1px solid #ccc;border-radius:16px;padding:24px;background:#fff;color:#202124;font:16px/1.6 system-ui,sans-serif}.tp-privacy-dialog::backdrop{background:#0008}.tp-privacy-dialog h2{font-size:1.2rem;margin:0 0 12px}.tp-privacy-dialog a{display:block;color:#245a98;margin:12px 0}.tp-privacy-dialog button{font:inherit;padding:8px 14px;margin:8px 8px 0 0;border:1px solid #aaa;border-radius:8px;background:#f4f4f4;color:#202124;cursor:pointer}.tp-privacy-link:focus-visible,.tp-privacy-dialog button:focus-visible{outline:2px solid currentColor;outline-offset:4px}';
    document.head.append(style);
    document.querySelectorAll('footer nav').forEach(function (nav) {
      if (nav.querySelector('[data-privacy-preferences]')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tp-privacy-link';
      button.dataset.privacyPreferences = '';
      button.textContent = 'Çerez tercihleri';
      button.addEventListener('click', showPreferences);
      if (nav.closest('.tp-footer')) nav.append(document.createTextNode(' · '));
      nav.append(button);
    });
    document.querySelectorAll('[data-open-privacy]').forEach(function (button) {
      button.addEventListener('click', showPreferences);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
