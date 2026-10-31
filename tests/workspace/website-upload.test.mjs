import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {uploadWebsite,registerWebsiteReceipt,verifyBuild} from '../../scripts/workspace-upload-website.mjs';
const version='40000000-0000-4000-8000-000000000003',marker='40000000-0000-4000-8000-000000000006';
const env={CLOUDFLARE_WEBSITE_TOKEN:'synthetic-only',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic-only',GITHUB_BUILD_TOKEN:'synthetic-only',WEBSITE_BUILD_WORKFLOWS:'["synthetic/site:.github/workflows/build.yml"]'};
async function fixture(t){const prefix=join(tmpdir(),'wm-website-upload-'),root=await mkdtemp(prefix);t.after(async()=>{if(!resolve(root).startsWith(resolve(prefix)))throw Error('Unexpected test directory');await rm(root,{recursive:true,force:true});});const job={organization_id:'10000000-0000-4000-8000-000000000001',target_id:'40000000-0000-4000-8000-000000000001',account_id:'a'.repeat(32),worker_name:'synthetic-client',dependency_revision:'fixture-v1',repository:'https://github.com/synthetic/site',commit_sha:'a'.repeat(40),ci_reference:'https://github.com/synthetic/site/actions/runs/123',modules:[{name:'worker.mjs',path:'worker.mjs',type:'application/javascript+module'}],metadata:{main_module:'worker.mjs',bindings:[{type:'version_metadata',name:'CF_VERSION_METADATA'},{type:'plain_text',name:'WM_RELEASE_MARKER',text:marker}]}};await writeFile(join(root,'worker.mjs'),'export default {}');await writeFile(join(root,'build.json'),JSON.stringify(job));return {job,manifestPath:join(root,'build.json'),receiptPath:join(root,'receipt.json')};}
test('upload receipt persists before registration and a failed registration reuses that upload without another provider POST',async t=>{
 const f=await fixture(t);let posts=0;
 const fetcher=async(url,o)=>{url=String(url);if(url.startsWith('https://api.github.com/'))return Response.json({status:'completed',conclusion:'success',head_sha:f.job.commit_sha,repository:{full_name:'synthetic/site'},path:'.github/workflows/build.yml'});if(url.startsWith('https://api.cloudflare.com/')){posts++;const part=o.body.get('worker.mjs');assert.equal(await part.text(),'export default {}');return Response.json({success:true,result:{id:version}});}assert.equal(JSON.parse(await readFile(f.receiptPath,'utf8')).state,'uploaded');return new Response(null,{status:503});};
 await assert.rejects(uploadWebsite({...f,env,fetcher}),/registration needs retry/);assert.equal(posts,1);const receipt=JSON.parse(await readFile(f.receiptPath,'utf8'));
 await assert.rejects(uploadWebsite({...f,env,fetcher}),/EEXIST/);assert.equal(posts,1);
 const {manifest,manifest_json,artifact_digest,config_digest}=receipt;const registered=await registerWebsiteReceipt({job:f.job,receipt,artifact:{manifest,manifest_json,artifact_digest,config_digest},env,fetcher:async(url,o)=>{assert.equal(new URL(url).origin,env.SUPABASE_URL);assert.equal(JSON.parse(o.body).p_input.version_id,version);return Response.json({id:'registered-fixture'});}});assert.equal(registered.id,'registered-fixture');assert.equal(posts,1);
 let registrations=0;await assert.rejects(registerWebsiteReceipt({job:{...f.job,commit_sha:'f'.repeat(40),ci_reference:'https://github.com/synthetic/site/actions/runs/999'},receipt,artifact:{manifest,manifest_json,artifact_digest,config_digest},env,fetcher:async()=>{registrations++;}}),/validated build identity changed/);assert.equal(registrations,0);
});
test('unknown upload preserves its pre-dispatch intent and rerunning cannot silently upload again',async t=>{
 const f=await fixture(t);let calls=0;const fetcher=async(url)=>{if(String(url).startsWith('https://api.github.com/'))return Response.json({status:'completed',conclusion:'success',head_sha:f.job.commit_sha,repository:{full_name:'synthetic/site'},path:'.github/workflows/build.yml'});calls++;throw Error('Synthetic response lost after provider acceptance');};
 await assert.rejects(uploadWebsite({...f,env,fetcher}));const r=JSON.parse(await readFile(f.receiptPath,'utf8'));assert.equal(r.state,'upload_started');assert.ok(r.artifact_digest);await assert.rejects(uploadWebsite({...f,env,fetcher}),/EEXIST/);assert.equal(calls,1);
});
test('upload rejects an unsuccessful source build and insecure credential destination before any upload',async t=>{
 const f=await fixture(t);let calls=0;
 await assert.rejects(uploadWebsite({...f,env:{...env,SUPABASE_URL:'http://synthetic.supabase.co'},fetcher:async()=>{calls++;}}),/HTTPS Supabase/);assert.equal(calls,0);
 await assert.rejects(verifyBuild(f.job,env,async()=>Response.json({status:'completed',conclusion:'failure',head_sha:f.job.commit_sha,repository:{full_name:'synthetic/site'},path:'.github/workflows/build.yml'})),/has not passed/);
 await assert.rejects(verifyBuild(f.job,env,async()=>Response.json({status:'completed',conclusion:'success',head_sha:'f'.repeat(40),repository:{full_name:'synthetic/site'},path:'.github/workflows/build.yml'})),/has not passed/);
});
