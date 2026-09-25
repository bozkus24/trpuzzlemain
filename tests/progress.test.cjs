// Çalıştırma: node --test tests/progress.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.slice(html.indexOf('  const playLinks ='), html.indexOf('\n  playLinks.forEach(function (link) {\n    link.addEventListener'));
const games = ['Harfle', 'Harf500', 'Baklava', 'Arala', 'Tilkile', 'Kesme', 'Bağla', 'Şehirle'];
const now = new Date(2026, 8, 25, 12);
const dayId = Date.UTC(2026, 8, 25) / 86400000;
const puzzleNo = dayId - Date.UTC(2026, 7, 1) / 86400000 + 1;
const midnight = new Date(2026, 8, 25).getTime();
const foxNo = Math.floor((midnight - new Date(2026, 7, 1)) / 86400000) + 1;
const aralaDay = Math.round((midnight - new Date(2026, 0, 1)) / 86400000);
const fixtures = [
  ['Harfle', 'trw-2026-09-25', { guesses: ['KALEM'], done: false }, { guesses: [] }, { done: true }],
  ['Harf500', 'word500tr.oyun.standart.2026-09-25', { surum: 1, gecmis: [{ kelime: 'KALEM' }], bitti: false }, { gecmis: [], aktif: 'KALEM' }, { bitti: true }],
  ['Baklava', 'petek-progress-v1', { swapsLeft: 14, phase: 'play' }, { swapsLeft: 15 }, { phase: 'win' }, dayId],
  ['Arala', 'aradle_days_v2', { steps: 1, done: false }, { steps: 0 }, { done: true }, aralaDay],
  ['Tilkile', 'foximax-daily-' + foxNo, { guessed: ['A'], status: 'playing' }, { guessed: [] }, { status: 'lost' }],
  ['Bağla', 'baglantilar.gunluk.' + puzzleNo, { tahminler: [[1, 2, 3, 4]], durum: 'oyunda' }, { tahminler: [] }, { durum: 'kazandi' }],
  ['Şehirle', 'iller-globle:daily:2026-09-25', { guesses: ['Ankara'], won: false, gaveUp: false }, { guesses: [] }, { gaveUp: true }]
];
function setup() {
  let clock = now;
  const storage = new Map();
  const events = {};
  const links = games.map(game => ({ dataset: { game }, textContent: 'Oyna' }));
  const document = { hidden: false, querySelectorAll: () => links, addEventListener: (name, fn) => events[name] = fn };
  const sandbox = { document, updateTracker: () => {},
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } },
    localStorage: { getItem: key => storage.get(key) ?? null },
    window: { addEventListener: (name, fn) => events[name] = fn },
    setInterval: fn => events.timer = fn
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { storage, events, document, sandbox,
    setDate: value => clock = value,
    label: game => links.find(link => link.dataset.game === game).textContent,
    save: (key, value) => storage.set(key, JSON.stringify(value))
  };
}
for (const [game, key, started, empty, finished, mapKey] of fixtures) {
  test(game + ': tahmin öncesi Oyna, yarım oyunda Devam Et, bitişte Sonucu Gör', () => {
    const env = setup();
    const save = patch => env.save(key, mapKey === undefined ? { ...started, ...patch } : { [mapKey]: { ...started, ...patch } });
    assert.equal(env.label(game), 'Oyna');
    save(empty); env.events.pageshow(); assert.equal(env.label(game), 'Oyna');
    save({}); env.events.pageshow(); assert.equal(env.label(game), 'Devam Et');
    save(finished); env.events.storage(); assert.equal(env.label(game), 'Sonucu Gör');
    save({}); env.events.focus(); assert.equal(env.label(game), 'Devam Et');
    env.setDate(new Date(2026, 8, 26, 0, 1)); env.events.timer();
    assert.equal(env.label(game), 'Oyna', 'eski günün kaydı yeni güne taşınmamalı');
  });
}
test('Harf500 yalnız açılışta yüklenen seviyeyi gösterir', () => {
  const env = setup();
  env.save('word500tr.oyun.kolay.2026-09-25', { surum: 1, gecmis: [{}], bitti: false });
  env.events.storage(); assert.equal(env.label('Harf500'), 'Oyna');
  env.save('word500tr.ayarlar', { seviye: 'kolay' });
  env.events.visibilitychange(); assert.equal(env.label('Harf500'), 'Devam Et');
});
test('Arala eski kayıt biçimini okur; yeni kayıt varsa onu esas alır', () => {
  const env = setup();
  env.save('aradle_day_v1', { day: aralaDay, steps: 2, done: false });
  env.events.pageshow(); assert.equal(env.label('Arala'), 'Devam Et');
  env.save('aradle_days_v2', { [aralaDay]: { steps: 3, done: true } });
  env.events.storage(); assert.equal(env.label('Arala'), 'Sonucu Gör');
});
test('Kesme tamamlanmış tek hamleyi devam edilecek oyun saymaz', () => {
  const env = setup();
  env.save('kesme2-day-2026-09-25', { cut: [0, 0, 1, 1], win: true });
  env.events.pageshow(); assert.equal(env.label('Kesme'), 'Sonucu Gör');
});
test('Bozuk veya erişilemeyen depolama anasayfayı bozmaz', () => {
  const env = setup();
  for (const value of ['{', 'null', '[]', '42', '"bad"']) {
    fixtures.forEach(([, key]) => env.storage.set(key, value));
    env.events.pageshow();
    games.forEach(game => assert.equal(env.label(game), 'Oyna'));
  }
  env.sandbox.localStorage.getItem = () => { throw new Error('SecurityError'); };
  assert.doesNotThrow(() => env.events.pageshow());
});

const splashSource = fs.readFileSync(path.join(__dirname, '..', 'assets', 'splash-progress.js'), 'utf8');
function splash(game) {
  const env = setup();
  const button = { textContent: 'Oyna' };
  const segmentEvents = {};
  let level = null;
  env.sandbox.document.getElementById = id => id === 'tpPlay' ? button : id === 'tpSeg' ? { addEventListener: (name, fn) => segmentEvents[name] = fn } : null;
  env.sandbox.document.querySelector = selector => selector.includes('.tp-name') ? { textContent: game } : level ? { getAttribute: () => level } : null;
  vm.runInContext(splashSource, env.sandbox);
  return { ...env, button, segmentEvents, select: value => level = value };
}
test('Ara sayfa ve anasayfa tüm oyunlarda aynı üç durumu gösterir', () => {
  for (const [game, key, started, empty, finished, mapKey] of fixtures) {
    const env = splash(game);
    assert.equal(env.button.textContent, 'Oyna');
    const save = patch => env.save(key, mapKey === undefined ? { ...started, ...patch } : { [mapKey]: { ...started, ...patch } });
    save({}); env.events.pageshow(); assert.equal(env.button.textContent, 'Devam Et', game);
    save(finished); env.events.storage(); assert.equal(env.button.textContent, 'Sonucu Gör', game);
    env.setDate(new Date(2026, 8, 26, 12)); env.events.timer(); assert.equal(env.button.textContent, 'Oyna', game);
  }
  const env = splash('Kesme');
  env.save('kesme2-day-2026-09-25', { cut: [0, 0, 1, 1] });
  env.events.pageshow(); assert.equal(env.button.textContent, 'Sonucu Gör');
});
test('Harf500 ara sayfası kaydedilmeden önce seçilen seviyeyi izler', () => {
  const env = splash('Harf500');
  env.save('word500tr.oyun.kolay.2026-09-25', { surum: 1, gecmis: [{}], bitti: false });
  env.save('word500tr.oyun.zor.2026-09-25', { surum: 1, gecmis: [{}], bitti: true });
  env.select('kolay'); env.segmentEvents.click(); assert.equal(env.button.textContent, 'Devam Et');
  env.select('zor'); env.segmentEvents.keydown(); assert.equal(env.button.textContent, 'Sonucu Gör');
  env.select('standart'); env.segmentEvents.click(); assert.equal(env.button.textContent, 'Oyna');
});
