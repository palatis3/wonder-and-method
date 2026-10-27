import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-combined-edits.json' with {type:'json'};
import {beforeDefHumanQualityEdits} from './reviewed-human-quality-def-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
function restore(path,value,rows,label){
 const row=rows.find(row=>row.path===path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,path+' approved combined '+label);
 assert.deepEqual(value??null,row.after,path+' exact combined '+label);
 assert.equal(hash(row.before),row.beforeSha256,path+' prior combined '+label);
 return structuredClone(row.before);
}
export const beforeCombinedHumanQualityEdits=value=>restore(value.path,beforeDefHumanQualityEdits(value),ledger.records,'record');
export const beforeCombinedHumanQualityFaqEdits=(path,value)=>restore(path,value,ledger.faqs,'FAQ');
export const combinedFaqPaths=ledger.faqs.map(row=>row.path);
