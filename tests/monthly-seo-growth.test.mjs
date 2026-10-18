import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
import {assertPackageVisualOffers} from '../src/package-visuals.mjs';
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
 assert.match(grow.defect_window,/second accepted improvement and its accepted promotional reuse task stay owed/);
 assert.deepEqual(offers.annual_terms,previous.annual_terms);
});

test('monthly research and reuse changes invalidate artwork rather than leaving old promises visible',()=>{
 for(const [id,key]of [['improve','search_scope'],['grow','growth_plan'],['grow','promotion_reuse']]){
  const changed=structuredClone(offers);changed.plans[id][key]={...changed.plans[id][key],changed:true};
  assert.throws(()=>assertPackageVisualOffers(changed),/configured offer scope changed/);
 }
});

test('new SEO, care, guide and request pages expose complete output and research scope without invented metrics',()=>{
 const pages=renderPages({config,offers,map,geography});
 for(const path of ['/pricing/','/services/seo/','/services/website-care/','/guides/seo-work-and-reporting/']){
  const html=pages.find(p=>p.path===path).html;
  assert.match(html,/Semrush/);assert.match(html,/90-day/);assert.match(html,/150 words/);assert.match(html,/keyword opportunit/i);
 }
 const seo=pages.find(p=>p.path==='/services/seo/').html;
 assert.match(seo,/difficulty.*does not|does not.*guarantee/i);
 for(const id of ['improve','grow']){
  const html=pages.find(p=>p.path==='/checkout/'+id+'/').html;
  assert.match(html,/Complete writing/);assert.match(html,/Monthly.*opportunity|monthly opportunity/);
  assert.ok(html.includes(offers.plans[id].category));
 }
});
