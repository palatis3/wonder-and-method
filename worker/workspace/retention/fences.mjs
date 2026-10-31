import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,byteDigest,openBytes} from '../continuity/envelope.mjs';
import {encode,decode,objectBytes,putEncrypted} from '../backups/objects.mjs';
import {fail} from './storage.mjs';
async function location(env,identity,type){
 if(!env.RECOVERY_BYTES)fail('independent_object_fence');
 if(!identity||!['supabase','r2'].includes(identity.backend)||!['workspace-sealed','workspace-inbound','workspace-customer-exports'].includes(identity.bucket)||typeof identity.key!=='string'||identity.key.includes('..'))fail('independent_object_fence');
 const value={backend:identity.backend,bucket:identity.bucket,key:identity.key,storage_target:identity.storage_target??null},digest=await byteDigest(encode(value));
 return {value,key:`storage-object-fences/${digest}/${type}.bin`,context:{type:'storage_object_'+type,identity_digest:digest},keys:backupKeys(env)};
}
async function read(env,p){
 const obj=await env.RECOVERY_BYTES.get(p.key);if(!obj)return null;
 const record=decode(await openBytes(await objectBytes(obj,16384),p.context,p.keys));
 if(record.format!=='wm-storage-object-fence/1'||canonical(record.identity)!==canonical(p.value))fail('independent_object_fence');return record;
}
export async function assertObjectWritable(env,identity){
 const p=await location(env,identity,'no_recreate');if(await read(env,p))fail('independent_object_fenced');
}
// Independent of primary SQL: rollback cannot erase the first canonical POST.
// A prior claim permits only GET readback, including after an unknown outcome.
export async function claimObjectWrite(env,identity){
 await assertObjectWritable(env,identity);const p=await location(env,identity,'write_once');if(await read(env,p))return false;
 const record={format:'wm-storage-object-fence/1',identity:p.value,claim:crypto.randomUUID()};
 try{await putEncrypted(env.RECOVERY_BYTES,p.key,encode(record),p.context,p.keys,env.BACKUP_KEY_ID,{max:4096});}
 catch{const existing=await read(env,p);if(!existing)throw Error('Independent object claim unconfirmed');if(existing.claim!==record.claim)return false;}
 await assertObjectWritable(env,identity);return true;
}
export async function markObjectNoRecreate(env,org,inventory,job){
 const p=await location(env,inventory,'no_recreate'),record={format:'wm-storage-object-fence/1',identity:p.value,organization_id:uuid(org),job_id:uuid(job.id),dispatch_id:uuid(job.dispatch_id),attempt_nonce:uuid(job.attempt_nonce)};
 await putEncrypted(env.RECOVERY_BYTES,p.key,encode(record),p.context,p.keys,env.BACKUP_KEY_ID,{max:4096});
 const found=await read(env,p);if(canonical(found)!==canonical(record))fail('independent_object_fence');
}
