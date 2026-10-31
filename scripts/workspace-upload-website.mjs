// Trusted build job: upload final modules without deploying, retain the receipt,
// then register that exact receipt. Credentials remain in environment memory.
import {readFile,open,rename,realpath} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {artifactManifest} from '../worker/workspace/website/cloudflare.mjs';
import {canonical} from '../src/workspace/domain/contracts.mjs';
const identityKeys=['organization_id','target_id','account_id','worker_name','dependency_revision','repository','commit_sha','ci_reference'];
function buildIdentity(job){const result={};for(const k of identityKeys){if(typeof job[k]!=='string'||!job[k])throw Error('Missing build identity: '+k);result[k]=job[k];}return result;}
function projectOrigin(env){const u=new URL(env.SUPABASE_URL);if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash||!/^[-a-z0-9]+[.]supabase[.]co$/.test(u.hostname))throw Error('Use the intended HTTPS Supabase project origin.');return u.origin;}
export async function uploadWebsite({manifestPath,receiptPath,env=process.env,fetcher=fetch}){
 projectOrigin(env);
 const job=JSON.parse(await readFile(manifestPath,'utf8')),root=await realpath(dirname(resolve(manifestPath))),modules=[];
 for(const m of job.modules||[]){const p=await realpath(resolve(root,m.path)),rel=relative(root,p);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Artifact files must be inside the build directory.');modules.push({...m,bytes:new Uint8Array(await readFile(p))});}
 const artifact=await artifactManifest(modules,job.metadata);
 const build_identity=buildIdentity(job);
 if(!/^[a-f0-9]{32}$/i.test(job.account_id)||!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(job.worker_name)||!env.CLOUDFLARE_WEBSITE_TOKEN||!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY)throw Error('Trusted upload configuration unavailable.');
 await verifyBuild(job,env,fetcher);
 // Exclusive creation prevents a rerun from silently duplicating an upload.
 // A started receipt without a provider UUID requires explicit reconciliation.
 const intent={schema:1,state:'upload_started',...artifact,build_identity,account_id:job.account_id,worker_name:job.worker_name,started_at:new Date().toISOString()};
 const f=await open(receiptPath,'wx',0o600);try{await f.writeFile(JSON.stringify(intent));await f.sync();}finally{await f.close();}
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify(job.metadata)],{type:'application/json'}));for(const m of modules)form.append(m.name,new Blob([m.bytes],{type:m.type}),m.name);
 const r=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${job.account_id}/workers/scripts/${job.worker_name}/versions`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.CLOUDFLARE_WEBSITE_TOKEN}`},body:form,signal:AbortSignal.timeout(120000)});
 const response=await r.json();if(!r.ok||response.success!==true||!/^[-a-f0-9]{36}$/i.test(response.result?.id||''))throw Error('Upload is unresolved. Retain the intent receipt and reconcile; do not replay.');
 const receipt={...intent,state:'uploaded',version_id:response.result.id,uploaded_at:new Date().toISOString(),provider_version:response.result};
 const output=await open(receiptPath+'.next','wx',0o600);try{await output.writeFile(JSON.stringify(receipt));await output.sync();}finally{await output.close();}await rename(receiptPath+'.next',receiptPath);
 return registerWebsiteReceipt({job,artifact,receipt,env,fetcher});
}
export async function verifyBuild(job,env,fetcher=fetch){
 const repo=/^https:\/\/github[.]com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/.exec(job.repository||''),run=repo&&new RegExp('^https://github[.]com/'+repo[1].replaceAll('.','[.]')+'/actions/runs/([0-9]+)$').exec(job.ci_reference||'');
 const workflows=JSON.parse(env.WEBSITE_BUILD_WORKFLOWS||'[]');if(!repo||!run||!env.GITHUB_BUILD_TOKEN||!Array.isArray(workflows)||!workflows.length)throw Error('A qualified completed GitHub build is required.');
 const r=await fetcher(`https://api.github.com/repos/${repo[1]}/actions/runs/${run[1]}`,{headers:{Authorization:`Bearer ${env.GITHUB_BUILD_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(20000)}),v=await r.json();
 if(!r.ok||v.status!=='completed'||v.conclusion!=='success'||v.head_sha!==job.commit_sha||v.repository?.full_name!==repo[1]||!workflows.includes(repo[1]+':'+v.path))throw Error('The exact trusted source build has not passed.');
}
export async function registerWebsiteReceipt({job,artifact,receipt,env,fetcher=fetch}){
 const origin=projectOrigin(env);
 if(receipt.state!=='uploaded'||receipt.artifact_digest!==artifact.artifact_digest)throw Error('Confirmed exact upload receipt required.');
 if(!receipt.build_identity||canonical(buildIdentity(job))!==canonical(receipt.build_identity))throw Error('The saved validated build identity changed.');
 const saved=receipt.build_identity;
 const r=await fetcher(new URL('/rest/v1/rpc/wm_website_artifact_register',origin),{method:'POST',redirect:'error',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_org:saved.organization_id,p_input:{target_id:saved.target_id,version_id:receipt.version_id,...artifact,repository:saved.repository,commit_sha:saved.commit_sha,ci_reference:saved.ci_reference,upload_receipt:receipt,dependency_revision:saved.dependency_revision}})});
 if(!r.ok)throw Error('Upload receipt is saved; database registration needs retry without uploading again.');return r.json();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [manifestPath,receiptPath,mode]=process.argv.slice(2);if(!manifestPath||!receiptPath||mode&&!['--register'].includes(mode))throw Error('Usage: node scripts/workspace-upload-website.mjs BUILD_MANIFEST RECEIPT_OUTPUT [--register]');
 let r;if(mode==='--register'){const job=JSON.parse(await readFile(manifestPath,'utf8')),receipt=JSON.parse(await readFile(receiptPath,'utf8'));if(receipt.account_id!==job.account_id||receipt.worker_name!==job.worker_name)throw Error('Receipt target changed.');const {manifest,manifest_json,artifact_digest,config_digest}=receipt;r=await registerWebsiteReceipt({job,receipt,artifact:{manifest,manifest_json,artifact_digest,config_digest},env:process.env});}else r=await uploadWebsite({manifestPath,receiptPath});console.log('Uploaded artifact registered: '+r.id);
}
