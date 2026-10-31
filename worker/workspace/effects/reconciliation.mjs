import {machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {readNotification} from '../providers/notifications.mjs';
import {storage} from '../files/service.mjs';
import {readBounded,sha256} from '../files/content.mjs';
import {UUID,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
const unknown=()=>{throw new WorkspaceError('readback_unconfirmed','The earlier provider action still needs checking.',503);};
export async function readServiceEffect(env,permit,{rpc=machineRpc,fetcher=fetch}={}){
  if(['invitation_notify','message_notify'].includes(permit.operation.kind))return readNotification(env,permit,{fetcher});
  const observed=await rpc(env,'wm_service_readback',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce});
  if(permit.operation.kind==='identity_provision'){
    if(!UUID.test(observed?.identity_id||''))unknown();return {settled:true,readback_matches:true,evidence_reference:`identity:${observed.identity_id}`,provider_reference:observed.identity_id,observed_at:new Date().toISOString()};
  }
  if(permit.operation.kind==='file_scan'){
    if(!['ready','rejected'].includes(observed?.state))unknown();
    if(observed.state==='ready'){const response=await storage(env,'workspace-sealed',observed.object_key,{fetcher});if(!response.ok||await sha256(await readBounded(response.body,Number(observed.bytes)))!==observed.checksum)unknown();}
    return {settled:true,readback_matches:true,evidence_reference:`file:${observed.id}:${observed.checksum}`,observed_at:new Date().toISOString(),file_state:observed.state};
  }
  unknown();
}
export async function reconcileAttempts(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,readback=readServiceEffect}={}){
  if(env.EFFECTS_ENABLED!=='true')return {disabled:true};
  const attempts=await rpc(env,'wm_unresolved_attempts',{p_limit:10});let verified=0,unresolved=0;
  for(const permit of attempts){
    try{
      const control=await readControl(env,permit.operation.organization_id);
      if(control.access_state!=='open'||control.external_generation!==permit.attempt.external_generation){unresolved++;continue;}
      const proof=await readback(env,permit,{rpc,fetcher});
      const result=await rpc(env,'wm_attempt_resolve',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:proof});
      if(['verified','resolved'].includes(result.state))verified++;else unresolved++;
    }catch{unresolved++;}
  }
  return {verified,unresolved};
}
