// Intro and ambient keep separate decoded surfaces; the final intro frame
// remains visible until the ambient decoder has presented its first frame.
export function mountCivicSculpture(hero, env = globalThis) {
  const intro = hero.querySelector('#civic-motion');
  const ambient = hero.querySelector('#civic-ambient');
  const button = hero.querySelector('.civic-toggle');
  const replay = hero.querySelector('.civic-replay');
  const status = hero.querySelector('.civic-status');
  if (!intro?.dataset.src || !button) return;
  const doc = env.document;
  const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = env.matchMedia('(max-width: 767px)');
  // Keep a paired rendition for the whole session, including orientation changes.
  const mobileRendition = narrow.matches || (env.matchMedia('(max-width: 1100px)').matches && (env.devicePixelRatio || 1) <= 1.5);
  const connection = env.navigator.connection;
  const media = [intro, ...(ambient?.dataset.src ? [ambient] : [])];
  const hasAmbient = media.length === 2;
  let inView = false;
  let requested = false, failed = false, ended = false, phase = 'intro', epoch = 0;
  const active = () => phase === 'ambient' ? ambient : intro;
  const label = () => {
    button.hidden = failed;
    button.textContent = requested ? 'Pause animation' : ended ? 'Play animation' : phase === 'ambient' || intro.currentTime > 0 ? 'Resume animation' : 'Play animation';
    button.setAttribute('aria-label',button.textContent);
    if (replay) replay.hidden = true;
    hero.dataset.unavailable = String(failed);
    hero.dataset.playing = String(requested);
    hero.dataset.phase = phase;
  };
  const pause = () => {
    requested = false;
    epoch++;
    for (const video of media) video.pause();
    label();
  };
  const still = () => {
    hero.classList.remove('has-civic-motion');
    hero.classList.remove('has-civic-ambient');
  };
  const attach = video => {
    if (!video.hasAttribute('src')) {
      // Deferred until eligible/explicit play; ambient can then decode ahead.
      video.preload = 'auto';
      video.src = mobileRendition && video.dataset.mobileSrc ? video.dataset.mobileSrc : video.dataset.src;
      video.load();
    }
  };
  const present = (video, token) => {
    const reveal = () => {
      if (token !== epoch || !requested || video !== active() || video.paused || doc.hidden || !inView) return;
      hero.classList.add('has-civic-motion');
      if (video === ambient) hero.classList.add('has-civic-ambient');
      else hero.classList.remove('has-civic-ambient');
    };
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(reveal);
    else if (env.requestAnimationFrame) env.requestAnimationFrame(reveal);
    else reveal();
  };
  const play = async () => {
    if (failed || requested || doc.hidden) return;
    if (ended) { intro.currentTime = 0; ended = false; phase = 'intro'; }
    requested = true;
    const video = active(), token = ++epoch;
    status.textContent = '';
    attach(video);
    label();
    try {
      await video.play();
      // An earlier play promise must never pause or reveal a newer session.
      if (token !== epoch) return;
      if (!requested || doc.hidden || !inView) pause();
    } catch {
      if (token !== epoch || failed) return;
      failed = true;
      pause();
      still();
      status.textContent = 'Animation could not start. The finished image is shown.';
    }
  };
  // Download and play motion only after the visitor chooses its control.
  for (const video of media) {
    video.loop = video === ambient;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('playing', () => {
      if (video !== active()) { video.pause(); return; }
      if (!requested || doc.hidden || !inView) { pause(); return; }
      present(video, epoch);
      label();
    });
    video.addEventListener('pause', () => {
      // Native ended may send pause before ended; preserve transition intent.
      if (video === active() && requested && !video.ended) pause();
    });
    video.addEventListener('error', () => {
      failed = true;
      pause();
      still();
      status.textContent = 'Animation unavailable. The complete sculpture is shown.';
    });
  }
  // Give the phone intro a head start, with six seconds left to decode ambient.
  intro.addEventListener('timeupdate', () => {
    if (hasAmbient && phase === 'intro' && requested && inView && !doc.hidden && intro.currentTime >= 4) attach(ambient);
  });
  intro.addEventListener('ended', () => {
    if (phase !== 'intro' || !intro.ended || failed) return;
    const continuePlaying = requested;
    requested = false;
    epoch++;
    if (hasAmbient) {
      phase = 'ambient';
      ambient.currentTime = 0;
      if (continuePlaying && inView && !doc.hidden) void play();
      else label();
    } else { ended = true; label(); }
  });
  button.addEventListener('click', () => requested ? pause() : void play());
  doc.addEventListener('visibilitychange', () => {if(doc.hidden){pause();still();}});
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      pause(); still(); phase = 'intro'; ended = false;
      intro.currentTime = 0;
      if (hasAmbient) ambient.currentTime = 0;
      label();
    }
  });
  connection?.addEventListener?.('change', () => {if(connection.saveData){pause();still();}});
  if (env.IntersectionObserver) {
    new env.IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
      if (!inView) {pause();still();}
    }, {threshold: .25}).observe(hero.querySelector('.civic-stage'));
  } else { inView = true; }
  label();
}
if (typeof document !== 'undefined') {
  const hero = document.querySelector('.civic-hero');
  if (hero) mountCivicSculpture(hero);
}
