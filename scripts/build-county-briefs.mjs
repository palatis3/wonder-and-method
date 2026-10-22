import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import {pennsylvaniaBuyerTasks} from '../src/pennsylvania-content.mjs';
import {ohioBuyerTasks} from '../src/ohio-content.mjs';
import {northeastBuyerTasks} from '../src/northeast-content.mjs';
import {serviceStateInfo} from '../src/assets/service-state-info.js';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';

export function countyBriefs(){
 const records=[];
 for(const [state,tasks] of [['new-york',countyBuyerTasks],['pennsylvania',pennsylvaniaBuyerTasks],['ohio',ohioBuyerTasks],...Object.entries(northeastBuyerTasks)]){
  for(const [slug,task] of Object.entries(tasks)){
   const areaType=state==='connecticut'?'Planning Region':state==='maryland'&&slug==='baltimore-city'?'City':'County';
   const prefix=state==='new-york'?'':state+'-',legacyPath='/areas/'+(state==='new-york'?'':state+'/')+slug+(areaType==='City'?'':'-'+areaType.toLowerCase().replace(' ','-'))+'/',path=retiredCountyRoutes[legacyPath]||legacyPath;
   const stateName=serviceStateInfo.find(item=>item.id===state).name;
   const title=task.name||slug.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
   records.push({file:prefix+slug+'.txt',path,text:[
    `WONDER AND METHOD — ${title.toUpperCase()} ${areaType.toUpperCase()}, ${stateName.toUpperCase()} WEBSITE PLANNING WORKSHEET`,
    'Reviewed: October 22, 2026','https://wonderandmethod.com'+path,'','General website planning with a fictional example. These principles can apply in many places; this is not a method unique to this area or a record of local client work.','',task.title,'',
    'EXAMPLE (MADE UP)',task.scenario,task.decision,'',
    'YOUR BUSINESS','Business name and website, if you have one:','Where you work or meet customers:','Jobs or appointments you accept:','Where you travel and any exceptions:','',
    'QUESTIONS TO ANSWER',...task.questions.flatMap((question,index)=>[`${index+1}. ${question}`,'Your answer:','']),
    'WHAT YOUR WEBSITE COULD EXPLAIN',task.output,'The change you want, including any limits:','',
    'TRY IT AS A CUSTOMER',task.check,'Your own task to try:','Could you complete it? Yes / No / Not checked','What happened, and what needs fixing?','Who checked it, and when?','',
    'KEEP IT ACCURATE','Who confirmed the facts?','Who will update changing details?','When should dated information be reviewed or removed?','What questions or account access are still unresolved?','',
    'Use this worksheet to plan; it is not a booking. Agree the work, outside costs, dates and responsibilities in writing. Do not include passwords or sensitive personal information. Official place sources are linked from the area directory.',''
   ].join('\n')});
  }
 }
 if(records.length!==333||new Set(records.map(item=>item.file)).size!==333)throw Error('Area worksheet coverage changed');
 return records;
}
export async function writeCountyBriefs(output){
 const folder=resolve(output,'assets/county-briefs');await mkdir(folder,{recursive:true});
 for(const record of countyBriefs())await writeFile(resolve(folder,record.file),record.text);
}
