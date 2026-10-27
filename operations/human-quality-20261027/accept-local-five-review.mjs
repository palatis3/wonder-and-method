import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const reviews=(await readFile(resolve(import.meta.dirname,'audits/local-five-replacements-independent.jsonl'),'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const manifest=JSON.parse(await readFile(resolve(root,'output/human-quality-20261027/after-review/local-five-current/assignment.json'),'utf8'));
const file=resolve(import.meta.dirname,'drafts/local-5.jsonl'),drafts=(await readFile(file,'utf8')).trim().split(/\r?\n/).map(JSON.parse),byRoute=new Map(drafts.map(x=>[x.route,x]));
if(reviews.length!==12||new Set(reviews.map(x=>x.route)).size!==12||manifest.routes.length!==12)throw Error('Expected12 unique reviews and current bodies');
const changes=[];
for(const r of reviews){
 const d=byRoute.get(r.route),body=manifest.routes.find(x=>x.route===r.route);
 if(!r.contentReady||r.contentVerdict!=='pass'||!d||sha(d)!==r.draftSha256||body?.candidateBodySha256!==r.candidateBodySha256)throw Error('Changed or unapproved candidate '+r.route);
 const before=sha(d);delete d.publicationHold;d.needsResearch=false;d.status='independent-content-reviewed-visuals-pending';
 changes.push({route:d.route,reviewedDraftSha256:before,currentDraftSha256:sha(d),reviewedCandidateBodySha256:r.candidateBodySha256,contentVerdict:'pass',visuals:null,accessibility:null,finalScore:null});
}
await writeFile(resolve(import.meta.dirname,'research/local-five-content-acceptance.json'),JSON.stringify({date:'2026-10-27',scope:'Exact content review only; visual, accessibility and release gates remain.',changes},null,2)+'\n',{flag:'wx'});
await writeFile(file,drafts.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(JSON.stringify({acceptedContent:changes.length,finalAcceptance:false}));
