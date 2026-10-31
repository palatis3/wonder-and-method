import {rpc} from '../database.mjs';
import {cloudflareRequest} from './cloudflare.mjs';
import {WorkspaceError,UUID} from '../../../src/workspace/domain/contracts.mjs';
export async function websiteCommand(env,session,org,command,input,key,{fetcher=fetch,call=rpc}={}){
 if(command==='website.preview'){
  const c=await call(env,session.access_token,'wm_website_preview_context',{p_org:org,p_artifact:input.artifact_id},fetcher);
  const current=await cloudflareRequest(env,c,'/deployments?page=1&per_page=100',{fetcher});
  if(!UUID.test(current.deployments?.[0]?.id||''))throw new WorkspaceError('website_not_ready','The current website release needs verification.',503);
  input={...input,baseline_deployment_id:current.deployments[0].id};
 }
 return call(env,session.access_token,'wm_website_command',{p_org:org,p_command:command,p_input:input,p_key:key},fetcher);
}
