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
test('a missing retention date requires review even when an old contact is recorded',()=>{
 const board=updateLead({rows:[]},{...input,last_substantive_contact_at:'2026-01-01'},'2026-10-17T12:00:00Z');
 const report=pipelineReport(board,'2026-10-17T12:00:00Z');
 assert.equal(report.retention_reviews_due,1);assert.equal(report.retention_dates_missing,1);
});
