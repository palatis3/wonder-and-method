import {beforeReviewedV3SourceRepairs} from './reviewed-v3-source-repairs.mjs';
import {beforeReviewedSourceRepairs} from './reviewed-source-repairs.mjs';
import {beforeReviewedCiSourceRepairs} from './reviewed-ci-source-repairs.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import review from './ux-copy-edits.json' with {type:'json'};
import {beforeReviewedHumanQualityEdits,beforeReviewedHumanQualityFaqEdits} from './reviewed-human-quality-edits.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const records=new Map(review.records.map(row=>[row.path,row]));
const faqs=new Map(review.faqs.map(row=>[row.path,row]));

// Verify the full reviewed current record before reconstructing a prior acceptance.
// Historical baselines stay frozen; changes outside this exact ledger still fail.
function restore(value,change,path){
 if(!change)return value;
 assert.equal(digest(value),change.afterSha256,path+' approved UX revision');
 const before=structuredClone(value);
 for(const edit of change.edits){
  let parent=before;for(const key of edit.path.slice(0,-1))parent=parent[key];
  const key=edit.path.at(-1);assert.deepEqual(parent[key],edit.after,path+' approved field '+edit.path.join('.'));
  parent[key]=structuredClone(edit.before);
 }
 assert.equal(digest(before),change.beforeSha256,path+' prior accepted record');
 return before;
}
export const beforeReviewedUxCopyEdits=record=>restore(beforeReviewedHumanQualityEdits(beforeReviewedV3SourceRepairs(beforeReviewedSourceRepairs(beforeReviewedCiSourceRepairs(record)))),records.get(record.path),record.path);
export const beforeReviewedUxFaqEdits=(path,answers)=>restore(beforeReviewedHumanQualityFaqEdits(path,answers),faqs.get(path),path);
