import {rpc,machineRpc} from '../database.mjs';
import {prepareDraft} from './adapter.mjs';
export async function aiCommand(env,session,org,command,input,key){
  const prepared=await rpc(env,session.access_token,'wm_ai_command',{p_org:org,p_command:command,p_input:input,p_key:key});
  if(command!=='ai.prepare'||!prepared.dispatch)return prepared;
  let result;
  try{result=await prepareDraft(prepared,env);}catch(error){
    return machineRpc(env,'wm_ai_complete',{p_org:org,p_id:prepared.id,p_nonce:prepared.dispatch_nonce,p_output:null,p_usage:null,p_failure:error.code==='ai_not_started'?'not_started':'unknown'});
  }
  await machineRpc(env,'wm_ai_complete',{p_org:org,p_id:prepared.id,p_nonce:prepared.dispatch_nonce,p_output:result.output,p_usage:result.usage,p_failure:null});
  // Recheck current human access after the external call. Return only a reference.
  await rpc(env,session.access_token,'wm_workspace',{p_org:org});
  return {id:prepared.id,status:'saved'};
}
