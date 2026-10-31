import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids} from './database.mjs';
import {sealCredential,openCredential,credentialContext,hashSecret,pkceChallenge} from '../../worker/workspace/integrations/vault.mjs';
const machine=async db=>actor(db,ids.operator,{role:'service_role'});
const env={INTEGRATION_KEY_ID:'one',INTEGRATION_KEYS:JSON.stringify({one:Buffer.alloc(32,9).toString('base64url')})};
async function start(db,provider='google_ads'){
 await actor(db,ids.client);const id=crypto.randomUUID(),input={id,engagement_id:ids.engagement,provider,environment:'test',state_hash:await hashSecret(id),browser_hash:await hashSecret('browser-'+id),verifier_ciphertext:'synthetic-encrypted-verifier'};await command(db,'connection_start',input);return input;
}
async function claim(db,s){await machine(db);return (await db.query('select public.wm_connection_claim($1,$2,$3) as r',[s.provider,s.state_hash,s.browser_hash])).rows[0].r;}
async function connected(db){const s=await start(db),a=await claim(db,s);await db.query('select public.wm_connection_complete($1,$2,$3,$4,$5,$6)',[ids.org,s.id,a.exchange_nonce,'synthetic-encrypted-provider-credential','one',new Date(Date.now()+3600000)]);return s;}
async function ticket(db,c,purpose='discover',account='1234567890'){await actor(db,ids.client);return command(db,'connection_ticket',{connection_id:c.id,purpose,...(purpose==='bind'?{account_id:account}:{})});}
const observation=account=>({account_id:account,currency:'USD',timezone:'America/New_York',permissions:['read'],observed_at:new Date().toISOString(),environment:'test',name:'Synthetic Ads Account'});
test('credential encryption binds tenant, service, provider, environment and purpose; rotated old keys remain readable',async()=>{
 const c=credentialContext({organization_id:ids.org,id:crypto.randomUUID(),engagement_id:ids.engagement,provider:'google_ads',environment:'test'}),token={access_token:'synthetic-private-access',refresh_token:'synthetic-private-refresh'},encrypted=await sealCredential(env,token,c);
 assert.ok(!encrypted.includes('synthetic-private'));assert.deepEqual(await openCredential(env,encrypted,c),token);
 for(const change of [{organization_id:ids.other},{provider:'meta_ads'},{environment:'production'},{purpose:'oauth_verifier'},{id:crypto.randomUUID()}])await assert.rejects(openCredential(env,encrypted,{...c,...change}),/needs attention/);
 assert.deepEqual(await openCredential({...env,INTEGRATION_KEY_ID:'two',INTEGRATION_KEYS:JSON.stringify({...JSON.parse(env.INTEGRATION_KEYS),two:Buffer.alloc(32,4).toString('base64url')})},encrypted,c),token);
 assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('OAuth authorization is one-use, browser/provider bound, current-session checked, and credentials never reach customer projection',async()=>{
 const db=await database();try{
  const s=await start(db);await machine(db);await assert.rejects(db.query('select public.wm_connection_claim($1,$2,$3)',['meta_ads',s.state_hash,s.browser_hash]),/unavailable/);await assert.rejects(db.query('select public.wm_connection_claim($1,$2,$3)',[s.provider,s.state_hash,'f'.repeat(64)]),/unavailable/);
  const a=await claim(db,s);await assert.rejects(claim(db,s),/already used/);
  await db.query('select public.wm_connection_complete($1,$2,$3,$4,$5,$6)',[ids.org,s.id,a.exchange_nonce,'synthetic-encrypted-provider-credential','one',new Date(Date.now()+3600000)]);
  await assert.rejects(db.query('select public.wm_connection_complete($1,$2,$3,$4,$5,$6)',[ids.org,s.id,a.exchange_nonce,'synthetic-encrypted-provider-credential','one',new Date(Date.now()+3600000)]),/no longer current/);
  await actor(db,ids.client);const projection=(await db.query('select public.wm_connections($1) as r',[ids.org])).rows[0].r;assert.equal(projection.length,1);assert.ok(!JSON.stringify(projection).includes('ciphertext'));await assert.rejects(db.query('select * from wm.integration_credentials'),/permission denied/);
  const revoked=await start(db);await admin(db);await db.query('delete from auth.sessions where id=$1',[ids.client]);await assert.rejects(claim(db,revoked),/no longer current/);
 }finally{await db.close();}
});
test('account binding requires a fresh exact provider observation and current ticket; refreshed credentials cannot be overwritten after disconnect',async()=>{
 const db=await database();try{
  const c=await connected(db),t=await ticket(db,c,'bind');await machine(db);
  await assert.rejects(db.query('select public.wm_connection_bind($1,$2,$3)',[ids.org,t.id,JSON.stringify(observation('999'))]),/exact account/);
  const bound=(await db.query('select public.wm_connection_bind($1,$2,$3) as r',[ids.org,t.id,JSON.stringify(observation('1234567890'))])).rows[0].r;assert.equal(bound.state,'read_verified');
  await assert.rejects(db.query('select public.wm_connection_bind($1,$2,$3)',[ids.org,t.id,JSON.stringify(observation('1234567890'))]),/expired or changed/);
  const read=await ticket(db,c);await machine(db);const refresh=(await db.query('select public.wm_connection_refresh_begin($1,$2,1) as r',[ids.org,read.id])).rows[0].r;
  await assert.rejects(db.query('select public.wm_connection_refresh_begin($1,$2,$3)',[ids.org,read.id,refresh.version]),/reconciliation/);
  await actor(db,ids.client);await command(db,'connection_disconnect',{connection_id:c.id,expected_version:refresh.version});await machine(db);
  await assert.rejects(db.query('select public.wm_connection_refresh_complete($1,$2,$3,$4,$5,$6)',[ids.org,c.id,refresh.nonce,'synthetic-new-encrypted-provider-credential','one',new Date(Date.now()+3600000)]),/no longer current/);
 }finally{await db.close();}
});
test('connection start and late callback cannot outlive business or operator authority',async()=>{
 const db=await database();try{
  await actor(db,ids.viewer);await assert.rejects(command(db,'connection_start',{}),/administrator/);
  const s=await start(db),a=await claim(db,s);await admin(db);await db.query("update wm.memberships set role='contributor' where organization_id=$1 and user_id=$2",[ids.org,ids.client]);await machine(db);
  await assert.rejects(db.query('select public.wm_connection_complete($1,$2,$3,$4,$5,$6)',[ids.org,s.id,a.exchange_nonce,'synthetic-encrypted-provider-credential','one',null]),/no longer current/);
 }finally{await db.close();}
});

test('ending services and restored credential generations cannot complete authorization or bind accounts',async()=>{
 const db=await database();try{
  const s=await start(db),a=await claim(db,s);await admin(db);await db.query("update wm.engagements set service_state='ending' where id=$1",[ids.engagement]);await machine(db);
  await assert.rejects(db.query('select public.wm_connection_complete($1,$2,$3,$4,$5,$6)',[ids.org,s.id,a.exchange_nonce,'synthetic-encrypted-provider-credential','one',null]),/no longer current/);
  await admin(db);await db.query("update wm.engagements set service_state='active' where id=$1",[ids.engagement]);const c=await connected(db),t=await ticket(db,c,'bind');await admin(db);await db.query("update wm.engagements set service_state='ending' where id=$1",[ids.engagement]);await machine(db);
  await assert.rejects(db.query('select public.wm_connection_bind($1,$2,$3)',[ids.org,t.id,JSON.stringify(observation('1234567890'))]),/no longer current/);
  await admin(db);await db.query("update wm.engagements set service_state='active' where id=$1",[ids.engagement]);await db.query("update wm.tenant_guards set recovery_generation=recovery_generation+1,external_generation='restored-new-generation' where organization_id=$1",[ids.org]);
  await assert.rejects(ticket(db,c),/Reconnect after recovery/);
 }finally{await db.close();}
});
