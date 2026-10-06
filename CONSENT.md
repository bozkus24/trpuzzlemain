# TrPuzzle çerez ve rıza sistemi

6 Ekim 2026. Ana site, bilgi sayfaları ve sekiz oyunun ortak uygulamasıdır.
Özel kategori paneli Google tarafından sertifikalandırılmış bir CMP değildir.
TCF kayıtları yalnız gerçek Google CMP tarafından üretilir; kod TC String uydurmaz.
Google'ın 1 Mart 2026 sonrası kayıtlar için istediği sürüm TCF v2.3'tür.
Bu uygulama AdSense onayı veya hukuki uygunluk garantisi vermez.

## Dosyalar ve yükleme sırası

Her HTML belgesinin başında, diğer bütün betiklerden önce, aynı inline
`gtag('consent','default',…)` kodu bulunur. Dört Google Consent Mode v2 sinyali
`denied` başlar. Ardından sırayla:

1. `/assets/consent-state.js`: senkron rıza kaydı ve işlevsellik depolaması.
2. `/assets/consent-config.js`: yayıncı ve bağımsız CMP etiketi ayarları.
3. `/assets/consent.css`: banner ve native dialog stilleri.
4. `/assets/privacy-controls.js`: defer; arayüz, TCF dinleyicisi, betik engelleme.

Eski `trpuzzle.privacy.v1` kaydı silinir; eski kabul yeni kategorilere taşınmaz.
Yeni `trpuzzle.consent.v2` kaydı dört kategori, politika sürümü, seçim zamanı ve
180 günlük son geçerlilik zamanını saklar. Bilgi sayfalarında panel vardır;
bu sayfalarda reklam ve analitik betikleri yüklenmez.

Oyunların Netlify ayarları ortak dört varlığı ana siteye 200 ile proxy eder.
trpuzzle.com üzerinde bütün yollar aynı origin'de olduğundan aynı kayıt kullanılır.
Netlify alt alanları, www, başka cihaz ve tarayıcılar için izin ayrı tutulur.
Tilkile'nin `index.html` dosyası `assemble.py` çıktısıdır; kaynak değişiklikleri
`index.src.html` ve `game.js` üzerindedir. Şehirle mevcut Vite derlemesini kullanır.
Yayın sırası: önce ortak varlıkları içeren ana site, sonra sekiz oyun.
Kullanıcının yayın talebiyle değişiklikler PR üzerinden main dalına birleştirilir;
Netlify üretim yayını ve gerçek sayfalardaki rıza akışı ayrıca doğrulanır.

## Reklamları etkinleştirmeden önce gereken hesap ayarı

`googleCmpScript` bilerek boştur. Kullanıcı yayımlanmış bir Google CMP mesajını
doğrulayamadığı için reklamlar şu anda kabul edilse bile kapalı kalır.
Bu alanı tahmini URL ile doldurup kurulumu tamamlanmış saymayın.

1. AdSense → Gizlilik ve mesajlaşma → Avrupa yönetmelikleri bölümünde trpuzzle.com
   için Türkçe mesaj oluşturup yayınlayın. İlk katmanda kabul, ret ve yönetim
   seçeneklerini eşit görünürlükte sunun. Google Advertising Products (755) ve
   gerçekten kullanılan sağlayıcıları dahil edin. TCF v2.3 desteğini doğrulayın.
2. Hesabın sağladığı, AdSense reklam etiketinden **bağımsız** Google CMP etiketinin
   `https://fundingchoicesmessages.google.com/i/pub-…` kaynak URL'sini
   `assets/consent-config.js` içindeki `googleCmpScript` alanına yerleştirin.
   Bağımsız etiket hesabınızda sunulmuyorsa desteklenen etiketleme yolunu Google'dan
   doğrulamadan `adsbygoogle.js` dosyasını CMP başlatmak için yüklemeyin.
3. Site Consent Mode sinyallerini kendisi yönetir. Google panelinin otomatik
   Consent Mode güncellemesini veya başka bir GTM/CMP consent yazıcısını ayrıca
   etkinleştirmeyin; bunlar yerel ret tercihini geçersiz kılmamalıdır.
4. Gerçek sağlayıcı/çerez adları ve saklama sürelerini `cerez-politikasi.html`
   envanterine ekleyin; hizmetin henüz kapalı olduğunu belirten hazırlık metnini
   güncelleyin. Veri sorumlusunun tam kimliği ve geçerli uluslararası aktarım
   düzenlemeleri işletmeci tarafından doğrulanmalıdır. Bunlar kaynaklarda yoktur;
   uydurulmamıştır. Politika sürümünü artırıp tekrar rıza isteyin.
5. Gerçek alan adında, AEA/Birleşik Krallık/İsviçre koşullarında ve Türkiye'de
   kabul, ret, kısmi seçim, geri alma ve sağlayıcı panelini test edin. Google'ın
   `?fc=alwaysshow&fctype=gdpr` önizlemesi yayımlanmış mesaj gerektirir.

Reklam izni + Google CMP'nin geçerli sinyali birlikte yoksa hiçbir AdSense isteği
yapılmaz. CMP hatası, bilinmeyen bölge, yalnız API hazır sinyali, boş TC String,
reddedilmiş Google sağlayıcısı veya açıklanmamış sağlayıcı reklamı açmaz. Reklam
ve kişiselleştirme birlikte seçildiğinden gerekli kişiselleştirme amaçları reddedilirse
bu uygulama kişiselleştirilmemiş/sınırlı reklama otomatik geçmez; reklamı kapatır.
Bu katı engelleme Basic Consent Mode yaklaşımıdır.

## İşlevsellik ve oyun verileri

`TrPuzzlePreferences` yalnız isteğe bağlı görünüm/klavye/yardım tercihleri için
kullanılır. İzin yokken sayfa belleğine, izin varken mevcut localStorage
anahtarlarına yazar. Ret, sürenin dolması veya sürüm değişikliği kalıcı tercihleri
temizler. Günlük ilerleme, oyun zorluğu (oyunun kuralları), arşiv ve istatistik
şemaları değiştirilmez. Oyun ayarları o anda kullanılmaya devam eder.

İzin geri alındığında önce `gtag('consent','update',…)` ile ret bildirilir.
Çalışan isteğe bağlı betik varsa sayfa yenilenir; script etiketini DOM'dan silmek
tek başına JavaScript'i durdurmadığından bu gereklidir. Diğer sekmeler, BFCache
geri dönüşü ve açık sayfada sürenin dolması da denetlenir. Yazma hatasında eski
kabulü bırakmamak için kayıt önce kaldırılır; gerekirse ret URL işaretiyle yenilenir.

## İleride eklenecek betikler

Gelecekteki isteğe bağlı betikleri normal `<script src>` olarak eklemeyin:

```html
<script type="text/plain" data-tp-consent="analytics" data-src="/analitik-ornegi.js"></script>
<script type="text/plain" data-tp-consent="functionality">
  // Yalnız işlevsellik izninde çalışacak kod.
</script>
```

Kategori `advertising`, `analytics` veya `functionality` olabilir. Etiketler
tek kez etkinleştirilir. Çalışmış bir kategorinin geri alınması sayfayı yeniler.
Google Analytics kullanılmıyor; `analyticsId` boştur. Etkinleştirmeden önce
politika, envanter ve rıza sürümü yenilenmelidir. Google sinyalleri ve reklam
kişiselleştirmesi Analytics yapılandırmasında ayrıca kapalıdır.

## Doğrulama

`node --test tests/privacy.test.cjs` gerçek Chromium ve Playwright kullanır.
Playwright'ın bulunduğu dizini `NODE_PATH`, gerekiyorsa tarayıcıyı `BROWSER_PATH`
ile belirtin. Testler gerçek reklam isteği göndermeden CMP/AdSense yanıtlarını
kontrollü olarak taklit eder. Bu, gerçek hesaptaki CMP mesajının doğrulanması
yerine geçmez. Yayın dosyaları `python3 tools/build_publish.py` ile üretilir.

Yerel doğrulama: 14 Chromium testi geçti. 19 yayımlanabilir HTML sayfasında
başlangıçta ret, kategori modalı, footer bağlantısı, ret kaydının yenilemede
hatırlanması ve rıza öncesi üçüncü taraf isteği bulunmaması kontrol edildi.
320/360 piksel mobil görünümü, açık/koyu tema ve klavye odağı incelendi.
Dokuz yayın çıktısı üretildi. Canlı oyun API'si bu ortamdan TLS bağlantısı
kurulamadığı için önizlemede 503 verdi; çözme/kaybetme akışları doğrulanamadı.

## Birincil kaynaklar

- [Google sertifikalı CMP koşulları](https://support.google.com/adsense/answer/13554116?hl=en)
- [Google TCF v2.3 geçişi](https://support.google.com/adsense/answer/9999955?hl=en)
- [Consent Mode kurulumu](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Privacy & Messaging API](https://developers.google.com/funding-choices/fc-api-docs)
- [IAB CMP API](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md)
- [KVKK çerez rehberi](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber)
