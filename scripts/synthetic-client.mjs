import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {draftScope} from './create-job.mjs';
import {rehearse} from './operations.mjs';
const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'operations/synthetic/example-client');await mkdir(folder,{recursive:true});
const scope=await draftScope('focused_site','synthetic-service-studio');
scope.status='SYNTHETIC REHEARSAL — not a real client or accepted agreement';
Object.assign(scope,{named_approver:'Synthetic Approver',buyer_job:'Help visitors understand one service and request a fit conversation.',audience:'Synthetic service buyers',primary_action:'Send an inquiry',service_area:'Synthetic single primary market',editing_choice:'Technically capable editor',technical_editor_or_separate_cms_scope:'Synthetic technical editor; no CMS',exact_routes:['/','/service/','/contact/'],schedule:{booked_start:'2026-10-19',input_due:'2026-10-16',design_review_window:'2026-10-30 through 2026-11-05',staging_review_window:'2026-11-16 through 2026-11-20',target_launch:'2026-11-23',correction_end:'2026-12-23'}});
scope.milestones.forEach((m,i)=>{m.due_date=['2026-10-19','2026-11-05','2026-11-20'][i];m.approval_reference=['SYNTHETIC booking acceptance','SYNTHETIC written design acceptance','SYNTHETIC written staging acceptance'][i];m.invoice_system_reference=`SYNTHETIC-INV-00${i+1}`;m.payment_confirmed=false;});
scope.project_fact_sheet={facts:['Synthetic business offers one service; no real organization facts used.'],source_ids:['synthetic-fixture'],rights:['Original text only; no client media'],input_owners_and_due_dates:[{owner:'Synthetic Approver',due:'2026-10-16'}]};
scope.copy_form_redirect_media_limits={marketing_pages:3,copy_words:1200,privacy_text_source:'SYNTHETIC supplied text',form_fields:6,form_destination:'SYNTHETIC recipient — not an inbox',confirmation_state:1,supplied_redirect_pairs:[],hero_and_fallbacks:'Focused code-native composition; no bespoke media promised'};
scope.acceptance_tests=['Exact named page/content/scope checks','Six-field synthetic inquiry and failure states','Mobile/keyboard/reflow checks','Synthetic rollback and paid-source handoff'];
scope.external_costs=[{required:true,provider:'SYNTHETIC provider placeholder',owner:'Synthetic Client',payer:'Synthetic Client',setup_price:null,renewal_amount:null,renewal_date:null,status:'Unresolved; this sample cannot be signed or booked'}];
const events=[
 ['2026-10-14','Fit','Record the buyer job, static editing fit and approver.'],
 ['2026-10-16','Quote and book','Prepare scope and 50/30/20 invoice drafts. Do not book while mandatory costs or real payment are unresolved.'],
 ['2026-10-30','Design and build','Record one consolidated design list against approved direction.'],
 ['2026-11-06','Scope change','Requested fourth existing-pattern page: $850 only after written fee/acceptance/date-effect approval. Not automatically added to the build.'],
 ['2026-11-20','Approve and launch','Synthetic version acceptance and QA. Actual client-account/inbox checks remain unperformed.'],
 ['2026-11-24','Incident','Simulated form outage: verify, notify draft, route, record last-good release and next update; repair separately quoted unless covered defect.'],
 ['2026-12-23','Correct and hand over','Record correction tail, source/licenses/account/export checklist and outstanding obligations.'],
 ['2026-12-24','Optional service','Synthetic Care checks/edit and Search page/fix outcomes remain distinct.'],
 ['2027-01-15','Renewal pause','No approved useful Search task: pause next invoice; if charged, customer chooses unused-cycle refund or credit.'],
 ['2027-01-18','Cancellation','Stop next renewal before the exact timestamp. Preserve paid site/access, reconcile earned work, deliver existing paid materials within five business days, then remove delegated access.']
];
const receipt={status:'SYNTHETIC REHEARSAL — narrative decisions and test billing drafts, no actual sale/payment/email',client_id:scope.client_id,accepted_scope_reference:'accepted-scope.json (unaccepted synthetic sample)',entries:events.map(([date,type,note],i)=>({id:`SYN-${i+1}`,date,type,note,evidence_type:'simulated decision',actual_founder_hours:null})),test_billing:scope.milestones.map(m=>({invoice:m.invoice_system_reference,amount:m.amount,trigger:m.event,mode:'draft only',sent:false,charged:false})),decisions:rehearse(),live_evidence:'None. Local code tests are recorded separately in root evidence/.'};
await writeFile(resolve(folder,'accepted-scope.json'),JSON.stringify(scope,null,2));await writeFile(resolve(folder,'cumulative-receipt.json'),JSON.stringify(receipt,null,2));
await writeFile(resolve(folder,'weekly-board-row.json'),JSON.stringify({status:'SYNTHETIC ONLY',client_id:scope.client_id,phase:'Correct and hand over',owner:'Synthetic Founder',next_action:'Resolve remaining handoff and service exit checklist',next_action_date:'2027-01-18',blocker:'Not real work; mandatory bills, account and acceptance evidence unresolved',accepted_scope:'accepted-scope.json',receipt:'cumulative-receipt.json',booked_hours:null,actual_hours:null,renewal:null},null,2));
console.log('Synthetic client scope, receipt, board row and unsent milestone invoice examples written. No real transactions or messages.');
