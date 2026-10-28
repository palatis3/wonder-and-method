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
  root.classList.add('page-tools-ready');
  topLink.hidden=true;
  const floating=[topLink,document.querySelector('.support-chat-launch')].filter(Boolean);
  const blocked=(control,active)=>{
   if(!active?.matches('a[href],button,summary,video,audio,[tabindex]:not([tabindex="-1"])')||active===control||active.closest('.support-chat,.site-tools'))return false;
   if(control.hidden||getComputedStyle(control).display==='none')return false;
   const r=control.getBoundingClientRect(),target=active.getBoundingClientRect();
   return Math.min(r.right,target.right)>Math.max(r.left,target.left)-4&&Math.min(r.bottom,target.bottom)>Math.max(r.top,target.top)-4;
  };
  let queued=false;
  const rendered=node=>{
   if(!node.checkVisibility({checkVisibilityCSS:true}))return false;
   // Closed details can still expose descendant layout boxes to geometry APIs.
   for(let ancestor=node.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor.matches('details:not([open])')&&!ancestor.querySelector(':scope > summary')?.contains(node))return false;
   return true;
  };
  const updateTools=()=>{
   queued=false;
   const active=document.activeElement;
   // Separate show/hide thresholds prevent chatter near the top boundary.
   if(active!==topLink)topLink.hidden=scrollY<(topLink.hidden?520:360);
   root.classList.toggle('editing-form',!!active?.matches('input:not([type="hidden"]),textarea,select'));
   const formControls=[...document.querySelectorAll('#inquiry input:not([type="hidden"]),#inquiry textarea,#inquiry select,#inquiry button,#inquiry summary,[data-package-guide] select,[data-package-guide] button,[data-package-guide] a[href]')].filter(field=>field.getClientRects().length&&!field.closest('[hidden],.honeypot')&&rendered(field));
   const overlapsField=control=>{const r=control.getBoundingClientRect();return formControls.some(field=>{const t=field.getBoundingClientRect();return t.width&&t.height&&Math.min(r.right,t.right)>Math.max(r.left,t.left)-8&&Math.min(r.bottom,t.bottom)>Math.max(r.top,t.top)-8;});};
   // Keep the corner buttons stationary through ordinary reading and scrolling.
   // Only actual form/focus collisions suppress them, never passing prose.
   const states=floating.map(control=>blocked(control,active)||overlapsField(control));
   floating.forEach((control,index)=>control.classList.toggle('is-obstructing-controls',states[index]));
  };
  const scheduleTools=()=>{if(!queued){queued=true;requestAnimationFrame(updateTools);}};
  updateTools();
  window.addEventListener('scroll',scheduleTools,{passive:true});
  window.addEventListener('pageshow',scheduleTools);
  document.addEventListener('scroll',scheduleTools,{capture:true,passive:true});
  if('ResizeObserver' in window){const sizes=new ResizeObserver(scheduleTools);floating.forEach(control=>sizes.observe(control));}
  window.addEventListener('resize',scheduleTools,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleTools,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleTools,{passive:true});
  document.addEventListener('focusin',scheduleTools);
  document.addEventListener('focusout',scheduleTools);
  document.addEventListener('page-tools-change',scheduleTools);
  document.addEventListener('toggle',scheduleTools,true);
  document.fonts?.ready.then(scheduleTools);

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   (header.querySelector('.wordmark')||header.querySelector('a[href]'))?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
