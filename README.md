# trpuzzlemain

**[trpuzzle.com](https://trpuzzle.com)** — Türkçe günlük bulmaca oyunlarının ortak anasayfası. **Harfle**, **Harf500**, **Baklava**, **Bağla**, **Kesme**, **Şehirle**, **Tilkile** ve **Arala** oyunlarına tek sayfadan erişim sağlar.

| Oyun | Repo | Yol | Netlify site adı |
|---|---|---|---|
| Harfle | `trpuzzle5` | trpuzzle.com/harfle | `trpuzzle-harfle` |
| Harf500 | `word500turkce` | trpuzzle.com/harf500 | `trpuzzle-harf500` |
| Baklava | `trpuzzle4` | trpuzzle.com/baklava | `trpuzzle-baklava` |
| Bağla | `trpuzzle1` | trpuzzle.com/bagla | `trpuzzle-bagla` |
| Kesme | `trpuzzle2` | trpuzzle.com/kesme | `trpuzzle-kesme` |
| Şehirle | `trpuzzle3` | trpuzzle.com/sehirle | `trpuzzle-sehirle` |
| Tilkile | `trpuzzle6` | trpuzzle.com/tilkile | `trpuzzle-tilkile` |
| Arala | `trpuzzle7` | trpuzzle.com/arala | `trpuzzle-arala` |

Oyun yolları, anasayfa sitesinin `netlify.toml` dosyasındaki proxy kurallarıyla
ilgili oyunun Netlify sitesine vekâlet edilir; adres çubuğu trpuzzle.com'da kalır.
Bu yüzden her oyunun Netlify sitesi yukarıdaki **site adıyla** adlandırılmalıdır.

Tamamen statik bir sitedir (HTML + CSS + JS) — derleme adımı yoktur; GitHub Pages, Netlify veya herhangi bir statik hosting üzerinde doğrudan yayınlanabilir.

## Dosyalar

| Dosya | Açıklama |
|---|---|
| `index.html` | Anasayfa — 6 oyun kartı, üst bar ve yan menü |
| `styles.css` | Tüm stiller (masaüstü 3 sütun, mobil 2 sütun) |
| `script.js` | Yan menü, "Oyna" butonları ve "çok yakında" bildirimi |
| `logo.png` | Orijinal TrPuzzle logosu (yüksek çözünürlük, kaynak dosya) |
| `assets/logo.png` | Header için optimize edilmiş logo (şeffaf arka plan, ~37 KB) |
| `assets/favicon.png` | Logodan üretilen sekme simgesi (64×64) |

## Logoları ekleme

Şu an her kartta geçici (placeholder) SVG ikonlar var. Gerçek logolar hazır olduğunda:

1. Logo dosyalarını `assets/` klasörüne koy (ör. `assets/harfle.svg`).
2. `index.html` içinde ilgili kartın `card-logo` bölümündeki SVG'yi şununla değiştir:

```html
<div class="card-logo" aria-hidden="true">
  <img src="assets/harfle.svg" alt="">
</div>
```

Her kartın üzerinde `<!-- LOGO: ... -->` yorumu ile işaretli.

## Oyunları yayına bağlama

Oyunlar henüz yayında olmadığı için "Oyna" butonları şimdilik "çok yakında" bildirimi gösterir. Bir oyun yayına alındığında butona `data-url` eklemen yeterli:

```html
<a href="#" class="btn btn-play" data-game="Harfle" data-url="https://harfle.example.com">Oyna</a>
```

`data-url` tanımlı olan buton doğrudan oyuna yönlendirir. Yan menüdeki (`drawer-link`) bağlantılar da aynı şekilde çalışır.

## Yerelde çalıştırma

Herhangi bir statik sunucu yeterli:

```bash
python3 -m http.server 8080
# http://localhost:8080
```
