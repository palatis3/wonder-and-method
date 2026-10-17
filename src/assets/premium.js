const hero = document.querySelector('.studio-hero');
if (hero) {
  const video = hero.querySelector('video');
  const button = hero.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const connection = navigator.connection;
  let userPaused = false;
  let inView = true;
  let failed = false;
  let ready = document.readyState === 'complete';
  const allowed = () => ready && !reduced.matches && !narrow.matches && !connection?.saveData && !failed;
  const updateButton = playing => {
    button.textContent = playing ? 'Pause motion' : 'Play motion';
    button.setAttribute('aria-pressed', String(playing));
    hero.classList.toggle('is-playing', playing);
  };
  const sync = async () => {
    button.hidden = !allowed();
    if (!allowed()) {
      video.pause();
      hero.classList.remove('has-motion');
      updateButton(false);
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
      return;
    }
    if (userPaused || document.hidden || !inView) { video.pause(); updateButton(false); return; }
    if (!video.hasAttribute('src')) { video.src = video.dataset.src; video.load(); }
    try { await video.play(); } catch { updateButton(false); }
  };
  video.addEventListener('playing', () => { hero.classList.add('has-motion'); updateButton(true); });
  video.addEventListener('pause', () => updateButton(false));
  video.addEventListener('error', () => { failed = true; sync(); });
  button.addEventListener('click', () => { userPaused = !video.paused; sync(); });
  reduced.addEventListener('change', sync);
  narrow.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, {threshold:0.05}).observe(hero);
  // Let the critical still and fonts arrive before requesting optional motion.
  if (ready) sync();
  else window.addEventListener('load', () => { ready = true; sync(); }, {once:true});
}
