/* Üretilen dosya: trpuzzlemain/tools/sync_splash_progress.py */
(function () {
  "use strict";
  function readProgress(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (e) { return {}; }
  }

  function hasGuesses(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function dailyProgress(now, selectedLevel) {
    const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
    const date = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    const dayId = Math.floor(Date.UTC(year, month, day) / 86400000);
    const puzzleNo = dayId - Date.UTC(2026, 7, 1) / 86400000 + 1;
    const midnight = new Date(year, month, day).getTime();
    const foxNo = Math.floor((midnight - new Date(2026, 7, 1).getTime()) / 86400000) + 1;
    const aralaDay = Math.round((midnight - new Date(2026, 0, 1).getTime()) / 86400000);

    const harfle = readProgress("trw-" + date);
    const settings = readProgress("word500tr.ayarlar");
    if (selectedLevel) settings.seviye = selectedLevel;
    const level = ["kolay", "standart", "zor"].includes(settings.seviye) ? settings.seviye : "standart";
    // Harf500 açılışta son seçilen seviyeyi yükler.
    const harf500 = readProgress("word500tr.oyun." + level + "." + date);
    const baklava = readProgress("petek-progress-v1")[dayId] || {};
    const tilkile = readProgress("foximax-daily-" + foxNo);
    const bagla = readProgress("baglantilar.gunluk." + puzzleNo);
    const sehirle = readProgress("iller-globle:daily:" + date);
    const oldArala = readProgress("aradle_day_v1");
    const arala = readProgress("aradle_days_v2")[aralaDay] ||
      (oldArala.day === aralaDay ? oldArala : {});

    const started = {
      Harfle: hasGuesses(harfle.guesses) && !harfle.done && !harfle.win,
      Harf500: harf500.surum === 1 && hasGuesses(harf500.gecmis) && !harf500.bitti && !harf500.kazandi,
      Baklava: baklava.phase === "play" && typeof baklava.swapsLeft === "number" &&
        baklava.swapsLeft > 0 && baklava.swapsLeft < 15,
      Arala: typeof arala.steps === "number" && arala.steps > 0 && !arala.done && !arala.lost && !arala.g,
      Tilkile: tilkile.status === "playing" && hasGuesses(tilkile.guessed),
      // Kesme tek hamlede biter; kaydedilmiş, yarım kalmış bir turu yoktur.
      Kesme: false,
      "Bağla": bagla.durum === "oyunda" && hasGuesses(bagla.tahminler),
      "Şehirle": hasGuesses(sehirle.guesses) && !sehirle.won && !sehirle.gaveUp
    };
    // Kesme günlük kayıtlarında UTC tarih kullanır ve tek hamlede tamamlanır.
    const kesme = readProgress("kesme2-day-" + now.toISOString().slice(0, 10));
    const aralaResult = readProgress("aradle_result_v1")[aralaDay];
    const completed = {
      Harfle: harfle.done === true || harfle.win === true,
      Harf500: harf500.surum === 1 && (harf500.bitti === true || harf500.kazandi === true),
      Baklava: baklava.phase === "win" || baklava.phase === "lose",
      Arala: arala.done === true || arala.lost === true || arala.g === true ||
        (typeof aralaResult === "number" && (aralaResult === -1 || (aralaResult >= 1 && aralaResult <= 5))),
      Tilkile: tilkile.status === "won" || tilkile.status === "lost",
      Kesme: Array.isArray(kesme.cut) && kesme.cut.length === 4,
      "Bağla": bagla.durum === "kazandi" || bagla.durum === "kaybetti",
      "Şehirle": sehirle.won === true || sehirle.gaveUp === true
    };
    const states = {};
    Object.keys(started).forEach(function (game) {
      states[game] = completed[game] ? "completed" : started[game] ? "started" : "new";
    });
    return states;
  }


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

})();
