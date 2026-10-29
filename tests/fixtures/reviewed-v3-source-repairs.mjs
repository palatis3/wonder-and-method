import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from './source-repairs-v3-20261029.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const records=new Map(review.records.map(row=>[row.path,row]));

// Accept only the full independently reviewed current record, then reconstruct
// its original value for the frozen historical preservation test.
export function beforeReviewedV3SourceRepairs(record){
 const change=records.get(record.path);
 if(!change)return record;
 assert.equal(digest(record),change.afterSha256,record.path+' approved source repair');
 const before=structuredClone(record);
 for(const edit of change.edits){
  let parent=before;
  for(const key of edit.path.slice(0,-1))parent=parent[key];
  const key=edit.path.at(-1);
  assert.deepEqual(parent[key],edit.after,record.path+' approved field '+edit.path.join('.'));
  parent[key]=structuredClone(edit.before);
 }
 assert.equal(digest(before),change.beforeSha256,record.path+' original accepted record');
 return before;
}
