import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inquiryChoices,inquiryContextFields} from '../src/shared.mjs';

export const pipelineStages=['received','qualified','proposal','won','lost'];
const services=new Set(inquiryChoices.map(([id])=>id));
const sources=new Set(['unknown',...inquiryContextFields.found_via.options.map(([id])=>id)]);
const textKeys=['economic_buyer_id','inquiry_reference','organization_site','buyer_job','owner','next_action','next_action_date','outcome_reason','scope_link','receipt_link','last_substantive_contact_at','inquiry_retention_due_at','retention_exception'];
const root=resolve(import.meta.dirname,'..');
const boardPath=resolve(root,'.runtime/operations/weekly-board.json');

export function updateLead(board,input,now=new Date().toISOString()){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Supply one lead object.');
 const allowed=new Set([...textKeys,'stage','appropriate_offer','source','source_confidence','quoted_amount']);
 for(const key of Object.keys(input))if(!allowed.has(key))throw Error(`Unsupported lead field: ${key}`);
 for(const key of textKeys)if(input[key]!=null&&(typeof input[key]!=='string'||input[key].length>1500))throw Error(`Invalid ${key}`);
 if(!input.economic_buyer_id?.trim()||!input.inquiry_reference?.trim())throw Error('A buyer ID and saved inquiry reference are required.');
 const copy=structuredClone(board);copy.rows??=[];
 const existing=copy.rows.find(row=>row.economic_buyer_id===input.economic_buyer_id);
 if(copy.rows.some(row=>row.inquiry_reference===input.inquiry_reference&&row!==existing))throw Error('This inquiry reference is already linked to another buyer.');
 if(existing&&existing.inquiry_reference!==input.inquiry_reference)throw Error('Keep the existing buyer reference; link related inquiries in the private job record.');
 const row={...(existing||copy.row_template||{}),stage:'received',appropriate_offer:'unsure',source:'unknown',...(existing||{}),...input};
 if(!pipelineStages.includes(row.stage))throw Error('Unknown pipeline stage.');
 if(!services.has(row.appropriate_offer)||!sources.has(row.source))throw Error('Use a known service and stated-source category.');
 if(row.quoted_amount!=null&&(!Number.isFinite(row.quoted_amount)||row.quoted_amount<0))throw Error('Quoted amount must be a nonnegative number or null.');
 if(row.stage==='qualified'&&!row.buyer_job?.trim())throw Error('Record the actual buyer job before qualification.');
 if(['proposal','won'].includes(row.stage)&&!row.scope_link?.trim())throw Error('Record a private proposed or accepted scope link.');
 if(row.stage==='won'&&!row.receipt_link?.trim())throw Error('A won lead needs the payment/booking evidence link.');
 if(row.stage==='lost'&&!row.outcome_reason?.trim())throw Error('Record the known outcome reason, or state that it is unknown.');
 for(const key of ['next_action_date','last_substantive_contact_at','inquiry_retention_due_at'])if(row[key]&&!Number.isFinite(Date.parse(row[key])))throw Error(`Invalid ${key}`);
 if(!existing)row.stage_history=[{stage:row.stage,at:now}];
 else if(existing.stage!==row.stage)row.stage_history=[...(existing.stage_history||[]),{stage:row.stage,at:now}];
 row.updated_at=now;
 if(existing)copy.rows[copy.rows.indexOf(existing)]=row;else copy.rows.push(row);
 copy.review_date=now.slice(0,10);copy.status='Private working business board; counts are recorded lead stages, not website conversion rates';
 return copy;
}

export function pipelineReport(board,now=new Date().toISOString()){
 const rows=(board.rows||[]).filter(row=>pipelineStages.includes(row.stage));
 const count=items=>Object.fromEntries(pipelineStages.map(stage=>[stage,items.filter(row=>row.stage===stage).length]));
 const group=key=>Object.fromEntries([...new Set(rows.map(row=>row[key]||'unknown'))].sort().map(value=>[value,count(rows.filter(row=>(row[key]||'unknown')===value))]));
 const unsuccessful=rows.filter(row=>row.stage!=='won');
 const missingRetention=unsuccessful.filter(row=>!row.inquiry_retention_due_at).length;
 return {as_of:now,total_recorded_buyers:rows.length,current_stages:count(rows),by_service:group('appropriate_offer'),by_stated_source:group('source'),overdue_next_actions:rows.filter(row=>!['won','lost'].includes(row.stage)&&row.next_action_date&&Date.parse(row.next_action_date)<Date.parse(now.slice(0,10))).length,retention_reviews_due:unsuccessful.filter(row=>!row.inquiry_retention_due_at||Date.parse(row.inquiry_retention_due_at)<=Date.parse(now)).length,retention_dates_missing:missingRetention,limits:'Current stage counts only; sources are stated, not attributed. No unique-visitor conversion rate, revenue recognition or client result is inferred. Missing retention dates need review, as do expired dates. Retention flags require review across D1, Gmail and private exports.'};
}

async function main(){
 const [command,inputPath]=process.argv.slice(2);
 if(!['init','update','report'].includes(command))throw Error('Usage: node scripts/lead-pipeline.mjs init | update PRIVATE_JSON_FILE | report');
 let board;try{board=JSON.parse(await readFile(boardPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;if(command!=='init')throw Error('Initialize the private board first.');board=JSON.parse(await readFile(resolve(root,'operations/weekly-board.json'),'utf8'));}
 if(command==='report'){console.log(JSON.stringify(pipelineReport(board),null,2));return;}
 if(command==='update'){if(!inputPath)throw Error('Supply a private JSON input file.');board=updateLead(board,JSON.parse(await readFile(resolve(inputPath),'utf8')));}
 await mkdir(dirname(boardPath),{recursive:true});const temp=boardPath+'.tmp';await writeFile(temp,JSON.stringify(board,null,2)+'\n',{mode:0o600});await rename(temp,boardPath);
 console.log(command==='init'?'Private board ready. Existing rows preserved.':'Private board updated. No email sent.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
