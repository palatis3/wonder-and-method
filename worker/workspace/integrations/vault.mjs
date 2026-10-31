import {canonical,WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
export const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
const fail=()=>{throw new WorkspaceError('credential_unavailable','This connection needs attention. Reconnect it from the workspace.',503);};
export const randomSecret=()=>base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function hashSecret(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
export async function pkceChallenge(value){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
export function credentialContext(row,purpose='provider_tokens'){
 if(!['provider_tokens','oauth_verifier'].includes(purpose)||!['test','production'].includes(row.environment)||!['google_ads','analytics','search_console','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads'].includes(row.provider))fail();
 return {purpose,organization_id:uuid(row.organization_id),id:uuid(row.id),engagement_id:uuid(row.engagement_id),provider:row.provider,environment:row.environment};
}
async function key(env,id){
 try{const ring=JSON.parse(env.INTEGRATION_KEYS),bytes=decode(ring[id]);if(bytes.length!==32)fail();return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}catch{fail();}
}
export async function sealCredential(env,value,context){
 const id=env.INTEGRATION_KEY_ID;if(!/^[A-Za-z0-9_-]{1,60}$/.test(id||''))fail();
 const raw=encoder.encode(JSON.stringify(value));if(raw.length>20000)fail();const iv=crypto.getRandomValues(new Uint8Array(12)),aad=encoder.encode(canonical({version:1,key_id:id,...context}));
 const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await key(env,id),raw));
 return `v1.${id}.${base64url(iv)}.${base64url(bytes)}`;
}
export async function openCredential(env,ciphertext,context){
 try{if(typeof ciphertext!=='string'||ciphertext.length>32768)fail();const [version,id,nonce,cipher,...extra]=ciphertext.split('.');if(version!=='v1'||extra.length||!/^[A-Za-z0-9_-]{1,60}$/.test(id))fail();
  const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(nonce),additionalData:encoder.encode(canonical({version:1,key_id:id,...context}))},await key(env,id),decode(cipher));return JSON.parse(decoder.decode(raw));
 }catch{fail();}
}
