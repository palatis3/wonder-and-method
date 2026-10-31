import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {body,json,secure,requireOrigin,limited} from '../http.mjs';
import {requireCsrf} from '../auth/session.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {randomSecret,hashSecret,credentialContext,sealCredential,openCredential} from './vault.mjs';
import {PROVIDERS,providerConfig,providerAvailability,authorizationUrl,exchangeCode,refreshTokens,providerFingerprint} from './oauth.mjs';
import {externalControl} from '../continuity/receipts.mjs';
async function currentControl(env,org,generation,readControl){const control=await readControl(env,org);if(!generation||control.external_generation!==generation||control.access_state!=='open')throw new WorkspaceError('recovery_restricted','This connection is unavailable during recovery.',503);}
const cookieName=id=>`__Host-wm_connect_${id}`;
const cookie=(id,value,age=600)=>`${cookieName(id)}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
function browserNonce(request,id){const values=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookieName(id)+'='));const value=values.length===1?values[0].slice(cookieName(id).length+1):'';if(!/^[A-Za-z0-9_-]{43}$/.test(value))throw new Error();return value;}
function actionKey(request){const key=request.headers.get('idempotency-key');if(!/^[A-Za-z0-9_-]{16,200}$/.test(key||''))throw new WorkspaceError('action_key','Reload and try this action again.');return key;}
export async function handleConnectionCallback(request,env,{machine=machineRpc,exchange=exchangeCode,readControl=externalControl}={}){
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/connections\/callback\/([a-z_]+)$/);if(!match)return null;
 if(request.method!=='GET')return json({error:{message:'Use the platform redirect to continue.'}},405);
 let id=null,claimed=null,target='/workspace/ads?connection=failed';
 try{
  await limited(env,`connect:${request.headers.get('cf-connecting-ip')||'unknown'}`);
  const provider=match[1],values=url.searchParams.getAll('state');if(!PROVIDERS[provider]||values.length!==1)throw new Error();
  const state=values[0],parts=state.split('.');if(parts.length!==2||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]))throw new Error();id=uuid(parts[0]);
  const nonce=browserNonce(request,id);
  claimed=await machine(env,'wm_connection_claim',{p_provider:provider,p_state_hash:await hashSecret(state),p_browser_hash:await hashSecret(nonce)});
  target=`/workspace/ads?business=${encodeURIComponent(claimed.organization_id)}&connection=failed`;
  if(claimed.id!==id||claimed.provider!==provider||providerConfig(env,provider).environment!==claimed.environment||url.searchParams.has('error')||url.searchParams.getAll(provider==='tiktok_ads'?'auth_code':'code').length!==1)throw new Error();
  const code=url.searchParams.get(provider==='tiktok_ads'?'auth_code':'code');if(!code||code.length>4096)throw new Error();
  const {verifier,config_fingerprint}=await openCredential(env,claimed.verifier_ciphertext,credentialContext(claimed,'oauth_verifier'));
  if(config_fingerprint!==await providerFingerprint(env,provider))throw new Error();
  await currentControl(env,claimed.organization_id,claimed.external_generation,readControl);
  const tokens=await exchange(env,provider,code,verifier);
  await currentControl(env,claimed.organization_id,claimed.external_generation,readControl);
  await machine(env,'wm_connection_complete',{p_org:claimed.organization_id,p_id:id,p_nonce:claimed.exchange_nonce,p_ciphertext:await sealCredential(env,tokens,credentialContext(claimed)),p_key_version:env.INTEGRATION_KEY_ID,p_expires_at:tokens.expires_at});
  target=`/workspace/ads?business=${encodeURIComponent(claimed.organization_id)}&connection=connected`;
 }catch{if(claimed)await machine(env,'wm_connection_failed',{p_org:claimed.organization_id,p_id:claimed.id,p_nonce:claimed.exchange_nonce}).catch(()=>{});}
 return secure(new Response(null,{status:303,headers:{Location:target,...(id?{'Set-Cookie':cookie(id,'',0)}:{})}}));
}
export async function connectionTokens(env,org,ticket,{machine=machineRpc,refresh=refreshTokens,readControl=externalControl}={}){
 let {connection:c,ticket:t}=await machine(env,'wm_connection_context',{p_org:org,p_ticket:ticket});
 await currentControl(env,org,t.external_generation,readControl);
 if(c.state!=='connected')throw new WorkspaceError('reconnect','This connection needs reauthorization before it can be used.',409);
 let tokens=await openCredential(env,c.ciphertext,credentialContext(c));
 if(tokens.config_fingerprint!==await providerFingerprint(env,c.provider))throw new WorkspaceError('reconnect','Reconnect this platform after the application configuration change.',409);
 if(c.expires_at&&Date.parse(c.expires_at)<=Date.now()+120000){
  if(!tokens.refresh_token)throw new WorkspaceError('reconnect','Reconnect this platform to renew access.',409);
  const lease=await machine(env,'wm_connection_refresh_begin',{p_org:org,p_ticket:ticket,p_version:c.version});
  // Never automatically retry a refresh whose result or persistence is uncertain.
  await currentControl(env,org,t.external_generation,readControl);
  tokens={...await refresh(env,c.provider,tokens),config_fingerprint:tokens.config_fingerprint};
  await currentControl(env,org,t.external_generation,readControl);
  await machine(env,'wm_connection_refresh_complete',{p_org:org,p_id:c.id,p_nonce:lease.nonce,p_ciphertext:await sealCredential(env,tokens,credentialContext(c)),p_key_version:env.INTEGRATION_KEY_ID,p_expires_at:tokens.expires_at});
  ({connection:c}=await machine(env,'wm_connection_context',{p_org:org,p_ticket:ticket}));
 }
 return {connection:c,tokens};
}
export async function handleConnections(request,env,session,{human=rpc,machine=machineRpc,accounts,readControl=externalControl}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/connections'))return null;
 if(request.method==='GET'&&url.pathname==='/api/connections')return json({providers:providerAvailability(env),connections:await human(env,session.access_token,'wm_connections',{p_org:uuid(url.searchParams.get('business'))})});
 if(request.method!=='POST')return json({error:{message:'Connection route unavailable.'}},404);
 requireOrigin(request,env);requireCsrf(request,session);await limited(env,`connect:${request.headers.get('cf-connecting-ip')||'unknown'}`);
 const input=await body(request,8192),org=uuid(input.organization_id),key=actionKey(request);
 if(url.pathname==='/api/connections/start'){
  const p=providerConfig(env,input.provider),id=crypto.randomUUID(),verifier=randomSecret(),nonce=randomSecret(),state=`${id}.${randomSecret()}`;
  const row={organization_id:org,id,engagement_id:uuid(input.engagement_id),provider:input.provider,environment:p.environment};
  const authorize=await authorizationUrl(env,input.provider,state,verifier);
  await human(env,session.access_token,'wm_connection_start',{p_org:org,p_input:{id,engagement_id:row.engagement_id,provider:row.provider,environment:row.environment,state_hash:await hashSecret(state),browser_hash:await hashSecret(nonce),verifier_ciphertext:await sealCredential(env,{verifier,config_fingerprint:await providerFingerprint(env,input.provider)},credentialContext(row,'oauth_verifier'))},p_key:key});
  return json({authorization_url:authorize},200,{'Set-Cookie':cookie(id,nonce)});
 }
 if(url.pathname==='/api/connections/disconnect')return json(await human(env,session.access_token,'wm_connection_disconnect',{p_org:org,p_input:{connection_id:uuid(input.connection_id),expected_version:input.expected_version},p_key:key}));
 if(['/api/connections/discover','/api/connections/bind'].includes(url.pathname)){
  if(!accounts)throw new WorkspaceError('connection_setup','Account verification is being configured.',503);
  const bind=url.pathname.endsWith('/bind'),purpose=bind?'bind':'discover';
  const t=await human(env,session.access_token,'wm_connection_ticket',{p_org:org,p_input:{connection_id:uuid(input.connection_id),purpose,...(bind?{account_id:input.account_id,...(input.manager_id?{manager_id:input.manager_id}:{})}:{})},p_key:key});
  const {connection:c,tokens}=await connectionTokens(env,org,t.id,{machine,readControl});
  const observed=await accounts(env,c,tokens,bind?{account_id:input.account_id,manager_id:input.manager_id}:null);
  // Recheck session, membership and generation after the provider read.
  const fresh=await machine(env,'wm_connection_context',{p_org:org,p_ticket:t.id});
  await currentControl(env,org,fresh.ticket.external_generation,readControl);
  if(bind)return json(await machine(env,'wm_connection_bind',{p_org:org,p_ticket:t.id,p_observation:observed}));
  await machine(env,'wm_connection_discovered',{p_org:org,p_ticket:t.id});return json({accounts:observed});
 }
 return json({error:{message:'Connection route unavailable.'}},404);
}
