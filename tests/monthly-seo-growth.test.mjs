import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
import {assertPackageVisualOffers} from '../src/package-visuals.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {renderPages} from '../src/pages.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,config,map,geography,previous]=await Promise.all(['config/offers.json','config/site.json','authority/v5/site-map.json','authority/v5/geography.json','operations/historical/offers-2026-10-18-expanded-websites.json'].map(read));

test('monthly scopes preserve delivered outputs, separate promotional reuse and research in saved contracts',async()=>{
 for(const id of ['keep_running','improve','grow']){
  const plan=offers.plans[id],scope=await draftScope(id,'synthetic-monthly-upgrade');
  for(const key of ['research','search_scope','growth_plan','promotion_reuse','reporting']){
   assert.deepEqual(scope.commercial_boundaries[key],plan[key]);
   assert.deepEqual(scope.commercial_snapshot.offer[key],plan[key]);
  }
  assert.equal(plan.monthly_price,previous.plans[id].monthly_price);
  assert.deepEqual(plan.annual,previous.plans[id].annual);
  const future=structuredClone(offers);future.plans[id].search_scope={method:'UNAPPROVED FUTURE RESEARCH'};
  const packet=renderJobPacket(scope,{},future);assert.doesNotMatch(packet,/UNAPPROVED FUTURE RESEARCH/);assert.equal((packet.match(/class="invoice"/g)||[]).length,1);
 }
 const grow=await draftScope('grow','synthetic-reuse');
 assert.match(grow.included_revisions,/additional small promotional reuse task/);
 assert.equal(grow.commercial_boundaries.promotion_reuse.graphic_sizes,3);
 assert.equal(grow.commercial_boundaries.promotion_reuse.newsletter_max_words,150);
 assert.match(grow.commercial_boundaries.promotion_reuse.scope,/No new creative concept.*email layout, account\/campaign setup, testing or sending/);
 assert.match(grow.defect_window,/same change, asset or resize never fulfills two allowances/);
 assert.match(grow.defect_window,/second approved improvement and its approved reuse task stay due/);
 const {availability,...currentAnnualRights}=offers.annual_terms;
 const {availability:previousAvailability,...previousAnnualRights}=previous.annual_terms;
 assert.deepEqual(currentAnnualRights,previousAnnualRights);
 assert.equal(offers.annual_enrollment_gate.verified,false);
 assert.match(availability,/Not currently offered for new enrollment; monthly billing only/);
 assert.match(availability,/Existing accepted annual agreements retain their original terms/);
 assert.match(previousAvailability,/available on request only after fit, capacity and refund-reserve checks/);
});

test('monthly research and reuse changes invalidate artwork rather than leaving old promises visible',()=>{
 for(const [id,key]of [['improve','search_scope'],['grow','growth_plan'],['grow','promotion_reuse']]){
  const changed=structuredClone(offers);changed.plans[id][key]={...changed.plans[id][key],changed:true};
  assert.throws(()=>assertPackageVisualOffers(changed),/configured offer scope changed/);
 }
});

test('monthly sales pages state included work while full research and reuse scope remains accessible',()=>{
 const pages=renderPages({config,offers,map,geography});
 for(const path of ['/pricing/','/services/seo/','/guides/seo-work-and-reporting/']){const html=pages.find(p=>p.path===path).html;assert.match(html,/research/i);assert.match(html,/90-day/);}
 const care=pages.find(p=>p.path==='/services/website-care/').html;assert.match(care,/Keep Running/);assert.match(care,/small text, photo or link changes you send/);assert.match(care,/one set of related changes together.*update the existing pages/);assert.match(care,/href="\/services\/seo\/"/);assert.doesNotMatch(care,/Two substantial connected improvements/);
 const packs=buyerPacks(offers);
 for(const [id,candidates] of [['improve',3],['grow',6]]){
  const pack=JSON.stringify(packs.find(p=>p.id===id).sections);assert.match(pack,new RegExp('Review up to '+candidates+' possible search opportunities'));assert.match(pack,/research/i);
  const html=pages.find(p=>p.path==='/checkout/'+id+'/').html;assert.match(pack,/writing/i);assert.match(html,/research/i);assert.ok(html.includes('/assets/buyer-packs/'+id));
 }
 assert.match(JSON.stringify(packs.find(p=>p.id==='grow').sections),/150 words/);
 assert.match(pages.find(p=>p.path==='/services/seo/').html,/No ranking, traffic, inquiry, revenue or AI-citation result is guaranteed/);
});
