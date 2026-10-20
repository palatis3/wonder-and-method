import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const pages=renderPages({config,offers,map,geography}),page=path=>pages.find(x=>x.path===path).html;
test('saved content bookmarks and all ten county worksheets survive consolidation',()=>{
 for(const n of Array.from({length:12},(_,i)=>i+1))assert.ok(page('/privacy/').includes(`id="privacy-${n}"`),`privacy-${n}`);
 assert.match(page('/privacy/'),/<h2 id="privacy-2">Who is responsible/);
 assert.match(page('/privacy/'),/<h2 id="privacy-7">How long I keep records/);
 assert.match(page('/pricing/'),/id="cost-calculator"/);assert.match(page('/pricing/'),/href="\/payments\/#cost-calculator"/);
 assert.match(page('/services/website-care/'),/id="annual-terms"/);
 for(const p of pages.filter(x=>/^\/areas\/[^/]+-county\/$/.test(x.path))){const slug=p.path.match(/^\/areas\/(.+)-county\//)[1];assert.ok(p.html.includes('id="buyer-task"'),slug);assert.ok(p.html.includes(`/assets/county-briefs/${slug}.txt`),slug);if(slug!=='erie')for(const id of ['approach','search'])assert.ok(p.html.includes(`id="${id}"`),slug+id);}
});
test('every rendered route retains directly reachable chat and native back-to-top controls',()=>{
 for(const p of pages){assert.match(p.html,/<a class="back-to-top" href="#page-top"/);assert.match(p.html,/<button class="support-chat-launch"/);assert.doesNotMatch(p.html,/<details class="support-chat-choice"/);assert.match(p.html,/<small>Uses cookies<\/small>/);}
});
