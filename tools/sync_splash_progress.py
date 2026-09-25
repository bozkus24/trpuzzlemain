#!/usr/bin/env python3
"""Anasayfadaki durum hesabını oyunların ara sayfalarına gömer."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
GAMES = ['harfle', 'word500turkce', 'trpuzzle4', 'arala', 'trpuzzle6', 'trpuzzle3', 'trpuzzle1', 'trpuzzle2']
START = '<!-- TRPUZZLE-PROGRESS-START -->'
END = '<!-- TRPUZZLE-PROGRESS-END -->'


def build():
    home = (ROOT / 'index.html').read_text()
    helpers = home[home.index('  function readProgress('):home.index('  function updatePlayLabels(')]
    # Harf500 seçimi kayda ancak Oyna tıklanınca geçer; ara sayfada seçili
    # segmenti esas alarak tıklama öncesinde doğru etiketi göster.
    helpers = helpers.replace('function dailyProgress(now)', 'function dailyProgress(now, selectedLevel)')
    helpers = helpers.replace('const settings = readProgress("word500tr.ayarlar");',
                              'const settings = readProgress("word500tr.ayarlar");\n    if (selectedLevel) settings.seviye = selectedLevel;')
    controller = '''
  function refresh() {
    const button = document.getElementById("tpPlay");
    const title = document.querySelector("#tp-splash .tp-name");
    if (!button || !title) return;
    const selected = document.querySelector('#tpSeg [data-seviye][aria-checked="true"]');
    const state = dailyProgress(new Date(), selected && selected.getAttribute("data-seviye"))[title.textContent.trim()];
    button.textContent = state === "completed" ? "Sonucu Gör" : state === "started" ? "Devam Et" : "Oyna";
  }
  refresh();
  window.addEventListener("pageshow", refresh);
  window.addEventListener("storage", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
  const segment = document.getElementById("tpSeg");
  if (segment) {
    segment.addEventListener("click", refresh);
    segment.addEventListener("keydown", refresh);
  }
  setInterval(function () { if (!document.hidden) refresh(); }, 60000);
'''
    return '/* Üretilen dosya: trpuzzlemain/tools/sync_splash_progress.py */\n(function () {\n  "use strict";\n' + helpers + controller + '\n})();\n'


def embed(html, source):
    block = START + '\n<script>\n' + source + '</script>\n' + END
    if START in html:
        return re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda _: block, html, flags=re.S)
    assert '</body>' in html
    return html.replace('</body>', block + '\n</body>', 1)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--games', action='store_true', help='Kardeş oyun repolarını da güncelle')
    args = parser.parse_args()
    source = build()
    (ROOT / 'assets/splash-progress.js').write_text(source)
    if args.games:
        for game in GAMES:
            path = ROOT.parent / game / ('index.src.html' if game == 'trpuzzle6' else 'index.html')
            path.write_text(embed(path.read_text(), source))
            print(path)
