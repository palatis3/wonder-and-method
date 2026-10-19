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
 // Page tools stay in the document flow. No per-scroll layout measurements.
 const topLink=document.querySelector('.back-to-top');
 if(topLink){
  topLink.hidden=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   header.querySelector('.wordmark')?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
