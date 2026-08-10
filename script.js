/* ═══════════════════════════════════════════════
   TrPuzzle — Anasayfa etkileşimleri
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ---------- Yan menü ---------- */
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("overlay");
  const drawerClose = document.getElementById("drawerClose");

  function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  menuBtn.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  /* ---------- Toast ---------- */
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2000);
  }

  /* ---------- Oyna butonları ----------
     Oyunlar yayına alındığında butona data-url ekle:
       <a href="#" class="btn btn-play" data-game="Harfle"
          data-url="https://harfle.example.com">Oyna</a>
     data-url tanımlıysa oraya yönlendirir, değilse
     "çok yakında" mesajı gösterir. */
  const playLinks = document.querySelectorAll(".btn-play, .drawer-link");

  playLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      const url = link.dataset.url;
      if (url) {
        link.setAttribute("href", url);
        return; // normal yönlendirme çalışsın
      }
      e.preventDefault();
      const game = link.dataset.game || "Bu oyun";
      showToast(game + " çok yakında! 🚧");
    });
  });
})();
