import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import review from './fixtures/source-repairs-v3-20261029.json' with {type:'json'};
import {beforeReviewedV3SourceRepairs} from './fixtures/reviewed-v3-source-repairs.mjs';
import briefs from '../src/human-location-briefs.json' with {type:'json'};
import briefReview from '../operations/v3-offers-20261029/human-brief-source-repairs.json' with {type:'json'};
import offers from '../operations/historical/offers-2026-10-29-v3.json' with {type:'json'};
import {locationServicePage} from '../src/location-service-pages.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('reviewed Blaine replacement preserves exact prior record and rejects unapproved claims',()=>{
 assert.equal(review.records.length,2);const approved=review.records[0];
 assert.equal(approved.path,'/areas/idaho/blaine-county/');
 const current=records.find(r=>r.path===approved.path),serialized=JSON.stringify(current);
 assert.equal(hash(current),approved.afterSha256);
 const before=beforeReviewedV3SourceRepairs(current);assert.equal(hash(before),approved.beforeSha256);
 assert.equal(JSON.stringify(current),serialized,'Replay must not mutate live content');
 assert.equal(current.sources[0].url,'https://www.skibutlers.com/snowboard-ski-rentals/sun-valley');
 assert.match(current.decision,/hypothetical guest/);assert.match(current.decision,/not a claim that the provider currently has a website problem/);
 assert.doesNotMatch(JSON.stringify(current),/Pete Lane|48-hour|Bald Mountain|Dollar Mountain|next-morning mountain/);
 for(const mutate of [r=>r.decision+=' Guaranteed stock.',r=>r.sources[0].url='https://unreviewed.example/',r=>r.scopes[0].check+=' Already tested.']){
  const changed=structuredClone(current);mutate(changed);assert.throws(()=>beforeReviewedV3SourceRepairs(changed),/approved source repair/);
 }
 const unchanged=records.find(r=>r.path==='/areas/idaho/ada-county/');assert.equal(beforeReviewedV3SourceRepairs(unchanged),unchanged);
});

test('Guadalupe repair preserves its original row and rejects unreviewed replacements',()=>{
 const approved=review.records[1],current=records.find(r=>r.path===approved.path);
 assert.equal(approved.path,'/areas/texas/guadalupe-county/');
 assert.equal(hash(current),approved.afterSha256);
 assert.equal(hash(beforeReviewedV3SourceRepairs(current)),approved.beforeSha256);
 assert.equal(current.sources[0].url,'https://www.guadalupetx.gov/page/PublicInformationOfficer');
 assert.match(current.decision,/limited assistance may be available/);
 assert.doesNotMatch(JSON.stringify(current),/library does not provide|inside the reserved period|www\.schertz\.com/);
 for(const mutate of [r=>r.decision+=' Guaranteed compatibility.',r=>r.sources[0].url='https://unreviewed.example/',r=>r.scopes[0].check+=' Already tested.']){
  const changed=structuredClone(current);mutate(changed);assert.throws(()=>beforeReviewedV3SourceRepairs(changed),/approved source repair/);
 }
});

test('historical V3 county render retains the complete reviewed brief and source',()=>{
 assert.equal(briefReview.briefs.length,2);
 for(const change of briefReview.briefs){
  const brief=briefs.find(b=>b.route===change.route),record=records.find(r=>r.path===change.route);
  assert.equal(hash(brief),change.afterSha256);assert.equal(hash(change.before),change.beforeSha256);
  assert.equal(brief.inputHash,change.before.inputHash);assert.equal(hash(record),change.proposedSourceRecordSha256);
  const body=locationServicePage(record,offers).body;
  assert.equal(createHash('sha256').update(body).digest('hex'),change.proposedRenderedBodySha256);
  assert.equal((body.match(/class="local-decision-number"/g)||[]).length,3);
  assert.match(body,/not studio projects, clients or endorsements/);
  if(change.route.includes('blaine')){assert.match(body,/Ski Butlers/);assert.match(body,/4–8pm/);assert.doesNotMatch(body,/Pete Lane|48-hour|Bald Mountain|Dollar Mountain|next-morning/);}
  else{assert.match(body,/Veterans Outreach Center/);assert.match(body,/limited assistance/);assert.doesNotMatch(body,/supplies neither computers|within the reserved period|www\.schertz\.com/);}
 }
});
