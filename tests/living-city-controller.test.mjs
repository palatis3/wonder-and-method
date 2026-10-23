import test from 'node:test';
import assert from 'node:assert/strict';
import {mountLivingCity} from '../motion/living-city.js';

// These stand-ins exercise the actual controller and native-style queued events.
// Rendering, decoding and keyboard accessibility still receive browser verification.
class Element extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.attrs = new Map();
    this.hidden = false;
    this.inert = false;
    this.textContent = '';
    this.classes = new Set();
    this.classList = {add: value => this.classes.add(value), remove: value => this.classes.delete(value)};
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); if (name === 'src') this.src = ''; }
  focus() { this.focusCalls = (this.focusCalls || 0) + 1; }
  emit(type, properties = {}) {
    const event = new Event(type, {cancelable: true});
    Object.assign(event, properties);
    this.dispatchEvent(event);
    return event;
  }
}

function fixture({autoplay = false, storage = new Map(), mobile = false, reduced = false, pending = false, reject = false, frames = true, missing = false, malformedTabs = false, videoPresent = true, initialIntersection = true, observer = true} = {}) {
  const root = new Element(), stage = new Element(), doc = new Element(), env = new Element();
  const button = new Element(), replay = new Element(), status = new Element(), projects = new Element(), tablist = new Element();
  button.hidden = replay.hidden = tablist.hidden = true;
  const keys = ['fieldwork', 'northline', 'hearthside'];
  const panels = keys.map(key => {
    const panel = new Element({cityPanel: key});
    panel.id = `panel-${key}`;
    panel.scrollIntoView = () => { panel.scrollCalls = (panel.scrollCalls || 0) + 1; };
    // Immutable panel content models real original assets and destinations.
    panel.content = {image: `${key}.webp`, name: key, category: `${key}-category`, href: `/${key}/`};
    return panel;
  });
  const tabs = keys.map((key, index) => {
    const tab = new Element({cityProject: key});
    tab.id = `tab-${key}`;
    tab.setAttribute('aria-controls', malformedTabs && index === 1 ? 'missing' : panels[index].id);
    tab.setAttribute('aria-selected', String(index === 0));
    return tab;
  });
  const links = keys.map(() => new Element());
  const previews = keys.map(key => new Element({cityPreviewSrc:`/${key}-1240.webp`,cityPreviewSrcset:`/${key}-480.webp 480w, /${key}-960.webp 960w, /${key}-1240.webp 1240w`}));
  const showcases = keys.map(key => { const card = new Element({cityShowcase:key}); card.hidden = true; return card; });
  const choices = keys.map(key => new Element({cityJump:key}));
  projects.querySelector = selector => selector === '[role="tablist"]' ? tablist : null;
  projects.querySelectorAll = selector => ({'[data-city-project]': tabs, '[data-city-panel]': panels}[selector] || []);
  const video = new Element(missing ? {} : {desktopSrc: '/city-desktop.mp4', mobileSrc: '/city-mobile.mp4', desktopPoster: '/desktop-first.webp', mobilePoster: '/mobile-first.webp'});
  Object.assign(video, {paused: true, ended: false, currentTime: 0, duration: 4, error: null, playCalls: 0, loads: 0, requests: [], frameCallbacks: new Map(), nextFrame: 0, pending, reject});
  video.load = () => { video.loads++; video.currentTime = 0; video.ended = false; video.error = null; video.paused = true; };
  video.pause = () => { if (!video.paused) { video.paused = true; video.emit('pause'); } };
  video.play = () => {
    video.playCalls++;
    video.ended = false;
    if (video.reject) return Promise.reject(video.reject instanceof Error ? video.reject : new Error('decode failed'));
    video.paused = false;
    if (video.pending) return new Promise((resolve, rejectRequest) => video.requests.push({resolve, reject: rejectRequest}));
    video.emit('playing');
    return Promise.resolve();
  };
  if (frames) {
    video.requestVideoFrameCallback = callback => { const id = ++video.nextFrame; video.frameCallbacks.set(id, callback); return id; };
    video.cancelVideoFrameCallback = id => video.frameCallbacks.delete(id);
  }
  video.presentFrame = () => { const pendingFrames = [...video.frameCallbacks.values()]; video.frameCallbacks.clear(); pendingFrames.forEach(callback => callback()); };
  root.querySelector = selector => ({'[data-city-film]': videoPresent ? video : null, '[data-city-play]': button, '[data-city-replay]': replay, '[data-city-status]': status, '[data-city-projects]': projects, '[data-city-stage]': stage}[selector] || null);
  root.querySelectorAll = selector => ({'[data-city-project-link]':links,'[data-city-showcase]':showcases,'[data-city-jump]':choices,'[data-city-preview-src]':previews}[selector] || []);
  doc.hidden = false;
  const queries = {};
  for (const [query, matches] of [['(max-width: 1023px)', mobile], ['(prefers-reduced-motion: reduce)', reduced]]) {
    queries[query] = new Element();
    queries[query].matches = matches;
  }
  let intersect, disconnected = false, timerId = 0;
  const timers = new Map();
  Object.assign(env, {
    document: doc, navigator: {connection: {saveData: !autoplay}}, location:{hash:''}, sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}, matchMedia: query => queries[query],
    setTimeout: callback => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    IntersectionObserver: observer ? class {
      constructor(callback) { intersect = callback; }
      observe(target) { assert.equal(target, stage); }
      disconnect() { disconnected = true; }
    } : undefined
  });
  const controller = mountLivingCity(root, env);
  if(initialIntersection !== null)intersect?.([{isIntersecting:initialIntersection,intersectionRatio:initialIntersection?1:0}]);
  const resize = value => { queries['(max-width: 1023px)'].matches = value; queries['(max-width: 1023px)'].emit('change'); };
  const reduce = value => { queries['(prefers-reduced-motion: reduce)'].matches = value; queries['(prefers-reduced-motion: reduce)'].emit('change'); };
  const visible = value => { doc.hidden = !value; doc.emit('visibilitychange'); };
  return {root, video, button, replay, showcases, choices, previews, status, doc, env, tabs, panels, links, tablist, controller, resize, reduce, visible,
    view: value => intersect?.([{isIntersecting: value, intersectionRatio: value ? 1 : 0}]),
    click: () => button.emit('click'),
    tickTimeout: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    isDisconnected: () => disconnected};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const advance = (f, time) => { f.video.currentTime = time; f.video.emit('timeupdate'); };
const finish = f => { for (let i=0;i<3;i++) { advance(f, 3.9); advance(f, 0); } };

test('automatic motion waits for actual visibility after an offscreen anchor navigation', async () => {
 const f=fixture({autoplay:true,initialIntersection:null});
 assert.equal(f.video.src,undefined);assert.equal(f.video.loads,0);assert.equal(f.video.playCalls,0);
 f.view(false);await flush();
 assert.equal(f.video.src,undefined);assert.equal(f.video.loads,0);assert.equal(f.video.playCalls,0);
 f.view(true);await flush();
 assert.equal(f.video.src,'/city-desktop.mp4');assert.equal(f.video.loads,1);assert.equal(f.video.playCalls,1);
 f.view(false);assert.equal(f.video.paused,true);
 f.view(true);await flush();assert.equal(f.video.loads,1);assert.equal(f.video.playCalls,2);
});

test('motion retains its existing fallback when IntersectionObserver is unavailable', async () => {
 const f=fixture({autoplay:true,observer:false});await flush();
 assert.equal(f.video.src,'/city-desktop.mp4');assert.equal(f.video.playCalls,1);
 f.click();assert.equal(f.video.paused,true);
});

test('Save-Data starts with native content and an exact poster, without automatic downloads', () => {
  const f = fixture();
  assert.equal(f.video.src, undefined);
  assert.equal(f.video.loads, 0);
  assert.equal(f.video.poster, undefined, 'hidden video has no poster request before playback');
  assert.equal(f.video.autoplay, false);
  assert.equal(f.video.loop, true);
  assert.equal(f.video.preload, 'none');
  assert.equal(f.button.hidden, false);
  assert.equal(f.button.textContent, 'Play motion');
  f.view(false); f.view(true); f.visible(false); f.visible(true); f.env.emit('pageshow');
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.root.dataset.cityReady, 'true');
  assert.equal(f.root.dataset.cityProject, 'fieldwork');
  assert.equal(f.tablist.hidden, false);
});

test('desktop and portrait choose their authored source only on play; first decoded frame reveals video', async () => {
  for (const mobile of [false, true]) {
    const f = fixture({mobile});
    f.click(); await flush();
    assert.equal(f.video.src, mobile ? '/city-mobile.mp4' : '/city-desktop.mp4');
    assert.equal(f.video.loads, 1);
    assert.equal(f.video.muted, true);
    assert.equal(f.video.playsInline, true);
    assert.equal(f.root.classes.has('has-city-frame'), false);
    f.video.presentFrame();
    assert.equal(f.root.classes.has('has-city-frame'), true);
    assert.equal(f.root.dataset.cityState, 'playing');
    assert.equal(f.button.textContent, 'Pause motion');
  }
});

test('explicit pause freezes frame and time across scroll, page visibility, history restore and resizing', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame();
  f.video.currentTime = 1.7; f.click();
  assert.equal(f.video.paused, true);
  assert.equal(f.root.classes.has('has-city-frame'), true);
  assert.equal(f.root.classes.has('is-city-playing'), false);
  f.view(false); f.visible(false); f.resize(true); f.env.emit('pagehide');
  f.visible(true); f.view(true); f.env.emit('pageshow'); await flush();
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.video.currentTime, 1.7);
  assert.equal(f.video.src, '/city-desktop.mp4');
  assert.equal(f.video.poster, '/desktop-first.webp');
  assert.equal(f.button.textContent, 'Resume motion');
  f.click(); await flush();
  assert.equal(f.video.playCalls, 2);
  assert.equal(f.video.currentTime, 1.7);
  assert.equal(f.video.src, '/city-desktop.mp4');
});

test('automatic interruptions resume only after every interruption clears and preserve the frame', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame(); f.video.currentTime = 2;
  f.view(false); f.visible(false); f.env.emit('pagehide');
  assert.equal(f.video.paused, true);
  assert.equal(f.root.classes.has('has-city-frame'), true);
  f.view(true); f.visible(true); await flush();
  assert.equal(f.video.playCalls, 1);
  f.env.emit('pageshow'); await flush();
  assert.equal(f.video.playCalls, 2);
  assert.equal(f.video.currentTime, 2);
  f.view(false); f.click(); f.view(true); await flush();
  assert.equal(f.video.playCalls, 2, 'explicit pause while interrupted cancels automatic resume');
});

test('late play resolution, rejection and frame callbacks cannot undo a pause', async () => {
  const f = fixture({pending: true});
  f.click(); f.video.emit('playing');
  const staleFrame = [...f.video.frameCallbacks.values()][0];
  f.click();
  f.video.requests[0].resolve(); await flush();
  f.video.paused = false; f.video.emit('playing'); staleFrame();
  assert.equal(f.video.paused, true);
  assert.equal(f.root.classes.has('has-city-frame'), false);
  assert.equal(f.root.dataset.cityState, 'paused');
  f.click(); f.click(); f.video.requests[1].reject(new Error('late abort')); await flush();
  assert.equal(f.root.dataset.cityState, 'paused');
  assert.doesNotMatch(f.status.textContent, /unavailable/);
});

test('an obsolete play promise does not pause or fail a newer intentional playback', async () => {
  for (const settle of ['resolve', 'reject']) {
    const f = fixture({pending: true}); f.click(); f.click(); f.click();
    f.video.requests[0][settle](new Error('old request')); await flush();
    assert.equal(f.video.paused, false);
    assert.notEqual(f.root.dataset.cityState, 'error');
    f.video.emit('playing'); f.video.presentFrame(); f.video.requests[1].resolve(); await flush();
    assert.equal(f.root.dataset.cityState, 'playing');
    assert.equal(f.root.classes.has('has-city-frame'), true);
  }
});

test('automatic interruption cancels pending playback and a late playing event cannot move offscreen', async () => {
  const f = fixture({pending: true}); f.click(); f.view(false);
  f.video.requests[0].resolve(); await flush();
  f.video.paused = false; f.video.emit('playing');
  assert.equal(f.video.paused, true);
  assert.equal(f.root.dataset.cityState, 'paused');
  f.view(true); f.video.emit('playing'); f.video.presentFrame();
  f.video.requests[1].resolve(); await flush();
  assert.equal(f.root.dataset.cityState, 'playing');
});

test('twelve seconds complete the story while the city continues looping without moving focus', async () => {
  const f = fixture({autoplay:true}); await flush(); f.video.presentFrame();
  advance(f,2.1); assert.equal(f.showcases[0].inert,false);
  advance(f,3.9); advance(f,1); assert.equal(f.showcases[1].inert,false);
  advance(f,3.6); assert.equal(f.showcases[2].inert,false);
  advance(f,3.9); advance(f,2.6); assert.equal(f.showcases.every(card=>card.inert),true);
  advance(f,3.9); advance(f,0);
  assert.equal(f.root.dataset.cityBeat,'ambient');
  assert.equal(f.root.dataset.cityState,'playing');
  assert.equal(f.root.classes.has('is-city-complete'),true);
  assert.equal(f.video.paused,false);
  assert.equal(f.video.loop,true);
  assert.equal(f.replay.hidden,false);
  assert.equal(f.tabs.some(tab=>tab.focusCalls),false);
  assert.equal(f.root.dataset.cityProject,'fieldwork');
  f.click(); assert.equal(f.video.paused,true);
  f.view(false); f.view(true); await flush(); assert.equal(f.video.playCalls,1);
  f.click(); await flush(); assert.equal(f.root.dataset.cityBeat,'ambient');
  f.replay.emit('click'); await flush(); assert.equal(f.video.currentTime,0);
  assert.equal(f.root.classes.has('is-city-complete'),false);
});

test('desktop autoplay and a remembered phone play choice start the correct muted camera', async () => {
  for (const mobile of [false,true]) {
    const storage=new Map(mobile?[['wm.city.motion','playing']]:[]);
    const f=fixture({autoplay:true,mobile,storage}); await flush();
    assert.equal(f.video.playCalls,1); assert.equal(f.video.muted,true);
    assert.equal(f.video.src,mobile?'/city-mobile.mp4':'/city-desktop.mp4');
    assert.equal(f.root.classes.has('has-city-frame'),false);
    f.video.presentFrame(); assert.equal(f.root.classes.has('has-city-frame'),true);
  }
});

test('a first phone visit never loads a film or reveal previews until explicit play', async () => {
  const f=fixture({autoplay:true,mobile:true});await flush();
  assert.equal(f.video.src,undefined);assert.equal(f.video.loads,0);assert.equal(f.video.playCalls,0);
  assert.equal(f.button.textContent,'Play motion');assert.equal(f.video.poster,undefined,'hidden video waits for explicit play');
  assert.ok(f.previews.every(image=>!image.src&&!image.srcset));
  f.view(false);f.visible(false);f.env.emit('pagehide');f.resize(false);
  f.visible(true);f.view(true);f.env.emit('pageshow');f.resize(true);await flush();
  assert.equal(f.video.playCalls,0,'scroll, restore and resizing must not manufacture a play choice');
  f.click();await flush();f.video.presentFrame();
  assert.equal(f.video.src,'/city-mobile.mp4');assert.equal(f.video.loads,1);assert.equal(f.root.dataset.cityState,'playing');
  for(const image of f.previews){assert.equal(image.src,image.dataset.cityPreviewSrc);assert.equal(image.srcset,image.dataset.cityPreviewSrcset);assert.match(image.sizes,/90vw/);}
});

test('paused, Save-Data and reduced-motion preferences block automatic films in both cameras', async () => {
  for(const mobile of [false,true])for(const preference of ['paused','save-data','reduce']){
    const storage=new Map([['wm.city.motion',preference==='paused'?'paused':'playing']]);
    const f=fixture({mobile,storage,autoplay:preference!=='save-data',reduced:preference==='reduce'});await flush();
    f.view(false);f.view(true);f.visible(false);f.visible(true);f.env.emit('pageshow');await flush();
    assert.equal(f.video.playCalls,0,`${mobile?'phone':'desktop'} ${preference}`);assert.equal(f.video.loads,0);
    if(preference!=='reduce'){f.click();await flush();assert.equal(f.video.playCalls,1,'explicit play remains usable');}
  }
});

test('blocked autoplay can be resumed without an error fallback', async () => {
  const blocked=Object.assign(new Error('gesture needed'),{name:'NotAllowedError'});
  const f=fixture({autoplay:true,reject:blocked}); await flush();
  assert.equal(f.root.dataset.cityState,'blocked');
  assert.doesNotMatch(f.status.textContent,/unavailable/);
  f.video.reject=false; f.click(); await flush(); f.video.presentFrame();
  assert.equal(f.root.dataset.cityState,'playing');
});

test('focus holds the active reveal and scene links select the corresponding original portfolio', async () => {
  const f=fixture({autoplay:true}); await flush(); f.video.presentFrame(); advance(f,2.2);
  f.showcases[0].emit('focusin'); assert.equal(f.video.paused,true);
  const held=f.root.dataset.cityElapsed; advance(f,3); assert.equal(f.root.dataset.cityElapsed,held);
  const event=f.choices[2].emit('click'); assert.equal(event.defaultPrevented,false);
  assert.equal(f.root.dataset.cityProject,'hearthside'); assert.equal(f.panels[2].hidden,false);
});

test('continued media progress clears a fetch-stall timeout, including in the ambient ending', async () => {
  const f=fixture({autoplay:true}); await flush(); f.video.presentFrame();
  f.video.emit('stalled'); advance(f,1); f.tickTimeout();
  assert.equal(f.root.dataset.cityState,'playing'); assert.ok(f.video.src);
  finish(f); assert.equal(f.root.dataset.cityBeat,'ambient');
  f.video.emit('stalled'); advance(f,.2); f.tickTimeout();
  assert.equal(f.root.dataset.cityState,'playing'); assert.ok(f.video.src);
});

test('history fragment changes reveal the correct panel without stealing focus', () => {
  const f=fixture(); f.choices[2].emit('click');
  f.env.location.hash='#panel-northline'; f.env.emit('hashchange');
  assert.equal(f.root.dataset.cityProject,'northline'); assert.equal(f.panels[1].hidden,false);
  assert.equal(f.panels[1].scrollCalls,1); assert.equal(f.tabs.some(tab=>tab.focusCalls),false);
  f.env.location.hash='#panel-hearthside'; f.env.emit('hashchange');
  assert.equal(f.panels[2].hidden,false); assert.equal(f.panels[2].scrollCalls,1);
});

test('manual motion preference survives remount and a new page, while unavailable storage is harmless', async () => {
  const storage=new Map(),first=fixture({autoplay:true,storage}); await flush(); first.click(); first.controller.destroy();
  mountLivingCity(first.root,first.env); assert.equal(first.video.playCalls,1);
  const second=fixture({autoplay:true,storage}); assert.equal(second.video.playCalls,0);
  second.click(); await flush(); second.controller.destroy();
  const third=fixture({autoplay:true,storage}); await flush(); assert.equal(third.video.playCalls,1);
  third.env.sessionStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.doesNotThrow(()=>third.click()); third.controller.destroy();
  assert.doesNotThrow(()=>mountLivingCity(third.root,third.env));
});

test('replay adopts changed camera and exact poster; normal resize never reloads the active film', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame(); f.video.currentTime = 1.2;
  f.resize(true);
  assert.equal(f.video.loads, 1);
  assert.equal(f.video.src, '/city-desktop.mp4');
  assert.equal(f.video.currentTime, 1.2);
  f.replay.emit('click'); await flush();
  assert.equal(f.video.src, '/city-mobile.mp4');
  assert.equal(f.video.poster, '/mobile-first.webp');
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.root.classes.has('has-city-frame'), false);
  assert.equal(f.root.dataset.citySource, 'mobile');
  f.video.presentFrame(); f.video.currentTime = 1; f.replay.emit('click'); await flush();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.video.src, '/city-mobile.mp4');
});

test('reduced motion never loads video, keeps selector instant, and changing preference cancels late playback', async () => {
  const f = fixture({reduced: true, pending: true});
  f.click(); f.replay.emit('click'); f.tabs[2].emit('click');
  assert.equal(f.video.loads, 0);
  assert.equal(f.video.playCalls, 0);
  assert.equal(f.button.disabled, true);
  assert.equal(f.root.dataset.cityProject, 'hearthside');
  f.reduce(false); assert.equal(f.video.playCalls, 0);
  f.click(); f.video.emit('playing');
  const staleFrame = [...f.video.frameCallbacks.values()][0];
  f.reduce(true); f.video.requests[0].resolve(); await flush(); staleFrame();
  assert.equal(f.root.dataset.cityState, 'reduced');
  assert.equal(f.root.classes.has('has-city-frame'), false);
  assert.equal(f.video.src, '');
  assert.equal(f.video.paused, true);
  f.reduce(false); f.view(false); f.view(true); await flush();
  assert.equal(f.video.playCalls, 1);
});

test('media callbacks apply reduced motion even before the preference change event arrives', async () => {
  for (const trigger of ['timeupdate', 'playing', 'play-settlement', 'waiting']) {
    const f=fixture({pending:trigger==='play-settlement'});
    f.click(); f.video.emit('playing'); f.video.presentFrame();
    if(trigger!=='play-settlement') { await flush(); finish(f); }
    f.env.matchMedia('(prefers-reduced-motion: reduce)').matches=true;
    if(trigger==='play-settlement') { f.video.requests[0].resolve(); await flush(); }
    else f.video.emit(trigger);
    assert.equal(f.root.dataset.cityState,'reduced',trigger);
    assert.equal(f.button.disabled,true,trigger);
    assert.equal(f.button.textContent,'Motion off',trigger);
    assert.equal(f.video.paused,true,trigger);
    assert.equal(f.video.src,'',trigger);
    assert.equal(f.root.classes.has('has-city-frame'),false,trigger);
    assert.equal(f.root.classes.has('is-city-complete'),false,trigger);
    assert.equal(f.root.dataset.cityElapsed,'0.00',trigger);
    const plays=f.video.playCalls;
    f.video.emit('playing'); f.video.emit('timeupdate'); f.video.presentFrame();
    f.visible(false); f.visible(true); f.click(); await flush();
    assert.equal(f.video.playCalls,plays,trigger);
    assert.equal(f.root.dataset.cityState,'reduced',trigger);
    f.reduce(false); f.visible(false); f.visible(true); await flush();
    assert.equal(f.video.playCalls,plays,trigger);
    f.click(); assert.equal(f.video.playCalls,plays+1,trigger);
  }
});

test('missing or failed media restores poster with retry and does not affect project links', async () => {
  for (const mode of ['missing', 'reject', 'media-error', 'timeout']) {
    const f = fixture({missing: mode === 'missing', reject: mode === 'reject', pending: mode === 'timeout'});
    f.click(); await flush();
    if (mode === 'media-error') { f.video.presentFrame(); f.video.error = {code: 3}; f.video.emit('error'); }
    if (mode === 'timeout') f.tickTimeout();
    assert.equal(f.root.dataset.cityState, 'error', mode);
    assert.equal(f.root.classes.has('has-city-frame'), false);
    assert.equal(f.button.hidden, false);
    assert.equal(f.button.textContent, 'Retry motion');
    assert.match(f.status.textContent, /Motion unavailable/);
    f.tabs[1].emit('click'); assert.equal(f.panels[1].hidden, false);
    f.video.dataset.desktopSrc = '/retry.mp4'; f.video.reject = false; f.video.pending = false;
    f.click(); await flush();
    assert.equal(f.video.src, '/retry.mp4');
    assert.equal(f.root.dataset.cityState, 'playing');
    f.video.error = null; f.video.emit('error');
    assert.equal(f.root.dataset.cityState, 'playing', 'obsolete error event without current media error is ignored');
  }
});

test('buffering has a bounded retry fallback but temporary buffering can recover', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame();
  f.video.emit('waiting'); assert.equal(f.root.dataset.cityState, 'loading');
  f.video.emit('playing'); f.tickTimeout();
  assert.equal(f.root.dataset.cityState, 'playing');
  f.video.emit('stalled'); f.tickTimeout();
  assert.equal(f.root.dataset.cityState, 'error');
});

test('rapid tab selection changes the entire actual panel synchronously and interrupts the film', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame(); f.video.currentTime = 1;
  for (const index of [2, 0, 1, 2, 1]) {
    f.tabs[index].emit('click');
    assert.equal(f.root.dataset.cityProject, f.tabs[index].dataset.cityProject);
    f.panels.forEach((panel, i) => {
      assert.equal(panel.hidden, i !== index);
      assert.equal(panel.inert, i !== index);
      assert.equal(f.tabs[i].tabIndex, i === index ? 0 : -1);
      assert.equal(f.tabs[i].getAttribute('aria-selected'), String(i === index));
    });
    assert.deepEqual(f.panels[index].content, {image: `${f.root.dataset.cityProject}.webp`, name: f.root.dataset.cityProject, category: `${f.root.dataset.cityProject}-category`, href: `/${f.root.dataset.cityProject}/`});
  }
  await flush(); f.view(false); f.view(true);
  assert.equal(f.root.dataset.cityProject, 'northline');
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.video.currentTime, 1);
  assert.equal(f.root.classes.has('has-city-frame'), true);
});

test('tabs support roving arrows, wrapping, Home and End without intercepting unrelated keys', () => {
  const f = fixture();
  assert.equal(f.tabs[0].emit('keydown', {key: 'ArrowLeft'}).defaultPrevented, true);
  assert.equal(f.root.dataset.cityProject, 'hearthside'); assert.equal(f.tabs[2].focusCalls, 1);
  f.tabs[2].emit('keydown', {key: 'ArrowRight'}); assert.equal(f.root.dataset.cityProject, 'fieldwork');
  f.tabs[0].emit('keydown', {key: 'End'}); assert.equal(f.root.dataset.cityProject, 'hearthside');
  f.tabs[2].emit('keydown', {key: 'Home'}); assert.equal(f.root.dataset.cityProject, 'fieldwork');
  assert.equal(f.tabs[0].emit('keydown', {key: 'Tab'}).defaultPrevented, false);
  assert.equal(f.tabs[0].emit('keydown', {key: 'ArrowLeft', altKey: true}).defaultPrevented, false);
  assert.equal(f.tabs[0].emit('keydown', {key: 'Home', ctrlKey: true}).defaultPrevented, false);
  assert.equal(f.tabs[0].emit('keydown', {key: 'ArrowDown'}).defaultPrevented, false);
  f.tablist.setAttribute('aria-orientation', 'vertical');
  f.tabs[0].emit('keydown', {key: 'ArrowDown'}); assert.equal(f.root.dataset.cityProject, 'northline');
  f.tabs[1].emit('keydown', {key: 'ArrowUp'}); assert.equal(f.root.dataset.cityProject, 'fieldwork');
});

test('project navigation pauses without preventing the native link action or shifting focus', async () => {
  const f = fixture(); f.click(); await flush(); f.video.presentFrame();
  const event = f.links[0].emit('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(f.video.paused, true);
  assert.equal(f.tabs.some(tab => tab.focusCalls), false);
  f.visible(false); f.visible(true); await flush(); assert.equal(f.video.playCalls, 1);
});

test('malformed tab markup keeps original panels usable, while absent video does not disable valid tabs', () => {
  const invalid = fixture({malformedTabs: true});
  assert.equal(invalid.tablist.hidden, true);
  assert.equal(invalid.panels.every(panel => !panel.hidden && !panel.inert), true);
  const staticPage = fixture({videoPresent: false});
  staticPage.tabs[2].emit('click');
  assert.equal(staticPage.panels[2].hidden, false);
  assert.equal(staticPage.root.dataset.cityProject, 'hearthside');
});

test('native pause also persists, and mounting twice does not duplicate actions', async () => {
  const f = fixture(); assert.equal(mountLivingCity(f.root, f.env), f.controller);
  f.click(); await flush(); assert.equal(f.video.playCalls, 1);
  f.video.pause(); f.view(false); f.view(true); f.visible(false); f.visible(true); await flush();
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.button.textContent, 'Resume motion');
});

test('browsers without video frame callbacks reveal only after the playing event', async () => {
  const f = fixture({frames: false, pending: true});
  f.click();
  assert.equal(f.root.classes.has('has-city-frame'), false);
  f.video.emit('playing');
  assert.equal(f.root.classes.has('has-city-frame'), true);
  f.video.requests[0].resolve(); await flush();
  f.click();
  assert.equal(f.root.classes.has('has-city-frame'), true);
  assert.equal(f.video.paused, true);
});

test('destroy cancels pending callbacks, pauses playback and removes observers and handlers', async () => {
  const f = fixture({pending: true}); f.click(); f.video.emit('playing');
  const staleFrame = [...f.video.frameCallbacks.values()][0];
  f.controller.destroy(); f.controller.destroy();
  f.video.requests[0].resolve(); await flush(); staleFrame(); f.click();
  assert.equal(f.video.paused, true);
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.root.classes.has('has-city-frame'), false);
  assert.equal(f.isDisconnected(), true);
});
