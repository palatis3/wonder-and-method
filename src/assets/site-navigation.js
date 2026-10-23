// Keep navigation independent of optional form, calculator and measurement code.
(() => {
  const revealAnchor=()=>{
    let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}
    if(!target)return;
    let details=target.closest('details'),opened=false;
    while(details){if(!details.open){details.open=true;opened=true;}details=details.parentElement?.closest('details');}
    if(opened)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  };
  const afterParse=callback=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',callback,{once:true}):callback();
  afterParse(revealAnchor);
  window.addEventListener('hashchange',revealAnchor);
  // Native open disclosures remain fully usable when JavaScript is unavailable.
  const footerDesktop=matchMedia('(min-width:768px)');
  const syncFooter=()=>document.querySelectorAll('[data-responsive-footer]').forEach(group=>{group.open=footerDesktop.matches;});
  afterParse(syncFooter);
  footerDesktop.addEventListener('change',syncFooter);
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (!menu || !nav) return;
  const services = nav.querySelector('.service-navigation');
  const desktop = matchMedia('(min-width:1024px)');
  const serviceSummary = services?.querySelector('summary');
  const focusInNav = control => {
    if (!control) return;
    control.focus({preventScroll:true});
    const item=control.getBoundingClientRect(), viewport=nav.getBoundingClientRect();
    if(item.top<viewport.top)nav.scrollTop-=viewport.top-item.top;
    else if(item.bottom>viewport.bottom)nav.scrollTop+=item.bottom-viewport.bottom;
  };
  const syncServices = () => { if (services) services.open = false; };
  syncServices();
  const close = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Menu';
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  window.addEventListener('pageshow',event=>{if(event.persisted)close();});
  nav.addEventListener('click',event=>{if(event.target.closest('a[href]'))close();});
  menu.addEventListener('click', () => {
    if (menu.getAttribute('aria-expanded') === 'true') { close(); menu.focus(); return; }
    menu.setAttribute('aria-expanded', 'true');
    menu.textContent = 'Close';
    nav.classList.add('is-open');
    document.body.classList.add('menu-open');
    // Short/zoomed viewports may have scrolled the normally static header away.
    menu.focus();
    focusInNav(nav.querySelector('a'));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && desktop.matches && services?.open) {
      services.open=false;
      serviceSummary?.focus({preventScroll:true});
      return;
    }
    if (menu.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { close(); menu.focus(); }
    if (event.key !== 'Tab') return;
    const controls = [menu, ...nav.querySelectorAll('a,summary')].filter(control=>control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); focusInNav(controls.at(-1)); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); menu.focus(); }
  });
  desktop.addEventListener('change', event => { if (event.matches) close(); syncServices(); });
  document.addEventListener('click', event => {
    if (!desktop.matches && menu.getAttribute('aria-expanded')==='true' && !nav.contains(event.target) && !menu.contains(event.target))close();
    if (desktop.matches && services?.open && !services.contains(event.target)) services.open=false;
  });
  nav.addEventListener('focusout', () => {
    requestAnimationFrame(()=>{if(desktop.matches&&services?.open&&!services.contains(document.activeElement))services.open=false;});
  });
  document.documentElement.classList.add('nav-ready');
})();
