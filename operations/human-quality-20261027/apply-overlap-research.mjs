import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {replacements} from './research/local-overlap-replacements.mjs';
const root=resolve(import.meta.dirname,'../..'),sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sourcePath=resolve(root,'src/location-service-data.json'),entries=JSON.parse(await readFile(sourcePath,'utf8'));
const imported=JSON.parse(await readFile(resolve(root,'src/human-location-briefs.json'),'utf8'));
const files=new Map();for(const n of [3,6]){const file=resolve(import.meta.dirname,`drafts/local-${n}.jsonl`);files.set(n,{file,drafts:(await readFile(file,'utf8')).trim().split(/\r?\n/).map(JSON.parse)});}
const backup=[],changes=[];
for(const item of replacements){
 const si=entries.findIndex(x=>x.path===item.route),{drafts}=files.get(item.partition),di=drafts.findIndex(x=>x.route===item.route);
 if(si<0||di<0||imported.some(x=>x.route===item.route)||drafts[di].researchResolution==='local-overlap-primary-sources-20261027')throw Error('Unexpected route state '+item.route);
 if(item.decisions.length!==3||item.ownerInputs.length!==3)throw Error('Incomplete proposal '+item.route);
 const oldSource=entries[si],oldDraft=drafts[di];backup.push({route:item.route,source:oldSource,draft:oldDraft});
 const entry={...oldSource,checkedDate:'2026-10-27',decisionTitle:item.heading,lead:item.intro,decision:item.sourceBridge,description:`Web design for ${oldSource.market}. ${item.heading}`,coverageNote:item.coverageNote,sources:item.sources,quoteQuestions:item.ownerInputs,scopes:[{title:item.heading,pages:item.decisions.map(x=>x.label),request:item.customerQuestion,supplies:item.ownerInputs.join(' '),check:item.check}],scopeTrigger:item.limits,relatedGuides:[]};
 delete entry.planningTable;
 const draft={route:item.route,inputHash:oldDraft.inputHash,...Object.fromEntries(['heading','intro','customerQuestion','decisions','ownerInputs','sourceBridge','limits'].map(k=>[k,item[k]])),needsResearch:false,publicationHold:'Awaiting independent complete-page and sibling review after source-backed revision.',researchResolution:'local-overlap-primary-sources-20261027',status:'replacement-awaiting-independent-review'};
 entries[si]=entry;drafts[di]=draft;
 changes.push({route:item.route,previousSourceSha256:sha(oldSource),sourceSha256:sha(entry),previousDraftSha256:sha(oldDraft),draftSha256:sha(draft),baselineRenderedSha256:oldDraft.inputHash,researchNote:item.researchNote,check:item.check,sources:item.sources.map(x=>x.url)});
}
const out=resolve(root,'output/human-quality-20261027/local-overlap-replacements');await mkdir(out,{recursive:true});
await writeFile(resolve(out,'before.json'),JSON.stringify(backup,null,2)+'\n',{flag:'wx'});
await writeFile(sourcePath,JSON.stringify(entries,null,2)+'\n');for(const {file,drafts} of files.values())await writeFile(file,drafts.map(x=>JSON.stringify(x)).join('\n')+'\n');
await writeFile(resolve(out,'review-routes.json'),JSON.stringify(replacements.map(x=>x.route),null,2)+'\n');
await writeFile(resolve(import.meta.dirname,'research/local-overlap-integration.json'),JSON.stringify({date:'2026-10-27',status:'Six replacement source entries and drafts staged; independent review pending.',changes,imported:false,originalAuditsPreserved:true},null,2)+'\n');
console.log(JSON.stringify({staged:changes.length,imported:false}));
