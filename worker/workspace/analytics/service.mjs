import {WorkspaceError,canonical,digest} from '../../../src/workspace/domain/contracts.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {credentialContext,openCredential,sealCredential} from '../integrations/vault.mjs';
import {providerFingerprint,refreshTokens} from '../integrations/oauth.mjs';
import {fetchAnalyticsProfile,inspectAnalyticsUrl,verifyAnalyticsProfileAccess} from './read.mjs';
const args=job=>({p_org:job.organization_id,p_id:job.id,p_generation:job.lease_generation,p_nonce:job.ticket_nonce});
const fail=code=>{throw new WorkspaceError(code,'Reporting access needs attention. The last published results are unchanged.',409);};
export function analyticsSummary(result){
 const map=({ga_daily_v1:{sessions:['sessions','count'],engagedSessions:['engaged_sessions','count'],activeUsers:['active_users','count'],eventCount:['event_count','count'],keyEvents:['key_events','decimal']},ga_revenue_daily_v1:{totalRevenue:['revenue','currency']},sc_daily_total_v1:{clicks:['search_clicks','count'],impressions:['search_impressions','count'],ctr:['search_ctr','fraction'],position:['search_position','position']}})[result.profile];
 if(!map)return [];if(result.row_count>1)fail('analytics_headline_shape');const row=result.preview_rows?.[0];
 return Object.entries(map).map(([name,[metric,unit]])=>({metric,unit,value:row?.values[name]?.value??null,state:row?.values[name]?.state||'no_reported_row'}));
}
export async function runAnalytics(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,open=openCredential,seal=sealCredential,fingerprint=providerFingerprint,refresh=refreshTokens,fetchProfile=fetchAnalyticsProfile,inspect=inspectAnalyticsUrl,verifyProfile=verifyAnalyticsProfileAccess}={}){
 if(env.ANALYTICS_ENABLED!=='true')return {disabled:true};
 const scheduled=await rpc(env,'wm_analytics_schedule',{p_limit:3});let staged=0,published=0,attention=0;
 for(let i=0;i<2;i++){
  const job=await rpc(env,'wm_analytics_claim',{});if(!job)break;if(job.interrupted||job.attention){attention++;continue;}
  const permit=args(job);let context,tokens,sequence=0;
  const authorize=async()=>{context=await rpc(env,'wm_analytics_context',permit);const control=await readControl(env,job.organization_id);if(control.access_state!=='open'||control.external_generation!==context.job.external_generation)fail('analytics_recovery_restricted');return context;};
  const record=page=>rpc(env,'wm_analytics_page',{...permit,p_page:{...page,sequence:sequence++}});
  try{
   await authorize();let connection=context.connection;tokens=await open(env,connection.ciphertext,credentialContext(connection));
   if(tokens.config_fingerprint!==await fingerprint(env,connection.provider))fail('analytics_reconnect');
   if(connection.expires_at&&Date.parse(connection.expires_at)<Date.now()+120000){
    if(!tokens.refresh_token)fail('analytics_reconnect');const lease=await rpc(env,'wm_analytics_refresh',{...permit,p_input:{action:'begin',expected_version:connection.version}});
    try{tokens={...await refresh(env,connection.provider,tokens,fetcher),config_fingerprint:tokens.config_fingerprint};await authorize();await rpc(env,'wm_analytics_refresh',{...permit,p_input:{action:'complete',refresh_nonce:lease.nonce,ciphertext:await seal(env,tokens,credentialContext(connection)),key_version:env.INTEGRATION_KEY_ID,expires_at:tokens.expires_at}});}catch(error){await rpc(env,'wm_analytics_refresh',{...permit,p_input:{action:'failed',refresh_nonce:lease.nonce}}).catch(()=>{});throw error;}
   }
   const options={fetcher,authorize,record,normalizedPage:page=>rpc(env,'wm_analytics_normalized',{...permit,p_page:page.page,p_json:canonical(page.rows),p_hash:page.normalized_hash})};let result;
   if(job.status==='publishing'){
    if(job.kind==='inspection'){
     const observed=await inspect(context.binding,tokens.access_token,job.inspection_url,options);result={configuration_hash:observed.configuration_hash};
    }else{const observed=await verifyProfile(context.binding,tokens.access_token,{...options,profile:job.profile,start:job.day});result={configuration_hash:observed.configuration_hash};}
   }else{
    result=job.kind==='inspection'?await inspect(context.binding,tokens.access_token,job.inspection_url,options):await fetchProfile(context.binding,tokens.access_token,{...options,profile:job.profile,start:job.day});
    if(job.kind==='report'){const {digest:prior,...data}=result;data.summary_rows=analyticsSummary(result);result={...data,digest:await digest(data)};}
   }
   await authorize();const saved=await rpc(env,'wm_analytics_finish',{...permit,p_result:result});if(saved.state==='published')published++;else staged++;
  }catch(error){attention++;await rpc(env,'wm_analytics_finish',{...permit,p_result:{error:error.code||'analytics_read_incomplete'}}).catch(()=>{});}
 }
 return {scheduled,staged,published,attention};
}
