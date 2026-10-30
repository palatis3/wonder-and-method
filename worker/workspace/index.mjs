import {WorkspaceError,uuid,validateCommand} from '../../src/workspace/domain/contracts.mjs';
import {body,config,errorResponse,json,requireOrigin,secure} from './http.mjs';
import {handleAuth,identity,readSession,requireCsrf} from './auth/session.mjs';
import {rpc} from './database.mjs';
import {handleFile} from './files/service.mjs';
import {aiCommand} from './ai/service.mjs';
const COMMANDS=Object.freeze({'request.create':'wm_request_create','request.accept':'wm_request_accept','message.send':'wm_message_send','revision.create':'wm_revision_create','decision.record':'wm_decision_record','ads.stop':'wm_ads_stop','operation.prepare':'wm_operation_prepare','file.intent':'wm_file_intent'});
const SERVICES=new Set(['request.progress','fact.confirm','lead.save','time.record','absence.save','preference.save','engagement.cancel','export.request','allowance.reserve','allowance.settle','allowance.release','allowance.defect']);
export async function handleRequest(request,env){
  const correlation=crypto.randomUUID();
  try{
    const url=new URL(request.url);if(url.origin!==config(env).origin)throw new WorkspaceError('invalid_host','Open the private workspace address.',421);
    if(request.method==='OPTIONS')return json({error:{message:'Cross-origin access is unavailable.'}},403);
    if(url.pathname==='/health')return json({service:'wonder-and-method-workspace',status:'available',environment:env.ENVIRONMENT||'unconfigured'});
    const session=await readSession(request,env);const auth=await handleAuth(request,env,session);if(auth)return auth;
    if(url.pathname.startsWith('/api/')){
      await identity(session,env);
      const fileResponse=await handleFile(request,env,session);if(fileResponse)return fileResponse;
      if(request.method==='GET'&&url.pathname==='/api/businesses')return json(await rpc(env,session.access_token,'wm_businesses',{}));
      if(request.method==='GET'&&url.pathname==='/api/invitations')return json(await rpc(env,session.access_token,'wm_invitations',{}));
      if(request.method==='GET'&&url.pathname==='/api/workspace')return json(await rpc(env,session.access_token,'wm_workspace',{p_org:uuid(url.searchParams.get('business'),'business')}));
      if(request.method==='POST'&&url.pathname==='/api/command'){
        requireOrigin(request,env);requireCsrf(request,session);const input=await body(request);
        const org=uuid(input.organization_id,'business'),command=input.command;
        const data=validateCommand(command,input.input),key=request.headers.get('idempotency-key');
        if(!key||!/^[A-Za-z0-9_-]{16,200}$/.test(key))throw new WorkspaceError('action_key','Retry this action with its original identifier.');
        if(command.startsWith('ai.'))return json(await aiCommand(env,session,org,command,data,key));
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
    if(!['/index.html','/app.mjs','/app.css','/domain/contracts.mjs','/domain/channels.mjs','/favicon.svg'].includes(url.pathname))return json({error:{message:'Page unavailable.'}},404);
    return secure(await env.ASSETS.fetch(new Request(url,{method:request.method})));
  }catch(error){return errorResponse(error,correlation);}
}
export default {fetch:handleRequest};
