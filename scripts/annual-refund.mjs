import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Itemized planning only. This never reads a customer or calls a payment provider.
export function annualSettlement(input){
 const {annual_paid_cents:paid,completed_cycles:completed,service_started:started,current_cycle_unearned_cents:current,accepted_delayed_work_cents:owed}=input;
 if(!Number.isSafeInteger(paid)||paid<=0||paid%12!==0)throw Error('Supply the accepted twelve-cycle service payment in cents, divisible by twelve.');
 if(typeof started!=='boolean'||!Number.isInteger(completed)||completed<0||completed>12||(!started&&completed!==0))throw Error('Supply a valid started state and completed-cycle count at the effective service end.');
 if(![current,owed].every(x=>Number.isSafeInteger(x)&&x>=0)||current>(completed>0?paid/12:0))throw Error('Current-cycle unearned amount must fit within one completed discounted cycle; delayed work must be nonnegative.');
 const future=started?(12-completed)*(paid/12):paid;
 return {kind:'Local settlement calculation; not a provider refund',annual_paid_cents:paid,completed_cycles:completed,discounted_cycle_cents:paid/12,future_whole_cycle_refund_cents:future,current_cycle_refund_cents:current,undisputed_service_refund_cents:future+current,processing_fee_retained_cents:0,discount_clawback_cents:0,accepted_delayed_work_cents:owed,delayed_work_handling:'Still owed separately; do not count twice in the refund. Agree fulfillment, substitute or an additional reconciled refund.',refund_deadline:'Initiate within ten business days of effective service end, or pre-start cancellation confirmation. Record the actual dated deadline and applicable holidays in the job receipt.',automatic_refund:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(annualSettlement(JSON.parse(await readFile(resolve(process.argv[2]),'utf8'))),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
