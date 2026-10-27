import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parse} from 'parse5';
import {guideDetails} from '../../src/guide-details.mjs';
import {journal} from '../../src/journal.mjs';
import {serviceStates} from '../../src/service-area-directory.mjs';

// Extraction only: no semantic scores, inferred quality judgments or previous scores.
// Usage: node operations/human-quality-20261027/inventory.mjs [output-directory]
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const output=resolve(root,process.argv[2]||'output/human-quality-20261027/inventory');
const dist=resolve(root,'dist');
const hash=value=>createHash('sha256').update(value).digest('hex');
const normalize=value=>value.replace(/\s+/gu,' ').trim();
const words=value=>value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];
const compare=(a,b)=>a<b?-1:a>b?1:0;
const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
const ignored=new Set(['script','style','template','svg']);
const blocks=new Set(['p','li','dt','dd','h1','h2','h3','h4','h5','h6','summary','caption','th','td','div','section','article','header','nav','ul','ol','dl','tr','table','br']);
function textOf(node){
 if(ignored.has(node.tagName))return '';
 if(node.nodeName==='#text')return node.value;
 const text=(node.childNodes||[]).map(textOf).join('');
 return blocks.has(node.tagName)?`\n${text}\n`:text;
}
function walk(node,callback,ancestors=[]){
 if(ignored.has(node.tagName))return;
 callback(node,ancestors);
 for(const child of node.childNodes||[])walk(child,callback,[...ancestors,node]);
}
async function filesAt(folder){
 const result=[];
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const path=resolve(folder,entry.name);
  if(entry.isDirectory())result.push(...await filesAt(path));else result.push(path);
 }
 return result.sort(compare);
}
const locationData=JSON.parse(await readFile(resolve(root,'src/location-service-data.json'),'utf8'));
const locationByPath=new Map(locationData.map((entry,index)=>[entry.path,{entry,index}]));
const stateByPath=new Map(serviceStates.map(state=>[state.path,state]));
const sourceTexts=await Promise.all((await filesAt(resolve(root,'src'))).filter(path=>path.endsWith('.mjs')||path.endsWith('.json')).map(async path=>({path:relative(root,path).replaceAll('\\','/'),text:await readFile(path,'utf8')})));
const sourceMatches=(route,slug)=>sourceTexts.filter(item=>item.text.includes(route)||(slug&&/guide/.test(item.path)&&new RegExp(`['\"]${slug}['\"]`).test(item.text))).map(item=>item.path);
const htmlFiles=(await filesAt(dist)).filter(path=>path.endsWith('.html'));
const records=[],excluded=[];
for(const file of htmlFiles){
 const filePath=relative(dist,file).replaceAll('\\','/');
 const route='/'+filePath.replace(/index\.html$/,'');
 if(!/^\/(?:areas|services|guides)\//.test(route)){excluded.push({route,renderedFile:'dist/'+filePath,reason:'Outside requested /areas/, /services/, /guides/ families'});continue;}
 const html=await readFile(file,'utf8'),document=parse(html);
 let main,title='',canonicalUrl='',description='';
 walk(document,node=>{
  if(node.tagName==='main')main=node;
  if(node.tagName==='title')title=normalize(textOf(node));
  if(node.tagName==='link'&&attr(node,'rel')==='canonical')canonicalUrl=attr(node,'href');
  if(node.tagName==='meta'&&attr(node,'name')==='description')description=attr(node,'content');
 });
 if(!main)throw new Error(`Missing main: ${route}`);
 if(!canonicalUrl||new URL(canonicalUrl).pathname!==route)throw new Error(`Canonical mismatch: ${route} ${canonicalUrl}`);
 const headings={h1:[],h2:[],h3:[]},prose=[],links=[],contentBlocks=[];
 walk(main,(node,ancestors)=>{
  const tag=node.tagName,text=normalize(textOf(node));
  if(headings[tag])headings[tag].push(text);
  const context={sectionId:[...ancestors,node].reverse().find(item=>attr(item,'id'))?.attrs.find(item=>item.name==='id')?.value||null,insideCollapsedDetails:ancestors.some(item=>item.tagName==='details'&&attr(item,'open')===undefined),explicitlyHidden:[...ancestors,node].some(item=>attr(item,'hidden')!==undefined||attr(item,'aria-hidden')==='true')};
  if(['p','li','dt','dd','summary','caption','th','td','h1','h2','h3','h4','h5','h6'].includes(tag)&&text){
   const item={tag,text,...context};
   contentBlocks.push(item);
   if(['p','li','dt','dd'].includes(tag))prose.push(item);
  }
  if(tag==='a'&&attr(node,'href')){
   const href=attr(node,'href');
   let internal=false,destination=href;
   try{const url=new URL(href,canonicalUrl);internal=url.origin===new URL(canonicalUrl).origin;destination=internal?url.pathname+url.search+url.hash:url.href;}catch{}
   links.push({text,href,destination,internal,className:attr(node,'class')||'',ctaHint:/button|text-link|action/.test(attr(node,'class')||'')||/contact|checkout|pricing/.test(destination),...context});
  }
 });
 const mainText=textOf(main).split(/\n+/).map(normalize).filter(Boolean).join('\n');
 const paragraphs=prose.filter(item=>item.tag==='p');
 const sentences=paragraphs.flatMap(item=>[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(item.text)].map(part=>part.segment.trim()).filter(Boolean));
 const sentenceLengths=sentences.map(sentence=>words(sentence).length);
 const location=locationByPath.get(route),state=stateByPath.get(route),slug=route.split('/').filter(Boolean).at(-1),guide=route.startsWith('/guides/')?(guideDetails[slug]||journal.find(item=>item.path===route)):null;
 const family=route==='/areas/'?'area-index':state?'area-state':route.startsWith('/areas/')?'area-local':route==='/services/'?'service-index':route.startsWith('/services/')?'service':route==='/guides/'?'guide-index':'guide';
 const sourceIdentity=location?{kind:'location-service-data',file:'src/location-service-data.json',arrayIndex:location.index,key:location.entry.areaId,areaIds:location.entry.areaIds,market:location.entry.market,primaryTask:location.entry.scopes?.[0]?.request,decisionTitle:location.entry.decisionTitle,sources:location.entry.sources,sourceEntry:location.entry}:state?{kind:'state-directory',file:'src/service-area-directory.mjs',key:state.id,name:state.name,countyCount:state.counties.length}:guide?{kind:guideDetails[slug]?'guide-details':'journal',file:guideDetails[slug]?'src/guide-details.mjs':'src/journal.mjs',key:slug,primaryTask:guide.answer||guide.goal||guide.description,sourceEntry:guide}:{kind:family==='area-local'?'special-local-page':'page-renderer',file:'src/pages.mjs',key:route,primaryTask:null};
 records.push({route,canonicalUrl,family,renderedFile:'dist/'+filePath,baselineRenderedSha256:hash(html),renderedBytes:Buffer.byteLength(html),title,description,headings,mainText,contentBlocks,prose,internalLinks:links.filter(link=>link.internal),internalCtas:links.filter(link=>link.internal&&link.ctaHint),externalLinks:links.filter(link=>!link.internal),sourceIdentity,sourceReferenceFiles:sourceMatches(route,guide?slug:null),metrics:{wordCount:words(mainText).length,paragraphCount:paragraphs.length,maxParagraphWords:Math.max(0,...paragraphs.map(item=>words(item.text).length)),maxParagraphCharacters:Math.max(0,...paragraphs.map(item=>item.text.length)),sentenceCount:sentences.length,maxSentenceWords:Math.max(0,...sentenceLengths),averageSentenceWords:sentenceLengths.length?Math.round(sentenceLengths.reduce((sum,n)=>sum+n,0)/sentenceLengths.length*100)/100:0,sentencesOver30Words:sentenceLengths.filter(n=>n>30).length,sentencesOver40Words:sentenceLengths.filter(n=>n>40).length}});
}
records.sort((a,b)=>compare(a.route,b.route));
if(new Set(records.map(record=>record.route)).size!==records.length)throw new Error('Duplicate routes');
await mkdir(resolve(output,'batches'),{recursive:true});
// Remove only this extractor's previous batch files, within its output directory.
for(const name of await readdir(resolve(output,'batches')))if(/^(?:area-index|area-local|area-state|guide|guide-index|service|service-index)-\d+\.jsonl$/.test(name))await unlink(resolve(output,'batches',name));
const batches=[];
for(const family of [...new Set(records.map(record=>record.family))].sort(compare)){
 const entries=records.filter(record=>record.family===family);
 let index=0,number=0;
 while(index<entries.length){
  const batch=[];let batchWords=0;
  while(index<entries.length&&batch.length<100){
   const next=entries[index];
   if(batch.length&&batchWords+next.metrics.wordCount>12000)break;
   batch.push(next);batchWords+=next.metrics.wordCount;index++;
  }
  const id=`${family}-${String(++number).padStart(3,'0')}`,file=`batches/${id}.jsonl`;
  const compact=batch.map(({prose,contentBlocks,internalLinks,sourceIdentity,...record})=>({...record,sourceIdentity:Object.fromEntries(Object.entries(sourceIdentity).filter(([key])=>key!=='sourceEntry'))}));
  await writeFile(resolve(output,file),compact.map(record=>JSON.stringify(record)).join('\n')+'\n');
  batches.push({id,family,file,count:batch.length,wordCount:batch.reduce((sum,record)=>sum+record.metrics.wordCount,0),routes:batch.map(record=>record.route)});
 }
}
await mkdir(resolve(output,'assignments'),{recursive:true});
const packetByRoute=new Map(batches.flatMap(batch=>batch.routes.map(route=>[route,batch.file])));
const assignments=[];
async function assignment(id,entries,range=null){
 const file=`assignments/${id}.json`;
 const manifest={id,scope:'Task partition only; no review verdicts.',count:entries.length,localSortedIndexRange:range,routes:entries.map(record=>({route:record.route,family:record.family,packet:packetByRoute.get(record.route),baselineRenderedSha256:record.baselineRenderedSha256,sourceKey:record.sourceIdentity.key}))};
 await writeFile(resolve(output,file),JSON.stringify(manifest,null,2)+'\n');
 assignments.push({id,file,count:entries.length});
}
const locals=records.filter(record=>record.family==='area-local');
const localChunkSize=Math.ceil(locals.length/6);
for(let worker=0;worker<6;worker++){
 const start=worker*localChunkSize,entries=locals.slice(start,start+localChunkSize);
 await assignment(`local-${worker+1}`,entries,{start,end:start+entries.length-1});
}
await assignment('services-and-directories',records.filter(record=>['service','service-index','area-state','area-index'].includes(record.family)));
await assignment('guides',records.filter(record=>['guide','guide-index'].includes(record.family)));
await writeFile(resolve(output,'pages.jsonl'),records.map(record=>JSON.stringify(record)).join('\n')+'\n');
await writeFile(resolve(output,'routes.txt'),records.map(record=>record.route).join('\n')+'\n');
await writeFile(resolve(output,'excluded.json'),JSON.stringify(excluded,null,2)+'\n');
const manifest={schemaVersion:1,gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),batchLimits:{maxPages:100,targetMaxRenderedWords:12000,singleOversizedPageAllowed:true},batchFormat:'Complete mainText with headings, CTA links, source identity and metrics; duplicated prose/contentBlocks/internalLinks/sourceEntry omitted only in batches and preserved in pages.jsonl.',scope:'Every rendered HTML route in /areas/, /services/, /guides/, including family indexes and state directories. Extraction is not semantic review.',renderedHtmlCount:htmlFiles.length,renderedPageRouteCount:htmlFiles.filter(file=>file.endsWith('index.html')).length,includedCount:records.length,excludedCount:excluded.length,familyCounts:Object.fromEntries([...new Set(records.map(record=>record.family))].sort(compare).map(family=>[family,records.filter(record=>record.family===family).length])),routesSha256:hash(records.map(record=>record.route).join('\n')+'\n'),baselineSetSha256:hash(records.map(record=>`${record.route} ${record.baselineRenderedSha256}`).join('\n')),extractionNotes:['Full main text retained; shared site header/footer and outside-main tools excluded.','Collapsed details and explicitly hidden main content retained and marked on blocks/links; scripts, styles, templates and SVG excluded.','Prose/block lists may nest and repeat; mainText word count avoids nested block duplication.','Sentence burden uses Intl.Segmenter on paragraphs only; word counts use Unicode letter/number tokens.','CTA hints are syntactic, not semantic; every main internal link is also retained.','sourceReferenceFiles are literal route/guide-key matches, not asserted dependency graphs.','Source identity uses the current source tree; HTML records and hashes use the current dist without rebuilding.','No previous audit scores loaded; every page still requires an independent human-first semantic assessment.'],batchReplacementNote:'The initial 29 full-record batches were replaced before semantic review began by compact word-bounded packets. Full master records and rendered hashes are retained; this is extraction packaging, not a new content baseline.',assignments,sourceHashes:Object.fromEntries(sourceTexts.map(item=>[item.path,hash(item.text)])),batches};
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,includedCount:manifest.includedCount,excludedCount:manifest.excludedCount,familyCounts:manifest.familyCounts,batches:batches.length,baselineSetSha256:manifest.baselineSetSha256},null,2));
