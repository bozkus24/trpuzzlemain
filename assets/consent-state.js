/* Senkron yüklenir: uygulamalar başlamadan önce yerel tercih sınırını kurar. */
(function () {
  'use strict';
  if (window.TrPuzzleConsentState) return;
  const KEY = 'trpuzzle.consent.v2', POLICY = '2026-10-06', AGE = 180 * 86400000;
  const OPTIONAL = ['advertising', 'analytics', 'functionality'];
  const memory = new Map();
  const preferenceKeys = new Set([
    'trpuzzle-theme', 'baglantilar.ayarlar', 'word500tr.ayarlar', 'kelime500.ayarlar',
    'waffle-theme-v1', 'petek-cb-v1', 'waffle-help-hidden-v1',
    'kesme-theme', 'kesme-accent', 'kesme-cvd', 'kesme-help-seen',
    'trw-theme', 'trw-cb', 'trw-osk', 'trw-howtoSeen',
    'foximax-theme', 'foximax-keyboard', 'foximax-hide-help', 'foximax-skip-confirm',
    'aradle_theme', 'aradle_kb', 'aradle_help_hide',
    'iller-globle:howto-hidden', 'iller-globle:colorblind', 'iller-globle:theme'
  ]);
  function empty() { return {necessary:true, advertising:false, analytics:false, functionality:false}; }
  function valid(r) {
    const now = Date.now();
    return r && r.version === 2 && r.policy === POLICY &&
      Number.isFinite(r.at) && r.at <= now && Number.isFinite(r.expires) &&
      r.expires > now && r.expires > r.at && r.expires - r.at <= AGE &&
      r.categories && r.categories.necessary === true &&
      OPTIONAL.every(k => typeof r.categories[k] === 'boolean');
  }
  function read() {
    try { const r=JSON.parse(localStorage.getItem(KEY)); return valid(r) ? r : null; }
    catch (_) { return null; }
  }
  let record = read(), storageFailed = false;
  // Eski ikili kabul, yeni kategoriler için onay değildir.
  try { localStorage.removeItem('trpuzzle.privacy.v1'); } catch (_) {}
  let forced = new URLSearchParams(location.search).has('tp-consent-reset');
  if (forced) { record=null; try { localStorage.removeItem(KEY); } catch (_) {} }
  function categories() { return record && valid(record) ? {...record.categories} : empty(); }
  function clearPreferences() { preferenceKeys.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} }); }
  if (!categories().functionality) clearPreferences();
  window.TrPuzzlePreferences = Object.freeze({
    getItem(k) {
      k=String(k); preferenceKeys.add(k);
      if (memory.has(k)) return memory.get(k);
      if (!categories().functionality) return null;
      try { return localStorage.getItem(k); } catch (_) { return null; }
    },
    setItem(k,value) {
      k=String(k); value=String(value); preferenceKeys.add(k); memory.set(k,value);
      if (categories().functionality) { try { localStorage.setItem(k,value); } catch (_) {} }
    },
    removeItem(k) { memory.delete(k); try { localStorage.removeItem(k); } catch (_) {} }
  });
  function save(next) {
    const at=Date.now();
    record={version:2,policy:POLICY,at,expires:at+AGE,
      categories:{necessary:true,...Object.fromEntries(OPTIONAL.map(k => [k,next[k] === true]))}};
    storageFailed=false;
    try {
      // Başarısız yazmada eski bir kabul kaydı bırakmayın.
      localStorage.removeItem(KEY); localStorage.setItem(KEY,JSON.stringify(record));
      storageFailed=localStorage.getItem(KEY) !== JSON.stringify(record);
    } catch (_) { storageFailed=true; }
    if (!storageFailed && forced) {
      forced=false;
      const url=new URL(location.href);url.searchParams.delete('tp-consent-reset');
      history.replaceState(history.state,'',url.href);
    }
    if (!record.categories.functionality) clearPreferences();
    else memory.forEach((v,k) => { try { localStorage.setItem(k,v); } catch (_) {} });
    return !storageFailed;
  }
  window.TrPuzzleConsentState=Object.freeze({key:KEY,age:AGE,empty,categories,save,read,
    record:() => record && valid(record) ? {...record,categories:{...record.categories}} : null,
    refresh:() => { record=forced ? null : read(); }, storageFailed:() => storageFailed,clearPreferences});
})();
