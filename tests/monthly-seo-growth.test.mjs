import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
import {assertPackageVisualOffers} from '../src/package-visuals.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {renderPages} from '../src/pages.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [offers,config,map,geography,previous]=await Promise.all(['config/offers.json','config/site.json','authority/v5/site-map.json','authority/v5/geography.json','operations/historical/offers-2026-10-24-pre-v3.json'].map(read));

test('V3 monthly contracts snapshot approved outputs, care and honest measurement',async()=>{
 const approved=await read('operations/v3-offers-20261029/approved-plan-catalog.json');
 for(const [id,price] of [['keep_running',275],['improve',1250],['local_focus',850],['grow',1750]]){
  const plan=offers.plans[id],scope=await draftScope(id,'synthetic-monthly-upgrade'),source=approved.plans.find(p=>p.id===plan.v3_plan_id);
  assert.equal(plan.monthly_price,price);assert.equal(source.price,price);const expectedIncludes=source.includes.map(line=>line.replace('uses both units.', 'uses two units.'));assert.deepEqual(scope.commercial_boundaries.deliverables,expectedIncludes);
  assert.deepEqual(scope.commercial_snapshot.offer.v3.includes,expectedIncludes);assert.deepEqual(scope.exclusions,source.excludes);
  for(const check of source.acceptance)assert.ok(scope.acceptance_tests.includes(check));
  const future=structuredClone(offers);future.plans[id].v3.includes=['UNAPPROVED FUTURE RESEARCH'];
  const packet=renderJobPacket(scope,{},future);assert.doesNotMatch(packet,/UNAPPROVED FUTURE RESEARCH/);assert.equal((packet.match(/class="invoice"/g)||[]).length,1);
  assert.equal(scope.service_period.cycles,1);assert.equal(scope.service_period.start,null);assert.equal(scope.accepted_at,null);
 }
 const {availability,...currentAnnualRights}=offers.annual_terms;
 const {availability:previousAvailability,...previousAnnualRights}=previous.annual_terms;
 assert.deepEqual(currentAnnualRights,previousAnnualRights);assert.equal(offers.annual_enrollment_gate.verified,false);
 assert.match(availability,/Existing accepted annual agreements retain their original terms/);
});

test('V3 care and local-search packs preserve distinct included work and avoid duplicate care bills',()=>{
 const packs=buyerPacks(offers),text=id=>JSON.stringify(packs.find(p=>p.id===id).sections);
 const care=text('keep_running');for(const pattern of [/quarterly/i,/recovery/i,/30 minutes/,/45 minutes/,/maintenance/i])assert.match(care,pattern);
 const improve=text('improve');assert.match(improve,/One main|one main/);assert.match(improve,/Care.*included|includes.*Care/i);
 const focus=text('local_focus');assert.match(focus,/one substantive output/);assert.match(focus,/no second Care bill/);assert.match(focus,/do not manufacture a baseline/);
 const grow=text('grow');for(const pattern of [/Two content\/SEO units/,/guide.*two units/,/up to five.*listing/i,/up to two individualized outreach/i,/not counted twice/,/duplicate care billing is prevented/])assert.match(grow,pattern);
 for(const id of ['improve','local_focus','grow'])assert.doesNotMatch(text(id),/1 extra graphic or short excerpt|150-word newsletter/);
});

test('monthly sales pages expose all four current monthly offers and full packs',()=>{
 const pages=renderPages({config,offers,map,geography});
 const care=pages.find(p=>p.path==='/services/website-care/').html;assert.match(care,/Website Care/);assert.match(care,/maintenance|recovery/i);
 for(const id of ['keep_running','improve','local_focus','grow']){
  const html=pages.find(p=>p.path==='/checkout/'+id.replaceAll('_','-')+'/').html;
  assert.ok(html.includes('/assets/buyer-packs/'+id));assert.ok(html.includes(offers.plans[id].public_name));
 }
 const seo=pages.find(p=>p.path==='/services/seo/').html;assert.match(seo,/90-day/);assert.match(seo,/not guaranteed|no.*guarantee/i);
});
