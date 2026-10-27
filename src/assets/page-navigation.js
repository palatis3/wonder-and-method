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
  const narrowTools=matchMedia('(max-width:767px),(max-height:520px)');
  const readingSelector='main button,main summary,main input,main textarea,main select,main video[controls],main audio[controls],footer summary';
  const readingNodes=new Set(),nearby=new Set(),readingRects=new Map(),offsets=new Map();
  const rendered=node=>{
   if(!node.checkVisibility({checkVisibilityCSS:true}))return false;
   // Closed details can still expose descendant layout boxes to geometry APIs.
   for(let ancestor=node.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor.matches('details:not([open])')&&!ancestor.querySelector(':scope > summary')?.contains(node))return false;
   return true;
  };
  const invalidateReading=()=>{readingRects.clear();scheduleTools();};
  // IntersectionObserver shortlists viewport content, so a large directory does
  // not create thousands of text Ranges on every scroll. Cached rectangles use
  // document coordinates and survive scrolling, but not layout changes.
  const readingObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
   for(const entry of entries){if(entry.isIntersecting)nearby.add(entry.target);else nearby.delete(entry.target);}
   scheduleTools();
  },{rootMargin:'100px 0px'}):null;
  const collectReading=()=>{
   for(const node of readingNodes)if(!node.isConnected){readingObserver?.unobserve(node);readingNodes.delete(node);nearby.delete(node);readingRects.delete(node);}
   const candidates=new Set(document.querySelectorAll(readingSelector));
   for(const region of document.querySelectorAll('main,footer')){
    const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())if(walker.currentNode.textContent.trim()&&!walker.currentNode.parentElement.closest('script,style'))candidates.add(walker.currentNode.parentElement);
   }
   for(const node of candidates)if(!readingNodes.has(node)){readingNodes.add(node);readingObserver?.observe(node);}
   invalidateReading();
  };
  const viewportReading=()=>{
   const rects=[],viewTop=window.visualViewport?.offsetTop||0,viewBottom=viewTop+(window.visualViewport?.height||innerHeight);
   for(const node of readingObserver?nearby:readingNodes){
    const box=node.getBoundingClientRect();
    if(!box.width||!box.height||box.bottom<viewTop||box.top>viewBottom||!rendered(node))continue;
    let cached=readingRects.get(node);
    if(!cached){
     const boxes=[];
     if(node.matches('button,summary,input,textarea,select,video[controls],audio[controls]'))boxes.push(box);
     else{
      for(const text of node.childNodes)if(text.nodeType===Node.TEXT_NODE&&text.textContent.trim()){
       const range=document.createRange();range.selectNodeContents(text);boxes.push(...range.getClientRects());
      }
     }
     cached=boxes.map(r=>({left:r.left+scrollX,right:r.right+scrollX,top:r.top+scrollY,bottom:r.bottom+scrollY}));readingRects.set(node,cached);
    }
    rects.push(...cached.map(r=>({left:r.left-scrollX,right:r.right-scrollX,top:r.top-scrollY,bottom:r.bottom-scrollY})));
   }
   return rects;
  };
  const placeTool=(control,rects,active)=>{
   if(!narrowTools.matches){control.style.removeProperty('translate');offsets.delete(control);return false;}
   if(active===control||root.classList.contains('chat-is-open')||control.getAttribute('aria-disabled')==='true')return false;
   if(control.hidden||!control.getClientRects().length)return false;
   const r=control.getBoundingClientRect(),previous=offsets.get(control)||0,baseTop=r.top-previous;
   const minimum=Math.max((window.visualViewport?.offsetTop||0)+8,header.getBoundingClientRect().bottom+8);
   const blocks=rects.filter(t=>t.right>r.left-8&&t.left<r.right+8);
   const clear=(top,padding=8)=>top>=minimum&&blocks.every(t=>t.bottom<=top-padding||t.top>=top+r.height+padding);
   // Retain a safe slot rather than jump back to the corner at every paragraph.
   // Return to the default only after it has a larger clearance margin.
   let top=clear(baseTop,16)?baseTop:clear(r.top)?r.top:null;
   if(top===null){
    const candidates=[baseTop,...blocks.map(t=>t.top-r.height-8)].filter(y=>y<=baseTop).sort((a,b)=>b-a);
    top=candidates.find(y=>clear(y));
   }
   if(top===undefined||top===null)return true;
   const offset=top-baseTop;offsets.set(control,offset);control.style.translate=`0 ${offset}px`;
   return false;
  };
  const updateTools=()=>{
   queued=false;
   const active=document.activeElement;
   // Separate show/hide thresholds prevent chatter near the top boundary.
   if(active!==topLink)topLink.hidden=scrollY<(topLink.hidden?520:360);
   root.classList.toggle('editing-form',!!active?.matches('input:not([type="hidden"]),textarea,select'));
   // Mobile corner tools use a clear reading gap, yielding when none fits.
   // Focused tools stay put; desktop retains its existing corner placement.
   const reading=narrowTools.matches?viewportReading():[];
   const readingBlocked=floating.map(control=>placeTool(control,reading,active));
   const formControls=[...document.querySelectorAll('#inquiry input:not([type="hidden"]),#inquiry textarea,#inquiry select,#inquiry button,#inquiry summary')].filter(field=>field.getClientRects().length&&!field.closest('[hidden],.honeypot')&&rendered(field));
   const overlapsField=control=>{const r=control.getBoundingClientRect();return formControls.some(field=>{const t=field.getBoundingClientRect();return t.width&&t.height&&Math.min(r.right,t.right)>Math.max(r.left,t.left)-8&&Math.min(r.bottom,t.bottom)>Math.max(r.top,t.top)-8;});};
   const states=floating.map((control,index)=>readingBlocked[index]||blocked(control,active)||overlapsField(control));
   floating.forEach((control,index)=>control.classList.toggle('is-obstructing-controls',states[index]));
  };
  const scheduleTools=()=>{if(!queued){queued=true;requestAnimationFrame(updateTools);}};
  collectReading();
  for(const region of document.querySelectorAll('main,footer')){
   new MutationObserver(collectReading).observe(region,{childList:true,subtree:true,characterData:true});
   if('ResizeObserver' in window)new ResizeObserver(invalidateReading).observe(region);
  }
  updateTools();
  window.addEventListener('scroll',scheduleTools,{passive:true});
  document.addEventListener('scroll',event=>{if(event.target!==document)invalidateReading();},{capture:true,passive:true});
  if('ResizeObserver' in window){const sizes=new ResizeObserver(scheduleTools);floating.forEach(control=>sizes.observe(control));}
  window.addEventListener('resize',invalidateReading,{passive:true});
  window.visualViewport?.addEventListener('resize',invalidateReading,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleTools,{passive:true});
  document.addEventListener('focusin',scheduleTools);
  document.addEventListener('focusout',scheduleTools);
  document.addEventListener('page-tools-change',scheduleTools);
  document.addEventListener('toggle',invalidateReading,true);
  document.fonts?.ready.then(invalidateReading);

  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  topLink.addEventListener('click',event=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();
   (header.querySelector('.wordmark')||header.querySelector('a[href]'))?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
  });
 }
}
