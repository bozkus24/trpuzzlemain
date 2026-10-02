/* Oyunların ortak kısa anlatımı ve sonuçtan sonraki gezinme. */
(function () {
  const names = ['Harfle','Baklava','Bağla','Kesme','Tilkile','Arala','Şehirle','Harf500'];
  const paths = ['harfle','baklava','bagla','kesme','tilkile','arala','sehirle','harf500'];
  const title = document.querySelector('#tp-splash .tp-name');
  const game = title && title.textContent.trim();
  const configs = {
    Harfle: ['#howto .howto-modal', '#howto-ok', ['Beş harfli bir kelime yaz.','Yeşil doğru yerde, sarı başka yerde; gri harf yok.','Gizli kelimeyi altı tahminde bul.'], 'K A L E M'],
    Harf500: ['#perde-yardim .kutu', '#dugme-yardim-anladim', ['Beş harfli bir kelime yaz; sekiz hakkın var.','Sayılar kaç harfin doğru olduğunu söyler, hangileri olduğunu söylemez.','Not almak için harflere dokunup renklerini değiştir.'], 'K A L E M'],
    Baklava: ['#helpOverlay .modal', '#helpClose', ['İki karoya dokunarak harfleri yer değiştir.','Üç yatay ve üç dikey kelimeyi tamamla.','15 hamlen var; az hamle kullan, daha çok puan kazan.'], 'K ↔ A'],
    Arala: ['#helpModal .modal', '#helpOk', ['Beş harfli bir kelime yaz.','Gizli kelime iki alfabetik sınırın arasında kalır.','Aralığı daralt; 14 tahmin içinde bul.'], 'KAVUN < SEPET < TAVUK'],
    Tilkile: ['#help-modal .modal', '#help-modal .help-ok', ['Bir harf seç; varsa bütün yerleri açılır.','Hiçbir kelimede yoksa yeni bir kelime eklenir.','Sekiz kelimeyi aşmadan bütün harfleri bul.'], 'H → _ _ H _ _'],
    Kesme: ['#helpModal .sheet', '#helpGotIt', ['Şeklin içinden geçen bir çizgi çek.','Hedef iki eşit parça: 50:50.','55:45 veya daha dengeli kesimler kazanır.'], '50 │ 50'],
    'Bağla': ['#perdeYardim .modal', '#btnYardimAnladim', ['Ortak bağı olan dört kelimeyi seç.','Onayla; doğru grup birlikte açılır.','Dört grubu bul, dört hata hakkını koru.'], 'ELMA · ARMUT · ERİK · NAR']
  };
  // Only play surfaces suppress selection; instructions and text inputs remain selectable.
  const playSurface = '#board, .board, #tahta, #izgara, #keyboard, .keyboard, #klavye, .alpha, .map-wrap, .dragclone, .tp-demo, button, [role="button"]';
  function isPlayGesture(target) {
    return target instanceof Element &&
      !target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])') &&
      !!target.closest(playSurface);
  }
  // Native text/image dragging must not compete with tile pointer handlers.
  ['selectstart', 'dragstart'].forEach(type => {
    document.addEventListener(type, event => {
      if (isPlayGesture(event.target)) event.preventDefault();
    });
  });
  const style = document.createElement('style');
  style.textContent = `
    :is(${playSurface}), :is(${playSurface}) * {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    :is(${playSurface}) img, :is(${playSurface}) svg { -webkit-user-drag: none; }
    :is(${playSurface}) input, :is(${playSurface}) textarea,
    :is(${playSurface}) [contenteditable]:not([contenteditable="false"]) {
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }

    .tp-quick { text-align:left; font:15px/1.55 system-ui,sans-serif; color:inherit; }
    .tp-quick ol { padding-left:22px; margin:14px 0; }
    .tp-quick li { margin:8px 0; }
    .tp-demo { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center; min-height:66px; padding:12px 8px; border-radius:12px; background:rgba(127,127,127,.10); font-size:14px; font-weight:700; text-align:center; }
    .tp-demo-letters { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); max-width:310px; margin-inline:auto; }
    .tp-demo-letters > .tile, .tp-demo-letters > .kutucuk { width:100%; height:auto; min-width:0; aspect-ratio:1; box-sizing:border-box; }
    .tp-demo-letters > .tp-demo-caption { grid-column:1/-1; }
    .tp-help-box > h2, .tp-help-box > .mhead h2, .tp-help-box > .modal-bas h2 { text-align:center; margin:10px 0 22px; padding:6px 26px; line-height:1.3; }
    .tp-help-box > .mhead, .tp-help-box > .modal-bas { position:relative; display:block; margin:0; }
    .tp-help-box > .mhead .x, .tp-help-box > .modal-bas .kapat { position:absolute; top:0; right:0; }
    .tp-cut-demo { background:transparent; padding:0; }
    .tp-cut-demo svg { width:180px; height:126px; overflow:visible; }
    .tp-cut-line { stroke-dasharray:110; stroke-dashoffset:0; }
    @media(prefers-reduced-motion:no-preference) {
      .tp-cut-line { animation:tp-cut-line 3.6s ease-in-out infinite; }
      .tp-cut-left { animation:tp-cut-left 3.6s ease-in-out infinite; }
      .tp-cut-right { animation:tp-cut-right 3.6s ease-in-out infinite; }
      @keyframes tp-cut-line { 0%,15% {stroke-dashoffset:110;opacity:1} 50%,75% {stroke-dashoffset:0;opacity:1} 90%,100% {stroke-dashoffset:0;opacity:0} }
      @keyframes tp-cut-left { 0%,50%,100% {transform:translateX(0)} 65%,85% {transform:translateX(-7px)} }
      @keyframes tp-cut-right { 0%,50%,100% {transform:translateX(0)} 65%,85% {transform:translateX(7px)} }
    }
    .tp-demo-caption { display:block; width:100%; margin:6px 0 0; font:12px/1.4 system-ui; }
    .tp-help-details { margin:12px 0; text-align:left; }
    .tp-help-details > summary { cursor:pointer; padding:10px 0; font:600 13px system-ui; }
    .tp-quick-start { display:block; width:100%; min-height:46px; margin-top:14px; border:0; border-radius:24px; background:#202124; color:#fff; font:700 15px system-ui; cursor:pointer; }
    .tp-next { margin-top:18px; padding-top:16px; border-top:1px solid rgba(127,127,127,.25); text-align:center; font:14px/1.5 system-ui; }
    .tp-next[hidden] { display:none !important; }
    .tp-next a { display:block; color:inherit; margin:9px 0; padding:10px; border-radius:20px; text-decoration:none; }
    .tp-next a:last-child { background:#202124; color:#fff; }
    @media(prefers-reduced-motion:no-preference) { .tp-swap-demo { animation:tp-swap 2s ease-in-out 2; } @keyframes tp-swap { 50% { transform:rotateY(180deg); } } }
  `;
  document.head.appendChild(style);
  const cfg = configs[game];
  if (cfg) {
    const box = document.querySelector(cfg[0]);
    const originalStart = document.querySelector(cfg[1]);
    if (box && originalStart && !box.querySelector('.tp-quick')) {
      box.classList.add('tp-help-box');
      const children = Array.from(box.children);
      const details = document.createElement('details');
      details.className = 'tp-help-details';
      const summary = document.createElement('summary'); summary.textContent = 'Ayrıntılı kurallar ve puanlama'; details.append(summary);
      children.forEach(child => {
        // Başlık, kapatma ve mevcut tercih/başlama kontrollerini yerinde tut.
        if (child.matches('h2,button,.mhead,.modal-bas') || child.contains(originalStart) || child.querySelector('input[type="checkbox"]') || child.matches('label')) return;
        details.append(child);
      });
      const quick = document.createElement('section'); quick.className = 'tp-quick';
      const demo = document.createElement('div'); demo.className = 'tp-demo';
      if (game === 'Harf500' || game === 'Harfle') {
        demo.classList.add('tp-demo-letters');
        cfg[3].split(' ').forEach((letter,i) => {
          const tile=document.createElement(game==='Harf500'?'button':'span');tile.textContent=letter;
          if(game==='Harf500') { tile.type='button';tile.className='kutucuk dolu tiklanabilir tp-note-tile';tile.dataset.tone='0';tile.setAttribute('aria-label',letter+' harfi: işaretsiz. Rengi değiştirmek için dokun.');tile.addEventListener('click',()=>{const tone=(Number(tile.dataset.tone)+1)%4;tile.dataset.tone=String(tone);tile.dataset.boya=['','kirmizi','sari','yesil'][tone];tile.setAttribute('aria-label',letter+' harfi: '+['işaretsiz','yok','başka yerde','doğru yerde'][tone]);}); }
          else { tile.className='tile '+['correct','present','absent','absent','correct'][i]; }
          demo.append(tile);
        });
        if(game==='Harf500') { const caption=document.createElement('small');caption.className='tp-demo-caption';caption.textContent='Dene: harflere dokun. Bu yalnızca bir not örneği.';demo.append(caption); }
      } else { demo.textContent=cfg[3]; if(game==='Baklava')demo.classList.add('tp-swap-demo'); }
      const list=document.createElement('ol');cfg[2].forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});
      quick.append(demo,list);
      if(game==='Kesme') {
        demo.classList.add('tp-cut-demo');
        demo.innerHTML='<svg viewBox="0 0 180 126" role="img" aria-label="Bir şeklin çizgiyle iki eşit parçaya ayrılması"><g fill="#7c6be5" stroke="#4e4198" stroke-width="2"><path class="tp-cut-left" d="M90 18H58L38 42V86L58 108H90Z"/><path class="tp-cut-right" d="M90 18H122L142 42V86L122 108H90Z"/></g><path class="tp-cut-line" d="M90 8V118" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
      }
      const heading=box.querySelector('h2'); const headingBlock=heading && (heading.parentElement===box?heading:heading.parentElement);
      if(headingBlock) headingBlock.after(quick);else box.prepend(quick);
      quick.after(details);
      // Mevcut düğme aynı olay dinleyicisi ve tercih kaydıyla çalışmaya devam eder.
      originalStart.textContent='Başla';
      originalStart.classList.add('tp-quick-start');
      originalStart.hidden=false;
    }
  }
  const play = document.getElementById('tpPlay');
  if (play) play.addEventListener('click', () => {
    if (play.textContent.trim() !== 'Sonucu Gör') return;
    requestAnimationFrame(() => {
      // Tamamlanmış günlük oyun doğrudan kendi sonuç/istatistik ekranını açar.
      const selectors = {Harfle:'#stats-btn',Harf500:'#dugme-istatistik',Baklava:'#cdBtn',Arala:'#btnStats',Tilkile:'#stats-btn',Kesme:'#btnStats','Bağla':'#btnIst','Şehirle':'button[aria-label="İstatistikler"]'};
      const helpStart = cfg && document.querySelector(cfg[1]);
      if (helpStart && helpStart.getClientRects().length) helpStart.click();
      document.querySelector(selectors[game])?.click();
    });
  });
  const hosts = {
    Harfle:['#overlay .modal'], Harf500:['#perde-sonuc .kutu','#perde-istatistik .kutu'],
    Baklava:['#endOverlay .modal'], Arala:['#statsModal .modal'],
    Tilkile:['#end-modal .modal','#stats-modal .modal'], Kesme:['#statsModal .sheet'], 'Bağla':['#perdeSonuc .modal','#perdeIst .modal']
  };
  function refreshNext() {
    if(!window.TrPuzzleProgress) return;
    const progress=window.TrPuzzleProgress(new Date());
    const current=progress[game];
    (hosts[game]||[]).forEach(selector=>{
      const host=document.querySelector(selector);if(!host)return;
      let section=host.querySelector('.tp-next');
      if(!section) {section=document.createElement('section');section.className='tp-next';section.innerHTML='<span></span><a href="/">Bugünkü oyunlara dön</a><a class="tp-next-game"></a>';host.append(section);}
      const hidden=current!=='completed';if(section.hidden!==hidden)section.hidden=hidden;
      if(hidden)return;
      const next=names.find(n=>n!==game&&progress[n]!=='completed');
      const message=next?'Bugün bir bulmaca daha?':'Harika, bugünkü sekiz oyunu tamamladın!';
      if(section.firstChild.textContent!==message)section.firstChild.textContent=message;
      const link=section.querySelector('.tp-next-game');
      link.hidden=false;
      if(!next) { link.textContent='Arşivden oyna'; link.setAttribute('href','/'+(game==='Şehirle'?'harfle':paths[names.indexOf(game)])+'/#arsiv'); }
      if(next) { const label=next+' · '+(progress[next]==='started'?'Devam Et':'Oyna');if(link.textContent!==label)link.textContent=label;const href='/'+paths[names.indexOf(next)]+'/';if(link.getAttribute('href')!==href)link.setAttribute('href',href); }
    });
  }
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refreshNext();});}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  refreshNext();
})();
