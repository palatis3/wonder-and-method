begin;

-- Global prospect data is never a customer projection. Provision sources/grants
-- only through the separately reviewed root bootstrap, not these RPCs.
create table wm.intake_lock(id boolean primary key default true check(id));
insert into wm.intake_lock values(true);
create table wm.intake_sources(
 id text primary key check(id ~ '^[a-z0-9_-]{1,60}$'),origin text not null,
 environment text not null check(environment in ('production','staging')),
 enabled boolean not null default false,approved_evidence text not null,
 check(origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$')
);
create table wm.intake_arrivals(
 id uuid primary key default gen_random_uuid(),source_key text not null references wm.intake_sources(id),source_id uuid not null,
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),identity_json text not null,payload jsonb not null,
 source_created_at_ms bigint not null,synthetic boolean not null,created_at timestamptz not null default now(),
 unique(source_key,source_id),unique(id,source_key,source_id)
);
create table wm.intake_opportunities(
 id uuid primary key references wm.intake_arrivals(id),assigned_to uuid references wm.staff(user_id),
 stage text not null default 'new' check(stage in ('new','qualified','proposed','won','lost')),
 next_action text not null default 'Review this unverified inquiry.',next_contact_at timestamptz,
 quarantined boolean not null default false,version bigint not null default 1,
 updated_at timestamptz not null default now()
);
create index intake_queue_stage on wm.intake_opportunities(stage,id);
create index intake_queue_assignee on wm.intake_opportunities(assigned_to,id);
create table wm.intake_conflicts(
 intake_id uuid not null references wm.intake_arrivals(id),source_hash text not null,identity_json text not null,
 first_seen_at timestamptz not null default now(),primary key(intake_id,source_hash)
);
create table wm.intake_conflict_decisions(
 intake_id uuid not null,source_hash text not null,actor_id uuid not null,reason text not null,created_at timestamptz not null default now(),
 primary key(intake_id,source_hash),foreign key(intake_id,source_hash) references wm.intake_conflicts(intake_id,source_hash)
);
create table wm.intake_receipts(
 source_key text not null references wm.intake_sources(id),response_hash text not null,after_id uuid,next_id uuid,
 received_at timestamptz not null default now(),envelope_hash text not null,result jsonb not null,
 primary key(source_key,response_hash,after_id)
);
-- Null is represented by the nil UUID in receipts, never as a source inquiry ID.
create table wm.intake_events(
 id bigint generated always as identity primary key,intake_id uuid not null references wm.intake_arrivals(id),
 actor_id uuid,action text not null,details jsonb not null,created_at timestamptz not null default now()
);
create table wm.intake_commands(
 actor_id uuid not null,command text not null,action_key text not null,payload_hash text not null,result jsonb not null,
 primary key(actor_id,command,action_key),created_at timestamptz not null default now()
);
create table wm.intake_creation_grants(
 id uuid primary key default gen_random_uuid(),staff_id uuid not null references wm.staff(user_id),
 intake_id uuid not null references wm.intake_arrivals(id),business_name text not null check(length(business_name) between 1 and 160),
 timezone text not null,capabilities text[] not null,
 operator_expires_at timestamptz not null,expires_at timestamptz not null,
 approved_by uuid not null,approval_evidence text not null check(length(approval_evidence) between 1 and 2000),
 staff_digest text not null,created_at timestamptz not null default now(),
 check(approved_by<>staff_id),check(cardinality(capabilities)>0 and 'read'=any(capabilities)),
 check(capabilities <@ array['read','delivery','people','finance','ads','reports','recovery']::text[]),
 unique(id,intake_id,staff_id)
);
create table wm.intake_grant_revocations(
 grant_id uuid primary key references wm.intake_creation_grants(id),revoked_by uuid not null,reason text not null,
 created_at timestamptz not null default now()
);
create table wm.intake_links(
 intake_id uuid primary key references wm.intake_arrivals(id),organization_id uuid not null,
 opportunity_id uuid not null,source_import_id uuid not null,accepted_by uuid not null,accepted_summary text not null,
 tenant_version bigint not null default 1,created_at timestamptz not null default now(),
 foreign key(organization_id,opportunity_id) references wm.opportunities(organization_id,id),
 foreign key(organization_id,source_import_id) references wm.source_imports(organization_id,id),
 unique(intake_id,organization_id)
);
create table wm.intake_grant_uses(
 grant_id uuid primary key,intake_id uuid not null unique,staff_id uuid not null,organization_id uuid not null unique,
 used_at timestamptz not null default now(),
 foreign key(grant_id,intake_id,staff_id) references wm.intake_creation_grants(id,intake_id,staff_id),
 foreign key(intake_id,organization_id) references wm.intake_links(intake_id,organization_id)
);
create function wm.intake_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Intake evidence is immutable' using errcode='42501';end $$;
do $$declare n text;begin
 foreach n in array array['intake_lock','intake_sources','intake_arrivals','intake_opportunities','intake_conflicts','intake_conflict_decisions','intake_receipts','intake_events','intake_commands','intake_creation_grants','intake_grant_revocations','intake_links','intake_grant_uses'] loop
  execute format('alter table wm.%I enable row level security',n);
  execute format('revoke all on wm.%I from public,anon,authenticated,service_role',n);
 end loop;
 foreach n in array array['intake_arrivals','intake_conflicts','intake_conflict_decisions','intake_receipts','intake_events','intake_commands','intake_creation_grants','intake_grant_revocations','intake_grant_uses'] loop
  execute format('create trigger intake_immutable before update or delete on wm.%I for each row execute function wm.intake_immutable()',n);
 end loop;
end $$;

create function wm.intake_staff(cap text default 'intake') returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_session();perform wm.require_recent_auth();
 if coalesce(wm.claims()->>'aal','')<>'aal2' then raise exception 'Current MFA required' using errcode='42501';end if;
 if not exists(select 1 from wm.staff s join auth.users u on u.id=s.user_id where s.user_id=auth.uid() and s.revoked_at is null
  and s.active_until>clock_timestamp() and cap=any(s.capabilities) and u.email_confirmed_at is not null) then
  raise exception 'Current verified intake staff capability required' using errcode='42501';end if;
end $$;
create function wm.intake_tenant(org uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(org,'read');
 perform wm.intake_staff();
 -- Current shared operator_has uses transaction time for direct expiry. Fence a
 -- stale direct grant here too; shared temporary-cover integration stays with main.
 if not exists(select 1 from wm.operator_assignments a where a.organization_id=org and a.user_id=auth.uid()
  and a.revoked_at is null and a.active_until>clock_timestamp() and a.capabilities && array['delivery','people','admin']::text[]) then
  raise exception 'Current direct target-business delivery or people authority required' using errcode='42501';end if;
 if wm.operator_has(org,'delivery') then perform wm.require_access(org,'delivery');
 elsif wm.operator_has(org,'people') then perform wm.require_access(org,'people');
 else raise exception 'Current target-business delivery or people authority required' using errcode='42501';end if;
end $$;
create function public.wm_intake_access() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin perform wm.intake_staff();return jsonb_build_object('allowed',true);end $$;
create function public.wm_intake_source(p_source text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;begin
 perform wm.require_machine();select jsonb_build_object('id',id,'origin',origin,'environment',environment) into result from wm.intake_sources where id=p_source and enabled;
 if result is null then raise exception 'Intake source unavailable' using errcode='42501';end if;return result;
end $$;

-- Server attests authenticated export origin; a hash alone is not authenticity.
create function public.wm_intake_receive(p_source text,p_envelope jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e jsonb;identity jsonb;payload jsonb;a wm.intake_arrivals;prior wm.intake_receipts;
sid uuid;cursor_after uuid;next_id uuid;last_id uuid;raw_hash text;identity_text text;h text;new_count integer:=0;dup_count integer:=0;conflict_count integer:=0;result jsonb;
begin
 perform wm.require_machine();perform 1 from wm.intake_lock where id for update;
 if not exists(select 1 from wm.intake_sources where id=p_source and enabled and origin=p_envelope->>'origin' and environment=p_envelope->>'environment') then raise exception 'Approved source binding required' using errcode='42501';end if;
 perform wm.check_input(p_envelope,array['schema','origin','environment','response_hash','after','next_cursor','records'],array['schema','origin','environment','response_hash','records']);
 if p_envelope->>'schema' is distinct from 'wm-public-inquiry-export-1' or jsonb_typeof(p_envelope->'records') is distinct from 'array' or jsonb_array_length(p_envelope->'records')>100 then raise exception 'Invalid export page' using errcode='22023';end if;
 raw_hash:=p_envelope->>'response_hash';if raw_hash !~ '^[a-f0-9]{64}$' then raise exception 'Export response hash required' using errcode='22023';end if;
 cursor_after:=coalesce((p_envelope->>'after')::uuid,'00000000-0000-0000-0000-000000000000'::uuid);next_id:=(p_envelope->>'next_cursor')::uuid;last_id:=cursor_after;
 select * into prior from wm.intake_receipts where source_key=p_source and response_hash=raw_hash and after_id=cursor_after;
 if found then
  if prior.envelope_hash<>wm.hash_json(p_envelope) then raise exception 'Receipt identity conflict' using errcode='23505';end if;return prior.result;
 end if;
 for e in select value from jsonb_array_elements(p_envelope->'records') loop
  perform wm.check_input(e,array['source_id','identity_json','source_hash'],array['source_id','identity_json','source_hash']);
  sid:=(e->>'source_id')::uuid;identity_text:=e->>'identity_json';h:=e->>'source_hash';
  if sid<=last_id or length(identity_text)>40000 or h !~ '^[a-f0-9]{64}$' or h<>encode(sha256(convert_to(identity_text,'UTF8')),'hex') then raise exception 'Invalid source identity or hash' using errcode='22023';end if;
  last_id:=sid;identity:=identity_text::jsonb;
  if jsonb_typeof(identity) is distinct from 'array' or jsonb_array_length(identity)<>4 or identity->>0 is distinct from sid::text or jsonb_typeof(identity->1) is distinct from 'number' or (identity->>1) !~ '^[0-9]+$' or (identity->>1)::numeric>9007199254740991 or jsonb_typeof(identity->2) is distinct from 'number' or identity->>2 not in ('0','1') or jsonb_typeof(identity->3) is distinct from 'string' then raise exception 'Invalid immutable inquiry fields' using errcode='22023';end if;
  payload:=(identity->>3)::jsonb;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Inquiry payload must be an object' using errcode='22023';end if;
  select * into a from wm.intake_arrivals where source_key=p_source and source_id=sid;
  if not found then
   insert into wm.intake_arrivals(source_key,source_id,source_hash,identity_json,payload,source_created_at_ms,synthetic)
    values(p_source,sid,h,identity_text,payload,(identity->>1)::bigint,identity->>2='1') returning * into a;
   insert into wm.intake_opportunities(id) values(a.id);new_count:=new_count+1;
   insert into wm.intake_events(intake_id,action,details) values(a.id,'source.received',jsonb_build_object('source_hash',h));
  elsif a.source_hash=h then dup_count:=dup_count+1;
  else
   insert into wm.intake_conflicts(intake_id,source_hash,identity_json) values(a.id,h,identity_text) on conflict do nothing;
   if not exists(select 1 from wm.intake_conflict_decisions where intake_id=a.id and source_hash=h) then
    update wm.intake_opportunities set quarantined=true,version=version+1,updated_at=now() where id=a.id and not quarantined;
   end if;
   conflict_count:=conflict_count+1;
  end if;
 end loop;
 if next_id is not null and (jsonb_array_length(p_envelope->'records')<>100 or next_id<>last_id) then raise exception 'Invalid export continuation' using errcode='22023';end if;
 if next_id is null and jsonb_array_length(p_envelope->'records')=100 then raise exception 'Missing export continuation' using errcode='22023';end if;
 result:=jsonb_build_object('new',new_count,'duplicate',dup_count,'conflict',conflict_count,'next_cursor',next_id,'durable_local_receipt',true);
 insert into wm.intake_receipts(source_key,response_hash,after_id,next_id,envelope_hash,result) values(p_source,raw_hash,cursor_after,next_id,wm.hash_json(p_envelope),result);
 return result;
end $$;

create function public.wm_intake_command(p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o wm.intake_opportunities;a wm.intake_arrivals;l wm.intake_links;grant_row wm.intake_creation_grants;s wm.staff;
result jsonb;prior wm.intake_commands;org uuid;op uuid;imp uuid;receipt uuid;v bigint;new_stage text;summary text;services text[];contact timestamptz;
begin
 perform wm.intake_staff();perform 1 from wm.intake_lock where id for update;perform wm.intake_staff();
 if p_command not in ('intake.assign','intake.progress','intake.link','intake.create_business','intake.conflict.reject') or p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,200}$' then raise exception 'Unsupported intake command or key' using errcode='22023';end if;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version') !~ '^[0-9]+$' then raise exception 'Numeric expected version required' using errcode='22023';end if;
 select * into o from wm.intake_opportunities where id=(p_input->>'id')::uuid for update;
 if not found then raise exception 'Intake unavailable' using errcode='42501';end if;
 select * into a from wm.intake_arrivals where id=o.id;select * into l from wm.intake_links where intake_id=o.id;
 -- Receipt replay returns only the original references. It does not repeat the
 -- tenant mutation, so an approved read/reporting-only creation grant can replay.
 select * into prior from wm.intake_commands where actor_id=auth.uid() and command=p_command and action_key=p_key;
 if found then
  if prior.payload_hash<>wm.hash_json(p_input) then raise exception 'Action key used for different input' using errcode='23505';end if;
  if l.intake_id is not null then perform wm.require_access(l.organization_id,'read');end if;
  if p_command='intake.create_business' then perform wm.intake_staff('create_business');end if;
  return prior.result;
 end if;
 if l.intake_id is not null then perform wm.intake_tenant(l.organization_id);end if;
 if p_command='intake.link' then
  if l.intake_id is not null and l.organization_id is distinct from (p_input->>'organization_id')::uuid then raise exception 'Intake already linked' using errcode='40001';end if;
  perform wm.intake_tenant((p_input->>'organization_id')::uuid);
 end if;
 if p_command='intake.create_business' then perform wm.intake_staff('create_business');end if;
 perform wm.check_version(o.version,(p_input->>'expected_version')::bigint);
 if o.quarantined and p_command<>'intake.conflict.reject' then raise exception 'Source conflict needs review' using errcode='40001';end if;
 if p_command='intake.assign' then
  perform wm.check_input(p_input,array['id','expected_version','assignee_id','reason'],array['id','expected_version','assignee_id','reason']);
  if not exists(select 1 from wm.staff t join auth.users u on u.id=t.user_id where t.user_id=(p_input->>'assignee_id')::uuid and t.revoked_at is null and t.active_until>clock_timestamp() and 'intake'=any(t.capabilities) and u.email_confirmed_at is not null) then raise exception 'Current verified intake assignee required' using errcode='42501';end if;
  -- Assignment here is intake ownership only; it never grants a tenant permission.
  update wm.intake_opportunities set assigned_to=(p_input->>'assignee_id')::uuid where id=o.id;
 elsif p_command='intake.conflict.reject' then
  perform wm.check_input(p_input,array['id','expected_version','source_hash','reason'],array['id','expected_version','source_hash','reason']);
  if not exists(select 1 from wm.intake_conflicts c where c.intake_id=o.id and c.source_hash=p_input->>'source_hash') or exists(select 1 from wm.intake_conflict_decisions d where d.intake_id=o.id and d.source_hash=p_input->>'source_hash') then raise exception 'Pending conflict unavailable' using errcode='40001';end if;
  insert into wm.intake_conflict_decisions values(o.id,p_input->>'source_hash',auth.uid(),wm.require_text(p_input->>'reason','review reason',2000),now());
  update wm.intake_opportunities set quarantined=exists(select 1 from wm.intake_conflicts c where c.intake_id=o.id and not exists(select 1 from wm.intake_conflict_decisions d where d.intake_id=c.intake_id and d.source_hash=c.source_hash)) where id=o.id;
 else
  if o.assigned_to is distinct from auth.uid() then raise exception 'Current assigned intake operator required' using errcode='42501';end if;
  if p_command='intake.progress' then
   perform wm.check_input(p_input,array['id','expected_version','stage','next_action','next_contact_at','reason'],array['id','expected_version','stage','next_action','reason']);
   new_stage:=p_input->>'stage';
   if not ((o.stage='new' and new_stage in ('qualified','lost')) or (o.stage='qualified' and new_stage in ('proposed','lost')) or (o.stage='proposed' and new_stage in ('won','lost')) or (o.stage=new_stage and new_stage not in ('won','lost'))) then raise exception 'Unsupported opportunity transition' using errcode='22023';end if;
   if new_stage='won' and l.intake_id is null then raise exception 'Link a reviewed business before marking won' using errcode='22023';end if;
   if p_input->>'next_contact_at' is not null then
    if (p_input->>'next_contact_at') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Explicit contact timezone required' using errcode='22023';end if;
    contact:=(p_input->>'next_contact_at')::timestamptz;
    if not isfinite(contact) or contact<=clock_timestamp() then raise exception 'Future contact date required' using errcode='22023';end if;
   elsif new_stage not in ('won','lost') then raise exception 'Next contact required for active opportunity' using errcode='22023';end if;
   summary:=wm.require_text(p_input->>'next_action','next action',2000);
   update wm.intake_opportunities set stage=new_stage,next_action=summary,next_contact_at=contact where id=o.id;
   -- Private notes are deliberately not copied to customer-visible opportunities.
  else
   if l.intake_id is not null or o.stage not in ('qualified','proposed') then raise exception 'Qualified unlinked opportunity required' using errcode='40001';end if;
   perform wm.check_input(p_input,array['id','expected_version','organization_id','grant_id','accepted_summary','requested_services','reason'],case when p_command='intake.link' then array['id','expected_version','organization_id','accepted_summary','requested_services','reason'] else array['id','expected_version','grant_id','accepted_summary','requested_services','reason'] end);
   if (p_command='intake.link' and p_input ? 'grant_id') or (p_command='intake.create_business' and p_input ? 'organization_id') then raise exception 'Choose link or creation grant' using errcode='22023';end if;
   summary:=wm.require_text(p_input->>'accepted_summary','reviewed customer-visible summary',2000);
   if jsonb_typeof(p_input->'requested_services')<>'array' or jsonb_array_length(p_input->'requested_services') not between 1 and 10 or exists(select 1 from jsonb_array_elements(p_input->'requested_services') x where jsonb_typeof(x)<>'string') then raise exception 'Choose requested services' using errcode='22023';end if;
   select array_agg(value) into services from jsonb_array_elements_text(p_input->'requested_services');
   if not services <@ array['ads_search','ads_social','ads_professional','web_design','seo','care','catalog_project']::text[] then raise exception 'Unknown service' using errcode='22023';end if;
   if p_command='intake.create_business' then
    select * into grant_row from wm.intake_creation_grants where id=(p_input->>'grant_id')::uuid for update;
    perform wm.intake_staff('create_business');
    select * into s from wm.staff where user_id=auth.uid();
    if grant_row.id is null or grant_row.staff_id<>auth.uid() or grant_row.intake_id<>o.id or grant_row.expires_at<=clock_timestamp()
     or grant_row.operator_expires_at<=clock_timestamp() or grant_row.operator_expires_at>s.active_until or grant_row.staff_digest<>wm.hash_json(to_jsonb(s))
     or exists(select 1 from wm.intake_grant_revocations where grant_id=grant_row.id) or exists(select 1 from wm.intake_grant_uses where grant_id=grant_row.id)
     or not exists(select 1 from pg_timezone_names where name=grant_row.timezone) then raise exception 'Current exact preapproved creation grant required' using errcode='42501';end if;
    org:=gen_random_uuid();insert into wm.organizations(id,name,timezone) values(org,grant_row.business_name,grant_row.timezone);
    insert into wm.tenant_guards(organization_id,external_generation) values(org,gen_random_uuid()::text);
    perform 1 from wm.tenant_guards where organization_id=org for update;
    insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until) values(org,auth.uid(),grant_row.capabilities,grant_row.operator_expires_at);
   else org:=(p_input->>'organization_id')::uuid;end if;
   -- New source reference and reviewed summary only. No business fact, contact,
   -- membership, invitation, authority, agreement or provider operation is created.
   insert into wm.source_imports(organization_id,source_system,source_id,source_hash) values(org,'public-d1:'||a.source_key,a.source_id::text,a.source_hash) returning id into imp;
   insert into wm.opportunities(organization_id,source_import_id,stage,source,requested_services,next_action,assigned_operator)
    values(org,imp,o.stage,'Reviewed public inquiry',services,summary,auth.uid()) returning id into op;
   insert into wm.intake_links(intake_id,organization_id,opportunity_id,source_import_id,accepted_by,accepted_summary) values(o.id,org,op,imp,auth.uid(),summary);
   if p_command='intake.create_business' then insert into wm.intake_grant_uses(grant_id,intake_id,staff_id,organization_id) values(grant_row.id,o.id,auth.uid(),org);end if;
   receipt:=wm.critical(org,p_command,o.id,jsonb_build_object('intake_id',o.id,'source_hash',a.source_hash,'grant_id',grant_row.id,'operator_id',auth.uid(),'capabilities',grant_row.capabilities));
   insert into wm.audit_events(organization_id,actor_id,action,target_id) values(org,auth.uid(),p_command,op);
  end if;
 end if;
 perform wm.require_text(p_input->>'reason','reason',2000);
 update wm.intake_opportunities set version=version+1,updated_at=now() where id=o.id returning version into v;
 result:=jsonb_build_object('id',o.id,'version',v,'organization_id',coalesce(org,l.organization_id),'receipt_id',receipt);
 insert into wm.intake_events(intake_id,actor_id,action,details) values(o.id,auth.uid(),p_command,p_input);
 insert into wm.intake_commands(actor_id,command,action_key,payload_hash,result) values(auth.uid(),p_command,p_key,wm.hash_json(p_input),result);
 return result;
end $$;

create function public.wm_intake_queue(p_query text default '',p_stage text default '',p_after uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;more boolean;cursor_id uuid;
begin
 perform wm.intake_staff();
 if p_query is null or length(p_query)>100 or p_stage is null or p_stage not in ('','new','qualified','proposed','won','lost','quarantined') then raise exception 'Invalid intake filter' using errcode='22023';end if;
 with matches as (
  select o.*,a.source_key,a.source_id,a.source_hash,a.payload,a.synthetic,a.source_created_at_ms,l.organization_id
  from wm.intake_opportunities o join wm.intake_arrivals a on a.id=o.id left join wm.intake_links l on l.intake_id=o.id
  where (p_after is null or o.id>p_after) and (p_stage='' or o.stage=p_stage or (p_stage='quarantined' and o.quarantined))
  and (p_query='' or strpos(lower(a.payload::text),lower(p_query))>0 or strpos(a.source_id::text,lower(p_query))>0)
  order by o.id limit 51
 ),page as (select * from matches order by id limit 50)
 select coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('conflicts',(select coalesce(jsonb_agg(jsonb_build_object('source_hash',c.source_hash,'identity_json',c.identity_json)),'[]') from (select c.* from wm.intake_conflicts c where c.intake_id=p.id and not exists(select 1 from wm.intake_conflict_decisions d where d.intake_id=c.intake_id and d.source_hash=c.source_hash) order by c.source_hash limit 20) c))) from page p),'[]'),
  (select count(*)>50 from matches),(select id from page order by id desc limit 1) into result,more,cursor_id;
 perform wm.intake_staff();
 return jsonb_build_object('items',result,'has_more',more,'next_after',case when more then cursor_id end,
 'staff',(select coalesce(jsonb_agg(jsonb_build_object('id',s.user_id,'name',coalesce(p.display_name,'Verified staff '||left(s.user_id::text,8)))),'[]') from wm.staff s join auth.users u on u.id=s.user_id left join wm.profiles p on p.user_id=s.user_id where s.revoked_at is null and s.active_until>clock_timestamp() and 'intake'=any(s.capabilities) and u.email_confirmed_at is not null),
 'creation_grants',(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'intake_id',g.intake_id,'business_name',g.business_name,'timezone',g.timezone,'capabilities',g.capabilities,'operator_expires_at',g.operator_expires_at,'expires_at',g.expires_at)),'[]') from wm.intake_creation_grants g where g.staff_id=auth.uid() and g.expires_at>clock_timestamp() and not exists(select 1 from wm.intake_grant_revocations r where r.grant_id=g.id) and not exists(select 1 from wm.intake_grant_uses u where u.grant_id=g.id)),
 'sources',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'environment',environment)),'[]') from wm.intake_sources where enabled));
end $$;

revoke all on function wm.intake_immutable(),wm.intake_staff(text),wm.intake_tenant(uuid),public.wm_intake_access(),public.wm_intake_source(text),public.wm_intake_receive(text,jsonb),public.wm_intake_command(text,jsonb,text),public.wm_intake_queue(text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_intake_access(),public.wm_intake_command(text,jsonb,text),public.wm_intake_queue(text,text,uuid) to authenticated;
grant execute on function public.wm_intake_source(text),public.wm_intake_receive(text,jsonb) to service_role;
commit;
