import {readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import locations from '../../src/location-service-data.json' with {type:'json'};

const root=resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2);
const routes=args[0]==='--routes-file'&&args.length===2?JSON.parse(await readFile(resolve(root,args[1]),'utf8')):args;
if(!Array.isArray(routes)||routes.some(route=>typeof route!=='string'))throw Error('Expected an array of route strings.');
if(!routes.length)throw Error('Pass explicitly reviewed routes, or --all after complete editorial review.');
const all=routes.includes('--all');
const selected=new Set(all?locations.map(item=>item.path):routes);
const baseline=new Map();
for await(const line of createInterface({input:createReadStream(resolve(root,'output/human-quality-20261027/inventory/pages.jsonl')),crlfDelay:Infinity})){
 const page=JSON.parse(line);if(selected.has(page.route))baseline.set(page.route,page.baselineRenderedSha256);
}
const drafts=new Map();
for(let i=1;i<=6;i++){
 const text=await readFile(resolve(import.meta.dirname,`drafts/local-${i}.jsonl`),'utf8');
 for(const line of text.split(/\r?\n/).filter(Boolean)){
  const draft=JSON.parse(line);if(!selected.has(draft.route))continue;
  if(drafts.has(draft.route))throw Error(`Duplicate draft: ${draft.route}`);
  if(draft.inputHash!==baseline.get(draft.route))throw Error(`Baseline changed: ${draft.route}`);
  if(draft.needsResearch||draft.researchNeeded||draft.publicationHold||/hold|needs-research/.test(draft.status||''))throw Error(`Unresolved source research: ${draft.route}`);
  for(const key of ['heading','intro','customerQuestion','sourceBridge','limits'])if(typeof draft[key]!=='string'||!draft[key].trim())throw Error(`Missing ${key}: ${draft.route}`);
  if(draft.decisions?.length!==3||draft.decisions.some(item=>!item.label?.trim()||!item.body?.trim()))throw Error(`Invalid decisions: ${draft.route}`);
  if(draft.ownerInputs?.length!==3||draft.ownerInputs.some(item=>typeof item!=='string'||!item.trim()))throw Error(`Invalid inputs: ${draft.route}`);
  if(!locations.some(item=>item.path===draft.route))throw Error(`Unknown source route: ${draft.route}`);
  drafts.set(draft.route,Object.fromEntries(['route','inputHash','heading','intro','customerQuestion','decisions','ownerInputs','sourceBridge','limits'].map(key=>[key,draft[key]])));
 }
}
for(const route of selected)if(!drafts.has(route))throw Error(`Missing individually authored brief: ${route}`);
const target=resolve(root,'src/human-location-briefs.json');
const previous=JSON.parse(await readFile(target,'utf8'));
const combined=all?new Map():new Map(previous.map(item=>[item.route,item]));
for(const [route,draft] of drafts)combined.set(route,draft);
await writeFile(target,JSON.stringify([...combined.values()].sort((a,b)=>a.route.localeCompare(b.route)),null,2)+'\n');
console.log(JSON.stringify({imported:drafts.size,total:combined.size,baselineHashChecks:'passed',fullCoverage:all}));
