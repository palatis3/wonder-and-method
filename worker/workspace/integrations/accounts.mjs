import {WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {providerFetch} from '../http.mjs';
import {readProviderJson,metaProof} from './oauth.mjs';
const failure=()=>{throw new WorkspaceError('account_verification','Account access could not be verified. Check the connection and try again.',409);};
const digits=value=>{if(typeof value==='number'&&Number.isSafeInteger(value))value=String(value);if(typeof value!=='string'||!/^\d{1,20}$/.test(value))failure();return value;};
async function request(url,tokens,{method='GET',data,headers={},fetcher}={}){
 const r=await providerFetch(url,{method,headers:{Authorization:`Bearer ${tokens.access_token}`,...headers,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})},fetcher);
 if(!r.ok)failure();return readProviderJson(r);
}
async function paged(base,tokens,key,{params={},fetcher}={}){
 const all=[],seen=new Set();let cursor='';
 for(let page=0;page<50;page++){
  const url=new URL(base);url.search=new URLSearchParams({...params,...(cursor?{pageToken:cursor}:{})});
  const data=await request(url,tokens,{fetcher});if(data[key]&&!Array.isArray(data[key]))failure();all.push(...(data[key]||[]));
  cursor=data.nextPageToken;if(!cursor)return all;if(typeof cursor!=='string'||cursor.length>4000||seen.has(cursor))failure();seen.add(cursor);
 }failure();
}
function observed(c,selected,values){
 if(values.environment!==c.environment)failure();
 return {account_id:selected.account_id,...(selected.manager_id?{manager_id:selected.manager_id}:{}),currency:null,timezone:null,permissions:['read'],observed_at:new Date().toISOString(),...values};
}
async function googleAds(env,c,tokens,selected,fetcher){
 const base='https://googleads.googleapis.com/v26';
 async function search(id,query,manager){
  const results=[],seen=new Set();let pageToken;
  for(let page=0;page<50;page++){
   const data=await request(`${base}/customers/${digits(id)}/googleAds:search`,tokens,{method:'POST',data:{query,...(pageToken?{pageToken}:{})},headers:manager?{'login-customer-id':digits(manager)}:{},fetcher});
   if(data.results&&!Array.isArray(data.results))failure();results.push(...(data.results||[]));pageToken=data.nextPageToken;if(!pageToken)return results;if(typeof pageToken!=='string'||seen.has(pageToken))failure();seen.add(pageToken);
  }failure();
 }
 if(selected){
  const data=await search(selected.account_id,'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.test_account, customer.manager FROM customer',selected.manager_id);
  const a=data[0]?.customer;if(data.length!==1||digits(a?.id)!==selected.account_id||a.manager||typeof a.testAccount!=='boolean')failure();
  return observed(c,selected,{name:a.descriptiveName||a.id,currency:a.currencyCode,timezone:a.timeZone,environment:a.testAccount?'test':'production'});
 }
 const data=await request(`${base}/customers:listAccessibleCustomers`,tokens,{fetcher}),accounts=[];
 if(!Array.isArray(data.resourceNames)||data.resourceNames.length>200)failure();
 for(const resource of data.resourceNames){
  if(typeof resource!=='string'||!/^customers\/\d+$/.test(resource))failure();const id=resource.split('/')[1];
  const details=await search(id,'SELECT customer.id, customer.descriptive_name, customer.test_account, customer.manager FROM customer');const a=details[0]?.customer;if(!a||typeof a.testAccount!=='boolean')failure();
  if(!a.manager){if((a.testAccount?'test':'production')===c.environment)accounts.push({account_id:digits(a.id),name:a.descriptiveName||a.id});continue;}
  const children=await search(id,'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.test_account FROM customer_client',id);
  for(const {customerClient:b} of children)if(b&&!b.manager&&typeof b.testAccount==='boolean'&&(b.testAccount?'test':'production')===c.environment)accounts.push({account_id:digits(b.id),manager_id:id,name:b.descriptiveName||b.id});
 }
 return accounts;
}
async function analytics(c,tokens,selected,fetcher){
 if(c.environment!=='production')failure();
 if(selected){
  if(!/^properties\/\d+$/.test(selected.account_id)||selected.manager_id)failure();
  const a=await request(`https://analyticsadmin.googleapis.com/v1beta/${selected.account_id}`,tokens,{fetcher});if(a.name!==selected.account_id||a.deleteTime)failure();
  return observed(c,selected,{name:a.displayName||a.name,currency:a.currencyCode||null,timezone:a.timeZone,environment:'production'});
 }
 const summaries=await paged('https://analyticsadmin.googleapis.com/v1beta/accountSummaries',tokens,'accountSummaries',{params:{pageSize:'200'},fetcher});
 return summaries.flatMap(a=>(a.propertySummaries||[]).map(p=>({account_id:p.property,name:p.displayName||p.property})));
}
async function searchConsole(c,tokens,selected,fetcher){
 if(c.environment!=='production'||selected?.manager_id)failure();const base='https://www.googleapis.com/webmasters/v3/sites';
 if(selected){const a=await request(`${base}/${encodeURIComponent(selected.account_id)}`,tokens,{fetcher});if(a.siteUrl!==selected.account_id||!['siteOwner','siteFullUser','siteRestrictedUser'].includes(a.permissionLevel))failure();return observed(c,selected,{name:a.siteUrl,environment:'production'});}
 const data=await request(base,tokens,{fetcher});return (data.siteEntry||[]).filter(a=>['siteOwner','siteFullUser','siteRestrictedUser'].includes(a.permissionLevel)).map(a=>({account_id:a.siteUrl,name:a.siteUrl}));
}
async function microsoft(env,c,tokens,selected,fetcher){
 if(!['production','test'].includes(c.environment)||!env.MICROSOFT_DEVELOPER_TOKEN)failure();
 const base=c.environment==='test'?'https://clientcenter.api.sandbox.bingads.microsoft.com/CustomerManagement/v13':'https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13';
 const query=(path,data)=>request(base+path,tokens,{method:'POST',data,headers:{DeveloperToken:env.MICROSOFT_DEVELOPER_TOKEN},fetcher});
 if(selected){
  const {Account:a}=await query('/Account/Query',{AccountId:digits(selected.account_id)});if(!a||digits(a.Id)!==selected.account_id||digits(a.ParentCustomerId)!==selected.manager_id)failure();
  const zones={EasternTimeUSCanada:'America/New_York',CentralTimeUSCanada:'America/Chicago',MountainTimeUSCanada:'America/Denver',PacificTimeUSCanada:'America/Los_Angeles',Arizona:'America/Phoenix',Alaska:'America/Anchorage',Hawaii:'Pacific/Honolulu',GMTDublinEdinburghLisbonLondon:'Europe/London'};
  return observed(c,selected,{name:a.Name||String(a.Id),currency:a.CurrencyCode,timezone:zones[a.TimeZone]||null,environment:c.environment});
 }
 const user=await query('/User/Query',{UserId:null}),userId=digits(user.User?.Id),all=[];
 for(let page=0;page<50;page++){
  const data=await query('/Accounts/Search',{Predicates:[{Field:'UserId',Operator:'Equals',Value:userId}],Ordering:[{Field:'Id',Order:'Ascending'}],PageInfo:{Index:page,Size:200}});
  if(!Array.isArray(data.Accounts))failure();for(const a of data.Accounts)all.push({account_id:digits(a.Id),manager_id:digits(a.ParentCustomerId),name:a.Name||String(a.Id)});if(data.Accounts.length<200)return all;
 }failure();
}
async function meta(env,c,tokens,selected,fetcher){
 if(c.environment!=='production'||tokens.token_class!=='meta_business_system_user'||!tokens.client_business_id||!env.META_CLIENT_SECRET||selected?.manager_id)failure();
 const proof=await metaProof(env.META_CLIENT_SECRET,tokens.access_token),base='https://graph.facebook.com/v25.0';
 if(selected){
  const id=digits(selected.account_id),url=new URL(`${base}/act_${id}`);url.search=new URLSearchParams({fields:'account_id,name,currency,timezone_name,user_tasks',appsecret_proof:proof});const a=await request(url,tokens,{fetcher});
  if(digits(a.account_id)!==id||!Array.isArray(a.user_tasks)||!a.user_tasks.some(t=>['ANALYZE','ADVERTISE','MANAGE'].includes(t)))failure();
  return observed(c,selected,{name:a.name||id,currency:a.currency,timezone:a.timezone_name,environment:'production'});
 }
 const accounts=[],seen=new Set();let after='';
 for(let page=0;page<100;page++){
  const url=new URL(`${base}/me/adaccounts`);url.search=new URLSearchParams({fields:'account_id,name',limit:'100',appsecret_proof:proof,...(after?{after}:{})});const data=await request(url,tokens,{fetcher});
  if(!Array.isArray(data.data))failure();for(const a of data.data)accounts.push({account_id:digits(a.account_id),name:a.name||a.account_id});
  if(!data.paging?.next)return accounts;after=data.paging?.cursors?.after;if(typeof after!=='string'||after.length>4000||seen.has(after))failure();seen.add(after);
 }failure();
}
async function tiktok(env,c,tokens,selected,fetcher){
 if(c.environment!=='production'||tokens.token_class!=='tiktok_advertiser_long_term'||selected?.manager_id)failure();
 async function get(path,params){const url=new URL(`https://business-api.tiktok.com/open_api/v1.3/${path}/`);url.search=new URLSearchParams(params);const response=await providerFetch(url,{headers:{'Access-Token':tokens.access_token}},fetcher),data=await readProviderJson(response);if(!response.ok||data.code!==0)failure();return data.data;}
 if(selected){
  const id=digits(selected.account_id),data=await get('advertiser/info',{advertiser_ids:JSON.stringify([id]),fields:JSON.stringify(['advertiser_id','name','currency','timezone'])});const a=data?.list?.[0];
  if(data?.list?.length!==1||digits(a?.advertiser_id)!==id)failure();return observed(c,selected,{name:a.name||id,currency:a.currency,timezone:a.timezone,environment:'production'});
 }
 if(!env.TIKTOK_CLIENT_ID||!env.TIKTOK_CLIENT_SECRET)failure();
 const data=await get('oauth2/advertiser/get',{app_id:env.TIKTOK_CLIENT_ID,secret:env.TIKTOK_CLIENT_SECRET});if(!Array.isArray(data?.list))failure();return data.list.map(a=>({account_id:digits(a.advertiser_id),name:a.advertiser_name||String(a.advertiser_id)}));
}
async function linkedin(c,tokens,selected,fetcher){
 const base='https://api.linkedin.com/rest/adAccounts',headers={'LinkedIn-Version':'202610','X-Restli-Protocol-Version':'2.0.0'};
 if(selected){if(selected.manager_id)failure();const a=await request(`${base}/${digits(selected.account_id)}`,tokens,{headers,fetcher});if(digits(a.id)!==selected.account_id||typeof a.test!=='boolean')failure();return observed(c,selected,{name:a.name||String(a.id),currency:a.currency,environment:a.test?'test':'production'});}
 const accounts=[],seen=new Set();let cursor='';
 for(let page=0;page<50;page++){
  const url=new URL(base);url.search=new URLSearchParams({q:'search',pageSize:'100',...(cursor?{pageToken:cursor}:{})});const data=await request(url,tokens,{headers,fetcher});
  if(!Array.isArray(data.elements))failure();for(const a of data.elements)if(typeof a.test==='boolean'&&(a.test?'test':'production')===c.environment)accounts.push({account_id:digits(a.id),name:a.name||String(a.id)});
  cursor=data.metadata?.nextPageToken;if(!cursor)return accounts;if(typeof cursor!=='string'||seen.has(cursor))failure();seen.add(cursor);
 }failure();
}
export async function readAccounts(env,c,tokens,selected=null,{fetcher=fetch}={}){
 try{
  if(!tokens?.access_token||selected&&(typeof selected.account_id!=='string'||selected.account_id.length>300))failure();
  let result;
  if(c.provider==='google_ads')result=await googleAds(env,c,tokens,selected,fetcher);
  else if(c.provider==='analytics')result=await analytics(c,tokens,selected,fetcher);
  else if(c.provider==='search_console')result=await searchConsole(c,tokens,selected,fetcher);
  else if(c.provider==='linkedin_ads')result=await linkedin(c,tokens,selected,fetcher);
  else if(c.provider==='microsoft_ads')result=await microsoft(env,c,tokens,selected,fetcher);
  else if(c.provider==='meta_ads')result=await meta(env,c,tokens,selected,fetcher);
  else if(c.provider==='tiktok_ads')result=await tiktok(env,c,tokens,selected,fetcher);
  else throw new WorkspaceError('account_setup','Account verification for this platform is still being configured.',503);
  if(Array.isArray(result)&&result.length>10000)failure();return result;
 }catch(error){if(error instanceof WorkspaceError)throw error;failure();}
}
