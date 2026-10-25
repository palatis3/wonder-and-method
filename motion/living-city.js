// A twelve-second native introduction over a seamless rendered city loop.
// Playback time advances the story, so pausing or leaving the page holds both.
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
  const showcases = Array.from(root.querySelectorAll('[data-city-showcase]'));
  const choices = Array.from(root.querySelectorAll('[data-city-jump]'));
  const narrow = env.matchMedia?.('(max-width: 1023px)') || {matches: false};
  const reduced = env.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches: false};
  const cleanups = [];
  let observer, destroyed = false, phase = reduced.matches ? 'reduced' : 'idle';
  // An anchor navigation may mount with the hero already above the viewport.
  // Wait for the observer's first result before starting an automatic download.
  let intent = false, inView = !env.IntersectionObserver, pageInactive = false, loaded = false;
  let complete = false, failed = false, hasFrame = false, sourceKind = '';
  let epoch = 0, frameRequest = null, loadingTimer = null;
  let storyTime = 0, lastMediaTime = 0, lastProgressTime = 0, activeShowcase = '';
  const saveData = Boolean(env.navigator?.connection?.saveData);
  const preferenceKey = 'wm.city.motion';
  const rememberMotion = value => { try { env.sessionStorage?.setItem(preferenceKey, value); } catch { /* Storage may be unavailable. */ } };
  const pausedBefore = (() => { try { return env.sessionStorage?.getItem(preferenceKey) === 'paused'; } catch { return false; } })();
  const playedBefore = (() => { try { return env.sessionStorage?.getItem(preferenceKey) === 'playing'; } catch { return false; } })();

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

  const renderStory = () => {
    const next = !hasFrame || reduced.matches || failed || complete ? '' : storyTime < 1.5 ? '' : storyTime < 4.5 ? 'fieldwork' : storyTime < 7.5 ? 'northline' : storyTime < 10.5 ? 'hearthside' : '';
    root.dataset.cityBeat = complete ? 'ambient' : next || (storyTime >= 10.5 ? 'resolve' : 'arrival');
    root.dataset.cityElapsed = storyTime.toFixed(2);
    if (next === activeShowcase) return;
    activeShowcase = next;
    for (const card of showcases) {
      const selected = card.dataset.cityShowcase === next;
      card.dataset.active = String(selected);
      card.dataset.settled = 'false';
      card.inert = !selected;
      card.setAttribute('aria-hidden', String(!selected));
    }
    for (const choice of choices) choice.dataset.active = String(choice.dataset.cityJump === next);
  };

  const render = () => {
    root.dataset.cityState = phase;
    root.dataset.citySource = sourceKind || preferredKind();
    setClass('is-city-playing', phase === 'playing');
    setClass('is-city-complete', complete);
    setClass('has-city-frame', hasFrame);
    renderStory();
    if (playButton && video) {
      playButton.hidden = reduced.matches;
      playButton.disabled = reduced.matches;
      const label = reduced.matches ? 'Motion off' : intent ? 'Pause motion' : failed ? 'Retry motion' : phase === 'blocked' ? 'Play motion' : loaded ? 'Resume motion' : 'Play motion';
      playButton.textContent = label;
      playButton.setAttribute('aria-label', label);
      // The changing label names the next action, rather than a toggle state.
      playButton.removeAttribute('aria-pressed');
      if(reduced.matches)announce('Motion is off to match your device setting.');
    }
    if (replayButton) {
      replayButton.hidden = !loaded || reduced.matches || failed;
      replayButton.disabled = reduced.matches;
      replayButton.textContent = 'Replay introduction';
      replayButton.setAttribute('aria-label', 'Replay introduction');
    }
    for (const card of showcases) for (const animation of card.getAnimations?.({subtree:true}) || []) {
      if (phase === 'playing' && animation.playState === 'paused') animation.play();
      else if (phase !== 'playing' && animation.playState === 'running') animation.pause();
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
    if (!sourceKind) return; // The responsive picture is the initial still.
    const kind = sourceKind;
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
  const applyReducedMotion = () => {
    if (destroyed || !reduced.matches) return false;
    // Media callbacks can observe a preference before its change event arrives.
    // Apply the whole policy, including controls and source cleanup, in that case.
    if (phase === 'reduced') { pauseMedia(); return true; }
    intent = false;
    complete = false;
    failed = false;
    storyTime = 0;
    lastMediaTime = 0;
    lastProgressTime = 0;
    phase = 'reduced';
    cancelPending();
    pauseMedia();
    releaseSource();
    announce('Motion is off to match your device setting.');
    render();
    return true;
  };
  const fail = () => {
    if (destroyed || applyReducedMotion()) return;
    intent = false;
    failed = true;
    complete = false;
    phase = 'error';
    cancelPending();
    pauseMedia();
    releaseSource();
    render();
    announce('Motion unavailable. Explore the websites below, or try again.');
  };
  const startLoadingTimer = token => {
    clearLoadingTimer();
    if (env.setTimeout) loadingTimer = env.setTimeout(() => {
      if (token === epoch && intent && allowed() && phase === 'loading') fail();
    }, 15000);
  };
  const sampleStory = () => {
    if (applyReducedMotion()) return;
    if (!intent || !allowed() || video.paused || !hasFrame) return;
    const current = video.currentTime || 0;
    if (current !== lastProgressTime) {
      lastProgressTime = current;
      if (phase === 'loading') {
        phase = 'playing';
        clearLoadingTimer();
        render();
      }
    }
    if (complete) return;
    let elapsed = current - lastMediaTime;
    if (elapsed < 0 && Number.isFinite(video.duration)) elapsed += video.duration;
    lastMediaTime = current;
    if (elapsed >= 0) storyTime = Math.min(12, storyTime + elapsed);
    if (storyTime > 12 - 1e-6) storyTime = 12;
    complete = storyTime >= 12;
    render();
    if (complete) announce('Explore a website. The city keeps moving until you pause.');
  };
  const revealFrame = token => {
    if (frameRequest !== null || complete && hasFrame) return;
    const reveal = () => {
      frameRequest = null;
      if (applyReducedMotion()) return;
      if (token !== epoch || !intent || !allowed() || video.paused) return;
      hasFrame = true;
      sampleStory();
      render();
      if (video.requestVideoFrameCallback && !complete) revealFrame(token);
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
      for (const image of root.querySelectorAll('[data-city-preview-src]')) {
        if (image.dataset.cityPreviewSrcset) {image.srcset=image.dataset.cityPreviewSrcset;image.sizes='(max-width:767px) 90vw, (max-width:1023px) 600px, 46vw';}
        if (image.getAttribute('src') !== image.dataset.cityPreviewSrc) image.src = image.dataset.cityPreviewSrc;
      }
      Promise.resolve(video.play()).then(() => {
        if (applyReducedMotion()) return;
        // An obsolete promise must not disturb a newer, explicitly requested play.
        if (!intent || !allowed()) pauseMedia();
      }, error => {
        if (token !== epoch || !intent || !allowed()) return;
        if (error?.name === 'NotAllowedError') {
          intent = false;
          phase = 'blocked';
          cancelPending();
          pauseMedia();
          render();
          announce('Press Play motion to start the introduction.');
        } else fail();
      });
    } catch {
      if (token === epoch) fail();
    }
  };
  const pause = (message = true, remember = true) => {
    const wasRequested = intent;
    intent = false;
    if (remember) rememberMotion('paused');
    cancelPending();
    if (!failed && !reduced.matches) phase = loaded ? 'paused' : 'idle';
    pauseMedia();
    render();
    if (message && wasRequested) announce('Motion paused.');
  };
  const play = (restart = false, remember = true) => {
    if (!video || !playButton || destroyed || applyReducedMotion()) return;
    if (remember) rememberMotion('playing');
    if (restart || failed) {
      pause(false, false);
      complete = false;
      failed = false;
      hasFrame = false;
      storyTime = 0;
      lastMediaTime = 0;
      lastProgressTime = 0;
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
    if (applyReducedMotion()) return;
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
    const hashIndex = pairs.findIndex(({panel}) => '#' + panel.id === env.location?.hash);
    select(hashIndex < 0 ? initial < 0 ? 0 : initial : hashIndex, false, false);
    for (const link of choices) listen(link, 'click', () => {
      const index = pairs.findIndex(({tab}) => tab.dataset.cityProject === link.dataset.cityJump);
      if (index >= 0) { select(index); root.querySelector('[data-city-projects]')?.scrollIntoView?.({block:'start'}); }
    });
    listen(env, 'hashchange', () => {
      const index = pairs.findIndex(({panel}) => '#' + panel.id === env.location?.hash);
      if (index < 0 || root.dataset.cityProject === pairs[index].tab.dataset.cityProject) return;
      select(index);
      // A history fragment may target a panel that was hidden when native scrolling ran.
      pairs[index].panel.scrollIntoView?.({block:'start'});
    });
    tablist.hidden = false;
  }
  for (const link of root.querySelectorAll('[data-city-project-link]')) listen(link, 'click', () => pause());
  for (const card of showcases) {
    card.hidden = false;
    card.inert = true;
    card.setAttribute('aria-hidden', 'true');
    listen(card, 'focusin', () => {
      // Finish this entrance for keyboard reading, including after focus leaves.
      card.dataset.settled = 'true';
      pause();
    });
  }

  if (video && playButton) {
    video.autoplay = false;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'none';
    updatePoster();
    listen(playButton, 'click', () => intent ? pause() : play());
    listen(replayButton, 'click', () => play(true));
    listen(video, 'playing', () => {
      if (applyReducedMotion()) return;
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
      if (applyReducedMotion()) return;
      if (!intent || !allowed() || !loaded) return;
      phase = 'loading';
      startLoadingTimer(epoch);
      render();
    });
    listen(video, 'error', () => { if (loaded && video.error) fail(); });
    listen(video, 'timeupdate', sampleStory);
    listen(doc, 'visibilitychange', reconcile);
    listen(env, 'pagehide', () => { pageInactive = true; reconcile(); });
    listen(env, 'pageshow', () => { pageInactive = false; reconcile(); });
    listen(narrow, 'change', () => {
      if (!loaded) { updatePoster(); render(); }
    });
    listen(reduced, 'change', () => {
      if (applyReducedMotion()) return;
      phase = 'idle'; announce('');
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
    pause(false, false);
    destroyed = true;
    observer?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    mounted.delete(root);
  }};
  mounted.set(root, controller);
  // A first visit on a small screen shows the poster without fetching a film.
  // An explicit play choice can resume on later pages in the same tab.
  if (video && playButton && !reduced.matches && !saveData && !pausedBefore && (!narrow.matches || playedBefore)) play(false, false);
  return controller;
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-living-city]')) mountLivingCity(root);
}
