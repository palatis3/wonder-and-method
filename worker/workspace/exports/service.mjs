import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {config,providerFetch,secure} from '../http.mjs';
import {readBounded,sha256} from '../files/content.mjs';
import {buildArchive,verifyArchive,EXPORT_LIMITS} from './archive.mjs';
const fail=(code,message='Customer export needs checking.',status=409)=>{throw new WorkspaceError(code,message,status);};
async function controlCheck(env,org,generation,control){const c=await control(env,org);if(c.access_state!=='open'||generation&&c.external_generation!==generation)fail('access_changed','Customer export access is restricted.',403);return c;}
const SHA=/^[a-f0-9]{64}$/,ID=/^[a-f0-9-]{36}$/;
export const EXPORT_COMMANDS=new Set(['customer_export.request','customer_export.cancel']);
export function validateExportCommand(command,input){
 if(!EXPORT_COMMANDS.has(command)||!input||Array.isArray(input)||typeof input!=='object')fail('invalid_action');
 const fields=command==='customer_export.request'?['engagement_id','expected_version','acknowledge_unscanned']:['id','expected_version'];
 if(Object.keys(input).length!==fields.length||Object.keys(input).some(k=>!fields.includes(k))||!Number.isSafeInteger(input.expected_version)||input.expected_version<1)fail('invalid_action');
 uuid(input[fields[0]]);if(command==='customer_export.request'&&input.acknowledge_unscanned!==true)fail('invalid_action','Acknowledge that exported files may be unscanned.',400);return input;
}
export async function exportCommand(env,session,org,command,input,key,{call=rpc,control=externalControl}={}){
 validateExportCommand(command,input);uuid(org);if(typeof key!=='string'||key.length<16||key.length>200)fail('invalid_action');
 const c=await controlCheck(env,org,null,control);
 const result=await call(env,session.access_token,'wm_customer_export_command',{p_org:org,p_command:command,p_input:input,p_key:key});
 if(result.external_generation!==c.external_generation)fail('access_changed');await controlCheck(env,org,result.external_generation,control);
 const {external_generation,...safe}=result;return safe;
}
export async function exportStatus(env,session,org,before=null,{call=rpc,control=externalControl}={}){
 uuid(org);if(before!==null&&(typeof before!=='string'||! /^[1-9][0-9]{0,18}$/.test(before)))fail('invalid_action');
 await controlCheck(env,org,null,control);
 const data=await call(env,session.access_token,'wm_customer_export_list',{p_org:org,p_before:before});
 await controlCheck(env,org,data.external_generation,control);
 return {items:data.items.slice(0,20),next_before:data.items.length>20?data.items[19].cursor:null};
}
export function exportTarget(env){
 if(!['r2','supabase'].includes(env.CUSTOMER_EXPORT_BACKEND)||! /^[a-zA-Z0-9_-]{1,80}$/.test(env.CUSTOMER_EXPORT_STORAGE_ID||''))fail('configuration');
 if(env.CUSTOMER_EXPORT_BACKEND==='r2'&&!env.CUSTOMER_EXPORTS_R2)fail('configuration');
 if(env.CUSTOMER_EXPORT_BACKEND==='supabase'&&!env.SUPABASE_SECRET_KEY)fail('configuration');
 return `${env.CUSTOMER_EXPORT_BACKEND}:${env.CUSTOMER_EXPORT_STORAGE_ID}`;
}
function validKey(key){if(typeof key!=='string'||!/^customer-exports\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9]{64}\.zip$/.test(key))fail('archive_integrity');}
export function privateExportStore(env,{fetcher=fetch}={}){
 const target=exportTarget(env);
 return {
 target,
 async get(key,max=EXPORT_LIMITS.archive){
  validKey(key);if(!Number.isSafeInteger(max)||max<1||max>EXPORT_LIMITS.archive)fail('archive_integrity');
  if(env.CUSTOMER_EXPORT_BACKEND==='r2'){const obj=await env.CUSTOMER_EXPORTS_R2.get(key);if(obj===null)return null;if(!obj.body||obj.size>max)fail('archive_integrity');return readBounded(obj.body,max);}
  const r=await providerFetch(`${config(env).supabase}/storage/v1/object/workspace-customer-exports/${key}`,{headers:{apikey:env.SUPABASE_SECRET_KEY}},fetcher);
  if(!r.ok){
   if([400,404].includes(r.status)){let error;try{error=JSON.parse(new TextDecoder().decode(await readBounded(r.body,4096)));}catch{fail('archive_unknown');}
    if(error.code==='NoSuchKey')return null;if(error.code==='NoSuchBucket')fail('configuration');}
   fail('archive_unknown');}
  return readBounded(r.body,max);
 },
 async put(key,bytes,hash){
  validKey(key);if(!(bytes instanceof Uint8Array)||bytes.length>EXPORT_LIMITS.archive||!SHA.test(hash)||await sha256(bytes)!==hash)fail('archive_integrity');
  if(env.CUSTOMER_EXPORT_BACKEND==='r2')return env.CUSTOMER_EXPORTS_R2.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),sha256:Uint8Array.from(hash.match(/../g),x=>parseInt(x,16)).buffer,httpMetadata:{contentType:'application/zip',cacheControl:'private, no-store'}});
  // No upsert. On a timeout/conflict, the caller reads exactly this immutable key.
  const r=await providerFetch(`${config(env).supabase}/storage/v1/object/workspace-customer-exports/${key}`,{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/zip','x-upsert':'false'},body:bytes},fetcher);if(!r.ok)fail('archive_unknown');return true;
 }
 };
}
export async function loadExportSource(env,file,{fetcher=fetch,organizationId}={}){
 const n=Number(file.bytes);if(!['workspace','inbound'].includes(file.kind)||!Number.isSafeInteger(n)||n<1||n>EXPORT_LIMITS.fileBytes||!SHA.test(file.checksum)||!ID.test(file.id)||!env.SUPABASE_SECRET_KEY)fail('source_integrity');
 if(!ID.test(organizationId||'')||file.kind==='inbound'&&!ID.test(file.email_id||''))fail('source_integrity');
 const expected=file.kind==='workspace'?new RegExp(`^${organizationId}/${file.id}/${file.checksum}$`):new RegExp(`^inbound/${file.email_id}/${file.id}/${file.checksum}$`);
 if(!['workspace-sealed','workspace-inbound'].includes(file.bucket)||file.bucket!==(file.kind==='workspace'?'workspace-sealed':'workspace-inbound')||!expected.test(file.object_key))fail('source_integrity');
 const r=await providerFetch(`${config(env).supabase}/storage/v1/object/${file.bucket}/${file.object_key}`,{headers:{apikey:env.SUPABASE_SECRET_KEY}},fetcher);
 if(!r.ok)fail('source_unavailable');return readBounded(r.body,n);
}
export async function prepareCustomerExport(env,job,{call=machineRpc,fetcher=fetch,store,loadSource,control=externalControl}={}){
 const args={p_org:uuid(job.organization_id),p_id:uuid(job.id),p_lease:uuid(job.lease_token)};
 store??=privateExportStore(env,{fetcher});
 let context=await call(env,'wm_customer_export_context',args);
 await controlCheck(env,job.organization_id,context.external_generation,control);
 let archive;
 if(!context.object_key||!context.write_started_at){
  archive=await buildArchive(context,loadSource||((f)=>loadExportSource(env,f,{fetcher,organizationId:job.organization_id})));
  await call(env,'wm_customer_export_reserve',{...args,p_target:store.target,p_hash:archive.hash,p_bytes:archive.bytes.length,p_manifest:archive.manifestHash});
  context=await call(env,'wm_customer_export_context',args);
 }
 if(context.storage_target!==store.target)fail('configuration');
 validKey(context.object_key);if(context.object_key!==`customer-exports/${job.organization_id}/${job.id}/${context.archive_digest}.zip`)fail('archive_integrity');
 let bytes=await store.get(context.object_key,Number(context.archive_bytes));
 if(bytes===null){
  if(!archive||context.write_started_at)fail('archive_unknown');
  await controlCheck(env,job.organization_id,context.external_generation,control);
  if(!await call(env,'wm_customer_export_write_once',args))fail('archive_unknown');
  try{await store.put(context.object_key,archive.bytes,archive.hash);}catch{/* Accepted write may have lost its response. Read exact key, never repeat POST. */}
  bytes=await store.get(context.object_key,Number(context.archive_bytes));
 }
 if(bytes===null)fail('archive_unknown');
 if(bytes.length!==Number(context.archive_bytes)||await sha256(bytes)!==context.archive_digest)fail('archive_integrity');
 await verifyArchive(bytes,context.manifest_digest);
 // Current member, audiences, closure, lease and generations checked after bytes.
 await controlCheck(env,job.organization_id,context.external_generation,control);
 return call(env,'wm_customer_export_seal',{...args,p_hash:context.archive_digest,p_bytes:bytes.length,p_manifest:context.manifest_digest});
}
export async function processCustomerExports(env,{call=machineRpc,fetcher=fetch,store,loadSource,limit=2,control=externalControl}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>5)fail('invalid_action');
 const jobs=await call(env,'wm_customer_export_claim',{p_limit:limit}),results=[];
 for(const job of jobs){try{results.push({id:job.id,...await prepareCustomerExport(env,job,{call,fetcher,store,loadSource,control})});}
 catch(e){const code=['source_unavailable','source_integrity','archive_unknown','archive_integrity','build_limit','configuration','access_changed'].includes(e.code)?e.code:'build_failed';
  let attentionRecorded=true;try{await call(env,'wm_customer_export_attention',{p_org:job.organization_id,p_id:job.id,p_lease:job.lease_token,p_reason:code});}catch{attentionRecorded=false;}
  results.push({id:job.id,state:'attention',reason:code,attention_recorded:attentionRecorded});}}
 return results;
}
export async function downloadCustomerExport(request,env,session,{call=rpc,fetcher=fetch,store,control=externalControl}={}){
 const url=new URL(request.url),m=url.pathname.match(/^\/api\/customer-exports\/([a-f0-9-]{36})\/download$/i);if(!m)return null;
 if(request.method!=='GET')fail('invalid_action','Use GET to download an export.',405);
 if(url.searchParams.get('acknowledge_unscanned')!=='true')fail('invalid_action','Acknowledge that files may be unscanned.',400);
 const args={p_org:uuid(url.searchParams.get('business')),p_id:uuid(m[1])};
 await controlCheck(env,args.p_org,null,control);
 const before=await call(env,session.access_token,'wm_customer_export_download',args);
 await controlCheck(env,args.p_org,before.external_generation,control);
 store??=privateExportStore(env,{fetcher});if(store.target!==before.target)fail('configuration');
 const bytes=await store.get(before.key,Number(before.bytes));if(bytes===null||bytes.length!==Number(before.bytes)||await sha256(bytes)!==before.sha256)fail('archive_integrity');
 await verifyArchive(bytes,before.manifest_sha256);
 const after=await call(env,session.access_token,'wm_customer_export_download',args);
 await controlCheck(env,args.p_org,after.external_generation,control);
 if(['id','target','key','sha256','bytes','manifest_sha256','external_generation'].some(k=>String(after[k])!==String(before[k])))fail('archive_integrity');
 const response=secure(new Response(bytes,{headers:{'Content-Type':'application/zip','Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="customer-export-${args.p_id}.zip"`}}));
 response.headers.set('Content-Security-Policy',"sandbox; default-src 'none'; frame-ancestors 'none'");return response;
}
