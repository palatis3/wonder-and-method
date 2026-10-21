const header=document.querySelector('.site-header');
// Shared disclosure deep links are handled once by site-navigation.js.
if(header){
 const root=document.documentElement;
 const updateHeader=()=>{const height=Math.ceil(header.getBoundingClientRect().height);root.style.setProperty('--site-header-height',`${height}px`);};
 if('ResizeObserver' in window)new ResizeObserver(updateHeader).observe(header);
 else window.addEventListener('resize',updateHeader,{passive:true});
 updateHeader();
 if(document.body.classList.contains('edition-living-city')){
  let headerQueued=false;
  const updateCityHeader=()=>{headerQueued=false;header.classList.toggle('is-scrolled',scrollY>24);};
  const scheduleCityHeader=()=>{if(!headerQueued){headerQueued=true;requestAnimationFrame(updateCityHeader);}};
  updateCityHeader();
  window.addEventListener('scroll',scheduleCityHeader,{passive:true});
  window.addEventListener('pageshow',scheduleCityHeader);
 }
 const topLink=document.querySelector('.back-to-top');
 if(topLink){
  root.classList.add('page-tools-ready');
  topLink.hidden=true;
  const floating=[topLink,document.querySelector('.support-chat-launch')].filter(Boolean);
  const reading='a[href],button,input:not([type="hidden"]),textarea,select,summary,video,audio,p,li,dt,dd,h1,h2,h3,h4,h5,h6,label,legend,th,td,figcaption,blockquote';
  const blocked=control=>{
   if(control.hidden||getComputedStyle(control).display==='none')return false;
   const r=control.getBoundingClientRect();
   if(!r.width||!r.height)return false;
   // A bounded local hit test works for dynamic content without walking the
   // full document on every scroll. Whole text blocks yield conservatively.
   const left=Math.max(0,r.left-4),right=Math.min(innerWidth-1,r.right+4),top=Math.max(0,r.top-4),bottom=Math.min(innerHeight-1,r.bottom+4);
   const cols=Math.ceil((right-left)/20),rows=Math.ceil((bottom-top)/12);
   for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    for(const hit of document.elementsFromPoint(left+(right-left)*x/Math.max(1,cols),top+(bottom-top)*y/Math.max(1,rows))){
     if(hit.closest('.support-chat,.site-tools,.site-header')||!hit.closest('main,footer'))continue;
     const content=hit.closest(reading);
     if(content)return true;
     if([...hit.childNodes].some(node=>node.nodeType===3&&node.textContent.trim()))return true;
    }
   }
   return false;
  };
  let queued=false,scrolling=false,scrollIdle;
  const updateTools=()=>{
   queued=false;
   const active=document.activeElement;
   // Separate show/hide thresholds prevent chatter near the top boundary.
   if(active!==topLink)topLink.hidden=scrollY<(topLink.hidden?520:360);
   root.classList.toggle('editing-form',!!active?.matches('input:not([type="hidden"]),textarea,select'));
   // Once a control yields, keep it hidden for the rest of this scroll gesture.
   // Reappearing in every gap between text lines caused visible flicker.
   const states=floating.map(control=>active!==control&&((scrolling&&control.classList.contains('is-obstructing-controls'))||blocked(control)));
   floating.forEach((control,index)=>control.classList.toggle('is-obstructing-controls',states[index]));
  };
  const scheduleTools=()=>{if(!queued){queued=true;requestAnimationFrame(updateTools);}};
  updateTools();
  window.addEventListener('scroll',()=>{
   scrolling=true;clearTimeout(scrollIdle);
   scrollIdle=setTimeout(()=>{scrolling=false;scheduleTools();},300);
   scheduleTools();
  },{passive:true});
  if('ResizeObserver' in window){const sizes=new ResizeObserver(scheduleTools);floating.forEach(control=>sizes.observe(control));}
  window.addEventListener('resize',scheduleTools,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleTools,{passive:true});
  document.addEventListener('focusin',scheduleTools);
  document.addEventListener('focusout',scheduleTools);
  document.addEventListener('page-tools-change',scheduleTools);
  document.addEventListener('toggle',scheduleTools,true);
  document.fonts?.ready.then(scheduleTools);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   header.querySelector('.wordmark')?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
