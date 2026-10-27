import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-edits.json' with {type:'json'};
import {beforeResidualHumanQualityEdits,beforeResidualHumanQualityFaqEdits,residualFaqPaths} from './reviewed-human-quality-residual-edits.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const records=new Map(ledger.records.map(row=>[row.path,row])),faqs=new Map(ledger.faqs.map(row=>[row.path,row]));
assert.equal(records.size,ledger.records.length);assert.equal(faqs.size,ledger.faqs.length);
export function beforeReviewedHumanQualityEdits(value){
 value=beforeResidualHumanQualityEdits(value);
 const row=records.get(value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved human quality revision');
 const restored=structuredClone(value);
 for(const edit of row.edits){
  assert.equal(Object.hasOwn(value,edit.key),edit.afterExists,value.path+' field existence');
  assert.deepEqual(value[edit.key],edit.after,value.path+' approved '+edit.key);
  if(edit.beforeExists)restored[edit.key]=structuredClone(edit.before);else delete restored[edit.key];
 }
 const before=Object.fromEntries(row.beforeKeys.map(key=>[key,restored[key]]));
 assert.deepEqual(Object.keys(restored).sort(),[...row.beforeKeys].sort());
 assert.equal(hash(before),row.beforeSha256,value.path+' prior accepted record');return before;
}
export function beforeReviewedHumanQualityFaqEdits(path,value){
 value=beforeResidualHumanQualityFaqEdits(path,value);
 const row=faqs.get(path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,path+' approved human quality FAQ revision');
 const before=structuredClone(row.before);assert.equal(hash(before),row.beforeSha256,path+' prior accepted FAQ');return before;
}
export function beforeReviewedHumanQualityFaqCollection(current){
 const before=structuredClone(current);
 for(const path of new Set([...ledger.faqs.map(row=>row.path),...residualFaqPaths])){
  const restored=beforeReviewedHumanQualityFaqEdits(path,current[path]);
  if(restored===undefined)delete before[path];else before[path]=restored;
 }
 return before;
}
