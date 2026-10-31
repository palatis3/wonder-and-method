import {rpc as userRpc,machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {journalAttempt} from '../continuity/attempt-journal.mjs';
import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {PORTAL_KIND,fail,verifyPortalConfiguration,createPortalSession,sessionProof} from './provider.mjs';
import {secretContext,encryptPortalUrl,decryptPortalUrl} from './secrets.mjs';
import {requireOrigin,secure} from '../http.mjs';
import {requireCsrf} from '../auth/session.mjs';
import {readBounded} from '../files/content.mjs';
export const PORTAL_COMMANDS=['portal.request','portal.reconcile'];
// Server setup only: the caller supplies an independently approved mapping, never browser fields.
// This verifies existing objects; it does not create/update Stripe configurations or customers.
export async function registerPortalBinding(env,org,binding,expectedVersion,{rpc=machineRpc,fetcher=fetch}={}){
 uuid(org);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!binding||typeof binding.qualification!=='string'||binding.qualification.length<10)fail();
 const fingerprint=await verifyPortalConfiguration(env,binding,{fetcher});
 const input=Object.fromEntries(['environment','account_id','customer_id','sandbox_id','configuration_id','policy_version','api_version','return_url','qualification'].map(k=>[k,binding[k]]));
 return rpc(env,'wm_portal_binding_register',{p_org:org,p_input:{...input,configuration_digest:fingerprint,enabled:true},p_expected:expectedVersion});
}
export function validatePortal(command,input){
 if(!PORTAL_COMMANDS.includes(command)||!input||typeof input!=='object'||Array.isArray(input))fail();
 const names=command==='portal.request'?['expected_version']:['id'];if(Object.keys(input).length!==names.length||Object.keys(input).some(k=>!names.includes(k)))fail();
 if(command==='portal.request'&&(!Number.isSafeInteger(input.expected_version)||input.expected_version<1))fail();if(command==='portal.reconcile')uuid(input.id);return input;
}
async function currentControl(env,c,readControl){const control=await readControl(env,c.organization_id);if(control.access_state!=='open'||!control.positive_effects_allowed||control.external_generation!==c.external_generation)fail();}
export async function portalEffect(env,permit,{fetcher=fetch,rpc=machineRpc,readControl=externalControl,journal=journalAttempt,replay=false,now=Date.now}={}){
 if(permit.operation.kind!==PORTAL_KIND)fail();const args={p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_replay:replay};
 let c=await rpc(env,'wm_portal_effect_context',args);if(canonical(c)!==canonical(permit.context))fail();
 await currentControl(env,c,readControl);await verifyPortalConfiguration(env,c,{fetcher});
 // Existing kernel journal is authoritative. Repeated intent persistence uses the same immutable bytes.
 await journal(env,permit,'intent');
 if(canonical(await rpc(env,'wm_portal_effect_context',args))!==canonical(c))fail();await currentControl(env,c,readControl);
 let value;try{value=await createPortalSession(env,c,permit.attempt,permit.operation,{fetcher});}catch{throw Object.assign(new Error('Portal provider outcome unknown'),{code:'portal_unknown'});}
 const proof=sessionProof(value,c,permit.attempt,now());
 await rpc(env,'wm_attempt_checkpoint',{p_org:args.p_org,p_attempt:args.p_attempt,p_nonce:args.p_nonce,p_reference:proof.provider_reference});
 // A remote session is historical evidence even when permission was revoked during POST.
 let available=false;
 try{
  if(canonical(await rpc(env,'wm_portal_effect_context',args))!==canonical(c))fail();await currentControl(env,c,readControl);
  await verifyPortalConfiguration(env,c,{fetcher});
  const expires=new Date(Math.min(now()+120000,value.created*1000+240000)).toISOString();
  if(Date.parse(expires)<=now())fail();
  const context=secretContext(c,permit.attempt,expires),ciphertext=await encryptPortalUrl(env,value.url,context);
  const saved=await rpc(env,'wm_portal_secret_save',{p_org:args.p_org,p_attempt:args.p_attempt,p_nonce:args.p_nonce,p_context:context,p_ciphertext:ciphertext,p_provider_id:proof.provider_reference});available=saved.stored===true;
 }catch{/* Withhold bearer access; never put raw provider response in error/evidence. */}
 return {...proof,url_available:available};
}
export async function portalCommand(env,token,org,command,input,key,{rpc=userRpc,machine=machineRpc,...options}={}){
 validatePortal(command,input);uuid(org);if(typeof key!=='string'||key.length<16||key.length>200)fail();
 const result=await rpc(env,token,'wm_portal_command',{p_org:org,p_command:command,p_input:input,p_key:key});
 if(command!=='portal.reconcile')return result;
 // Explicit, current-authority replay of the SAME registered attempt, never a scheduled retry/new key.
 const permit=result.permit;if(!permit)return result;
 try{const proof=await portalEffect(env,permit,{...options,rpc:machine,replay:true});await (options.journal||journalAttempt)(env,permit,'outcome',proof);return await machine(env,'wm_attempt_resolve',{p_org:org,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:proof});}
 catch{await machine(env,'wm_attempt_observe',{p_org:org,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:'timeout',p_evidence:{code:'portal_unknown'},p_observed_at:new Date().toISOString()});return {id:permit.operation.id,state:'unknown'};}
}
export async function portalStatus(env,token,org,{rpc=userRpc}={}){return rpc(env,token,'wm_portal_status',{p_org:uuid(org)});}
export async function portalRedirect(env,token,org,id,{rpc=userRpc,fetcher=fetch,readControl=externalControl,now=Date.now}={}){
 const args={p_org:uuid(org),p_id:uuid(id)};
 const first=await rpc(env,token,'wm_portal_disclosure',args);await currentControl(env,first.context,readControl);await verifyPortalConfiguration(env,first.context,{fetcher});
 const url=await decryptPortalUrl(env,first.ciphertext,first.secret_context,{now:now()});
 const second=await rpc(env,token,'wm_portal_disclosure',args);
 if(canonical(first)!==canonical(second))fail();await currentControl(env,second.context,readControl);
 return new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store, private','Pragma':'no-cache','Referrer-Policy':'no-referrer'}});
}
// Native form navigation keeps the bearer URL out of the client JSON pipeline.
export async function handlePortalRedirect(request,env,session,{redirect=portalRedirect}={}){
 const url=new URL(request.url),match=/^\/api\/billing-portal\/([a-f0-9-]{36})\/open$/.exec(url.pathname);if(!match)return null;
 requireOrigin(request,env);if(request.method!=='POST'||request.headers.get('content-type')?.split(';')[0].trim()!=='application/x-www-form-urlencoded')fail();
 const bytes=await readBounded(request.body,2048),values=new URLSearchParams(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if([...values.keys()].join(',')!=='csrf')fail();
 const headers=new Headers(request.headers);headers.set('x-csrf-token',values.get('csrf'));
 requireCsrf(new Request(url,{method:'POST',headers}),session);
 return secure(await redirect(env,session.access_token,uuid(url.searchParams.get('business')),uuid(match[1])));
}
