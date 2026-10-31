import {readWebsiteEffect} from '../website/cloudflare.mjs';
import {readInvoiceEffect} from '../billing/stripe.mjs';
import {readFinancialEffect} from '../billing/refunds.mjs';
import {journalAttempt} from '../continuity/attempt-journal.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {readNotification} from '../providers/notifications.mjs';
import {storage,filePolicy} from '../files/service.mjs';
import {readBounded,sha256} from '../files/content.mjs';
import {UUID,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
const unknown=()=>{throw new WorkspaceError('readback_unconfirmed','The earlier provider action still needs checking.',503);};
export async function readServiceEffect(env,permit,{rpc=machineRpc,fetcher=fetch}={}){
  if(permit.operation.kind==='website_publish')return readWebsiteEffect(env,permit,{fetcher});
  if(['stripe_charge_read','stripe_refund_create'].includes(permit.operation.kind))return readFinancialEffect(env,permit,{fetcher});
  if(permit.operation.kind.startsWith('stripe_'))return readInvoiceEffect(env,permit,{fetcher});
  if(['invitation_notify','message_notify'].includes(permit.operation.kind))return readNotification(env,permit,{fetcher});
  const observed=await rpc(env,'wm_service_readback',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce});
  if(permit.operation.kind==='identity_provision'){
    if(!UUID.test(observed?.identity_id||''))unknown();return {settled:true,readback_matches:true,evidence_reference:`identity:${observed.identity_id}`,provider_reference:observed.identity_id,observed_at:new Date().toISOString()};
  }
  if(permit.operation.kind==='file_scan'){
    // If the worker stopped after sealing bytes but before recording release,
    // recover the existing object without repeating the Storage POST.
    if(['quarantined','checking'].includes(observed?.state)&&filePolicy(env)==='invite_only_unscanned'){
      const key=`${permit.operation.organization_id}/${observed.id}/${observed.checksum}`;
      const response=await storage(env,'workspace-sealed',key,{fetcher});
      if(!response.ok||await sha256(await readBounded(response.body,Number(observed.bytes)))!==observed.checksum)unknown();
      await rpc(env,'wm_file_release_unscanned',{p_org:permit.operation.organization_id,p_id:observed.id,p_checksum:observed.checksum,p_sealed_key:key},fetcher);
      observed.state='unscanned';observed.object_key=key;
    }
    if(!['ready','unscanned','rejected'].includes(observed?.state))unknown();
    if(['ready','unscanned'].includes(observed.state)){const response=await storage(env,'workspace-sealed',observed.object_key,{fetcher});if(!response.ok||await sha256(await readBounded(response.body,Number(observed.bytes)))!==observed.checksum)unknown();}
    return {settled:true,readback_matches:true,evidence_reference:`file:${observed.id}:${observed.checksum}`,observed_at:new Date().toISOString(),file_state:observed.state};
  }
  unknown();
}
export async function reconcileAttempts(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,readback=readServiceEffect,journal=journalAttempt}={}){
  if(env.EFFECTS_ENABLED!=='true')return {disabled:true};
  const attempts=await rpc(env,'wm_unresolved_attempts',{p_limit:10});let verified=0,unresolved=0;
  for(const permit of attempts){
    try{
      const control=await readControl(env,permit.operation.organization_id);
      if(control.access_state!=='open'||control.external_generation!==permit.attempt.external_generation){unresolved++;continue;}
      const proof=await readback(env,permit,{rpc,fetcher});
      await journal(env,permit,'outcome',proof);
      const result=await rpc(env,'wm_attempt_resolve',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:proof});
      if(['verified','resolved'].includes(result.state))verified++;else unresolved++;
    }catch{unresolved++;}
  }
  return {verified,unresolved};
}
