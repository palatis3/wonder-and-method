// Revalidate existing contextual links only after bounded review of the V4 guide changes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {guidePurposeFingerprint,locationPurposeFingerprint} from '../../scripts/site-quality-rules.mjs';
const file='operations/google-quality-audit-20261023/related-guide-review.json';
const source='evidence/v4-offers-20261029/guide-deltas.json';
const reviewPath='operations/v4-offers-20261029/review/guide-commercial-review.json';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(file),ledger=JSON.parse(bytes);
const evidence=JSON.parse(await readFile(source,'utf8'));
const review=JSON.parse(await readFile(reviewPath,'utf8'));
assert.equal(review.status??review.verdict,'PASS');
assert.equal(hash(bytes),evidence.ledgerSHA256,'Ledger changed since extraction');
assert.equal(evidence.guides.length,5);assert.equal(evidence.connections,211);
const entries=JSON.parse(await readFile('src/location-service-data.json','utf8'));
const changed=[];
for(const g of evidence.guides){
 assert.equal(g.beforeMatchesSaved,true);
 const html=await readFile('dist'+g.path+'index.html','utf8');assert.equal(guidePurposeFingerprint(html),g.afterHash);
 for(const row of ledger.filter(r=>r.to===g.path)){
  assert.equal(row.guidePurposeSha256,g.beforeHash);
  const entry=entries.find(e=>e.path===row.from);assert.equal(locationPurposeFingerprint(entry),row.locationPurposeSha256);
  assert(entry.relatedGuides.some(l=>l.path===row.to&&l.label===row.label));
  const prior={...row};
  row.guidePurposeSha256=g.afterHash;row.reviewedAt='2026-10-29';
  row.reviewMethod='Primary revalidation of retained contextual links after independent review of the complete before/after guide articles and commercial-only changes. Location purpose, destination, label and original relevance rationale remain unchanged.';
  row.reviewEvidence='operations/v4-offers-20261029/guide-connection-review.json';
  row.priorReviewSha256=hash(JSON.stringify(prior));
  changed.push({from:row.from,to:row.to,before:prior,after:{...row}});
 }
}
assert.equal(changed.length,211);
const updated=JSON.stringify(ledger,null,2)+'\n';
await writeFile('operations/v4-offers-20261029/guide-connection-review.json',JSON.stringify({reviewedAt:new Date().toISOString(),status:'PASS',reviewPath,reviewSHA256:hash(await readFile(reviewPath)),previousLedgerSHA256:hash(bytes),updatedLedgerSHA256:hash(updated),changedGuides:evidence.guides.map(({path,connections,beforeHash,afterHash,removed,added})=>({path,connections,beforeHash,afterHash,removed,added})),retainedPurpose:true,changedConnections:changed},null,2)+'\n',{flag:'wx'});
await writeFile(file,updated);
console.log(JSON.stringify({guides:5,connections:changed.length,retainedLocationPurposeAndRationale:true}));
