// Apply the specific independent content verdicts; this is not visual/release approval.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const reviews=(await readFile(resolve(import.meta.dirname,'audits/local-research-replacements-independent.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const walton=JSON.parse(await readFile(resolve(import.meta.dirname,'audits/walton-recheck.json'),'utf8'));
const approved=new Map(reviews.filter(x=>x.contentReady&&x.contentVerdict==='pass').map(x=>[x.route,x]));
if(!walton.contentReady||walton.contentVerdict!=='pass'||!walton.solePriorFindingResolved)throw Error('Walton not ready');approved.set(walton.route,walton);
if(approved.size!==14)throw Error('Expected14 approvals');
const files=[],changes=[];
for(const partition of [1,3,4]){
 const file=resolve(import.meta.dirname,`drafts/local-${partition}.jsonl`),drafts=(await readFile(file,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
 for(const draft of drafts){
  const review=approved.get(draft.route);if(!review)continue;
  if(sha(draft)!==review.draftSha256)throw Error('Draft changed since review: '+draft.route);
  const before=sha(draft);delete draft.publicationHold;draft.needsResearch=false;draft.status='independent-content-reviewed-visuals-pending';
  changes.push({route:draft.route,reviewedDraftSha256:before,currentDraftSha256:sha(draft),reviewedCandidateBodySha256:review.candidateBodySha256,contentVerdict:'pass',visuals:null,accessibility:null,finalScore:null});
 }
 files.push({file,drafts});
}
if(changes.length!==14)throw Error('Coverage mismatch');
await writeFile(resolve(import.meta.dirname,'research/replacement-content-acceptance.json'),JSON.stringify({date:'2026-10-27',scope:'Clear research/content staging holds for these14 exact reviewed drafts. All release, visual and accessibility gates remain.',changes},null,2)+'\n',{flag:'wx'});
for(const {file,drafts} of files)await writeFile(file,drafts.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(JSON.stringify({acceptedContent:changes.length,finalAcceptance:false}));
