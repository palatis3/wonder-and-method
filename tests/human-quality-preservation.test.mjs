import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import faqs from '../src/service-faqs.json' with {type:'json'};
import ledger from './fixtures/human-quality-edits.json' with {type:'json'};
import {beforeReviewedHumanQualityEdits as restore,beforeReviewedHumanQualityFaqEdits as restoreFaq} from './fixtures/reviewed-human-quality-edits.mjs';
import {beforeReviewedUxCopyEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
import residual from './fixtures/human-quality-residual-edits.json' with {type:'json'};
import combined from './fixtures/human-quality-combined-edits.json' with {type:'json'};
import def from './fixtures/human-quality-def-edits.json' with {type:'json'};
import ghij from './fixtures/human-quality-ghij-edits.json' with {type:'json'};
import {beforeGhijHumanQualityEdits} from './fixtures/reviewed-human-quality-ghij-edits.mjs';
import {beforeDefHumanQualityEdits} from './fixtures/reviewed-human-quality-def-edits.mjs';
import {beforeCombinedHumanQualityEdits,beforeCombinedHumanQualityFaqEdits} from './fixtures/reviewed-human-quality-combined-edits.mjs';
import {beforeResidualHumanQualityEdits,beforeResidualHumanQualityFaqEdits} from './fixtures/reviewed-human-quality-residual-edits.mjs';
import l from './fixtures/human-quality-l-edits.json' with {type:'json'};
import {beforeLHumanQualityEdits} from './fixtures/reviewed-human-quality-l-edits.mjs';
import mkn from './fixtures/human-quality-mkn-edits.json' with {type:'json'};
import opFamily from './fixtures/human-quality-op-family-edits.json' with {type:'json'};
import {beforeOpFamilyHumanQualityEdits} from './fixtures/reviewed-human-quality-op-family-edits.mjs';
import {beforeMknHumanQualityEdits} from './fixtures/reviewed-human-quality-mkn-edits.mjs';
import fs from 'node:fs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
test('human editorial acceptance preserves exact earlier records, geography and unrelated fields',()=>{
 assert.equal(ledger.records.length,86);assert.equal(ledger.faqs.length,13);
 assert.equal(Object.keys(faqs).length,198);assert.equal(Object.values(faqs).flat().length,265);
 const allowed=new Set(['lead','decisionTitle','decision','scopes','scopeTrigger','quoteQuestions','coverageNote','sources','description','checkedDate','legacyWorksheetRetired','relatedGuides','planningTable']);
 for(const row of ledger.records){
  const current=records.find(r=>r.path===row.path),before=restore(current);
  assert.equal(hash(before),row.beforeSha256);assert.equal(hash(beforeResidualHumanQualityEdits(current)),row.afterSha256);assert(row.reviewEvidence.length);
  for(const edit of row.edits)assert(allowed.has(edit.key));
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],before[field],row.path+' '+field);
 }
 for(const row of ledger.faqs){assert(row.reviewEvidence.length);assert.equal(hash(restoreFaq(row.path,faqs[row.path])),row.beforeSha256);}
 assert.equal(ledger.faqs.filter(row=>!Object.hasOwn(row,'after')).length,7);
});
test('residual acceptance binds exact independent reviews and preserves the original layer',()=>{
 assert.equal(residual.records.length,1);assert.equal(residual.faqs.length,2);
 for(const row of [...residual.records,...residual.faqs]){
  const review=fs.readFileSync(new URL('../'+row.reviewEvidence.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse).find(r=>r.route===row.path);
  assert.equal(hash(review),row.reviewEvidence.entrySha256);assert.equal(review.candidateBodySha256,row.reviewEvidence.candidateBodySha256);
  assert(review.completeMainTextRead);assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);
 }
 for(const row of residual.records){
  const current=records.find(r=>r.path===row.path),before=beforeResidualHumanQualityEdits(current);
  assert.equal(hash(before),row.beforeSha256);assert.equal(hash(current),row.afterSha256);
  const keys=new Set([...Object.keys(before),...Object.keys(current)]);
  assert.deepEqual([...keys].filter(k=>JSON.stringify(before[k])!==JSON.stringify(current[k])),['coverageNote']);
  for(const mutate of [r=>r.coverageNote+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved residual record/);
  }
 }
 for(const row of residual.faqs){
  assert.equal(hash(beforeResidualHumanQualityFaqEdits(row.path,faqs[row.path])),row.beforeSha256);
  const changed=structuredClone(faqs[row.path]);changed[0].answer+=' Unreviewed.';
  assert.throws(()=>restoreFaq(row.path,changed),/approved residual FAQ/);
  assert.throws(()=>restoreFaq(row.path,undefined),/approved residual FAQ/);
 }
});
test('combined acceptance binds exact reviews and restores twelve records and three removed FAQs',()=>{
 assert.equal(combined.records.length,12);assert.equal(combined.faqs.length,3);assert.equal(combined.acceptedCandidates.length,43);
 const reviewCache=new Map();
 for(const row of combined.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead);assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);
 }
 for(const row of [...combined.records,...combined.faqs])assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(combined.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
 for(const row of combined.records){
  const current=records.find(r=>r.path===row.path);assert.equal(hash(beforeDefHumanQualityEdits(current)),row.afterSha256);
  assert.equal(hash(beforeCombinedHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.coverageNote+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved combined record/);
  }
 }
 for(const row of combined.faqs){
  assert.equal(row.after,null);assert(!Object.hasOwn(faqs,row.path));
  assert.equal(hash(beforeCombinedHumanQualityFaqEdits(row.path,faqs[row.path])),row.beforeSha256);
  assert.throws(()=>restoreFaq(row.path,[]),/approved combined FAQ/);
  assert.throws(()=>restoreFaq(row.path,row.before),/approved combined FAQ/);
 }
});

test('DEF acceptance binds 46 independent reviews and preserves ten exact source corrections',()=>{
 assert.equal(def.records.length,10);assert.equal(def.faqs.length,0);assert.equal(def.acceptedCandidates.length,46);
 const reviewCache=new Map();
 for(const row of def.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.draftSha256,row.draftSha256);assert.equal(review.sourceEntrySha256,row.sourceEntrySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead&&review.completeFaqAndSourceDisclosuresRead&&review.draftAndSourceEntryRead);
  assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);assert.equal(review.finalScore,null);
 }
 for(const row of def.records){
  assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(def.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
  const current=records.find(r=>r.path===row.path);assert.equal(hash(current),row.afterSha256);
  assert.equal(hash(beforeDefHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved DEF record/);
  }
 }
});

test('GHIJ acceptance binds 87 independent reviews and preserves 24 exact source corrections',()=>{
 assert.equal(ghij.records.length,24);assert.equal(ghij.faqs.length,0);assert.equal(ghij.acceptedCandidates.length,87);
 const reviewCache=new Map();
 for(const row of ghij.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.draftSha256,row.draftSha256);assert.equal(review.sourceEntrySha256,row.sourceEntrySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead&&review.completeFaqAndSourceDisclosuresRead&&review.draftAndSourceEntryRead);
  assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);assert.equal(review.finalScore,null);
 }
 for(const row of ghij.records){
  assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(ghij.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
  const current=records.find(r=>r.path===row.path);assert.equal(hash(current),row.afterSha256);
  assert.equal(hash(beforeGhijHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved GHIJ record/);
  }
 }
});

test('L acceptance binds 25 independent reviews and preserves 15 exact source corrections',()=>{
 assert.equal(l.records.length,15);assert.equal(l.faqs.length,0);assert.equal(l.acceptedCandidates.length,25);
 const reviewCache=new Map();
 for(const row of l.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.draftSha256,row.draftSha256);assert.equal(review.sourceEntrySha256,row.sourceEntrySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead&&review.completeFaqAndSourceDisclosuresRead&&review.draftAndSourceEntryRead);
  assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);assert.equal(review.finalScore,null);
 }
 for(const row of l.records){
  assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(l.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
  const current=records.find(r=>r.path===row.path);assert.equal(hash(current),row.afterSha256);
  assert.equal(hash(beforeLHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved L record/);
  }
 }
});

test('MKN acceptance binds 59 independent reviews and preserves 48 exact source corrections',()=>{
 assert.equal(mkn.records.length,48);assert.equal(mkn.faqs.length,0);assert.equal(mkn.acceptedCandidates.length,59);
 const reviewCache=new Map();
 for(const row of mkn.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.draftSha256,row.draftSha256);assert.equal(review.sourceEntrySha256,row.sourceEntrySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead&&review.completeFaqAndSourceDisclosuresRead&&review.draftAndSourceEntryRead);
  assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);assert.equal(review.finalScore,null);
 }
 for(const row of mkn.records){
  assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(mkn.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
  const current=records.find(r=>r.path===row.path);assert.equal(hash(beforeOpFamilyHumanQualityEdits(current)),row.afterSha256);
  assert.equal(hash(beforeMknHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved (MKN|final source link) record/);
  }
 }
});

test('OP/family acceptance binds 95 independent reviews and preserves 72 exact source corrections',()=>{
 assert.equal(opFamily.records.length,72);assert.equal(opFamily.faqs.length,0);assert.equal(opFamily.acceptedCandidates.length,95);
 const reviewCache=new Map();
 for(const row of opFamily.acceptedCandidates){
  if(!reviewCache.has(row.file))reviewCache.set(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse));
  const review=reviewCache.get(row.file).find(r=>r.route===row.route);
  assert.equal(hash(review),row.entrySha256);assert.equal(review.candidateBodySha256,row.candidateBodySha256);
  assert.equal(review.draftSha256,row.draftSha256);assert.equal(review.sourceEntrySha256,row.sourceEntrySha256);
  assert.equal(review.contentVerdict,'pass');assert(review.completeMainTextRead&&review.completeFaqAndSourceDisclosuresRead&&review.draftAndSourceEntryRead);
  assert.deepEqual(review.requiredFixes,[]);assert.deepEqual(review.appliedCaps,[]);assert.equal(review.finalScore,null);
 }
 for(const row of opFamily.records){
  assert.deepEqual(row.reviewEvidence,Object.fromEntries(Object.entries(opFamily.acceptedCandidates.find(r=>r.route===row.path)).filter(([key])=>key!=='route')));
  const current=records.find(r=>r.path===row.path);assert.equal(hash(current),row.afterSha256);
  assert.equal(hash(beforeOpFamilyHumanQualityEdits(current)),row.beforeSha256);
  for(const field of ['path','areaId','areaIds','market','servedAreas','directoryLinks','legacyWorksheet'])assert.deepEqual(current[field],row.before[field],row.path+' '+field);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>delete r.sources,r=>r.unreviewed=true]){
   const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved OP\/family record/);
  }
 }
});

test('human acceptance rejects changed prose, source, identity, additions and deletions',()=>{
 const current=records.find(r=>r.path===ledger.records[0].path);
 for(const mutate of [r=>r.lead+=' Unreviewed.',r=>r.sources[0].url='https://example.invalid/',r=>r.market='Other market',r=>r.unreviewed=true,r=>delete r.decision]){
  const changed=structuredClone(current);mutate(changed);assert.throws(()=>restore(changed),/approved human quality revision/);
 }
 const row=ledger.faqs.find(r=>r.after?.length),answers=structuredClone(faqs[row.path]);answers[0].answer+=' Unreviewed.';
 assert.throws(()=>restoreFaq(row.path,answers),/approved human quality FAQ revision/);
 const removed=ledger.faqs.find(r=>!Object.hasOwn(r,'after'));assert.throws(()=>restoreFaq(removed.path,[]),/approved human quality FAQ revision/);
 const unchanged=records.find(r=>r.path==='/areas/maryland/anne-arundel-county/');
 assert(!ledger.records.some(r=>r.path===unchanged.path));const changed=structuredClone(unchanged);changed.lead+=' Unreviewed.';
 assert.throws(()=>beforeReviewedUxCopyEdits(changed),/approved UX revision/);
});
