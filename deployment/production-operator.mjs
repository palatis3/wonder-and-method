import {mkdir,writeFile,readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readProductionCredentials} from './production-credentials.mjs';
import {inquiryChoices} from '../src/shared.mjs';
import {inquiryResolutionInput} from './inquiry-maintenance.mjs';
import {serviceStateInfo} from '../src/assets/service-state-info.js';
import {countyMeasurementCatalog,retiredMeasurementCatalog,measurementTypeTotals} from './measurement-catalog.mjs';
import {validateDeletionPlan} from './inquiry-deletion-batch.mjs';

const root=resolve(import.meta.dirname,'..');
const origin='https://wonderandmethod.com';
const referencePattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

async function privateJson(workspace,path,maxBytes){
 const file=await realpath(resolve(workspace,path)),privateRoot=await realpath(resolve(workspace,'.runtime')),inside=relative(privateRoot,file);
 const actualRoot=await realpath(workspace);
 if(relative(actualRoot,privateRoot)!=='.runtime'||!inside||inside==='..'||inside.startsWith('..'+sep)||isAbsolute(inside))throw Error('Batch files must stay inside the private .runtime directory without redirects.');
 const bytes=await readFile(file);if(bytes.length>maxBytes)throw Error('Private batch file is too large.');
 try{return JSON.parse(bytes);}catch{throw Error('Private batch file must contain JSON.');}
}

export async function productionOperator(args,{workspace=root,fetchImpl=fetch,credentials=readProductionCredentials,now=()=>new Date()}={}){
 const [action,label,confirmation,...extra]=args;
 if(extra.length!==(action==='followup'?1:action==='resolve'?2:0)||!['status','export','retry','delete','measurement','measurement-months','deletion-plan','delete-batch','retention-preview','followup','resolve','lookup'].includes(action))throw Error('Use status; export LABEL; measurement [DAYS] [--all]; measurement-months [MONTHS]; deletion-plan LABEL PRIVATE_INPUT_FILE; delete-batch PRIVATE_PLAN_FILE DIGEST; lookup CODE; retention-preview; followup REFERENCE CONFIRM_REFERENCE FILE; resolve REFERENCE CONFIRM_REFERENCE OUTCOME EVIDENCE_REFERENCE; or retry|delete REFERENCE CONFIRM_REFERENCE.');
 if(action==='lookup'&&(confirmation||!/^WM-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/i.test(label||'')))throw Error('Lookup needs the short WM-XXXX-XXXX-XXXX code.');
 if(['status','retention-preview'].includes(action)&&(label||confirmation))throw Error('Status takes no additional arguments.');
 if(action==='export'&&(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label||'')||confirmation))throw Error('Export needs a lowercase filename label, not a path.');
 if(['retry','delete','followup','resolve'].includes(action)&&(!referencePattern.test(label||'')||confirmation!==label))throw Error('Supply the exact inquiry reference twice. Retry may send a notification; delete removes the active record; resolve records owner-reviewed handling without sending.');
 const resolution=action==='resolve'?inquiryResolutionInput({outcome:extra[0],evidence_reference:extra[1]}):null;
 if(action==='resolve'&&!resolution)throw Error('Resolution needs handled_manually, duplicate_confirmed or spam_confirmed and a nonpersonal 3–80 character evidence reference using lowercase letters, numbers, dots, hyphens or underscores.');
 const measurementDays=label==='--all'?7:Number(label||7);
 if(action==='measurement'&&((confirmation&&confirmation!=='--all')||(label==='--all'&&confirmation)||!Number.isInteger(measurementDays)||measurementDays<1||measurementDays>90))throw Error('Measurement uses measurement [DAYS] [--all]; days must be an integer from 1 to 90.');
 const measurementMonths=Number(label||24);
 if(action==='measurement-months'&&(confirmation||!Number.isInteger(measurementMonths)||measurementMonths<1||measurementMonths>24))throw Error('Monthly measurement uses measurement-months [MONTHS]; months must be an integer from 1 to 24.');
 if(action==='deletion-plan'&&(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(label||'')||!confirmation))throw Error('Deletion plan needs a lowercase filename label and private input file.');
 if(action==='delete-batch'&&(!label||!/^[a-f0-9]{64}$/.test(confirmation||'')))throw Error('Batch deletion requires a private plan file and exact reviewed digest.');
 const batchInput=action==='deletion-plan'?await privateJson(workspace,confirmation,4096):null;
 const batchPlan=action==='delete-batch'?validateDeletionPlan(await privateJson(workspace,label,40000),confirmation,now().getTime()):null;
 const {OPERATOR_TOKEN}=credentials();
 const headers={Accept:'application/json',Authorization:`Bearer ${OPERATOR_TOKEN}`};
 const request=async(path,options={})=>{
  const response=await fetchImpl(origin+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw Error(`Production operator request failed (${response.status}); no private response body printed.`);
  try{return await response.json();}catch{throw Error('Production returned an unreadable response; no private body printed.');}
 };
 if(action==='measurement')return request('/api/operator/journey-summary?days='+measurementDays);
 if(action==='measurement-months')return request('/api/operator/journey-months?months='+measurementMonths);
 if(action==='lookup')return request('/api/operator/inquiries/lookup?code='+encodeURIComponent(label));
 if(action==='retention-preview')return request('/api/operator/inquiries/retention-preview');
 if(action==='status')return {origin,...await request('/api/operator/inquiries/status')};
 if(action==='deletion-plan'){
  const plan=await request('/api/operator/inquiries/deletion-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batchInput)});
  validateDeletionPlan(plan,plan.digest,now().getTime());
  const folder=resolve(workspace,'.runtime/deletion-plans');await mkdir(folder,{recursive:true});
  if(relative(await realpath(workspace),await realpath(folder))!==['.runtime','deletion-plans'].join(sep))throw Error('Deletion plans must stay in the private .runtime/deletion-plans directory without redirects.');
  const file=resolve(folder,label+'.json');await writeFile(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
  return {file,digest:plan.digest,records:plan.records.length,reason:plan.reason,expiresAt:new Date(plan.expiresAt).toISOString(),private:true,warning:'Nothing deleted. Review every reference, current contact/client/hold status, recorded reason and working copies. Confirm this exact digest only after review; plans expire after 30 minutes.'};
 }
 if(action==='delete-batch')return request('/api/operator/inquiries/delete-batch',{method:'POST',headers:{'Content-Type':'application/json','X-Confirm-Delete-Batch':confirmation},body:JSON.stringify(batchPlan)});
 if(action==='resolve'){
  const result=await request('/api/operator/inquiries/'+label+'/resolve',{method:'POST',headers:{'X-Confirm-Resolve':label,'Content-Type':'application/json'},body:JSON.stringify(resolution)});
  return {action,reference:label,status:result.status,resolution:result.resolution,already_resolved:result.already_resolved,message:result.message};
 }
 if(action==='followup'){
  const file=await realpath(resolve(workspace,extra[0]));
  const privateRoot=await realpath(resolve(workspace,'.runtime'));
  const inside=relative(privateRoot,file);
  if(!inside||inside.startsWith('..'+sep)||inside==='..'||isAbsolute(inside))throw Error('Follow-up fields must come from a private .runtime JSON file.');
  const bytes=await readFile(file);if(bytes.length>4096)throw Error('Follow-up file is too large.');
  let data;try{data=JSON.parse(bytes);}catch{throw Error('Follow-up file must contain JSON.');}
  const result=await request('/api/operator/inquiries/'+label+'/followup',{method:'POST',headers:{'X-Confirm-Followup':label,'Content-Type':'application/json'},body:JSON.stringify(data)});
  return {action,reference:label,message:result.message};
 }
 if(action==='export'){
  const records=[],seenCursors=new Set();let cursor='';
  do{
   const data=await request('/api/operator/inquiries?after='+encodeURIComponent(cursor));
   if(!Array.isArray(data.records))throw Error('Unexpected export format.');
   records.push(...data.records);cursor=data.next_cursor;
   if(cursor&&(!referencePattern.test(cursor)||seenCursors.has(cursor)))throw Error('Invalid or repeated export cursor; export refused.');
   if(cursor)seenCursors.add(cursor);
  }while(cursor);
  const folder=resolve(workspace,'.runtime/exports');await mkdir(folder,{recursive:true});
  const actual=await realpath(folder),expectedRoot=await realpath(workspace),inside=relative(expectedRoot,actual);
  if(inside.startsWith('..'+sep)||inside==='..'||isAbsolute(inside)||inside!==['.runtime','exports'].join(sep))throw Error('Export folder must be the private .runtime/exports directory, without a redirected path.');
  const file=resolve(folder,label+'.json');
  await writeFile(file,JSON.stringify({exported_at:now().toISOString(),origin,records},null,2)+'\n',{flag:'wx',mode:0o600});
  return {exported:records.length,file,private:true,warning:'Contains private inquiry data. Keep local and apply the inquiry retention policy.'};
 }
 const isRetry=action==='retry';
 const result=await request('/api/operator/inquiries/'+label+(isRetry?'/retry':''),{method:isRetry?'POST':'DELETE',headers:{[isRetry?'X-Confirm-Retry':'X-Confirm-Delete']:label}});
 return {action,reference:label,status:result.status||null,message:result.message||null};
}

export function formatMeasurement(report,{all=false}={}){
 const groups=[['Page views',['page_view']],['Offer / contact selections',['offer_select','question_select','contact_select']],['Form starts',['request_start','question_start']],['Saved confirmations',['inquiry_saved','question_saved']],['Resource link clicks',['resource_select']],['ROI calculations',['roi_calculate']],['Email / chat actions',['email_click','chat_open']]];
 const total=(events,current)=>report.daily.filter(row=>events.includes(row.event)&&(current?row.day>=report.since:row.day<report.since)).reduce((sum,row)=>sum+Number(row.total),0);
 const comparable=report.coverage?.previousAvailable===true&&report.days<=45;
 const topSource=[...(report.bySource||[])].filter(row=>!['internal','not_recorded'].includes(row.source)).sort((a,b)=>Number(b.total)-Number(a.total))[0];
 const lines=['Approximate arrivals from outside: '+(Array.isArray(report.arrivals)?report.arrivals.reduce((sum,row)=>sum+Number(row.total),0):'not available'),`Saved-confirmation events: ${total(['inquiry_saved','question_saved'],true)}${comparable?' (previous period: '+total(['inquiry_saved','question_saved'],false)+')':' (previous period: N/A)'}`,`Largest recorded outside source: ${topSource?topSource.source+' ('+topSource.total+' page views)':'no data'}`,'',`Website events: ${report.days} days from ${report.since}`,comparable?`Compared with the preceding ${report.days} days (within 90-day retention).`:'WARNING: Previous and Change are unavailable: an equal previous period is not covered by verified retention metadata.','Metric                         Current  Previous  Change'];
 if(report.coverage)lines.splice(6,0,`Retained dates: ${report.coverage.retainedSince} through ${report.coverage.through}. Collection continuity is not verified.`);
 for(const [label,events] of groups){const current=total(events,true),previous=comparable?total(events,false):null;lines.push(label.padEnd(30)+String(current).padStart(8)+(comparable?String(previous):'N/A').padStart(10)+(comparable?String(current-previous):'N/A').padStart(8));}
 const serviceNames=Object.fromEntries(inquiryChoices),title=value=>String(value).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
 const pageLabel=page=>page==='home'?'Home':page==='404'?'Page not found':page.startsWith('checkout_')?'Checkout — '+(serviceNames[page.slice(9)]||title(page.slice(9))):page.startsWith('guides_')?'Guide — '+title(page.slice(7)):page.startsWith('areas_')?'Area — '+title(page.slice(6)):title(page);
 lines.push('','Offer interest (event counts):','Offer | Offer clicks | Question clicks | Contact clicks | Form starts | Saved | Resource clicks');
 for(const [service,label] of inquiryChoices){
  const rows=report.counts.filter(row=>row.service===service),sum=events=>rows.filter(row=>events.includes(row.event)).reduce((total,row)=>total+Number(row.total),0);
  lines.push([label,sum(['offer_select']),sum(['question_select']),sum(['contact_select']),sum(['request_start','question_start']),sum(['inquiry_saved','question_saved']),sum(['resource_select'])].join(' | '));
 }
 const pageTotals=rows=>{
  const totals=new Map();
  for(const row of rows)totals.set(row.page,(totals.get(row.page)||0)+Number(row.total));
  return [...totals].map(([page,total])=>({page,total})).sort((a,b)=>b.total-a.total||a.page.localeCompare(b.page));
 };
 const views=pageTotals(report.counts.filter(row=>row.event==='page_view'));
 const showPages=(rows,sources)=>{
  for(const row of all?rows:rows.slice(0,15)){
   const detail=sources?.get(row.page),breakdown=detail?[...detail].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([source,total])=>source+' '+total).join('; '):'';
   lines.push(`${pageLabel(row.page)}: ${row.total}${breakdown?' ('+breakdown+')':''}`);
  }
 };
 const shown=all?'all recorded pages':'top 15';
 lines.push('',`Landing pages (approximate arrivals from outside; ${shown}):`);
 if(!Array.isArray(report.arrivals))lines.push('Not available in this response.');
 else if(!report.arrivals.length)lines.push('No recorded arrivals in this period.');
 else{
  const sources=new Map();
  for(const row of report.arrivals){
   if(!sources.has(row.page))sources.set(row.page,new Map());
   const totals=sources.get(row.page);totals.set(row.source,(totals.get(row.source)||0)+Number(row.total));
  }
  showPages(pageTotals(report.arrivals),sources);
 }
 lines.push('',`Page views by page (${shown}):`);showPages(views);
 if(!all)lines.push('Use measurement DAYS --all to list every recorded page.');
 const viewsByPage=new Map(views.map(row=>[row.page,row.total]));
 lines.push('','County and equivalent-area pages (local checkout catalog; recorded page-view events):','Catalog classification reflects this checkout, not independently verified live deployment. Shared area pages count once.');
 for(const {abbreviation:state} of serviceStateInfo){
  const pages=countyMeasurementCatalog.filter(page=>page.state===state);
  if(!pages.length)continue;
  const views=pages.reduce((sum,{page})=>sum+(viewsByPage.get(page)||0),0);
  const unrecorded=pages.filter(({page})=>!viewsByPage.get(page)).length;
  lines.push(`${state}: ${pages.length} pages / ${views} views / ${unrecorded} pages with no recorded views`);
 }
 lines.push('','Retired county-page keys (historical page-view events; excluded from current catalog):');
 for(const {page} of retiredMeasurementCatalog)lines.push(`${pageLabel(page)}: ${viewsByPage.get(page)||0}`);
 lines.push('','Page types (local checkout classification; event counts):','Type | Page-view events | Other recorded events');
 for(const row of measurementTypeTotals(report.counts))lines.push(`${row.type} | ${row.pageViews} | ${row.otherEvents}`);
 lines.push('Shared guide keys are grouped as Guides; they cannot identify an individual guide. Unclassified keys are retained without guessing a current page or state. These totals are events, not unique people or conversion rates.');
 lines.push('No recorded views does not establish zero visitors; privacy choices, blockers, outages and incomplete collection affect counts.');
 lines.push('','Goals selected on contact links:');
 for(const [event,label] of [['goal_new_website','New website'],['goal_redesign','Redesign'],['goal_fix','Repair'],['goal_search','Search visibility'],['goal_care','Website care']])lines.push(`${label}: ${report.counts.filter(row=>row.event===event).reduce((sum,row)=>sum+Number(row.total),0)}`);
 lines.push('','Page-view source categories:');for(const row of report.bySource||[])lines.push(`${row.source}: ${row.total}`);
 lines.push('',report.note,'Saved confirmations are client-reported events, not a count of unique leads. Resource clicks do not prove a completed download; repeated clicks on the same resource in a page instance count once. Goals describe link selections, not identified inquiries. Use the separate lead report for real inquiry stages.');return lines.join('\n');
}

export function formatMonthlyMeasurement(report){
 const lines=[`Monthly website events: ${report.sinceMonth} through ${report.throughMonth} (UTC)`,
  `First recorded monthly event: ${report.firstRecordedAt?new Date(report.firstRecordedAt).toISOString():'none recorded'}`,
  'Prospective totals only; no daily history was backfilled. First and current months may be partial; continuity is unverified.',
  'Month | Recorded page views | Recorded saved confirmations | All recorded events'];
 const [year,month]=report.sinceMonth.split('-').map(Number);
 for(let offset=0;offset<report.months;offset++){
  const key=new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7),rows=report.counts.filter(row=>row.month===key);
  const sum=events=>rows.filter(row=>!events||events.includes(row.event)).reduce((total,row)=>total+Number(row.total),0);
  lines.push(`${key} | ${rows.some(row=>row.event==='page_view')?sum(['page_view']):'no rows'} | ${rows.some(row=>['inquiry_saved','question_saved'].includes(row.event))?sum(['inquiry_saved','question_saved']):'no rows'} | ${rows.length?sum():'no rows'}`);
 }
 lines.push('','Monthly page-view source categories:');
 for(const row of report.bySource)lines.push(`${row.month} | ${row.source} | ${row.total}`);
 lines.push('',report.note,'No rows does not mean zero visitors. Saved confirmations are browser-reported events, not unique inquiries.');
 return lines.join('\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 productionOperator(process.argv.slice(2)).then(result=>console.log(process.argv[2]==='measurement'&&Array.isArray(result.daily)?formatMeasurement(result,{all:process.argv.slice(3).includes('--all')}):process.argv[2]==='measurement-months'?formatMonthlyMeasurement(result):JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
