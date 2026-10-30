// Synthetic, ephemeral data only. This module is never imported by the Worker.
import {database,actor,admin,command,reviewable,ids} from './database.mjs';
export async function previewFixture(){
  if(process.env.WORKSPACE_TEST_DATABASE_URL)throw Error('The UI preview must use ephemeral local WASM storage.');
  const db=await database();const {r,rev}=await reviewable(db);
  await admin(db);
  await db.query("update wm.organizations set name='Maple Studio · Synthetic',ai_enabled=true where id=$1",[ids.org]);
  await db.query("update wm.engagements set title='Your website',service_state='active' where id=$1",[ids.engagement]);
  await db.query("insert into wm.profiles(user_id,display_name) values($1,'Avery · business owner'),($2,'Morgan · studio')",[ids.client,ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});
  await command(db,'message_send',{engagement_id:ids.engagement,request_id:r.id,body:'The opening hours are ready for your review. The change is included in your existing website service.',visibility:'shared'});
  await command(db,'message_send',{engagement_id:ids.engagement,request_id:r.id,body:'Internal synthetic note: verify weekend hours in the next review.',visibility:'internal'});
  await actor(db,ids.client);await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Add our new seasonal workshop to the services page.'});
  const aiSources=[{ref:'request:'+r.id,version:rev.version,kind:'request',data:{outcome:'Update opening hours',state:'in_review'}}];
  await admin(db);
  await db.query(`insert into wm.ai_runs(organization_id,engagement_id,request_id,task_type,input_refs,input_digest,model_config,prompt_version,output,status,created_by)
    values($1,$2,$3,'request_brief',$4,'synthetic-not-live','{"model":"gpt-6-astra"}','synthetic-preview','{"title":"Opening-hours brief","draft":"Confirm the updated hours and review the homepage change. This is synthetic preview text.","claims":[],"questions":["Are weekend hours unchanged?"],"warnings":["Synthetic example; no model call was made."]}','stale',$5)`,[ids.org,ids.engagement,r.id,aiSources,ids.operator]);
  return {db,ids,request:r,revision:rev};
}
