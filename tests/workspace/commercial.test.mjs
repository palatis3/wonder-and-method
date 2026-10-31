import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids,command} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
const call=async(db,action,input,key=crypto.randomUUID())=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) as r',[ids.org,action,input,key])).rows[0].r;
const projection=async db=>(await db.query('select public.wm_workspace($1) as r',[ids.org])).rows[0].r;
async function proposal(db,extra={}){
 await actor(db,ids.operator,{aal:'aal2'});
 const p=await call(db,'proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date(Date.now()+86400000).toISOString(),scope_note:'Synthetic website at the agreed domain; included native measurement, no duplicate setup charge.',...extra});
 return p;
}
test('every current catalog variant has an exact immutable database snapshot and correct fee totals',async()=>{
 const db=await database();try{
 const rows=(await db.query('select snapshot from wm.catalog_registry')).rows;
 assert.equal(rows.length,CATALOG.length);for(const c of CATALOG)assert.deepEqual(rows.find(x=>x.snapshot.id===c.id&&x.snapshot.variant===c.variant).snapshot,c);
 assert.deepEqual(CATALOG.find(x=>x.id==='search_ads').milestones.map(x=>x.amount_minor),[25000,75000,25000]);
 assert.deepEqual(CATALOG.find(x=>x.id==='launch_site').milestones.map(x=>x.amount_minor),[87800,65850,65850]);
 assert.match(CATALOG.find(x=>x.id==='launch_site').terms.payment,/878.00 USD/);assert.doesNotMatch(CATALOG.find(x=>x.id==='launch_site').terms.payment,/50%/);
 assert.equal(CATALOG.find(x=>x.id==='improve'&&x.variant==='commerce').components.find(x=>x.id==='care_onboarding').amount_minor,39500);
 await assert.rejects(db.query("update wm.catalog_registry set snapshot='{}'"),/Append-only/i);
 }finally{await db.close();}
});
test('draft privacy, current signer consent, immutable acceptance and idempotent schedule creation',async()=>{
 const db=await database();try{
 const p=await proposal(db);
 await actor(db,ids.client);let view=await projection(db);assert.equal(view.agreements.length,0);assert.equal(view.revisions.length,0);assert.equal(view.requests.length,0);
 await assert.rejects(call(db,'agreement.accept',{id:p.id,expected_version:1,consent:true,digest:'x',signer_name:'Avery'}),/current sent agreement/);
 await actor(db,ids.operator,{aal:'aal2'});const sent=await call(db,'proposal.send',{id:p.id,expected_version:p.version});
 await actor(db,ids.viewer);view=await projection(db);assert.equal(view.agreements.length,0);assert.equal(view.revisions.length,0);assert.equal(view.requests.length,0);
 await assert.rejects(call(db,'agreement.accept',{id:p.id,expected_version:sent.version,consent:true,digest:'x',signer_name:'Viewer'}),/unavailable/);
 await actor(db,ids.client);const a=(await projection(db)).agreements[0];
 await assert.rejects(command(db,'decision_record',{request_id:a.request_id,revision_id:a.revision_id,digest:a.digest,decision:'approve',shown_scope:'Shadow approval'}),/agreement acceptance/);
 await assert.rejects(call(db,'agreement.accept',{id:p.id,expected_version:sent.version,consent:false,digest:a.digest,signer_name:'Avery'}),/Affirmative/);
 await actor(db,ids.client,{age:1000});await assert.rejects(call(db,'agreement.accept',{id:p.id,expected_version:sent.version,consent:true,digest:a.digest,signer_name:'Avery'}),/Confirm your sign-in/);
 await actor(db,ids.client);const input={id:p.id,expected_version:sent.version,consent:true,digest:a.digest,signer_name:'Avery'};const key=crypto.randomUUID();const accepted=await call(db,'agreement.accept',input,key);assert.deepEqual(await call(db,'agreement.accept',input,key),accepted);
 view=await projection(db);assert.equal(view.agreements[0].status,'accepted');assert.equal(view.milestones.length,3);assert.equal(view.milestones.reduce((n,x)=>n+Number(x.amount_minor),0),219500);assert.equal(view.payments.length,0);assert.equal(view.engagements[0].service_state,'setup');assert.equal(view.billing.length,0);
 const receipt=(await db.query('select public.wm_agreement_receipt($1,$2) as r',[ids.org,p.id])).rows[0].r;assert.equal(receipt.agreement.digest,a.digest);assert.equal(receipt.decision.actor_id,ids.client);
 await admin(db);assert.equal((await db.query("select count(*)::int n from wm.critical_receipts where event_type='agreement.accepted'")).rows[0].n,1);
 await assert.rejects(db.query("update wm.agreements set signer_name='Someone else' where id=$1",[p.id]),/immutable/);
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(call(db,'proposal.withdraw',{id:p.id,expected_version:accepted.version,reason:'Remove history'}),/amendment or service closure/);
 const m=view.milestones.find(x=>x.proof_kind==='booking');const due=await call(db,'milestone.due',{id:m.id,expected_version:m.version,evidence:'Ready booked start confirmed.'});const billed=(await projection(db)).billing[0];assert.equal(billed.amount_minor,m.amount_minor);assert.equal(billed.state,'due');
 await call(db,'milestone.complete',{id:m.id,expected_version:due.version,evidence:'Readiness and booking work completed; proof saved in project handoff.'});view=await projection(db);assert.equal(view.milestones.find(x=>x.id===m.id).earned_minor,m.amount_minor);assert.equal(view.payments.length,0);
 const final=view.milestones.find(x=>x.proof_kind==='approved_work');const finalDue=await call(db,'milestone.due',{id:final.id,expected_version:final.version,evidence:'Ready for review'});
 await assert.rejects(call(db,'milestone.complete',{id:final.id,expected_version:finalDue.version,evidence:'Only operator claim'}),/Approved delivered work/);
 await assert.rejects(call(db,'milestone.complete',{id:final.id,expected_version:finalDue.version,evidence:'Contract acceptance is not work acceptance',request_id:a.request_id}),/Approved delivered work/);
 }finally{await db.close();}
});
test('withdrawn unsent proposals remain private and future amendments retain old obligations',async()=>{
 const db=await database();try{
 const hidden=await proposal(db);await call(db,'proposal.withdraw',{id:hidden.id,expected_version:1,reason:'Internal correction'});
 await actor(db,ids.client);assert.equal((await projection(db)).agreements.length,0);await assert.rejects(db.query('select public.wm_agreement_receipt($1,$2)',[ids.org,hidden.id]),/unavailable/);
 const p=await proposal(db,{expected_version:2});const sent=await call(db,'proposal.send',{id:p.id,expected_version:1});await actor(db,ids.client);let a=(await projection(db)).agreements[0];await call(db,'agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 await actor(db,ids.operator,{aal:'aal2'});let view=await projection(db);const milestone=view.milestones.find(m=>m.proof_kind==='booking');const due=await call(db,'milestone.due',{id:milestone.id,expected_version:1,evidence:'Booked initial start'});
 const next=await proposal(db,{expected_version:view.engagements[0].version,supersedes_id:p.id,starts_at:new Date(Date.now()+60*86400000).toISOString(),scope_note:'Future amendment with explicit saved scope'});
 const nextSent=await call(db,'proposal.send',{id:next.id,expected_version:1});await actor(db,ids.client);a=(await projection(db)).agreements.find(x=>x.id===next.id);await call(db,'agreement.accept',{id:next.id,expected_version:nextSent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 await actor(db,ids.operator,{aal:'aal2'});view=await projection(db);const futureMilestone=view.milestones.find(x=>x.agreement_id===next.id);await assert.rejects(call(db,'milestone.due',{id:futureMilestone.id,expected_version:futureMilestone.version,evidence:'Premature future billing'}),/activate the amendment/);assert.equal(view.agreements.find(x=>x.id===p.id).status,'accepted');assert.equal(view.billing.find(x=>x.agreement_id===p.id).effective_until,null);
 await call(db,'milestone.complete',{id:milestone.id,expected_version:due.version,evidence:'Booked-start work earned under previous terms'});
 await assert.rejects(proposal(db,{expected_version:view.engagements[0].version,supersedes_id:p.id}),/accepted agreement to amend/);
 }finally{await db.close();}
});
test('catalog price override, wrong-tenant reference and removed contract authority cannot change terms',async()=>{
 const db=await database();try{
 await assert.rejects(proposal(db,{quote_minor:1}),/cannot be overwritten/);
 await assert.rejects(proposal(db,{engagement_id:ids.otherEngagement}),/matching current service/);
 const p=await proposal(db);const sent=await call(db,'proposal.send',{id:p.id,expected_version:p.version});
 await admin(db);await db.query("update wm.engagement_authorities set revoked_at=now() where organization_id=$1 and domain='contract'",[ids.org]);
 await actor(db,ids.client);const a=(await projection(db)).agreements[0];await assert.rejects(call(db,'agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'}),/named decision-maker/);
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(command(db,'revision_create',{request_id:a.request_id,kind:'web_preview',expected_version:2,manifest:{},summary:'Replace contract',cost_effect:'zero',date_effect:'now'}),/new proposal or amendment/);
 }finally{await db.close();}
});
test('Care variant and explicit verified waiver preserve original catalog; onboarding requires exact account evidence',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});const c=CATALOG.find(x=>x.id==='improve'&&x.variant==='commerce');
 const service=await call(db,'service.create',{catalog_id:'improve',variant:c.variant,catalog_version:c.catalog_version,title:'Synthetic Commerce Care'});
 await admin(db);await db.query("insert into wm.engagement_authorities(organization_id,engagement_id,user_id,domain,kind,starts_at,ends_at,verified_by,evidence) values($1,$2,$3,'contract','primary',now()-interval '1 day',now()+interval '1 year',$4,'Verified synthetic signer')",[ids.org,service.id,ids.client,ids.operator]);
 await actor(db,ids.operator,{aal:'aal2'});const p=await call(db,'proposal.create',{engagement_id:service.id,expected_version:1,catalog_id:c.id,variant:c.variant,catalog_version:c.catalog_version,starts_at:new Date(Date.now()+86400000).toISOString(),scope_note:'Supported store with verified recovery baseline.',waiver_kind:'intro_production',waiver_evidence:'Approved introductory production client; compatibility checks still required.'});
 const sent=await call(db,'proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);const a=(await projection(db)).agreements[0];assert.equal(a.manifest.components.find(x=>x.id==='care_onboarding').amount_minor,0);
 await call(db,'agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 const view=await projection(db);assert.equal(view.billing.find(x=>x.component==='management').amount_minor,54500);assert.ok(view.billing.every(x=>x.state==='planned'&&x.next_invoice_at===null));assert.equal(view.access.length,2);
 await actor(db,ids.operator,{aal:'aal2'});const step=view.access[0];await assert.rejects(call(db,'onboarding.update',{id:step.id,expected_version:step.version,status:'verified',next_action:'Ready'}),/verified access evidence/);
 await call(db,'onboarding.update',{id:step.id,expected_version:step.version,status:'verified',account_reference:'synthetic-store.example',evidence:'Verified named owner and recovery access on the exact store.',next_action:'Maintain current access'});
 await admin(db);const original=(await db.query("select snapshot from wm.catalog_registry where catalog_id='keep_running' and variant='commerce'")).rows[0].snapshot;assert.equal(original.components.find(x=>x.id==='care_onboarding').amount_minor,39500);
 }finally{await db.close();}
});
test('a delivered-work approval can earn only its pre-linked milestone',async()=>{
 const db=await database();try{
 const p=await proposal(db);const sent=await call(db,'proposal.send',{id:p.id,expected_version:1});await actor(db,ids.client);let view=await projection(db);let a=view.agreements[0];await call(db,'agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 const work=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Review copy and design for milestone two.'});
 await actor(db,ids.operator,{aal:'aal2'});view=await projection(db);const stages=view.milestones.filter(m=>m.proof_kind==='approved_work');const accepted=await command(db,'request_accept',{request_id:work.id,expected_version:work.version,scope:'Copy and design direction for the accepted website',coverage:'Milestone two',owner_id:ids.operator,due_at:new Date(Date.now()+86400000).toISOString(),next_contact_at:new Date(Date.now()+3600000).toISOString(),approver_id:ids.client});
 const linked=await call(db,'milestone.link',{id:stages[0].id,expected_version:1,request_id:work.id,evidence:'This work fulfills the copy and design milestone.'});
 await assert.rejects(call(db,'milestone.link',{id:stages[1].id,expected_version:1,request_id:work.id,evidence:'Reuse copy for staging'}),/unique constraint/);
 const revision=await command(db,'revision_create',{request_id:work.id,expected_version:accepted.version,kind:'web_preview',manifest:{content:'Reviewed copy and design'},summary:'Copy and design direction',cost_effect:'Included milestone',date_effect:'Ready for review'});
 const proof=(await projection(db)).revisions.find(r=>r.id===revision.id);assert.equal(proof.manifest.milestone_id,stages[0].id);
 await actor(db,ids.client);await command(db,'decision_record',{request_id:work.id,expected_version:revision.version,revision_id:revision.id,digest:revision.digest,decision:'approve',shown_scope:proof.manifest.milestone_acceptance});
 await actor(db,ids.operator,{aal:'aal2'});const due=await call(db,'milestone.due',{id:stages[0].id,expected_version:linked.version,evidence:'Work milestone started'});await call(db,'milestone.complete',{id:stages[0].id,expected_version:due.version,request_id:work.id,evidence:'Customer approved the linked copy and design.'});
 const otherDue=await call(db,'milestone.due',{id:stages[1].id,expected_version:1,evidence:'Staging work started'});await assert.rejects(call(db,'milestone.complete',{id:stages[1].id,expected_version:otherDue.version,request_id:work.id,evidence:'Reuse the copy approval for staging'}),/Approved delivered work/);
 }finally{await db.close();}
});
