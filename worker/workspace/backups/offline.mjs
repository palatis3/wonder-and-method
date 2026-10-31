import {checkWitness} from './witness.mjs';
import {byteDigest} from '../continuity/envelope.mjs';
import {getEncrypted,decode,fail,CHUNK_BYTES} from './objects.mjs';
// Offline-only exact-key loader + retained keyring. No SQL import, key creation,
// key printing/persistence, network access, authority or provider execution.
export async function verifyOfflineBackup({load,manifestPointer,keyring,onVerifiedChunk=async()=>{}}){
 const bucket={get:load},manifest=decode(await getEncrypted(bucket,manifestPointer,keyring,2097152+8212));
 if(manifest.format!=='wm-tenant-backup/1'||manifest.restore_authority!=='none'||!Array.isArray(manifest.parts)||manifest.parts.length>1200||!Array.isArray(manifest.files)||manifest.files.length>500)fail();
 const sources=[{source:'snapshot',n:manifest.snapshot_bytes,digest:manifest.snapshot_digest},...manifest.files.map((f,i)=>({source:i,n:Number(f.bytes),digest:f.sha256}))];
 if(sources.reduce((n,s)=>n+s.n,0)>285212672)fail();let index=0;
 for(const source of sources){
  if(!Number.isSafeInteger(source.n)||source.n<1||source.n>33554432||! /^[a-f0-9]{64}$/.test(source.digest))fail();
  const whole=new Uint8Array(source.n);
  for(let at=0;at<source.n;at+=CHUNK_BYTES){const part=manifest.parts[index++],length=Math.min(CHUNK_BYTES,source.n-at),name=source.source==='snapshot'?`snapshot/${at}`:`file/${source.source}/${at}`;
   if(!part||part.part!==name||part.source!==source.source||part.offset!==at||part.length!==length||part.whole!==source.digest)fail();
   const context=part.pointer.context;if(context.backup_id!==manifest.backup_id||context.organization_id!==manifest.organization_id||context.external_generation!==manifest.external_generation||context.type!=='tenant_backup_chunk'||context.source!==source.source||context.offset!==at||context.bytes!==length||context.whole_digest!==source.digest)fail();
   const bytes=await getEncrypted(bucket,part.pointer,keyring);if(bytes.length!==length)fail();whole.set(bytes,at);
  }
  if(await byteDigest(whole)!==source.digest)fail();await onVerifiedChunk({source:source.source,bytes:whole,sha256:source.digest});
 }
 if(index!==manifest.parts.length)fail();
 return {backup_id:manifest.backup_id,organization_id:manifest.organization_id,verified_parts:index,manifest_sha256:manifestPointer.plaintext_digest,tail_assessment:manifest.tail_assessment,freshness:'Requires independently retained latest witness checkpoint and current witness comparison',restore_authority:'none'};
}

export async function verifyOfflineWitness({loadWitness,loadBytes,organizationId,generation,keyring,expected}){
 if(!expected)fail('witness_anchor_required');
 const result=await checkWitness({RECOVERY_WITNESS:{get:loadWitness},RECOVERY_BYTES:{get:loadBytes}},organizationId,generation,{keys:keyring,expected});
 return {head:result.head,anchored:result.anchored,checked_events:result.events.length,complete_to_genesis:result.complete_to_genesis};
}
