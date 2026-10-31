import {WorkspaceError,canonical} from '../../../src/workspace/domain/contracts.mjs';
import {providerFetch} from '../http.mjs';
import {readBounded} from '../files/content.mjs';
import {metaProof} from '../integrations/oauth.mjs';
const origins={google_ads:['https://googleads.googleapis.com'],meta_ads:['https://graph.facebook.com'],microsoft_ads:['https://campaign.api.bingads.microsoft.com','https://clientcenter.api.bingads.microsoft.com'],tiktok_ads:['https://business-api.tiktok.com'],linkedin_ads:['https://api.linkedin.com']};
const fail=(code,dispatched=false)=>{const e=new WorkspaceError(code,'Advertising access or the provider result needs verification.',503);e.effect_dispatched=dispatched;throw e;};
function validate(request,identity){
 if(!request||request.schema!=='wm-native-request/1'||request.provider!==identity.provider||request.environment!=='production'||identity.environment!=='production'||request.account_id!==identity.account_id||request.automatic_retry!==false||typeof request.write!=='boolean'||request.operation!==(request.write?'mutation':'query')||!['GET','POST','PUT'].includes(request.method)||request.body!==null&&typeof request.body!=='string')fail('ads_request_binding');
 let url;try{url=new URL(request.url);}catch{fail('ads_request_binding');}
 if(!origins[identity.provider]?.includes(url.origin)||url.username||url.password||url.hash||url.href!==request.url||request.write&&url.origin==='https://clientcenter.api.bingads.microsoft.com'||request.method==='GET'&&request.body!==null)fail('ads_request_binding');
 if(['access_token','appsecret_proof','authorization'].some(k=>url.searchParams.has(k)))fail('ads_request_binding');
 if(identity.provider==='google_ads'&&!url.pathname.startsWith('/v26/customers/'+identity.account_id+'/'))fail('ads_request_binding');
 if(identity.provider==='meta_ads'&&/^\/v25\.0\/act_/.test(url.pathname)&&!url.pathname.startsWith('/v25.0/act_'+identity.account_id+'/')&&url.pathname!=='/v25.0/act_'+identity.account_id)fail('ads_request_binding');
 if(identity.provider==='linkedin_ads'&&url.pathname.startsWith('/rest/adAccounts/')&&!url.pathname.startsWith('/rest/adAccounts/'+identity.account_id+'/')&&url.pathname!=='/rest/adAccounts/'+identity.account_id)fail('ads_request_binding');
 const c=request.credential_context;if(!c||c.account_id!==identity.account_id||canonical(c)!==canonical({account_id:identity.account_id,...(identity.manager_id?{manager_id:identity.manager_id}:{}),...(identity.customer_id?{customer_id:identity.customer_id}:{})}))fail('ads_request_binding');
 if(Object.keys(request.headers||{}).some(k=>!['content-type','linkedin-version','x-restli-protocol-version','x-restli-method'].includes(k.toLowerCase())))fail('ads_request_binding');
 return url;
}
async function authentication(env,identity,tokens,url){
 if(typeof tokens?.access_token!=='string'||!tokens.access_token||/[\r\n]/.test(tokens.access_token))fail('ads_connection_unavailable');
 const headers={Authorization:'Bearer '+tokens.access_token};
 if(identity.provider==='google_ads'){
  if(typeof env.GOOGLE_ADS_DEVELOPER_TOKEN!=='string'||!env.GOOGLE_ADS_DEVELOPER_TOKEN)fail('ads_connection_unavailable');headers['developer-token']=env.GOOGLE_ADS_DEVELOPER_TOKEN;if(identity.manager_id)headers['login-customer-id']=identity.manager_id;
 }else if(identity.provider==='meta_ads'){
  if(!env.META_CLIENT_SECRET)fail('ads_connection_unavailable');url.searchParams.set('appsecret_proof',await metaProof(env.META_CLIENT_SECRET,tokens.access_token));
 }else if(identity.provider==='microsoft_ads'){
  if(!env.MICROSOFT_DEVELOPER_TOKEN||!identity.customer_id)fail('ads_connection_unavailable');headers.DeveloperToken=env.MICROSOFT_DEVELOPER_TOKEN;
  if(url.origin==='https://campaign.api.bingads.microsoft.com'){headers.CustomerAccountId=identity.account_id;headers.CustomerId=identity.customer_id;}
 }else if(identity.provider==='tiktok_ads'){delete headers.Authorization;headers['Access-Token']=tokens.access_token;}
 return headers;
}
// One transport belongs to one kernel attempt. The caller still must register a
// durable dispatch reservation: this in-memory guard cannot survive termination.
export function nativeTransport(env,identity,tokens,{authorize,reserve,fetcher=fetch,maxResponse=2097152}={}){
 if(typeof authorize!=='function'||!Number.isSafeInteger(maxResponse)||maxResponse<1||maxResponse>8388608)fail('ads_transport_configuration');
 let mutationReserved=false;
 return async function call(request,{write=false}={}){
  request={...request,headers:{...request?.headers},credential_context:{...request?.credential_context}};
  const url=validate(request,identity);if(write!==request.write)fail('ads_request_classification');
  if(request.write&&mutationReserved)fail('ads_duplicate_dispatch',true);
  if(request.write&&typeof reserve!=='function')fail('ads_transport_configuration');
  if(request.write)mutationReserved=true;
  // Header/proof construction does not mutate the frozen request or its exact
  // reviewed body. Authentication never enters a journal or returned response.
  const headers={...request.headers,...await authentication(env,identity,tokens,url)};
  await authorize();
  if(request.write){await reserve(request);await authorize();}
  let response;
  try{response=await providerFetch(url.href,{method:request.method,headers,...(request.body!==null?{body:request.body}:{})},fetcher);}catch{fail(request.write?'ads_write_unknown':'ads_read_unavailable',request.write);}
  let raw;try{raw=response.body?new TextDecoder('utf-8',{fatal:true}).decode(await readBounded(response.body,maxResponse)):'';}catch{fail(request.write?'ads_write_unknown':'ads_read_unavailable',request.write);}
  if(!response.ok)fail(request.write?'ads_write_unknown':'ads_read_unavailable',request.write);
  return {status:response.status,body:raw,headers:Object.fromEntries(['request-id','x-restli-id','x-fb-trace-id','x-tt-logid','trackingid'].flatMap(name=>response.headers.has(name)?[[name,response.headers.get(name)]]:[]))};
 };
}
