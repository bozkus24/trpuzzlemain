# TrPuzzle Ana Site — Kalıcı Çalışma Talimatları

Bu dosya repository kökünün tamamı için geçerlidir. Bir değişikliğe başlamadan
önce bu dosyayı ve değiştirilecek dosyaları oku; aşağıdaki bilgiler kod tabanının
mevcut hâlinden doğrulanmıştır.

## 1. Projenin amacı ve TRPuzzle içindeki görevi

Bu repository, `trpuzzle.com` adresindeki TRPuzzle ana sitesidir. Sekiz günlük
Türkçe bulmaca oyununu tek bir katalogda tanıtır ve oyunlara/arşivlerine geçiş
sağlar:

| Oyun | Oyun repository'si | Ana domain yolu | Netlify sitesi |
|---|---|---|---|
| Harfle | `trpuzzle5` | `/harfle/` | `trpuzzle-harfle` |
| Harf500 | `word500turkce` | `/harf500/` | `trpuzzle-harf500` |
| Baklava | `trpuzzle4` | `/baklava/` | `trpuzzle-baklava` |
| Bağla | `trpuzzle1` | `/bagla/` | `trpuzzle-bagla` |
| Kesme | `trpuzzle2` | `/kesme/` | `trpuzzle-kesme` |
| Şehirle | `trpuzzle3` | `/sehirle/` | `trpuzzle-sehirle` |
| Tilkile | `trpuzzle6` | `/tilkile/` | `trpuzzle-tilkile` |
| Arala | `trpuzzle7` | `/arala/` | `trpuzzle-arala` |

Oyunların uygulama kodu bu repository'de değildir. `netlify.toml`, yukarıdaki
oyun yollarını ilgili bağımsız Netlify sitelerine `200` durum kodlu proxy
kurallarıyla iletir; böylece tarayıcı adresi `trpuzzle.com` altında kalır. Oyun
bağlantılarını son eğik çizgiyle (`/oyun/`) yaz. Proxy kurallarına `301`
yönlendirmesi ekleme; bu mimaride yönlendirme döngüsü oluşturabilir.

Ana site ayrıca Hakkında, İletişim, Gizlilik ve Çerezler, Kullanım Koşulları ve
404 sayfalarını; arama motoru dosyalarını; ortak marka/font/görsel varlıklarını
barındırır.

## 2. Teknolojiler ve temel mimari

- Uygulama framework'süz, tamamen statik HTML, CSS ve tarayıcı JavaScript'idir.
  Node/npm bağımlılığı, `package.json` veya bir derleyici/bundler yoktur.
- Sayfalar çok sayfalı yapıdadır: ana sayfa `index.html`; bilgi/yasal sayfalar
  ayrı `.html` dosyalarıdır.
- Mevcut HTML sayfaları sayfa stillerini kendi `<style>` bloklarında taşır.
  Ana sayfanın etkileşimleri de `index.html` içindeki inline script'tedir.
  Kökte `styles.css` ve `script.js` bulunsa da mevcut HTML bunları yüklemez;
  yalnız bu dosyaları değiştirmenin canlı sayfayı değiştireceğini varsayma.
- `assets/fonts.css`, repository'deki WOFF2 Fraunces ve Baloo 2 dosyalarını
  `@font-face` ile tanımlar. Fontlar için CDN kullanılmaz.
- Tema tercihi bilgi/yasal/404 sayfalarında `trpuzzle-theme` localStorage
  anahtarıyla uygulanır. Ana sayfa mevcut durumda daima aydınlık temadadır.
- Netlify kök dizini (`publish = "."`) olduğu gibi yayımlar ve build komutu
  boştur. `netlify.toml` ayrıca proxy, güvenlik ve önbellek başlıklarını tanımlar.
- Repository'de GitHub Actions workflow'u yoktur. Otomatik test, lint ve
  type-check altyapısı da yoktur.

## 3. Önemli klasör ve dosyalar

- `index.html`: Sekiz oyun kartı, oyun/arşiv bağlantıları, yan menü, tanıtım
  alanı, footer, ana sayfanın inline CSS ve JavaScript'i.
- `hakkinda.html`, `iletisim.html`, `gizlilik.html`, `kosullar.html`: Bağımsız
  bilgi ve yasal sayfalar; her biri kendi inline stilini ve tema başlatma
  script'ini içerir.
- `404.html`: Özel bulunamadı sayfası.
- `netlify.toml`: Kökten statik yayın, sekiz oyun sitesi için reverse proxy
  kuralları, güvenlik ve cache başlıkları.
- `assets/`: Optimize logo/favicon, yerel font bildirimi ve `assets/fonts/`
  altındaki WOFF2 dosyaları; ayrıca oyun görselleri.
- `styles.css`, `script.js`: Harici stil/etkileşim kaynakları; mevcut sayfalara
  bağlı değildir. Inline sürümlerle olası farkları değişiklik öncesinde kontrol et.
- `robots.txt`, `sitemap.xml`: Tarama izni ve ana/yasal/oyun URL'leri.
- `README.md`: Projenin kısa tanımı ve oyun-repository eşlemesi.
- `CLAUDE.md`, `HANDOFF.md`: Geçmiş çalışma notlarıdır. Güncel kodla çelişirse
  kaynak dosyaları ve bu talimatları esas al; doğrulanmamış geçmiş notlarını
  gerçek kabul etme.
- Kökte birden fazla eski/büyük görsel de bulunur. Kullanımdaki dosyayı HTML
  referansından doğrula; örneğin header logosu `assets/logo.png` dosyasını
  kullanır, kökteki `logo.png` kaynak görseldir.

## 4. Kurulum, geliştirme ve doğrulama komutları

### Kurulum

Bağımlılık kurulumu yoktur. Repository'yi klonlamak dışında `npm install` veya
benzeri bir komut çalıştırma; bu projede böyle bir manifest bulunmaz.

### Yerel geliştirme

Repository kökünde statik bir HTTP sunucusu aç:

```bash
python3 -m http.server 8080
```

Ardından `http://localhost:8080/` adresini aç. `file://` yerine HTTP sunucusu
kullan; kökten başlayan asset ve sayfa yolları böyle doğru sınanır. Yerel Python
sunucusu Netlify proxy kurallarını uygulamaz, dolayısıyla `/harfle/` gibi oyun
yollarının yerelde 404 vermesi ana sayfa hatası değildir.

### Build

Build adımı yoktur. Netlify yapılandırmasının karşılığı, repository kökünü
olduğu gibi yayımlamaktır (`publish = "."`, boş `command`). Üretilmiş bir
`dist/` klasörü oluşturma.

### Test, lint ve type-check

Repository'de tanımlı test runner, lint aracı veya type-check aracı yoktur;
dolayısıyla bu kategoriler için çalıştırılabilecek proje komutu bulunmaz. Yeni
bir araç eklemeden `npm test`, `npm run lint` ya da `npm run typecheck` varmış
gibi belgelemeyin/çalıştırmayın.

Değişikliklerden sonra en az şu kontrolleri yap:

```bash
# Netlify TOML dosyasının söz dizimini Python 3.11+ ile doğrula
python3 -c 'import pathlib, tomllib; tomllib.loads(pathlib.Path("netlify.toml").read_text())'

# HTML dosyalarını stdlib parser ile ayrıştır
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path

for path in Path(".").glob("*.html"):
    parser = HTMLParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    print(f"OK: {path}")
PY

# Çalışma ağacındaki değişiklikleri ve istemeden eklenen dosyaları incele
git diff --check
git status --short
```

Ayrıca tarayıcıda masaüstü ve mobil genişliklerde ana sayfayı, değişen bağımsız
sayfaları, yan menüyü, oyun/arşiv bağlantılarını ve klavye odağını kontrol et.
Görsel veya davranışsal bir değişiklikte ekran görüntüsü al. Netlify proxy
davranışını doğrulamak gerekiyorsa deploy preview/canlı Netlify ortamını kullan.

## Değişiklik ilkeleri

- Kullanıcıya görünen metinler ve proje dokümantasyonu Türkçe olmalıdır.
- Harici CDN, analitik veya izleyici ekleme. Mevcut tasarım fontları ve temel
  varlıkları yerelden sunar. Çerez/veri toplama davranışı değişirse
  `gizlilik.html` içeriğini de aynı değişiklikte güncelle.
- Oyun yollarını ve `netlify.toml` hedef site adlarını oyun repository'leriyle
  koordinasyon olmadan değiştirme.
- Yeni veya değişen sayfalarda uygun `<title>`, description, canonical,
  favicon/font bağlantıları ve Hakkında/İletişim/Gizlilik/Koşullar footer
  bağlantılarını koru. İletişim adresi `info@trpuzzle.com`dur.
- Responsive davranışı ve erişilebilirlik niteliklerini (`aria-*`, görünür
  klavye odağı, Escape ile menüyü kapatma) koru.
- Ortak görünümü değiştirirken stillerin HTML dosyalarında tekrarlandığını
  unutma; yalnız bir kopyayı değiştirip diğer sayfaları istemeden farklı bırakma.
- İlgisiz büyük ikili görselleri yeniden kaydetme veya commit'e dahil etme.
