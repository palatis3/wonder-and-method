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

test('new website scope preserves prices and rights while recording source delivery',async()=>{
 for(const [id,connections] of [['launch_site',1],['focused_site',2],['signature_site',2]]){
  const p=offers[id],old=previous[id],draft=await draftScope(id,'synthetic-source-handoff');
  for(const key of ['public_price'])assert.deepEqual(p[key],old[key],id+' '+key);
  assert.deepEqual(p.payment_schedule.map(({percent,amount})=>({percent,amount})),old.payment_schedule.map(({percent,amount})=>({percent,amount})));
  assert.equal(p.initial_launch_count,1);assert.equal(p.training_minutes,30);assert.equal(p.external_connection_limit,connections);assert.deepEqual(p.cms,{collections:0,editors:0});
  assert.match(p.platform_fit,/You get the source code and content files/);assert.match(p.platform_fit,/your own developer can edit and publish them/);assert.match(p.platform_fit,/not a WordPress site or drag-and-drop editor/);assert.doesNotMatch(p.platform_fit,/browser editor|CMS/);
  assert.match(p.account_setup,/One initial website launch/);assert.match(p.handoff,/folder or ZIP/);assert.match(p.training,/optional call of up to 30 minutes/);assert.match(p.correction,/30/);
  assert.equal(draft.commercial_snapshot.version,offers.version);
  assert.equal(draft.commercial_boundaries.platform_fit,p.platform_fit);
  assert.match(JSON.stringify(draft.exclusions),/assessed and quoted before work begins/);
 }
 assert.ok(previous.workflow_menu.client_portal);assert.deepEqual(previous.focused_site.cms,{collections:3,editors:2});
 assert.ok(!Object.hasOwn(offers,'workflow_menu'));
});

test('every rendered route and buyer pack withdraws positive promises of bundled editors, apps and growth programs',()=>{
 const html=pages.map(p=>p.html).join('\n')+'\n'+JSON.stringify(buyerPacks(offers));
 for(const pattern of [/Focused and Signature include (?:supported |bounded )?CMS/i,/Focused adds a browser/i,/Signature includes one (?:agreed |scoped )?workflow/i,/Choose ONE: a new-inquiry tracker/i,/day-30 review with one (?:contained|agreed small)/i,/reviews around days 30, 60 and 90/i,/up to (?:60|90|120) minutes of (?:scheduled )?(?:training|handoff)/i,/\/assets\/editor-walkthrough\//,/name="workflow"/])assert.doesNotMatch(html,pattern);
 assert.match(pages.find(p=>p.path==='/').html,/href="\/pricing\/"/);for(const path of ['/pricing/','/services/web-design/','/work/source-handoff/']){const copy=pages.find(p=>p.path===path).html;assert.match(copy,/website files/i);assert.match(copy,/developer/i);assert.match(copy,/no drag-and-drop editor/i);}
 assert.equal(pages.length,286);assert.ok(!pages.some(p=>p.path==='/work/content-editor/'));
 const value=validateInquiry({name:'Synthetic',email:'sample@example.test',business:'Fictional studio',service:'signature_site',message:'Synthetic check of retired workflow choices.',workflow:'client_portal'}).value;
 assert.ok(!Object.hasOwn(value,'workflow'));
});

test('client copy explains marketing pages without retired-plan comparisons or document-format jargon',()=>{
 const retired=/browser (?:content )?editor|browser CMS|publishing dashboard|browser publishing system|browser editing|previously accepted bundled|historical accepted|build-funded|START-HERE\.md|\bMarkdown\b/i;
 for(const page of pages)assert.doesNotMatch(page.html,retired,page.path);
 for(const pack of buyerPacks(offers))assert.doesNotMatch(JSON.stringify(pack),retired,pack.id);
 const pricing=pages.find(p=>p.path==='/pricing/').html;
 assert.match(pricing,/id="marketing-pages"/);
 assert.match(pricing,/Home, About, a service, an article and Contact each count when they have their own address/);
 assert.match(pricing,/Guides count within the package limit/);
 assert.match(pricing,/Plain policy pages you supply are outside that count/);
 assert.match(pricing,/legal writing is separate/);
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
