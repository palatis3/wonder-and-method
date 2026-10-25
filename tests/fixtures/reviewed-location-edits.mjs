import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fixture from './combined-location-edits.json' with {type:'json'};
import faqFixture from './combined-faq-edits.json' with {type:'json'};
const byPath=new Map(fixture.records.map(record=>[record.path,record]));
const faqByPath=new Map(faqFixture.records.map(record=>[record.path,record]));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Preserve both contracts: the approved current edit and every historical field
// outside that edit. Never refresh the historical expected hash from live data.
export function beforeReviewedLocationEdits(record){
 return restoreReviewed(record,byPath.get(record.path),record.path);
}
export function beforeReviewedFaqEdits(path,answers){return restoreReviewed(answers,faqByPath.get(path),path);}
function restoreReviewed(record,change,path){
 if(!change)return record;
 assert.equal(hash(record),change.afterSha256,path+' approved current record');
 const restored=structuredClone(record);
 for(const edit of [...change.edits].reverse()){
  let parent=restored;for(const key of edit.path.slice(0,-1))parent=parent[key];const key=edit.path.at(-1);
  assert.equal(Object.hasOwn(parent,key),edit.afterExists,path+' field presence '+edit.path.join('.'));
  if(edit.afterExists)assert.deepEqual(parent[key],edit.after,path+' approved field '+edit.path.join('.'));
  if(edit.beforeExists)parent[key]=structuredClone(edit.before);
  else if(Array.isArray(parent))parent.splice(Number(key),1);
  else delete parent[key];
 }
 assert.equal(hash(restored),change.beforeSha256,path+' pre-edit record');return restored;
}
