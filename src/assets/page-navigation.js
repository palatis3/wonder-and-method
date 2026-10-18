const header=document.querySelector('.site-header');
// Pricing details can be collapsed while links still reach the chosen plan.
function revealAnchor(){let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}if(!target)return;let details=target.closest('details'),changed=false;while(details){if(!details.open){details.open=true;changed=true;}details=details.parentElement?.closest('details');}if(changed)target.scrollIntoView({block:'start'});}
window.addEventListener('hashchange',revealAnchor);
requestAnimationFrame(revealAnchor);
const topLink=document.querySelector('.back-to-top');
if(header&&topLink){
 const root=document.documentElement;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let headerHeight=0;
 const updateHeader=()=>{const next=Math.ceil(header.getBoundingClientRect().height);if(next!==headerHeight){headerHeight=next;root.style.setProperty('--site-header-height',`${next}px`);}};
 if('ResizeObserver' in window)new ResizeObserver(updateHeader).observe(header);
 else {window.addEventListener('resize',updateHeader,{passive:true});requestAnimationFrame(updateHeader);}
 let queued=false;
 const updateScroll=()=>{queued=false;header.classList.toggle('is-scrolled',window.scrollY>16);topLink.hidden=false;};
 const onScroll=()=>{if(!queued){queued=true;requestAnimationFrame(updateScroll);}};
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('resize',onScroll,{passive:true});
 window.addEventListener('pageshow',()=>requestAnimationFrame(updateScroll));
 topLink.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  header.querySelector('.wordmark')?.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
 });
 requestAnimationFrame(updateScroll);
}
