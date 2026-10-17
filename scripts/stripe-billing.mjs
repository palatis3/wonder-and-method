import {readFile,writeFile,mkdir,open,unlink,realpath,readdir} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {paymentCatalog,prepareInvoice,paymentSummary} from '../src/payments.mjs';
import {stripeClient} from '../deployment/stripe-client.mjs';
import {readStripeKey} from '../deployment/stripe-credentials.mjs';
import {syncCatalog,createDraft,finalizeInvoice,reconcileInvoice} from '../deployment/stripe-billing.mjs';
import {savePreparation} from '../deployment/payment-records.mjs';
const root=resolve(import.meta.dirname,'..');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const save=async(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{mode:0o600});
const [action,mode,jobId,milestoneText,invoiceId,totalText,...extra]=process.argv.slice(2);
async function main(){
 if(extra.length||!['catalog','sync-catalog','account','prepare','draft','finalize','status'].includes(action)||!['test','live'].includes(mode))throw Error('Use catalog|sync-catalog|account MODE; prepare|draft MODE JOB MILESTONE; finalize MODE JOB MILESTONE INVOICE TOTAL_CENTS; status MODE JOB MILESTONE INVOICE.');
 if(['catalog','sync-catalog','account'].includes(action)&&jobId)throw Error('This action takes only an environment.');
 if(action==='catalog'){console.log(JSON.stringify(paymentCatalog(await json(resolve(root,'config/offers.json'))),null,2));return;}
 const privateRoot=resolve(root,'.runtime/payments',mode);await mkdir(privateRoot,{recursive:true});
 const lockPath=resolve(privateRoot,'operator.lock');let lock;
 try{lock=await open(lockPath,'wx');}catch{throw Error('Another billing operation is running or left a lock. Check Stripe and the process before removing the lock.');}
 try{
  const client=action==='prepare'?null:stripeClient({key:readStripeKey(mode),mode});
  if(action==='account'){console.log(JSON.stringify(await client.account({requireEnabled:false}),null,2));return;}
  if(action==='sync-catalog'){const catalog=await syncCatalog(client,paymentCatalog(await json(resolve(root,'config/offers.json'))));await save(resolve(privateRoot,'catalog.json'),catalog);console.log(`Verified ${catalog.length} products and ${catalog.reduce((n,p)=>n+p.prices.length,0)} prices in ${mode}.`);return;}
  if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(jobId||'')||!/^\d+$/.test(milestoneText||''))throw Error('Use a nonpersonal job ID and a one-based milestone number.');
  if((['prepare','draft'].includes(action)&&invoiceId)||(action==='status'&&totalText))throw Error('Unexpected extra argument.');
  const jobs=await realpath(resolve(root,'operations/jobs')),job=await realpath(resolve(jobs,jobId));if(relative(jobs,job)!==jobId||relative(jobs,job).includes(sep))throw Error('Job folder must be directly within private operations/jobs.');
  if(action==='status'){
   if(!/^in_[A-Za-z0-9]+$/.test(invoiceId||''))throw Error('Invoice reference required.');
   const records=await Promise.all((await readdir(privateRoot)).filter(name=>/^wm-[a-f0-9]{40}\.json$/.test(name)).map(async name=>({name,...await json(resolve(privateRoot,name))})));
   await client.account({requireEnabled:false});const remote=await client.request('/invoices/'+invoiceId);
   const matching=records.filter(record=>record.plan?.id===remote.metadata?.wm_request&&record.plan?.client_id===jobId&&record.plan?.milestone===Number(milestoneText));
   if(matching.length!==1)throw Error('One saved original billing request must match this invoice and job.');
   const record=matching[0],result=await reconcileInvoice(client,record.plan,invoiceId);await save(resolve(privateRoot,record.name),{plan:record.plan,invoice:result});console.log(JSON.stringify(result,null,2));return;
  }
  const scope=await json(resolve(job,'accepted-scope.json')),billing=await json(resolve(job,'billing.json'));
  if(billing.mode!==mode||scope.client_id!==jobId)throw Error('Job identity or environment mismatch.');
  const plan=prepareInvoice(scope,billing,Number(milestoneText)-1);
  const evidence=resolve(privateRoot,plan.id+'.json');
  if(action==='prepare'){await savePreparation(evidence,plan);console.log(JSON.stringify(plan,null,2));return;}
  if(action==='draft'){await savePreparation(evidence,plan);const invoice=await createDraft(client,plan);await save(evidence,{plan,invoice:paymentSummary(invoice),review_total_cents:invoice.total});console.log(JSON.stringify({invoice_id:invoice.id,status:invoice.status,subtotal:invoice.subtotal,total:invoice.total,mode,notice:'Review tax and exact total before finalizing. No invoice email sent.'},null,2));return;}
  if(action==='finalize'&&!/^\d+$/.test(totalText||''))throw Error('Confirm the exact reviewed total in cents.');
  const result=action==='finalize'?await finalizeInvoice(client,plan,{invoiceId,total:Number(totalText)}):await reconcileInvoice(client,plan,invoiceId);
  await save(evidence,{plan,invoice:result});console.log(JSON.stringify(result,null,2));
 }finally{await lock?.close();await unlink(lockPath);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
