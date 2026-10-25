import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEditorialDecisions} from '../scripts/editorial-rules.mjs';
const finding={severity:'review',route:'/example/',rule:'long-sentence',evidenceSha256:'a'.repeat(64)};
const report={schemaVersion:1,errorCount:0,findings:[finding]};
const decision={...finding,disposition:'retain',reason:'The complete list of exclusions is necessary to understand the scope.',reviewer:'Recorded reviewer',reviewedAt:'2026-10-25T12:00:00Z'};
const ledger={schemaVersion:1,decisions:[decision]};
test('editorial decisions cover the exact flagged passage',()=>assert.deepEqual(verifyEditorialDecisions(report,ledger),{reviewed:1,unreviewed:0,stale:0}));
test('new paragraph findings and edited passages require review',()=>{
 assert.throws(()=>verifyEditorialDecisions({...report,findings:[finding,{...finding,rule:'long-paragraph'}]},ledger),/Unreviewed/);
 assert.throws(()=>verifyEditorialDecisions({...report,findings:[{...finding,evidenceSha256:'b'.repeat(64)}]},ledger),/Stale/);
});
test('removed flags invalidate leftover approvals instead of accumulating exceptions',()=>assert.throws(()=>verifyEditorialDecisions({...report,findings:[]},ledger),/Stale/));
test('duplicate, empty-rationale and unattributed approvals fail',()=>{
 assert.throws(()=>verifyEditorialDecisions(report,{...ledger,decisions:[decision,decision]}),/Duplicate/);
 assert.throws(()=>verifyEditorialDecisions(report,{...ledger,decisions:[{...decision,reason:''}]}),/Explain/);
 assert.throws(()=>verifyEditorialDecisions(report,{...ledger,decisions:[{...decision,reviewer:''}]}),/reviewer/);
});
test('approval cannot hide publishing errors or missing evidence',()=>{
 assert.throws(()=>verifyEditorialDecisions({...report,errorCount:1},ledger),/SEO publishing/);
 assert.throws(()=>verifyEditorialDecisions({...report,findings:[{...finding,evidenceSha256:''}]},ledger),/exact passage/);
});
