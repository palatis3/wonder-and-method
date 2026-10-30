import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';

export const ids={org:'10000000-0000-4000-8000-000000000001',other:'10000000-0000-4000-8000-000000000002',client:'20000000-0000-4000-8000-000000000001',operator:'20000000-0000-4000-8000-000000000002',viewer:'20000000-0000-4000-8000-000000000003',outsider:'20000000-0000-4000-8000-000000000004',engagement:'30000000-0000-4000-8000-000000000001',otherEngagement:'30000000-0000-4000-8000-000000000002'};
export async function database() {
  let db;
  if(process.env.WORKSPACE_TEST_DATABASE_URL){
    const {Client}=await import('pg');const root=new Client({connectionString:process.env.WORKSPACE_TEST_DATABASE_URL});await root.connect();
    await root.query(`begin;select pg_advisory_xact_lock(173104);do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end $$;commit;`);
    const databaseName='wm_test_'+crypto.randomUUID().replaceAll('-','');await root.query(`create database ${databaseName}`);
    const url=new URL(process.env.WORKSPACE_TEST_DATABASE_URL);url.pathname='/'+databaseName;
    const client=new Client({connectionString:url.href});await client.connect();
    db={query:(...args)=>client.query(...args),exec:sql=>client.query(sql),connect:async()=>{const c=new Client({connectionString:url.href});await c.connect();return {query:(...args)=>c.query(...args),exec:sql=>c.query(sql),close:()=>c.end()};},close:async()=>{await client.end();await root.query(`drop database ${databaseName} with (force)`);await root.end();}};
  }else db=new PGlite();
  try{
  if(!process.env.WORKSPACE_TEST_DATABASE_URL)await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(`
    create schema auth;
    create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb->>'role'$$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on all functions in schema auth to authenticated,anon,service_role;`);
  const dir=new URL('../../db/workspace/migrations/',import.meta.url);
  for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  await db.query(`insert into auth.sessions(id,user_id) select u,u from unnest($1::uuid[]) u`,[[ids.client,ids.operator,ids.viewer,ids.outsider]]);
  await db.query(`insert into auth.users(id,email,email_confirmed_at) select u,u::text||'@synthetic.example',now() from unnest($1::uuid[]) u`,[[ids.client,ids.operator,ids.viewer,ids.outsider]]);
  await db.query(`insert into wm.organizations(id,name) values($1,'Synthetic North'),($2,'Synthetic South')`,[ids.org,ids.other]);
  await db.query(`insert into wm.tenant_guards(organization_id,external_generation) values($1,'fixture-generation-1'),($2,'fixture-generation-2')`,[ids.org,ids.other]);
  await db.query(`insert into wm.memberships(organization_id,user_id,role) values($1,$2,'customer_admin'),($1,$3,'viewer'),($4,$5,'customer_admin')`,[ids.org,ids.client,ids.viewer,ids.other,ids.outsider]);
  await db.query(`insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until) values($1,$2,array['read','delivery','finance','people','ads','reports','recovery'],now()+interval '1 year')`,[ids.org,ids.operator]);
  await db.query(`insert into wm.engagements(organization_id,id,service_type,catalog_id,catalog_version,title,created_by) values($1,$2,'web_design','launch_site','fixture','Synthetic website',$3),($4,$5,'seo','local_focus','fixture','Synthetic SEO',$6)`,[ids.org,ids.engagement,ids.operator,ids.other,ids.otherEngagement,ids.outsider]);
  await db.query(`insert into wm.engagement_authorities(organization_id,engagement_id,user_id,domain,kind,starts_at,ends_at,verified_by,evidence) select $1,$2,$3,domain,'primary',now()-interval '1 day',now()+interval '1 year',$4,'Synthetic verified identity' from unnest(array['content','contract','spending','stop']) domain`,[ids.org,ids.engagement,ids.client,ids.operator]);
  return db;
  }catch(error){await db.close();throw new Error(`Workspace test database setup failed: ${error.message}`);}
}
export async function actor(db,user,{aal='aal1',age=0,role='authenticated'}={}) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims',$1,false)`,[JSON.stringify({sub:user,session_id:user,role,aal,exp:Math.floor(Date.now()/1000)+3600,amr:[{method:aal==='aal2'?'totp':'otp',timestamp:Math.floor(Date.now()/1000)-age}]})]);
  if(!['authenticated','anon','service_role'].includes(role))throw Error('Invalid test role');
  await db.exec(`set role ${role}`);
}
export async function admin(db) {await db.exec('reset role');}
export async function command(db,name,input,{org=ids.org,key=crypto.randomUUID()}={}) {
  if(!/^[a-z_]+$/.test(name))throw Error('Invalid test function');
  const {rows}=await db.query(`select public.wm_${name}($1,$2::jsonb,$3) as result`,[org,JSON.stringify(input),key]);
  return rows[0].result;
}
export async function reviewable(db) {
  await actor(db,ids.client);
  const r=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Update the opening hours.'});
  await actor(db,ids.operator,{aal:'aal2'});
  const accepted=await command(db,'request_accept',{request_id:r.id,expected_version:r.version,scope:'Update the confirmed hours on the home page.',coverage:'Included project correction',owner_id:ids.operator,due_at:new Date(Date.now()+86400000).toISOString(),next_contact_at:new Date(Date.now()+3600000).toISOString(),approver_id:ids.client});
  const rev=await command(db,'revision_create',{request_id:r.id,expected_version:accepted.version,kind:'web_preview',manifest:{commit:'fixture-immutable-commit',target:'https://synthetic.example',hours:'Monday–Friday 9–5'},summary:'Opening hours updated.',cost_effect:'No additional charge.',date_effect:'Ready tomorrow.'});
  await actor(db,ids.client);
  return {r,rev};
}
