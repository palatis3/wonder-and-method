import {paymentAccounts} from '../src/payments.mjs';
export const stripeApiVersion='2026-09-30.endive';
export function stripeClient({key,mode,fetchImpl=fetch}){
 if(!['test','live'].includes(mode)||typeof key!=='string'||!new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(key))throw Error('A matching Stripe environment key is required. Never put it in a command argument.');
 function encode(input,prefix='',params=new URLSearchParams()){
  for(const [name,value] of Object.entries(input||{})){const field=prefix?`${prefix}[${name}]`:name;if(value===undefined||value===null)continue;if(typeof value==='object')encode(value,field,params);else params.set(field,String(value));}return params;
 }
 async function request(path,{method='GET',data,idempotencyKey}={}){
  if(!/^\/(account|products|prices|customers|invoices|invoiceitems)(?:\/[A-Za-z0-9_]+)*(?:\?.*)?$/.test(path))throw Error('Unsupported Stripe API path.');
  if(method==='POST'&&!idempotencyKey)throw Error('Every Stripe write requires a stable idempotency key.');
  const response=await fetchImpl('https://api.stripe.com/v1'+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${key}`,'Stripe-Version':stripeApiVersion,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':idempotencyKey}:{})},...(method==='POST'?{body:encode(data)}:{})});
  if(!response.ok)throw Error(`Stripe request failed (${response.status}); private provider response withheld. Check Dashboard before retrying an uncertain write.`);
  return response.json();
 }
 async function account({requireEnabled=true}={}){const account=await request('/account');if(account.id!==paymentAccounts[mode])throw Error('Wrong Stripe account; no writes allowed.');if(requireEnabled&&mode==='live'&&(!account.charges_enabled||!account.payouts_enabled))throw Error('Stripe live charges and payouts must both be enabled before billing.');return {account_id:account.id,mode,charges_enabled:account.charges_enabled,payouts_enabled:account.payouts_enabled};}
 async function list(path){const records=[];let after='';do{const page=await request(path+(path.includes('?')?'&':'?')+'limit=100'+(after?'&starting_after='+encodeURIComponent(after):''));if(!Array.isArray(page.data))throw Error('Unexpected Stripe list response.');records.push(...page.data);if(!page.has_more)break;if(!page.data.length||page.data.at(-1).id===after)throw Error('Invalid Stripe pagination.');after=page.data.at(-1).id;}while(true);return records;}
 return {request,list,account,mode};
}
