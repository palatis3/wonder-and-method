// Keep navigation independent of optional form, calculator and measurement code.
(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (!menu || !nav) return;
  const close = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Menu';
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  menu.addEventListener('click', () => {
    if (menu.getAttribute('aria-expanded') === 'true') { close(); menu.focus(); return; }
    menu.setAttribute('aria-expanded', 'true');
    menu.textContent = 'Close';
    nav.classList.add('is-open');
    document.body.classList.add('menu-open');
    nav.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', event => {
    if (menu.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { close(); menu.focus(); }
    if (event.key !== 'Tab') return;
    const controls = [menu, ...nav.querySelectorAll('a')];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); menu.focus(); }
  });
  matchMedia('(min-width:768px)').addEventListener('change', event => { if (event.matches) close(); });
  document.documentElement.classList.add('nav-ready');
})();
