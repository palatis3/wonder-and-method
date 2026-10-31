import {sealBytes,openBytes} from '../continuity/envelope.mjs';
import {portalUrl,fail} from './provider.mjs';
function keys(env){try{const k=JSON.parse(env.PORTAL_KEYS);if(!env.PORTAL_KEY_ID||!k[env.PORTAL_KEY_ID])fail();return k;}catch{fail();}}
export function secretContext(c,attempt,expires){return {type:'portal_url',request_id:c.request_id,organization_id:c.organization_id,user_id:c.user_id,session_id:c.session_id,account_id:c.account_id,environment:c.environment,sandbox_id:c.sandbox_id,customer_id:c.customer_id,configuration_id:c.configuration_id,configuration_digest:c.configuration_digest,external_generation:c.external_generation,authority_version:c.authority_version,attempt_id:attempt.id,dispatch_nonce:attempt.dispatch_nonce,expires_at:expires};}
export async function encryptPortalUrl(env,url,context){const bytes=await sealBytes(new TextEncoder().encode(portalUrl(url)),context,keys(env),env.PORTAL_KEY_ID);return btoa(String.fromCharCode(...bytes));}
export async function decryptPortalUrl(env,ciphertext,context,{now=Date.now()}={}){
 if(typeof ciphertext!=='string'||ciphertext.length>16000||Date.parse(context.expires_at)<=now)fail();
 try{return portalUrl(new TextDecoder('utf-8',{fatal:true}).decode(await openBytes(Uint8Array.from(atob(ciphertext),x=>x.charCodeAt(0)),context,keys(env))));}catch{fail();}
}
