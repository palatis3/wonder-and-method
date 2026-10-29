import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/offers.json' with {type:'json'};
import historical from '../operations/historical/offers-2026-10-29-v3.json' with {type:'json'};
import {normalizeOfferCatalog,publicOfferProjection} from '../src/offer-catalog.mjs';
import {quotedOffer} from '../src/commercial.mjs';
import {priceList,calculateCost,costEstimateCopy,inquiryRequestSummary,selectedInquiryContext} from '../src/shared.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {buyerPacks,assertUniquePackSentences} from '../src/buyer-packs.mjs';

const offers=normalizeOfferCatalog(raw),prices=priceList(offers);
const variants={keep_running:{brochure:149,commerce:295},improve:{production:299,brochure:399,commerce:545},local_focus:{production:199,brochure:299,commerce:445},grow:{production:499,brochure:599,commerce:745}};
const valid={name:'Synthetic visitor',email:'visitor@example.com',message:'Please help me select the appropriate plan.'};

for(const [id,options] of Object.entries(variants))for(const [variant,fee] of Object.entries(options))test(`V4 ${id}/${variant} freezes the selected fee and Care responsibilities`,async()=>{
 const quote=quotedOffer(offers,id,'monthly',{care_variant:variant});
 const draft=await draftScope(id,'synthetic-v4',{care_variant:variant});
 assert.equal(quote.public_price,fee);assert.equal(draft.fixed_price,fee);
 assert.equal(draft.commercial_snapshot.offer.care_variant,variant);
 assert.deepEqual(draft.milestones.map(x=>x.amount),[fee]);
 assert.equal(draft.commercial_snapshot.offer.selected_variant.care,variant!=='production');
 const scope=draft.commercial_boundaries.deliverables.join(' ');
 assert.match(scope,variant==='production'?/Production only: maintenance, incident response, recovery tests and the Care edit allowance are not included/:/60 minutes of supplied edits and response obligations are included once/);
 assert.match(scope,variant==='brochure'?/offset reduces the W&M invoice/:/No hosting offset applies to this variant/);
 if(['grow','local_focus'].includes(id))assert.match(scope,/One business location and one primary service area/);
 if(id!=='keep_running')assert.match(scope,/cycle still includes all promised production outputs/);
 const estimate=calculateCost(prices,{build:'existing',plan:id,careVariant:variant,cycles:3,hostingMonths:3,hostingMonthly:20,hostingEligible:true,external:0});
 assert.equal(estimate.monthly,fee);assert.equal(estimate.hostingOffset,variant==='brochure'?60:0);
 assert.equal(estimate.total,fee*3+60-(variant==='brochure'?60:0));
 const inquiry=validateInquiry({...valid,service:id,care_variant:variant});assert.deepEqual(inquiry.errors,{});assert.equal(inquiry.value.care_variant,variant);
 assert.ok(inquiryRequestSummary(inquiry.value).includes('$'+fee));
});

test('hosting offset is documented eligible spend, capped per paid cycle, and never invents unknown costs',()=>{
 const options={build:'existing',plan:'local_focus',cycles:3,hostingMonths:12,careVariant:'brochure',external:0};
 for(const [hostingMonthly,hostingEligible,offset,total] of [[0,true,0,897],[20,true,60,1077],[50,true,75,1422],[50,false,0,1497]]){
  const estimate=calculateCost(prices,{...options,hostingMonthly,hostingEligible});
  assert.equal(estimate.hostingOffset,offset);assert.equal(estimate.total,total);
 }
 const unknown=calculateCost(prices,{...options,hostingMonthly:null,hostingEligible:true});
 assert.equal(unknown.total,null);assert.equal(unknown.hostingOffset,0);assert.equal(unknown.offsetPending,true);assert.deepEqual(unknown.missingComponents,['hosting']);
 assert.match(costEstimateCopy(unknown,{prices,plan:'local_focus',external:0}).note,/eligible hosting offset is still unknown/);
 const future=calculateCost(prices,{...options,cycles:12,hostingMonthly:20});
 assert.match(costEstimateCopy(future,{prices,plan:'local_focus',external:0}).note,/longer than three paid cycles assumes the current fee continues/);
});

test('invalid Care combinations and duplicate onboarding are rejected before quoting or estimating',()=>{
 assert.throws(()=>quotedOffer(offers,'keep_running','monthly',{care_variant:'production'}),/does not offer/);
 assert.throws(()=>quotedOffer(offers,'launch_site','monthly',{care_variant:'commerce'}),/does not offer/);
 assert.throws(()=>calculateCost(prices,{plan:'keep_running',careVariant:'production'}),/supported care variant/);
 assert.throws(()=>calculateCost(prices,{plan:'improve',careVariant:'production',onboarding:'brochure'}),/no Care onboarding fee/);
 assert.throws(()=>calculateCost(prices,{plan:'improve',onboarding:'brochure',add_ons:['care_onboarding']}),/only once/);
 const invalid=validateInquiry({...valid,service:'keep_running',care_variant:'production'});
 assert.ok(invalid.errors.care_variant);assert.equal(invalid.value.care_variant,undefined);
 assert.deepEqual(selectedInquiryContext({service:'workflow',care_variant:'commerce',workflow_variant:'complex'}),{workflow_variant:'complex'});
});

test('workflow routes keep the same fee while freezing separate non-stacking scopes',async()=>{
 const simple=await draftScope('workflow','synthetic-simple',{workflow_variant:'simple'});
 const complex=await draftScope('workflow','synthetic-complex',{workflow_variant:'complex'});
 for(const draft of [simple,complex])assert.equal(draft.fixed_price,1495);
 assert.equal(simple.commercial_snapshot.offer.workflow_variant,'simple');
 assert.equal(complex.commercial_snapshot.offer.workflow_variant,'complex');
 assert.match(simple.commercial_boundaries.deliverables[0],/Up to five distinct simple native automations/);
 assert.doesNotMatch(complex.commercial_boundaries.deliverables.join(' '),/Up to five distinct simple native automations/);
 assert.match(complex.commercial_boundaries.planned_timing,/5–10/);
 assert.throws(()=>quotedOffer(offers,'systems','monthly',{workflow_variant:'complex'}),/supported workflow route/);
});

test('V4 drafts leave previous catalog prices and delivered scope isolated',async()=>{
 const inputBefore=JSON.stringify(historical),old=await draftScope('focused_site','synthetic-old',{catalog:historical});
 const snapshot=JSON.stringify(old),current=await draftScope('focused_site','synthetic-current');
 assert.equal(old.fixed_price,4500);assert.equal(current.fixed_price,2995);
 assert.equal(old.commercial_snapshot.offer.marketing_page_cap,10);assert.equal(current.commercial_snapshot.offer.marketing_page_cap,15);
 const changed=structuredClone(raw);changed.focused_site.public_price=3300;
 const future=await draftScope('focused_site','synthetic-future',{catalog:changed});assert.equal(future.fixed_price,3300);
 assert.equal(JSON.stringify(old),snapshot);assert.equal(JSON.stringify(historical),inputBefore);
});

test('public catalog exposes choice prices while complete scope downloads stay readable',()=>{
 const publicCatalog=publicOfferProjection(offers);
 for(const [id,options] of Object.entries(variants))for(const [variant,price] of Object.entries(options))assert.equal(publicCatalog.plans[id].variants[variant].price,price);
 assert.doesNotMatch(JSON.stringify(publicCatalog),/internal_planning|reservedHours|baseHours|economics/);
 const packs=buyerPacks(offers);assert.equal(packs.length,15);assert.doesNotThrow(()=>assertUniquePackSentences(packs));
 for(const pack of packs){
  const main=pack.sections.filter(s=>!s.disclosure).flatMap(s=>s.items).join(' ');
  assert.ok(main.split(/\s+/u).length<900,pack.id+' main reading path');
 }
});
