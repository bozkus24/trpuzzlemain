const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/game-clock.js'), 'utf8');
function clock() { const ctx = { window: {}, Date }; vm.runInNewContext(source, ctx); return ctx.window.TrPuzzleClock; }
test('Türkiye gece yarısı: tarih, gün numarası ve sayaç aynı anda değişir', () => {
 const c = clock(), before = new Date('2026-09-27T20:59:59Z'), after = new Date('2026-09-27T21:00:00Z');
 assert.equal(c.key(before), '2026-09-27'); assert.equal(c.remaining(before),1000);
 assert.equal(c.key(after), '2026-09-28'); assert.equal(c.remaining(after),86400000);
 assert.equal(c.day(after)-c.day(before),1);
});
test('Yıl geçişi ve artık gün', () => {
 const c=clock(); assert.equal(c.key(new Date('2026-12-31T21:00:00Z')),'2027-01-01');
 assert.equal(c.key(new Date('2028-02-28T21:00:00Z')),'2028-02-29');
});
test('Cihaz saat dilimi günlük tarihi ve yerel takvim bileşenlerini değiştirmez', () => {
 for(const TZ of ['UTC','Europe/Istanbul','America/Los_Angeles','Pacific/Auckland']) {
  const script=source+`;const c=window.TrPuzzleClock,d=new Date('2026-09-27T21:00:00Z'),v=c.calendar(d); console.log(JSON.stringify([c.key(d),v.getFullYear(),v.getMonth(),v.getDate(),c.remaining(d)]));`;
  const result=execFileSync(process.execPath,['-e','global.window={};'+script],{env:{...process.env,TZ},encoding:'utf8'});
  assert.deepEqual(JSON.parse(result),['2026-09-28',2026,8,28,86400000]);
 }
});
