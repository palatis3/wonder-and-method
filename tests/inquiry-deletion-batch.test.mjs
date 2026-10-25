import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createDeletionPlan,executeDeletionPlan,validateDeletionPlan,deletionPlanDigest} from '../deployment/inquiry-deletion-batch.mjs';
import {productionOperator} from '../deployment/production-operator.mjs';
import worker from '../deployment/worker.mjs';

const migrations=await Promise.all(['0001_inquiries.sql','0003_inquiry_followup.sql','0009_inquiry_delivery_resolutions.sql'].map(name=>readFile(new URL('../deployment/migrations/'+name,import.meta.url),'utf8')));
const now=Date.UTC(2026,9,24),day=86400000;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function fixture(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(migrations.join('\n'));t.after(()=>sqlite.close());
 return {sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
}
function seed(db,n,patch={}){
 const row={id:id(n),created_at:now-110*day,payload:'Synthetic name and private email content',dedupe_key:'synthetic-'+n,synthetic:0,delivery_status:'accepted',last_substantive_contact_at:now-90*day,...patch};
 db.sqlite.prepare(`INSERT INTO inquiries (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));
}
const resolveSpam=(db,n,outcome='spam_confirmed')=>db.sqlite.prepare('INSERT INTO inquiry_delivery_resolutions VALUES (?,?,?,?)').run(id(n),now-1000,outcome,'synthetic-review');
const plan=(db,ids=[1,2],reason='retention_due')=>createDeletionPlan(db,{reason,references:ids.map(id)},now);
const count=db=>db.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n;

test('reviewed retention plan deletes the exact complete set and never carries inquiry content',async t=>{
 const db=fixture(t);for(const n of [1,2,3])seed(db,n);
 const proposal=await plan(db);assert.equal(count(db),3);assert.equal(proposal.records.length,2);assert.ok(!JSON.stringify(proposal).includes('private email'));assert.equal(proposal.expiresAt-now,30*60*1000);
 const result=await executeDeletionPlan(db,proposal,proposal.digest,now);assert.equal(result.deleted,2);assert.equal(count(db),1);assert.equal(db.sqlite.prepare('SELECT id FROM inquiries').get().id,id(3));
 await assert.rejects(executeDeletionPlan(db,proposal,proposal.digest,now),error=>error.status===409);assert.equal(count(db),1);
});
test('batch size and reference validation reject empty, duplicate, unknown and oversized sets',async t=>{
 const db=fixture(t);seed(db,1);
 for(const input of [{reason:'held',references:[id(1)]},{reason:'retention_due',references:[]},{reason:'retention_due',references:[id(1),id(1)]},{reason:'retention_due',references:["' OR 1=1"]},{reason:'retention_due',references:Array.from({length:26},(_,n)=>id(n))},{reason:'retention_due',references:[id(1)],extra:true}])await assert.rejects(createDeletionPlan(db,input,now),e=>e.status===422);
 await assert.rejects(plan(db),e=>e.status===409);assert.equal(count(db),1);
});
test('retention eligibility excludes clients, holds, synthetic, unknown/recent contact, sending and active leases',async t=>{
 const db=fixture(t);seed(db,1);
 const patches=[{is_client:1},{retention_hold:1,retention_hold_review_at:now-1},{synthetic:1},{last_substantive_contact_at:null},{last_substantive_contact_at:now-89*day},{delivery_status:'sending',lease_until:now-1},{lease_until:now},{lease_until:now+1}];
 for(let index=0;index<patches.length;index++){seed(db,index+2,patches[index]);await assert.rejects(plan(db,[1,index+2]),e=>e.status===409);}
 assert.equal(count(db),patches.length+1);
});
test('held delivery alone is never spam; only previously recorded spam/duplicate resolutions qualify',async t=>{
 const db=fixture(t);for(const n of [1,2,3,4])seed(db,n,{delivery_status:'manual_review',last_substantive_contact_at:null});
 resolveSpam(db,2,'handled_manually');resolveSpam(db,3);resolveSpam(db,4,'duplicate_confirmed');
 for(const n of [1,2])await assert.rejects(plan(db,[n],'resolved_spam_or_duplicate'),e=>e.status===409);
 const proposal=await plan(db,[3,4],'resolved_spam_or_duplicate');assert.equal((await executeDeletionPlan(db,proposal,proposal.digest,now)).deleted,2);
 assert.equal(count(db),2);assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM inquiry_delivery_resolutions').get().n,1);
});
test('any changed operational field rejects all records without partial deletion',async t=>{
 const mutations=["is_client=1","retention_hold=1","last_substantive_contact_at=last_substantive_contact_at+1","delivery_status='sending'","lease_until="+now,"lease_until=1","attempts=attempts+1","provider_id='changed'","first_attempt_at=1","retention_hold_review_at=1","created_at=created_at+1","synthetic=1"];
 for(const mutation of mutations){const db=fixture(t);seed(db,1);seed(db,2);const proposal=await plan(db);db.sqlite.exec('UPDATE inquiries SET '+mutation+" WHERE id='"+id(2)+"'");await assert.rejects(executeDeletionPlan(db,proposal,proposal.digest,now),e=>e.status===409);assert.equal(count(db),2,mutation);}
});
test('missing record and changed resolution reject a complete batch atomically',async t=>{
 const db=fixture(t);seed(db,1);seed(db,2);const proposal=await plan(db);db.sqlite.prepare('DELETE FROM inquiries WHERE id=?').run(id(2));
 await assert.rejects(executeDeletionPlan(db,proposal,proposal.digest,now),e=>e.status===409);assert.equal(count(db),1);
 seed(db,2,{delivery_status:'manual_review'});resolveSpam(db,2);const second=await plan(db);db.sqlite.exec("UPDATE inquiry_delivery_resolutions SET evidence_reference='changed-review'");
 await assert.rejects(executeDeletionPlan(db,second,second.digest,now),e=>e.status===409);assert.equal(count(db),2);
});
test('digest, origin, expiry and schema failures cannot remove records',async t=>{
 const db=fixture(t);seed(db,1);const proposal=await plan(db,[1]);
 await assert.rejects(executeDeletionPlan(db,proposal,'a'.repeat(64),now),e=>e.status===422);
 for(const change of [{reason:'resolved_spam_or_duplicate'},{origin:'https://elsewhere.test'},{createdAt:now+1},{records:[]},{records:[proposal.records[0],proposal.records[0]]},{extra:1}])await assert.rejects(executeDeletionPlan(db,{...proposal,...change},proposal.digest,now),e=>e.status===422);
 await assert.rejects(executeDeletionPlan(db,proposal,proposal.digest,proposal.expiresAt),e=>e.status===422);
 db.sqlite.exec('DROP TABLE inquiry_delivery_resolutions');await assert.rejects(executeDeletionPlan(db,proposal,proposal.digest,now),e=>e.status===503);assert.equal(count(db),1);
});
test('atomic SQL rechecks eligibility after the plan read and accepts an unchanged expired lease',async t=>{
 const db=fixture(t);seed(db,1,{lease_until:now-1});seed(db,2);const proposal=await plan(db);
 const intercepted={prepare(sql){if(sql.startsWith('WITH matching'))db.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id(2));return db.prepare(sql);}};
 await assert.rejects(executeDeletionPlan(intercepted,proposal,proposal.digest,now),e=>e.status===409);assert.equal(count(db),2);
 db.sqlite.prepare('UPDATE inquiries SET retention_hold=0 WHERE id=?').run(id(2));assert.equal((await executeDeletionPlan(db,proposal,proposal.digest,now)).deleted,2);
});
test('batch API requires authentication and exact digest; GET and an unconfirmed POST cannot delete',async t=>{
 const db=fixture(t);seed(db,1);const environment={DB:db,ENVIRONMENT:'production',RELEASE_APPROVED:'true',OPERATOR_TOKEN:'synthetic-token'},base='https://example.test/api/operator/inquiries';
 const make=(path,body,headers={})=>new Request(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const input={reason:'retention_due',references:[id(1)]},auth={Authorization:'Bearer synthetic-token'};
 assert.equal((await worker.fetch(make('/deletion-plan',input),environment,{})).status,401);
 const response=await worker.fetch(make('/deletion-plan',input,auth),environment,{});assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 const proposal=await response.json();assert.equal(count(db),1);
 assert.equal((await worker.fetch(new Request(base+'/delete-batch',{headers:auth}),environment,{})).status,404);
 assert.equal((await worker.fetch(make('/delete-batch',proposal,auth),environment,{})).status,422);assert.equal(count(db),1);
 const deleted=await worker.fetch(make('/delete-batch',proposal,{...auth,'X-Confirm-Delete-Batch':proposal.digest}),environment,{});assert.equal(deleted.status,200);assert.equal(count(db),0);
});
test('private CLI plans require explicit review digest, never overwrite, and reject changed files before credentials',async t=>{
 const db=fixture(t);seed(db,1);const workspace=await mkdtemp(join(tmpdir(),'wm-deletion-batch-'));
 t.after(async()=>{assert.ok(resolve(workspace).startsWith(resolve(tmpdir())+sep+'wm-deletion-batch-'));await rm(workspace,{recursive:true,force:true});});
 await mkdir(join(workspace,'.runtime'));await writeFile(join(workspace,'.runtime/input.json'),JSON.stringify({reason:'retention_due',references:[id(1)]}));
 const calls=[],options={workspace,now:()=>new Date(now),credentials:()=>({OPERATOR_TOKEN:'synthetic-token'}),fetchImpl:async(url,init)=>{calls.push({url,init});const body=JSON.parse(init.body);return Response.json(url.endsWith('/deletion-plan')?await createDeletionPlan(db,body,now):await executeDeletionPlan(db,body,init.headers['X-Confirm-Delete-Batch'],now));}};
 const result=await productionOperator(['deletion-plan','review','.runtime/input.json'],options);assert.equal(count(db),1);assert.equal(result.records,1);assert.equal(result.private,true);
 const proposal=JSON.parse(await readFile(result.file,'utf8'));assert.equal(proposal.digest,result.digest);validateDeletionPlan(proposal,result.digest,now);
 await assert.rejects(productionOperator(['deletion-plan','review','.runtime/input.json'],options),/EEXIST/);
 await assert.rejects(productionOperator(['delete-batch',result.file,'0'.repeat(64)],{...options,credentials:()=>assert.fail('must not read credentials')}),/exact reviewed plan digest/);
 const changed={...proposal,reason:'resolved_spam_or_duplicate'};await writeFile(result.file,JSON.stringify(changed));await assert.rejects(productionOperator(['delete-batch',result.file,result.digest],{...options,credentials:()=>assert.fail('must not read credentials')}),/exact reviewed plan digest/);
 await writeFile(result.file,JSON.stringify(proposal));assert.equal((await productionOperator(['delete-batch',result.file,result.digest],options)).deleted,1);assert.equal(count(db),0);
 const call=calls.at(-1);assert.equal(call.init.method,'POST');assert.equal(call.init.headers['X-Confirm-Delete-Batch'],result.digest);assert.match(call.url,/\/delete-batch$/);
 await writeFile(join(workspace,'outside.json'),JSON.stringify(proposal));await assert.rejects(productionOperator(['delete-batch','outside.json',result.digest],options),/private .runtime/);
 assert.equal(deletionPlanDigest(proposal),result.digest);
});
