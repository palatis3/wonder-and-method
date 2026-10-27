import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import faqs from '../src/service-faqs.json' with {type:'json'};
import fixture from './fixtures/ux-copy-edits.json' with {type:'json'};
import ledger from '../operations/ux-improvements-20261027/local-copy-changes.json' with {type:'json'};
import {beforeReviewedUxCopyEdits,beforeReviewedUxFaqEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
import {beforeReviewedHumanQualityEdits} from './fixtures/reviewed-human-quality-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('UX copy acceptance restores only the 49 reviewed records and one multilingual FAQ',()=>{
 assert.equal(fixture.records.length,49);assert.equal(fixture.records.reduce((n,r)=>n+r.edits.length,0),295);
 assert.deepEqual(fixture.records.map(r=>r.path).sort(),ledger.changes.map(r=>r.path).sort());
 for(const change of fixture.records){
  const live=records.find(r=>r.path===change.path),current=beforeReviewedHumanQualityEdits(live),before=beforeReviewedUxCopyEdits(live);
  assert.equal(hash(before),change.beforeSha256);assert.equal(hash(current),change.afterSha256);
  const logged=ledger.changes.find(r=>r.path===change.path);
  assert.deepEqual(change.edits.map(e=>'/'+e.path.join('/')).sort(),logged.fields.map(e=>e.field).sort());
  for(const edit of change.edits){
   assert.ok(['lead','decisionTitle','decision','scopeTrigger','scopes','quoteQuestions','sources','coverageNote'].includes(edit.path[0]),edit.path.join('.'));
   if(edit.path[0]==='sources')assert.equal(edit.path.at(-1),'label');
  }
  for(const field of ['path','areaId','areaIds','directoryLinks','servedAreas','checkedAt','updatedAt'])assert.deepEqual(current[field],before[field],change.path+' '+field);
  assert.deepEqual(current.sources.map(({label,...rest})=>rest),before.sources.map(({label,...rest})=>rest));
 }
 assert.equal(fixture.faqs.length,1);assert.equal(fixture.faqs[0].path,'/areas/queens-county/');
 const path=fixture.faqs[0].path;assert.equal(hash(beforeReviewedUxFaqEdits(path,faqs[path])),fixture.faqs[0].beforeSha256);
});
test('historical acceptance rejects unreviewed edits rather than masking them',()=>{
 const current=records.find(r=>r.path===fixture.records[0].path);
 for(const tamper of [r=>{r.lead+=' Unreviewed wording.';},r=>{r.sources[0].url='https://example.invalid/';},r=>{r.unreviewed=true;}]){
  const changed=structuredClone(current);tamper(changed);assert.throws(()=>beforeReviewedUxCopyEdits(changed),/approved UX revision/);
 }
 const answers=structuredClone(faqs['/areas/queens-county/']);answers[0].answer+=' Unreviewed.';
 assert.throws(()=>beforeReviewedUxFaqEdits('/areas/queens-county/',answers),/approved UX revision/);
});
