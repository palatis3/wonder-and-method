import {WorkspaceError,UUID,canonical,digest} from '../../../src/workspace/domain/contracts.mjs';
import {providerFetch} from '../http.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
const invalid=(code='website_unconfirmed')=>{throw new WorkspaceError(code,'Website publication needs verification before continuing.',503);};
const ID=/^[a-f0-9]{32}$/i,WORKER=/^[a-z0-9][a-z0-9_-]{0,62}$/;
export function publicationContext(env,c){
 if(!c||!ID.test(c.account_id)||!WORKER.test(c.worker_name)||!UUID.test(c.version_id)||!UUID.test(c.baseline_deployment_id)||!UUID.test(c.artifact_id)||!['staging','production'].includes(c.environment)||c.environment!==env.ENVIRONMENT||!/^[a-f0-9]{64}$/.test(c.artifact_digest)||!/^[a-f0-9]{64}$/.test(c.config_digest))invalid();
 const allowed=JSON.parse(env.WEBSITE_TARGETS||'[]');if(!Array.isArray(allowed)||!allowed.some(t=>t.account_id===c.account_id&&t.worker_name===c.worker_name&&t.environment===c.environment&&t.origin===c.origin))invalid('website_not_qualified');
 let u;try{u=new URL(c.origin);}catch{invalid();}if(u.protocol!=='https:'||u.origin!==c.origin||u.username||u.password||u.port||u.hostname==='localhost'||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))invalid();
 return c;
}
export async function cloudflareRequest(env,c,path,{method='GET',body,fetcher=fetch}={}){
 publicationContext(env,c);if(!env.CLOUDFLARE_WEBSITE_TOKEN||!/^\/(versions|deployments)(?:\/[a-f0-9-]{36})?(?:\?page=\d+&per_page=100)?$/.test(path))invalid();
 const url=`https://api.cloudflare.com/client/v4/accounts/${c.account_id}/workers/scripts/${c.worker_name}${path}`;
 const response=await providerFetch(url,{method,headers:{Authorization:`Bearer ${env.CLOUDFLARE_WEBSITE_TOKEN}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})},fetcher);
 const value=await response.json().catch(()=>null);if(!response.ok||value?.success!==true||!value.result)invalid();return value.result;
}
function exactDeployment(d,c){return Boolean(d&&UUID.test(d.id||'')&&d.strategy==='percentage'&&Array.isArray(d.versions)&&d.versions.length===1&&d.versions[0].version_id===c.version_id&&d.versions[0].percentage===100);}
export function publicationLabel(permit){return `wm-attempt=${permit.attempt.id};artifact=${permit.context.artifact_id}`;}
async function currentDeployment(env,c,fetcher){const r=await cloudflareRequest(env,c,'/deployments?page=1&per_page=100',{fetcher});if(!Array.isArray(r.deployments)||!r.deployments.length)invalid();return r.deployments[0];}
async function runtimeReadback(c,fetcher){
 const nonce=crypto.randomUUID(),u=new URL('/__wm_release',c.origin);u.searchParams.set('nonce',nonce);
 const r=await providerFetch(u.href,{headers:{'Cache-Control':'no-cache','X-WM-Release-Nonce':nonce}},fetcher);const p=await r.json().catch(()=>null);
 if(!r.ok||p?.nonce!==nonce||p.version_id!==c.version_id||p.release_marker!==c.release_marker||!/(?:no-store|private)/i.test(r.headers.get('cache-control')||''))invalid('website_runtime_unconfirmed');
 return {origin:c.origin,version_id:p.version_id,release_marker:p.release_marker,nonce,observed_at:new Date().toISOString()};
}
export async function readWebsiteEffect(env,permit,{fetcher=fetch}={}){
 const c=publicationContext(env,permit.context);const label=publicationLabel(permit),known=permit.operation.provider_reference||permit.attempt.provider_request_id;let deployment;
 if(known){if(!UUID.test(known))invalid();deployment=await cloudflareRequest(env,c,'/deployments/'+known,{fetcher});if(deployment.id!==known||deployment.annotations?.['workers/message']!==label||!exactDeployment(deployment,c))invalid();}
 else{
  // A desired current version alone cannot attribute a timed-out POST. Search
  // all bounded history pages for the exact attempt and version vector.
  const matches=[];let complete=false;
  for(let page=1;page<=20;page++){
   const r=await cloudflareRequest(env,c,`/deployments?page=${page}&per_page=100`,{fetcher});if(!Array.isArray(r.deployments))invalid();
   matches.push(...r.deployments.filter(d=>d.annotations?.['workers/message']===label&&exactDeployment(d,c)));
   if(r.deployments.length<100){complete=true;break;}
  }
  if(!complete||matches.length!==1)invalid('website_outcome_unknown');
  deployment=await cloudflareRequest(env,c,'/deployments/'+matches[0].id,{fetcher});if(!exactDeployment(deployment,c)||deployment.annotations?.['workers/message']!==label)invalid();
 }
 const current=await currentDeployment(env,c,fetcher);
 if(current.id!==deployment.id||!exactDeployment(current,c))invalid('website_applied_then_superseded');
 const runtime=await runtimeReadback(c,fetcher);
 return {settled:true,readback_matches:true,evidence_reference:`cloudflare:${c.account_id}:${c.worker_name}:${deployment.id}`,provider_reference:deployment.id,observed_at:new Date().toISOString(),artifact_id:c.artifact_id,artifact_digest:c.artifact_digest,version_id:c.version_id,target_id:c.target_id,deployment_id:deployment.id,runtime};
}
export async function websiteEffect(env,permit,{rpc=machineRpc,fetcher=fetch,readControl=externalControl}={}){
 let writeStarted=false;
 try{
 const args={p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce};
 const c=publicationContext(env,await rpc(env,'wm_website_effect_context',args));permit={...permit,context:c};
 const v=await cloudflareRequest(env,c,'/versions/'+c.version_id,{fetcher});if(v.id!==c.version_id)invalid();
 const current=await currentDeployment(env,c,fetcher);if(current.id!==c.baseline_deployment_id)invalid('website_baseline_changed');
 const latest=await rpc(env,'wm_website_effect_context',args);if(canonical(latest)!==canonical(c))invalid('website_authority_changed');
 const control=await readControl(env,permit.operation.organization_id);if(control.access_state!=='open'||!control.positive_effects_allowed||control.external_generation!==permit.attempt.external_generation)invalid();
 // Exactly one POST; no provider CAS/idempotency is assumed. Any lost response
 // remains an unresolved attempt and is recovered exclusively through reads.
 writeStarted=true;const d=await cloudflareRequest(env,c,'/deployments',{method:'POST',body:{strategy:'percentage',versions:[{version_id:c.version_id,percentage:100}],annotations:{'workers/message':publicationLabel(permit)}},fetcher});
 if(!exactDeployment(d,c)||d.annotations?.['workers/message']!==publicationLabel(permit))invalid();
 await rpc(env,'wm_attempt_checkpoint',{...args,p_reference:d.id});
 return readWebsiteEffect(env,{...permit,attempt:{...permit.attempt,provider_request_id:d.id}},{fetcher});
 }catch(error){error.effect_dispatched=writeStarted;throw error;}
}

// Used by trusted build/upload jobs. Hash the final parts passed to Cloudflare,
// never a source tree rebuilt later. No secret binding values belong here.
export async function artifactManifest(modules,metadata){
 if(!Array.isArray(modules)||!modules.length||modules.length>1000||typeof metadata?.main_module!=='string')invalid('artifact_invalid');
 const names=new Set(),parts=[];let total=0;
 for(const m of modules){if(!/^[A-Za-z0-9_./-]{1,200}$/.test(m.name||'')||m.name.split('/').some(s=>!s||s==='..'||s==='.')||names.has(m.name)||!(m.bytes instanceof Uint8Array)||!['application/javascript+module','text/javascript+module','application/wasm','text/plain','application/octet-stream'].includes(m.type))invalid('artifact_invalid');names.add(m.name);total+=m.bytes.byteLength;parts.push({name:m.name,type:m.type,bytes:m.bytes.byteLength,sha256:await digestBytes(m.bytes)});}
 if(total>10*1024*1024||!names.has(metadata.main_module)||JSON.stringify(metadata).includes('secret_text'))invalid('artifact_invalid');
 parts.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 const release_marker=metadata.bindings?.find(b=>b.type==='plain_text'&&b.name==='WM_RELEASE_MARKER')?.text;
 if(!UUID.test(release_marker||'')||!metadata.bindings?.some(b=>b.type==='version_metadata'&&b.name==='CF_VERSION_METADATA'))invalid('artifact_invalid');
 const config_digest=await digest(metadata),manifest={schema:1,modules:parts,config_digest,release_marker};return {manifest,manifest_json:canonical(manifest),artifact_digest:await digest(manifest),config_digest};
}
async function digestBytes(bytes){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
