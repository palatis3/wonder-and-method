import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import briefs from '../src/human-location-briefs.json' with {type:'json'};
import ledger from './fixtures/human-quality-final-source-links.json' with {type:'json'};
import {beforeFinalSourceLinkHumanQualityEdits} from './fixtures/reviewed-human-quality-final-source-links.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('final citation repairs preserve seven exact records and reject unrelated source changes',()=>{
 assert.equal(ledger.records.length,7);
 for(const row of ledger.records){
  const current=records.find(r=>r.path===row.path);assert.equal(hash(current),row.afterSha256);assert.deepEqual(beforeFinalSourceLinkHumanQualityEdits(current),row.before);
  const changed=Object.keys(current).filter(k=>JSON.stringify(current[k])!==JSON.stringify(row.before[k]));
  const allowed=row.path.includes('/texas/')?['sources','checkedDate']:['lead','decision','scopes','planningTable','sources','checkedDate'];
  assert(changed.every(k=>allowed.includes(k)));assert.equal(current.sources.length,row.before.sources.length);
  const urls=current.sources.filter((s,i)=>s.url!==row.before.sources[i].url);assert.equal(urls.length,1);assert.equal(urls[0].url,row.research.url);
  for(const mutate of [r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other',r=>r.relatedGuides=[]]){const modified=structuredClone(current);mutate(modified);assert.throws(()=>beforeFinalSourceLinkHumanQualityEdits(modified),/approved final source link record/);}
 }
});
test('the piano brief corrects appraisal scope without changing the owner inputs or service limits',()=>{
 assert.equal(ledger.briefs.length,1);const row=ledger.briefs[0],current=briefs.find(r=>r.route===row.route);assert.equal(hash(current),row.afterSha256);assert.equal(hash(row.before),row.beforeSha256);
 assert.deepEqual(Object.keys(current).filter(k=>JSON.stringify(current[k])!==JSON.stringify(row.before[k])),['intro','customerQuestion','sourceBridge']);
 assert(!JSON.stringify(current).includes('condition-and-value'));assert(current.intro.includes('estate settlement or sale'));assert.deepEqual(current.decisions,row.before.decisions);assert.deepEqual(current.limits,row.before.limits);
});
