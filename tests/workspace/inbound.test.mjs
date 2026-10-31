import test from 'node:test';
import assert from 'node:assert/strict';
import {Webhook} from 'svix';
import {database,actor,admin,ids} from './database.mjs';
import {verifyInboundWebhook,handleInboundWebhook,routeEvidence,captureEmail,enumerateAttachments,inventoryInbound} from '../../worker/workspace/inbound/service.mjs';
const emailId='40000000-0000-4000-8000-000000000001',attachmentId='40000000-0000-4000-8000-000000000002';
const env={INBOUND_ENABLED:'true',ENVIRONMENT:'staging',RESEND_INBOUND_CONNECTION:'fixture',RESEND_INBOUND_API_KEY:'synthetic',INBOUND_REPLY_DOMAIN:'reply.synthetic.example',FILE_POLICY:'invite_only_unscanned'};
const secret='whsec_'+Buffer.from('synthetic-verification-key-only').toString('base64');
async function command(db,type,input,org=ids.org){return (await db.query('select public.wm_inbound_command($1,$2,$3,$4) r',[org,type,input,crypto.randomUUID()])).rows[0].r;}
async function receive(db,id='msg_fixture',provider=emailId){await actor(db,ids.operator,{role:'service_role'});return (await db.query('select public.wm_inbound_event_receive($1,$2,$3,$4,$5,$6) r',['fixture','staging',id,'a'.repeat(64),{type:'email.received',data:{email_id:provider,subject:'Please stop this'}},'synthetic-v1'])).rows[0].r;}
async function claim(db){return (await db.query("select public.wm_inbound_claim('fixture','staging') r")).rows[0].r;}
async function capture(db,j,data){return (await db.query('select public.wm_inbound_capture($1,$2,$3) r',[j.id,j.lease_generation,data])).rows[0].r;}
const captureData=(route,extra={})=>({body_text:'Approved. Please stop the ads.',body_html:'<img src="https://evil.invalid/tracker"><script>bad()</script>',content_hash:'b'.repeat(64),metadata:{from:ids.client+'@synthetic.example',subject:'A received email',dmarc:'pass'},attachments:[],route_hashes:route?[route]:[],routing_safe:true,urgent:true,complete:true,...extra});
async function makeRoute(db){await actor(db,ids.operator,{aal:'aal2'});const r=await command(db,'inbound.route',{engagement_id:ids.engagement});await admin(db);const hash=(await db.query('select token_hash from wm.inbound_routes where id=$1',[r.id])).rows[0].token_hash;return {...r,hash};}

test('inbound verification binds exact raw bytes, timestamp and current/rotated key, and acknowledgment waits for persistence',async()=>{
 const raw=JSON.stringify({type:'email.received',data:{email_id:emailId}}),id='msg_synthetic',time=new Date(),signature=new Webhook(secret).sign(id,time,raw);
 const headers=new Headers({'svix-id':id,'svix-timestamp':String(Math.floor(time/1000)),'svix-signature':signature});
 assert.equal((await verifyInboundWebhook(new TextEncoder().encode(raw),headers,[{value:secret,version:'v1'}])).key_version,'v1');
 await assert.rejects(verifyInboundWebhook(new TextEncoder().encode(raw+' '),headers,[{value:secret,version:'v1'}]),/verified/);
 await assert.rejects(verifyInboundWebhook(new TextEncoder().encode(raw),headers,[{value:secret,version:'v1'}],{now:time.getTime()+301000}),/verified/);
 let saved=false;const settings={...env,RESEND_INBOUND_WEBHOOK_SECRET:secret};
 const response=await handleInboundWebhook(new Request('https://synthetic.example/api/webhooks/resend/inbound',{method:'POST',headers,body:raw}),settings,{rpc:async(_e,n,a)=>{assert.equal(n,'wm_inbound_event_receive');assert.equal(a.p_event.data.email_id,emailId);saved=true;return {received:true};}});assert.equal(response.status,200);assert.equal(saved,true);
 await assert.rejects(handleInboundWebhook(new Request('https://synthetic.example/api/webhooks/resend/inbound',{method:'POST',headers,body:raw}),settings,{rpc:async()=>{throw Error('Synthetic database unavailable');}}),/database unavailable/);
});

test('inbound capture checks complete inventory, server authentication and byte readback without leaking API authorization to attachment hosts',async()=>{
 const token='a'.repeat(64),alias=`r.${token}@${env.INBOUND_REPLY_DOMAIN}`,bytes=new TextEncoder().encode('Synthetic attachment text');let posts=0;const requests=[];let stored;
 const item={id:attachmentId,filename:'brief.txt',size:bytes.length,content_type:'text/plain',download_url:'https://inbound-cdn.resend.com/synthetic?signature=private',expires_at:new Date(Date.now()+3600000).toISOString()};
 const fetcher=async(url,options)=>{requests.push({url:String(url),headers:options.headers});if(String(url).includes('inbound-cdn'))return new Response(bytes);if(String(url).includes('/attachments?'))return Response.json({data:[item],has_more:false});return Response.json({id:emailId,from:'Owner <avery@synthetic.example>',to:[alias],cc:[],bcc:[],received_for:[],reply_to:[],text:'Stop please',html:'<script>bad()</script>',html_format:'cid',authentication:{dmarc:'pass'},attachments:[{id:attachmentId}],subject:'Private email'});};
 const result=await captureEmail(env,{id:emailId,provider_id:emailId},{fetcher,store:async(_e,_key,{bytes:body})=>{if(body){posts++;stored=body;throw Error('Lost upload acknowledgment');}return new Response(stored);}});
 assert.equal(result.complete,true);assert.equal(result.metadata.dmarc,'pass');assert.equal(result.routing_safe,true);assert.equal(result.urgent,true);assert.equal(result.attachments[0].state,'stored_unscanned');assert.equal(posts,1);assert.equal(requests.find(r=>r.url.includes('inbound-cdn')).headers.Authorization,undefined);assert.equal(JSON.stringify(result).includes('signature=private'),false);
 const ambiguous=await routeEvidence({from:'avery@synthetic.example',to:[alias,'r.'+'b'.repeat(64)+'@'+env.INBOUND_REPLY_DOMAIN],reply_to:[]},env);assert.equal(ambiguous.routing_safe,false);
 assert.equal((await routeEvidence({from:'bad@example.com, Owner <avery@synthetic.example>',to:[alias]},env)).routing_safe,false);
 await assert.rejects(enumerateAttachments(env,emailId,async()=>Response.json({data:[item],has_more:true})),/needs checking/);
});

test('unsupported or unqualified attachment URLs remain explicit partial captures, including null authentication',async()=>{
 const email={id:emailId,from:'avery@synthetic.example',to:[],text:'Keep this body',html:null,authentication:null,attachments:[{id:attachmentId}]};let external=0;
 const result=await captureEmail(env,{id:emailId,provider_id:emailId},{fetcher:async url=>{if(String(url).includes('/attachments?'))return Response.json({data:[{id:attachmentId,filename:'brief.txt',size:8,content_type:'text/plain',download_url:'https://127.0.0.1/private',expires_at:new Date(Date.now()+3600000).toISOString()}],has_more:false});if(!String(url).startsWith('https://api.resend.com/'))external++;return Response.json(email);}});
 assert.equal(result.complete,false);assert.equal(result.body_text,'Keep this body');assert.equal(result.metadata.dmarc,'unknown');assert.equal(external,0);assert.equal(result.attachments[0].state,'blocked');
});

test('signed deliveries deduplicate by provider email, conflicting event bytes create durable anomalies, and raw ingestion is machine-only',async()=>{
 const db=await database();try{
  const a=await receive(db);assert.equal((await receive(db,'msg_fixture_2')).id,a.id);
  const conflict=(await db.query('select public.wm_inbound_event_receive($1,$2,$3,$4,$5,$6) r',['fixture','staging','msg_fixture','c'.repeat(64),{type:'other'},'v1'])).rows[0].r;assert.equal(conflict.anomaly,true);
  await actor(db,ids.client);await assert.rejects(db.query("select public.wm_inbound_claim('fixture','staging')"),/permission denied/);await assert.rejects(db.query('select * from wm.inbound_emails'),/permission denied/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.inbound_emails')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from wm.inbound_anomalies')).rows[0].n,1);assert.equal((await db.query('select urgent from wm.inbound_emails')).rows[0].urgent,true);
 }finally{await db.close();}
});

test('verified email becomes labeled correspondence only; uncertain sender/routing stays private and customer projections omit object keys',async()=>{
 const db=await database();try{
  const route=await makeRoute(db);await receive(db);let job=await claim(db);await capture(db,job,captureData(route.hash));
  await actor(db,ids.client);const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;assert.equal(view.messages.filter(m=>m.direction==='inbound').length,1);assert.match(view.messages.find(m=>m.direction==='inbound').body,/correspondence only/);
  let inbox=(await db.query('select public.wm_inbound_list($1) r',[ids.org])).rows[0].r;assert.equal(inbox.triage.length,0);assert.equal(inbox.received.length,1);assert.equal(inbox.routes.length,0);
  await receive(db,'msg_2','40000000-0000-4000-8000-000000000003');job=await claim(db);await capture(db,job,captureData(route.hash,{metadata:{from:ids.client+'@synthetic.example',dmarc:'unknown'}}));
  await actor(db,ids.client);inbox=(await db.query('select public.wm_inbound_list($1) r',[ids.org])).rows[0].r;assert.equal(inbox.triage.length,0);assert.equal(inbox.received.length,1);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.decisions')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from wm.stop_intents')).rows[0].n,0);
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['intake'],now()+interval '1 day')",[ids.operator]);await actor(db,ids.operator,{aal:'aal2'});inbox=(await db.query('select public.wm_inbound_list($1) r',[ids.org])).rows[0].r;assert.equal(inbox.triage.length,1);assert.equal(inbox.triage[0].urgent,true);
  await command(db,'inbound.accept',{id:job.id,expected_version:inbox.triage[0].version,route_id:route.id,reason:'Independent sender confirmation and destination review.'});
  await actor(db,ids.outsider);await assert.rejects(db.query('select public.wm_inbound_list($1)',[ids.org]),/unavailable/);
 }finally{await db.close();}
});

test('leases, revoked participants/routes and changed content cannot silently republish; partial retries preserve already captured immutable attachment bytes',async()=>{
 const db=await database();try{
  const route=await makeRoute(db);await receive(db);let job=await claim(db);await assert.rejects(capture(db,{...job,lease_generation:job.lease_generation+1},captureData(route.hash)),/lease changed/);
  await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);await actor(db,ids.operator,{role:'service_role'});
  const att={id:attachmentId,state:'stored_unscanned',name:'brief.txt',bytes:8,media_type:'text/plain',checksum:'d'.repeat(64),object_key:`inbound/${job.id}/${attachmentId}/${'d'.repeat(64)}`};
  await capture(db,job,captureData(route.hash,{attachments:[att],complete:false}));await admin(db);let row=(await db.query('select * from wm.inbound_emails where id=$1',[job.id])).rows[0];assert.equal(row.routing,'triage');
  await db.query('update wm.inbound_emails set next_attempt_at=now() where id=$1',[job.id]);await actor(db,ids.operator,{role:'service_role'});job=await claim(db);
  await capture(db,job,captureData(route.hash,{attachments:[{id:attachmentId,name:'brief.txt',state:'blocked'}],complete:false}));await admin(db);row=(await db.query('select * from wm.inbound_emails where id=$1',[job.id])).rows[0];assert.equal(row.attachments[0].checksum,att.checksum);
  await db.query('update wm.inbound_emails set next_attempt_at=now() where id=$1',[job.id]);await actor(db,ids.operator,{role:'service_role'});job=await claim(db);
  await capture(db,job,captureData(route.hash,{attachments:[],complete:false,metadata:{from:ids.client+'@synthetic.example',dmarc:'pass',capture_limitation:'attachment_inventory_incomplete'}}));await admin(db);row=(await db.query('select * from wm.inbound_emails where id=$1',[job.id])).rows[0];assert.equal(row.attachments[0].checksum,att.checksum);assert.equal(row.state,'partial');
  await db.query('update wm.inbound_emails set next_attempt_at=now() where id=$1',[job.id]);await actor(db,ids.operator,{role:'service_role'});job=await claim(db);
  await capture(db,job,captureData(route.hash,{attachments:[],complete:true}));await admin(db);row=(await db.query('select * from wm.inbound_emails where id=$1',[job.id])).rows[0];assert.equal(row.attachments[0].checksum,att.checksum);assert.equal(row.state,'blocked');assert.equal(row.reason,'attachment_inventory_changed');
  await db.query("update wm.inbound_emails set state='partial',next_attempt_at=now() where id=$1",[job.id]);
  await db.query('update wm.inbound_emails set next_attempt_at=now() where id=$1',[job.id]);await actor(db,ids.operator,{role:'service_role'});job=await claim(db);await capture(db,job,captureData(route.hash,{content_hash:'e'.repeat(64)}));await admin(db);row=(await db.query('select * from wm.inbound_emails where id=$1',[job.id])).rows[0];assert.equal(row.state,'blocked');assert.equal(row.content_hash,'b'.repeat(64));
  await actor(db,ids.operator,{aal:'aal2'});await command(db,'inbound.revoke',{route_id:route.id});await receive(db,'msg_revoked','40000000-0000-4000-8000-000000000004');job=await claim(db);await capture(db,job,captureData(route.hash));await admin(db);assert.equal((await db.query('select routing from wm.inbound_emails where id=$1',[job.id])).rows[0].routing,'triage');
 }finally{await db.close();}
});

test('missed-webhook inventory resumes its durable cursor, deduplicates delivery and refuses false pagination completion',async()=>{
 const db=await database();try{
  await receive(db);const call=async(_e,name,args)=>{const values=Object.values(args),p=values.map((_,i)=>'$'+(i+1)).join(',');return (await db.query(`select public.${name}(${p}) r`,values)).rows[0].r;};
  let path;await inventoryInbound(env,{rpc:call,fetcher:async url=>{path=String(url);return Response.json({data:[{id:emailId,subject:'Existing received email'},{id:attachmentId,subject:'Missed webhook, please pause'}],has_more:true});}});assert.equal(path,'https://api.resend.com/emails/receiving?limit=100');
  await inventoryInbound(env,{rpc:call,fetcher:async url=>{path=String(url);return Response.json({data:[],has_more:false});}});assert.equal(path,'https://api.resend.com/emails/receiving?limit=100&after='+attachmentId);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.inbound_emails')).rows[0].n,2);assert.equal((await db.query('select count(*)::int n from wm.inbound_inventory_pages')).rows[0].n,2);assert.equal((await db.query('select last_complete_at is not null ok from wm.inbound_inventory')).rows[0].ok,true);
  await db.query('update wm.inbound_inventory set next_attempt_at=now()');await actor(db,ids.operator,{role:'service_role'});const c=(await db.query("select public.wm_inbound_inventory_claim('fixture','staging') r")).rows[0].r;
  await assert.rejects(db.query('select public.wm_inbound_inventory_page($1,$2,$3,$4)',['fixture','staging',c.generation,{items:[],has_more:true,page_hash:'a'.repeat(64)}]),/repeated or empty/);
 }finally{await db.close();}
});

test('email attachment projections and downloads enforce current tenant membership, acknowledge unscanned bytes and keep provider storage keys private',async()=>{
 const db=await database();try{
  const route=await makeRoute(db);await receive(db);const job=await claim(db),att={id:attachmentId,state:'stored_unscanned',name:'brief.txt',bytes:8,media_type:'text/plain',checksum:'d'.repeat(64),object_key:`inbound/${job.id}/${attachmentId}/${'d'.repeat(64)}`};await capture(db,job,captureData(route.hash,{attachments:[att]}));
  await actor(db,ids.client);const list=(await db.query('select public.wm_inbound_list($1) r',[ids.org])).rows[0].r;assert.equal(list.received[0].attachments[0].state,'stored_unscanned');assert.equal(JSON.stringify(list).includes('object_key'),false);
  const args=[ids.org,job.id,attachmentId];assert.equal((await db.query('select public.wm_inbound_file_access($1,$2,$3) r',args)).rows[0].r.checksum,att.checksum);
  await actor(db,ids.outsider);await assert.rejects(db.query('select public.wm_inbound_file_access($1,$2,$3)',args),/unavailable/);
  await admin(db);await db.query("update wm.memberships set revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);await actor(db,ids.client);await assert.rejects(db.query('select public.wm_inbound_file_access($1,$2,$3)',args),/unavailable/);
 }finally{await db.close();}
});
