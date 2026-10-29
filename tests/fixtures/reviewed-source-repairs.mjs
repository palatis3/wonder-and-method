import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from './source-repairs-20261028.json' with {type:'json'};
import v4Review from './source-repairs-v4-20261029.json' with {type:'json'};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rows=[...review.records,...v4Review.records];
const records=new Map(rows.map(row=>[row.path,row]));
assert.equal(records.size,rows.length,'Reviewed source repairs must have unique paths');

// Accept only the full independently reviewed current record, then reconstruct
// its original value for the frozen historical preservation test.
export function beforeReviewedSourceRepairs(record){
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
