import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {database,actor,admin,command,ids} from './database.mjs';
import {scanFile,filePolicy,handleFile} from '../../worker/workspace/files/service.mjs';
import {readServiceEffect} from '../../worker/workspace/effects/reconciliation.mjs';
import {sha256} from '../../worker/workspace/files/content.mjs';
import {verifyContent,cleanScanResult} from '../../worker/workspace/files/content.mjs';
const access=async(db,id,action='download')=>(await db.query('select public.wm_file_access($1,$2,$3) as result',[ids.org,id,action])).rows[0].result;
test('file bytes must match their declaration and Office archives reject macros, active content and excessive expansion',()=>{
 const text=strToU8('Plain business text');assert.equal(verifyContent(text,{name:'brief.txt',media_type:'text/plain',bytes:text.length}),'text/plain');
 assert.throws(()=>verifyContent(text,{name:'photo.png',media_type:'image/png',bytes:text.length}),/not a PNG/);
 const active=strToU8('<script>alert(1)</script>');assert.throws(()=>verifyContent(active,{name:'brief.txt',media_type:'text/plain',bytes:active.length}),/unsupported/);
 const office=zipSync({'[Content_Types].xml':strToU8('<Types/>'),'word/document.xml':strToU8('<document>Brief</document>')});
 assert.equal(verifyContent(office,{name:'brief.docx',media_type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:office.length}),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const macro=zipSync({'[Content_Types].xml':strToU8('<Types/>'),'word/document.xml':strToU8('<document/>'),'word/vbaProject.bin':new Uint8Array([1,2,3])});
 assert.throws(()=>verifyContent(macro,{name:'brief.docx',media_type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:macro.length}),/invalid, encrypted/);
 assert.deepEqual(cleanScanResult({CleanResult:true}),{complete:false,clean:false});
});
test('quarantine denies downloads and shared files cannot bypass an internal parent; revocation blocks ready bytes',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});const internal=await command(db,'message_send',{engagement_id:ids.engagement,body:'Private studio note',visibility:'internal'});
  await actor(db,ids.client);await assert.rejects(command(db,'file_intent',{engagement_id:ids.engagement,message_id:internal.id,name:'brief.txt',media_type:'text/plain',bytes:5,visibility:'shared'}),/audience/);
  const f=await command(db,'file_intent',{engagement_id:ids.engagement,name:'brief.txt',media_type:'text/plain',bytes:5,visibility:'shared'});
  assert.ok((await access(db,f.id,'upload')).object_key);await assert.rejects(access(db,f.id),/checks are not complete/);
  const checksum='a'.repeat(64);await actor(db,ids.operator,{role:'service_role'});
  await db.query('select public.wm_file_uploaded($1,$2,$3,5,\'text/plain\')',[ids.org,f.id,checksum]);
  await actor(db,ids.client);await assert.rejects(access(db,f.id),/checks are not complete/);
  await actor(db,ids.operator,{role:'service_role'});
  await assert.rejects(db.query(`select public.wm_file_scan_complete($1,$2,$3,true,'synthetic','{}','other-tenant/file')`,[ids.org,f.id,checksum]),/identity/);
  await db.query(`select public.wm_file_scan_complete($1,$2,$3,true,'synthetic','{}',$4)`,[ids.org,f.id,checksum,`${ids.org}/${f.id}/${checksum}`]);
  await actor(db,ids.client);assert.equal((await access(db,f.id)).checksum,checksum);
  await admin(db);await db.query(`update wm.memberships set revoked_at=now(),status='revoked' where organization_id=$1 and user_id=$2`,[ids.org,ids.client]);
  await actor(db,ids.client);await assert.rejects(access(db,f.id),/unavailable/);
 }finally{await db.close();}
});

test('unscanned files require verified bytes, current uploader access, and a machine-only release',async()=>{
 const db=await database();try{
  await actor(db,ids.client);const f=await command(db,'file_intent',{engagement_id:ids.engagement,name:'brief.txt',media_type:'text/plain',bytes:5,visibility:'shared'}),checksum='b'.repeat(64),key=`${ids.org}/${f.id}/${checksum}`;
  await assert.rejects(db.query('select public.wm_file_release_unscanned($1,$2,$3,$4)',[ids.org,f.id,checksum,key]),/permission denied/);
  await actor(db,ids.operator,{role:'service_role'});await db.query("select public.wm_file_uploaded($1,$2,$3,5,'text/plain')",[ids.org,f.id,checksum]);
  await assert.rejects(db.query('select public.wm_file_release_unscanned($1,$2,$3,$4)',[ids.org,f.id,checksum,'other/file']),/identity/);
  await db.query('select public.wm_file_release_unscanned($1,$2,$3,$4)',[ids.org,f.id,checksum,key]);
  await actor(db,ids.client);assert.equal((await access(db,f.id)).malware_status,'unscanned');
  await admin(db);const record=(await db.query('select scan_state,scan_observation from wm.attachments where id=$1',[f.id])).rows[0];assert.equal(record.scan_state,'unscanned');assert.equal(record.scan_observation.malware_scanned,false);
  await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);
  await actor(db,ids.client);await assert.rejects(access(db,f.id),/unavailable/);
  await actor(db,ids.operator,{role:'service_role'});await assert.rejects(db.query('select public.wm_file_release_unscanned($1,$2,$3,$4)',[ids.org,f.id,checksum,key]),/Uploader access/);
 }finally{await db.close();}
});
test('invite-only file preparation seals bytes without contacting a scanner; missing mode never bypasses scanning',async()=>{
 const bytes=strToU8('Brief'),checksum=await sha256(bytes),fileId=crypto.randomUUID();let released=false,sealed=false;const calls=[];
 const env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic',SUPABASE_PUBLISHABLE_KEY:'synthetic',FILE_POLICY:'invite_only_unscanned'};
 const operation={organization_id:ids.org,payload:{file_id:fileId,checksum}};
 const fetcher=async(url,options={})=>{
  calls.push(url);assert.equal(new URL(url).host,'synthetic.supabase.co');
  if(url.endsWith('/wm_file_scan_input'))return Response.json({upload_object_key:'synthetic/upload',actual_bytes:5,declared_bytes:5,checksum,original_name:'brief.txt',declared_media_type:'text/plain',actual_media_type:'text/plain'});
  if(url.endsWith('/wm_file_release_unscanned')){released=true;assert.equal(JSON.parse(options.body).p_checksum,checksum);return Response.json({state:'unscanned'});}
  if(options.method==='POST'){sealed=true;return Response.json({});}
  return new Response(bytes);
 };
 const proof=await scanFile(env,operation,fetcher);assert.equal(proof.file_state,'unscanned');assert.equal(proof.malware_scanned,false);assert.ok(sealed&&released);assert.equal(calls.length,5);
 released=false;const lost=await scanFile(env,operation,async(url,opt)=>{if(url.includes('workspace-sealed')&&opt?.body)throw new Error('Synthetic lost POST acknowledgement');return fetcher(url,opt);});assert.equal(lost.file_state,'unscanned');assert.ok(released);
 assert.equal(filePolicy({}),'scan_required');assert.equal(filePolicy({FILE_POLICY:'typo'}),'scan_required');
 await assert.rejects(scanFile({...env,FILE_POLICY:'scan_required'},operation,fetcher),/scanning is being configured/);
 released=false;await assert.rejects(scanFile(env,operation,async(url,opt)=>url.includes('workspace-sealed')&&!opt?.body?new Response('WRONG'):fetcher(url,opt)),/saved and verified/);assert.equal(released,false);
});
test('unscanned downloads use attachment disposition, sandbox headers and authorization after byte retrieval',async(t)=>{
 const bytes=strToU8('Brief'),checksum=await sha256(bytes);let checks=0;
 const env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic',SUPABASE_PUBLISHABLE_KEY:'synthetic'};
 t.mock.method(globalThis,'fetch',async(url)=>{if(url.endsWith('/wm_file_access')){checks++;return Response.json({object_key:'synthetic/sealed',bytes:5,checksum,media_type:'text/plain',name:'brief.txt',malware_status:'unscanned'});}return new Response(bytes);});
 const response=await handleFile(new Request(`${env.APP_ORIGIN}/api/files/${crypto.randomUUID()}/download?business=${ids.org}`),env,{access_token:'synthetic'});
 assert.equal(response.headers.get('content-disposition').startsWith('attachment;'),true);assert.match(response.headers.get('content-security-policy'),/sandbox/);assert.equal(checks,2);assert.equal(await response.text(),'Brief');
});

test('interrupted unscanned release recovers verified existing bytes without repeating a write or scan',async()=>{
 const bytes=strToU8('Brief'),checksum=await sha256(bytes),fileId=crypto.randomUUID();let releases=0,gets=0;
 const env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic',SUPABASE_PUBLISHABLE_KEY:'synthetic',FILE_POLICY:'invite_only_unscanned'};
 const permit={operation:{kind:'file_scan',organization_id:ids.org},attempt:{id:crypto.randomUUID(),dispatch_nonce:crypto.randomUUID()}};
 const rpc=async(_env,name)=>{if(name==='wm_service_readback')return {id:fileId,state:'quarantined',checksum,bytes:5};assert.equal(name,'wm_file_release_unscanned');releases++;return {state:'unscanned'};};
 const fetcher=async(url,opt)=>{assert.equal(opt.method,'GET');assert.ok(url.includes(`/workspace-sealed/${ids.org}/${fileId}/${checksum}`));gets++;return new Response(bytes);};
 const result=await readServiceEffect(env,permit,{rpc,fetcher});assert.equal(result.file_state,'unscanned');assert.equal(releases,1);assert.equal(gets,2);
 await assert.rejects(readServiceEffect({...env,FILE_POLICY:'scan_required'},permit,{rpc,fetcher}),/needs checking/);assert.equal(releases,1);
 await assert.rejects(readServiceEffect(env,permit,{rpc,fetcher:async()=>new Response('WRONG')}),/needs checking/);assert.equal(releases,1);
});
