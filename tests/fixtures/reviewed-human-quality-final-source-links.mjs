import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import ledger from './human-quality-final-source-links.json' with {type:'json'};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function beforeFinalSourceLinkHumanQualityEdits(value){
 const row=ledger.records.find(r=>r.path===value.path);if(!row)return value;
 assert.equal(hash(value),row.afterSha256,value.path+' approved final source link record');
 assert.deepEqual(value,row.after);assert.equal(hash(row.before),row.beforeSha256);return structuredClone(row.before);
}
