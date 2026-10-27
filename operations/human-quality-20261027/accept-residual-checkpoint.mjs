// One-use acceptance of the exact independently rechecked October 27 batch.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import locations from '../../src/location-service-data.json' with {type:'json'};
import faqs from '../../src/service-faqs.json' with {type:'json'};
import rawOffers from '../../config/offers.json' with {type:'json'};
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
const root='operations/human-quality-20261027',file=root+'/research/residual-checkpoint-repair.json';
const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
const reviewFile=root+'/audits/local-after-residual-checkpoint-recheck.jsonl';
const reviews=fs.readFileSync(reviewFile,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const summary=JSON.parse(fs.readFileSync(root+'/audits/local-after-residual-checkpoint-recheck-summary.json','utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const textHash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(receipt.status,'implemented-pending-independent-recheck');
assert.equal(receipt.routes.length,20);assert.equal(reviews.length,20);
assert.equal(receipt.drafts.length,17);assert.equal(receipt.sources.length,1);assert.equal(receipt.faqs.length,2);
assert.equal(summary.reviewedCount,20);assert.equal(summary.unresolvedMaterialContentDefects.length,0);
const drafts=new Map();
for(let p=1;p<=6;p++)for(const line of fs.readFileSync(`${root}/drafts/local-${p}.jsonl`,'utf8').trim().split(/\r?\n/)){const d=JSON.parse(line);drafts.set(d.route,d);}
const offers=normalizeOfferCatalog(rawOffers),bindings=new Map();
for(const route of receipt.routes){
 const review=reviews.find(r=>r.route===route),draft=drafts.get(route),entry=locations.find(r=>r.path===route);
 assert(review&&draft&&entry,route);assert(review.completeMainTextRead);assert.equal(review.requiredFixes.length,0);assert.equal(review.appliedCaps.length,0);
 assert.equal(hash(draft),review.draftSha256,route+' reviewed draft');
 let {body}=locationServicePage(entry,offers,{brief:draft});
 const faq=serviceFaqSection(route,offers),anchor='<section class="section county-section" id="your-brief">';
 if(faq)body=body.includes(anchor)?body.replace(anchor,faq+anchor):body+faq;
 assert.equal(textHash(body),review.candidateBodySha256,route+' reviewed candidate');
 bindings.set(route,{file:reviewFile,entrySha256:hash(review),candidateBodySha256:review.candidateBodySha256,draftSha256:review.draftSha256});
}
const priorLedger=JSON.parse(fs.readFileSync('tests/fixtures/human-quality-edits.json','utf8'));
function accepted(rows,current,prior){return rows.map(row=>{
 assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);
 assert.equal(hash(current(row.route)),row.afterSha256,row.route+' exact accepted edit');
 const old=prior.find(r=>r.path===row.route);if(old)assert.equal(old.afterSha256,row.beforeSha256,row.route+' preserved original acceptance');
 return {path:row.route,before:row.before,after:row.after,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256,reviewEvidence:bindings.get(row.route)};
});}
const ledger={date:'2026-10-27',purpose:'Exact residual checkpoint edits layered over the preserved original acceptance ledger.',records:accepted(receipt.sources,path=>locations.find(r=>r.path===path),priorLedger.records),faqs:accepted(receipt.faqs,path=>faqs[path],priorLedger.faqs)};
fs.writeFileSync('tests/fixtures/human-quality-residual-edits.json',JSON.stringify(ledger,null,2)+'\n',{flag:'wx'});
receipt.status='independently-accepted-pending-brief-import-and-rendered-checks';
receipt.acceptance={reviewFile,reviewFileSha256:textHash(fs.readFileSync(reviewFile)),exactCandidates:20,reviewedOn:'2026-10-27',scope:'Content only; family, visual, accessibility and release checks remain separate.'};
fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({acceptedCandidates:20,sourceRecords:1,faqCollections:2,importPending:true}));
