import {actor,admin,ids} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
export async function billingFixture(db){
 await actor(db,ids.operator,{aal:'aal2'});
 const commercial=async(c,i)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) r',[ids.org,c,i,crypto.randomUUID()])).rows[0].r;
 const p=await commercial('proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date().toISOString(),site_host:'synthetic.example',scope_note:'Synthetic website scope.'});
 const sent=await commercial('proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);
 const a=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.agreements[0];await commercial('agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 await actor(db,ids.operator,{aal:'aal2'});const m=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.milestones.find(m=>m.proof_kind==='booking');await commercial('milestone.due',{id:m.id,expected_version:m.version,evidence:'Synthetic booking verified.'});
 await admin(db);const schedule=(await db.query('select * from wm.billing_schedules where organization_id=$1 limit 1',[ids.org])).rows[0];
 await db.query("insert into wm.billing_accounts(organization_id,environment,account_id,customer_id,automatic_tax,tax_qualification,verified_at) values($1,'test','acct_fixture','cus_fixture',false,'Synthetic qualification',now())",[ids.org]);
 await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);
 const o=(await db.query("insert into wm.billing_obligations(organization_id,schedule_id,engagement_id,period_start,period_end,gross_minor,amount_minor,currency,description,environment,account_id,customer_id,automatic_tax,account_generation,authorized_by,invoice_id) values($1,$2,$3,now(),now()+interval '1 day',10000,10000,'USD','Synthetic invoice','test','acct_fixture','cus_fixture',false,1,$4,'in_fixture') returning *",[ids.org,schedule.id,ids.engagement,ids.operator])).rows[0];
 await actor(db,ids.operator,{aal:'aal2'});return o;
}
