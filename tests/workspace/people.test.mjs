import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
const people=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_people_command($1,$2,$3::jsonb,$4) as r',[ids.org,name,JSON.stringify(input),key])).rows[0].r;

test('invitations require confirmed matching identity, expire, and never grant decision authority',async()=>{
 const db=await database();try{
  await actor(db,ids.viewer);await assert.rejects(people(db,'invitation.create',{email:'someone@example.com',role:'contributor'}),/unavailable/);
  await actor(db,ids.client);await assert.rejects(people(db,'invitation.create',{email:'someone@example.com',role:'operator'}),/customer role/);
  const invite=await people(db,'invitation.create',{email:ids.outsider+'@synthetic.example',role:'contributor'});
  await admin(db);await db.query("update wm.invitations set expires_at=now()-interval '1 second' where id=$1",[invite.id]);
  await actor(db,ids.outsider);await assert.rejects(people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic North'}),/unavailable/);
  await admin(db);await db.query("update wm.invitations set expires_at=now()+interval '1 day' where id=$1",[invite.id]);
  await actor(db,ids.viewer);await assert.rejects(people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic North'}),/unavailable/);
  await actor(db,ids.outsider);await assert.rejects(people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic South'}),/unavailable/);
  await admin(db);await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.outsider]);
  await actor(db,ids.outsider);await assert.rejects(people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic North'}),/identity/);
  await admin(db);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.outsider]);
  await actor(db,ids.outsider);const key=crypto.randomUUID();const accepted=await people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic North'},key);
  assert.deepEqual(await people(db,'invitation.accept',{id:invite.id,business_name:'Synthetic North'},key),accepted);
  const w=(await db.query('select public.wm_workspace($1) as r',[ids.org])).rows[0].r;
  assert.equal(w.viewer.role,'contributor');assert.equal(w.invitations.length,0);assert.equal(w.authorities.some(a=>a.user_id===ids.outsider),false);
 }finally{await db.close();}
});

test('member revocation removes authority immediately and preserves a business administrator',async()=>{
 const db=await database();try{
  await actor(db,ids.client);
  const oldInvite=await people(db,'invitation.create',{email:ids.viewer+'@synthetic.example',role:'customer_admin'});
  await people(db,'member.change',{user_id:ids.viewer,role:'viewer',status:'revoked',expected_version:1});
  await actor(db,ids.viewer);await assert.rejects(people(db,'invitation.accept',{id:oldInvite.id,business_name:'Synthetic North'}),/unavailable/);
  await actor(db,ids.client);const freshInvite=await people(db,'invitation.create',{email:ids.viewer+'@synthetic.example',role:'customer_admin'});
  await actor(db,ids.viewer);await people(db,'invitation.accept',{id:freshInvite.id,business_name:'Synthetic North'});
  await actor(db,ids.client);
  await actor(db,ids.viewer);await people(db,'member.change',{user_id:ids.client,role:'customer_admin',status:'revoked',expected_version:1});
  await assert.rejects(people(db,'member.change',{user_id:ids.viewer,role:'viewer',status:'active',expected_version:3}),/at least one/);
  await actor(db,ids.client);await assert.rejects(db.query('select public.wm_workspace($1)',[ids.org]),/unavailable/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.engagement_authorities where user_id=$1 and revoked_at is null',[ids.client])).rows[0].n,0);
 }finally{await db.close();}
});

test('decision-maker replacement requires verified operator, current version and separate customer identity',async()=>{
 const db=await database();try{
  await actor(db,ids.client);await people(db,'member.change',{user_id:ids.viewer,role:'contributor',status:'active',expected_version:1});
  const payload={engagement_id:ids.engagement,user_id:ids.viewer,domain:'content',kind:'primary',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+86400000).toISOString(),evidence:'Synthetic owner identity verified independently'};
  await assert.rejects(people(db,'authority.assign',payload),/Verified studio/);
  await actor(db,ids.operator);await assert.rejects(people(db,'authority.assign',payload),/unavailable/);
  await admin(db);const a=(await db.query("select id,version from wm.engagement_authorities where organization_id=$1 and domain='content'",[ids.org])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});
  await assert.rejects(people(db,'authority.assign',{...payload,user_id:ids.operator}),/their own/);
  await assert.rejects(people(db,'authority.assign',{...payload,user_id:ids.outsider}),/active customer/);
  await assert.rejects(people(db,'authority.assign',{...payload,previous_id:a.id,expected_version:99}),/changed/);
  const replacement=await people(db,'authority.assign',{...payload,previous_id:a.id,expected_version:a.version});assert.ok(replacement.receipt_id);
  await actor(db,ids.client,{age:1000});await assert.rejects(people(db,'authority.revoke',{id:replacement.id,expected_version:1,reason:'Withdraw'}),/Confirm your sign-in/);
  await actor(db,ids.client);await people(db,'authority.revoke',{id:replacement.id,expected_version:1,reason:'Withdraw'});
  await admin(db);assert.equal((await db.query("select count(*)::int n from wm.engagement_authorities where organization_id=$1 and domain='content' and revoked_at is null",[ids.org])).rows[0].n,0);
 }finally{await db.close();}
});

test('authority changes cancel all pending positive operations at the tenant version boundary, preserving in-flight and defensive work',async()=>{
 const db=await database();try{
  await admin(db);const other=crypto.randomUUID();
  await db.query("insert into wm.engagements(organization_id,id,service_type,catalog_id,catalog_version,title,created_by) values($1,$2,'seo','fixture','fixture','Other service',$3)",[ids.org,other,ids.operator]);
  for(const [eng,state,positive] of [[ids.engagement,'pending',true],[other,'pending',true],[other,'in_flight',true],[other,'pending',false]]){
   const id=crypto.randomUUID();await db.query("insert into wm.operations(organization_id,id,engagement_id,actor_id,operation_key,kind,payload,state,positive_effect,authority_version,recovery_generation,external_generation) values($1,$2,$3,$4,$2::uuid::text,'fixture','{}',$5,$6,1,1,'fixture-generation-1')",[ids.org,id,eng,ids.operator,state,positive]);
   await db.query("insert into wm.outbox_jobs(organization_id,operation_id,kind,state) values($1,$2,'fixture','leased')",[ids.org,id]);
  }
  const a=(await db.query("select id from wm.engagement_authorities where organization_id=$1 and domain='content'",[ids.org])).rows[0];
  await actor(db,ids.client);await people(db,'authority.revoke',{id:a.id,expected_version:1,reason:'Change decision-maker'});
  await admin(db);const operations=(await db.query("select state,positive_effect from wm.operations where kind='fixture'")).rows;
  assert.equal(operations.filter(x=>x.state==='cancelled').length,2);
  assert.equal(operations.filter(x=>x.state==='in_flight').length,1);
  assert.equal(operations.filter(x=>x.state==='pending'&&!x.positive_effect).length,1);
  assert.equal((await db.query("select count(*)::int n from wm.outbox_jobs where state='cancelled'")).rows[0].n,2);
 }finally{await db.close();}
});
