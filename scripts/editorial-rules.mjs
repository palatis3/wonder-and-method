import assert from 'node:assert/strict';

export const editorialKey=item=>JSON.stringify([item.route,item.rule,item.evidenceSha256]);
export function verifyEditorialDecisions(report,ledger){
 assert.equal(report.schemaVersion,1);assert.equal(report.errorCount,0,'Resolve SEO publishing errors before editorial approval');
 assert.equal(ledger.schemaVersion,1,'Unknown editorial review schema');assert.ok(Array.isArray(ledger.decisions),'Missing editorial decisions');
 const required=report.findings.filter(item=>item.severity==='review');
 for(const item of required){assert.ok(item.route&&item.rule);assert.match(item.evidenceSha256||'',/^[a-f0-9]{64}$/,'Review evidence must bind the exact passage or relationship');}
 const current=new Map(required.map(item=>[editorialKey(item),item]));
 const seen=new Set();
 for(const decision of ledger.decisions){
  const key=editorialKey(decision);assert.ok(!seen.has(key),'Duplicate editorial decision');seen.add(key);
  assert.ok(current.has(key),`Stale editorial decision: ${decision.route} ${decision.rule}; remove or review the changed evidence`);
  assert.equal(decision.disposition,'retain','Only reviewed retention decisions belong in the exceptions ledger');
  assert.ok(typeof decision.reason==='string'&&decision.reason.trim().length>=30,'Explain why the flagged passage or relationship remains useful');
  assert.ok(typeof decision.reviewer==='string'&&decision.reviewer.trim(),'Identify the reviewer');
  assert.ok(Number.isFinite(Date.parse(decision.reviewedAt)),'Record the actual review date');
 }
 for(const [key,item] of current)assert.ok(seen.has(key),`Unreviewed editorial finding: ${item.route} ${item.rule}`);
 return {reviewed:current.size,unreviewed:0,stale:0};
}
