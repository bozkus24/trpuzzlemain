# HANDOFF — TrPuzzle (sonraki oturum için)

Son güncelleme: 25 Ağustos 2026. Proje kuralları için önce `CLAUDE.md` oku.

## Mevcut durum
- **Site canlı:** trpuzzle.com Netlify'da, Netlify DNS aktif. 9 ayrı Netlify
  sitesi: anasayfa (bu repo) + 8 oyun; `/oyun/` yolları netlify.toml proxy'siyle
  oyun sitelerine bağlı (site adları `trpuzzle-<oyun>`, adres çubuğu hep
  trpuzzle.com). Oyunlara tıklayınca açıldığı kullanıcı tarafından doğrulandı.
- Oyun repoları: trpuzzle1(Bağla), 2(Kesme), 3(Şehirle, Vite), 4(Baklava),
  5(Harfle), 6(Tilkile), 7(Arala), word500turkce(Harf500). Bu oturumda
  `/workspace/<repo>` altında push yetkili klonlar vardı — **yeni oturumda
  `add_repo` ile yeniden eklenmeleri gerekir.**

## Tamamlanan işler (hepsi main'de, canlıda)
- Anasayfa tasarımı: koyu "gece salonu" + aydınlık mod (toggle, localStorage),
  8 açıklamalı oyun kartı, tanıtım bölümü, özgün SVG oyun ikonları
- Yasal/güven: gizlilik, koşullar, hakkında, iletişim sayfaları; 4 linkli
  footer'lar; 404, robots.txt, sitemap.xml, canonical+OG etiketleri
- Fontlar tamamen yerel (Fraunces, Baloo 2) — sitede 0 harici istek
- AdSense denetimi yapıldı (rapor artifact'i var) ve checklist'i uygulandı:
  her oyuna ~220 kelimelik "nasıl oynanır+ipuçları+SSS" bölümü (`.tp-bilgi`),
  TrPuzzle mini footer, canonical/OG/H1/description tamamlamaları
- Oyun düzeltmeleri: Harf500'den **Firebase tamamen söküldü**; Kesme'de
  DAILY_UNLIMITED=false; Bağla/Harf500 eski netlify.app adresleri düzeltildi;
  Harfle'ye DOCTYPE; tüm oyunlarda "Nasıl Oynanır" masaüstünde 600px

## Önemli kararlar
- **KULLANICI "commit et" DEMEDEN COMMIT/PUSH/PR YAPILMAZ** (stop-hook
  uyarıları dahil hiçbir şey bunu geçersiz kılmaz)
- Akış: claude/* branch → PR → merge (kullanıcı onayıyla); Netlify otomatik yayınlar
- Proxy'de 301 kuralı yasak (redirect döngüsü yaşandı); linkler `/oyun/` biçiminde
- Sıfır harici istek + çerezsizlik ilkesi (gizlilik.html bu beyanı verir)
- İletişim adresi: info@trpuzzle.com
- word500turkce'nin default branch'i `claude/other-site-code-fipo6c`; main'e
  her merge'de bu branch da fast-forward ile eşitleniyor (Netlify uyumu)

## Bekleyen işler
1. **Bu repoda commit bekleyen dosyalar:** `CLAUDE.md`, `HANDOFF.md`
   (kullanıcı onayı bekleniyor)
2. **Mail MX kayıtları:** info@ kutusu Natro'da mevcut ama **mail alamıyor** —
   Natro'nun MX/sunucu bilgileri alınıp Netlify DNS'e girilmedi. Kullanıcı
   Natro destek talebiyle MX değerlerini isteyecekti; değerler gelince
   Netlify → Domains → DNS records'a MX (+SPF TXT) yazılacak
3. **Google Search Console:** kullanıcı domain'i ekleyecek (TXT doğrulaması
   Netlify DNS'e), sitemap.xml gönderilecek
4. **AdSense başvurusu:** 1-2 hafta dizinlenme sonrası. Onay gelince: reklam
   kodu + Google onaylı çerez onayı (CMP) + ads.txt + gizlilik politikasına
   reklam çerezi bölümü (şu anki "çerez yok" beyanı değişecek)
5. İsteğe bağlı sonrası: schema.org işaretlemesi, blog/rehber bölümü,
   trpuzzle6-7'deki ölü dosya temizlikleri, trpuzzlemain'deki eski gh-pages
   branch'inin silinmesi

## Bilinen sorunlar / tuzaklar
- Bu ortamdan canlı adreslere (trpuzzle.com, *.netlify.app, github.io) erişim
  proxy'ce engelli — canlı doğrulama kullanıcıdan istenir
- trpuzzle3'te `npm install` package-lock.json'u yeniden yazıyor — commit'ten
  önce `git checkout -- package-lock.json`
- Kökteki `logo.png` 5.2MB kaynak dosya — okunmaz/kullanılmaz (assets/logo.png var)
- Kullanıcının Türkçesi/samimi üslubu: yanıtlar Türkçe, teknik kararlar net anlatılır

## İlgili artifact'ler (claude.ai)
- Anasayfa önizleme: artifact db16783e-6603-46d2-8100-4261753a1d36
- Netlify yayın rehberi: artifact 7bff1a86-1194-4065-bb49-e3ca0e2d518b
- AdSense denetim raporu: artifact b8431ae7-7b71-46b5-bce3-f79e4ff260b1
