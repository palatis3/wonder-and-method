import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inquiryChoices,inquiryContextFields} from '../src/shared.mjs';
import {RETENTION_DAYS} from '../deployment/inquiry-maintenance.mjs';

export const pipelineStages=['received','qualified','proposal','won','lost'];
const services=new Set(inquiryChoices.map(([id])=>id));
const sources=new Set(['unknown',...inquiryContextFields.found_via.options.map(([id])=>id)]);
const textKeys=['economic_buyer_id','inquiry_reference','organization_site','buyer_job','owner','next_action','next_action_date','outcome_reason','scope_link','receipt_link','last_substantive_contact_at','inquiry_retention_due_at','retention_exception','retention_exception_review_at'];
const root=resolve(import.meta.dirname,'..');
const boardPath=resolve(root,'.runtime/operations/weekly-board.json');
const retentionMs=RETENTION_DAYS*86400_000;
function retentionState(row,now){
 const contact=Date.parse(row.last_substantive_contact_at||''),due=Date.parse(row.inquiry_retention_due_at||''),review=Date.parse(row.retention_exception_review_at||'');
 const knownContact=Number.isFinite(contact)&&contact<=now;
 const exception=Boolean(row.retention_exception?.trim())&&Number.isFinite(review)&&review>now&&review<=now+366*86400_000;
 const inconsistent=knownContact&&Number.isFinite(due)&&due>contact+retentionMs;
 return {knownContact,exception,inconsistent,reviewDue:!knownContact||(!exception&&(!Number.isFinite(due)||inconsistent||due<=now))||Boolean(row.retention_exception?.trim()&&!exception)};
}

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
 for(const key of ['next_action_date','last_substantive_contact_at','inquiry_retention_due_at','retention_exception_review_at'])if(row[key]&&!Number.isFinite(Date.parse(row[key])))throw Error(`Invalid ${key}`);
 const clock=Date.parse(now);if(!Number.isFinite(clock))throw Error('Invalid review timestamp.');
 if(row.last_substantive_contact_at&&Date.parse(row.last_substantive_contact_at)>clock)throw Error('Last substantive contact cannot be in the future.');
 const contactChanged=Object.hasOwn(input,'last_substantive_contact_at')&&input.last_substantive_contact_at!==existing?.last_substantive_contact_at;
 if(row.last_substantive_contact_at&&(!row.inquiry_retention_due_at||(contactChanged&&!Object.hasOwn(input,'inquiry_retention_due_at'))))row.inquiry_retention_due_at=new Date(Date.parse(row.last_substantive_contact_at)+retentionMs).toISOString();
 const retention=retentionState(row,clock);
 if(row.retention_exception?.trim()&&!retention.exception)throw Error('A retention exception needs a future review date within one year.');
 if(row.retention_exception_review_at&&!row.retention_exception?.trim())throw Error('A retention exception review date needs a reason.');
 if(row.stage!=='won'&&retention.inconsistent&&!retention.exception)throw Error('Retention cannot exceed 90 days after last substantive contact without a reason and future exception review date.');
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
 return {as_of:now,total_recorded_buyers:rows.length,current_stages:count(rows),by_service:group('appropriate_offer'),by_stated_source:group('source'),overdue_next_actions:rows.filter(row=>!['won','lost'].includes(row.stage)&&row.next_action_date&&Date.parse(row.next_action_date)<Date.parse(now.slice(0,10))).length,retention_reviews_due:unsuccessful.filter(row=>retentionState(row,Date.parse(now)).reviewDue).length,retention_dates_missing:missingRetention,retention_contacts_unknown:unsuccessful.filter(row=>!retentionState(row,Date.parse(now)).knownContact).length,limits:'Current stage counts only; sources are stated, not attributed. No unique-visitor conversion rate, revenue recognition or client result is inferred. Unknown contact dates, inconsistent or expired deadlines, and expired exceptions need review. Retention flags require review across D1, Gmail and private exports.'};
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
