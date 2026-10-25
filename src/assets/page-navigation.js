const header=document.querySelector('.site-header');
// Static HTML keeps a keyboard-scrolling fallback when JavaScript is disabled.
// With JavaScript, only an actually scrollable table region needs a tab stop.
const tableRegions=[...document.querySelectorAll('.journal-table-wrap,.table-scroll,.comparison-scroll,.payment-schedule')].filter(region=>region.querySelector('table')&&region.hasAttribute('tabindex'));
const updateTableFocus=()=>{
 for(const region of tableRegions){
  const style=getComputedStyle(region);
  const scrollable=(/(auto|scroll)/.test(style.overflowX)&&region.scrollWidth>region.clientWidth+1)||(/(auto|scroll)/.test(style.overflowY)&&region.scrollHeight>region.clientHeight+1);
  if(scrollable)region.setAttribute('tabindex','0');
  else region.removeAttribute('tabindex');
 }
};
if(tableRegions.length){
 if('ResizeObserver' in window){const observer=new ResizeObserver(updateTableFocus);for(const region of tableRegions){observer.observe(region);observer.observe(region.querySelector('table'));}}
 else window.addEventListener('resize',updateTableFocus,{passive:true});
 document.addEventListener('toggle',updateTableFocus,true);
 document.fonts?.ready.then(updateTableFocus);
 updateTableFocus();
}
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
  // Page help stays in normal flow so it cannot cover text or controls.
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   header.querySelector('.wordmark')?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
