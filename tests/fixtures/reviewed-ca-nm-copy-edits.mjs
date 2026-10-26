import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import correction from '../../operations/ca-nm-expansion-20261026/us-spelling-correction.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function beforeReviewedCaNmCopyEdits(record){
 const edit=correction.edits.find(item=>item.path===record.path);if(!edit)return record;
 assert.equal(digest(record),edit.afterSha256,'Reviewed spelling correction changed: '+record.path);
 const before=structuredClone(record);
 for(const change of edit.changes){
  const keys=change.pointer.slice(1).split('/');let target=before;for(const key of keys.slice(0,-1))target=target[key];
  assert.equal(target[keys.at(-1)],change.after);target[keys.at(-1)]=change.before;
 }
 assert.equal(digest(before),edit.beforeSha256,'Only the reviewed spelling corrections may differ');return before;
}
