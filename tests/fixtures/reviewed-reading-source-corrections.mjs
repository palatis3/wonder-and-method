import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from '../../operations/reading-surfaces-20261028/source-corrections.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const changes=new Map(review.changes.map(change=>[change.path,change]));
assert.equal(changes.size,review.changes.length);
assert.deepEqual([...changes.keys()],['/areas/oklahoma/grant-county/']);
export function beforeReviewedReadingSourceCorrections(record){
 const change=changes.get(record.path);if(!change)return record;
 assert.equal(digest(record),change.afterRecordSha256,record.path+' reviewed source correction');
 assert.equal(digest(change.beforeRecord),change.beforeRecordSha256,record.path+' historical source acceptance');
 const changed=Object.keys(record).filter(key=>JSON.stringify(record[key])!==JSON.stringify(change.beforeRecord[key]));
 assert.deepEqual(changed,change.changedFields,record.path+' exact corrected fields');
 return structuredClone(change.beforeRecord);
}
