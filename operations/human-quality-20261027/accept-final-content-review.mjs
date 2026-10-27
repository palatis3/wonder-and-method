// Exact reviewed content acceptance; visual/accessibility/release gates remain separate.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import locations from '../../src/location-service-data.json' with {type:'json'};
import rawOffers from '../../config/offers.json' with {type:'json'};
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
const dir=import.meta.dirname,root=resolve(dir,'../..'),hash=x=>createHash('sha256').update(x).digest('hex'),sha=x=>hash(JSON.stringify(x));
const readLines=async file=>(await readFile(resolve(dir,file),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const approved=new Map();
for(const file of ['final-local-replacements-independent','final-eight-independent','final-findings-recheck'])for(const row of await readLines(`audits/${file}.jsonl`))approved.set(row.route,{...row,reviewFile:`audits/${file}.jsonl`});
if(approved.size!==17||[...approved.values()].some(r=>r.verdict!=='pass'||!r.contentReady))throw Error('All17 exact content approvals required');
approved.delete('/areas/erie-county/');
const offers=normalizeOfferCatalog(rawOffers),entries=new Map(locations.map(e=>[e.path,e])),changes=[],files=[];
for(let partition=1;partition<=6;partition++){
 const file=`drafts/local-${partition}.jsonl`,drafts=await readLines(file);
 for(const draft of drafts){
  const review=approved.get(draft.route);if(!review)continue;
  if(sha(draft)!==review.draftSha256)throw Error('Stale draft '+draft.route);
  let {body}=locationServicePage(entries.get(draft.route),offers,{brief:draft});
  const faq=serviceFaqSection(draft.route,offers),anchor='<section class="section county-section" id="your-brief">';
  if(faq)body=body.includes(anchor)?body.replace(anchor,faq+anchor):body+faq;
  if(hash(body)!==review.candidateBodySha256)throw Error('Stale candidate '+draft.route);
  delete draft.publicationHold;draft.needsResearch=false;draft.status='independent-content-reviewed-visuals-pending';
  changes.push({route:draft.route,reviewFile:review.reviewFile,reviewedDraftSha256:review.draftSha256,currentDraftSha256:sha(draft),reviewedCandidateBodySha256:review.candidateBodySha256,contentVerdict:'pass',visuals:null,accessibility:null,finalScore:null});
 }
 files.push({file,drafts});
}
if(changes.length!==16)throw Error('Expected16 standard routes');
await writeFile(resolve(dir,'research/final-content-acceptance.json'),JSON.stringify({date:'2026-10-27',scope:'Exact16 independently reviewed standard local briefs; separate Erie review retained. Content only.',changes},null,2)+'\n',{flag:'wx'});
for(const {file,drafts} of files)await writeFile(resolve(dir,file),drafts.map(JSON.stringify).join('\n')+'\n');
await writeFile(resolve(root,'output/human-quality-20261027/final-import-routes.json'),JSON.stringify(changes.map(x=>x.route),null,2)+'\n');
console.log(JSON.stringify({accepted:changes.length,finalAcceptance:false}));
