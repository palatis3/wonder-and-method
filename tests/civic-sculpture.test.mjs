import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCivicSculpture} from '../motion/civic-sculpture-preview.js';

class Element extends EventTarget {
  constructor(){super();this.dataset={};this.attrs={};this.hidden=true;this.textContent='';this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
  setAttribute(name,value){this.attrs[name]=value;}
  emit(type){this.dispatchEvent(new Event(type));}
}
function fixture({interacted=true,mobile=false,mobileSources=false,reduced=false,saveData=false,source=true,ready=true,rejectPlay=false,pendingPlay=false,ambient=false,frameCallbacks=false}={}){
  const button=new Element(),replay=new Element(),status=new Element(),stage=new Element(),hero=new Element(),doc=new Element(),connection=new Element();
  const makeVideo=(url,pending)=>{
    const video=new Element();
    Object.assign(video,{currentTime:0,ended:false,paused:true,playCalls:0,loads:0,loop:true,dataset:source?{src:url}:{},pending:[]});
    video.hasAttribute=name=>Boolean(video[name]);
    video.load=()=>video.loads++;
    video.pause=()=>{if(!video.paused){video.paused=true;video.emit('pause');}};
    video.play=()=>{
      video.playCalls++;video.ended=false;
      if(rejectPlay)return Promise.reject(new Error('NotAllowedError'));
      video.paused=false;
      if(pending)return new Promise((resolve,reject)=>video.pending.push({resolve,reject}));
      video.emit('playing');return Promise.resolve();
    };
    if(frameCallbacks){video.frameQueue=[];video.requestVideoFrameCallback=callback=>video.frameQueue.push(callback);video.presentFrame=()=>video.frameQueue.shift()?.();}
    return video;
  };
  const video=makeVideo('/intro.mp4',pendingPlay),ambientVideo=ambient?makeVideo('/ambient.mp4',pendingPlay):null;
  if(mobileSources){video.dataset.mobileSrc='/intro-960.mp4';if(ambientVideo)ambientVideo.dataset.mobileSrc='/ambient-960.mp4';}
  hero.querySelector=selector=>({'#civic-motion':video,'#civic-ambient':ambientVideo,'.civic-toggle':button,'.civic-replay':replay,'.civic-status':status,'.civic-stage':stage}[selector]);
  Object.assign(doc,{readyState:ready?'complete':'loading',hidden:false});
  const queries={};
  for(const [query,matches] of [['(max-width: 767px)',mobile],['(prefers-reduced-motion: reduce)',reduced]]){queries[query]=new Element();queries[query].matches=matches;}
  connection.saveData=saveData;
  const env=new Element();
  let intersect;
  Object.assign(env,{document:doc,navigator:{connection},matchMedia:query=>queries[query],IntersectionObserver:class{constructor(callback){intersect=callback;}observe(){}}});
  mountCivicSculpture(hero,env);
  if(interacted)env.emit('pointerdown');
  return {video,ambientVideo,button,replay,status,hero,doc,env,queries,view:value=>intersect?.([{isIntersecting:value,intersectionRatio:value?1:0}]),finishPending:()=>video.pending[0]?.resolve(),click:()=>button.emit('click')};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('desktop defers video until page load and visibility, then plays only once',async()=>{
  const f=fixture({ready:false});
  assert.equal(f.video.src,undefined);
  f.view(true);assert.equal(f.video.playCalls,0);
  f.doc.readyState='complete';f.env.emit('load');await flush();
  assert.equal(f.video.loads,1);assert.equal(f.video.playCalls,1);assert.equal(f.video.loop,false);
  assert.equal(f.button.textContent,'Pause animation');
  f.video.currentTime=8;f.video.paused=true;f.video.ended=true;f.video.emit('ended');
  f.view(false);f.view(true);await flush();
  assert.equal(f.video.playCalls,1);assert.equal(f.button.textContent,'Replay animation');
  assert.ok(!f.hero.classes.has('has-civic-motion'),'Returning to the paused hero shows its complete still');
  f.click();await flush();assert.equal(f.video.currentTime,0);assert.equal(f.video.playCalls,2);
});

test('reduced-motion and data-saving modes keep the final still until explicit play on phones too',async()=>{
  for(const options of [{reduced:true},{saveData:true},{mobile:true,reduced:true},{mobile:true,saveData:true}]){
    const f=fixture({...options,ambient:true});f.view(true);await flush();
    assert.equal(f.video.src,undefined);assert.equal(f.ambientVideo.src,undefined);assert.equal(f.video.playCalls,0);assert.equal(f.button.hidden,false);
    assert.ok(!f.hero.classes.has('has-civic-motion'));
    f.click();await flush();assert.equal(f.video.playCalls,1);assert.equal(f.button.textContent,'Pause animation');
  }
});

test('phone explicit play uses paired small streams and preloads ambient after four seconds',async()=>{
  const f=fixture({mobile:true,mobileSources:true,ready:false,ambient:true,frameCallbacks:true});
  f.view(true);assert.equal(f.video.src,undefined);f.env.emit('load');await flush();assert.equal(f.video.src,undefined);f.click();await flush();
  assert.equal(f.video.src,'/intro-960.mp4');assert.equal(f.video.muted,true);assert.equal(f.video.playsInline,true);
  assert.equal(f.ambientVideo.src,undefined);assert.ok(!f.hero.classes.has('has-civic-motion'));
  f.video.presentFrame();assert.ok(f.hero.classes.has('has-civic-motion'));
  f.video.currentTime=3.9;f.video.emit('timeupdate');assert.equal(f.ambientVideo.src,undefined);
  const width=f.queries['(max-width: 767px)'];width.matches=false;width.emit('change');width.matches=true;width.emit('change');
  assert.equal(f.video.paused,false,'narrowing must not stop the introduction');
  f.video.currentTime=4;f.video.emit('timeupdate');assert.equal(f.ambientVideo.src,'/ambient-960.mp4');
  endIntro(f);await flush();assert.ok(!f.hero.classes.has('has-civic-ambient'));
  f.ambientVideo.presentFrame();assert.ok(f.hero.classes.has('has-civic-ambient'));
  f.click();f.view(false);f.view(true);await flush();assert.equal(f.ambientVideo.playCalls,1);assert.equal(f.ambientVideo.paused,true);
});

test('phone desktop fallback and an unprepared ambient still preserve the held introduction',async()=>{
  const f=fixture({mobile:true,ambient:true,frameCallbacks:true});f.view(true);f.click();await flush();f.video.presentFrame();
  assert.equal(f.video.src,'/intro.mp4');assert.equal(f.ambientVideo.src,undefined);
  endIntro(f);await flush();assert.equal(f.ambientVideo.src,'/ambient.mp4');
  assert.ok(f.hero.classes.has('has-civic-motion'));assert.ok(!f.hero.classes.has('has-civic-ambient'));
  f.ambientVideo.presentFrame();assert.ok(f.hero.classes.has('has-civic-ambient'));
});

test('manual and environmental pauses preserve position and never silently resume',async()=>{
  const f=fixture();f.view(true);await flush();f.video.currentTime=3;
  f.click();f.view(false);f.view(true);await flush();
  assert.equal(f.video.playCalls,1);assert.equal(f.button.textContent,'Resume animation');
  f.click();await flush();assert.equal(f.video.currentTime,3);assert.equal(f.video.playCalls,2);
  f.doc.hidden=true;f.doc.emit('visibilitychange');f.doc.hidden=false;f.doc.emit('visibilitychange');await flush();
  assert.ok(!f.hero.classes.has('has-civic-motion'),'Automatic pause shows the complete poster');
  assert.equal(f.video.paused,true);assert.equal(f.video.playCalls,2);
  f.click();await flush();f.view(false);f.view(true);await flush();
  assert.equal(f.video.paused,true);assert.equal(f.video.playCalls,3);
});

test('missing video and playback failures leave the complete poster available',async()=>{
  const pending=fixture({source:false});assert.equal(pending.button.hidden,true);assert.equal(pending.video.src,undefined);
  const blocked=fixture({rejectPlay:true});blocked.view(true);await flush();
  assert.ok(!blocked.hero.classes.has('has-civic-motion'));assert.equal(blocked.button.hidden,false);assert.equal(blocked.button.textContent,'Play animation');
  blocked.view(false);blocked.view(true);await flush();assert.equal(blocked.video.playCalls,1);
  const failed=fixture();failed.view(true);await flush();failed.video.emit('error');
  assert.ok(!failed.hero.classes.has('has-civic-motion'));assert.equal(failed.button.hidden,true);assert.match(failed.status.textContent,/complete sculpture/);
});

test('a pending play cannot start moving after scrolling offscreen',async()=>{
  const f=fixture({pendingPlay:true});f.view(true);f.view(false);f.finishPending();await flush();f.video.emit('playing');
  assert.equal(f.video.paused,true);assert.equal(f.hero.dataset.playing,'false');assert.ok(!f.hero.classes.has('has-civic-motion'));
});

const endIntro=f=>{f.video.currentTime=10;f.video.ended=true;f.video.paused=true;f.video.emit('pause');f.video.emit('ended');};

test('ambient prepares after four seconds and replaces the held intro only after a decoded frame',async()=>{
  const f=fixture({ambient:true,frameCallbacks:true});
  assert.equal(f.ambientVideo.src,undefined);f.view(true);await flush();f.video.presentFrame();
  assert.equal(f.ambientVideo.loads,0);assert.equal(f.replay.hidden,true);f.video.currentTime=4;f.video.emit('timeupdate');
  assert.equal(f.ambientVideo.loads,1);assert.equal(f.ambientVideo.playCalls,0);assert.equal(f.ambientVideo.loop,true);
  endIntro(f);await flush();
  assert.equal(f.hero.dataset.phase,'ambient');assert.equal(f.ambientVideo.playCalls,1);
  assert.ok(f.hero.classes.has('has-civic-motion'));assert.ok(!f.hero.classes.has('has-civic-ambient'),'hold intro until ambient frame');
  f.ambientVideo.presentFrame();assert.ok(f.hero.classes.has('has-civic-ambient'));
  assert.equal(f.button.textContent,'Pause animation');assert.equal(f.replay.hidden,false);
});

test('ambient pause/resume retains position and replay returns to intro without a poster flash',async()=>{
  const f=fixture({ambient:true,frameCallbacks:true});f.view(true);await flush();f.video.presentFrame();endIntro(f);await flush();f.ambientVideo.presentFrame();
  f.ambientVideo.currentTime=2;f.click();f.view(false);f.view(true);await flush();
  assert.equal(f.ambientVideo.playCalls,1);assert.equal(f.button.textContent,'Resume animation');
  f.click();await flush();f.ambientVideo.presentFrame();assert.equal(f.ambientVideo.currentTime,2);
  f.replay.emit('click');await flush();
  assert.equal(f.hero.dataset.phase,'intro');assert.equal(f.video.currentTime,0);assert.equal(f.ambientVideo.paused,true);
  assert.ok(f.hero.classes.has('has-civic-ambient'),'retain prior visible surface while intro seeks');
  f.video.presentFrame();assert.ok(!f.hero.classes.has('has-civic-ambient'));assert.ok(f.hero.classes.has('has-civic-motion'));
});

test('stale ambient promise and frame cannot override a newer replay',async()=>{
  const f=fixture({ambient:true,pendingPlay:true,frameCallbacks:true});f.view(true);f.video.emit('playing');f.video.presentFrame();endIntro(f);
  f.ambientVideo.emit('playing'); // First ambient frame is still pending.
  f.replay.emit('click');f.video.emit('playing');f.video.presentFrame();
  f.ambientVideo.pending[0].resolve();f.ambientVideo.presentFrame();await flush();
  assert.equal(f.hero.dataset.phase,'intro');assert.equal(f.hero.dataset.playing,'true');assert.equal(f.video.paused,false);assert.ok(!f.hero.classes.has('has-civic-ambient'));
  f.video.pending[0].reject(new Error('old request aborted'));await flush();assert.equal(f.hero.dataset.playing,'true');
});

test('ambient transition stays paused after visibility loss and errors restore the full still',async()=>{
  const f=fixture({ambient:true,frameCallbacks:true});f.view(true);await flush();f.video.presentFrame();endIntro(f);await flush();
  f.doc.hidden=true;f.doc.emit('visibilitychange');f.ambientVideo.presentFrame();f.doc.hidden=false;f.doc.emit('visibilitychange');await flush();
  assert.equal(f.ambientVideo.paused,true);assert.equal(f.ambientVideo.playCalls,1);assert.ok(!f.hero.classes.has('has-civic-ambient'));
  f.click();await flush();f.ambientVideo.presentFrame();f.ambientVideo.emit('error');
  assert.ok(!f.hero.classes.has('has-civic-motion'));assert.ok(!f.hero.classes.has('has-civic-ambient'));assert.equal(f.video.paused,true);assert.equal(f.ambientVideo.paused,true);assert.match(f.status.textContent,/complete sculpture/);
});

test('new reduced-motion preference cancels ambient and delayed frames until explicit play',async()=>{
  const f=fixture({ambient:true,frameCallbacks:true});f.view(true);await flush();f.video.presentFrame();endIntro(f);await flush();
  const pref=f.queries['(prefers-reduced-motion: reduce)'];pref.matches=true;pref.emit('change');f.ambientVideo.presentFrame();
  assert.equal(f.hero.dataset.phase,'intro');assert.equal(f.video.currentTime,0);assert.ok(!f.hero.classes.has('has-civic-motion'));assert.ok(!f.hero.classes.has('has-civic-ambient'));
  pref.matches=false;pref.emit('change');await flush();assert.equal(f.video.playCalls,1);
});

test('desktop waits for interaction and phone stays poster-first until explicit play',async()=>{
 const f=fixture({interacted:false});f.view(true);await flush();assert.equal(f.video.src,undefined);
 f.env.emit('scroll');await flush();assert.equal(f.video.playCalls,1);
 const phone=fixture({mobile:true});phone.view(true);await flush();assert.equal(phone.video.src,undefined);
 phone.click();await flush();assert.equal(phone.video.playCalls,1);
});
test('blocked playback describes the finished still without inventing a Resume control',async()=>{
 const f=fixture({rejectPlay:true});f.view(true);await flush();
 assert.equal(f.status.textContent,'Animation could not start. The finished image is shown.');
});
