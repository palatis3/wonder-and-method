import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import services from '../src/location-service-data.json' with {type:'json'};
import review from './fixtures/source-repairs-20261028.json' with {type:'json'};
import preservation from './fixtures/wy-hi-ak-preservation.json' with {type:'json'};
import {beforeReviewedSourceRepairs} from './fixtures/reviewed-source-repairs.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const path='/areas/wyoming/hot-springs-county/';
const current=services.find(row=>row.path===path);

test('reviewed source repair reconstructs exactly one frozen historical county record without mutation',()=>{
 assert.equal(review.records.length,1);
 assert.equal(review.records[0].path,path);
 assert.equal(review.records[0].edits.length,5);
 const originalDigest=digest(current),before=beforeReviewedSourceRepairs(current);
 assert.notEqual(before,current);
 assert.equal(digest(before),preservation.newServices[path]);
 assert.equal(digest(current),originalDigest);
 assert.deepEqual(before.sources.map(x=>x.url),[
  'https://wyomingdinosaurcenter.org/mecevents/shovel-ready-2/',
  'https://wyomingdinosaurcenter.org/museum/hours-and-admission/'
 ]);
});

test('source acceptance rejects both changed approved fields and unrelated unreviewed edits',()=>{
 for(const mutate of [
  row=>{row.sources[0].url='https://example.com/unreviewed';},
  row=>{row.decision+=' Unreviewed claim.';},
  row=>{row.coverageNote='Unreviewed coverage';}
 ]){
  const changed=structuredClone(current);mutate(changed);
  assert.throws(()=>beforeReviewedSourceRepairs(changed),/approved source repair/);
 }
});

test('unlisted records remain untouched for ordinary historical hash validation',()=>{
 const other=services.find(row=>row.path!==path);
 assert.equal(beforeReviewedSourceRepairs(other),other);
});
