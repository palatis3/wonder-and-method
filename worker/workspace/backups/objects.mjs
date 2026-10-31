import {canonical,uuid,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,sealBytes,openBytes,byteDigest} from '../continuity/envelope.mjs';
import {readBounded} from '../files/content.mjs';
export const CHUNK_BYTES=262144;
export const fail=(code='backup_integrity')=>{throw new WorkspaceError(code,'Tenant backup evidence needs verification.',503);};
export const encode=x=>new TextEncoder().encode(canonical(x));
export const decode=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
export function namespace(org,generation){uuid(org);if(!/^[A-Za-z0-9_-]{8,100}$/.test(generation||''))fail();return `${org}/${generation}`;}
export async function objectBytes(object,max){if(!object||!Number.isSafeInteger(object.size)||object.size<1||object.size>max||!object.body)fail('backup_missing_bytes');return readBounded(object.body,max);}
export async function getEncrypted(bucket,pointer,keys,max=CHUNK_BYTES+8212){
 if(!pointer||typeof pointer.key!=='string'||! /^[a-f0-9]{64}$/.test(pointer.ciphertext_digest||''))fail();
 const bytes=await objectBytes(await bucket.get(pointer.key),max);if(await byteDigest(bytes)!==pointer.ciphertext_digest)fail();
 const plain=await openBytes(bytes,pointer.context,keys);if(await byteDigest(plain)!==pointer.plaintext_digest||plain.length!==pointer.bytes)fail();return plain;
}
// Exact-key create-only writes are safe to resume. AES nonces are freshly random;
// existing authenticated bytes win, never overwrite or compare only ETags.
export async function putEncrypted(bucket,key,plain,context,keys,keyId,{max=CHUNK_BYTES}={}){
 if(!bucket||!key||key.includes('..')||plain.length>max||!Object.hasOwn(keys,keyId))fail('backup_configuration');
 const digest=await byteDigest(plain);let obj=await bucket.get(key);
 if(!obj){const bytes=await sealBytes(plain,context,keys,keyId);try{await bucket.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/octet-stream'}});}catch{/* Exact readback resolves accepted writes. */}obj=await bucket.get(key);}
 if(!obj)fail('backup_write_unknown');const bytes=await objectBytes(obj,max+8212),opened=await openBytes(bytes,context,keys);
 if(opened.length!==plain.length||await byteDigest(opened)!==digest)fail('backup_immutable_conflict');
 return {key,context,plaintext_digest:digest,ciphertext_digest:await byteDigest(bytes),bytes:plain.length,key_id:envelopeKeyId(bytes)};
}
export function envelopeKeyId(bytes){try{const n=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);if(n<2||n>8192)fail();const id=decode(bytes.subarray(4,4+n)).key_id;if(!/^[A-Za-z0-9_-]{1,60}$/.test(id))fail();return id;}catch{fail();}}
export function configuredKeys(env,keyId){const keys=backupKeys(env);if(!Object.hasOwn(keys,keyId))fail('backup_key_missing');return keys;}

// Bridge existing receipt/attempt journals without rewriting their envelopes.
export async function readEvidencePointer(bucket,key,context,keys,expectedCiphertext){
 const bytes=await objectBytes(await bucket.get(key),1048576),digest=await byteDigest(bytes);if(digest!==expectedCiphertext)fail();
 const plain=await openBytes(bytes,context,keys);return {key,context,plaintext_digest:await byteDigest(plain),ciphertext_digest:digest,bytes:plain.length,key_id:envelopeKeyId(bytes)};
}
