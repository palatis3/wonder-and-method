const header=document.querySelector('.site-header');
// Open every containing disclosure before navigating to a deep link.
function revealAnchor(){
 let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}
 if(!target)return;
 let details=target.closest('details'),changed=false;
 while(details){if(!details.open){details.open=true;changed=true;}details=details.parentElement?.closest('details');}
 if(changed)target.scrollIntoView({block:'start'});
}
window.addEventListener('hashchange',revealAnchor);
requestAnimationFrame(revealAnchor);
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
  let queued=false;
  const updateTools=()=>{
   queued=false;
   const active=document.activeElement;
   // Separate show/hide thresholds prevent chatter near the top boundary.
   if(active!==topLink)topLink.hidden=scrollY<(topLink.hidden?520:360);
   root.classList.toggle('editing-form',!!active?.matches('input:not([type="hidden"]),textarea,select'));
   // Yield only to a keyboard-focused control, not every link passing during scrolling.
   const focused=active?.matches('a[href],button,input:not([type="hidden"]),textarea,select,summary,video[controls],audio[controls],[role="button"],[role="link"]')&&active.matches(':focus-visible')&&active.closest('main,footer')?active.getBoundingClientRect():null;
   for(const control of floating){
    const r=focused?control.getBoundingClientRect():null;
    control.classList.toggle('is-obstructing-controls',!!(focused&&r.left<focused.right&&r.right>focused.left&&r.top<focused.bottom&&r.bottom>focused.top));
   }
  };
  const scheduleTools=()=>{if(!queued){queued=true;requestAnimationFrame(updateTools);}};
  updateTools();
  window.addEventListener('scroll',scheduleTools,{passive:true});
  if('ResizeObserver' in window){const sizes=new ResizeObserver(scheduleTools);floating.forEach(control=>sizes.observe(control));}
  window.addEventListener('resize',scheduleTools,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleTools,{passive:true});
  document.addEventListener('focusin',scheduleTools);
  document.addEventListener('focusout',scheduleTools);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   header.querySelector('.wordmark')?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
