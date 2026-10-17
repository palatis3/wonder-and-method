import {assertInvoiceMatches,digest,paymentSummary,fullyPaid} from '../src/payments.mjs';

export async function syncCatalog(client,catalog){
 await client.account();
 const existing=await client.list('/products'),result=[];
 for(const item of catalog){
  const matches=existing.filter(p=>p.metadata?.wm_offer===item.id&&p.metadata?.wm_version===item.version);
  if(matches.length>1)throw Error('Duplicate versioned Stripe product; review in Dashboard.');
  const product=matches[0]||await client.request('/products',{method:'POST',idempotencyKey:`wm-product-${digest([item.id,item.version])}`,data:{name:item.name,description:'Payment follows an agreed written scope and dated service or project milestone.',metadata:{wm_offer:item.id,wm_version:item.version}}});
  if(product.active!==true)throw Error('Current product is inactive; review before creating prices.');
  const prices=[];
  for(const price of item.prices){
   const found=await client.list('/prices?lookup_keys[]='+encodeURIComponent(price.lookup_key));
   if(found.length>1)throw Error('Duplicate Stripe price lookup key.');
   const saved=found[0]||await client.request('/prices',{method:'POST',idempotencyKey:price.lookup_key,data:{product:product.id,currency:item.currency,unit_amount:price.amount,nickname:price.label,lookup_key:price.lookup_key,metadata:{wm_offer:item.id,wm_version:item.version,wm_payment:price.key}}});
   if(saved.product!==product.id||saved.currency!==item.currency||saved.unit_amount!==price.amount||saved.type!=='one_time'||!saved.active)throw Error('Stripe catalog price mismatch; no replacement performed.');
   prices.push({key:price.key,price_id:saved.id,amount:price.amount,currency:item.currency});
  }
  result.push({offer_id:item.id,product_id:product.id,prices});
 }
 return result;
}

async function matchingInvoice(client,plan){
 const invoices=await client.list('/invoices?customer='+encodeURIComponent(plan.customer));
 const matches=invoices.filter(invoice=>invoice.metadata?.wm_obligation===plan.obligation);
 if(matches.length>1)throw Error('Duplicate milestone invoices found. Reconcile in Stripe before proceeding.');
 return {invoice:matches[0],invoices};
}
function metadata(plan){return {wm_request:plan.id,wm_obligation:plan.obligation,wm_scope_hash:plan.scope_hash,wm_job:plan.client_id,wm_scope_version:String(plan.scope_version),wm_milestone:String(plan.milestone),wm_offer:plan.offer_id};}

export async function createDraft(client,plan){
 await client.account();
 if(client.mode!==plan.mode)throw Error('Plan environment mismatch.');
 const customer=await client.request('/customers/'+plan.customer);
 if(customer.deleted||customer.livemode!==(plan.mode==='live')||customer.balance!==0)throw Error('Customer must be active, in the expected environment, and have no balance adjustment.');
 const found=await matchingInvoice(client,plan);
 for(const previous of plan.prior_milestones){
  const prior=found.invoices.filter(invoice=>invoice.metadata?.wm_obligation===previous.obligation);
  if(prior.length!==1||prior[0].metadata?.wm_job!==plan.client_id||prior[0].metadata?.wm_offer!==plan.offer_id||prior[0].metadata?.wm_scope_version!==String(plan.scope_version)||prior[0].metadata?.wm_milestone!==String(previous.milestone)||prior[0].customer!==plan.customer||prior[0].livemode!==(plan.mode==='live')||prior[0].currency!==plan.currency||prior[0].subtotal!==previous.amount||prior[0].total<previous.amount||(prior[0].discounts||[]).length||(prior[0].total_discount_amounts||[]).length||(prior[0].lines?.data||[]).some(line=>(line.discount_amounts||[]).some(discount=>discount.amount!==0))||!fullyPaid(prior[0]))throw Error(`Milestone ${previous.milestone} needs one verified paid Stripe invoice for the accepted amount. Credits or amended scopes require reconciliation before the next milestone.`);
 }
 let invoice=found.invoice;
 if(invoice&&invoice.metadata?.wm_request!==plan.id)throw Error('An invoice already exists for this obligation with different terms. Reconcile it in Stripe; do not create another.');
 if(!invoice)invoice=await client.request('/invoices',{method:'POST',idempotencyKey:plan.obligation,data:{customer:plan.customer,currency:plan.currency,collection_method:'send_invoice',auto_advance:false,pending_invoice_items_behavior:'exclude',due_date:plan.due_date,description:plan.description,default_tax_rates:plan.tax_rates,automatic_tax:{enabled:false},metadata:metadata(plan),footer:'Wonder and Method · Operated by Venture House Group LLC · support@wonderandmethod.com. The accepted scope governs this milestone. No automatic annual renewal.'}});
 if(invoice.status==='draft'&&invoice.lines.data.length===0){
  await client.request('/invoiceitems',{method:'POST',idempotencyKey:plan.obligation+'-item',data:{customer:plan.customer,invoice:invoice.id,currency:plan.currency,amount:plan.amount,description:plan.description,discountable:false,metadata:metadata(plan)}});
 }
 invoice=await client.request('/invoices/'+invoice.id);
 assertInvoiceMatches(invoice,plan);
 return invoice;
}

export async function finalizeInvoice(client,plan,{invoiceId,total}){
 await client.account();
 if(client.mode!==plan.mode||!/^in_[A-Za-z0-9]+$/.test(invoiceId||''))throw Error('Expected invoice reference and environment required.');
 const invoice=await client.request('/invoices/'+invoiceId);
 assertInvoiceMatches(invoice,plan,{finalizing:true});
 if(total!==invoice.total)throw Error('Confirm the exact reviewed invoice total in cents, including tax.');
 const finalized=await client.request('/invoices/'+invoiceId+'/finalize',{method:'POST',idempotencyKey:plan.obligation+'-finalize',data:{auto_advance:false}});
 assertInvoiceMatches(finalized,plan);
 if(finalized.status!=='open'||!/^https:\/\/invoice\.stripe\.com\//.test(finalized.hosted_invoice_url||''))throw Error('A payable Stripe-hosted invoice was not returned. Inspect Dashboard before retrying.');
 return paymentSummary(finalized);
}

export async function reconcileInvoice(client,plan,invoiceId){
 await client.account({requireEnabled:false});
 if(client.mode!==plan.mode||!/^in_[A-Za-z0-9]+$/.test(invoiceId||''))throw Error('Expected invoice reference and environment required.');
 const invoice=await client.request('/invoices/'+invoiceId);assertInvoiceMatches(invoice,plan);return paymentSummary(invoice);
}
