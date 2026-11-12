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

  // Plan-ahead day picker (pre-need page only)
  (function(){
    var box=document.querySelector('[data-plan-ahead]');
    if(!box) return;
    var daysBox=box.querySelector('.plan-ahead-days');
    var timeBtns=[].slice.call(box.querySelectorAll('.plan-ahead-times .plan-choice'));
    var placeBtns=[].slice.call(box.querySelectorAll('.plan-ahead-places .plan-choice'));
    var confirm=box.querySelector('[data-plan-confirm]');
    var status=box.querySelector('[data-plan-status]');
    if(!daysBox||!confirm||!timeBtns.length||!placeBtns.length) return;

    var lang=document.documentElement.getAttribute('lang')||'en';
    var phone=box.getAttribute('data-sms-phone')||'+14156680077';
    var template=box.getAttribute('data-sms-template')||"Hi, I'd like to plan ahead. Requested: {date}, {time}, {place}. My name:";
    var daysLabel=box.getAttribute('data-label-days')||'Choose a day';
    var needSel=box.getAttribute('data-need-selection')||'Select a day, a time, and where to meet first.';

    var shortWd, shortMd, longFmt;
    try{
      shortWd=new Intl.DateTimeFormat(lang,{weekday:'short'});
      shortMd=new Intl.DateTimeFormat(lang,{month:'short',day:'numeric'});
      longFmt=new Intl.DateTimeFormat(lang,{weekday:'long',month:'short',day:'numeric'});
    }catch(_){
      shortWd=new Intl.DateTimeFormat('en',{weekday:'short'});
      shortMd=new Intl.DateTimeFormat('en',{month:'short',day:'numeric'});
      longFmt=new Intl.DateTimeFormat('en',{weekday:'long',month:'short',day:'numeric'});
    }

    function ymd(d){
      var m=d.getMonth()+1, day=d.getDate();
      return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day;
    }
    function smsHref(body){ return 'sms:'+phone+'?&body='+encodeURIComponent(body); }

    var today=new Date();
    today=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    daysBox.setAttribute('aria-label',daysLabel);
    daysBox.textContent='';
    for(var i=0;i<6;i++){
      var d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i);
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='btn plan-choice';
      btn.setAttribute('aria-pressed','false');
      btn.setAttribute('data-iso',ymd(d));
      btn.setAttribute('data-long',longFmt.format(d));
      btn.setAttribute('aria-label',longFmt.format(d));
      var lab=document.createElement('span');
      lab.className='plan-day-label';
      var wd=document.createElement('span');
      wd.className='plan-day-wd';
      wd.textContent=shortWd.format(d);
      var md=document.createElement('span');
      md.className='plan-day-md';
      md.textContent=shortMd.format(d);
      lab.appendChild(wd);
      lab.appendChild(md);
      btn.appendChild(lab);
      daysBox.appendChild(btn);
    }
    var dayBtns=[].slice.call(daysBox.querySelectorAll('.plan-choice'));

    var selectedDay=null, selectedTime=null, selectedPlace=null;
    function updateConfirm(){
      if(selectedDay&&selectedTime&&selectedPlace){
        var body=template.replace('{date}',selectedDay).replace('{time}',selectedTime).replace('{place}',selectedPlace);
        confirm.setAttribute('href',smsHref(body));
        confirm.setAttribute('aria-disabled','false');
        if(status) status.textContent=selectedDay+', '+selectedTime+', '+selectedPlace;
      }else{
        confirm.setAttribute('href','#');
        confirm.setAttribute('aria-disabled','true');
      }
    }
    function press(group, btn){
      group.forEach(function(b){ b.setAttribute('aria-pressed', b===btn?'true':'false'); });
    }
    dayBtns.forEach(function(btn){
      btn.addEventListener('click',function(){
        press(dayBtns,btn);
        selectedDay=btn.getAttribute('data-long');
        updateConfirm();
      });
    });
    timeBtns.forEach(function(btn){
      btn.addEventListener('click',function(){
        press(timeBtns,btn);
        selectedTime=btn.getAttribute('data-time-label');
        updateConfirm();
      });
    });
    placeBtns.forEach(function(btn){
      btn.addEventListener('click',function(){
        press(placeBtns,btn);
        selectedPlace=btn.getAttribute('data-place-label');
        updateConfirm();
      });
    });
    confirm.addEventListener('click',function(e){
      if(confirm.getAttribute('aria-disabled')==='true'){
        e.preventDefault();
        if(status) status.textContent=needSel;
        if(!selectedDay&&dayBtns[0]) dayBtns[0].focus();
        else if(!selectedTime&&timeBtns[0]) timeBtns[0].focus();
        else if(!selectedPlace&&placeBtns[0]) placeBtns[0].focus();
      }
    });
    updateConfirm();
    box.classList.add('is-ready');
  })();

