import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
const q={bytes_identity:'Synthetic account A',witness_identity:'Synthetic account B',custody_reference:'Synthetic offline custodian',witness_hooks_version:'tenant-witness-v1'};
const schedule=(db,input,key=crypto.randomUUID())=>db.query('select public.wm_backup_command($1,$2,$3,$4) r',[ids.org,'backup.schedule',JSON.stringify({enabled:true,expected_version:0,key_id:'synthetic',qualification:q,...input}),key]).then(r=>r.rows[0].r);
const machine=async(db)=>actor(db,ids.operator,{role:'service_role'});
const generate=async(db)=>{await machine(db);return (await db.query('select public.wm_backup_generate(10) r')).rows[0].r;};
test('standing backup schedule needs current recovery MFA, numeric versions and has no raw or legacy bypass',async()=>{
 const db=await database();try{
  await actor(db,ids.client);await assert.rejects(schedule(db),/unavailable|operator/);
  await actor(db,ids.operator);await assert.rejects(schedule(db),/unavailable|operator/);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(schedule(db,{expected_version:'0'}),/Whole version/);
  const key=crypto.randomUUID(),s=await schedule(db,{},key);assert.equal(s.enabled,true);assert.deepEqual(await schedule(db,{},key),s);
  await assert.rejects(schedule(db),/changed/);await assert.rejects(db.query('select * from wm.tenant_backup_schedules'),/permission denied/);
  await assert.rejects(db.query('select public.wm_backup_status_adhoc($1)',[ids.org]),/permission denied/);
 }finally{await db.close();}
});
test('daily preparation uses explicit standing authority after logout and does not duplicate a period',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});const s=await schedule(db);
  await admin(db);await db.query('delete from auth.sessions where user_id=$1',[ids.operator]);
  const jobs=await generate(db);assert.equal(jobs.length,1);assert.equal((await generate(db)).length,0);
  const claimed=(await db.query('select public.wm_backup_claim(2) r')).rows[0].r[0];
  const c=(await db.query('select public.wm_backup_context($1,$2,$3) r',[ids.org,claimed.id,claimed.lease_token])).rows[0].r;assert.equal(c.schedule_id,s.id);assert.equal(c.schedule_version,1);
  await admin(db);const row=(await db.query('select session_id,next_at from wm.tenant_backup_jobs j join wm.tenant_backup_schedules s on s.id=j.schedule_id where j.id=$1',[claimed.id])).rows[0];assert.equal(row.session_id,null);assert.ok(new Date(row.next_at).getTime()>Date.now()+23*3600000);
 }finally{await db.close();}
});
test('changing a standing schedule cancels its old work and cannot revive it by enabling again',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});await schedule(db);await generate(db);
  const j=(await db.query('select public.wm_backup_claim(2) r')).rows[0].r[0];
  await actor(db,ids.operator,{aal:'aal2'});await schedule(db,{enabled:false,expected_version:1});await machine(db);await assert.rejects(db.query('select public.wm_backup_context($1,$2,$3)',[ids.org,j.id,j.lease_token]),/lease unavailable|changed/);
  await actor(db,ids.operator,{aal:'aal2'});await schedule(db,{enabled:true,expected_version:2});const fresh=await generate(db);assert.equal(fresh.length,1);assert.notEqual(fresh[0].id,j.id);
  await admin(db);assert.equal((await db.query('select state from wm.tenant_backup_jobs where id=$1',[j.id])).rows[0].state,'cancelled');
 }finally{await db.close();}
});
test('current grant and recovery generation fence recurring work; schedule authority is excluded from snapshots',async()=>{
 for(const changed of ['grant','generation']){
  const db=await database();try{
   await actor(db,ids.operator,{aal:'aal2'});await schedule(db);await admin(db);
   const captured=(await db.query('select wm.backup_snapshot($1) r',[ids.org])).rows[0].r;assert.equal(captured.coverage.find(x=>x.table==='tenant_backup_schedules').classification,'excluded');assert.equal(JSON.parse(captured.snapshot).tables.tenant_backup_schedules,undefined);
   if(changed==='grant')await db.query('update wm.operator_assignments set revoked_at=now() where organization_id=$1',[ids.org]);else await db.query('update wm.tenant_guards set recovery_generation=recovery_generation+1 where organization_id=$1',[ids.org]);
   assert.equal((await generate(db)).length,0);await admin(db);const row=(await db.query('select * from wm.tenant_backup_schedules where organization_id=$1',[ids.org])).rows[0];assert.equal(row.enabled,false);assert.equal(row.reason,'current_authority_or_generation_changed');
  }finally{await db.close();}
 }
});
test('revoking and restoring a staff row never revives an old on-demand or standing backup lease',async()=>{
 for(const mode of ['on_demand','standing']){
  const db=await database();try{
   await admin(db);await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['recovery'],now()+interval '1 year')",[ids.operator]);
   await actor(db,ids.operator,{aal:'aal2'});
   if(mode==='standing'){await schedule(db);await generate(db);}else await db.query('select public.wm_backup_command($1,$2,$3,$4)',[ids.org,'backup.request',{key_id:'synthetic',qualification:q},crypto.randomUUID()]);
   await machine(db);const j=(await db.query('select public.wm_backup_claim(2) r')).rows[0].r[0];await db.query('select public.wm_backup_context($1,$2,$3)',[ids.org,j.id,j.lease_token]);
   await admin(db);await db.query('update wm.staff set revoked_at=now() where user_id=$1',[ids.operator]);await machine(db);await assert.rejects(db.query('select public.wm_backup_context($1,$2,$3)',[ids.org,j.id,j.lease_token]),/changed/);
   await admin(db);await db.query('update wm.staff set revoked_at=null where user_id=$1',[ids.operator]);await machine(db);await assert.rejects(db.query('select public.wm_backup_context($1,$2,$3)',[ids.org,j.id,j.lease_token]),/changed/);
   if(mode==='standing'){await admin(db);await db.query('update wm.tenant_backup_schedules set next_at=now() where organization_id=$1',[ids.org]);assert.deepEqual(await generate(db),[]);await admin(db);assert.equal((await db.query('select enabled from wm.tenant_backup_schedules where organization_id=$1',[ids.org])).rows[0].enabled,false);}
  }finally{await db.close();}
 }
});
