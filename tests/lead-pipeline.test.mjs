import test from 'node:test';
import assert from 'node:assert/strict';
import {updateLead,pipelineReport} from '../scripts/lead-pipeline.mjs';
const input={economic_buyer_id:'fixture-buyer',inquiry_reference:'fixture-ref',buyer_job:'Make the service clearer',appropriate_offer:'focused_site',source:'referral'};
test('one buyer retains one reference and stage updates do not inflate lead counts',()=>{
 const first=updateLead({rows:[]},input,'2026-10-17T12:00:00Z');
 const second=updateLead(first,{...input,stage:'qualified'},'2026-10-18T12:00:00Z');
 assert.equal(second.rows.length,1);assert.equal(second.rows[0].stage_history.length,2);assert.equal(first.rows[0].stage,'received');
 assert.throws(()=>updateLead(second,{...input,economic_buyer_id:'another'}),/already linked/);
 assert.throws(()=>updateLead(second,{...input,inquiry_reference:'another-ref'}),/existing buyer reference/);
});
test('stage evidence and fixed service/source categories prevent unsupported reports',()=>{
 assert.throws(()=>updateLead({rows:[]},{...input,stage:'won'}),/scope/);
 assert.throws(()=>updateLead({rows:[]},{...input,stage:'won',scope_link:'private-scope'}),/evidence/);
 assert.throws(()=>updateLead({rows:[]},{...input,stage:'lost'}),/outcome reason/);
 assert.throws(()=>updateLead({rows:[]},{...input,source:'inferred from IP'}),/category/);
 assert.throws(()=>updateLead({rows:[]},{...input,quoted_amount:-1}),/nonnegative/);
});
test('aggregate report excludes identifying data and flags actions and retention for review',()=>{
 const board=updateLead({rows:[]},{...input,next_action_date:'2026-10-16',inquiry_retention_due_at:'2026-10-17'},'2026-10-15T12:00:00Z');
 const report=pipelineReport(board,'2026-10-17T12:00:00Z');
 assert.equal(report.current_stages.received,1);assert.equal(report.by_stated_source.referral.received,1);assert.equal(report.overdue_next_actions,1);assert.equal(report.retention_reviews_due,1);
 assert.doesNotMatch(JSON.stringify(report),/fixture-buyer|fixture-ref|Make the service clearer/);
});
test('a missing retention date is derived from the recorded contact and an expired deadline requires review',()=>{
 const board=updateLead({rows:[]},{...input,last_substantive_contact_at:'2026-01-01'},'2026-10-17T12:00:00Z');
 const report=pipelineReport(board,'2026-10-17T12:00:00Z');
 assert.equal(report.retention_reviews_due,1);assert.equal(report.retention_dates_missing,0);assert.equal(board.rows[0].inquiry_retention_due_at,'2026-04-01T00:00:00.000Z');
});

test('a distant retention date cannot hide old contact and exceptions expire for review',()=>{
 const now='2026-10-17T12:00:00Z',invalid={...input,last_substantive_contact_at:'2020-01-01',inquiry_retention_due_at:'2099-01-01'};
 assert.throws(()=>updateLead({rows:[]},invalid,now),/90 days/);
 assert.equal(pipelineReport({rows:[{...invalid,stage:'received'}]},now).retention_reviews_due,1);
 for(const exception of [{retention_exception:'Dispute'},{retention_exception:'Dispute',retention_exception_review_at:'2099-01-01'},{retention_exception_review_at:'2026-11-01'}])assert.throws(()=>updateLead({rows:[]},{...invalid,...exception},now),/exception/);
 const board=updateLead({rows:[]},{...invalid,retention_exception:'Documented preservation request',retention_exception_review_at:'2026-11-01'},now);
 assert.equal(pipelineReport(board,now).retention_reviews_due,0);
 assert.equal(pipelineReport(board,'2026-11-02T12:00:00Z').retention_reviews_due,1);
 assert.equal(pipelineReport({rows:[{...input,stage:'received',inquiry_retention_due_at:'2099-01-01'}]},now).retention_contacts_unknown,1);
});

test('a newly recorded substantive contact advances the derived deadline without changing old board data',()=>{
 const first=updateLead({rows:[]},{...input,last_substantive_contact_at:'2026-06-01'},'2026-06-02T12:00:00Z');
 const updated=updateLead(first,{...input,last_substantive_contact_at:'2026-10-17'},'2026-10-17T12:00:00Z');
 assert.equal(first.rows[0].inquiry_retention_due_at,'2026-08-30T00:00:00.000Z');assert.equal(updated.rows[0].inquiry_retention_due_at,'2027-01-15T00:00:00.000Z');
 assert.equal(pipelineReport(updated,'2026-10-17T12:00:00Z').retention_reviews_due,0);
});
