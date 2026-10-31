import test from 'node:test';
import assert from 'node:assert/strict';
import {handleConnections,handleConnectionCallback,connectionTokens} from '../../worker/workspace/integrations/service.mjs';
import {authorizationUrl,exchangeCode,refreshTokens,providerFingerprint} from '../../worker/workspace/integrations/oauth.mjs';
import {readAccounts} from '../../worker/workspace/integrations/accounts.mjs';
import {openCredential,sealCredential,credentialContext,hashSecret} from '../../worker/workspace/integrations/vault.mjs';
const env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-public',LOCAL_TEST_MODE:'true',INTEGRATION_KEY_ID:'one',INTEGRATION_KEYS:JSON.stringify({one:Buffer.alloc(32,9).toString('base64url')}),GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret',GOOGLE_ACCOUNT_ENVIRONMENT:'production',GOOGLE_ADS_OAUTH_ENABLED:'true',ANALYTICS_OAUTH_ENABLED:'true',SEARCH_CONSOLE_OAUTH_ENABLED:'true'};
const readControl=async()=>({access_state:'open',external_generation:'synthetic-generation'});
const org=crypto.randomUUID(),engagement=crypto.randomUUID(),session={access_token:'synthetic-user-token',csrf:'synthetic-csrf'};
const post=(path,data)=>new Request(env.APP_ORIGIN+path,{method:'POST',headers:{origin:env.APP_ORIGIN,'content-type':'application/json','x-csrf-token':session.csrf,'idempotency-key':crypto.randomUUID()},body:JSON.stringify({organization_id:org,...data})});
test('start and callback keep verifier and token out of browser JSON and enforce one-use browser binding without a session cookie',async()=>{
 let start,claimed=false,stored,exchanges=0;
 const response=await handleConnections(post('/api/connections/start',{engagement_id:engagement,provider:'google_ads'}),env,session,{human:async(e,t,n,args)=>{assert.equal(n,'wm_connection_start');start=args.p_input;return {id:start.id};}});
 const result=await response.json(),url=new URL(result.authorization_url),cookie=response.headers.get('set-cookie').split(';')[0];
 assert.match(response.headers.get('set-cookie'),/SameSite=Lax/);assert.ok(!JSON.stringify(result).includes('verifier'));assert.equal(await hashSecret(url.searchParams.get('state')),start.state_hash);
 const row={...start,organization_id:org,external_generation:'synthetic-generation',exchange_nonce:crypto.randomUUID()};
 const machine=async(e,name,args)=>{
  if(name==='wm_connection_claim'){assert.equal(args.p_browser_hash,start.browser_hash);assert.equal(args.p_state_hash,start.state_hash);assert.equal(args.p_provider,'google_ads');if(claimed)throw Error('used');claimed=true;return row;}
  if(name==='wm_connection_complete'){stored=await openCredential(env,args.p_ciphertext,credentialContext(row));return {};}
  if(name==='wm_connection_failed')return {};throw Error(name);
 };
 const callback=new Request(`${env.APP_ORIGIN}/api/connections/callback/google_ads?state=${url.searchParams.get('state')}&code=synthetic-code`,{headers:{cookie}});
 const exchange=async(e,p,code,verifier)=>{exchanges++;assert.equal(code,'synthetic-code');assert.equal(verifier,(await openCredential(env,row.verifier_ciphertext,credentialContext(row,'oauth_verifier'))).verifier);return {access_token:'synthetic-secret-token',expires_at:new Date(Date.now()+3600000).toISOString()};};
 const completed=await handleConnectionCallback(callback,env,{machine,exchange,readControl});assert.match(completed.headers.get('location'),/connection=connected/);assert.match(completed.headers.get('set-cookie'),/Max-Age=0/);assert.equal(stored.access_token,'synthetic-secret-token');
 const replay=await handleConnectionCallback(callback,env,{machine,exchange,readControl});assert.match(replay.headers.get('location'),/connection=failed/);assert.equal(exchanges,1);
 await handleConnectionCallback(new Request(callback.url),env,{machine:async()=>assert.fail('No cookie must never claim'),exchange});assert.equal(exchanges,1);
});
test('callback errors are scrubbed, and uncertain exchange is consumed rather than retried',async()=>{
 let start;const r=await handleConnections(post('/api/connections/start',{engagement_id:engagement,provider:'google_ads'}),env,session,{human:async(e,t,n,a)=>{start=a.p_input;return {};}}),url=new URL((await r.json()).authorization_url);let failed=0;
 const response=await handleConnectionCallback(new Request(`${env.APP_ORIGIN}/api/connections/callback/google_ads?state=${url.searchParams.get('state')}&error=private-provider-message`,{headers:{cookie:r.headers.get('set-cookie').split(';')[0]}}),env,{machine:async(e,n)=>{if(n==='wm_connection_failed'){failed++;return;}return {...start,organization_id:org,exchange_nonce:crypto.randomUUID()};},exchange:async()=>assert.fail('Provider denial must not exchange')});
 assert.equal(failed,1);assert.ok(!response.headers.get('location').includes('private-provider-message'));assert.equal(await response.text(),'');
});
test('OAuth endpoints use fixed origins, PKCE, offline consent and scrubbed provider failures',async()=>{
 const url=new URL(await authorizationUrl(env,'google_ads','state','verifier'));assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('access_type'),'offline');
 let calls=0;const tokens=await exchangeCode(env,'google_ads','synthetic-code','synthetic-verifier',async(url,options)=>{calls++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.redirect,'error');const form=new URLSearchParams(options.body);assert.equal(form.get('code_verifier'),'synthetic-verifier');return Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/adwords',token_type:'Bearer'});});
 const refreshed=await refreshTokens(env,'google_ads',tokens,async()=>Response.json({access_token:'synthetic-new-access',expires_in:3600}));assert.equal(refreshed.refresh_token,tokens.refresh_token);assert.equal(calls,1);
 await assert.rejects(exchangeCode(env,'google_ads','code','verifier',async()=>Response.json({error:'sensitive-body',access_token:'private'}, {status:400})),error=>!error.message.includes('sensitive-body'));
 await assert.rejects(exchangeCode(env,'google_ads','code','verifier',async()=>Response.json({access_token:'synthetic-access',expires_in:3600,scope:'unrelated'})),/could not be confirmed/);
});
test('an uncertain refresh is fenced and cannot issue a second refresh',async()=>{
 const c={organization_id:org,id:crypto.randomUUID(),engagement_id:engagement,provider:'google_ads',environment:'production',state:'connected',version:1,expires_at:new Date(Date.now()+1000).toISOString()};c.ciphertext=await sealCredential(env,{access_token:'synthetic-access',refresh_token:'synthetic-refresh',config_fingerprint:await providerFingerprint(env,c.provider)},credentialContext(c));let requests=0;
 const machine=async(e,name)=>{if(name==='wm_connection_context')return {connection:{...c},ticket:{external_generation:'synthetic-generation'}};if(name==='wm_connection_refresh_begin'){c.state='refreshing';return {nonce:crypto.randomUUID()};}throw Error(name);};const refresh=async()=>{requests++;throw Error('lost response');};
 await assert.rejects(connectionTokens(env,org,crypto.randomUUID(),{machine,refresh,readControl}),/lost response/);await assert.rejects(connectionTokens(env,org,crypto.randomUUID(),{machine,refresh,readControl}),/reauthorization/);assert.equal(requests,1);
});
test('Google account readers verify identity/environment and never follow provider-controlled URLs',async()=>{
 const c={provider:'google_ads',environment:'production'},tokens={access_token:'synthetic-access'},selected={account_id:'1234567890',manager_id:'5555555555'};
 const good={results:[{customer:{id:selected.account_id,descriptiveName:'Example',currencyCode:'USD',timeZone:'America/New_York',testAccount:false,manager:false}}]};
 const observed=await readAccounts(env,c,tokens,selected,{fetcher:async(url,options)=>{assert.equal(url,'https://googleads.googleapis.com/v26/customers/1234567890/googleAds:search');assert.equal(options.headers['login-customer-id'],selected.manager_id);return Response.json(good);}});assert.equal(observed.account_id,selected.account_id);assert.deepEqual(observed.permissions,['read']);
 await assert.rejects(readAccounts(env,{...c,environment:'test'},tokens,selected,{fetcher:async()=>Response.json(good)}),/could not be verified/);
 await assert.rejects(readAccounts(env,c,tokens,selected,{fetcher:async()=>Response.json({results:[{customer:{...good.results[0].customer,id:'999'}}]})}),/could not be verified/);
 const calls=[];const properties=await readAccounts(env,{provider:'analytics',environment:'production'},tokens,null,{fetcher:async(url)=>{calls.push(String(url));return Response.json(calls.length===1?{accountSummaries:[{propertySummaries:[{property:'properties/123',displayName:'Example'}]}],nextPageToken:'https://evil.invalid/?token=secret'}:{accountSummaries:[]});}});assert.equal(properties.length,1);assert.ok(calls.every(url=>new URL(url).origin==='https://analyticsadmin.googleapis.com'));
});

test('independent recovery control prevents token refresh from a restored ticket',async()=>{
 const c={organization_id:org,id:crypto.randomUUID(),engagement_id:engagement,provider:'google_ads',environment:'production',state:'connected',version:1,expires_at:new Date(Date.now()+1000).toISOString()};c.ciphertext=await sealCredential(env,{access_token:'synthetic-access',refresh_token:'synthetic-refresh',config_fingerprint:await providerFingerprint(env,c.provider)},credentialContext(c));
 await assert.rejects(connectionTokens(env,org,crypto.randomUUID(),{machine:async(e,name)=>{assert.equal(name,'wm_connection_context');return {connection:c,ticket:{external_generation:'old-generation'}};},readControl,refresh:async()=>assert.fail('Restored generation must never contact the provider')}),/during recovery/);
});
test('Microsoft reads fixed sandbox endpoint, current user accounts and exact parent ownership',async()=>{
 const calls=[],c={provider:'microsoft_ads',environment:'test'},tokens={access_token:'synthetic-access'},configuration={...env,MICROSOFT_DEVELOPER_TOKEN:'synthetic-developer'};
 const fetcher=async(url,options)=>{calls.push(url);assert.ok(url.startsWith('https://clientcenter.api.sandbox.bingads.microsoft.com/'));assert.equal(options.headers.DeveloperToken,'synthetic-developer');const data=JSON.parse(options.body);if(url.endsWith('/User/Query'))return Response.json({User:{Id:'123'}});if(url.endsWith('/Accounts/Search')){assert.deepEqual(data.Predicates,[{Field:'UserId',Operator:'Equals',Value:'123'}]);return Response.json({Accounts:[{Id:'987',ParentCustomerId:'456',Name:'Demo'}]});}return Response.json({Account:{Id:'987',ParentCustomerId:'456',Name:'Demo',CurrencyCode:'USD',TimeZone:'EasternTimeUSCanada'}});};
 const accounts=await readAccounts(configuration,c,tokens,null,{fetcher});assert.equal(accounts[0].manager_id,'456');const bound=await readAccounts(configuration,c,tokens,accounts[0],{fetcher});assert.equal(bound.timezone,'America/New_York');await assert.rejects(readAccounts(configuration,c,tokens,{...accounts[0],manager_id:'999'},{fetcher}),/could not be verified/);
});

test('TikTok advertiser authorization uses the configured portal URL, auth_code and lossless permission IDs',async()=>{
 const permission='12345678901234567890',configuration={...env,TIKTOK_CLIENT_ID:'123',TIKTOK_CLIENT_SECRET:'synthetic-secret',TIKTOK_ACCOUNT_ENVIRONMENT:'production',TIKTOK_ADS_OAUTH_ENABLED:'true',TIKTOK_REQUIRED_PERMISSION_IDS:JSON.stringify([permission]),TIKTOK_AUTHORIZATION_URL:'https://business-api.tiktok.com/portal/auth?app_id=123&redirect_uri='+encodeURIComponent(env.APP_ORIGIN+'/api/connections/callback/tiktok_ads')};
 const url=new URL(await authorizationUrl(configuration,'tiktok_ads','synthetic-state','unused'));assert.equal(url.searchParams.get('state'),'synthetic-state');assert.equal(url.searchParams.get('scope'),null);assert.equal(url.searchParams.get('code_challenge'),null);
 const token=await exchangeCode(configuration,'tiktok_ads','documented-auth-code','unused',async(url,options)=>{assert.equal(url,'https://business-api.tiktok.com/open_api/v2.0/oauth2/access_token/');const data=JSON.parse(options.body);assert.equal(data.auth_code,'documented-auth-code');assert.equal(data.is_long_term,true);return new Response('{"code":0,"data":{"access_token":"synthetic-advertiser-token","scope":['+permission+']}}');});assert.deepEqual(token.scopes,[permission]);assert.equal(token.expires_at,null);assert.equal(token.token_class,'tiktok_advertiser_long_term');
 await assert.rejects(exchangeCode(configuration,'tiktok_ads','code','unused',async()=>Response.json({code:40001,message:'private error'})),/could not be confirmed/);
 await assert.rejects(authorizationUrl({...configuration,TIKTOK_AUTHORIZATION_URL:'https://evil.invalid'},'tiktok_ads','state','unused'),/still being configured/);
 let start;const response=await handleConnections(post('/api/connections/start',{engagement_id:engagement,provider:'tiktok_ads'}),configuration,session,{human:async(e,t,n,a)=>{start=a.p_input;return {};}}),authorize=new URL((await response.json()).authorization_url);
 const callback=await handleConnectionCallback(new Request(env.APP_ORIGIN+'/api/connections/callback/tiktok_ads?state='+authorize.searchParams.get('state')+'&code=wrong-code&auth_code=right-code',{headers:{cookie:response.headers.get('set-cookie').split(';')[0]}}),configuration,{machine:async(e,n)=>n==='wm_connection_claim'?{...start,organization_id:org,exchange_nonce:crypto.randomUUID(),external_generation:'synthetic-generation'}:{},readControl,exchange:async(e,p,code)=>{assert.equal(code,'right-code');return token;}});assert.match(callback.headers.get('location'),/connection=connected/);
});
test('Meta accepts only the configured business system-user grant and exact app identity',async()=>{
 const configuration={...env,META_CLIENT_ID:'123',META_CLIENT_SECRET:'synthetic-secret',META_ACCOUNT_ENVIRONMENT:'production',META_ADS_OAUTH_ENABLED:'true',META_LOGIN_CONFIG_ID:'456'};
 const authorize=new URL(await authorizationUrl(configuration,'meta_ads','state','unused'));assert.equal(authorize.searchParams.get('config_id'),'456');assert.equal(authorize.searchParams.get('code_challenge'),null);
 const fetcher=async(url)=>{const u=new URL(url);if(u.pathname.endsWith('/oauth/access_token')){assert.equal(u.searchParams.get('code'),'synthetic-code');return Response.json({access_token:'synthetic-meta-token'});}if(u.pathname.endsWith('/debug_token'))return Response.json({data:{is_valid:true,app_id:'123',type:'SYSTEM_USER',user_id:'789',expires_at:0,scopes:['ads_read','ads_management','pages_show_list','pages_read_engagement']}});return Response.json({id:'789',client_business_id:'101112'});};
 const token=await exchangeCode(configuration,'meta_ads','synthetic-code','unused',fetcher);assert.equal(token.client_business_id,'101112');assert.equal(token.expires_at,null);
 await assert.rejects(exchangeCode(configuration,'meta_ads','synthetic-code','unused',async(url,opts)=>{if(new URL(url).pathname.endsWith('/debug_token'))return Response.json({data:{is_valid:true,app_id:'999',type:'USER'}});return fetcher(url,opts);}),/could not be confirmed/);
 await assert.rejects(refreshTokens(configuration,'meta_ads',token),/Reconnect/);
});
test('authorization cannot complete after OAuth application configuration changes',async()=>{
 let start;const response=await handleConnections(post('/api/connections/start',{engagement_id:engagement,provider:'google_ads'}),env,session,{human:async(e,t,n,a)=>{start=a.p_input;return {};}}),url=new URL((await response.json()).authorization_url);
 const callback=await handleConnectionCallback(new Request(env.APP_ORIGIN+'/api/connections/callback/google_ads?state='+url.searchParams.get('state')+'&code=synthetic-code',{headers:{cookie:response.headers.get('set-cookie').split(';')[0]}}),{...env,GOOGLE_CLIENT_ID:'different-client'},{machine:async(e,n)=>n==='wm_connection_claim'?{...start,organization_id:org,exchange_nonce:crypto.randomUUID(),external_generation:'synthetic-generation'}:{},readControl,exchange:async()=>assert.fail('Configuration mismatch must not exchange')});assert.match(callback.headers.get('location'),/connection=failed/);
});
