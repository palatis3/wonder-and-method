import test from 'node:test';import assert from 'node:assert/strict';
import {initialRouteAssets,deferredMotionImages} from '../scripts/initial-route-assets.mjs';

test('initial inventory retains eager linked images, responsive hero candidates and code/fonts',()=>{
 const html='<link rel="stylesheet" href="/assets/site.css?v=123"><link rel="preload" as="font" href="/assets/font.woff2"><link rel="preload" as="image" href="/assets/hero.webp" imagesrcset="/assets/hero-small.webp 400w, /assets/hero.webp 1200w"><a href="/assets/not-fetched.pdf"><img src="/assets/linked.webp"></a><picture><source srcset="/assets/phone.webp 400w, /assets/phone-large.webp 800w"><img src="/assets/hero.webp"></picture><video poster="/assets/poster.webp"></video><script src="/assets/app.js?v=456"></script>';
 assert.deepEqual([...initialRouteAssets(html)].sort(),['/assets/app.js','/assets/font.woff2','/assets/hero-small.webp','/assets/hero.webp','/assets/linked.webp','/assets/phone-large.webp','/assets/phone.webp','/assets/poster.webp','/assets/site.css'].sort());
});
test('data-only deferred previews and native-lazy picture candidates do not become eager requests',()=>{
 const html='<video data-mobile-poster="/assets/deferred.webp"></video><img src="data:image/gif;base64,AAAA" data-city-preview-src="/assets/deferred-preview.webp" data-city-preview-srcset="/assets/deferred-small.webp 480w"><picture><source srcset="/assets/lazy-phone.webp 480w"><img src="/assets/lazy.webp" srcset="/assets/lazy-large.webp 1200w" loading="lazy"></picture><link rel="alternate" href="/assets/feed.xml"><p>/assets/mentioned.webp</p><a href="/assets/download.pdf">Download</a><img src="https://example.test/external.webp">';
 assert.deepEqual([...initialRouteAssets(html)],[]);
 assert.deepEqual([...deferredMotionImages(html)].sort(),['/assets/deferred.webp','/assets/deferred-preview.webp','/assets/deferred-small.webp'].sort());
});

test('resource rel tokens ignore case and a lazy picture does not defer its scripts',()=>{
 const html='<link rel="STYLESHEET" href="/assets/upper.css"><link rel="alternate PRELOAD" as="font" href="/assets/mixed.woff2"><picture><source srcset="/assets/lazy-phone.webp 480w"><script src="/assets/eager.js"></script><img src="/assets/lazy.webp" loading="LAZY"></picture><img src="/assets/outside.webp">';
 assert.deepEqual([...initialRouteAssets(html)],['/assets/upper.css','/assets/mixed.woff2','/assets/eager.js','/assets/outside.webp']);
});
