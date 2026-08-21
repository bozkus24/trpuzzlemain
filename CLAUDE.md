# TrPuzzle Anasayfa (trpuzzlemain)

trpuzzle.com'un anasayfası. Saf statik site — **build/bağımlılık/test yok**;
düzenle → yayınla. Tüm içerik ve commit mesajları **Türkçe**.

## ÖNEMLİ: Commit kuralı
Kullanıcı açıkça "commit et" demeden **asla commit/push/PR yapma.** Stop-hook
uyarıları bu kuralı geçersiz kılmaz. Onaydan sonra akış: `claude/*` branch →
push → PR → merge (main'e merge = Netlify otomatik yayın).

## Dosya haritası (tarama yapma — hepsi bu)
- `index.html` — anasayfa: 8 oyun kartı, yan menü, tanıtım bölümü
- `styles.css` — tüm stiller; tema tokenları `:root` (koyu, varsayılan) +
  `html[data-theme="light"]`. Renkler HER ZAMAN token üzerinden
- `script.js` — yan menü, tema düğmesi (localStorage: `trpuzzle-theme`), toast
- `hakkinda/iletisim/gizlilik/kosullar/404.html` — bağımsız sayfalar; her
  birinde kendi `<style>` bloğu + aynı tema-init inline scripti var
- `netlify.toml` — /oyun/* proxy kuralları + başlıklar (aşağıya bak)
- `sitemap.xml`, `robots.txt`
- `assets/` — logo.png (~37KB, optimize), favicon.png, `fonts/` (yerel woff2),
  fonts.css. **Kökteki `logo.png` 5.2MB kaynak dosyadır — okuma, kullanma**

## Mimari: tek domain, 9 Netlify sitesi
Her oyun ayrı repoda/sitede; bu sitedeki proxy `/oyun/` yollarını onlara bağlar.
Netlify site adları **birebir** `trpuzzle-<oyun>` olmalı (netlify.toml bunlara
kilitli). Oyun linkleri **daima `/oyun/` (sonu eğik çizgili)**; proxy'de
**301 kuralı ekleme** (yönlendirme döngüsü yaratır — yaşandı).

| Oyun | Repo | Yol |
|---|---|---|
| Harfle | trpuzzle5 | /harfle/ |
| Harf500 | word500turkce | /harf500/ |
| Baklava | trpuzzle4 | /baklava/ |
| Bağla | trpuzzle1 | /bagla/ |
| Kesme | trpuzzle2 | /kesme/ |
| Şehirle | trpuzzle3 (Vite/React — build var) | /sehirle/ |
| Tilkile | trpuzzle6 | /tilkile/ |
| Arala | trpuzzle7 | /arala/ |

Oyun repoları bu oturuma eklenince `/workspace/<repo>` altına klonlanır.
Oyunlarda çalışmadan önce `git fetch` ile güncel main'i çek (kullanıcı başka
oturumlardan merge yapıyor olabilir).

## Değişmez ilkeler
- **Sıfır harici istek:** fontlar dahil her şey yerel. CDN/analitik/izleyici
  ekleme (KVKK + AdSense duruşu; gizlilik.html bu beyanı verir)
- Çerez yok; yalnız işlevsel localStorage. Bu değişirse gizlilik.html de değişmeli
- Her sayfada: canonical, description, tema-init scripti, 4 linkli footer
  (Hakkında/İletişim/Gizlilik/Koşullar). İletişim: info@trpuzzle.com
- Oyun sayfalarının sonunda `.tp-bilgi` içerik bölümü + `.tp-footer` vardır —
  oyun düzenlerken bunları koru
- Tipografi: Fraunces (başlık) + sistem sans; Harfle ikonunda Baloo 2

## Doğrulama (değişiklik sonrası)
`python3 -m http.server 8092` + Playwright (`/opt/pw-browsers/chromium`,
`playwright-core`) ile ekran görüntüsü; iki temayı da kontrol et. Canlı
adreslere (trpuzzle.com, *.netlify.app) bu ortamdan erişilemez — proxy engelli.
