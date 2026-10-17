const header=document.querySelector('.site-header');
const topLink=document.querySelector('.back-to-top');
if(header&&topLink){
 const root=document.documentElement;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let headerHeight=0;
 const updateHeader=()=>{const next=Math.ceil(header.getBoundingClientRect().height);if(next!==headerHeight){headerHeight=next;root.style.setProperty('--site-header-height',`${next}px`);}};
 updateHeader();
 if('ResizeObserver' in window)new ResizeObserver(updateHeader).observe(header);
 else window.addEventListener('resize',updateHeader,{passive:true});
 let queued=false;
 const updateScroll=()=>{queued=false;header.classList.toggle('is-scrolled',window.scrollY>16);topLink.hidden=window.scrollY<Math.max(480,window.innerHeight*.75);};
 const onScroll=()=>{if(!queued){queued=true;requestAnimationFrame(updateScroll);}};
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('resize',onScroll,{passive:true});
 window.addEventListener('pageshow',updateScroll);
 const inquiry=document.querySelector('#inquiry');
 if(inquiry&&'IntersectionObserver' in window){
  new IntersectionObserver(([entry])=>document.body.classList.toggle('inquiry-in-view',entry.isIntersecting)).observe(inquiry);
 }
 const motionControls=document.querySelector('.civic-controls');
 if(motionControls&&'IntersectionObserver' in window){
  new IntersectionObserver(([entry])=>document.body.classList.toggle('motion-controls-in-view',entry.isIntersecting)).observe(motionControls);
 }
 topLink.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  header.querySelector('.wordmark')?.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
 });
 updateScroll();
}
