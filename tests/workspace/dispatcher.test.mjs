import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {dispatchJobs} from '../../worker/workspace/effects/dispatcher.mjs';
import {provisionIdentity,sendNotification,notificationMessage} from '../../worker/workspace/providers/notifications.mjs';
import {reconcileAttempts} from '../../worker/workspace/effects/reconciliation.mjs';
const people=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_people_command($1,$2,$3::jsonb,$4) as r',[ids.org,name,JSON.stringify(input),key])).rows[0].r;
const machine=async db=>actor(db,ids.operator,{role:'service_role'});
const env={APP_ORIGIN:'https://app.example.com',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable',SUPABASE_SECRET_KEY:'synthetic-secret',RESEND_API_KEY:'synthetic-key',NOTIFICATION_FROM:'Wonder and Method <workspace@example.com>',NOTIFICATIONS_ENABLED:'true',IDENTITY_PROVISIONING_ENABLED:'true',EFFECTS_ENABLED:'true'};
const permit={operation:{id:'40000000-0000-4000-8000-000000000001',organization_id:ids.org,kind:'invitation_notify'},attempt:{id:'50000000-0000-4000-8000-000000000001',dispatch_nonce:'60000000-0000-4000-8000-000000000001'}};
const context={email:'recipient@synthetic.example',identity_id:ids.outsider};

test('invitation effects are transactional and revocation blocks both queued and reserved delivery',async()=>{
 const db=await database();try{
  await actor(db,ids.client);const key=crypto.randomUUID(),input={email:ids.outsider+'@synthetic.example',role:'viewer'};
  const inv=await people(db,'invitation.create',input,key);await people(db,'invitation.create',input,key);
  await machine(db);const jobs=(await db.query('select public.wm_jobs_claim() as r')).rows[0].r;assert.equal(jobs.length,1);
  const p=(await db.query('select public.wm_attempt_begin($1,$2,$3,$4) as r',[ids.org,jobs[0].id,jobs[0].lease_generation,'fixture-generation-1'])).rows[0].r;
  assert.equal(p.context.email,input.email);assert.equal(p.context.identity_id,ids.outsider);
  await actor(db,ids.client);await people(db,'invitation.revoke',{id:inv.id,expected_version:1});
  await machine(db);await assert.rejects(db.query('select public.wm_service_effect_context($1,$2,$3)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce]),/no longer current/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.operations')).rows[0].n,1);
 }finally{await db.close();}
});

test('identity provisioning never confirms email or grants workspace access and resolves only exact provider identity',async()=>{
 let calls=0,reads=0;const p={...permit,operation:{...permit.operation,kind:'identity_provision'}};
 const result=await provisionIdentity(env,p,{rpc:async(_env,name)=>name==='wm_service_effect_context'?{...context,identity_id:++reads===1?null:ids.outsider}:{},fetcher:async(url,options)=>{calls++;assert.ok(url.endsWith('/admin/users'));assert.deepEqual(JSON.parse(options.body),{email:context.email,email_confirm:false});throw Error('Lost response');}});
 assert.equal(calls,1);assert.equal(result.readback_matches,true);assert.equal(result.email_verified,false);
 await assert.rejects(provisionIdentity(env,p,{rpc:async()=>({...context,identity_id:null}),fetcher:async()=>new Response('{}',{status:503})}),/reconciliation/);
});

test('notification acceptance requires exact readback; delivery and private message content are not fabricated',async()=>{
 const message=notificationMessage(env,permit,{...context,body:'DO NOT EMAIL PRIVATE BODY'}),emailId=crypto.randomUUID();let calls=0,checkpointed=false;
 assert.equal(message.text.includes('DO NOT EMAIL PRIVATE BODY'),false);
 const rpc=async(_env,name)=>{if(name==='wm_service_effect_context')return context;if(name==='wm_attempt_checkpoint')checkpointed=true;};
 const result=await sendNotification(env,permit,{rpc,fetcher:async(url,options)=>{
  calls++;if(options.method==='POST'){assert.equal(options.headers['Idempotency-Key'],'workspace/'+permit.operation.id);return Response.json({id:emailId});}
  assert.equal(checkpointed,true);return Response.json({id:emailId,...message,last_event:'sent'});
 }});
 assert.equal(calls,2);assert.equal(result.delivery,'accepted_by_provider');assert.equal(result.provider_event,'sent');
 await assert.rejects(sendNotification(env,permit,{rpc,fetcher:async(url,options)=>options.method==='POST'?Response.json({id:emailId}):Response.json({id:emailId,...message,to:['wrong@synthetic.example']})}),/reconciliation/);
});

test('dispatcher records unknown without automatic retry and cancels before dispatch when independent control changes',async()=>{
 const job={id:crypto.randomUUID(),organization_id:ids.org,kind:'invitation_notify',lease_generation:1};let effects=0;const events=[];
 const rpc=async(_env,name,args)=>{events.push({name,args});if(name==='wm_jobs_claim')return [job];if(name==='wm_attempt_begin')return permit;return {};};
 const control={organization_id:ids.org,external_generation:'fixture-generation-1',access_state:'open'};
 let result=await dispatchJobs(env,{journal:async()=>({}),rpc,readControl:async()=>control,implementations:{invitation_notify:async()=>{effects++;throw Error('Provider outcome unknown');}}});
 assert.equal(effects,1);assert.equal(result.attention,1);assert.equal(events.at(-1).args.p_kind,'timeout');assert.equal(events.some(x=>x.name==='wm_attempt_resolve'),false);
 events.length=0;let reads=0;
 result=await dispatchJobs(env,{journal:async()=>({}),rpc,readControl:async()=>({...control,external_generation:++reads===1?control.external_generation:'replacement-generation'}),implementations:{invitation_notify:async()=>{effects++;}}});
 assert.equal(effects,1);assert.equal(events.at(-1).args.p_kind,'cancelled_before_dispatch');
 events.length=0;await dispatchJobs({...env,NOTIFICATIONS_ENABLED:'false'},{rpc});assert.equal(events.some(x=>x.name==='wm_attempt_begin'),false);assert.equal(events.at(-1).name,'wm_job_attention');
});

test('readback reconciles a lost email acknowledgment without sending again',async()=>{
 const emailId=crypto.randomUUID(),p={...permit,operation:{...permit.operation,provider_reference:emailId},attempt:{...permit.attempt,external_generation:'fixture-generation-1'},context};
 const message=notificationMessage(env,p,context);let reads=0,resolved=0;
 const result=await reconcileAttempts(env,{journal:async()=>({}),rpc:async(_env,name)=>{if(name==='wm_unresolved_attempts')return [p];if(name==='wm_attempt_resolve'){resolved++;return {state:'verified'};}throw Error('Unexpected RPC');},
  readControl:async()=>({access_state:'open',external_generation:'fixture-generation-1'}),fetcher:async(url,options)=>{assert.equal(options.method,undefined);assert.ok(url.endsWith(emailId));reads++;return Response.json({id:emailId,...message});}});
 assert.equal(reads,1);assert.equal(resolved,1);assert.equal(result.verified,1);
});
test('provider writes wait for independent intent and projection waits for outcome evidence',async()=>{
 const job={id:crypto.randomUUID(),organization_id:ids.org,kind:'invitation_notify',lease_generation:1},sequence=[];
 const rpc=async(_e,name,args)=>{if(name==='wm_jobs_claim')return [job];if(name==='wm_attempt_begin')return permit;if(name==='wm_attempt_observe')sequence.push(args.p_kind);if(name==='wm_attempt_resolve'){sequence.push('resolved');return {state:'verified'};}return {};};
 const readControl=async()=>({access_state:'open',external_generation:'fixture-generation-1'}),implementations={invitation_notify:async()=>{sequence.push('effect');return {settled:true};}};
 await dispatchJobs(env,{rpc,readControl,implementations,journal:async(_e,_p,phase)=>{sequence.push(phase);}});assert.deepEqual(sequence,['intent','effect','outcome','resolved']);
 sequence.length=0;await dispatchJobs(env,{rpc,readControl,implementations,journal:async()=>{throw Error('Storage unavailable');}});assert.deepEqual(sequence,['cancelled_before_dispatch']);
 sequence.length=0;await dispatchJobs(env,{rpc,readControl,implementations,journal:async(_e,_p,phase)=>{if(phase==='outcome')throw Error('Outcome receipt failed');}});assert.deepEqual(sequence,['effect','timeout']);
});

test('readback queue throttles unknown attempts and preserves dispatch context after invitation revocation',async()=>{
 const db=await database();try{
  await actor(db,ids.client);const inv=await people(db,'invitation.create',{email:ids.outsider+'@synthetic.example',role:'viewer'});
  await machine(db);const job=(await db.query('select public.wm_jobs_claim() as r')).rows[0].r[0];
  const p=(await db.query('select public.wm_attempt_begin($1,$2,$3,$4) as r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
  await db.query("select public.wm_attempt_observe($1,$2,$3,'timeout','{}',now())",[ids.org,p.attempt.id,p.attempt.dispatch_nonce]);
  await actor(db,ids.client);await people(db,'invitation.revoke',{id:inv.id,expected_version:1});
  await machine(db);let unresolved=(await db.query('select public.wm_unresolved_attempts() as r')).rows[0].r;
  assert.equal(unresolved.length,1);assert.equal(unresolved[0].context.email,ids.outsider+'@synthetic.example');
  assert.equal((await db.query('select public.wm_unresolved_attempts() as r')).rows[0].r.length,0);
  const readback=(await db.query('select public.wm_service_readback($1,$2,$3) as r',[ids.org,p.attempt.id,p.attempt.dispatch_nonce])).rows[0].r;assert.equal(readback.identity_id,ids.outsider);
  await db.query('select public.wm_attempt_resolve($1,$2,$3,$4)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce,{settled:true,readback_matches:true,evidence_reference:'synthetic-exact-identity',observed_at:new Date().toISOString()}]);
  await admin(db);assert.equal((await db.query("select count(*)::int n from wm.operations where kind='invitation_notify'")).rows[0].n,0);
 }finally{await db.close();}
});
