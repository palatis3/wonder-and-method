import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const pages=renderPages({config,offers,map,geography}),page=path=>pages.find(x=>x.path===path).html;
test('saved content bookmarks and historical county downloads survive reviewed link selection',async()=>{
 for(const n of Array.from({length:12},(_,i)=>i+1))assert.ok(page('/privacy/').includes(`id="privacy-${n}"`),`privacy-${n}`);
 assert.match(page('/privacy/'),/<h2 id="responsibility">Who is responsible/);
 assert.match(page('/privacy/'),/<h2 id="record-retention">How long I keep records/);
 assert.match(page('/pricing/'),/id="cost-calculator"/);assert.match(page('/pricing/'),/href="\/payments\/#cost-calculator"/);
 assert.match(page('/services/website-care/'),/id="annual-terms"/);
 assert.ok(page('/areas/albany-county/').includes('/assets/county-briefs/albany.txt'));
 assert.ok(!page('/areas/onondaga-county/').includes('/assets/county-briefs/onondaga.txt'),'Reviewed unrelated worksheet is retained as a file without an irrelevant contextual link');
 for(const p of pages.filter(x=>/^\/areas\/[^/]+-county\/$/.test(x.path))){const slug=p.path.match(/^\/areas\/(.+)-county\//)[1];assert.ok(p.html.includes('id="buyer-task"'),slug);assert.ok((await readFile(new URL(`../src/assets/county-briefs/${slug}.txt`,import.meta.url),'utf8')).trim(),slug+' historical download retained');if(slug!=='erie')for(const id of ['approach','search'])assert.ok(p.html.includes(`id="${id}"`),slug+id);}
});
test('every rendered route retains directly reachable chat and native back-to-top controls',()=>{
 for(const p of pages){
  assert.match(p.html,/<a class="back-to-top" href="#page-top"/);assert.doesNotMatch(p.html,/<details class="support-chat-choice"/);
  const formPage=p.path==='/contact/'||p.path.startsWith('/checkout/')||/^\/work\/[^/]+\/request\/$/.test(p.path);
  if(formPage){assert.match(p.html,/<button\b[^>]+data-chat-open[^>]+aria-describedby="support-chat-description"[^>]*>Chat with Terry<\/button>/,p.path);assert.match(p.html,/<button class="support-chat-launch"/,p.path);}
  else{assert.match(p.html,/<button class="support-chat-launch"/,p.path);assert.match(p.html,/<small>Uses cookies<\/small>/,p.path);}
  assert.match(p.html,/id="support-chat-description"[^>]*>Chat runs on an outside service that uses cookies/);
  assert.match(p.html,/<noscript><p><a href="\/contact\/#inquiry">Use the contact form<\/a>\. Live chat needs JavaScript\.<\/p><\/noscript>/);
 }
});
