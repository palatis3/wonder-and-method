import {WorkspaceError,digest} from '../../../src/workspace/domain/contracts.mjs';
import {machineRpc} from '../database.mjs';
import {json} from '../http.mjs';
import {stripeRequest,verifyStripeAccount} from './stripe.mjs';

const reject=()=>{throw new WorkspaceError('invalid_webhook','Webhook could not be verified.',400);};
export async function verifyStripeWebhook(bytes,signature,secret,{now=Date.now()}={}){
 if(!secret||!signature||bytes.byteLength>1048576)reject();
 const parts=signature.split(',').map(x=>x.trim().split('='));
 const times=parts.filter(x=>x[0]==='t');if(times.length!==1||!/^\d+$/.test(times[0][1]))reject();
 const timestamp=Number(times[0][1]);if(!Number.isSafeInteger(timestamp)||Math.abs(now/1000-timestamp)>300)reject();
 const signatures=parts.filter(x=>x[0]==='v1'&&/^[0-9a-f]{64}$/.test(x[1])).map(x=>Uint8Array.from(x[1].match(/../g),s=>parseInt(s,16)));
 if(!signatures.length)reject();
 const prefix=new TextEncoder().encode(timestamp+'.');const signed=new Uint8Array(prefix.length+bytes.length);signed.set(prefix);signed.set(bytes,prefix.length);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 let valid=false;for(const sig of signatures)valid=(await crypto.subtle.verify('HMAC',key,sig,signed))||valid;if(!valid)reject();
 let event;try{event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{reject();}
 if(!event||typeof event!=='object'||!/^evt_[A-Za-z0-9]+$/.test(event.id||'')||typeof event.type!=='string'||typeof event.livemode!=='boolean')reject();
 return event;
}
export async function handleStripeWebhook(request,env,{rpc=machineRpc}={}){
 if(request.method!=='POST')return json({error:{message:'Method unavailable.'}},405);
 if(env.STRIPE_WEBHOOKS_ENABLED!=='true'||!env.STRIPE_WEBHOOK_SECRET||!['live','test'].includes(env.STRIPE_MODE)||!/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID||''))throw new WorkspaceError('webhook_unavailable','Webhook is not configured.',503);
 const reader=request.body?.getReader();if(!reader)reject();const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();reject();}chunks.push(value);}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
 const event=await verifyStripeWebhook(bytes,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET);
 if(event.livemode!==(env.STRIPE_MODE==='live')||(event.account&&event.account!==env.STRIPE_ACCOUNT_ID))reject();
 // No provider state is trusted from an event snapshot. Persistence precedes 2xx.
 await rpc(env,'wm_stripe_event_receive',{p_environment:env.STRIPE_MODE,p_account:env.STRIPE_ACCOUNT_ID,p_event:event,p_digest:await digest(event)});
 return json({received:true});
}
export async function reconcileStripe(env,{rpc=machineRpc,fetcher=fetch}={}){
 if(env.STRIPE_ENABLED!=='true')return {disabled:true};await verifyStripeAccount(env,fetcher);let observed=0,attention=0;
 for(let i=0;i<10;i++){
  const job=await rpc(env,'wm_stripe_readback_claim',{p_environment:env.STRIPE_MODE,p_account:env.STRIPE_ACCOUNT_ID});if(!job)break;
  try{
   if(job.object_type!=='invoice'||!/^in_[A-Za-z0-9]+$/.test(job.object_id)){attention++;continue;}
   const invoice=await stripeRequest(env,'/v1/invoices/'+job.object_id,{fetcher});
   await rpc(env,'wm_stripe_invoice_observe',{p_environment:env.STRIPE_MODE,p_account:env.STRIPE_ACCOUNT_ID,p_generation:job.lease_generation,p_invoice:invoice});observed++;
  }catch{attention++;}
 }
 return {observed,attention};
}
