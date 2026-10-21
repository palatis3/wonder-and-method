import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket,buildJobPacket} from '../scripts/job-packet.mjs';
const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));

test('one-off and recurring scopes and packets retain their own review, correction and exit terms',async()=>{
 for(const id of ['audit_fix_sprint','website_baseline','keep_running','improve','grow']){
  const recurring=Object.hasOwn(offers.plans,id);
  for(const billing of recurring?['monthly','annual']:['monthly']){
   const scope=await draftScope(id,'synthetic-service-terms',{billing}),html=renderJobPacket(scope,{},offers);
   assert.doesNotMatch(JSON.stringify(scope),/consolidated design round|consolidated staging round|after launch|design_review_window|staging_review_window|target_launch/);
   assert.doesNotMatch(html,/consolidated design round|consolidated staging round|30 calendar days after launch|design review window|staging review window|target launch/);
   assert.ok(html.includes(scope.included_revisions),id+' revisions are rendered');
   if(recurring){
    assert.match(scope.defect_window,/My own defects and already-promised launch work are corrected or completed without using a paid allowance/);assert.match(scope.defect_window,/still owe it to you/);
    assert.doesNotMatch(scope.defect_window,/30 calendar days/);assert.equal(scope.paid_work_rights,offers.monthly_terms.exit);
    assert.equal(scope.schedule.service_end,null);
    if(id==='keep_running')assert.match(scope.included_revisions,/related small-change batch/);else assert.match(scope.included_revisions,/One consolidated refinement and QA per main improvement/);
    if(billing==='annual'){assert.match(scope.cancellation_reconciliation,/within ten business days/);assert.match(scope.cancellation_reconciliation,/Undisputed unearned amounts/);}
   }else{
    assert.equal(scope.defect_window,offers.one_off_terms.correction);assert.match(html,/30 calendar days after your written approval of its completion/);
    assert.equal(scope.included_revisions,id==='website_baseline'?offers.baseline.refinement:offers.one_off_terms.acceptance);assert.match(scope.included_revisions,/One round of (?:changes|these changes)/);assert.match(scope.included_revisions,/checks.*included/);assert.equal(scope.paid_work_rights,offers.one_off_terms.ownership);assert.equal(scope.cancellation_reconciliation,offers.one_off_terms.remedy);
    assert.equal(scope.schedule.written_completion_acceptance,null);assert.ok(scope.acceptance_tests.length>0);
   }
  }
 }
});

test('local invoice drafts use exact milestones, escape client data and provide no payment or network action',async()=>{
 const scope=await draftScope('focused_site','synthetic-packet');
 scope.buyer_job='<script>alert("private")</script>';
 const html=renderJobPacket(scope,{entries:[{type:'Fit',note:'<img src=https://example.invalid/pixel>'}]},offers);
 assert.equal((html.match(/class="invoice"/g)||[]).length,3);
 for(const amount of ['$1,175.00','$705.00','$470.00'])assert.ok(html.includes(amount));
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
