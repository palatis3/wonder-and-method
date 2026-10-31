import {WorkspaceError,canonical} from '../../../src/workspace/domain/contracts.mjs';
import {config,providerFetch} from '../http.mjs';
import {pkceChallenge,hashSecret} from './vault.mjs';
export async function metaProof(secret,token){const e=new TextEncoder(),key=await crypto.subtle.importKey('raw',e.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,e.encode(token))),x=>x.toString(16).padStart(2,'0')).join('');}
const google={family:'GOOGLE',authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',pkce:true,refresh:true};
export const PROVIDERS=Object.freeze({
 google_ads:{...google,name:'Google Ads',scopes:['https://www.googleapis.com/auth/adwords']},
 analytics:{...google,name:'Google Analytics',scopes:['https://www.googleapis.com/auth/analytics.readonly']},
 search_console:{...google,name:'Google Search Console',scopes:['https://www.googleapis.com/auth/webmasters.readonly']},
 microsoft_ads:{name:'Microsoft Advertising',family:'MICROSOFT',authorize:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',token:'https://login.microsoftonline.com/common/oauth2/v2.0/token',pkce:true,refresh:true,scopes:['https://ads.microsoft.com/msads.manage','offline_access']},
 linkedin_ads:{name:'LinkedIn Ads',family:'LINKEDIN',authorize:'https://www.linkedin.com/oauth/v2/authorization',token:'https://www.linkedin.com/oauth/v2/accessToken',pkce:false,refresh:true,scopes:['rw_ads','r_ads_reporting']},
 meta_ads:{name:'Facebook and Instagram Ads',family:'META',authorize:'https://www.facebook.com/v26.0/dialog/oauth',token:'https://graph.facebook.com/v26.0/oauth/access_token',pkce:false,refresh:false,scopes:['ads_read','ads_management','pages_read_engagement','pages_show_list']},
 tiktok_ads:{name:'TikTok Ads',family:'TIKTOK',token:'https://business-api.tiktok.com/open_api/v2.0/oauth2/access_token/',pkce:false,refresh:false,scopes:[]},
});
const unavailable=()=>{throw new WorkspaceError('connection_setup','This platform connection is still being configured. Your studio can help.',503);};
export function providerConfig(env,provider){
 const p=PROVIDERS[provider];if(!p||p.pending)unavailable();
 const client_id=env[`${p.family}_CLIENT_ID`],client_secret=env[`${p.family}_CLIENT_SECRET`],environment=env[`${provider.toUpperCase()}_ACCOUNT_ENVIRONMENT`]||env[`${p.family}_ACCOUNT_ENVIRONMENT`];
 if(!client_id||!client_secret||!['test','production'].includes(environment)||env[`${provider.toUpperCase()}_OAUTH_ENABLED`]!=='true')unavailable();
 const redirect_uri=`${config(env).origin}/api/connections/callback/${provider}`;
 if(p.family==='META'&&(!env.META_LOGIN_CONFIG_ID||environment!=='production'))unavailable();
 let authorize=p.authorize,permissionIds;
 if(p.family==='TIKTOK'){
  try{const url=new URL(env.TIKTOK_AUTHORIZATION_URL);if(url.origin!=='https://business-api.tiktok.com'||url.username||url.password||url.hash||url.searchParams.get('app_id')!==client_id||url.searchParams.get('redirect_uri')!==redirect_uri)unavailable();authorize=url.href;permissionIds=JSON.parse(env.TIKTOK_REQUIRED_PERMISSION_IDS);if(!Array.isArray(permissionIds)||!permissionIds.length||permissionIds.some(x=>typeof x!=='string'||!/^\d+$/.test(x))||environment!=='production')unavailable();}catch{unavailable();}
 }
 return {...p,authorize,client_id,client_secret,environment,redirect_uri,...(p.family==='META'?{config_id:env.META_LOGIN_CONFIG_ID}:{}),...(permissionIds?{permissionIds}:{})};
}
export async function providerFingerprint(env,provider){const {client_secret,...settings}=providerConfig(env,provider);return hashSecret(canonical(settings));}
export function providerAvailability(env){return Object.entries(PROVIDERS).map(([id,p])=>{let enabled=false;try{providerConfig(env,id);enabled=true;}catch{}return {id,name:p.name,enabled};});}
export async function authorizationUrl(env,provider,state,verifier){
 const p=providerConfig(env,provider),url=new URL(p.authorize);
 if(p.family==='TIKTOK'){url.searchParams.set('state',state);return url.href;}
 const params={client_id:p.client_id,redirect_uri:p.redirect_uri,response_type:'code',scope:p.scopes.join(' '),state};
 if(p.pkce)Object.assign(params,{code_challenge:await pkceChallenge(verifier),code_challenge_method:'S256'});
 if(p.family==='GOOGLE')Object.assign(params,{access_type:'offline',prompt:'consent'});
 if(p.family==='MICROSOFT')params.prompt='select_account';
 if(p.family==='META'){params.config_id=p.config_id;delete params.scope;}
 url.search=new URLSearchParams(params);return url.href;
}
export async function readProviderJson(response,maxBytes=1048576){
 const reader=response.body?.getReader();if(!reader)throw new Error('Missing provider response');let length=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();throw new Error('Oversized provider response');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 // Preserve large numeric identifiers (notably TikTok permission IDs) before JSON.parse rounds them.
 return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,token=>token[0]!=='"'&&/^-?\d+$/.test(token)&&!Number.isSafeInteger(Number(token))?JSON.stringify(token):token));
}
async function tokenRequest(p,params,previous,fetcher){
 try{
  const response=await providerFetch(p.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:p.client_id,client_secret:p.client_secret,...params}).toString()},fetcher);
  const data=await readProviderJson(response,32768);
  if(!response.ok||data.error||typeof data.access_token!=='string'||data.access_token.length<10||data.access_token.length>16000||data.token_type&&data.token_type.toLowerCase()!=='bearer')throw new Error();
  const seconds=Number(data.expires_in);if(!Number.isFinite(seconds)||seconds<=0||seconds>31536000)throw new Error();
  const scopes=typeof data.scope==='string'?data.scope.split(/[ ,]+/):previous?.scopes||p.scopes;
  if(p.scopes.filter(x=>x!=='offline_access').some(x=>!scopes.includes(x)))throw new Error();
  const refresh_token=data.refresh_token||previous?.refresh_token;
  if(refresh_token&&(typeof refresh_token!=='string'||refresh_token.length>16000))throw new Error();
  return {access_token:data.access_token,...(refresh_token?{refresh_token}:{}),scopes,expires_at:new Date(Date.now()+seconds*1000).toISOString()};
 }catch{throw new WorkspaceError('connection_exchange','Authorization could not be confirmed. Reconnect this platform; the earlier authorization will not be retried.',503);}
}
async function metaExchange(p,code,fetcher){
 const url=new URL(p.token);url.search=new URLSearchParams({client_id:p.client_id,client_secret:p.client_secret,redirect_uri:p.redirect_uri,code});
 const response=await providerFetch(url,{method:'GET'},fetcher),data=await readProviderJson(response,32768);
 if(!response.ok||data.error||typeof data.access_token!=='string'||data.access_token.length<10||data.access_token.length>16000)throw new Error();
 const debug=new URL('https://graph.facebook.com/v26.0/debug_token');debug.search=new URLSearchParams({input_token:data.access_token});
 const check=await providerFetch(debug,{headers:{Authorization:`Bearer ${p.client_id}|${p.client_secret}`}},fetcher),info=await readProviderJson(check,32768),d=info.data;
 if(!check.ok||!d?.is_valid||String(d.app_id)!==p.client_id||d.type!=='SYSTEM_USER'||!Array.isArray(d.scopes)||p.scopes.some(s=>!d.scopes.includes(s))||!d.user_id)throw new Error();
 const proof=await metaProof(p.client_secret,data.access_token);
 const me=await providerFetch('https://graph.facebook.com/v26.0/me?fields=id,client_business_id&appsecret_proof='+proof,{headers:{Authorization:`Bearer ${data.access_token}`}},fetcher),principal=await readProviderJson(me,32768);
 if(!me.ok||String(principal.id)!==String(d.user_id)||!principal.client_business_id)throw new Error();
 const expiry=Number(d.expires_at);if(!Number.isSafeInteger(expiry)||expiry<0||expiry>0&&expiry*1000<=Date.now())throw new Error();
 return {access_token:data.access_token,scopes:d.scopes,expires_at:expiry?new Date(expiry*1000).toISOString():null,token_class:'meta_business_system_user',principal_id:String(d.user_id),client_business_id:String(principal.client_business_id)};
}
async function tiktokExchange(p,code,fetcher){
 const response=await providerFetch(p.token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:p.client_id,secret:p.client_secret,auth_code:code,is_long_term:true,return_advertiser_ids:true})},fetcher),result=await readProviderJson(response,32768),data=result.data;
 if(!response.ok||result.code!==0||typeof data?.access_token!=='string'||data.access_token.length<10||data.access_token.length>16000||!Array.isArray(data.scope))throw new Error();
 const scopes=data.scope.map(x=>{if(typeof x==='number'&&!Number.isSafeInteger(x))throw new Error();return String(x);});if(p.permissionIds.some(x=>!scopes.includes(x)))throw new Error();
 return {access_token:data.access_token,scopes,expires_at:null,token_class:'tiktok_advertiser_long_term'};
}
export async function exchangeCode(env,provider,code,verifier,fetcher=fetch){
 const p=providerConfig(env,provider);let tokens;
 try{tokens=p.family==='META'?await metaExchange(p,code,fetcher):p.family==='TIKTOK'?await tiktokExchange(p,code,fetcher):await tokenRequest(p,{grant_type:'authorization_code',code,redirect_uri:p.redirect_uri,...(p.pkce?{code_verifier:verifier}:{})},null,fetcher);}
 catch{throw new WorkspaceError('connection_exchange','Authorization could not be confirmed. Reconnect this platform; the earlier authorization will not be retried.',503);}
 return {...tokens,config_fingerprint:await providerFingerprint(env,provider)};
}
export async function refreshTokens(env,provider,previous,fetcher=fetch){const p=providerConfig(env,provider);if(!p.refresh||!previous.refresh_token)throw new WorkspaceError('reconnect','Reconnect this platform to renew access.',409);return tokenRequest(p,{grant_type:'refresh_token',refresh_token:previous.refresh_token,...(p.family==='MICROSOFT'?{scope:p.scopes.join(' ')}:{})},previous,fetcher);}
