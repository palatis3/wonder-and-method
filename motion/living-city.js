// One optional film, with separate camera exports. HTML remains usable before this mounts.
const mounted = new WeakMap();

export function mountLivingCity(root, env = globalThis) {
  if (!root) return null;
  if (mounted.has(root)) return mounted.get(root);

  const doc = env.document;
  const video = root.querySelector('[data-city-film]');
  const playButton = root.querySelector('[data-city-play]');
  const replayButton = root.querySelector('[data-city-replay]');
  const status = root.querySelector('[data-city-status]');
  const projects = root.querySelector('[data-city-projects]') || root;
  const tablist = projects.querySelector('[role="tablist"]');
  const tabs = Array.from(projects.querySelectorAll('[data-city-project]'));
  const panels = Array.from(projects.querySelectorAll('[data-city-panel]'));
  const narrow = env.matchMedia?.('(max-width: 1023px)') || {matches: false};
  const reduced = env.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches: false};
  const cleanups = [];
  let observer, destroyed = false, phase = reduced.matches ? 'reduced' : 'idle';
  let intent = false, inView = true, pageInactive = false, loaded = false;
  let complete = false, failed = false, hasFrame = false, sourceKind = '';
  let epoch = 0, frameRequest = null, loadingTimer = null;

  const listen = (target, type, handler) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  const announce = message => { if (status && status.textContent !== message) status.textContent = message; };
  const setClass = (name, enabled) => root.classList[enabled ? 'add' : 'remove'](name);
  const allowed = () => !destroyed && !reduced.matches && !doc?.hidden && !pageInactive && inView;
  const preferredKind = () => narrow.matches ? 'mobile' : 'desktop';
  const sourceFor = kind => kind === 'mobile' ? video?.dataset.mobileSrc : video?.dataset.desktopSrc;

  const render = () => {
    root.dataset.cityState = phase;
    root.dataset.citySource = sourceKind || preferredKind();
    setClass('is-city-playing', phase === 'playing');
    setClass('is-city-complete', complete);
    setClass('has-city-frame', hasFrame);
    if (playButton && video) {
      playButton.hidden = false;
      playButton.disabled = reduced.matches;
      const label = reduced.matches ? 'Scene motion off' : intent ? 'Pause scene' : failed ? 'Retry scene' : complete ? 'Replay scene' : loaded ? 'Resume scene' : 'Play scene';
      playButton.textContent = label;
      playButton.setAttribute('aria-label', label);
      playButton.setAttribute('aria-pressed', String(intent));
    }
    if (replayButton) {
      if (complete && doc.activeElement === replayButton) playButton?.focus({preventScroll:true});
      replayButton.hidden = !loaded || reduced.matches || failed || complete;
      replayButton.disabled = reduced.matches;
      replayButton.textContent = 'Replay scene';
      replayButton.setAttribute('aria-label', 'Replay scene from the beginning');
    }
  };

  const clearLoadingTimer = () => {
    if (loadingTimer !== null) env.clearTimeout?.(loadingTimer);
    loadingTimer = null;
  };
  const cancelPending = () => {
    epoch++;
    clearLoadingTimer();
    if (frameRequest !== null) video?.cancelVideoFrameCallback?.(frameRequest);
    frameRequest = null;
  };
  const pauseMedia = () => { if (video && !video.paused) video.pause(); };
  const updatePoster = () => {
    const kind = sourceKind || preferredKind();
    const poster = kind === 'mobile' ? video?.dataset.mobilePoster : video?.dataset.desktopPoster;
    if (poster) video.poster = poster;
  };
  const releaseSource = () => {
    // load() after removing src restores the native poster and cancels resource selection.
    const wasLoaded = loaded;
    loaded = false;
    sourceKind = '';
    hasFrame = false;
    if (video && wasLoaded) { video.removeAttribute('src'); video.load(); }
    updatePoster();
  };
  const fail = () => {
    if (destroyed || reduced.matches) return;
    intent = false;
    failed = true;
    complete = false;
    phase = 'error';
    cancelPending();
    pauseMedia();
    releaseSource();
    render();
    announce('Scene unavailable. The still image is shown. You can try again.');
  };
  const startLoadingTimer = token => {
    clearLoadingTimer();
    if (env.setTimeout) loadingTimer = env.setTimeout(() => {
      if (token === epoch && intent && allowed() && phase === 'loading') fail();
    }, 15000);
  };
  const revealFrame = token => {
    if (hasFrame || frameRequest !== null) return;
    const reveal = () => {
      frameRequest = null;
      if (token !== epoch || !intent || !allowed() || video.paused) return;
      hasFrame = true;
      render();
    };
    if (video.requestVideoFrameCallback) frameRequest = video.requestVideoFrameCallback(reveal);
    else reveal();
  };

  const runPlay = () => {
    if (!video || !playButton || !intent || !allowed() || destroyed) return;
    if (phase === 'playing' || phase === 'loading') return;
    const token = ++epoch;
    phase = 'loading';
    render();
    try {
      if (!loaded) {
        sourceKind = preferredKind();
        const source = sourceFor(sourceKind);
        if (!source) { fail(); return; }
        updatePoster();
        loaded = true;
        video.preload = 'auto';
        video.src = source;
        video.load();
      }
      render();
      startLoadingTimer(token);
      Promise.resolve(video.play()).then(() => {
        // An obsolete promise must not disturb a newer, explicitly requested play.
        if (!intent || !allowed()) pauseMedia();
      }, () => {
        if (token === epoch && intent && allowed()) fail();
      });
    } catch {
      if (token === epoch) fail();
    }
  };
  const pause = (message = true) => {
    const wasRequested = intent;
    intent = false;
    cancelPending();
    if (!complete && !failed && !reduced.matches) phase = loaded ? 'paused' : 'idle';
    pauseMedia();
    render();
    if (message && wasRequested) announce('Scene paused.');
  };
  const play = (restart = false) => {
    if (!video || !playButton || reduced.matches || destroyed) return;
    if (restart || complete || failed) {
      pause(false);
      complete = false;
      failed = false;
      hasFrame = false;
      phase = 'idle';
      // A new camera is selected only at a deliberate restart, never mid-frame.
      if (loaded && sourceKind !== preferredKind()) releaseSource();
      if (loaded) {
        try { video.currentTime = 0; } catch { video.load(); }
      }
    }
    intent = true;
    announce('');
    if (allowed()) runPlay();
    else { phase = 'paused'; render(); }
  };
  const reconcile = () => {
    if (destroyed || !intent) return;
    if (!allowed()) {
      phase = 'paused';
      cancelPending();
      pauseMedia();
      render();
    } else runPlay();
  };

  if (status) {
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
  }

  // Swap actual panels in one synchronous turn. Each panel owns its original image,
  // name, category and destination, so those fields cannot drift out of sync.
  const pairs = tabs.map(tab => ({tab, panel: panels.find(panel => panel.dataset.cityPanel === tab.dataset.cityProject)}));
  const validTabs = tablist && pairs.length && pairs.every(({tab, panel}) => panel?.id && tab.getAttribute('aria-controls') === panel.id) && new Set(pairs.map(({panel}) => panel)).size === pairs.length;
  if (validTabs) {
    const select = (index, focus = false, interrupt = true) => {
      if (interrupt) pause();
      pairs.forEach(({tab, panel}, i) => {
        const selected = i === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panel.hidden = !selected;
        panel.inert = !selected;
        if (selected) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
      });
      root.dataset.cityProject = pairs[index].tab.dataset.cityProject;
      if (focus) pairs[index].tab.focus();
    };
    pairs.forEach(({tab}, index) => {
      listen(tab, 'click', () => select(index));
      listen(tab, 'keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = pairs.length - 1;
        else if (event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % pairs.length;
        else if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) next = (index - 1 + pairs.length) % pairs.length;
        else return;
        event.preventDefault();
        select(next, true);
      });
    });
    const initial = pairs.findIndex(({tab}) => tab.getAttribute('aria-selected') === 'true');
    select(initial < 0 ? 0 : initial, false, false);
    tablist.hidden = false;
  }
  for (const link of root.querySelectorAll('[data-city-project-link]')) listen(link, 'click', () => pause());

  if (video && playButton) {
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    updatePoster();
    listen(playButton, 'click', () => intent ? pause() : play());
    listen(replayButton, 'click', () => play(true));
    listen(video, 'playing', () => {
      if (!intent || !allowed() || !loaded) { pauseMedia(); return; }
      phase = 'playing';
      clearLoadingTimer();
      revealFrame(epoch);
      render();
    });
    listen(video, 'pause', () => {
      // Ignore queued pause events from our own cancellation or a completed film.
      if (video.paused && !video.ended && intent && allowed() && (phase === 'playing' || phase === 'loading')) pause();
    });
    for (const event of ['waiting', 'stalled']) listen(video, event, () => {
      if (!intent || !allowed() || !loaded) return;
      phase = 'loading';
      startLoadingTimer(epoch);
      render();
    });
    listen(video, 'error', () => { if (loaded && video.error) fail(); });
    listen(video, 'ended', () => {
      if (!loaded || !video.ended || failed || reduced.matches || destroyed) return;
      intent = false;
      complete = true;
      phase = 'ended';
      cancelPending();
      pauseMedia();
      render();
      announce('Scene complete. Explore the projects below.');
    });
    listen(doc, 'visibilitychange', reconcile);
    listen(env, 'pagehide', () => { pageInactive = true; reconcile(); });
    listen(env, 'pageshow', () => { pageInactive = false; reconcile(); });
    listen(narrow, 'change', () => {
      if (!loaded) { updatePoster(); render(); }
    });
    listen(reduced, 'change', () => {
      if (reduced.matches) {
        intent = false;
        complete = false;
        failed = false;
        phase = 'reduced';
        cancelPending();
        pauseMedia();
        releaseSource();
        announce('Scene motion is off to match your device setting.');
      } else { phase = 'idle'; announce(''); }
      render();
    });
    if (env.IntersectionObserver) {
      observer = new env.IntersectionObserver(entries => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        inView = entry.isIntersecting && entry.intersectionRatio > 0;
        reconcile();
      }, {threshold: 0});
      observer.observe(root.querySelector('[data-city-stage]') || video);
    }
  }

  render();
  root.dataset.cityReady = 'true';
  const controller = {destroy() {
    if (destroyed) return;
    pause(false);
    destroyed = true;
    observer?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    mounted.delete(root);
  }};
  mounted.set(root, controller);
  return controller;
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-living-city]')) mountLivingCity(root);
}
