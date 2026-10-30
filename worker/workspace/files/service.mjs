import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {config,json,providerFetch,requireOrigin,secure,limited} from '../http.mjs';
import {requireCsrf} from '../auth/session.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {readBounded,sha256,verifyContent,cleanScanResult,SCAN_POLICY} from './content.mjs';
const objectPath=key=>key.split('/').map(encodeURIComponent).join('/');
export async function storage(env,bucket,key,{method='GET',bytes,media='application/octet-stream',fetcher=fetch}={}){
  if(!env.SUPABASE_SECRET_KEY)throw new WorkspaceError('storage_unavailable','File storage is being configured.',503);
  if(!['workspace-quarantine','workspace-sealed'].includes(bucket)||!key||key.includes('..'))throw new WorkspaceError('file_identity','File identity unavailable.',400);
  return providerFetch(`${config(env).supabase}/storage/v1/object/${bucket}/${objectPath(key)}`,{method,headers:{apikey:env.SUPABASE_SECRET_KEY,...(bytes?{'Content-Type':media,'x-upsert':'false'}:{})},...(bytes?{body:bytes}:{})},fetcher);
}
export async function handleFile(request,env,session){
  const url=new URL(request.url),match=url.pathname.match(/^\/api\/files\/([a-f0-9-]+)\/(upload|download)$/i);if(!match)return null;
  const id=uuid(match[1],'file'),org=uuid(url.searchParams.get('business'),'business'),action=match[2];
  if(action==='upload'){
    if(request.method!=='PUT')return json({error:{message:'Use PUT to upload a file.'}},405);
    requireOrigin(request,env);requireCsrf(request,session);await limited(env,`upload:${org}`);
    const info=await rpc(env,session.access_token,'wm_file_access',{p_org:org,p_id:id,p_action:'upload'});
    const bytes=await readBounded(request.body,Number(info.bytes));verifyContent(bytes,info);const checksum=await sha256(bytes);
    const r=await storage(env,'workspace-quarantine',info.object_key,{method:'POST',bytes});
    if(!r.ok){
      // Storage may have succeeded before a response was lost. Never overwrite.
      const existing=await storage(env,'workspace-quarantine',info.object_key);
      if(!existing.ok||await sha256(await readBounded(existing.body,Number(info.bytes)))!==checksum)throw new WorkspaceError('upload_unknown','Upload needs checking. Please reload Files before retrying.',409);
    }
    // Re-check current membership and the parent after the byte transfer.
    await rpc(env,session.access_token,'wm_file_access',{p_org:org,p_id:id,p_action:'upload'});
    return json(await machineRpc(env,'wm_file_uploaded',{p_org:org,p_id:id,p_checksum:checksum,p_bytes:bytes.length,p_media_type:info.media_type}));
  }
  if(request.method!=='GET')return json({error:{message:'Use GET to download a file.'}},405);
  const info=await rpc(env,session.access_token,'wm_file_access',{p_org:org,p_id:id,p_action:'download'}),r=await storage(env,'workspace-sealed',info.object_key);
  if(!r.ok)throw new WorkspaceError('file_unavailable','This file could not be retrieved.',503);
  const bytes=await readBounded(r.body,Number(info.bytes));if(await sha256(bytes)!==info.checksum)throw new WorkspaceError('file_integrity','File verification failed. The studio has to check this file.',503);
  await rpc(env,session.access_token,'wm_file_access',{p_org:org,p_id:id,p_action:'download'});
  const response=secure(new Response(bytes,{headers:{'Content-Type':info.media_type,'Content-Length':String(bytes.length),'Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(info.name)}`}}));
  response.headers.set('Content-Security-Policy',"sandbox; default-src 'none'; frame-ancestors 'none'");return response;
}
export async function scanFile(env,operation,fetcher=fetch){
  if(!env.CLOUDMERSIVE_API_KEY)throw new WorkspaceError('scanner_unavailable','File scanning is being configured.',503);
  const org=operation.organization_id,id=operation.payload.file_id;
  const file=await machineRpc(env,'wm_file_scan_input',{p_org:org,p_id:id},fetcher);
  const source=await storage(env,'workspace-quarantine',file.upload_object_key,{fetcher});if(!source.ok)throw new WorkspaceError('file_unavailable','The quarantine object is unavailable.',503);
  const bytes=await readBounded(source.body,Number(file.actual_bytes));const checksum=await sha256(bytes);
  if(checksum!==file.checksum||checksum!==operation.payload.checksum)throw new WorkspaceError('file_integrity','The quarantine object changed.',409);
  verifyContent(bytes,{name:file.original_name,media_type:file.declared_media_type,bytes:file.declared_bytes});
  const form=new FormData();form.append('inputFile',new Blob([bytes],{type:file.actual_media_type}),file.original_name);
  const headers={Apikey:env.CLOUDMERSIVE_API_KEY,allowExecutables:'false',allowInvalidFiles:'false',allowScripts:'false',allowPasswordProtectedFiles:'false',allowMacros:'false',allowXmlExternalEntities:'false',allowInsecureDeserialization:'false',allowHtml:'false',restrictFileTypes:'.png,.jpg,.jpeg,.webp,.pdf,.txt,.csv,.docx,.xlsx'};
  const response=await providerFetch('https://api.cloudmersive.com/virus/scan/file/advanced',{method:'POST',headers,body:form},fetcher);
  if(!response.ok)throw new WorkspaceError('scanner_unavailable','The scanner did not return a result.',503);
  const result=await response.json(),assessment=cleanScanResult(result);if(!assessment.complete)throw new WorkspaceError('scan_incomplete','The scanner returned an incomplete result.',503);
  const sealedKey=assessment.clean?`${org}/${id}/${checksum}`:null;
  if(assessment.clean){
    const written=await storage(env,'workspace-sealed',sealedKey,{method:'POST',bytes,media:file.actual_media_type,fetcher});
    if(!written.ok){const prior=await storage(env,'workspace-sealed',sealedKey,{fetcher});if(!prior.ok||await sha256(await readBounded(prior.body,bytes.length))!==checksum)throw new WorkspaceError('seal_unavailable','The checked file could not be sealed.',503);}
  }
  const evidence={policy:SCAN_POLICY,clean:assessment.clean,checksum,observed_at:new Date().toISOString(),provider:'cloudmersive',flags:Object.fromEntries(Object.entries(result).filter(([k,v])=>k.startsWith('Contains')&&typeof v==='boolean'))};
  await machineRpc(env,'wm_file_scan_complete',{p_org:org,p_id:id,p_checksum:checksum,p_clean:assessment.clean,p_policy:SCAN_POLICY,p_evidence:evidence,p_sealed_key:sealedKey},fetcher);
  return {settled:true,readback_matches:true,evidence_reference:`file:${id}:${checksum}`,observed_at:evidence.observed_at,file_state:assessment.clean?'ready':'rejected'};
}
