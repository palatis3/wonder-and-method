import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-l-edits.json' with {type:'json'};
import {beforeMknHumanQualityEdits} from './reviewed-human-quality-mkn-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function beforeLHumanQualityEdits(value){
 value=beforeMknHumanQualityEdits(value);
 const row=ledger.records.find(row=>row.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved L record');
 assert.deepEqual(value,row.after,value.path+' exact L record');
 assert.equal(hash(row.before),row.beforeSha256,value.path+' prior L record');
 return structuredClone(row.before);
}
