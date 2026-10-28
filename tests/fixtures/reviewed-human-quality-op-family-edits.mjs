import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-op-family-edits.json' with {type:'json'};
import {beforeFinalScopeHumanQualityEdits} from './reviewed-human-quality-final-scope-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function beforeOpFamilyHumanQualityEdits(value){
 value=beforeFinalScopeHumanQualityEdits(value);
 const row=ledger.records.find(row=>row.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved OP/family record');
 assert.deepEqual(value,row.after,value.path+' exact OP/family record');
 assert.equal(hash(row.before),row.beforeSha256,value.path+' prior OP/family record');
 return structuredClone(row.before);
}
