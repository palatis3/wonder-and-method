import {quotedOffer} from '../src/commercial.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(import.meta.dirname,'..');
export async function draftScope(offerId,clientId,{billing='monthly'}={}){
 const offers=JSON.parse(await readFile(resolve(root,'config/offers.json'),'utf8'));
 if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(clientId))throw new Error('Use a simple lowercase client ID, without personal information.');
 const offer=quotedOffer(offers,offerId,billing),scope=JSON.parse(await readFile(resolve(root,'operations/templates/accepted-scope.json'),'utf8'));
 const commercialSnapshot={version:offers.version,offer_id:offerId,billing,offer,provider_policy:offers.provider_policy,ownership_and_billing:offers.ownership_and_billing,...(Object.hasOwn(offers.plans,offerId)?{monthly_terms:offers.monthly_terms,...(billing==='annual'?{annual_terms:offers.annual_terms}:{}),priority_menu:offer.priorities?offers.priority_menu:[]}:{one_off_terms:offers.one_off_terms})};
 if(!offerId.endsWith('_site')){
  const recurring=Object.hasOwn(offers.plans,offerId);
  const serviceTerms=recurring?{
   included_revisions:offer.priorities?'One consolidated refinement and QA per agreed priority; '+offer.priorities+' agreed '+(offer.priorities===1?'priority':'priorities')+' per service cycle.':'One related small-change batch per service cycle within its agreed affected area.',
   defect_window:offers.monthly_terms.queue+' '+offers.monthly_terms.rollover,
   schedule:{booked_start:null,input_due:null,cycle_review_window:null,service_end:null},
   paid_work_rights:offers.monthly_terms.exit,
   cancellation_reconciliation:[offers.monthly_terms.renewal,offers.monthly_terms.rollover,...(billing==='annual'?[offers.annual_terms.cancellation,offers.annual_terms.refund_timing,offers.annual_terms.build_rights]:[]),offers.monthly_terms.exit].join(' ')
  }:{
   included_revisions:offer.refinement||offers.one_off_terms.acceptance,
   defect_window:offers.one_off_terms.correction,
   schedule:{booked_start:null,input_due:null,completion_review_window:null,written_completion_acceptance:null,correction_end:null},
   acceptance_tests:[offer.acceptance,offers.one_off_terms.acceptance],
   paid_work_rights:offers.one_off_terms.ownership,
   cancellation_reconciliation:offers.one_off_terms.remedy
  };
  return {...scope,...serviceTerms,status:'DRAFT — not accepted, booked, invoiced or paid',client_id:clientId,version:1,offer_id:offerId,billing_option:recurring?billing:'one_off',fixed_price:offer.public_price,commercial_source:'config/offers.json',commercial_version:offers.version,commercial_snapshot:commercialSnapshot,commercial_boundaries:recurring?{deliverables:offer.deliverables,advisor:offer.advisor,priority_menu:offer.priorities?offers.priority_menu:[],monthly_terms:offers.monthly_terms,...(billing==='annual'?{annual_price:offer.annual,annual_terms:offers.annual_terms,enrollment_gate:offers.annual_enrollment_gate}:{}),baseline:{price:offers.baseline.one_time_price,waiver_rule:offers.baseline.duplicate_rule,status:'Confirm separately before booking'}}:{scope:offer.scope,acceptance:offer.acceptance,terms:offers.one_off_terms,baseline_rule:offer.baseline_rule||offer.duplicate_rule},service_period:recurring?{start:null,end:null,timezone:null,cycles:billing==='annual'?12:1,renewal:billing==='annual'?'Manual written confirmation only; 30-day reminder':'Exact next renewal and cancellation route required'}:null,milestones:offer.payment_schedule.map(x=>({...x,due_date:null,approval_reference:null,invoice_system_reference:null,payment_confirmed:false})),exclusions:offer.exclusions,external_costs:[],accepted_at:null};}
 scope.acceptance_tests=[...(offer.launch_acceptance||[]),offer.acceptance];
 if(!Array.isArray(offer.exclusions)||!offer.exclusions.length)throw new Error('Commercial exclusions require review before drafting a quote.');
 return {...scope,status:'DRAFT — not accepted, booked, invoiced or paid',client_id:clientId,version:1,offer_id:offerId,fixed_price:offer.public_price,commercial_source:'config/offers.json',commercial_version:offers.version,commercial_snapshot:commercialSnapshot,commercial_boundaries:{purpose:offer.purpose,page_scope:offer.page_scope,included_pages:offer.included_pages,copy:offer.copy,creative:offer.creative,functionality:offer.functionality,seo_foundation:offer.seo_foundation,platform_fit:offer.platform_fit,policy:offer.policy_page,form:offer.form_limit,redirects:offer.redirect_limit,modules:offer.modules,creative_assets:offer.creative_assets,training:offer.training,search_followup:offer.followup_summary,followup_terms:offer.search_followup_terms,provider_policy:offers.provider_policy,launch_foundations:offer.launch_foundations,launch_acceptance:offer.launch_acceptance,account_setup:offer.account_setup,project_record:offer.project_record,delivery_model:offer.delivery_model,editing_mode:offer.editing_mode,initial_launch_count:offer.initial_launch_count,external_connection_limit:offer.external_connection_limit,training_minutes:offer.training_minutes,handoff:offer.handoff},milestones:offer.payment_schedule.map(x=>({...x,due_date:null,approval_reference:null,invoice_system_reference:null,payment_confirmed:false})),exclusions:offer.exclusions,external_costs:[],accepted_at:null};
}
async function main(){const [id,offer]=process.argv.slice(2),scope=await draftScope(offer,id,{billing:process.argv.includes('--annual')?'annual':'monthly'});const dir=resolve(root,'operations/jobs',id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'accepted-scope.json'),JSON.stringify(scope,null,2),{flag:'wx'});await writeFile(resolve(dir,'cumulative-receipt.json'),await readFile(resolve(root,'operations/templates/cumulative-receipt.json')),{flag:'wx'});console.log(`Draft scope and receipt created for ${id}. Complete facts, costs, calendar and written acceptance; no booking or invoice was created.`);}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
