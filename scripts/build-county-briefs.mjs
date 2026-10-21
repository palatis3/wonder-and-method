import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import {pennsylvaniaBuyerTasks} from '../src/pennsylvania-content.mjs';
import {ohioBuyerTasks} from '../src/ohio-content.mjs';

export function countyBriefs(){
 const records=[];
 for(const [state,tasks] of [['new-york',countyBuyerTasks],['pennsylvania',pennsylvaniaBuyerTasks],['ohio',ohioBuyerTasks]]){
  for(const [slug,task] of Object.entries(tasks)){
   const prefix=state==='new-york'?'':state+'-',path='/areas/'+(state==='new-york'?'':state+'/')+slug+'-county/';
   const stateName={'new-york':'New York',pennsylvania:'Pennsylvania',ohio:'Ohio'}[state];
   const title=task.name||slug.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
   records.push({file:prefix+slug+'.txt',path,text:[
    `WONDER AND METHOD — ${title.toUpperCase()} COUNTY, ${stateName.toUpperCase()} WEBSITE PLANNING WORKSHEET`,
    'Reviewed: October 21, 2026','https://wonderandmethod.com'+path,'',task.title,'',
    'EXAMPLE (MADE UP)',task.scenario,task.decision,'',
    'YOUR BUSINESS','Business name and website, if you have one:','Where you work or meet customers:','Jobs or appointments you accept:','Where you travel and any exceptions:','',
    'QUESTIONS TO ANSWER',...task.questions.flatMap((question,index)=>[`${index+1}. ${question}`,'Your answer:','']),
    'WHAT YOUR WEBSITE COULD EXPLAIN',task.output,'The change you want, including any limits:','',
    'TRY IT AS A CUSTOMER',task.check,'Your own task to try:','Could you complete it? Yes / No / Not checked','What happened, and what needs fixing?','Who checked it, and when?','',
    'KEEP IT ACCURATE','Who confirmed the facts?','Who will update changing details?','When should dated information be reviewed or removed?','What questions or account access are still unresolved?','',
    'Use this worksheet to plan; it is not a booking. Agree the work, outside costs, dates and responsibilities in writing. Do not include passwords or sensitive personal information. Official place sources are linked from the county page.',''
   ].join('\n')});
  }
 }
 if(records.length!==217||new Set(records.map(item=>item.file)).size!==217)throw Error('County worksheet coverage changed');
 return records;
}
export async function writeCountyBriefs(output){
 const folder=resolve(output,'assets/county-briefs');await mkdir(folder,{recursive:true});
 for(const record of countyBriefs())await writeFile(resolve(folder,record.file),record.text);
}
