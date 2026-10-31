// Synthetic, ephemeral data only. This module is never imported by the Worker.
import {database,actor,admin,command,reviewable,ids} from './database.mjs';
export async function previewFixture(){
  if(process.env.WORKSPACE_TEST_DATABASE_URL)throw Error('The UI preview must use ephemeral local WASM storage.');
  const db=await database();const {r,rev}=await reviewable(db);
  await admin(db);
  await db.query("update wm.organizations set name='Maple Studio · Synthetic',ai_enabled=true where id=$1",[ids.org]);
  await db.query("update wm.engagements set title='Your website',service_state='active' where id=$1",[ids.engagement]);
  await db.query("insert into wm.profiles(user_id,display_name) values($1,'Avery · business owner'),($2,'Morgan · studio')",[ids.client,ids.operator]);
  await db.query("insert into wm.billing_accounts(organization_id,environment,account_id,customer_id,automatic_tax,tax_qualification,verified_at) values($1,'test','acct_synthetic','cus_synthetic',false,'Synthetic preview only, no Stripe connection',now())",[ids.org]);
  await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);
  await actor(db,ids.operator,{aal:'aal2'});
  await command(db,'message_send',{engagement_id:ids.engagement,request_id:r.id,body:'The opening hours are ready for your review. The change is included in your existing website service.',visibility:'shared'});
  await command(db,'message_send',{engagement_id:ids.engagement,request_id:r.id,body:'Internal synthetic note: verify weekend hours in the next review.',visibility:'internal'});
  await actor(db,ids.client);await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Add our new seasonal workshop to the services page.'});
  const aiSources=[{ref:'request:'+r.id,version:rev.version,kind:'request',data:{outcome:'Update opening hours',state:'in_review'}}];
  await admin(db);
  await db.query(`insert into wm.ai_runs(organization_id,engagement_id,request_id,task_type,input_refs,input_digest,model_config,prompt_version,output,status,created_by)
    values($1,$2,$3,'request_brief',$4,'synthetic-not-live','{"model":"gpt-6-astra"}','synthetic-preview','{"title":"Opening-hours brief","draft":"Confirm the updated hours and review the homepage change. This is synthetic preview text.","claims":[],"questions":["Are weekend hours unchanged?"],"warnings":["Synthetic example; no model call was made."]}','stale',$5)`,[ids.org,ids.engagement,r.id,aiSources,ids.operator]);
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['intake'],now()+interval '1 day')",[ids.operator]);
  const routeId='40000000-0000-4000-8000-000000000031';
  await db.query("insert into wm.inbound_routes(id,organization_id,engagement_id,request_id,token_hash,created_by) values($1,$2,$3,$4,$5,$6)",[routeId,ids.org,ids.engagement,r.id,'a'.repeat(64),ids.operator]);
  await db.query("insert into wm.inbound_emails(id,connection,environment,provider_id,state,metadata,body_text,content_hash,urgent,reason) values('40000000-0000-4000-8000-000000000032','synthetic','staging','40000000-0000-4000-8000-000000000033','captured',$1,$2,$3,true,'sender_needs_review')",[{from:'unverified@synthetic.example',subject:'Synthetic urgent email'},'Please pause. <script>Literal untrusted content</script>','b'.repeat(64)]);
  for(const [provider,credential,account,hash]of [['analytics','40000000-0000-4000-8000-000000000071','properties/123','c'],['search_console','40000000-0000-4000-8000-000000000072','sc-domain:synthetic.example','d']]){
   await db.query("insert into wm.oauth_sessions(organization_id,id,engagement_id,provider,environment,actor_id,actor_kind,session_id,state_hash,browser_hash,verifier_ciphertext,authority_version,recovery_generation,external_generation,state) select $1,$2,$3,$4,'production',$5,'customer_admin',$5,$6,$7,repeat('x',24),authority_version,recovery_generation,external_generation,'connected' from wm.tenant_guards where organization_id=$1",[ids.org,credential,ids.engagement,provider,ids.client,hash.repeat(64),(hash+'1').repeat(32)]);
   await db.query("insert into wm.integration_credentials(organization_id,id,engagement_id,provider,environment,authorized_by,actor_kind,oauth_session_id,recovery_generation,external_generation,ciphertext,key_version) select $1,$2,$3,$4,'production',$5,'customer_admin',$2,recovery_generation,external_generation,repeat('x',24),'synthetic' from wm.tenant_guards where organization_id=$1",[ids.org,credential,ids.engagement,provider,ids.client]);
   await db.query("insert into wm.provider_scopes(organization_id,engagement_id,provider,environment,account_id,currency,timezone,permissions,access_status,credential_id) values($1,$2,$3,'production',$4,$5,$6,array['read'],'read_verified',$7)",[ids.org,ids.engagement,provider,account,provider==='analytics'?'USD':null,provider==='analytics'?'America/New_York':null,credential]);
  }
  return {db,ids,request:r,revision:rev};
}
