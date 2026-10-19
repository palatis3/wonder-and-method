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
 const topLink=document.querySelector('.back-to-top');
 if(topLink){
  root.classList.add('page-tools-ready');
  topLink.hidden=true;
  const floating=[topLink,document.querySelector('.support-chat-launch')].filter(Boolean);
  const nearby=new Set();
  let queued=false,obstructions;
  const updateTools=()=>{
   queued=false;
   const active=document.activeElement;
   root.classList.toggle('editing-form',!!active?.matches('input:not([type="hidden"]),textarea,select'));
   // Only controls entering the bottom strip are measured, never every link on scroll.
   const bounds=[...nearby].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
   for(const control of floating){
    const r=control.getBoundingClientRect();
    control.classList.toggle('is-obstructing-controls',bounds.some(p=>r.left<p.right&&r.right>p.left));
   }
  };
  const scheduleTools=()=>{if(!queued){queued=true;requestAnimationFrame(updateTools);}};
  const observeBottom=()=>{
   obstructions?.disconnect();nearby.clear();
   if('IntersectionObserver' in window){
    const strip=Math.ceil(Math.max(96,...floating.map(control=>{
     const container=control===topLink?control:control.closest('.support-chat');
     return control.getBoundingClientRect().height+(parseFloat(getComputedStyle(container).bottom)||0)+16;
    })));
    obstructions=new IntersectionObserver(entries=>{
     for(const entry of entries){if(entry.isIntersecting)nearby.add(entry.target);else nearby.delete(entry.target);}
     scheduleTools();
    },{rootMargin:`-${Math.max(0,innerHeight-strip)}px 0px 0px 0px`});
    document.querySelectorAll('main a,main button,main input:not([type="hidden"]),main textarea,main select,main summary,main video[controls],.civic-controls,footer a,footer summary').forEach(el=>obstructions.observe(el));
   }
   scheduleTools();
  };
  if('IntersectionObserver' in window){
   const start=document.createElement('span');
   start.className='page-top-observer';start.setAttribute('aria-hidden','true');document.body.prepend(start);
   new IntersectionObserver(entries=>{topLink.hidden=entries[0].isIntersecting;scheduleTools();},{rootMargin:'480px 0px 0px 0px'}).observe(start);
  }else{
   const updateTop=()=>{topLink.hidden=scrollY<480;};
   window.addEventListener('scroll',updateTop,{passive:true});updateTop();
  }
  observeBottom();
  if('ResizeObserver' in window){const sizes=new ResizeObserver(observeBottom);floating.forEach(control=>sizes.observe(control));}
  window.addEventListener('resize',observeBottom,{passive:true});
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
