import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-mkn-edits.json' with {type:'json'};
import {beforeOpFamilyHumanQualityEdits} from './reviewed-human-quality-op-family-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function beforeMknHumanQualityEdits(value){
 value=beforeOpFamilyHumanQualityEdits(value);
 const row=ledger.records.find(row=>row.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved MKN record');
 assert.deepEqual(value,row.after,value.path+' exact MKN record');
 assert.equal(hash(row.before),row.beforeSha256,value.path+' prior MKN record');
 return structuredClone(row.before);
}
