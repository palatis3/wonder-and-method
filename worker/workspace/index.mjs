import {websiteCommand} from './website/service.mjs';
import {ownerQueue,ownerCommand,OWNER_COMMANDS} from './owner/service.mjs';
import {intakeQueue,intakeCommand,syncIntakePage,INTAKE_COMMANDS} from './intake/service.mjs';
import {handleOutboundWebhook,notificationStatus,notificationCommand,NOTIFICATION_COMMANDS} from './notifications/service.mjs';
import {exportStatus,exportCommand,downloadCustomerExport,EXPORT_COMMANDS} from './exports/service.mjs';
import {backupStatus,backupCommand,BACKUP_COMMANDS} from './backups/service.mjs';
import {handleInboundWebhook,handleInboundFile,inboundCommand} from './inbound/service.mjs';
import {handleConnectionCallback,handleConnections} from './integrations/service.mjs';
import {readAccounts} from './integrations/accounts.mjs';
import {WorkspaceError,uuid,validateCommand} from '../../src/workspace/domain/contracts.mjs';
import {body,config,errorResponse,json,requireOrigin,secure} from './http.mjs';
import {handleAuth,identity,readSession,requireCsrf} from './auth/session.mjs';
import {rpc} from './database.mjs';
import {handleFile,filePolicy} from './files/service.mjs';
import {aiCommand} from './ai/service.mjs';
import {handleStripeWebhook} from './billing/webhooks.mjs';
import {scheduledWork} from './effects/dispatcher.mjs';
const COMMANDS=Object.freeze({'request.create':'wm_request_create','request.accept':'wm_request_accept','message.send':'wm_message_send','revision.create':'wm_revision_create','decision.record':'wm_decision_record','ads.stop':'wm_ads_stop','operation.prepare':'wm_operation_prepare','operation.reconcile':'wm_reconcile_request','file.intent':'wm_file_intent'});
const SERVICES=new Set(['request.progress','fact.confirm','lead.save','time.record','absence.save','preference.save','engagement.cancel','export.request','allowance.reserve','allowance.settle','allowance.release','allowance.defect']);
export async function handleRequest(request,env){
  const correlation=crypto.randomUUID();
  try{
    const url=new URL(request.url);if(url.origin!==config(env).origin)throw new WorkspaceError('invalid_host','Open the private workspace address.',421);
    if(request.method==='OPTIONS')return json({error:{message:'Cross-origin access is unavailable.'}},403);
    if(url.pathname==='/health')return json({service:'wonder-and-method-workspace',status:'available',environment:env.ENVIRONMENT||'unconfigured'});
    if(url.pathname==='/api/webhooks/stripe')return await handleStripeWebhook(request,env);
    if(url.pathname==='/api/webhooks/resend/inbound')return await handleInboundWebhook(request,env);
    const outbound=/^\/api\/webhooks\/resend\/outbound\/([A-Za-z0-9_-]{1,80})$/.exec(url.pathname);if(outbound)return await handleOutboundWebhook(request,env,outbound[1]);
    const callback=await handleConnectionCallback(request,env);if(callback)return callback;
    const session=await readSession(request,env);const auth=await handleAuth(request,env,session);if(auth)return auth;
    if(url.pathname.startsWith('/api/')){
      await identity(session,env);
      const exportFile=await downloadCustomerExport(request,env,session);if(exportFile)return exportFile;
      if(request.method==='GET'&&url.pathname==='/api/customer-exports')return json(await exportStatus(env,session,uuid(url.searchParams.get('business')),url.searchParams.get('before')||null));
      if(request.method==='GET'&&url.pathname==='/api/backups')return json(await backupStatus(env,session,uuid(url.searchParams.get('business'))));
      if(request.method==='GET'&&url.pathname==='/api/notifications')return json(await notificationStatus(env,session,uuid(url.searchParams.get('business'))));
      if(request.method==='GET'&&url.pathname==='/api/owner')return json(await ownerQueue(env,session,{query:url.searchParams.get('query')||'',week_start:url.searchParams.get('week_start'),timezone:url.searchParams.get('timezone')||'UTC',after:url.searchParams.get('after')||null}));
      if(request.method==='GET'&&url.pathname==='/api/owner-dates')return json(await rpc(env,session.access_token,'wm_owner_dates',{p_org:uuid(url.searchParams.get('business'))}));
      if(request.method==='GET'&&url.pathname==='/api/intake')return json(await intakeQueue(env,session,{query:url.searchParams.get('query')||'',stage:url.searchParams.get('stage')||'',after:url.searchParams.get('after')||null}));
      if(request.method==='POST'&&url.pathname==='/api/intake/sync'){
        requireOrigin(request,env);requireCsrf(request,session);const input=await body(request,2048);
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['source','after'].includes(k))||typeof input.source!=='string')throw new WorkspaceError('intake_input','Choose the reviewed export source.');
        return json(await syncIntakePage(env,session,input.source,{after:input.after??null}));
      }
      const inboundFile=await handleInboundFile(request,env,session);if(inboundFile)return inboundFile;
      if(request.method==='GET'&&url.pathname==='/api/inbound')return json(await rpc(env,session.access_token,'wm_inbound_list',{p_org:uuid(url.searchParams.get('business'))}));
      if(request.method==='GET'&&url.pathname==='/api/analytics')return json(await rpc(env,session.access_token,'wm_analytics_list',{p_org:uuid(url.searchParams.get('business')),p_before:url.searchParams.get('before')||null}));
      if(request.method==='GET'&&url.pathname==='/api/analytics/manifest')return json(await rpc(env,session.access_token,'wm_analytics_manifest',{p_org:uuid(url.searchParams.get('business')),p_id:uuid(url.searchParams.get('id'))}),200,{'Content-Disposition':'attachment; filename=reporting-observation.json'});
      const connectionResponse=await handleConnections(request,env,session,{accounts:readAccounts});if(connectionResponse)return connectionResponse;
      const fileResponse=await handleFile(request,env,session);if(fileResponse)return fileResponse;
      if(request.method==='GET'&&url.pathname==='/api/businesses')return json(await rpc(env,session.access_token,'wm_businesses',{}));
      if(request.method==='GET'&&url.pathname==='/api/agreement-receipt')return json(await rpc(env,session.access_token,'wm_agreement_receipt',{p_org:uuid(url.searchParams.get('business')),p_id:uuid(url.searchParams.get('id'))}),200,{'Content-Disposition':'attachment; filename=agreement-receipt.json'});
      if(request.method==='GET'&&url.pathname==='/api/invitations')return json(await rpc(env,session.access_token,'wm_invitations',{}));
      if(request.method==='GET'&&url.pathname==='/api/workspace')return json({...await rpc(env,session.access_token,'wm_workspace',{p_org:uuid(url.searchParams.get('business'),'business')}),file_policy:filePolicy(env)});
      if(request.method==='POST'&&url.pathname==='/api/command'){
        requireOrigin(request,env);requireCsrf(request,session);const input=await body(request,524288);
        const command=input.command,key=request.headers.get('idempotency-key');
        if(!key||!/^[A-Za-z0-9_-]{16,200}$/.test(key))throw new WorkspaceError('action_key','Retry this action with its original identifier.');
        if(INTAKE_COMMANDS.includes(command))return json(await intakeCommand(env,session,command,input.input,key));
        const org=uuid(input.organization_id,'business');
        if(EXPORT_COMMANDS.has(command))return json(await exportCommand(env,session,org,command,input.input,key));
        if(BACKUP_COMMANDS.has(command))return json(await backupCommand(env,session,org,command,input.input,key));
        if(command==='export.request')throw new WorkspaceError('export_replaced','Open Your service exports and choose an engagement.',409);
        if(NOTIFICATION_COMMANDS.includes(command))return json(await notificationCommand(env,session,org,command,input.input,key));
        if(OWNER_COMMANDS.includes(command))return json(await ownerCommand(env,session,org,command,input.input,key));
        const data=validateCommand(command,input.input);
        if(command.startsWith('website.'))return json(await websiteCommand(env,session,org,command,data,key));
        if(command.startsWith('inbound.'))return json(await inboundCommand(env,session,org,command,data,key));
        if(command.startsWith('analytics.'))return json(await rpc(env,session.access_token,'wm_analytics_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('delivery.'))return json(await rpc(env,session.access_token,'wm_delivery_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('outcome.'))return json(await rpc(env,session.access_token,'wm_outcome_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('reporting.'))return json(await rpc(env,session.access_token,'wm_reporting_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('billing.'))return json(await rpc(env,session.access_token,'wm_billing_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('closure.'))return json(await rpc(env,session.access_token,'wm_closure_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(command.startsWith('ai.'))return json(await aiCommand(env,session,org,command,data,key));
        if(/^(service|proposal|agreement|onboarding|milestone)\./.test(command))return json(await rpc(env,session.access_token,'wm_commercial_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(/^(invitation|member|authority)\./.test(command))return json(await rpc(env,session.access_token,'wm_people_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        if(COMMANDS[command])return json(await rpc(env,session.access_token,COMMANDS[command],{p_org:org,p_input:data,p_key:key}));
        if(SERVICES.has(command))return json(await rpc(env,session.access_token,'wm_service_command',{p_org:org,p_command:command,p_input:data,p_key:key}));
        throw new WorkspaceError('not_ready','This action is still being configured.',503);
      }
      return json({error:{message:'This workspace route does not exist.'}},404);
    }
    if(!['GET','HEAD'].includes(request.method))return json({error:{message:'Method unavailable.'}},405);
    if(!env.ASSETS)return json({error:{message:'Workspace interface unavailable.'}},503);
    if(url.pathname==='/'||url.pathname.startsWith('/workspace/')||url.pathname.startsWith('/operator/'))url.pathname='/index.html';
    if(!['/index.html','/app.mjs','/commercial-ui.mjs','/billing-ui.mjs','/closure-ui.mjs','/connections-ui.mjs','/reporting-ui.mjs','/outcomes-ui.mjs','/delivery-ui.mjs','/website-ui.mjs','/analytics-ui.mjs','/owner-ui.mjs','/intake-ui.mjs','/notification-ui.mjs','/export-ui.mjs','/backup-ui.mjs','/domain/reporting.mjs','/app.css','/domain/contracts.mjs','/domain/channels.mjs','/favicon.svg'].includes(url.pathname))return json({error:{message:'Page unavailable.'}},404);
    return secure(await env.ASSETS.fetch(new Request(url,{method:request.method})));
  }catch(error){return errorResponse(error,correlation);}
}
export default {fetch:handleRequest,async scheduled(_event,env){return scheduledWork(env);}};
