import {canonical} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,byteDigest} from '../continuity/envelope.mjs';
import {getEncrypted,putEncrypted,decode,CHUNK_BYTES} from '../backups/objects.mjs';
import {deny} from './control.mjs';
import {checkWitness} from '../backups/witness.mjs';
// Bounded adaptation of the backup/offline contract: a latest tombstone MUST
// skip deleted bytes. Requiring or recopying them would undo retention.
export async function verifyCandidate(env,job,proof,{check=async()=>{}}={}){
 const keys=backupKeys(env),pointer=job.manifest_pointer;
 if(pointer.context?.type!=='tenant_backup_manifest'||pointer.context.organization_id!==job.organization_id)deny();
 const manifest=decode(await getEncrypted(env.RECOVERY_BYTES,pointer,keys,2097152+8212));
 if(manifest.format!=='wm-tenant-backup/1'||manifest.restore_authority!=='none'||manifest.organization_id!==job.organization_id||manifest.backup_id!==pointer.context.backup_id||manifest.external_generation!==pointer.context.external_generation||manifest.external_generation!==proof.source_generation||!Array.isArray(manifest.files)||manifest.files.length>500||!Array.isArray(manifest.parts)||manifest.parts.length>1600)deny();
 const chain=await checkWitness(env,job.organization_id,manifest.external_generation,{keys});
 if(canonical(chain.head)!==canonical(proof.head)||!chain.events.some(e=>e.kind==='backup_seal'&&e.source_id===manifest.backup_id&&canonical(e.source_pointer)===canonical(pointer)))deny('restore_backup_seal_not_in_checked_tail');
 const sources=[{id:'snapshot',n:Number(manifest.snapshot_bytes),digest:manifest.snapshot_digest},...manifest.files.map(f=>({id:f.id,n:Number(f.bytes),digest:f.sha256}))];
 if(new Set(sources.map(x=>x.id)).size!==sources.length||sources.reduce((n,x)=>n+x.n,0)>285212672)deny('restore_size_limit');
 let at=0,snapshot;const files=[];
 for(let i=0;i<sources.length;i++){
  const src=sources[i],index=i===0?'snapshot':i-1,purged=i>0&&proof.tombstones.includes(src.id);
  if(!Number.isSafeInteger(src.n)||src.n<1||src.n>(i===0?16777216:33554432)||!/^[a-f0-9]{64}$/.test(src.digest))deny();
  const bytes=purged?null:new Uint8Array(src.n),pointers=[];
  for(let off=0;off<src.n;off+=CHUNK_BYTES){
   const p=manifest.parts[at++],len=Math.min(CHUNK_BYTES,src.n-off),expected={type:'tenant_backup_chunk',organization_id:job.organization_id,external_generation:manifest.external_generation,backup_id:manifest.backup_id,source:index,offset:off,bytes:len,whole_digest:src.digest};
   if(!p||p.part!==index+'/'+off&&p.part!=='file/'+index+'/'+off||p.source!==index||p.offset!==off||p.length!==len||p.whole!==src.digest||canonical(p.pointer.context)!==canonical(expected))deny('restore_part_binding');
   if(purged)continue;await check();
   const chunk=await getEncrypted(env.RECOVERY_BYTES,p.pointer,keys);if(chunk.length!==len)deny();bytes.set(chunk,off);
   if(i>0){const context={type:'tenant_restore_file',organization_id:job.organization_id,external_generation:job.generation,run_id:job.id,source_id:src.id,offset:off,bytes:len,whole_digest:src.digest};
    pointers.push(await putEncrypted(env.RECOVERY_BYTES,'tenant-restores/'+job.organization_id+'/'+job.id+'/file/'+(i-1)+'/'+off+'.bin',chunk,context,keys,env.BACKUP_KEY_ID));}
  }
  if(!purged&&await byteDigest(bytes)!==src.digest)deny('restore_content_corrupt');
  if(i===0)snapshot=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  else files.push({source_id:src.id,sha256:src.digest,bytes:String(src.n),disposition:purged?'purged':'private_verified',pointers});
 }
 if(at!==manifest.parts.length)deny('restore_part_coverage');
 await check();return {snapshot,manifest,files};
}



export async function verifyRecoveryFiles(env,job,{check=async()=>{}}={}){
 const keys=backupKeys(env);
 for(const f of job.plan.files){
  if(f.disposition==='purged'){if(f.pointers.length)deny();continue;}
  const n=Number(f.bytes);if(!Number.isSafeInteger(n)||n<1||n>33554432||f.pointers.length!==Math.ceil(n/CHUNK_BYTES))deny();
  const whole=new Uint8Array(n);
  for(let i=0;i<f.pointers.length;i++){await check();const p=f.pointers[i],offset=i*CHUNK_BYTES,len=Math.min(CHUNK_BYTES,n-offset);
   const expected={type:'tenant_restore_file',organization_id:job.organization_id,external_generation:job.generation,run_id:job.id,source_id:f.source_id,offset,bytes:len,whole_digest:f.sha256};
   if(canonical(p.context)!==canonical(expected))deny();const bytes=await getEncrypted(env.RECOVERY_BYTES,p,keys);if(bytes.length!==len)deny();whole.set(bytes,offset);
  }
  if(await byteDigest(whole)!==f.sha256)deny('restore_content_corrupt');
 }
}
