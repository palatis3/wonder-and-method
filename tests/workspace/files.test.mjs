import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {database,actor,admin,command,ids} from './database.mjs';
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
