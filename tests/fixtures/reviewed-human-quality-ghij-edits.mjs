import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-ghij-edits.json' with {type:'json'};
import {beforeLHumanQualityEdits} from './reviewed-human-quality-l-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function beforeGhijHumanQualityEdits(value){
 value=beforeLHumanQualityEdits(value);
 const row=ledger.records.find(row=>row.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved GHIJ record');
 assert.deepEqual(value,row.after,value.path+' exact GHIJ record');
 assert.equal(hash(row.before),row.beforeSha256,value.path+' prior GHIJ record');
 return structuredClone(row.before);
}
