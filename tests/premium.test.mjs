import {socialCardPath} from '../src/social-cards.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {selectedEdition,DEFAULT_EDITION} from '../src/editions.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const [saved,offers,map,geography,identity]=await Promise.all(['../config/site.json','../config/offers.json','../authority/v5/site-map.json','../authority/v5/geography.json','../config/identity.json'].map(read));
const config={...saved,mode:'staging',formMode:'synthetic'};
const pages=renderPages({config,offers,map,geography});

test('every route exposes the same primary journey and local type system',()=>{
 const expected=['/work/','/services/','/services/web-design/','/services/website-redesign/','/services/contractor-websites/','/services/website-addons/','/services/seo/','/services/website-care/','/services/website-audit/','/pricing/','/process/','/guides/','/about/','/contact/#inquiry'];
 for(const {path,html} of pages){
  const primary=html.match(/<nav id="main-nav"[^>]*>(.*?)<\/nav>/s)?.[1];
  assert.ok(primary,path);
  assert.deepEqual([...primary.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),expected,path);
  const footer=html.match(/<nav aria-label="Footer">(.*?)<\/nav>/s)?.[1];assert.ok(footer,path);
  for(const secondary of ['/services/website-addons/','/services/contractor-websites/']){assert.ok(footer.includes(`href="${secondary}"`),path+' -> '+secondary);assert.ok(pages.some(page=>page.path===secondary),secondary);}
  assert.match(html,/\/assets\/premium\/newsreader-regular\.woff2/);
  // Every shared layout needs the body/navigation font before paint to avoid shifts.
  const bodyFontPreloads=[...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map(match=>match[0]).filter(link=>link.includes('/assets/premium/manrope.woff2'));
  assert.deepEqual(bodyFontPreloads,['<link rel="preload" href="/assets/premium/manrope.woff2" as="font" type="font/woff2" crossorigin>'],path);
  assert.doesNotMatch(html,/<iframe|my\.spline\.design|opening\.mp4|\/assets\/experience\.js/);
 }
});
test('preserved dusk edition retains a real still and defers optional motion',()=>{
 const html=renderPages({config:{...config,homeEdition:'buffalo-dusk'},offers,map,geography}).find(x=>x.path==='/').html;
 assert.match(html,/<img[^>]+class="hero-poster"[^>]+src="\/assets\/editions/);
 assert.match(html,/<video[^>]+data-src="[^\"]+\.mp4"[^>]+preload="none"/);
 assert.doesNotMatch(html,/<(?:video|source)\b[^>]*\ssrc=/);
 assert.match(html,/aria-controls="hero-motion"/);
 assert.equal(selectedEdition({homeEdition:'unavailable'}).id,DEFAULT_EDITION);
});
test('selected identity text and action color pairs meet normal-text contrast',()=>{
 const lum=hex=>{const c=hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(const pair of identity.contrastPairs){const a=lum(pair.foreground),b=lum(pair.background);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,pair.name);}
});

test('Civic edition keeps full-word images, local metadata and deferred once-only media coherent',()=>{
 const civicConfig={...config,origin:'http://localhost:4221',homeEdition:'civic-sculpture',civicMotionReady:true};
 const civicPages=renderPages({config:civicConfig,offers,map,geography});
 const home=civicPages.find(x=>x.path==='/').html;
 const work=civicPages.find(x=>x.path==='/work/').html;
 assert.match(home,/<section class="civic-hero"/);
 assert.doesNotMatch(home,/<section class="studio-hero"/); // No second controller binds.
 assert.match(home,/<video[^>]+data-src="\/assets\/civic-sculpture\/buffalo-civic-intro\.mp4"[^>]+preload="none"/);
 assert.doesNotMatch(home,/<video[^>]+(?: loop| autoplay| src=)/);
 assert.match(home,/<img class="civic-poster"[^>]+width="1440" height="720"/);
 assert.doesNotMatch(work,/id="animation"|id="identity"/);
 assert.match(work,/<video[^>]+controls[^>]+preload="none"/);
 assert.match(work,/film-landscape\.mp4/);
 assert.doesNotMatch(work,/civic-sculpture-preview\.js/); // Only home mounts the Civic controller.
 assert.doesNotMatch(home+work,/six-second|dusk scene|original dusk artwork/);
 for(const {html,path} of civicPages.filter(page=>!page.html.includes('property="og:type" content="article"'))){
  assert.ok(html.includes(`<meta property="og:image" content="http://localhost:4221${socialCardPath(path)||'/assets/brand/social-card.png'}"`));
  assert.match(html,/<meta property="og:image:alt" content="[^"]+"/);
 }
 const pending=renderPages({config:{...civicConfig,civicMotionReady:false},offers,map,geography}).find(x=>x.path==='/').html;
 assert.doesNotMatch(pending,/<video[^>]+data-src=/);
 assert.match(pending,/<img class="civic-poster"[^>]+src=/);
 assert.equal(saved.homeEdition,'living-city');
 assert.equal(DEFAULT_EDITION,'buffalo-dusk');
 assert.equal(selectedEdition({}).id,'buffalo-dusk');
 const prices=html=>[...html.matchAll(/\$[\d,]+/g)].map(x=>x[0]);
 assert.deepEqual(prices(civicPages.find(x=>x.path==='/pricing/').html),prices(pages.find(x=>x.path==='/pricing/').html));
});


test('validated finale edition renders versioned intro and ambient with deferred sources and one explicit motion control',()=>{
 const media={revision:'finale-v2',poster:'/civic-sculpture/finale-v2/buffalo-civic-poster.webp',mobilePoster:'/civic-sculpture/finale-v2/buffalo-civic-mobile.webp',video:'/civic-sculpture/finale-v2/buffalo-civic-intro.mp4',ambientVideo:'/civic-sculpture/finale-v2/buffalo-civic-ambient.mp4',durationSeconds:10,ambientDurationSeconds:4,width:1440,height:720,posterWidth:1440,mobilePosterWidth:960};
 const configV2={...config,homeEdition:'civic-sculpture',civicMotionReady:true,civicAmbientReady:true,civicMedia:media};
 const html=renderPages({config:configV2,offers,map,geography}).find(p=>p.path==='/').html;
 assert.match(html,/<video id="civic-motion"[^>]+data-src="[^"]+finale-v2\/buffalo-civic-intro.mp4"[^>]+data-duration="10"[^>]+preload="none"/);
 assert.match(html,/<video id="civic-ambient"[^>]+data-src="[^"]+finale-v2\/buffalo-civic-ambient.mp4"[^>]+data-duration="4"[^>]+preload="none"/);
 assert.doesNotMatch(html,/<video[^>]+(?: autoplay| src=)/);
 assert.match(html,/class="civic-replay"[^>]*hidden>Replay animation/);
 assert.match(html,/curled bronze bridge beneath the word/);
 assert.match(selectedEdition(configV2).motionCopy,/ten-second introduction plays once, then a seamless four-second ambient/);
 const withoutTraffic=selectedEdition(configV2);
 for(const field of ['alt','projectAlt','socialAlt','workDescription','motionCopy','sceneCopy'])assert.doesNotMatch(withoutTraffic[field],/\bcars\b|\uFFFD/);
 const withTraffic=selectedEdition({...configV2,civicMedia:{...media,ambientTraffic:true}});
 for(const field of ['alt','projectAlt','socialAlt','workDescription','motionCopy','sceneCopy']){
  assert.match(withTraffic[field],/sculpted cars/);
  assert.doesNotMatch(withTraffic[field],/\uFFFD|light sweep|static final hold/);
 }
 assert.match(withTraffic.motionCopy,/gently rocks the complete composition while matching sculpted cars travel continuously across the bridge/);
 assert.match(withTraffic.motionCopy,/Pause, Resume and Replay introduction/);
 assert.match(withTraffic.sceneCopy,/not replicas of individual landmarks/);
 assert.equal(withTraffic.duration,10);assert.equal(withTraffic.ambientDuration,4);
 assert.match(selectedEdition({...configV2,civicMedia:undefined}).motionCopy,/eight-second introduction plays once and holds/);
 const phone=renderPages({config:{...configV2,civicMedia:{...media,mobileVideo:'/civic-sculpture/finale-v2/intro-960.mp4',mobileAmbientVideo:'/civic-sculpture/finale-v2/ambient-960.mp4',smallPoster:'/civic-sculpture/finale-v2/poster-480.webp',smallPosterWidth:480}},offers,map,geography}).find(p=>p.path==='/').html;
 assert.match(phone,/<video id="civic-motion"[^>]+data-mobile-src="\/assets\/civic-sculpture\/finale-v2\/intro-960.mp4"/);
 assert.match(phone,/<video id="civic-ambient"[^>]+data-mobile-src="\/assets\/civic-sculpture\/finale-v2\/ambient-960.mp4"/);
 assert.match(phone,/poster-480.webp 480w/);
});
