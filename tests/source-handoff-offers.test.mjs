import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import worker from '../deployment/worker.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography,previous]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','operations/historical/offers-2026-10-17-production-timing-clarity.json'].map(read));
const pages=renderPages({config,offers,map,geography});

test('V3 website handoff records the agreed platform, editing task and paid ownership rights',async()=>{
 for(const [id,price] of [['launch_site',2195],['focused_site',2995],['business_site',4495],['signature_site',6495]]){
  const p=offers[id],draft=await draftScope(id,'synthetic-source-handoff');assert.equal(p.public_price,price);
  assert.deepEqual(p.payment_schedule.map(m=>m.percent),[40,30,30]);
  const content=JSON.stringify(draft.commercial_boundaries);assert.match(content,/editing guide/i);assert.match(content,/recorded demonstration/);assert.match(content,/one real editing task/);
  assert.match(draft.paid_work_rights,/editable source files/);assert.match(draft.paid_work_rights,/license and ownership limits/);
  assert.equal(draft.commercial_snapshot.version,offers.version);
 }
});

test('public offers explain agreed editing workflows and preserve retired-route boundaries',()=>{
 for(const path of ['/pricing/','/services/web-design/']){
  const html=pages.find(p=>p.path===path).html;assert.match(html,/platform and editing workflow before booking/);assert.match(html,/recorded demonstration/);assert.match(html,/which changes you can make yourself/);
 }
 assert.ok(!pages.some(p=>p.path==='/work/content-editor/'));
 const value=validateInquiry({name:'Synthetic',email:'sample@example.test',business:'Fictional studio',service:'signature_site',message:'Synthetic check of retired workflow choices.',workflow:'client_portal'}).value;
 assert.ok(!Object.hasOwn(value,'workflow'));
 for(const pack of buyerPacks(offers))assert.doesNotMatch(JSON.stringify(pack),/START-HERE\.md|\bMarkdown\b/);
});

test('withdrawn editor route redirects GET and HEAD to the public source example',async()=>{
 for(const method of ['GET','HEAD']){
  const result=await worker.fetch(new Request('https://studio.example.test/work/content-editor/?from=saved-link',{method}),{ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',PUBLIC_ORIGIN:'https://studio.example.test'},{});
  assert.equal(result.status,308);assert.equal(result.headers.get('location'),'https://studio.example.test/work/source-handoff/?from=saved-link');
 }
 const page=pages.find(p=>p.path==='/work/source-handoff/');assert.match(page.html,/name="robots" content="index,follow"/);assert.match(page.html,/It has no live inquiry system/);
});

test('the public handoff download is the exact independently checked fictional archive',async()=>{
 const bytes=await readFile(new URL('../src/assets/source-handoff/fictional-maple-studio.zip',import.meta.url));
 const sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,'21190e9af341b6e889c9581debe456423b2a99d93728a579aade1dabb61650c0');
 assert.ok(pages.find(p=>p.path==='/work/source-handoff/').html.includes(sha));
 await assert.rejects(access(new URL('../src/assets/editor-walkthrough/sample-content-export.zip',import.meta.url)));
});
