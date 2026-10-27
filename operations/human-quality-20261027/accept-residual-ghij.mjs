// Run only after all 87 exact independent correction reviews are complete and clean.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import locations from '../../src/location-service-data.json' with {type:'json'};
import faqs from '../../src/service-faqs.json' with {type:'json'};
import rawOffers from '../../config/offers.json' with {type:'json'};
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
const root='operations/human-quality-20261027',target='tests/fixtures/human-quality-ghij-edits.json';
assert(!fs.existsSync(target),'GHIJ acceptance already exists');
const names=['residual-g-repair.json','residual-h-repair.json','residual-i-repair.json','residual-j-repair.json'];
const receipts=names.map(name=>({name,value:JSON.parse(fs.readFileSync(`${root}/research/${name}`,'utf8'))}));
for(const {value:r} of receipts)assert.equal(r.status,'implemented-pending-independent-recheck');
const routes=[...new Set(receipts.flatMap(r=>r.value.routes))];assert.equal(routes.length,87);
const batches=[['residual-g-recheck',28],['residual-hi-recheck',39],['residual-j-recheck',20]],reviews=[],reviewFileByRoute=new Map();
for(const [batch,count] of batches){
 const file=root+'/audits/local-after-'+batch+'.jsonl',entries=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
 assert.equal(entries.length,count);assert.equal(new Set(entries.map(r=>r.route)).size,count);
 const summary=JSON.parse(fs.readFileSync(root+'/audits/local-after-'+batch+'-summary.json','utf8'));
 assert.equal(summary.reviewedCount,count);assert.equal(summary.status,'complete-content-only');assert.equal(summary.unresolvedMaterialContentDefects,0);assert.deepEqual(summary.requiredFixes,[]);assert.deepEqual(summary.validation.errors,[]);
 for(const entry of entries){assert(!reviewFileByRoute.has(entry.route));reviewFileByRoute.set(entry.route,file);reviews.push(entry);}
}
assert.equal(reviews.length,87);
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const textHash=x=>createHash('sha256').update(x).digest('hex');
const normalizedHash=x=>hash(x??null),drafts=new Map(),bindings=new Map(),offers=normalizeOfferCatalog(rawOffers);
for(let p=1;p<=6;p++)for(const line of fs.readFileSync(`${root}/drafts/local-${p}.jsonl`,'utf8').trim().split(/\r?\n/)){const d=JSON.parse(line);drafts.set(d.route,d);}
for(const route of routes){
 const r=reviews.find(r=>r.route===route),draft=drafts.get(route),entry=locations.find(r=>r.path===route);assert(r&&draft&&entry,route);
 assert(r.completeMainTextRead&&r.completeFaqAndSourceDisclosuresRead&&r.draftAndSourceEntryRead,route);
 assert.equal(r.contentVerdict,'pass');assert.deepEqual(r.requiredFixes,[]);assert.deepEqual(r.appliedCaps,[]);assert.equal(r.finalScore,null);
 assert.equal(hash(draft),r.draftSha256,route+' exact draft');assert.equal(hash(entry),r.sourceEntrySha256,route+' exact source');
 let {body}=locationServicePage(entry,offers,{brief:draft});const faq=serviceFaqSection(route,offers),anchor='<section class="section county-section" id="your-brief">';if(faq)body=body.includes(anchor)?body.replace(anchor,faq+anchor):body+faq;
 assert.equal(textHash(body),r.candidateBodySha256,route+' exact candidate');
 bindings.set(route,{file:reviewFileByRoute.get(route),entrySha256:hash(r),candidateBodySha256:r.candidateBodySha256,draftSha256:r.draftSha256,sourceEntrySha256:r.sourceEntrySha256});
}
const previous=[JSON.parse(fs.readFileSync('tests/fixtures/human-quality-def-edits.json','utf8')),JSON.parse(fs.readFileSync('tests/fixtures/human-quality-combined-edits.json','utf8')),JSON.parse(fs.readFileSync('tests/fixtures/human-quality-residual-edits.json','utf8')),JSON.parse(fs.readFileSync('tests/fixtures/human-quality-edits.json','utf8'))];
function accepted(rows,kind){return rows.map(row=>{
 const isFaq=kind==='faqs',current=isFaq?(faqs[row.route]??null):locations.find(r=>r.path===row.route);
 assert.equal(normalizedHash(row.before),row.beforeSha256);assert.equal(normalizedHash(row.after),row.afterSha256);assert.equal(normalizedHash(current),row.afterSha256,row.route+' receipt current');
 const prior=previous.flatMap(l=>l[kind]).find(r=>r.path===row.route);if(prior)assert.equal(hash(row.before),prior.afterSha256,row.route+' prior accepted value');
 return{path:row.route,before:row.before,after:row.after,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256,reviewEvidence:bindings.get(row.route)};
});}
const records=accepted(receipts.flatMap(r=>r.value.records??[]),'records'),answers=accepted(receipts.flatMap(r=>r.value.faqs??[]),'faqs');
assert.equal(records.length,24);assert.equal(answers.length,0);assert.equal(new Set(records.map(r=>r.path)).size,24);assert.equal(new Set(answers.map(r=>r.path)).size,0);
const ledger={date:'2026-10-27',purpose:'Exact independently reviewed GHIJ corrections layered before the prior DEF, combined, residual and original human acceptance ledgers.',records,faqs:answers,acceptedCandidates:routes.map(route=>({route,...bindings.get(route)}))};
fs.writeFileSync(target,JSON.stringify(ledger,null,2)+'\n',{flag:'wx'});
for(const {name,value:r} of receipts){r.status='independently-accepted-pending-brief-import-and-rendered-checks';r.acceptance={reviewFiles:[...new Set(r.routes.map(route=>reviewFileByRoute.get(route)))].map(file=>({file,sha256:textHash(fs.readFileSync(file))})),exactCandidates:r.routes.length,scope:'Content only; family, visual, accessibility and release checks remain separate.'};fs.writeFileSync(`${root}/research/${name}`,JSON.stringify(r,null,2)+'\n');}
console.log(JSON.stringify({acceptedCandidates:87,sourceRecords:24,faqDeletions:0,importPending:true}));

