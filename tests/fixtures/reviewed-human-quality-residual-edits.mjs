import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ledger from './human-quality-residual-edits.json' with {type:'json'};
import {beforeCombinedHumanQualityEdits,beforeCombinedHumanQualityFaqEdits,combinedFaqPaths} from './reviewed-human-quality-combined-edits.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
function restore(path,value,rows,label){
 const row=rows.find(r=>r.path===path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,path+' approved residual '+label);
 assert.deepEqual(value,row.after,path+' exact residual '+label);
 assert.equal(hash(row.before),row.beforeSha256,path+' prior residual '+label);
 return structuredClone(row.before);
}
export const beforeResidualHumanQualityEdits=value=>restore(value.path,beforeCombinedHumanQualityEdits(value),ledger.records,'record');
export const beforeResidualHumanQualityFaqEdits=(path,value)=>restore(path,beforeCombinedHumanQualityFaqEdits(path,value),ledger.faqs,'FAQ');
export const residualFaqPaths=[...new Set([...ledger.faqs.map(row=>row.path),...combinedFaqPaths])];
