import test from 'node:test';
import assert from 'node:assert/strict';
import {independentEnvironment} from './independent-bucket.mjs';
import {assertObjectWritable,claimObjectWrite,markObjectNoRecreate} from '../../worker/workspace/retention/fences.mjs';
import {scanFile} from '../../worker/workspace/files/service.mjs';
import {sha256} from '../../worker/workspace/files/content.mjs';
import {ids} from './database.mjs';
test('independent first-write claims survive primary rollback, isolate keys and permit one concurrent winner',async()=>{
 const e=independentEnvironment(),identity={backend:'supabase',bucket:'workspace-inbound',key:'inbound/'+crypto.randomUUID()+'/'+crypto.randomUUID()+'/'+'a'.repeat(64)};
 const results=await Promise.all([claimObjectWrite(e,identity),claimObjectWrite({...e},identity)]);assert.deepEqual(results.sort(),[false,true]);assert.equal(await claimObjectWrite({...e},identity),false);
 assert.equal(await claimObjectWrite(e,{...identity,key:identity.key+'b'}),true);
});
test('independent no-recreate marker blocks even unassigned inbound capture after primary history disappears',async()=>{
 const e=independentEnvironment(),identity={backend:'supabase',bucket:'workspace-inbound',key:'inbound/'+crypto.randomUUID()+'/'+crypto.randomUUID()+'/'+'b'.repeat(64)},job={id:crypto.randomUUID(),dispatch_id:crypto.randomUUID(),attempt_nonce:crypto.randomUUID()};
 await markObjectNoRecreate(e,ids.org,identity,job);await assert.rejects(assertObjectWritable({...e},identity),x=>x.code==='independent_object_fenced');await assert.rejects(claimObjectWrite({...e},identity),x=>x.code==='independent_object_fenced');
 await assert.rejects(claimObjectWrite({},identity));
});
test('rolled-back SQL seal permissions cannot cause a second canonical POST or recreate a retained object',async()=>{
 const bytes=new TextEncoder().encode('Brief'),checksum=await sha256(bytes),id=crypto.randomUUID(),identity={backend:'supabase',bucket:'workspace-sealed',key:`${ids.org}/${id}/${checksum}`};let posts=0;
 const e={...independentEnvironment(),APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic',SUPABASE_PUBLISHABLE_KEY:'synthetic',FILE_POLICY:'invite_only_unscanned'},operation={organization_id:ids.org,payload:{file_id:id,checksum}};
 const fetcher=async(url,opt={})=>{
  if(url.endsWith('/wm_file_scan_input'))return Response.json({upload_object_key:'synthetic/upload',actual_bytes:5,declared_bytes:5,checksum,original_name:'brief.txt',declared_media_type:'text/plain',actual_media_type:'text/plain'});
  if(url.endsWith('/wm_file_seal_write_once'))return Response.json(true); // primary rollback cannot erase independent permission
  if(url.endsWith('/wm_file_release_unscanned'))return Response.json({state:'unscanned'});
  if(opt.method==='POST')posts++;return new Response(bytes);
 };
 await scanFile(e,operation,fetcher);await scanFile({...e},operation,fetcher);assert.equal(posts,1);
 await markObjectNoRecreate(e,ids.org,identity,{id:crypto.randomUUID(),dispatch_id:crypto.randomUUID(),attempt_nonce:crypto.randomUUID()});
 await assert.rejects(scanFile({...e},operation,fetcher),x=>x.code==='independent_object_fenced');assert.equal(posts,1);
});
