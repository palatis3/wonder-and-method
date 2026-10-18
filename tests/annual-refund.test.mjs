import test from 'node:test';
import assert from 'node:assert/strict';
import {annualSettlement} from '../scripts/annual-refund.mjs';
const fixture={annual_paid_cents:456000,completed_cycles:0,service_started:false,current_cycle_unearned_cents:0,accepted_delayed_work_cents:0};
test('pre-start cancellation returns the whole annual service payment without fees',()=>{
 const result=annualSettlement(fixture);assert.equal(result.undisputed_service_refund_cents,456000);assert.equal(result.processing_fee_retained_cents,0);assert.equal(result.discount_clawback_cents,0);
});
test('four completed cycles return eight discounted cycles and separately itemize studio failure',()=>{
 const result=annualSettlement({...fixture,completed_cycles:4,service_started:true,current_cycle_unearned_cents:12000,accepted_delayed_work_cents:8000});
 assert.equal(result.future_whole_cycle_refund_cents,304000);assert.equal(result.undisputed_service_refund_cents,316000);assert.equal(result.accepted_delayed_work_cents,8000);assert.equal(result.automatic_refund,false);
});
test('ambiguous amounts and double counting cannot produce a settlement',()=>{
 for(const change of [{completed_cycles:4},{completed_cycles:13,service_started:true},{current_cycle_unearned_cents:1},{annual_paid_cents:456001},{accepted_delayed_work_cents:-1},{current_cycle_unearned_cents:null}])assert.throws(()=>annualSettlement({...fixture,...change}));
});
test('current-cycle reconciliation cannot consume several completed cycles',()=>{
 const four={...fixture,completed_cycles:4,service_started:true};
 assert.equal(annualSettlement({...four,current_cycle_unearned_cents:38000}).undisputed_service_refund_cents,342000);
 assert.throws(()=>annualSettlement({...four,current_cycle_unearned_cents:38001}),/one completed/);
 assert.throws(()=>annualSettlement({...four,current_cycle_unearned_cents:152000}),/one completed/);
});
