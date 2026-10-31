import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './source-repairs-ci-20261031.json' with {type:'json'};

const paths=['/areas/florida/highlands-county/','/areas/north-carolina/davie-county/'];
const records=new Map(ledger.records.map(row=>[row.path,row]));
const briefs=new Map(ledger.briefs.map(row=>[row.path,row]));
assert.deepEqual([...records.keys()],paths);assert.deepEqual([...briefs.keys()],paths);
assert.equal(records.size,ledger.records.length);assert.equal(briefs.size,ledger.briefs.length);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Bind the complete reviewed current value before undoing only its explicit
// edits. Existing historical hashes and all earlier restoration layers stay fixed.
function restore(value,row){
 if(!row)return value;
 assert.equal(hash(value),row.afterSha256,row.path+' approved CI source repair');
 assert.deepEqual(row.edits.map(edit=>edit.key),row.changedFields,row.path+' exact repaired fields');
 const before=structuredClone(value);
 for(const edit of row.edits){
  assert(Object.hasOwn(before,edit.key),row.path+' repaired field exists');
  assert.deepEqual(before[edit.key],edit.after,row.path+' approved '+edit.key);
  before[edit.key]=structuredClone(edit.before);
 }
 assert.equal(hash(before),row.beforeSha256,row.path+' original accepted record');
 return before;
}
export const beforeReviewedCiSourceRepairs=record=>restore(record,records.get(record.path));
export const beforeReviewedCiSourceBriefRepair=brief=>restore(brief,briefs.get(brief.route));
