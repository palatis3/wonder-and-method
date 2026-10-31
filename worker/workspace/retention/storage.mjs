import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {config,providerFetch} from '../http.mjs';
import {readBounded,sha256} from '../files/content.mjs';
export const fail=(code='retention_evidence')=>{throw new WorkspaceError(code,'Retention needs review; no further deletion is authorized.',409);};
export function qualified(env,org,t){
 uuid(org);const n=Number(t.bytes);if(!Number.isSafeInteger(n)||n<1||n>33554432||!/^[a-f0-9]{64}$/.test(t.sha256||'')||env.RETENTION_FENCES_VERSION!=='retention-v1'||env.RETENTION_IMMUTABLE_STORAGE_QUALIFIED!=='true')fail('unsupported_configuration');
 const parts=t.source_id.split(':');
 if(parts[0]==='workspace'&&(t.backend!=='supabase'||t.bucket!=='workspace-sealed'||t.key!==org+'/'+uuid(parts[1])+'/'+t.sha256))fail();
 else if(parts[0]==='inbound'&&(t.backend!=='supabase'||t.bucket!=='workspace-inbound'||t.key!=='inbound/'+uuid(parts[1])+'/'+uuid(parts[2])+'/'+t.sha256))fail();
 else if(parts[0]==='export'){
  if(!['supabase','r2'].includes(t.backend)||t.bucket!=='workspace-customer-exports'||t.storage_target!==t.backend+':'+env.CUSTOMER_EXPORT_STORAGE_ID||!new RegExp('^customer-exports/'+org+'/'+uuid(parts[1])+'/[a-f0-9]{64}\\.zip$').test(t.key))fail('unsupported_configuration');
 }else if(!['workspace','inbound'].includes(parts[0]))fail();
 if(t.backend==='r2'&&!env.CUSTOMER_EXPORTS_R2||t.backend==='supabase'&&!env.SUPABASE_SECRET_KEY)fail('unsupported_configuration');
 return n;
}
export function retentionStorage(env,org,t,{fetcher=fetch}={}){
 const limit=qualified(env,org,t),base=t.backend==='supabase'?config(env).supabase+'/storage/v1/object/'+t.bucket:null,path=t.key.split('/').map(encodeURIComponent).join('/');
 return {
 async read(){
  if(t.backend==='r2'){const o=await env.CUSTOMER_EXPORTS_R2.get(t.key);if(o===null)return null;if(!o.body||o.size!==limit)fail('changed_bytes');const bytes=await readBounded(o.body,limit);if(bytes.length!==limit||await sha256(bytes)!==t.sha256)fail('changed_bytes');return {bytes:bytes.length,sha256:t.sha256};}
  const r=await providerFetch(base+'/'+path,{headers:{apikey:env.SUPABASE_SECRET_KEY,'Cache-Control':'no-store'}},fetcher);
  if(!r.ok){if([400,404].includes(r.status)){let e;try{e=JSON.parse(new TextDecoder().decode(await readBounded(r.body,4096)));}catch{fail('provider_unavailable');}if(e.code==='NoSuchKey')return null;}fail('provider_unavailable');}
  const bytes=await readBounded(r.body,limit);if(bytes.length!==limit||await sha256(bytes)!==t.sha256)fail('changed_bytes');return {bytes:bytes.length,sha256:t.sha256};
 },
 async remove(){
  // Neither native contract offers a documented atomic hash/hold-conditional DELETE.
  // Call only once after registered, independently witnessed dispatch and fences.
  if(t.backend==='r2'){await env.CUSTOMER_EXPORTS_R2.delete(t.key);return 'acknowledged';}
  const r=await providerFetch(base,{method:'DELETE',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[t.key]})},fetcher);
  if(!r.ok)return [401,403,409,423].includes(r.status)?'denied':'unknown';return 'acknowledged';
 }
 };
}
