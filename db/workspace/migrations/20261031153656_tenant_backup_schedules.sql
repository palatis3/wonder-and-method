begin;
create table wm.tenant_backup_schedules(
 organization_id uuid primary key references wm.organizations(id),id uuid not null unique default gen_random_uuid(),
 authorized_by uuid not null,grant_digest text not null,recovery_generation bigint not null,external_generation text not null,
 qualification jsonb not null,key_id text not null,enabled boolean not null,
 next_at timestamptz not null default now(),last_created_at timestamptz,last_job_id uuid,reason text,
 created_at timestamptz not null default now(),version bigint not null default 1
);
alter table wm.tenant_backup_schedules enable row level security;
revoke all on wm.tenant_backup_schedules from public,anon,authenticated,service_role;
alter table wm.tenant_backup_jobs alter column session_id drop not null;
alter table wm.tenant_backup_jobs add column schedule_id uuid references wm.tenant_backup_schedules(id);
alter table wm.tenant_backup_jobs add column schedule_version bigint;
alter table wm.tenant_backup_jobs add constraint backup_actor_kind check(
 (schedule_id is null and schedule_version is null and session_id is not null)
 or (schedule_id is not null and schedule_version>0 and session_id is null));
create function wm.backup_schedule_binding_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if (new.schedule_id,new.schedule_version) is distinct from (old.schedule_id,old.schedule_version) then raise exception 'Backup schedule binding is immutable';end if;return new;
end $$;
create trigger backup_schedule_binding_immutable before update on wm.tenant_backup_jobs for each row execute function wm.backup_schedule_binding_immutable();
insert into wm.tenant_backup_registry(name,classification,reason,signature) values
 ('tenant_backup_schedules','excluded','Standing backup configuration is live control; never restore it as authority',wm.backup_schema_signature('tenant_backup_schedules'));
update wm.tenant_backup_registry set signature=wm.backup_schema_signature(name) where name='tenant_backup_jobs';

create or replace function wm.backup_current(j wm.tenant_backup_jobs) returns void language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;grant_hash text;s wm.tenant_backup_schedules;begin
 select * into g from wm.tenant_guards where organization_id=j.organization_id for update;
 grant_hash:=wm.backup_actor_digest(j.organization_id,j.requested_by);
 if g.organization_id is null or g.access_state<>'open' or g.recovery_generation<>j.recovery_generation or g.external_generation<>j.external_generation
 or j.expires_at<=clock_timestamp() or j.state='cancelled' or grant_hash is distinct from j.grant_digest or not wm.operator_for(j.organization_id,j.requested_by,'recovery') then
 raise exception 'Backup authority or generation changed' using errcode='42501';end if;
 if j.schedule_id is null then
 if not exists(select 1 from auth.sessions where id=j.session_id and user_id=j.requested_by and (not_after is null or not_after>clock_timestamp())) then raise exception 'Backup session changed' using errcode='42501';end if;
 else
 select * into s from wm.tenant_backup_schedules where organization_id=j.organization_id and id=j.schedule_id;
 if s.id is null or not s.enabled or s.version<>j.schedule_version or s.authorized_by<>j.requested_by or s.grant_digest<>j.grant_digest or s.recovery_generation<>j.recovery_generation
 or s.external_generation<>j.external_generation or s.qualification<>j.qualification or s.key_id<>j.key_id then raise exception 'Standing backup authority changed' using errcode='42501';end if;
 end if;
end $$;
alter function public.wm_backup_command(uuid,text,jsonb,text) rename to wm_backup_command_adhoc;
revoke all on function public.wm_backup_command_adhoc(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
create function public.wm_backup_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare prior jsonb;g wm.tenant_guards;s wm.tenant_backup_schedules;expected bigint;grant_hash text;begin
 if p_command<>'backup.schedule' then return public.wm_backup_command_adhoc(p_org,p_command,p_input,p_key);end if;
 perform wm.require_access(p_org,'recovery');perform wm.require_recent_auth();
 if not wm.operator_has(p_org,'recovery') then raise exception 'Recovery operator required' using errcode='42501';end if;
 perform wm.check_input(p_input,array['enabled','expected_version','qualification','key_id'],array['enabled','expected_version','qualification','key_id']);
 if jsonb_typeof(p_input->'enabled') is distinct from 'boolean' or jsonb_typeof(p_input->'expected_version') is distinct from 'number' or p_input->>'expected_version' !~ '^(0|[1-9][0-9]*)$' then raise exception 'Whole version and explicit schedule choice required' using errcode='22023';end if;
 perform wm.check_input(p_input->'qualification',array['bytes_identity','witness_identity','custody_reference','witness_hooks_version'],array['bytes_identity','witness_identity','custody_reference','witness_hooks_version']);
 if p_input->>'key_id' !~ '^[A-Za-z0-9_-]{1,60}$' then raise exception 'Key version required' using errcode='22023';end if;
 perform wm.require_text(p_input->'qualification'->>'bytes_identity','bytes identity',160);perform wm.require_text(p_input->'qualification'->>'witness_identity','witness identity',160);
 perform wm.require_text(p_input->'qualification'->>'custody_reference','custody reference',160);perform wm.require_text(p_input->'qualification'->>'witness_hooks_version','hook version',80);
 prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 grant_hash:=wm.backup_actor_digest(p_org,auth.uid());
 if grant_hash is null then raise exception 'Direct recovery assignment required' using errcode='42501';end if;
 select * into s from wm.tenant_backup_schedules where organization_id=p_org for update;expected:=(p_input->>'expected_version')::bigint;
 if expected<>coalesce(s.version,0) then raise exception 'Backup schedule changed; reload first' using errcode='40001';end if;
 insert into wm.tenant_backup_schedules(organization_id,authorized_by,grant_digest,recovery_generation,external_generation,qualification,key_id,enabled)
 values(p_org,auth.uid(),grant_hash,g.recovery_generation,g.external_generation,p_input->'qualification',p_input->>'key_id',(p_input->>'enabled')::boolean)
 on conflict(organization_id) do update set authorized_by=excluded.authorized_by,grant_digest=excluded.grant_digest,recovery_generation=excluded.recovery_generation,
 external_generation=excluded.external_generation,qualification=excluded.qualification,key_id=excluded.key_id,enabled=excluded.enabled,next_at=clock_timestamp(),reason=null,version=wm.tenant_backup_schedules.version+1 returning * into s;
 update wm.tenant_backup_jobs set state='cancelled',reason='schedule_changed',lease_until=null,version=version+1 where organization_id=p_org and schedule_id=s.id and schedule_version<>s.version and state in ('queued','captured','copying','attention');
 perform wm.critical(p_org,'backup.schedule',s.id,jsonb_build_object('enabled',s.enabled,'version',s.version,'key_id',s.key_id,'qualification',s.qualification));
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',s.id,'version',s.version,'enabled',s.enabled,'external_generation',g.external_generation),s.id);
end $$;
alter function public.wm_backup_status(uuid) rename to wm_backup_status_adhoc;
revoke all on function public.wm_backup_status_adhoc(uuid) from public,anon,authenticated,service_role;
create function public.wm_backup_status(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare result jsonb;s jsonb;begin
 result:=public.wm_backup_status_adhoc(p_org);
 select to_jsonb(x) into s from (select id,enabled,version,next_at,last_created_at,last_job_id,reason,key_id,qualification from wm.tenant_backup_schedules where organization_id=p_org) x;
 return result||jsonb_build_object('schedule',s);
end $$;
create function public.wm_backup_generate(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare candidate record;s wm.tenant_backup_schedules;g wm.tenant_guards;grant_hash text;job uuid;result jsonb:='[]';begin
 perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Invalid generation limit' using errcode='22023';end if;
 for candidate in select organization_id from (select organization_id from wm.tenant_backup_schedules where enabled and next_at<=clock_timestamp() order by next_at,organization_id limit p_limit) due order by organization_id loop
 select * into g from wm.tenant_guards where organization_id=candidate.organization_id for update;
 select * into s from wm.tenant_backup_schedules where organization_id=candidate.organization_id for update;
 if not s.enabled or s.next_at>clock_timestamp() then continue;end if;
 grant_hash:=wm.backup_actor_digest(s.organization_id,s.authorized_by);
 if g.access_state<>'open' or g.recovery_generation<>s.recovery_generation or g.external_generation<>s.external_generation or grant_hash is distinct from s.grant_digest or not wm.operator_for(s.organization_id,s.authorized_by,'recovery') then
 update wm.tenant_backup_schedules set enabled=false,reason='current_authority_or_generation_changed',version=version+1 where organization_id=s.organization_id;continue;end if;
 if exists(select 1 from wm.tenant_backup_jobs where organization_id=s.organization_id and state in ('queued','captured','copying') and expires_at>clock_timestamp()) then
 update wm.tenant_backup_schedules set next_at=clock_timestamp()+interval '1 hour',reason='previous_preparation_incomplete' where organization_id=s.organization_id;continue;end if;
 insert into wm.tenant_backup_jobs(organization_id,requested_by,session_id,grant_digest,recovery_generation,external_generation,qualification,key_id,schedule_id,schedule_version)
 values(s.organization_id,s.authorized_by,null,s.grant_digest,s.recovery_generation,s.external_generation,s.qualification,s.key_id,s.id,s.version) returning id into job;
 update wm.tenant_backup_schedules set next_at=clock_timestamp()+interval '24 hours',last_created_at=clock_timestamp(),last_job_id=job,reason=null where organization_id=s.organization_id;
 result:=result||jsonb_build_array(jsonb_build_object('organization_id',s.organization_id,'id',job));
 end loop;return result;
end $$;
revoke all on function wm.backup_schedule_binding_immutable(),wm.backup_current(wm.tenant_backup_jobs),public.wm_backup_command(uuid,text,jsonb,text),public.wm_backup_status(uuid),public.wm_backup_generate(integer) from public,anon,authenticated,service_role;
grant execute on function public.wm_backup_command(uuid,text,jsonb,text),public.wm_backup_status(uuid) to authenticated;
grant execute on function public.wm_backup_generate(integer) to service_role;
commit;
