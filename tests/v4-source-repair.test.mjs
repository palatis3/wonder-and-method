import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import services from '../src/location-service-data.json' with {type:'json'};
import review from './fixtures/source-repairs-v4-20261029.json' with {type:'json'};
import preservation from './fixtures/wy-hi-ak-preservation.json' with {type:'json'};
import {beforeReviewedSourceRepairs} from './fixtures/reviewed-source-repairs.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('Anchorage source repair replays only the reviewed URL and rejects unrelated changes',()=>{
 assert.equal(review.records.length,1);
 const approved=review.records[0];
 assert.equal(approved.path,'/areas/alaska/anchorage-municipality/');
 assert.equal(approved.edits.length,1);
 assert.deepEqual(approved.edits[0].path,['sources',0,'url']);
 const current=services.find(row=>row.path===approved.path),original=JSON.stringify(current);
 assert.equal(current.sources[0].url,'https://www.muni.org/departments/parks_and_recreation/reservations/index.php');
 assert.equal(digest(current),approved.afterSha256);
 const before=beforeReviewedSourceRepairs(current);
 assert.notEqual(before,current);
 assert.equal(digest(before),approved.beforeSha256);
 assert.equal(digest(before),preservation.newServices[approved.path]);
 assert.equal(before.sources[0].url,'https://www.muni.org/Departments/parks/Pages/Reservations.aspx');
 assert.equal(JSON.stringify(current),original,'Historical replay must not mutate current content');
 for(const mutate of [
  row=>{row.sources[0].url='https://example.com/unreviewed';},
  row=>{row.sources[0].observation+=' Unreviewed requirement.';},
  row=>{row.decision+=' Unreviewed claim.';}
 ]){
  const changed=structuredClone(current);mutate(changed);
  assert.throws(()=>beforeReviewedSourceRepairs(changed),/approved source repair/);
 }
 const unrelated=services.find(row=>row.path==='/areas/alaska/juneau-city-and-borough/');
 assert.ok(unrelated);assert.equal(beforeReviewedSourceRepairs(unrelated),unrelated);
});
