import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BUFFALO_STUDY_PATH,buffaloStudy,buffaloStudyMedia,buffaloStudyAssetPaths} from '../src/buffalo-study.mjs';
import {workGallery,workItems} from '../src/work-gallery.mjs';

const manifest=JSON.parse(await readFile(new URL('../public/civic-sculpture/manifest.json',import.meta.url),'utf8'));
const localAsset=url=>new URL(`../public${url.replace(/^\/assets/,'')}`,import.meta.url);

test('Buffalo keeps its own media identity when the homepage changes',()=>{
 const before=buffaloStudyMedia({homeEdition:'civic-sculpture'}),after=buffaloStudyMedia({homeEdition:'living-city'});
 assert.deepEqual(after,before);
 assert.equal(after.id,'civic-sculpture');
 assert.equal(after.motion,`/assets${manifest.video}`);
 assert.equal(after.mobileMotion,`/assets${manifest.mobileVideo}`);
 assert.equal(after.ambientMotion,`/assets${manifest.ambientVideo}`);
 assert.equal(after.mobileAmbientMotion,`/assets${manifest.mobileAmbientVideo}`);
 assert.equal(BUFFALO_STUDY_PATH,'/work/buffalo-civic/');
});

test('the project provides native poster-first playback with phone and desktop sources',()=>{
 const html=buffaloStudy({homeEdition:'living-city'});
 const videos=[...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
 assert.equal(videos.length,2);
 for(const [,attrs,body] of videos){
  assert.match(attrs,/\bcontrols\b/);assert.match(attrs,/\bplaysinline\b/);assert.match(attrs,/preload="none"/);
  assert.match(attrs,/poster="\/assets\/civic-sculpture\/finale-v2\/buffalo-civic-poster.webp"/);
  assert.match(attrs,/width="1440" height="720"/);
  assert.doesNotMatch(attrs,/\bautoplay\b|aria-hidden="true"|tabindex="-1"/);
  const description=attrs.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(description&&html.includes(`id="${description}"`));
  const sources=[...body.matchAll(/<source src="([^"]+)"([^>]*)>/g)];
  assert.equal(sources.length,2);assert.match(sources[0][2],/media="\(max-width: 767px\)"/);assert.doesNotMatch(sources[1][2],/media=/);
  assert.match(body,/<a href="[^"]+\.mp4">Open the Buffalo Civic/);
 }
 assert.doesNotMatch(videos[0][1],/\bloop\b/);
 assert.match(videos[1][1],/\bloop\b/);
 assert.match(html,/studio art study/);assert.match(html,/animation is silent/);assert.match(html,/href="\/work\/"/);
 assert.doesNotMatch(html,/<script\b|data-src=|civic-sculpture-preview|Start a project|Websites from/);
});

test('unavailable motion leaves the complete responsive still without broken controls',()=>{
 const html=buffaloStudy({civicMotionReady:false,civicAmbientReady:false});
 assert.doesNotMatch(html,/<video\b|<source\b|Use the video controls/);
 assert.match(html,/<picture><img[^>]+srcset="[^"]+480w[^\"]+960w[^\"]+1440w"/);
 assert.match(html,/complete sculpture is shown while the film is unavailable/);
 assert.ok(buffaloStudyAssetPaths({civicMotionReady:false}).every(path=>path.endsWith('.webp')));
 assert.equal((buffaloStudy({civicAmbientReady:false}).match(/<video\b/g)||[]).length,1);
});

test('every project media reference resolves to a preserved public asset',async()=>{
 const html=buffaloStudy(),paths=buffaloStudyAssetPaths();
 assert.equal(paths.length,7);
 for(const path of paths){assert.ok((await stat(localAsset(path))).size>0,path);assert.ok(html.includes(path)||buffaloStudy({civicMotionReady:false}).includes(path),path);}
 const references=[...html.matchAll(/(?:src|poster|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);
 for(const path of references)assert.ok(paths.includes(path),path);
 // The deliverable films coexist with the full-quality original and render source.
 const original=await readFile(localAsset(manifest.deliveryOriginalVideo));
 assert.equal(createHash('sha256').update(original).digest('hex'),manifest.deliveryOriginalVideoSha256);
 for(const [key,hashKey] of [['mobileVideo','mobileVideoSha256'],['mobileAmbientVideo','mobileAmbientVideoSha256']]){
  const bytes=await readFile(localAsset(manifest[key]));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest[hashKey]);
 }
 assert.ok((await stat(new URL('../motion/blender/civic-sculpture/build_finale.py',import.meta.url))).size>0);
});

test('Work links to Buffalo while retaining all three concepts and the Waterfront film',()=>{
 const items=workItems({homeEdition:'living-city'}),card=items.find(item=>item.id==='buffalo-civic');
 assert.equal(card.href,BUFFALO_STUDY_PATH);assert.equal(card.image,`/assets${manifest.poster}`);
 assert.match(card.status,/Studio art study/);assert.match(card.srcset,/480w/);
 for(const id of ['fieldwork','northline','hearthside','websites','search','handoff','workflow','studies'])assert.ok(items.some(item=>item.id===id),id);
 const html=workGallery({homeEdition:'living-city'});
 assert.match(html,/<a href="#buffalo-civic">Design studies<\/a>/);
 assert.match(html,/href="\/work\/buffalo-civic\/">Play the Buffalo animation<\/a>/);
 assert.match(html,/class="work-preview work-preview--sculpture"/);
 assert.match(html,/Play the earlier Waterfront animation/);assert.match(html,/\/assets\/waterfront\/film-landscape.mp4/);
 assert.doesNotMatch(html,/civic-sculpture-preview/);
});
