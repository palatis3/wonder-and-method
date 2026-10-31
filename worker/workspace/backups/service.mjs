import {uuid,canonical} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {byteDigest} from '../continuity/envelope.mjs';
import {readBounded} from '../files/content.mjs';
import {config,providerFetch} from '../http.mjs';
import {CHUNK_BYTES,encode,namespace,configuredKeys,putEncrypted,getEncrypted,fail} from './objects.mjs';
import {checkWitness,appendWitness,assessWitnessTail} from './witness.mjs';
import {WITNESS_HOOKS_VERSION} from '../continuity/witness-hooks.mjs';
export const BACKUP_COMMANDS=new Set(['backup.request','backup.cancel','backup.schedule']);
export const BACKUP_LIMITS=Object.freeze({rows:20000,snapshot:16777216,files:500,fileBytes:268435456,source:33554432,partsPerStep:4});
export function validateBackupCommand(command,input){
 if(!BACKUP_COMMANDS.has(command)||!input||typeof input!=='object'||Array.isArray(input))fail('backup_input');
 const fields=command==='backup.request'?['qualification','key_id']:command==='backup.schedule'?['enabled','expected_version','qualification','key_id']:['id','expected_version'];if(Object.keys(input).length!==fields.length||Object.keys(input).some(k=>!fields.includes(k)))fail('backup_input');
 if(command==='backup.cancel'){uuid(input.id);if(!Number.isSafeInteger(input.expected_version)||input.expected_version<1)fail('backup_input');}
 else{if(command==='backup.schedule'&&(typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.expected_version)||input.expected_version<0))fail('backup_input');if(!/^[A-Za-z0-9_-]{1,60}$/.test(input.key_id||''))fail('backup_input');const q=input.qualification;if(!q||Array.isArray(q)||Object.keys(q).sort().join(',')!=='bytes_identity,custody_reference,witness_hooks_version,witness_identity'||Object.values(q).some(v=>typeof v!=='string'||v.length<1||v.length>160))fail('backup_input');}
 return input;
}
async function controlCheck(env,org,generation,control){const c=await control(env,org);if(c.access_state!=='open'||generation!==null&&c.external_generation!==generation)fail('backup_generation');return c;}
export async function backupCommand(env,session,org,command,input,key,{call=rpc,control=externalControl}={}){
 uuid(org);validateBackupCommand(command,input);if(typeof key!=='string'||! /^[A-Za-z0-9_-]{16,200}$/.test(key))fail('backup_input');
 if(command==='backup.request'||command==='backup.schedule'&&input.enabled)qualification(env,{qualification:input.qualification,key_id:input.key_id});
 await controlCheck(env,org,null,control);const r=await call(env,session.access_token,'wm_backup_command',{p_org:org,p_command:command,p_input:input,p_key:key});await controlCheck(env,org,r.external_generation,control);const {external_generation,...result}=r;return result;
}
export async function backupStatus(env,session,org,{call=rpc,control=externalControl}={}){uuid(org);await controlCheck(env,org,null,control);const r=await call(env,session.access_token,'wm_backup_status',{p_org:org});await controlCheck(env,org,r.external_generation,control);let request_configuration=null;try{const q=JSON.parse(env.BACKUP_QUALIFICATION);qualification(env,{qualification:q,key_id:env.BACKUP_KEY_ID});request_configuration={qualification:q,key_id:env.BACKUP_KEY_ID};}catch{/* Existing history remains visible when preparation is unconfigured. */}return {items:r.items,schedule:r.schedule??null,request_configuration};}
function qualification(env,j){let q;try{q=JSON.parse(env.BACKUP_QUALIFICATION);}catch{fail('backup_configuration');}if(canonical(q)!==canonical(j.qualification)||q.witness_hooks_version!==WITNESS_HOOKS_VERSION||env.RECOVERY_WITNESS_ENABLED!=='true'||env.BACKUP_ENABLED!=='true'||!env.RECOVERY_BYTES||!env.RECOVERY_WITNESS)fail('backup_configuration');configuredKeys(env,j.key_id);return q;}
const base=j=>`tenant-backups/${namespace(j.organization_id,j.external_generation)}/${j.id}`;
function plan(j){
 const items=[];for(let at=0;at<Number(j.snapshot_bytes);at+=CHUNK_BYTES)items.push({part:`snapshot/${at}`,source:'snapshot',offset:at,length:Math.min(CHUNK_BYTES,Number(j.snapshot_bytes)-at),whole:j.snapshot_digest});
 for(let i=0;i<j.files.length;i++){const f=j.files[i],n=Number(f.bytes);if(!Number.isSafeInteger(n)||n<1||n>BACKUP_LIMITS.source)fail('backup_source_identity');for(let at=0;at<n;at+=CHUNK_BYTES)items.push({part:`file/${i}/${at}`,source:i,offset:at,length:Math.min(CHUNK_BYTES,n-at),whole:f.sha256});}return items;
}
function chunkContext(j,item){return {type:'tenant_backup_chunk',organization_id:j.organization_id,external_generation:j.external_generation,backup_id:j.id,source:item.source,offset:item.offset,bytes:item.length,whole_digest:item.whole};}
export async function sourceRange(env,j,f,offset,length,{fetcher=fetch}={}){
 const n=Number(f.bytes);if(!Number.isSafeInteger(n)||n<1||n>BACKUP_LIMITS.source||!Number.isSafeInteger(offset)||offset<0||length<1||length>CHUNK_BYTES||offset+length>n||! /^[a-f0-9]{64}$/.test(f.sha256)||typeof f.key!=='string'||f.key.includes('..')||f.key.startsWith('/'))fail('backup_source_identity');
 if(f.backend==='r2'){
  if(f.storage_target!==`r2:${env.CUSTOMER_EXPORT_STORAGE_ID}`||!env.CUSTOMER_EXPORTS_R2||!f.key.startsWith(`customer-exports/${j.organization_id}/`))fail('backup_source_identity');
  const obj=await env.CUSTOMER_EXPORTS_R2.get(f.key,{range:{offset,length}});if(!obj||obj.size!==n)fail('backup_missing_bytes');const bytes=await readBounded(obj.body,length);if(bytes.length!==length)fail('backup_source_integrity');return bytes;
 }
 if(f.bucket==='workspace-customer-exports'&&f.storage_target!==`supabase:${env.CUSTOMER_EXPORT_STORAGE_ID}`)fail('backup_source_identity');
 if(f.backend!=='supabase'||!['workspace-sealed','workspace-quarantine','workspace-inbound','workspace-customer-exports'].includes(f.bucket)||!env.SUPABASE_SECRET_KEY)fail('backup_source_identity');
 if(f.bucket==='workspace-inbound'){if(! /^inbound\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(f.key))fail('backup_source_identity');}
 else if(!f.key.startsWith(f.bucket==='workspace-customer-exports'?`customer-exports/${j.organization_id}/`:`${j.organization_id}/`))fail('backup_source_identity');
 const path=f.key.split('/').map(encodeURIComponent).join('/'),r=await providerFetch(`${config(env).supabase}/storage/v1/object/${f.bucket}/${path}`,{headers:{apikey:env.SUPABASE_SECRET_KEY,Range:`bytes=${offset}-${offset+length-1}`}},fetcher);
 if(r.status===206){if(r.headers.get('content-range')!==`bytes ${offset}-${offset+length-1}/${n}`)fail('backup_source_integrity');const bytes=await readBounded(r.body,length);if(bytes.length!==length)fail();return bytes;}
 // Some Storage versions ignore Range. A full response is bounded to 32 MiB,
 // checked for exact size, then sliced. Production range support is qualified.
 if(r.status!==200)fail('backup_missing_bytes');const bytes=await readBounded(r.body,n);if(bytes.length!==n)fail('backup_source_integrity');return bytes.slice(offset,offset+length);
}
async function verifyWhole(bucket,items,parts,keys,expected,n){
 if(n>BACKUP_LIMITS.source)fail();const bytes=new Uint8Array(n);let count=0;
 for(const item of items){const plain=await getEncrypted(bucket,parts[item.part],keys);if(plain.length!==item.length)fail();bytes.set(plain,item.offset);count+=plain.length;}
 if(count!==n||await byteDigest(bytes)!==expected)fail('backup_source_integrity');return {sha256:expected,bytes:n};
}
export async function backupStep(env,job,{call=machineRpc,control=externalControl,fetcher=fetch,load=sourceRange,maxParts=4}={}){
 if(!Number.isInteger(maxParts)||maxParts<1||maxParts>16)fail('backup_input');const a={p_org:uuid(job.organization_id),p_id:uuid(job.id),p_lease:uuid(job.lease_token)};
 let j=await call(env,'wm_backup_context',a);qualification(env,j);const keys=configuredKeys(env,j.key_id);await controlCheck(env,j.organization_id,j.external_generation,control);
 if(!j.parts.anchor){const before=await checkWitness(env,j.organization_id,j.external_generation,{keys});await call(env,'wm_backup_part',{...a,p_key:'anchor',p_pointer:{head:before.head}});}
 if(j.state==='queued'){j=await call(env,'wm_backup_capture',a);if(j.state==='attention')return {state:'attention'};}
 j=await call(env,'wm_backup_context',a);const items=plan(j);let wrote=0;
 for(const item of items){if(j.parts[item.part])continue;if(wrote>=maxParts)break;
  await controlCheck(env,j.organization_id,j.external_generation,control);await call(env,'wm_backup_context',a);
  let bytes;if(item.source==='snapshot'){const page=await call(env,'wm_backup_page',{...a,p_offset:item.offset});bytes=Uint8Array.from(atob(page.bytes),x=>x.charCodeAt(0));}
  else bytes=await load(env,j,j.files[item.source],item.offset,item.length,{fetcher});
  if(bytes.length!==item.length)fail('backup_source_integrity');const pointer=await putEncrypted(env.RECOVERY_BYTES,`${base(j)}/${item.part}.bin`,bytes,chunkContext(j,item),keys,j.key_id);
  await call(env,'wm_backup_part',{...a,p_key:item.part,p_pointer:pointer});j.parts[item.part]=pointer;wrote++;
 }
 if(items.some(i=>!j.parts[i.part])){await call(env,'wm_backup_release',{...a,p_reason:null});return {state:'copying',parts:wrote};}
 // Verify one complete source per tick, bounded to 32 MiB. Only authenticated
 // backup bytes are used; non-atomic source range reads must match the frozen hash.
 const sources=['snapshot',...j.files.map((_,i)=>i)];
 for(const source of sources){const name=`verified/${source}`;if(j.parts[name])continue;const expected=source==='snapshot'?j.snapshot_digest:j.files[source].sha256,n=source==='snapshot'?Number(j.snapshot_bytes):Number(j.files[source].bytes);
  const proof=await verifyWhole(env.RECOVERY_BYTES,items.filter(i=>i.source===source),j.parts,keys,expected,n);await call(env,'wm_backup_part',{...a,p_key:name,p_pointer:proof});j.parts[name]=proof;
  if(sources.some(s=>!j.parts[`verified/${s}`])){await call(env,'wm_backup_release',{...a,p_reason:null});return {state:'verifying'};}
 }
 const tailCheck=await checkWitness(env,j.organization_id,j.external_generation,{expected:j.parts.anchor.head,keys});
 const manifest=j.manifest||{format:'wm-tenant-backup/1',producer_version:'tenant-backups-v1',schema_profile:'20261031144939',backup_id:j.id,organization_id:j.organization_id,external_generation:j.external_generation,recovery_generation:j.recovery_generation,captured_at:j.captured_at,requested_by:j.requested_by,requested_at:j.requested_at,snapshot_digest:j.snapshot_digest,snapshot_bytes:Number(j.snapshot_bytes),coverage:j.coverage,qualification:j.qualification,key_id:j.key_id,
  files:j.files,parts:items.map(i=>({...i,pointer:j.parts[i.part]})),witness_before:j.parts.anchor.head,witness_after:tailCheck.head,tail_assessment:assessWitnessTail(tailCheck,j.tail),restore_authority:'none',global_authority_restore:false};
 await call(env,'wm_backup_manifest',{...a,p_manifest:manifest});
 const pointer=await putEncrypted(env.RECOVERY_BYTES,`${base(j)}/manifest.bin`,encode(manifest),{type:'tenant_backup_manifest',organization_id:j.organization_id,external_generation:j.external_generation,backup_id:j.id},keys,j.key_id,{max:2097152});
 await getEncrypted(env.RECOVERY_BYTES,pointer,keys,2097152+8212);await controlCheck(env,j.organization_id,j.external_generation,control);await call(env,'wm_backup_context',a);
 const latest=await checkWitness(env,j.organization_id,j.external_generation,{expected:manifest.witness_after,keys});
 const witness=await appendWitness(env,j.organization_id,j.external_generation,{id:j.id,kind:'backup_seal',source_id:j.id,source_digest:pointer.plaintext_digest,snapshot_digest:j.snapshot_digest,manifest_key:pointer.key,source_pointer:pointer},{expected:latest.head,control,keyId:j.key_id});
 await controlCheck(env,j.organization_id,j.external_generation,control);await call(env,'wm_backup_finish',{...a,p_pointer:pointer,p_witness:witness});return {state:'sealed',id:j.id};
}
export async function processTenantBackups(env,{call=machineRpc,...options}={}){
 const jobs=await call(env,'wm_backup_claim',{p_limit:2}),results=[];
 for(const j of jobs){try{results.push(await backupStep(env,j,{call,...options}));}catch(e){let recorded=true;try{await call(env,'wm_backup_release',{p_org:j.organization_id,p_id:j.id,p_lease:j.lease_token,p_reason:/^[a-z_]{1,80}$/.test(e.code||'')?e.code:'backup_failed'});}catch{recorded=false;}results.push({id:j.id,state:'attention',recorded});}}
 return results;
}
