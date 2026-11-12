(function(){
  var root=document.documentElement; root.classList.add('js');
  // i18n for the few strings set from script (page text itself is generated per language by build.py)
  var LANG=(root.getAttribute('lang')||'en').slice(0,2);
  var I18N={
    zh:{'Close menu':'關閉選單','Open menu':'開啟選單','Photo viewer':'相片檢視器','Close':'關閉','Previous photo':'上一張','Next photo':'下一張'},
    ko:{'Close menu':'메뉴 닫기','Open menu':'메뉴 열기','Photo viewer':'사진 보기','Close':'닫기','Previous photo':'이전 사진','Next photo':'다음 사진'},
    ru:{'Close menu':'Закрыть меню','Open menu':'Открыть меню','Photo viewer':'Просмотр фото','Close':'Закрыть','Previous photo':'Предыдущее фото','Next photo':'Следующее фото'},
    es:{'Close menu':'Cerrar menú','Open menu':'Abrir menú','Photo viewer':'Visor de fotos','Close':'Cerrar','Previous photo':'Foto anterior','Next photo':'Foto siguiente'}
  };
  function t(s){ return (I18N[LANG]&&I18N[LANG][s])||s; }
  // Language switcher: remember the visitor's choice (no automatic redirect by browser language)
  [].slice.call(document.querySelectorAll('.lang-switch a[data-lang]')).forEach(function(a){
    a.addEventListener('click',function(){ try{ localStorage.setItem('mcoh-lang',a.getAttribute('data-lang')); }catch(_){} });
  });
  // Mobile nav
  var header=document.querySelector('.site-header'), toggle=document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      var open=header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?t('Close menu'):t('Open menu'));
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&header.classList.contains('nav-open')){header.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.focus();} });
    window.addEventListener('resize',function(){ if(window.innerWidth>900) header.classList.remove('nav-open'); });
  }
  // Scroll reveal
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window)){ els.forEach(function(el){el.classList.add('is-visible');}); }
  else{
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('is-visible'); io.unobserve(en.target);} });
    },{rootMargin:'0px 0px -8% 0px',threshold:0.06});
    els.forEach(function(el){io.observe(el);});
  }
  // Lightbox
  var items=[].slice.call(document.querySelectorAll('[data-lightbox]'));
  if(items.length){
    var lb=document.createElement('div'); lb.className='lightbox'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true'); lb.setAttribute('aria-label',t('Photo viewer'));
    lb.innerHTML='<button class="lb-btn lb-close" aria-label="'+t('Close')+'">&times;</button><button class="lb-btn lb-prev" aria-label="'+t('Previous photo')+'">&#8249;</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-btn lb-next" aria-label="'+t('Next photo')+'">&#8250;</button>';
    document.body.appendChild(lb);
    var img=lb.querySelector('img'), cap=lb.querySelector('figcaption'), idx=0, last=null;
    function show(i){ idx=(i+items.length)%items.length; var it=items[idx]; img.src=it.getAttribute('data-lightbox'); img.alt=it.querySelector('img').alt; cap.textContent=it.getAttribute('data-caption')||''; }
    function open(i){ last=document.activeElement; show(i); lb.classList.add('open'); document.body.style.overflow='hidden'; lb.querySelector('.lb-close').focus(); }
    function close(){ lb.classList.remove('open'); document.body.style.overflow=''; if(last) last.focus(); }
    items.forEach(function(it,i){ it.addEventListener('click',function(){open(i);}); });
    lb.querySelector('.lb-close').addEventListener('click',close);
    lb.querySelector('.lb-prev').addEventListener('click',function(){show(idx-1);});
    lb.querySelector('.lb-next').addEventListener('click',function(){show(idx+1);});
    lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
    document.addEventListener('keydown',function(e){ if(!lb.classList.contains('open')) return;
      if(e.key==='Escape') close(); else if(e.key==='ArrowLeft') show(idx-1); else if(e.key==='ArrowRight') show(idx+1); });
  }
  // Demo form
  var f=document.querySelector('form.demo');
  if(f){ f.addEventListener('submit',function(e){ e.preventDefault(); var m=f.querySelector('.form-msg'); m.classList.add('show'); m.focus(); }); }
  var y=document.getElementById('yr'); if(y) y.textContent=new Date().getFullYear();
})();
