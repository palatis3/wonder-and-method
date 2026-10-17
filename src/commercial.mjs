export function quotedOffer(offers,id,billing='monthly'){
 if(offers.plans[id]){
  if(!['monthly','annual'].includes(billing))throw Error('Choose monthly or annual billing.');
  const p=offers.plans[id],price=billing==='annual'?p.annual.upfront_price:p.monthly_price;
  return {...p,public_price:price,payment_schedule:[{event:billing==='annual'?'after fit and written twelve-cycle scope/dates, before service starts':'after fit and written first-cycle scope/dates, before service starts',percent:100,amount:price}],exclusions:offers.monthly_terms.excluded};
 }
 const p=offers[id]||(id==='audit_fix_sprint'?offers.audit_sprint:id==='website_baseline'?offers.baseline:null);
 if(!p)throw Error('Choose a current build, monthly plan, Sprint or baseline.');
 if(billing==='annual')throw Error('Annual billing is only available for the three ongoing plans.');
 return {...p,public_price:p.public_price??p.one_time_price,exclusions:p.exclusions||[offers.audit_sprint.boundaries,offers.one_off_terms.extra_costs]};
}
