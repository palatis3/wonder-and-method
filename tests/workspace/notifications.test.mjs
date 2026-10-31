import test from 'node:test';
import assert from 'node:assert/strict';
import {Webhook} from 'svix';
import {database,actor,admin,command,ids} from './database.mjs';
import {prepareNotificationDigests,pollNotificationDelivery,sendCadencedNotification,verifyOutboundWebhook,handleOutboundWebhook,matchingReadback,validateNotificationCommand} from '../../worker/workspace/notifications/service.mjs';
import {notificationViews} from '../../src/workspace/notification-ui.mjs';
import {sha256} from '../../worker/workspace/files/content.mjs';
import {dispatchJobs} from '../../worker/workspace/effects/dispatcher.mjs';
const machine=db=>actor(db,ids.operator,{role:'service_role'});
const pref=async(db,input,org=ids.org)=>(await db.query('select public.wm_notification_command($1,$2,$3::jsonb,$4) r',[org,'notification.preference',JSON.stringify(input),crypto.randomUUID()])).rows[0].r;
const status=async(db,org=ids.org)=>(await db.query('select public.wm_notification_status($1) r',[org])).rows[0].r;
async function setup(db){await db.query("insert into wm.notification_channels values('outbound-test','account-test','staging','Wonder and Method <workspace@synthetic.example>','https://workspace.synthetic.example',true)");await db.query("insert into wm.notification_routes values($1,'outbound-test'),($2,'outbound-test')",[ids.org,ids.other]);}
async function message(db,{org=ids.org,engagement=ids.engagement,created=new Date().toISOString()}={}){
 await admin(db);const id=crypto.randomUUID();await db.query("insert into wm.messages(organization_id,id,engagement_id,direction,visibility,sender_user_id,body,created_at) values($1,$2,$3,'workspace','shared',$4,'Private thread body must never enter email',$5)",[org,id,engagement,ids.operator,created]);return id;
}
async function ready(db,{begin=true}={}){
 await setup(db);await actor(db,ids.viewer);await pref(db,{digest:'none',email_enabled:true,timezone:'UTC',expected_version:0});
 await message(db,{created:new Date(Date.now()-86400000).toISOString()});await machine(db);
 const b=(await db.query('select public.wm_notification_claim() r')).rows[0].r[0];
 await db.query('select public.wm_notification_prepare($1,$2,$3)',[b.organization_id,b.id,b.lease_generation]);
 const job=(await db.query('select public.wm_jobs_claim() r')).rows[0].r.find(x=>x.kind==='message_notify');
 if(!begin)return job;
 return (await db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
}
const reserve=async(db,p)=>(await db.query('select public.wm_notification_reserve($1,$2,$3) r',[p.operation.organization_id,p.attempt.id,p.attempt.dispatch_nonce])).rows[0].r;
async function event(db,p,reserved,{id=crypto.randomUUID(),kind='delivered',provider=crypto.randomUUID(),at=new Date().toISOString(),change={}}={}){
 const payload={type:'email.'+kind,created_at:at,data:{email_id:provider,from:reserved.message.from,to:reserved.message.to,subject:reserved.message.subject,tags:Object.fromEntries(reserved.message.tags.map(t=>[t.name,t.value])),...change}};
 const raw=JSON.stringify(payload);const hash=await sha256(new TextEncoder().encode(raw));
 return {result:(await db.query('select public.wm_notification_webhook($1,$2,$3,$4,$5,$6,$7) r',['outbound-test','account-test','staging',id,raw,hash,'synthetic'])).rows[0].r,provider,id,payload,hash};
}

test('daily and weekly preferences coalesce recipient periods without per-message sends or tenant mixing',async()=>{
 const db=await database();try{
  await setup(db);await actor(db,ids.client);await pref(db,{digest:'weekly',email_enabled:true,timezone:'America/New_York',expected_version:0});
  await actor(db,ids.viewer);await pref(db,{digest:'none',email_enabled:true,timezone:'UTC',expected_version:0});
  await message(db,{created:'2026-10-31T12:00:00Z'});await message(db,{created:'2026-11-01T12:00:00Z'});
  await message(db,{org:ids.other,engagement:ids.otherEngagement,created:'2026-10-31T12:00:00Z'});
  await admin(db);const batches=(await db.query('select * from wm.notification_batches order by organization_id')).rows;
  assert.equal(batches.length,2);assert.equal(batches[0].cadence,'weekly');assert.equal(batches[0].recipient_id,ids.client);
  assert.equal(new Date(batches[0].period_end)-new Date(batches[0].period_start),169*3600000);
  assert.equal((await db.query('select count(*)::int n from wm.notification_items')).rows[0].n,3);
  assert.equal((await db.query("select count(*)::int n from wm.operations where kind='message_notify'")).rows[0].n,0);
  await actor(db,ids.outsider);assert.equal((await status(db,ids.other)).batches.length,1);await assert.rejects(status(db),/unavailable/);
 }finally{await db.close();}
});
test('preference changes cancel pending cadence, require expected versions and never clear message history',async()=>{
 const db=await database();try{
  await setup(db);await message(db);await actor(db,ids.client);
  await pref(db,{digest:'none',email_enabled:false,timezone:'UTC',expected_version:0});
  await assert.rejects(db.query('select public.wm_service_command($1,$2,$3::jsonb,$4)',[ids.org,'preference.save',JSON.stringify({digest:'daily',email_enabled:true}),crypto.randomUUID()]),/versioned notification/);
  await assert.rejects(pref(db,{digest:'weekly',email_enabled:true,timezone:'UTC',expected_version:0}),/changed/);
  const own=await status(db);assert.equal(own.batches[0].state,'cancelled');
  await pref(db,{digest:'weekly',email_enabled:true,timezone:'UTC',expected_version:1});await message(db);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.messages')).rows[0].n,2);
  assert.equal((await db.query("select count(*)::int n from wm.notification_batches where recipient_id=$1 and state='pending'",[ids.client])).rows[0].n,1);
 }finally{await db.close();}
});
test('legacy backfill never puts an already unknown recipient into another digest',async()=>{
 const db=await database();try{
  await setup(db);const messageId=crypto.randomUUID();
  await db.query("insert into wm.messages(organization_id,id,engagement_id,direction,visibility,sender_user_id,body) values($1,$2,$3,'inbound','shared',$4,'Synthetic legacy source')",[ids.org,messageId,ids.engagement,ids.operator]);
  const operation=(await db.query("select wm.enqueue($1,$2,null,null,null,'message_notify',jsonb_build_object('message_id',$3::text,'recipient_id',($4::uuid)::text),false,'legacy-synthetic',$4::uuid) id",[ids.org,ids.engagement,messageId,ids.client])).rows[0].id;
  await db.query("update wm.operations set state='unknown' where id=$1",[operation]);
  await db.query('select wm.notification_collect(m) from wm.messages m where id=$1',[messageId]);
  // inbound is intentionally not notified; use a shared outbound legacy fixture.
  await db.query("update wm.messages set direction='workspace' where id=$1",[messageId]);
  await db.query('select wm.notification_collect(m) from wm.messages m where id=$1',[messageId]);
  assert.deepEqual((await db.query('select recipient_id from wm.notification_items')).rows.map(x=>x.recipient_id),[ids.viewer]);
 }finally{await db.close();}
});
test('digest leases and dispatch recheck current membership and address; generic content omits thread body',async()=>{
 const db=await database();try{
  const p=await ready(db);await admin(db);await db.query('update auth.users set email=$2 where id=$1',[ids.client,'changed@synthetic.example']);await machine(db);
  await assert.rejects(reserve(db,p),/changed after/);
  await admin(db);await db.query('update auth.users set email=$2 where id=$1',[ids.client,ids.client+'@synthetic.example']);await machine(db);
  const r=await reserve(db,p);assert.ok(!JSON.stringify(r.message).includes('Private thread body'));assert.equal(r.message.to.length,1);
  await assert.rejects(reserve(db,p),/already reserved/);
  await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);await machine(db);
  await assert.rejects(db.query('select public.wm_service_effect_context($1,$2,$3)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce]),/unavailable/);
 }finally{await db.close();}
});
test('mandatory access notice remains separate from opt-out and is bound to the affected verified identity',async()=>{
 const db=await database();try{
  await setup(db);await actor(db,ids.client);await pref(db,{digest:'none',email_enabled:false,timezone:'UTC',expected_version:0});
  await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);
  await db.query("select wm.critical($1,'member.change',$2::uuid,jsonb_build_object('input',jsonb_build_object('user_id',($2::uuid)::text)))",[ids.org,ids.client]);
  const op=(await db.query("select * from wm.operations where kind='notice_notify'")).rows[0];assert.ok(op);
  const c=(await db.query('select wm.service_context($1,o) r from wm.operations o where id=$2',[ids.org,op.id])).rows[0].r;assert.equal(c.notification_kind,'security_access_changed');assert.equal(c.recipient_id,ids.client);
  await db.query("select wm.critical($1,'ordinary.update',$2,'{}')",[ids.org,ids.client]);assert.equal((await db.query("select count(*)::int n from wm.operations where kind='notice_notify'")).rows[0].n,1);
  await db.query('update auth.users set email=$2 where id=$1',[ids.client,'other@synthetic.example']);await assert.rejects(db.query('select wm.service_context($1,o) from wm.operations o where id=$2',[ids.org,op.id]),/no longer current/);
 }finally{await db.close();}
});
test('restored pending digest cannot mint a fresh send under a new recovery generation',async()=>{
 const db=await database();try{
  await setup(db);const created=new Date(Date.now()-86400000).toISOString();await message(db,{created});
  await admin(db);await db.query("update wm.tenant_guards set recovery_generation=recovery_generation+1,external_generation='fresh-recovery' where organization_id=$1",[ids.org]);await machine(db);
  const stale=(await db.query('select public.wm_notification_claim() r')).rows[0].r;
  for(const b of stale)await assert.rejects(db.query('select public.wm_notification_prepare($1,$2,$3)',[b.organization_id,b.id,b.lease_generation]),/recovery generation/);
  await admin(db);assert.equal((await db.query("select count(*)::int n from wm.operations where kind='message_notify'")).rows[0].n,0);
  await message(db,{created});await machine(db);const fresh=(await db.query('select public.wm_notification_claim() r')).rows[0].r;assert.equal(fresh.length,2);
  for(const b of fresh)assert.ok((await db.query('select public.wm_notification_prepare($1,$2,$3) r',[b.organization_id,b.id,b.lease_generation])).rows[0].r.operation_id);
 }finally{await db.close();}
});
test('duplicate and reordered webhook facts remain immutable; bounce suppression survives delivered readback',async()=>{
 const db=await database();try{
  const p=await ready(db),r=await reserve(db,p),provider=crypto.randomUUID(),id=crypto.randomUUID();
  const first=await event(db,p,r,{id,provider,kind:'bounced'});assert.equal(first.result.received,true);
  await event(db,p,r,{id,provider,kind:'bounced',at:first.payload.created_at});
  await event(db,p,r,{provider,kind:'delivered'});
  const conflict=await event(db,p,r,{id,provider,kind:'complained'});assert.equal(conflict.result.attention,true);
  await db.query('select public.wm_notification_observe($1,$2,$3,$4,$5,$6)',[ids.org,p.operation.id,provider,'delivered',new Date().toISOString(),'a'.repeat(64)]);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.notification_blocks')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from wm.notification_observations')).rows[0].n,3);
  await assert.rejects(db.query("update wm.notification_observations set event_type='sent'"),/immutable/);
  await actor(db,ids.client);const view=await status(db);assert.equal(view.deliveries[0].delivered_to_server,true);assert.equal(view.deliveries[0].blocked,true);assert.ok(!JSON.stringify(view).includes('@'));
 }finally{await db.close();}
});
test('wrong account, recipient and competing provider bindings cannot claim another notification',async()=>{
 const db=await database();try{
  const p=await ready(db),r=await reserve(db,p);const mismatch=await event(db,p,r,{change:{to:['wrong@synthetic.example']}});assert.equal(mismatch.result.attention,true);
  const first=await event(db,p,r);const second=await event(db,p,r);assert.equal(second.result.attention,true);
  const raw=JSON.stringify(first.payload);await assert.rejects(db.query('select public.wm_notification_webhook($1,$2,$3,$4,$5,$6,$7)',['outbound-test','wrong-account','staging','wrong',raw,await sha256(new TextEncoder().encode(raw)),'synthetic']),/binding unavailable/);
  const ctx=(await db.query('select public.wm_notification_read_context($1,$2) r',[ids.org,p.operation.id])).rows[0].r;assert.equal(ctx.conflicted,true);assert.equal(ctx.provider_id,first.provider);
  await actor(db,ids.client);await assert.rejects(db.query('select * from wm.notification_sends'),/permission denied/);
 }finally{await db.close();}
});
test('expired digest lease and revoked recipient block preparation without consuming other tenants',async()=>{
 const db=await database();try{
  await setup(db);await message(db,{created:new Date(Date.now()-86400000).toISOString()});await message(db,{org:ids.other,engagement:ids.otherEngagement,created:new Date(Date.now()-86400000).toISOString()});await machine(db);
  const jobs=(await db.query('select public.wm_notification_claim() r')).rows[0].r;
  await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1",[ids.org]);await machine(db);
  for(const j of jobs){if(j.organization_id===ids.org)await assert.rejects(db.query('select public.wm_notification_prepare($1,$2,$3)',[j.organization_id,j.id,j.lease_generation]),/unavailable/);else assert.ok((await db.query('select public.wm_notification_prepare($1,$2,$3) r',[j.organization_id,j.id,j.lease_generation])).rows[0].r.operation_id);}
  const bad=jobs.find(j=>j.organization_id===ids.org);await admin(db);await db.query("update wm.notification_batches set lease_until=now()-interval '1 second' where organization_id=$1 and id=$2",[bad.organization_id,bad.id]);await machine(db);await assert.rejects(db.query('select public.wm_notification_prepare($1,$2,$3)',[bad.organization_id,bad.id,bad.lease_generation]),/lease stale/);
 }finally{await db.close();}
});
test('operator can retry only unattempted preparation, never an unknown registered send',async()=>{
 const db=await database();try{
  const p=await ready(db);await reserve(db,p);
  await db.query("select public.wm_attempt_observe($1,$2,$3,'timeout','{}',now())",[ids.org,p.attempt.id,p.attempt.dispatch_nonce]);
  await admin(db);const batch=(await db.query('select * from wm.notification_batches where operation_id=$1',[p.operation.id])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(db.query('select public.wm_notification_command($1,$2,$3::jsonb,$4)',[ids.org,'notification.batch.retry',JSON.stringify({batch_id:batch.id,expected_generation:batch.lease_generation}),crypto.randomUUID()]),/unattempted/);
  await admin(db);await db.query("insert into wm.notification_batches(organization_id,recipient_id,cadence,timezone,preference_version,period_start,period_end,due_at,state,lease_generation,recovery_generation,external_generation) values($1,$2,'daily','UTC',99,now()-interval '2 days',now()-interval '1 day',now()-interval '1 day','attention',2,1,'fixture-generation-1')",[ids.org,ids.client]);const retry=(await db.query("select id from wm.notification_batches where preference_version=99")).rows[0].id;
  await actor(db,ids.operator,{aal:'aal2'});await db.query('select public.wm_notification_command($1,$2,$3::jsonb,$4)',[ids.org,'notification.batch.retry',JSON.stringify({batch_id:retry,expected_generation:2}),crypto.randomUUID()]);
  await admin(db);assert.equal((await db.query('select state from wm.notification_batches where id=$1',[retry])).rows[0].state,'pending');assert.equal((await db.query('select state from wm.operations where id=$1',[p.operation.id])).rows[0].state,'unknown');
  const unsent=(await db.query("select wm.enqueue($1,null,null,null,null,'message_notify',jsonb_build_object('batch_id',$2::text),false,'unattempted-retry',$3) id",[ids.org,retry,ids.client])).rows[0].id;
  await db.query("update wm.notification_batches set state='enqueued',operation_id=$2 where id=$1",[retry,unsent]);await db.query("update wm.outbox_jobs set state='attention',last_error_code='provider_not_qualified' where operation_id=$1",[unsent]);
  await actor(db,ids.operator,{aal:'aal2'});assert.equal((await status(db)).batches.find(b=>b.id===retry).preparation_retryable,true);
  await db.query('select public.wm_notification_command($1,$2,$3::jsonb,$4)',[ids.org,'notification.batch.retry',JSON.stringify({batch_id:retry,expected_generation:2}),crypto.randomUUID()]);
  await admin(db);assert.equal((await db.query('select state from wm.outbox_jobs where operation_id=$1',[unsent])).rows[0].state,'pending');
 }finally{await db.close();}
});
test('signed raw outbound webhooks reject tampering, replay age and inbound secret; ACK follows durable receipt',async()=>{
 const secret='whsec_'+Buffer.from('synthetic outbound secret material').toString('base64'),other='whsec_'+Buffer.from('different inbound secret material').toString('base64');
 const id='msg_synthetic',timestamp=new Date(),raw=JSON.stringify({type:'email.delivered',data:{email_id:crypto.randomUUID()}}),signature=new Webhook(secret).sign(id,timestamp,raw);
 const headers=new Headers({'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':signature});
 assert.equal((await verifyOutboundWebhook(new TextEncoder().encode(raw),headers,[{value:secret,version:'current'}])).raw,raw);
 await assert.rejects(verifyOutboundWebhook(new TextEncoder().encode(raw+' '),headers,[{value:secret,version:'current'}]),/verification failed/);
 await assert.rejects(verifyOutboundWebhook(new TextEncoder().encode(raw),headers,[{value:other,version:'inbound'}]),/verification failed/);
 await assert.rejects(verifyOutboundWebhook(new TextEncoder().encode(raw),headers,[{value:secret,version:'current'}],{now:Date.now()+301000}),/verification failed/);
 const env={NOTIFICATION_CHANNELS:{outbound:{outbound_webhook_secret:secret,account_id:'account-test',environment:'staging'}}};let saved=false;
 const response=await handleOutboundWebhook(new Request('https://synthetic.example/hook',{method:'POST',headers,body:raw}),env,'outbound',{rpc:async()=>{saved=true;return {received:true};}});assert.equal(response.status,200);assert.equal(saved,true);
 await assert.rejects(handleOutboundWebhook(new Request('https://synthetic.example/hook',{method:'POST',headers,body:raw}),env,'outbound',{rpc:async()=>{throw Error('database unavailable');}}),/database unavailable/);
});
test('unknown provider result never retries POST and failed jobs do not starve later tenants',async()=>{
 const op=crypto.randomUUID(),attempt=crypto.randomUUID(),permit={operation:{id:op,organization_id:ids.org},attempt:{id:attempt,dispatch_nonce:crypto.randomUUID()},context:{channel_id:'outbound',account_id:'a',environment:'staging'}},env={NOTIFICATIONS_ENABLED:'true',NOTIFICATION_CHANNELS:{outbound:{account_id:'a',environment:'staging',api_key:'synthetic'}}};let sends=0;
 await assert.rejects(sendCadencedNotification(env,permit,{rpc:async()=>({channel_id:'outbound',account_id:'a',environment:'staging',message:{text:'generic'},idempotency_key:'workspace/'+op}),fetcher:async()=>{sends++;throw Error('Timeout after accepted send');}}),/Do not resend/);assert.equal(sends,1);
 const prepared=[],jobs=[{organization_id:ids.org,id:crypto.randomUUID(),lease_generation:1},{organization_id:ids.other,id:crypto.randomUUID(),lease_generation:1}];
 const result=await prepareNotificationDigests(env,{rpc:async(_e,name,args)=>{if(name==='wm_notification_claim')return jobs;if(args.p_org===ids.org)throw Error('First tenant failed, including attention write');prepared.push(args.p_org);return {};}});assert.deepEqual(result,{prepared:1,attention:1});assert.deepEqual(prepared,[ids.other]);
 const polled=await pollNotificationDelivery(env,{rpc:async(_e,name)=>name==='wm_notification_reads_claim'?jobs.map(j=>({...j,operation_id:j.id})):Promise.reject(Error('Unknown outcome'))});assert.equal(polled.attention,2);
});
test('the exact runtime channel is checked before attempt/reservation and repaired configuration can send once',async()=>{
 const db=await database();try{
  let jobs=[await ready(db,{begin:false})],posts=0,message;const providerId=crypto.randomUUID();
  const call=async(_env,name,args={})=>{
   if(name==='wm_jobs_claim')return jobs;
   assert.match(name,/^wm_[a-z_]+$/);const values=Object.values(args);
   return (await db.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) r`,values)).rows[0].r;
  };
  const env={EFFECTS_ENABLED:'true',NOTIFICATIONS_ENABLED:'true',NOTIFICATION_CHANNELS:{other:{account_id:'account-other',environment:'staging',api_key:'synthetic-other'}}},deps={rpc:call,journal:async()=>{},readControl:async()=>({access_state:'open',external_generation:'fixture-generation-1'}),fetcher:async(_url,options={})=>{if(options.method==='POST'){posts++;message=JSON.parse(options.body);return Response.json({id:providerId});}return Response.json({id:providerId,...message,last_event:'sent'});}};
  const blocked=await dispatchJobs(env,deps);assert.equal(blocked.attention,1);assert.equal(posts,0);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.notification_sends')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from wm.operation_attempts')).rows[0].n,0);
  await db.query('update wm.outbox_jobs set not_before=clock_timestamp() where id=$1',[jobs[0].id]);await machine(db);jobs=(await db.query('select public.wm_jobs_claim() r')).rows[0].r;
  const repaired={...env,NOTIFICATION_CHANNELS:{'outbound-test':{account_id:'account-test',environment:'staging',api_key:'synthetic'}}};assert.equal((await dispatchJobs(repaired,deps)).verified,1);assert.equal(posts,1);
 }finally{await db.close();}
});
test('a durable absent reservation recovers a no-POST interruption but a reserved unknown send cannot replay',async()=>{
 const db=await database();try{
  const first=await ready(db);const recover=p=>db.query('select public.wm_notification_no_post($1,$2,$3,$4) r',[ids.org,p.attempt.id,p.attempt.dispatch_nonce,'fixture-generation-1']);
  assert.deepEqual((await recover(first)).rows[0].r,{no_post:true,requeued:true});
  await admin(db);await db.query('update wm.outbox_jobs set not_before=clock_timestamp() where operation_id=$1',[first.operation.id]);await machine(db);
  const job=(await db.query('select public.wm_jobs_claim() r')).rows[0].r.find(j=>j.operation_id===first.operation.id),next=(await db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
  await reserve(db,next);assert.equal((await recover(next)).rows[0].r.no_post,false);
  await db.query("select public.wm_attempt_observe($1,$2,$3,'timeout','{}',clock_timestamp())",[ids.org,next.attempt.id,next.attempt.dispatch_nonce]);assert.equal((await recover(next)).rows[0].r.no_post,false);
  await admin(db);assert.equal((await db.query('select state from wm.operations where id=$1',[next.operation.id])).rows[0].state,'unknown');
  await actor(db,ids.client);await assert.rejects(recover(next),e=>e.code==='42501');
 }finally{await db.close();}
});
test('readback requires exact immutable request and UI reveals no recipient or token',()=>{
 const m={from:'from@example.com',to:['to@example.com'],subject:'Generic',text:'Generic link',tags:[{name:'workspace_operation',value:'op'},{name:'workspace_attempt',value:'attempt'}]},registered={provider_id:'provider',message:m};
 assert.equal(matchingReadback({id:'provider',...m},registered),true);assert.equal(matchingReadback({id:'provider',...m,text:'different'},registered),false);
 assert.throws(()=>validateNotificationCommand('notification.preference',{digest:'daily',email_enabled:true,timezone:'UTC',expected_version:0,mandatory:true}),/settings/);
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html=notificationViews({esc}).status({preferences:null,timezone:'UTC',can_manage:true,batches:[],deliveries:[{id:ids.org,kind:'<script>x</script>',state:'unknown',observations:[],attention:true}]},{org:ids.org});assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('data-notification-action'));assert.ok(html.includes('role="alert"'));
});
