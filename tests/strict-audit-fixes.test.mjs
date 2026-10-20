import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import worker from '../deployment/worker.mjs';
import {productionOperator} from '../deployment/production-operator.mjs';
import {recordRecoverySuccess} from '../deployment/inquiry-health.mjs';
import {inquiryForm} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';

const migrations=await Promise.all(['0001_inquiries.sql','0003_inquiry_followup.sql','0005_inquiry_operations.sql'].map(file=>readFile(new URL('../deployment/migrations/'+file,import.meta.url),'utf8')));
const origin='https://wonderandmethod.com';
const payload={name:'Synthetic Owner',email:'synthetic@example.test',business:'Synthetic Only',website:'',service:'focused_site',message:'A synthetic inquiry to exercise the exact regression.'};
function environment(current=true){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrations[0]);if(current)sqlite.exec(migrations.slice(1).join('\n'));
 return {ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',OPERATOR_TOKEN:'synthetic-token',FINGERPRINT_SECRET:'synthetic-secret-over-32-characters',DB:{sqlite,prepare(sql){const query=values=>({bind:(...v)=>query(v),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return sqlite.prepare(sql).run(...values);}});return query([]);}}};
}
const context=()=>({promises:[],waitUntil(p){this.promises.push(p);}});
const headers={Accept:'application/json',Authorization:'Bearer synthetic-token','CF-Connecting-IP':'192.0.2.1'};
const operator=(env,path='',options={})=>worker.fetch(new Request(origin+'/api/operator/inquiries'+path,{...options,headers:{...headers,...options.headers}}),env,context());
function insert(env,index=0){const id=`00000000-0000-0000-0000-${String(index).padStart(12,'0')}`;env.DB.sqlite.prepare('INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,?)').run(id,Date.now()-1200_000,JSON.stringify(payload),id,'accepted');return id;}

test('preservation holds block exact-confirmation deletion, including expired holds; missing schema fails closed',async()=>{
 const env=environment(),id=insert(env);
 env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1,retention_hold_reason=?,retention_hold_review_at=? WHERE id=?').run('Synthetic preservation',1,id);
 const options={method:'DELETE',headers:{'X-Confirm-Delete':id}};
 assert.equal((await operator(env,'/'+id,options)).status,409);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,1);
 env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=0 WHERE id=?').run(id);
 assert.equal((await operator(env,'/'+id,options)).status,200);
 const old=environment(false),oldId=insert(old);
 assert.equal((await operator(old,'/'+oldId,{method:'DELETE',headers:{'X-Confirm-Delete':oldId}})).status,503);
 assert.equal(old.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,1);
 env.DB.sqlite.close();old.DB.sqlite.close();
});

test('rolling dedupe spans a fixed bucket boundary, concurrent retries, and expires after ten minutes',async t=>{
 const env=environment(),ctx=context();let now=1_800_000_599_999;
 t.mock.method(Date,'now',()=>now);
 const submit=async(extra={})=>{const response=await worker.fetch(new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Accept:'application/json','CF-Connecting-IP':extra.ip||'192.0.2.1'},body:JSON.stringify({...payload,...extra.body})}),env,ctx);assert.equal(response.status,202);return (await response.json()).reference;};
 const first=await submit();now+=2;
 assert.equal(await submit(),first);
 assert.deepEqual(await Promise.all([submit({ip:'192.0.2.2'}),submit({ip:'192.0.2.3'}),submit({ip:'192.0.2.4'})]),[first,first,first]);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,1);
 now+=600_000;assert.notEqual(await submit(),first);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,2);
 await Promise.all(ctx.promises);env.DB.sqlite.close();
});

test('3001 inquiries export completely while status uses one aggregate request; unauthenticated attempts stay bounded',async()=>{
 const env=environment();env.DB.sqlite.exec('BEGIN');for(let i=0;i<3001;i++)insert(env,i);env.DB.sqlite.exec('COMMIT');
 const workspace=await mkdtemp(join(tmpdir(),'wm-strict-export-'));let calls=0;
 const fetchImpl=async(url,options)=>{calls++;return worker.fetch(new Request(url,options),env,context());};
 const credentials=()=>({OPERATOR_TOKEN:env.OPERATOR_TOKEN});
 try{
  const status=await productionOperator(['status'],{credentials,fetchImpl});assert.equal(calls,1);assert.equal(status.total,3001);assert.equal(status.containsInquiryText,false);assert.doesNotMatch(JSON.stringify(status),/Synthetic Owner|synthetic@example|payload/);
  const exported=await productionOperator(['export','synthetic-3001'],{workspace,credentials,fetchImpl});assert.equal(exported.exported,3001);assert.equal(calls,32);assert.equal(JSON.parse(await readFile(exported.file,'utf8')).records.length,3001);
  for(let i=0;i<30;i++)assert.equal((await operator(env,'/status',{headers:{Authorization:'Bearer invalid'}})).status,401);
  const blocked=await operator(env,'/status',{headers:{Authorization:'Bearer invalid'}});assert.equal(blocked.status,429);assert.equal(blocked.headers.get('Retry-After'),'600');
  assert.equal((await operator(env,'/status')).status,200);
 }finally{env.DB.sqlite.close();assert.ok(resolve(workspace).startsWith(resolve(tmpdir())+sep+'wm-strict-export-'));await rm(workspace,{recursive:true,force:true});}
});

test('operational status exposes stalled recovery, backlog and manual review without inquiry content',async()=>{
 const env=environment(),id=insert(env);env.DB.sqlite.prepare("UPDATE inquiries SET delivery_status='pending' WHERE id=?").run(id);
 let result=await (await operator(env,'/status')).json();assert.deepEqual(result.health.reasons,['notification_configuration_missing','recovery_heartbeat_missing_or_stale','notification_backlog']);assert.equal(result.attention.pending_over_ten_minutes,1);
 Object.assign(env,{RESEND_API_KEY:'synthetic',NOTIFICATION_FROM:'from@example.test',NOTIFICATION_TO:'to@example.test'});
 await recordRecoverySuccess(env.DB);env.DB.sqlite.prepare("UPDATE inquiries SET delivery_status='manual_review' WHERE id=?").run(id);
 result=await (await operator(env,'/status')).json();assert.deepEqual(result.health.reasons,['manual_review_required']);
 env.DB.sqlite.prepare("UPDATE inquiries SET delivery_status='accepted' WHERE id=?").run(id);
 result=await (await operator(env,'/status')).json();assert.equal(result.health.ok,true);
 await recordRecoverySuccess(env.DB,Date.now()-76*60_000);result=await (await operator(env,'/status')).json();assert.equal(result.health.recovery.stale,true);
 assert.doesNotMatch(JSON.stringify(result),/Synthetic Owner|synthetic@example|Synthetic Only/);env.DB.sqlite.close();
});

test('native contact links preserve known intent without script, reject URL injection and retain fixed checkout service',async()=>{
 const intake={live:true,privacyLink:'Privacy notice'},html=inquiryForm(intake);
 assert.doesNotMatch(html,/novalidate/);
 const env=environment();let conditional;
 env.ASSETS={fetch:async request=>{conditional=request.headers.get('If-None-Match');return new Response(html,{headers:{'Content-Type':'text/html','Content-Length':String(html.length),ETag:'"static"'}});}};
 const response=await worker.fetch(new Request(origin+'/contact/?offer=improve&goal=search&request_kind=question&priority=gbp&name=URL-person',{headers:{'If-None-Match':'"static"'}}),env,context());
 assert.equal(response.status,200);assert.equal(conditional,null);assert.equal(response.headers.get('ETag'),null);assert.equal(response.headers.get('Content-Length'),null);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const filled=await response.text();assert.match(filled,/name="request_kind" value="question"/);assert.match(filled,/<option value="improve" selected>/);assert.match(filled,/type="hidden" id="goal" name="goal" value="search"/);
 assert.match(filled,/name="priority" value="gbp"/);assert.doesNotMatch(filled,/<details class="inquiry-extra" open>/);assert.match(filled,/Send message/);assert.doesNotMatch(filled,/URL-person/);
 const locked=prefillInquiryHtml(inquiryForm(intake,{service:'launch_site',checkout:true}),new URL(origin+'/checkout/launch-site/?offer=grow&billing=annual&booking_choice=booking'));
 assert.match(locked,/<input type="hidden" id="service" name="service" value="launch_site">/);assert.match(locked,/name="booking_choice" value="booking"/);assert.doesNotMatch(locked,/<option value="annual" selected>/);
 const malicious=prefillInquiryHtml(html,new URL(origin+'/contact/?offer=%22%3E%3Cscript%3E&goal=%22%3E%3Cimg%3E&request_kind=unknown'));
 assert.match(malicious,/<option value="unsure" selected>/);assert.doesNotMatch(malicious,/<script>|<img>/);env.DB.sqlite.close();
});
