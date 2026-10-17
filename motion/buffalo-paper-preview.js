const stage = document.querySelector('.paper-stage');
if (stage) {
  const video = stage.querySelector('video');
  const button = document.querySelector('.paper-controls button');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width:767px)');
  let failed = false;
  let inView = false;
  let ready = document.readyState === 'complete';
  let automaticStarted = false;
  const label = () => {
    button.textContent = video.ended ? 'Replay animation' : video.paused ? (video.currentTime > 0 ? 'Resume animation' : 'Play animation') : 'Pause animation';
    button.setAttribute('aria-pressed', String(!video.paused));
  };
  const play = async () => {
    if (failed) return;
    if (!video.hasAttribute('src')) { video.src = video.dataset.src; video.load(); }
    if (video.ended) video.currentTime = 0;
    try { await video.play(); } catch { label(); }
  };
  button.hidden = false;
  button.addEventListener('click', () => video.paused ? play() : video.pause());
  video.addEventListener('playing', () => {stage.classList.add('has-motion'); label();});
  video.addEventListener('pause', label);
  video.addEventListener('ended', label);
  video.addEventListener('error', () => {failed = true; stage.classList.remove('has-motion'); button.hidden = true;});
  document.addEventListener('visibilitychange', () => {if (document.hidden) video.pause();});
  const automatic = () => {
    if (ready && inView && !document.hidden && !automaticStarted && !reduced.matches && !phone.matches && !navigator.connection?.saveData) {
      automaticStarted = true;
      play();
    }
  };
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .1;
    if (!inView) video.pause(); else automatic();
  }, {threshold:.1}).observe(stage);
  reduced.addEventListener('change', () => {if (reduced.matches) {video.pause(); stage.classList.remove('has-motion');}});
  if (ready) automatic();
  else window.addEventListener('load', () => {ready = true; automatic();}, {once:true});
}
