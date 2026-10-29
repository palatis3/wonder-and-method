import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import review from './fixtures/source-repairs-v3-20261029.json' with {type:'json'};
import {beforeReviewedV3SourceRepairs} from './fixtures/reviewed-v3-source-repairs.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('reviewed Blaine replacement preserves exact prior record and rejects unapproved claims',()=>{
 assert.equal(review.records.length,1);const approved=review.records[0];
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
