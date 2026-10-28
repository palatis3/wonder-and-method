import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import records from '../src/location-service-data.json' with {type:'json'};
import briefs from '../src/human-location-briefs.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import ledger from './fixtures/human-quality-final-scope-edits.json' with {type:'json'};
import {beforeFinalScopeHumanQualityEdits} from './fixtures/reviewed-human-quality-final-scope-edits.mjs';
import {locationServicePage} from '../src/location-service-pages.mjs';
import {locationCopyFindings} from '../scripts/site-quality-rules.mjs';
import {normalizeOfferCatalog} from '../src/offer-catalog.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('final source scope clarifications preserve authored output and reject unrelated edits',()=>{
 assert.equal(ledger.records.length,2);
 for(const row of ledger.records){
  const current=records.find(r=>r.path===row.path),brief=briefs.find(r=>r.route===row.path);assert.equal(hash(current),row.afterSha256);
  assert.deepEqual(beforeFinalScopeHumanQualityEdits(current),row.before);
  assert.deepEqual(Object.keys(current).filter(k=>JSON.stringify(current[k])!==JSON.stringify(row.before[k])),['scopeTrigger']);
  assert.deepEqual(locationCopyFindings(current),[]);
  assert.deepEqual(locationServicePage(current,normalizeOfferCatalog(offers),{brief}),locationServicePage(row.before,normalizeOfferCatalog(offers),{brief}));
  for(const mutate of [r=>r.scopeTrigger+=' Unreviewed.',r=>r.sources[0].observation+=' Unreviewed.',r=>r.market='Other']){const changed=structuredClone(current);mutate(changed);assert.throws(()=>beforeFinalScopeHumanQualityEdits(changed),/approved final source scope record/);}
 }
});
