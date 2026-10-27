import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseFragment} from 'parse5';
import locations from '../../src/location-service-data.json' with {type:'json'};
import rawOffers from '../../config/offers.json' with {type:'json'};
import {normalizeOfferCatalog} from '../../src/offer-catalog.mjs';
import {locationServicePage} from '../../src/location-service-pages.mjs';
import {serviceFaqSection} from '../../src/service-faqs.mjs';
const [batch,startText,endText,partitionText,routeListPath]=process.argv.slice(2),start=Number(startText),end=Number(endText);
const selectedPartitions=partitionText?partitionText.split(',').map(Number):[1,2,3,4,5,6];
if(selectedPartitions.some(value=>!Number.isInteger(value)||value<1||value>6))throw Error('Invalid partition selection');
if(!/^[a-z][a-z0-9-]+$/.test(batch||'')||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start)throw Error('Expected batch-id start-index end-index inclusive');
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'output/human-quality-20261027/after-review',batch);
const requestedRoutes=routeListPath?new Set(JSON.parse(await readFile(resolve(root,routeListPath),'utf8'))):null;
await mkdir(out,{recursive:true});
const sha=text=>createHash('sha256').update(text).digest('hex');
const blocks=new Set(['p','li','dt','dd','h1','h2','h3','h4','summary','caption','th','td','div','section','article','header','nav','ul','ol','dl','tr','table','br']);
const textOf=node=>['script','style','svg','template'].includes(node.tagName)?'':node.nodeName==='#text'?node.value:((text)=>blocks.has(node.tagName)?'\n'+text+'\n':text)((node.childNodes||[]).map(textOf).join(''));
const plain=html=>textOf(parseFragment(html)).split(/\n+/).map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
const byPath=new Map(locations.map(entry=>[entry.path,entry])),offers=normalizeOfferCatalog(rawOffers);
const selected=[],allDrafts=new Map(),excluded=[];
for(let partition=1;partition<=6;partition++){
 const assignment=JSON.parse(await readFile(resolve(root,`output/human-quality-20261027/inventory/assignments/local-${partition}.json`),'utf8'));
 const drafts=(await readFile(resolve(import.meta.dirname,`drafts/local-${partition}.jsonl`),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
 drafts.forEach(draft=>allDrafts.set(draft.route,draft));
 if(selectedPartitions.includes(partition))for(let index=start;index<=Math.min(end,assignment.routes.length-1);index++){
  const item=assignment.routes[index];
  if(requestedRoutes&&!requestedRoutes.has(item.route))continue;
  if(item.route==='/areas/erie-county/'){excluded.push({route:item.route,partition,index,reason:'Custom page: root must review its actual renderer separately.'});continue;}
  selected.push({...item,partition,index,siblingRoute:assignment.routes[index+1]?.route||assignment.routes[index-1]?.route});
 }
}
if(requestedRoutes)for(const route of requestedRoutes)if(!selected.some(item=>item.route===route)&&!excluded.some(item=>item.route===route))throw Error('Requested route not in selected partitions/range: '+route);
const selectedPaths=new Set(selected.map(item=>item.route)),baselines=new Map();
for await(const line of createInterface({input:createReadStream(resolve(root,'output/human-quality-20261027/inventory/pages.jsonl')),crlfDelay:Infinity})){
 const item=JSON.parse(line);if(selectedPaths.has(item.route))baselines.set(item.route,item);
}
function candidate(draft){
 const entry=byPath.get(draft?.route);if(!entry)throw Error('Special local route requires its own final renderer: '+draft?.route);
 let {body}=locationServicePage(entry,offers,{brief:draft});
 const faq=serviceFaqSection(entry.path,offers),before='<section class="section county-section" id="your-brief">';
 if(faq)body=body.includes(before)?body.replace(before,faq+before):body+faq;
 return body;
}
const records=[];
for(const item of selected){
 const draft=allDrafts.get(item.route),baseline=baselines.get(item.route);
 if(!draft||!baseline||draft.inputHash!==baseline.baselineRenderedSha256)throw Error('Missing or stale draft '+item.route);
 const html=candidate(draft),sibling=allDrafts.get(item.siblingRoute);
 if(!sibling)throw Error('Missing drafted sibling '+item.siblingRoute);
 records.push({route:item.route,partition:item.partition,assignmentIndex:item.index,baselineRenderedSha256:baseline.baselineRenderedSha256,baselineMainText:baseline.mainText,draftSha256:sha(JSON.stringify(draft)),draft,candidateMainText:plain(html),candidateBodySha256:sha(html),sourceEntry:byPath.get(item.route),nearestSibling:{route:sibling.route,draftSha256:sha(JSON.stringify(sibling)),draft:sibling},limits:'Candidate main body includes all prose, source disclosures and project FAQs. Site chrome and unchanged breadcrumb are excluded. This is a staged rendering, not a published page or visual signoff.'});
}
const packets=[],routes=[];
for(let i=0;i<records.length;i+=5){
 const chunk=records.slice(i,i+5),file=`packet-${String(packets.length+1).padStart(3,'0')}.jsonl`,text=chunk.map(item=>JSON.stringify(item)).join('\n')+'\n';
 await writeFile(resolve(out,file),text);packets.push({file,count:chunk.length,sha256:sha(text)});routes.push(...chunk.map(item=>({route:item.route,partition:item.partition,assignmentIndex:item.assignmentIndex,packet:file,draftSha256:item.draftSha256,candidateBodySha256:item.candidateBodySha256})));
}
const manifest={batch,start,end,count:records.length,packets,routes,rendererFiles:await Promise.all(['src/location-service-pages.mjs','src/human-location-brief.mjs','src/service-faqs.mjs','src/service-faqs.json','config/offers.json'].map(async file=>({file,sha256:sha(await readFile(resolve(root,file)))})))};
manifest.selectedPartitions=selectedPartitions;manifest.excluded=excluded;
if(requestedRoutes)manifest.requestedRoutes=[...requestedRoutes];
await writeFile(resolve(out,'assignment.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({batch,count:records.length,packets:packets.length,manifest:resolve(out,'assignment.json')}));
