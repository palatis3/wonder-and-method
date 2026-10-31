import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import briefs from '../src/human-location-briefs.json' with {type:'json'};
import ledger from './fixtures/source-repairs-ci-20261031.json' with {type:'json'};
import guideReviews from '../operations/google-quality-audit-20261023/related-guide-review.json' with {type:'json'};
import {locationPurposeFingerprint} from '../scripts/site-quality-rules.mjs';
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

test('the two source repairs retain their reviewed contextual guides and original relevance evidence',()=>{
 const prior=[
  {purpose:'ba49a92dffe706a4982e1232cae14086a6add404048fc1b4aa793f2809975ffd',evidence:'8b82214b3db8f802f8337df1c96ab014ae659ed806f4d7d7aec05d0ba1f920e2'},
  {purpose:'2607a543b381464e4b681dbc7faa7db7448b49587c71c7518ebb5214c6de6669',evidence:'4d08a0147352e3602d9f707515511078990e7eefa9ff739129d28576481cf577'}
 ];
 for(const [index,path]of paths.entries()){
  const entry=records.find(record=>record.path===path),reviews=guideReviews.filter(row=>row.from===path);
  assert.equal(reviews.length,1);const row=reviews[0];
  assert.equal(row.to,entry.relatedGuides[0].path);assert.equal(row.label,entry.relatedGuides[0].label);
  assert.equal(row.reviewedAt,ledger.reviewedOn);
  assert.equal(row.locationPurposeSha256,locationPurposeFingerprint(entry));
  assert.equal(locationPurposeFingerprint(beforeReviewedCiSourceRepairs(entry)),prior[index].purpose);
  const preserved=Object.fromEntries(Object.entries(row).filter(([key])=>!['reviewedAt','locationPurposeSha256'].includes(key)));
  assert.equal(hash(preserved),prior[index].evidence,path+' retained destination, label, rationale and guide-review evidence');
 }
});
