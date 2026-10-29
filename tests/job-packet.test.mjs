import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket,buildJobPacket} from '../scripts/job-packet.mjs';
import {currentOfferIds} from '../src/offer-catalog.mjs';
import {quotedOffer} from '../src/commercial.mjs';
import {v3Policy} from '../src/v3-offer-content.mjs';
const legacy=JSON.parse(await readFile(new URL('../operations/historical/offers-2026-10-24-pre-v3.json',import.meta.url),'utf8'));
const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));

test('current scopes and packets retain their distinct approved review, correction and exit terms',async()=>{
 for(const id of currentOfferIds(offers)){
  const p=quotedOffer(offers,id),recurring=Object.hasOwn(offers.plans,id),build=['launch_site','focused_site','business_site','signature_site','storefront'].includes(id);
  const scope=await draftScope(id,'synthetic-service-terms'),html=renderJobPacket(scope,{},offers);
  assert.equal(scope.defect_window,p.v3.support);assert.ok(html.includes(scope.included_revisions));
  assert.deepEqual(scope.commercial_boundaries.deliverables,p.v3.includes);
  assert.ok(p.v3.acceptance.every(check=>scope.acceptance_tests.includes(check)));
  assert.equal(scope.paid_work_rights,v3Policy(offers,'money_and_ownership','Deliverables and licenses'));
  assert.equal(scope.cancellation_reconciliation,v3Policy(offers,'money_and_ownership','Project cancellation')+' '+v3Policy(offers,'money_and_ownership','Exit'));
  if(!build)assert.doesNotMatch(JSON.stringify(scope.schedule),/design_review_window|staging_review_window|target_launch/);
  if(recurring){assert.equal(scope.schedule.service_end,null);assert.equal(scope.service_period.cycles,1);assert.equal(scope.billing_option,'monthly');}
  else if(!build){assert.equal(scope.schedule.written_completion_acceptance,null);assert.ok(scope.acceptance_tests.length>0);}
  if(id==='website_baseline')assert.match(scope.defect_window,/14.*clarification/);
  if(id==='audit_fix_sprint')assert.match(scope.defect_window,/30.*defect/);
 }
});

test('historically accepted annual scopes retain their own refund and exit terms',async()=>{
 for(const id of ['keep_running','improve','grow']){
  const scope=await draftScope(id,'synthetic-historical-annual',{billing:'annual',catalog:legacy}),html=renderJobPacket(scope,{},offers);
  assert.match(scope.cancellation_reconciliation,/within ten business days/);assert.match(scope.cancellation_reconciliation,/Undisputed unearned amounts/);
  assert.equal(scope.paid_work_rights,legacy.monthly_terms.exit);assert.equal(scope.service_period.cycles,12);
  assert.ok(html.includes(scope.included_revisions));assert.doesNotMatch(html,/Commercial mismatch/);
 }
});

test('local invoice drafts use exact milestones, escape client data and provide no payment or network action',async()=>{
 const scope=await draftScope('focused_site','synthetic-packet');
 scope.buyer_job='<script>alert("private")</script>';
 const html=renderJobPacket(scope,{entries:[{type:'Fit',note:'<img src=https://example.invalid/pixel>'}]},offers);
 assert.equal((html.match(/class="invoice"/g)||[]).length,3);
 for(const amount of ['$1,198.00','$898.50'])assert.ok(html.includes(amount));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));
 assert.ok(!/<(?:script|img|iframe|form)\b/i.test(html));
 assert.ok(!/href=["']https?:/i.test(html));
 assert.ok(html.includes('NOT ISSUED'));
});

test('commercial drift withholds invoice drafts instead of replacing agreed prices',async()=>{
 const scope=await draftScope('signature_site','synthetic-drift');scope.milestones[0].amount=1;
 const html=renderJobPacket(scope,{},offers);
 assert.ok(html.includes('Commercial mismatch'));assert.ok(!html.includes('class="invoice"'));
});

test('work packet preserves concurrent event details and all receipt sections without promoting template shapes',async()=>{
 const scope=await draftScope('focused_site','receipt-coverage');
 const receipt={status:'SYNTHETIC — fixture only',client_id:'receipt-coverage',accepted_scope_reference:'scope-v2',entries:[{
  date:'2026-10-14',type:'Change',note:'Client requested an edit',owner:'Fixture owner',
  artifact_reference:'artifact-v2',decision_reference:'approval-pending',actual_founder_hours:0,
  next_action:'Confirm revised date',next_action_due:'2026-10-16',evidence:[{check:'keyboard-fixture',passed:false}],unresolved:['Missing buyer input']
 }],entry_shape:{note:'UNUSED-ENTRY-SHAPE'},buyer_session_shape:{participant_code:'UNUSED-SESSION-SHAPE'},
 completed_artifacts:['artifact-a'],decisions:[{decision:'decision-a'}],status_notes:['status-a'],changes:[{change:'change-a'}],
 incidents:[{impact:'incident-a'}],actual_tests:[{result:'test-a'}],time_by_stage:[{stage:'labor-a',hours:0}],
 release_handoff:[{access:'handoff-a'}],monthly_services:[{renewal:'monthly-a'}],exit:[{unearned:'exit-a'}],
 buyer_sessions:[{exact_feedback:'<script>feedback</script>',task:'session-a'}],test_billing:[{reference:'draft-a',charged:false}]
 };
 const before=JSON.stringify(receipt),html=renderJobPacket(scope,receipt,offers);
 for(const value of ['Client requested an edit','Fixture owner','artifact-v2','approval-pending','Confirm revised date','2026-10-16','keyboard-fixture','Missing buyer input','artifact-a','decision-a','status-a','change-a','incident-a','test-a','labor-a','handoff-a','monthly-a','exit-a','session-a','draft-a','scope-v2'])assert.ok(html.includes(value),value);
 assert.ok(html.includes('<dd>0</dd>'));assert.ok(html.includes('<dd>No</dd>'));
 assert.ok(html.includes('&lt;script&gt;feedback&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('UNUSED-ENTRY-SHAPE'));assert.ok(!html.includes('UNUSED-SESSION-SHAPE'));
 assert.ok(html.includes('Internal working record'));assert.equal(JSON.stringify(receipt),before);
});

test('blank receipt sections remain explicitly unrecorded',async()=>{
 const scope=await draftScope('focused_site','blank-receipt');
 const receipt=JSON.parse(await readFile(new URL('../operations/templates/cumulative-receipt.json',import.meta.url),'utf8'));
 const html=renderJobPacket(scope,receipt,offers);
 assert.ok(html.includes('No event entries recorded'));
 for(const title of ['Scope changes','Incidents','Release and handoff','Exit and reconciliation'])assert.ok(html.includes(`<h3>${title}</h3><span class="pending">Not recorded</span>`),title);
 assert.ok(!html.includes('Buyer session shape'));assert.ok(!html.includes('Entry shape'));
});

test('private packets cannot be written into dist',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-packet-'));
 try{
  const job=join(root,'operations/jobs/example');await mkdir(job,{recursive:true});await mkdir(join(root,'dist'));
  await mkdir(join(root,'config'),{recursive:true});
  await writeFile(join(root,'config/offers.json'),JSON.stringify(offers));
  await writeFile(join(job,'accepted-scope.json'),JSON.stringify(await draftScope('focused_site','example')));
  await writeFile(join(job,'cumulative-receipt.json'),JSON.stringify({entries:[]}));
  await assert.rejects(()=>buildJobPacket(root,'dist'),/must stay in private/);
  const result=await buildJobPacket(root,'operations/jobs/example');
  assert.equal(result.issuedInvoices,0);assert.deepEqual(result.externalActions,[]);
  assert.ok((await readFile(join(job,'review.html'),'utf8')).includes('Private client draft'));
 }finally{await rm(root,{recursive:true,force:true});}
});
