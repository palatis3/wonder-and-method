import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {locationPurposeFingerprint} from '../../scripts/site-quality-rules.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const save=async(p,x)=>writeFile(p,JSON.stringify(x,null,2)+'\n');
const review=await read('evidence/v3-offers-20261029/guadalupe-citation-review.json');
const proposal=await read('evidence/v3-offers-20261029/source-repair-human-briefs.json');
const entries=await read('src/location-service-data.json'),briefs=await read('src/human-location-briefs.json');
const original=entries.find(r=>r.path===review.rowPath),after=review.proposedReplacementRow;
assert.equal(hash(original),review.originalRowSha256);
for(const change of proposal.briefs){
 assert.equal(hash(briefs.find(b=>b.route===change.route)),change.beforeSha256);
 assert.equal(hash(change.after),change.afterSha256);
 assert.equal(change.before.inputHash,change.after.inputHash);
}
const fixture=await read('tests/fixtures/source-repairs-v3-20261029.json');
assert.equal(fixture.records.length,1);
fixture.records.push({path:after.path,beforeSha256:hash(original),afterSha256:hash(after),edits:Object.keys(after).filter(k=>JSON.stringify(original[k])!==JSON.stringify(after[k])).map(k=>({path:[k],before:original[k],after:after[k]}))});
const ledger=await read('operations/google-quality-audit-20261023/related-guide-review.json');
const previousRelations=ledger.filter(r=>r.from===after.path);
assert.equal(previousRelations.length,2);
const reasons={
 '/guides/website-content-template/':'The complete guide connects owner-approved service facts, evidence, preparation and a clear next step. These directly support a room-specific equipment inventory and preparation checklist without importing library policy.',
 '/guides/timed-booking-handoff/':'The complete guide separates a request from confirmation and identifies timing, preparation and responsibility. These directly support the county application/approval distinction and operator-confirmed event instructions.'
};
const updatedRelations=previousRelations.map(r=>({...r,reviewedAt:'2026-10-29',reason:reasons[r.to],locationPurposeSha256:locationPurposeFingerprint(after),reviewMethod:'Complete target-guide and replacement county-case review, supported by independent live-source verification.',reviewEvidence:'operations/v3-offers-20261029/guadalupe-source-review.json',priorReviewSha256:hash(r)}));
await save('src/location-service-data.json',entries.map(r=>r.path===after.path?after:r));
await save('src/human-location-briefs.json',briefs.map(b=>proposal.briefs.find(c=>c.route===b.route)?.after||b));
await save('tests/fixtures/source-repairs-v3-20261029.json',fixture);
await save('operations/google-quality-audit-20261023/related-guide-review.json',ledger.map(r=>updatedRelations.find(x=>x.from===r.from&&x.to===r.to)||r));
await save('operations/v3-offers-20261029/guadalupe-source-review.json',{reviewedAt:new Date().toISOString(),independentSourceReview:review,beforeSha256:hash(original),afterSha256:hash(after),guideReview:{before:previousRelations,after:updatedRelations}});
await save('operations/v3-offers-20261029/human-brief-source-repairs.json',{reviewedAt:new Date().toISOString(),reason:'Additive correction of two rendered human briefs after live-source repairs. Historical inputHash values remain frozen. Prior Blaine row review did not approve its rendered human brief.',briefs:proposal.briefs});
console.log('Applied one county record and two complete human briefs; retained historical provenance.');
