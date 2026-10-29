import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeOfferCatalog} from '../src/offer-catalog.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {approvedConditionalPages} from '../src/conditional.mjs';
const o=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));

test('private editorial preview renders all conditional drafts without creating approvals',()=>{
 const config={mode:'staging',guideApprovals:[],careReady:false};
 const pages=approvedConditionalPages(config,o,{previewDrafts:true});
 assert.equal(pages.length,66);
 assert.ok(pages.every(p=>/draft/i.test(p.body)));
 assert.ok(pages.find(p=>p.path==='/services/website-care/').body.includes('Not yet confirmed'));
 assert.deepEqual(config.guideApprovals,[]);
 assert.equal(config.careReady,false);
 assert.deepEqual(approvedConditionalPages(config,o),[]);
 assert.throws(()=>approvedConditionalPages({...config,mode:'production'},o,{previewDrafts:true}),/cannot render in production/);
});
test('new draft quotes inherit exact authority boundaries without pretending acceptance',async()=>{for(const key of ['launch_site','focused_site','business_site','signature_site','storefront']){const draft=await draftScope(key,'synthetic-test');assert.equal(draft.fixed_price,o[key].public_price);assert.equal(draft.milestones.reduce((s,x)=>s+x.amount,0),draft.fixed_price);assert.equal(draft.accepted_at,null);assert.equal(draft.external_costs.length,0);assert.ok(draft.milestones.every(m=>!m.payment_confirmed&&!m.due_date));assert.deepEqual(draft.commercial_boundaries.deliverables,normalizeOfferCatalog(o)[key].v3.includes);assert.deepEqual(draft.commercial_boundaries.stages,o[key].v3.stages);assert.ok(o[key].v3.acceptance.every(check=>draft.acceptance_tests.includes(check)));assert.deepEqual(draft.exclusions,o[key].v3.excludes);assert.ok(!draft.exclusions[0].includes('one inquiry form'));assert.ok(!draft.exclusions[0].includes('one contact form'));}await assert.rejects(()=>draftScope('focused_site','../outside'));});
test('guide and Care routes require distinct review/coverage evidence',()=>{assert.deepEqual(approvedConditionalPages({},o),[]);assert.throws(()=>approvedConditionalPages({guideApprovals:['/guides/website-project-cost/']},o));assert.throws(()=>approvedConditionalPages({careReady:true},o));const pages=approvedConditionalPages({guideApprovals:[{path:'/guides/website-project-cost/',evidenceReference:'SYNTHETIC TEST ONLY',reviewedBy:'Synthetic Reviewer',reviewedAt:'2026-10-13'}]},o);assert.equal(pages.length,1);assert.ok(pages[0].body.includes('$4,500'));assert.ok(pages[0].body.includes('$8,160'));});
