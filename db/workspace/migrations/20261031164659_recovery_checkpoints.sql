begin;
create table wm.checkpoint_setups(
 organization_id uuid primary key references wm.organizations(id),id uuid not null unique default gen_random_uuid(),version bigint not null default 1,
 enabled boolean not null,owner_id uuid not null,owner_digest text not null,source_instance text not null check(source_instance~'^[A-Za-z0-9_-]{8,100}$'),
 enrollment_id uuid not null,qualification text not null check(length(qualification) between 10 and 2000),
 authority_version bigint not null,recovery_generation bigint not null,external_generation text not null,
 created_at timestamptz not null default now(),expires_at timestamptz not null
);
create table wm.checkpoint_publications(
 organization_id uuid not null references wm.organizations(id),id text not null check(id~'^[a-f0-9]{64}$'),setup_id uuid not null,
 source_digest text not null,source_sequence text not null,proof_digest text not null,pointer jsonb not null,
 observed_at timestamptz not null,valid_until timestamptz not null,recorded_at timestamptz not null default now(),primary key(organization_id,id)
);
create trigger checkpoint_history before update or delete on wm.checkpoint_publications for each row execute function wm.reject_history_edit();
create function wm.checkpoint_owner(org uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform wm.require_access(org,'recovery');perform wm.require_recent_auth();
 if not wm.owner_direct(org,auth.uid(),'recovery') or not wm.operator_has(org,'recovery') then raise exception 'Direct current recovery owner required' using errcode='42501';end if;
end $$;
create function public.wm_checkpoint_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s wm.checkpoint_setups;g wm.tenant_guards;result jsonb;until_time timestamptz;
begin
 perform wm.checkpoint_owner(p_org);
 if p_command<>'checkpoint.setup' then raise exception 'Unsupported checkpoint command' using errcode='22023';end if;
 perform wm.check_input(p_input,array['enabled','expected_version','source_instance','enrollment_id','qualification','expires_at'],array['enabled','expected_version','source_instance','enrollment_id','qualification','expires_at']);
 if jsonb_typeof(p_input->'enabled') is distinct from 'boolean' or jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version')!~'^(0|[1-9][0-9]*)$' then raise exception 'Strict setup version and enabled flag required';end if;
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 select * into s from wm.checkpoint_setups where organization_id=p_org for update;
 if coalesce(s.version,0)<>(p_input->>'expected_version')::bigint then raise exception 'Setup changed' using errcode='40001';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 until_time:=(p_input->>'expires_at')::timestamptz;
 if until_time is null or until_time<=clock_timestamp() or until_time>clock_timestamp()+interval '24 hours' or not exists(select 1 from wm.operator_assignments where organization_id=p_org and user_id=auth.uid() and active_until>=until_time) then raise exception 'Setup expiry must be bounded by current owner grant and 24 hours';end if;
 if exists(select 1 from wm.staff where user_id=auth.uid() and active_until<until_time) then raise exception 'Setup expiry exceeds staff grant';end if;
 insert into wm.checkpoint_setups(organization_id,enabled,owner_id,owner_digest,source_instance,enrollment_id,qualification,authority_version,recovery_generation,external_generation,expires_at)
 values(p_org,(p_input->>'enabled')::boolean,auth.uid(),wm.backup_actor_digest(p_org,auth.uid()),p_input->>'source_instance',(p_input->>'enrollment_id')::uuid,p_input->>'qualification',g.authority_version,g.recovery_generation,g.external_generation,until_time)
 on conflict(organization_id) do update set version=wm.checkpoint_setups.version+1,enabled=excluded.enabled,owner_id=excluded.owner_id,owner_digest=excluded.owner_digest,source_instance=excluded.source_instance,enrollment_id=excluded.enrollment_id,qualification=excluded.qualification,authority_version=excluded.authority_version,recovery_generation=excluded.recovery_generation,external_generation=excluded.external_generation,expires_at=excluded.expires_at;
 -- Local authorization is not independent source qualification. No complete proof is minted here.
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',coalesce(s.id,(select id from wm.checkpoint_setups where organization_id=p_org)),'version',coalesce(s.version,0)+1,'state','requires_independent_frontier'),null);
end $$;
create function wm.checkpoint_current(org uuid) returns wm.checkpoint_setups language plpgsql security definer set search_path='' as $$
declare s wm.checkpoint_setups;g wm.tenant_guards;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into s from wm.checkpoint_setups where organization_id=org;
 if s.id is null or not s.enabled or s.expires_at<=clock_timestamp() or g.access_state<>'open' or s.authority_version<>g.authority_version or s.recovery_generation<>g.recovery_generation or s.external_generation<>g.external_generation or not wm.owner_direct(org,s.owner_id,'recovery') or s.owner_digest is distinct from wm.backup_actor_digest(org,s.owner_id) then raise exception 'Checkpoint setup owner or generation changed' using errcode='42501';end if;
 return s;
end $$;
-- One database statement snapshot after the tenant guard, with static relation identities.
-- The digest is evidence of these bytes only, NEVER evidence this database is the latest primary.
create function public.wm_checkpoint_source(p_org uuid) returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare s wm.checkpoint_setups;v jsonb;t text;sig jsonb;integrity jsonb;bad integer;
begin
 perform wm.require_machine();s:=wm.checkpoint_current(p_org);
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='wm' and c.relkind in ('r','p') and not exists(select 1 from wm.tenant_backup_registry r where r.name=c.relname)) then raise exception 'Checkpoint schema unclassified';end if;
 if exists(select 1 from wm.tenant_backup_registry where signature is distinct from wm.backup_schema_signature(name)) then raise exception 'Checkpoint schema changed';end if;
 select jsonb_object_agg(name,signature order by name) into sig from wm.tenant_backup_registry;
 -- Installed by the later reviewed integrity migration. Missing gate fails closed.
 perform wm_restore.integrity_current();
 select jsonb_build_object('profile',wm_restore.integrity_profile(),'signatures',jsonb_object_agg(name,signature order by name)) into integrity
 from wm_restore.integrity_registry where profile=wm_restore.integrity_profile();
 with principals as (select user_id from wm.memberships where organization_id=p_org union select user_id from wm.operator_assignments where organization_id=p_org union select user_id from wm.engagement_authorities where organization_id=p_org union select user_id from wm.portal_grants where organization_id=p_org union select recipient_id from wm.owner_covers where organization_id=p_org union select issuer_id from wm.owner_covers where organization_id=p_org),
 data as (select jsonb_build_object(
 'format','wm-checkpoint-source/1','organization_id',p_org,'setup',to_jsonb(s),'schema_signatures',sig,'schema_integrity',integrity,
 'guard',(select to_jsonb(g) from wm.tenant_guards g where organization_id=p_org),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(x) order by x.user_id),'[]') from wm.memberships x where organization_id=p_org),
 'operators',(select coalesce(jsonb_agg(to_jsonb(x) order by x.user_id),'[]') from wm.operator_assignments x where organization_id=p_org),
 'authorities',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.engagement_authorities x where organization_id=p_org),
 'staff',(select coalesce(jsonb_agg(to_jsonb(x) order by x.user_id),'[]') from wm.staff x where user_id in(select user_id from principals)),
 'users',(select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'exists',u.id is not null,'verified',u.email_confirmed_at is not null) order by p.user_id),'[]') from principals p left join auth.users u on u.id=p.user_id),
 'covers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.owner_covers x where organization_id=p_org),
 'cover_revocations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.cover_id),'[]') from wm.owner_cover_revocations x where organization_id=p_org),
 'portal_grants',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.portal_grants x where organization_id=p_org),
 'decisions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.decisions x where organization_id=p_org),
 'receipts',(select coalesce(jsonb_agg(to_jsonb(x) order by x.sequence),'[]') from wm.critical_receipts x where organization_id=p_org),
 'attempts',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'operation_id',x.operation_id,'nonce',x.dispatch_nonce,'state',x.state,'generation',x.external_generation,'context',x.dispatch_context) order by x.id),'[]') from wm.operation_attempts x where organization_id=p_org),
 'backup_seals',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'manifest_digest',x.manifest_digest,'snapshot_digest',x.snapshot_digest,'pointer',x.manifest_pointer) order by x.id),'[]') from wm.tenant_backup_jobs x where organization_id=p_org and state='sealed'),
 'retention_events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.retention_events x where organization_id=p_org),
 'retention_holds',(select coalesce(jsonb_agg(to_jsonb(x) order by x.source_id),'[]') from wm.retention_holds x where organization_id=p_org),
 'retention_jobs',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.retention_jobs x where organization_id=p_org),
 'legacy_retention',(select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from wm.retention_actions x where organization_id=p_org),
 'retention_receipts',(select coalesce(jsonb_object_agg(d.event_id::text,jsonb_build_object('digest',d.overlay_pointer#>>'{context,digest}','key',d.overlay_pointer->>'key','generation',e.generation,'kind',e.kind)),'{}') from wm.retention_durability d join wm.retention_events e on e.organization_id=d.organization_id and e.id=d.event_id where d.organization_id=p_org)
 ) as value) select value into v from data;
 select coalesce(sum(jsonb_array_length(value)),0) into bad from jsonb_each(v) where jsonb_typeof(value)='array';
 if bad>20000 then raise exception 'Checkpoint row limit';end if;t:=v::text;
 if octet_length(t)>1048576 then raise exception 'Checkpoint source byte limit';end if;
 return jsonb_build_object('source_text',t,'digest',encode(sha256(convert_to(t,'UTF8')),'hex'));
end $$;
create function public.wm_checkpoint_record(p_org uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare s wm.checkpoint_setups;
begin
 perform wm.require_machine();s:=wm.checkpoint_current(p_org);
 perform wm.check_input(p_input,array['id','setup_id','source_digest','source_sequence','proof_digest','pointer','observed_at','valid_until'],array['id','setup_id','source_digest','source_sequence','proof_digest','pointer','observed_at','valid_until']);
 if p_input->>'setup_id'<>s.id::text or p_input->>'source_digest'!~'^[a-f0-9]{64}$' or p_input->>'proof_digest'!~'^[a-f0-9]{64}$' or p_input->>'source_sequence'!~'^[1-9][0-9]*$' then raise exception 'Invalid checkpoint record';end if;
 insert into wm.checkpoint_publications(organization_id,id,setup_id,source_digest,source_sequence,proof_digest,pointer,observed_at,valid_until)
 values(p_org,p_input->>'id',s.id,p_input->>'source_digest',p_input->>'source_sequence',p_input->>'proof_digest',p_input->'pointer',(p_input->>'observed_at')::timestamptz,(p_input->>'valid_until')::timestamptz) on conflict do nothing;
 if not exists(select 1 from wm.checkpoint_publications where organization_id=p_org and id=p_input->>'id' and pointer=p_input->'pointer' and source_digest=p_input->>'source_digest') then raise exception 'Checkpoint record conflict';end if;
end $$;
create function public.wm_checkpoint_candidates(p_limit integer default 5,p_after uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform wm.require_machine();if p_limit is null or p_limit<1 or p_limit>10 then raise exception 'Bounded checkpoint batch required';end if;
 return (select coalesce(jsonb_agg(x),'[]') from(select organization_id from wm.checkpoint_setups where enabled and expires_at>clock_timestamp() and (p_after is null or organization_id>p_after) order by organization_id limit p_limit)x);end $$;
create function public.wm_checkpoint_status(p_org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform wm.checkpoint_owner(p_org);
 return jsonb_build_object('setup',(select jsonb_build_object('id',id,'version',version,'enabled',enabled,'expires_at',expires_at) from wm.checkpoint_setups where organization_id=p_org),
 'publications',(select coalesce(jsonb_agg(x),'[]') from(select id,observed_at,valid_until from wm.checkpoint_publications where organization_id=p_org order by recorded_at desc limit 20)x),
 'qualification','Local records do not establish independent freshness');end $$;
alter table wm.checkpoint_setups enable row level security;alter table wm.checkpoint_publications enable row level security;
revoke all on wm.checkpoint_setups,wm.checkpoint_publications from public,anon,authenticated,service_role;
revoke all on function wm.checkpoint_owner(uuid),wm.checkpoint_current(uuid),public.wm_checkpoint_command(uuid,text,jsonb,text),public.wm_checkpoint_status(uuid),public.wm_checkpoint_source(uuid),public.wm_checkpoint_record(uuid,jsonb),public.wm_checkpoint_candidates(integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_checkpoint_command(uuid,text,jsonb,text),public.wm_checkpoint_status(uuid) to authenticated;
grant execute on function public.wm_checkpoint_source(uuid),public.wm_checkpoint_record(uuid,jsonb),public.wm_checkpoint_candidates(integer,uuid) to service_role;
insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason,signature) values
 ('checkpoint_setups','tenant','x.organization_id=$1','{}','Historical setup only; never restore standing checkpoint authority',wm.backup_schema_signature('checkpoint_setups')),
 ('checkpoint_publications','tenant','x.organization_id=$1','{}','Historical publication observations, not independent latest truth',wm.backup_schema_signature('checkpoint_publications'));
commit;
