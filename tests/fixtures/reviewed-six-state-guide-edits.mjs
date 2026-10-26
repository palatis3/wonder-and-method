import {beforeReviewedSourceCorrections} from './reviewed-source-corrections.mjs';
// Reconstruct frozen acceptance only for explicit link and scope corrections.
// Every current record must first match the complete reviewed after-record hash.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from '../../operations/six-state-release-20261026/guide-link-corrections.json' with {type:'json'};
import scopeCorrection from '../../operations/six-state-release-20261026/sumner-scope-correction.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const edits=new Map(review.changes.map(row=>[row.path,row]));
assert.equal(edits.size,19);
export function beforeReviewedSixStateGuideEdits(record){
 record=beforeReviewedSourceCorrections(record);
 if(record.path===scopeCorrection.path){
  assert.equal(digest(record),scopeCorrection.afterRecordSha256,record.path+' corrected scope record');
  assert.equal(record.scopeTrigger,scopeCorrection.afterScopeTrigger);
  record={...record,scopeTrigger:scopeCorrection.beforeScopeTrigger};
  assert.equal(digest(record),scopeCorrection.beforeRecordSha256,record.path+' original scope record');
 }
 const edit=edits.get(record.path);if(!edit)return record;
 assert.equal(digest(record),edit.afterRecordSha256,record.path+' reviewed current record');
 assert.deepEqual(record.relatedGuides,edit.afterRelatedGuides,record.path+' reviewed links');
 const before={...record,relatedGuides:edit.beforeRelatedGuides};
 assert.equal(digest(before),edit.beforeRecordSha256,record.path+' frozen acceptance record');
 return before;
}
