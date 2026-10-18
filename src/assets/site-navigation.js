// Keep navigation independent of optional form, calculator and measurement code.
(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (!menu || !nav) return;
  const services = nav.querySelector('.service-navigation');
  const desktop = matchMedia('(min-width:1024px)');
  const serviceSummary = services?.querySelector('summary');
  const syncServices = () => { if (services) services.open = !desktop.matches; };
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
    nav.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && desktop.matches && services?.open) {
      services.open=false;
      serviceSummary?.focus();
      return;
    }
    if (menu.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { close(); menu.focus(); }
    if (event.key !== 'Tab') return;
    const controls = [menu, ...nav.querySelectorAll('a,summary')].filter(control=>control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
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
