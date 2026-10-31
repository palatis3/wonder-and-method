import {canonical,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=()=>{throw new WorkspaceError('backup_integrity','Recovery evidence could not be verified.',503);};
const base64=bytes=>btoa(String.fromCharCode(...bytes));
const unbase64=value=>Uint8Array.from(atob(value),x=>x.charCodeAt(0));
export async function byteDigest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
async function encryptionKey(keyring,id){
  try{const bytes=unbase64(keyring[id]);if(bytes.length!==32)fail();return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}catch{fail();}
}
export function backupKeys(env){
  try{const keys=JSON.parse(env.BACKUP_KEYS);if(!env.BACKUP_KEY_ID||!Object.hasOwn(keys,env.BACKUP_KEY_ID)||!/^[A-Za-z0-9_-]{1,60}$/.test(env.BACKUP_KEY_ID))fail();return keys;}catch{fail();}
}
export async function sealBytes(bytes,context,keyring,keyId){
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const header=encoder.encode(canonical({format:1,key_id:keyId,nonce:base64(nonce),context,plaintext_sha256:await byteDigest(bytes)}));
  if(header.length>8192)fail();
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:header},await encryptionKey(keyring,keyId),bytes));
  const envelope=new Uint8Array(4+header.length+ciphertext.length);new DataView(envelope.buffer).setUint32(0,header.length);envelope.set(header,4);envelope.set(ciphertext,4+header.length);return envelope;
}
export async function openBytes(envelope,context,keyring){
  try{
    if(envelope.length<20)fail();const size=new DataView(envelope.buffer,envelope.byteOffset,envelope.byteLength).getUint32(0);
    if(size<2||size>8192||size+20>envelope.length)fail();
    const headerBytes=envelope.slice(4,4+size),header=JSON.parse(decoder.decode(headerBytes));
    if(header.format!==1||canonical(header.context)!==canonical(context))fail();
    const plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(header.nonce),additionalData:headerBytes},await encryptionKey(keyring,header.key_id),envelope.slice(4+size)));
    if(await byteDigest(plaintext)!==header.plaintext_sha256)fail();return plaintext;
  }catch{fail();}
}
