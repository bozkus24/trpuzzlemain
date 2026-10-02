const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/privacy-controls.js'), 'utf8');

function setup(googlefc) {
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.dataset = {}; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, callback) { this.events[name] = callback; }
    querySelector() { return this.children.find(child => child.dataset?.privacyPreferences !== undefined); }
    closest() { return false; }
    showModal() { this.open = true; }
    close() { this.open = false; this.events.close?.(); }
    focus() { this.focused = true; }
  }
  const nav = new Element('nav');
  const document = { readyState: 'complete', head: new Element('head'), body: new Element('body'),
    activeElement: new Element('button'), createElement: tag => new Element(tag),
    querySelectorAll: selector => selector === 'footer nav' ? [nav] : [],
    createTextNode: text => ({textContent: text}) };
  const window = {googlefc};
  // Cookie/storage mutation must never be used to invent Google consent.
  Object.defineProperty(document, 'cookie', {set() { throw new Error('Unexpected cookie write'); }});
  const context = vm.createContext({window, document});
  vm.runInContext(source, context);
  return {window, document, nav, context};
}

test('footer entry invokes the official Google queue without creating another consent dialog', () => {
  let called = 0;
  const queue = [];
  const env = setup({showRevocationMessage() { called++; }, callbackQueue: queue});
  env.nav.children[0].events.click({preventDefault() {}});
  assert.equal(called, 0);
  assert.equal(queue.length, 1);
  queue[0]();
  assert.equal(called, 1);
  assert.equal(env.document.body.children.length, 0);
});

test('missing CMP explains failure without claiming consent and retry works after CMP loads', () => {
  const env = setup();
  env.window.TrPuzzlePrivacy.open();
  const dialog = env.document.body.children[0];
  assert.equal(dialog.open, true);
  assert.match(dialog.children[1].textContent, /izin tercihlerini değiştirmedi/);
  let called = 0;
  env.window.googlefc = {showRevocationMessage() { called++; }, callbackQueue: {push(fn) { fn(); }}};
  dialog.children.find(child => child.textContent === 'Yeniden dene').events.click();
  assert.equal(called, 1);
  assert.equal(dialog.open, false);
});

test('blocked CMP retry stays usable; repeated script load does not duplicate entries', () => {
  const env = setup();
  vm.runInContext(source, env.context);
  assert.equal(env.nav.children.length, 1);
  env.window.TrPuzzlePrivacy.open();
  const dialog = env.document.body.children[0];
  dialog.children.find(child => child.textContent === 'Yeniden dene').events.click();
  assert.equal(dialog.open, true);
  dialog.children.find(child => child.textContent === 'Kapat').events.click();
  assert.equal(dialog.open, false);
  assert.equal(env.document.activeElement.focused, true);
});
