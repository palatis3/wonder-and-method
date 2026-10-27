import {beforeReviewedUxCopyEdits} from './reviewed-ux-copy-edits.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from '../../operations/az-or-expansion-20261026/source-corrections.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const changes=new Map(review.changes.map(change=>[change.path,change]));
assert.deepEqual([...changes.keys()].sort(),['/areas/tennessee/hardeman-county/','/areas/tennessee/unicoi-county/']);
export function beforeReviewedSourceCorrections(record){
 record=beforeReviewedUxCopyEdits(record);
 const change=changes.get(record.path);if(!change)return record;
 assert.equal(digest(record),change.afterRecordSha256,record.path+' reviewed source correction');
 assert.equal(digest(change.beforeRecord),change.beforeRecordSha256,record.path+' historical source acceptance');
 const changed=Object.keys(record).filter(key=>JSON.stringify(record[key])!==JSON.stringify(change.beforeRecord[key]));
 assert.deepEqual(changed,change.changedFields,record.path+' exact corrected fields');
 return structuredClone(change.beforeRecord);
}
