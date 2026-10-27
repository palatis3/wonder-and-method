import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {replacements} from './research/local-holds-second-pass.mjs';

const root=resolve(import.meta.dirname,'../..');
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const entries=JSON.parse(await readFile(resolve(root,'src/location-service-data.json'),'utf8'));
const draftPath=resolve(import.meta.dirname,'drafts/local-3.jsonl');
const drafts=(await readFile(draftPath,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
const imported=JSON.parse(await readFile(resolve(root,'src/human-location-briefs.json'),'utf8'));
const backup=[],changes=[];
for(const item of replacements){
 const sourceIndex=entries.findIndex(entry=>entry.path===item.route);
 const draftIndex=drafts.findIndex(draft=>draft.route===item.route);
 if(sourceIndex<0||draftIndex<0)throw Error('Unknown route '+item.route);
 const oldSource=entries[sourceIndex],oldDraft=drafts[draftIndex];
 if(!oldDraft.publicationHold||oldDraft.researchResolution==='second-pass-primary-sources-20261027')throw Error('Unexpected draft state '+item.route);
 if(imported.some(brief=>brief.route===item.route))throw Error('Unexpected already imported route '+item.route);
 if(item.decisions.length!==3||item.ownerInputs.length!==3)throw Error('Invalid brief '+item.route);
 backup.push({route:item.route,source:oldSource,draft:oldDraft});
 const entry={...oldSource,checkedDate:'2026-10-27',decisionTitle:item.heading,lead:item.intro,decision:item.sourceBridge,
  description:`Web design for ${oldSource.market}. ${item.heading}`,
  coverageNote:item.coverageNote,sources:item.sources,quoteQuestions:item.ownerInputs,
  scopes:[{title:item.heading,pages:item.decisions.map(part=>part.label),request:item.customerQuestion,supplies:item.ownerInputs.join(' '),check:item.check}],
  scopeTrigger:item.limits,relatedGuides:[]};
 delete entry.planningTable;
 if(item.retireWorksheet&&entry.legacyWorksheet)entry.legacyWorksheetRetired=true;
 const draft={route:item.route,inputHash:oldDraft.inputHash,
  ...Object.fromEntries(['heading','intro','customerQuestion','decisions','ownerInputs','sourceBridge','limits'].map(key=>[key,item[key]])),
  needsResearch:false,publicationHold:'Awaiting independent complete-page and sibling review after source-backed revision.',
  researchResolution:'second-pass-primary-sources-20261027',status:'replacement-awaiting-independent-review'};
 entries[sourceIndex]=entry;drafts[draftIndex]=draft;
 changes.push({route:item.route,previousSourceSha256:sha(oldSource),sourceSha256:sha(entry),previousDraftSha256:sha(oldDraft),draftSha256:sha(draft),baselineRenderedSha256:oldDraft.inputHash,researchNote:item.researchNote,check:item.check,sources:item.sources.map(source=>source.url),retiredWorksheet:!!item.retireWorksheet});
}
const out=resolve(root,'output/human-quality-20261027/second-pass-replacements');
await mkdir(out,{recursive:true});
await writeFile(resolve(out,'before.json'),JSON.stringify(backup,null,2)+'\n',{flag:'wx'});
await writeFile(resolve(root,'src/location-service-data.json'),JSON.stringify(entries,null,2)+'\n');
await writeFile(draftPath,drafts.map(row=>JSON.stringify(row)).join('\n')+'\n');
await writeFile(resolve(import.meta.dirname,'research/second-pass-integration.json'),JSON.stringify({checkedDate:'2026-10-27',changes,unchangedSources:entries.length-changes.length,imported:false,originalAuditFindingsPreserved:true,status:'Source and draft replacements staged; independent review and visual checks pending.'},null,2)+'\n');
console.log(JSON.stringify({staged:changes.length,imported:false,unchangedSources:entries.length-changes.length}));
