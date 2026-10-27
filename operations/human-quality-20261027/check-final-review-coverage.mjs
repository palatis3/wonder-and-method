import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import locations from '../../src/location-service-data.json' with {type:'json'};
import rawOffers from '../../config/offers.json' with {type:'json'};
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
const dir=import.meta.dirname,root=resolve(dir,'../..'),hash=x=>createHash('sha256').update(x).digest('hex'),drafts=new Map();
for(let i=1;i<=6;i++)for(const line of (await readFile(resolve(dir,`drafts/local-${i}.jsonl`),'utf8')).trim().split(/\r?\n/)){const draft=JSON.parse(line);drafts.set(draft.route,{draft,partition:i});}
const reviewFiles=(await readdir(resolve(dir,'audits'))).filter(f=>/^(local-after-|local-five-replacements-independent|local-research-replacements-independent|final-eight-independent|final-local-replacements-independent|final-findings-recheck)/.test(f)&&f.endsWith('.jsonl'));
const reviews=[];
for(const file of reviewFiles)for(const line of (await readFile(resolve(dir,'audits',file),'utf8')).trim().split(/\r?\n/))reviews.push({...JSON.parse(line),file});
const offers=normalizeOfferCatalog(rawOffers),rows=[];
for(const entry of locations){
 const {draft,partition}=drafts.get(entry.path);let {body}=locationServicePage(entry,offers,{brief:draft});
 const faq=serviceFaqSection(entry.path,offers),anchor='<section class="section county-section" id="your-brief">';if(faq)body=body.includes(anchor)?body.replace(anchor,faq+anchor):body+faq;
 const currentHash=hash(body),matching=reviews.filter(r=>r.route===entry.path&&r.candidateBodySha256===currentHash);
 rows.push({route:entry.path,partition,currentCandidateBodySha256:currentHash,exactReviews:matching.map(r=>({file:r.file,verdict:r.verdict??r.contentVerdict??null,ratings:r.dimensionRatings,findings:r.remainingFindings??r.findings??[]})),earlierReviewedBodies:reviews.filter(r=>r.route===entry.path&&r.candidateBodySha256!==currentHash).map(r=>({file:r.file,candidateBodySha256:r.candidateBodySha256}))});
}
const out=resolve(root,'output/human-quality-20261027/final-review-coverage');await mkdir(out,{recursive:true});
await writeFile(resolve(out,'routes.json'),JSON.stringify(rows,null,2)+'\n');
const missing=rows.filter(r=>!r.exactReviews.length);await writeFile(resolve(out,'missing-routes.json'),JSON.stringify(missing.map(r=>r.route),null,2)+'\n');
const summary={date:'2026-10-27',standardLocalPages:rows.length,exactCurrentContentReviews:rows.length-missing.length,missingExactCurrentContentReviews:missing.length,missingByPartition:Object.fromEntries([1,2,3,4,5,6].map(p=>[p,missing.filter(r=>r.partition===p).length])),limits:'Coverage only. Matching review may contain findings. No scores inferred or upgraded. Custom Erie, services, directories and guides tracked separately.'};await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
