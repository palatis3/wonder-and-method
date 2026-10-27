import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-def-edits.json' with {type:'json'};
import {beforeGhijHumanQualityEdits} from './reviewed-human-quality-ghij-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function beforeDefHumanQualityEdits(value){
 value=beforeGhijHumanQualityEdits(value);
 const row=ledger.records.find(row=>row.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved DEF record');
 assert.deepEqual(value,row.after,value.path+' exact DEF record');
 assert.equal(hash(row.before),row.beforeSha256,value.path+' prior DEF record');
 return structuredClone(row.before);
}
