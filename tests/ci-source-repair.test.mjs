import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import briefs from '../src/human-location-briefs.json' with {type:'json'};
import ledger from './fixtures/source-repairs-ci-20261031.json' with {type:'json'};
import {beforeReviewedCiSourceRepairs,beforeReviewedCiSourceBriefRepair} from './fixtures/reviewed-ci-source-repairs.mjs';
import {beforeReviewedUxCopyEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const paths=['/areas/florida/highlands-county/','/areas/north-carolina/davie-county/'];
const allowed=[['decision','sources','checkedDate'],['decision','scopes','coverageNote','sources','checkedDate']];

test('CI source acceptance restores only the two exact reviewed county records and preserves geography',()=>{
 assert.deepEqual(ledger.records.map(row=>row.path),paths);
 for(const [index,row]of ledger.records.entries()){
  const current=records.find(record=>record.path===row.path),currentHash=hash(current);
  const before=beforeReviewedCiSourceRepairs(current);
  assert.equal(currentHash,row.afterSha256);assert.equal(hash(before),row.beforeSha256);
  assert.equal(hash(current),currentHash);assert.notEqual(before,current);
  assert.deepEqual(row.changedFields,allowed[index]);
  assert.deepEqual(Object.keys(current).filter(key=>JSON.stringify(current[key])!==JSON.stringify(before[key])),allowed[index]);
  for(const key of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[key],before[key],row.path+' '+key);
  assert.equal(current.checkedDate,ledger.reviewedOn);
  assert.deepEqual(current.sources.map(source=>source.url),ledger.research.find(research=>research.path===row.path).urls);
 }
});

test('the shared historical normalization rejects unreviewed prose, source, identity, additions and deletions',()=>{
 for(const path of paths){
  const current=records.find(record=>record.path===path);
  for(const mutate of [record=>record.decision+=' Unreviewed.',record=>record.sources[0].url='https://example.com/unreviewed',record=>record.market='Another county',record=>record.areaIds=[],record=>record.unreviewed=true,record=>delete record.sources]){
   const changed=structuredClone(current);mutate(changed);
   assert.throws(()=>beforeReviewedUxCopyEdits(changed),/approved CI source repair/);
  }
 }
 const other=records.find(record=>!paths.includes(record.path));
 assert.equal(beforeReviewedCiSourceRepairs(other),other);
});

test('matching public source bridges retain every other authored brief field and reject unrelated changes',()=>{
 assert.deepEqual(ledger.briefs.map(row=>row.path),paths);
 for(const row of ledger.briefs){
  const current=briefs.find(brief=>brief.route===row.path),currentHash=hash(current);
  const before=beforeReviewedCiSourceBriefRepair(current);
  assert.equal(currentHash,row.afterSha256);assert.equal(hash(before),row.beforeSha256);assert.equal(hash(current),currentHash);
  assert.deepEqual(row.changedFields,['sourceBridge']);
  assert.deepEqual(Object.keys(current).filter(key=>JSON.stringify(current[key])!==JSON.stringify(before[key])),['sourceBridge']);
  for(const mutate of [brief=>brief.sourceBridge+=' Unreviewed.',brief=>brief.intro+=' Unreviewed.',brief=>brief.inputHash='unreviewed',brief=>delete brief.ownerInputs]){
   const changed=structuredClone(current);mutate(changed);
   assert.throws(()=>beforeReviewedCiSourceBriefRepair(changed),/approved CI source repair/);
  }
 }
});
