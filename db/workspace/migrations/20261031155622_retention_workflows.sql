begin;
create table wm.retention_jobs(
 organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),source_id text not null,inventory jsonb not null,
 policy_version text not null,cutoff timestamptz not null,planned_by uuid not null,created_at timestamptz not null default now(),generation text not null,recovery_generation bigint not null,
 state text not null default 'planned' check(state in ('planned','authorized','intent','attempted','unknown','observed_absent','purged','attention','cancelled')),
 version bigint not null default 1,reviewer uuid,session_id uuid,grant_digest text,lease uuid,lease_until timestamptz,observer_generation text,observer_recovery_generation bigint,
 intent_id uuid not null default gen_random_uuid(),dispatch_id uuid not null default gen_random_uuid(),observation_id uuid,attempt_nonce uuid not null default gen_random_uuid(),attempted_at timestamptz,
 reason text,hold_race boolean not null default false,delete_response text,primary key(organization_id,id),unique(id));
alter table wm.retention_jobs add constraint retention_observer_pair check((observer_generation is null)=(observer_recovery_generation is null));
alter table wm.retention_jobs add constraint retention_observer_attempt check(observer_generation is null or attempted_at is not null);
create unique index retention_one_open on wm.retention_jobs(organization_id,source_id) where state not in ('purged','cancelled');
create table wm.retention_holds(organization_id uuid not null references wm.organizations(id),source_id text not null,held boolean not null,version bigint not null default 1,reason text not null,changed_by uuid not null,changed_at timestamptz not null default now(),primary key(organization_id,source_id));
create table wm.retention_events(organization_id uuid not null references wm.organizations(id),id uuid not null,job_id uuid,source_id text not null,kind text not null check(kind in ('delete_intent','dispatch','hold','release','cancel','absent')),payload jsonb not null,generation text not null,created_at timestamptz not null default now(),primary key(organization_id,id),foreign key(organization_id,job_id) references wm.retention_jobs(organization_id,id));
create table wm.retention_durability(organization_id uuid not null,event_id uuid not null,overlay_pointer jsonb not null,witness_pointer jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,event_id),foreign key(organization_id,event_id) references wm.retention_events(organization_id,id));
create table wm.retention_commands(organization_id uuid not null,key text not null,command text not null,input_hash text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,key));
create function wm.retention_actor(org uuid) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_session();perform wm.require_recent_auth();perform 1 from wm.tenant_guards where organization_id=org for update;
 if not found or not wm.operator_has(org,'recovery') or not wm.owner_direct(org,auth.uid(),'recovery') then raise exception 'Current recovery operator required' using errcode='42501';end if;perform wm.require_session();
end $$;
create function wm.retention_target(org uuid,source text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a wm.attachments;e wm.inbound_emails;x wm.customer_exports;v jsonb;parts text[]:=string_to_array(source,':');n bigint;begin
 if source !~ '^(workspace|export|inbound):[a-f0-9-]{36}(:[a-f0-9-]{36})?$' then raise exception 'Unsupported retention target';end if;
 if parts[1]='workspace' and array_length(parts,1)=2 then
 select * into a from wm.attachments where organization_id=org and id=parts[2]::uuid;
 if a.id is null or a.checksum is null or a.sealed_object_key is null or a.actual_bytes is null or a.deleted_at is not null then raise exception 'Sealed immutable file required';end if;
 if a.sealed_object_key<>org::text||'/'||a.id::text||'/'||a.checksum then raise exception 'Unqualified mutable file key';end if;
 return jsonb_build_object('source_id',source,'backend','supabase','bucket','workspace-sealed','key',a.sealed_object_key,'sha256',a.checksum,'bytes',a.actual_bytes::text,'version',a.version::text,'created_at',a.created_at);
 elsif parts[1]='inbound' and array_length(parts,1)=3 then
 select mail.* into e from wm.inbound_emails mail join wm.inbound_routes route on route.id=mail.route_id where mail.id=parts[2]::uuid and route.organization_id=org;
 if e.id is null then raise exception 'Tenant-routed inbound file required';end if;
 select value into v from jsonb_array_elements(e.attachments) where value->>'id'=parts[3];
 if v is null or v->>'state'<>'stored_unscanned' or v->>'checksum' !~ '^[a-f0-9]{64}$' or v->>'object_key'<>'inbound/'||e.id::text||'/'||parts[3]||'/'||(v->>'checksum') then raise exception 'Immutable inbound file required';end if;
 n:=(v->>'bytes')::bigint;if n not between 1 and 33554432 then raise exception 'Invalid retention byte limit';end if;
 return jsonb_build_object('source_id',source,'backend','supabase','bucket','workspace-inbound','key',v->>'object_key','sha256',v->>'checksum','bytes',n::text,'version',e.version::text,'created_at',e.first_seen_at);
 elsif parts[1]='export' and array_length(parts,1)=2 then
 select * into x from wm.customer_exports where organization_id=org and id=parts[2]::uuid;
 if x.id is null or x.state<>'sealed' or x.archive_digest is null or x.archive_bytes is null or x.object_key !~ ('^customer-exports/'||org::text||'/'||x.id::text||'/[a-f0-9]{64}\.zip$') then raise exception 'Sealed customer export required';end if;
 return jsonb_build_object('source_id',source,'backend',split_part(x.storage_target,':',1),'storage_target',x.storage_target,'bucket','workspace-customer-exports','key',x.object_key,'sha256',x.archive_digest,'bytes',x.archive_bytes::text,'version',x.version::text,'created_at',x.sealed_at);
 end if;raise exception 'Unsupported retention target';
end $$;
create function wm.retention_blocked(org uuid,source text,inventory jsonb) returns boolean language plpgsql volatile security definer set search_path='' as $$begin
 if exists(select 1 from wm.retention_holds where organization_id=org and source_id=source and held)
 or exists(select 1 from wm.retention_actions where organization_id=org and legal_hold and target_id::text=split_part(source,':',2))
 or exists(select 1 from wm.tenant_backup_jobs b cross join lateral jsonb_array_elements(b.files) f where b.state in ('captured','copying') and b.expires_at>clock_timestamp() and f->>'bucket'=inventory->>'bucket' and f->>'key'=inventory->>'key') then return true;end if;
 if exists(select 1 from wm.customer_exports where organization_id=org and state in ('captured','building','reserved') and expires_at>clock_timestamp()) then return true;end if;
 -- The entire tenant is conservatively held during an active isolated restore.
 -- Requested runs lack decoded file refs; candidate copies are never deletion targets.
 if exists(select 1 from wm_restore.runs where organization_id=org and state<>'attention' and (state='promoted_read_only' or expires_at>clock_timestamp())) then return true;end if;
 return false;
end $$;
create function wm.retention_current(j wm.retention_jobs,dispatch boolean) returns void language plpgsql volatile security definer set search_path='' as $$declare g wm.tenant_guards;h text;observation boolean:=not dispatch and j.attempted_at is not null and j.observer_generation is not null;begin
 select * into g from wm.tenant_guards where organization_id=j.organization_id for update;
 h:=wm.backup_actor_digest(j.organization_id,j.reviewer);
 if g.organization_id is null or g.external_generation<>(case when observation then j.observer_generation else j.generation end) or g.recovery_generation<>(case when observation then j.observer_recovery_generation else j.recovery_generation end) or (case when observation then g.access_state not in ('open','restricted') else g.access_state<>'open' end) or j.lease_until<=clock_timestamp() or j.lease is null or h is distinct from j.grant_digest
 or not wm.owner_direct(j.organization_id,j.reviewer,'recovery') or not exists(select 1 from auth.sessions where id=j.session_id and user_id=j.reviewer and (not_after is null or not_after>clock_timestamp())) then raise exception 'Retention authority lease or generation changed' using errcode='42501';end if;
 if dispatch and (j.observer_generation is not null or wm.retention_blocked(j.organization_id,j.source_id,j.inventory) or wm.retention_target(j.organization_id,j.source_id)<>j.inventory) then raise exception 'Retention legal/backup/restore hold or target changed';end if;
end $$;
create function public.wm_retention_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.retention_jobs;g wm.tenant_guards;h wm.retention_holds;c wm.retention_commands;target jsonb;result jsonb;event_id uuid;hold_uncertain boolean;expected bigint;begin
 perform wm.retention_actor(p_org);
 if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,200}$' or jsonb_typeof(p_input) is distinct from 'object' then raise exception 'Invalid retention input';end if;
 select * into c from wm.retention_commands where organization_id=p_org and key=p_key;
 if found then if c.command<>p_command or c.input_hash<>wm.hash_json(p_input) then raise exception 'Retention key conflict';end if;return c.result;end if;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or p_input->>'expected_version' !~ '^(0|[1-9][0-9]*)$' then raise exception 'Whole expected version required';end if;expected:=(p_input->>'expected_version')::bigint;
 select * into g from wm.tenant_guards where organization_id=p_org;
 if p_command='retention.plan' then
 perform wm.check_input(p_input,array['source_id','expected_version','policy_version','cutoff'],array['source_id','expected_version','policy_version','cutoff']);
 if g.access_state<>'open' then raise exception 'Retention unavailable during recovery';end if;
 perform wm.require_text(p_input->>'policy_version','policy version',120);target:=wm.retention_target(p_org,p_input->>'source_id');
 if (target->>'version')::bigint<>expected or (p_input->>'cutoff')::timestamptz>clock_timestamp() or (target->>'created_at')::timestamptz>(p_input->>'cutoff')::timestamptz then raise exception 'Retention version or explicit cutoff mismatch';end if;
 insert into wm.retention_jobs(organization_id,source_id,inventory,policy_version,cutoff,planned_by,generation,recovery_generation) values(p_org,p_input->>'source_id',target,p_input->>'policy_version',(p_input->>'cutoff')::timestamptz,auth.uid(),g.external_generation,g.recovery_generation) returning * into j;
 result:=jsonb_build_object('id',j.id,'version',j.version,'state',j.state,'inventory',j.inventory,'policy_version',j.policy_version,'cutoff',j.cutoff);
 elsif p_command='retention.hold' then
 perform wm.check_input(p_input,array['source_id','expected_version','held','reason'],array['source_id','expected_version','held','reason']);
 if jsonb_typeof(p_input->'held') is distinct from 'boolean' then raise exception 'Explicit hold choice required';end if;perform wm.require_text(p_input->>'reason','hold reason',500);
 begin target:=wm.retention_target(p_org,p_input->>'source_id');exception when others then select inventory into target from wm.retention_jobs where organization_id=p_org and source_id=p_input->>'source_id' order by created_at desc limit 1;if target is null then raise;end if;end;
 select * into h from wm.retention_holds where organization_id=p_org and source_id=p_input->>'source_id' for update;
 if expected<>coalesce(h.version,0) then raise exception 'Hold version changed';end if;
 insert into wm.retention_holds(organization_id,source_id,held,reason,changed_by) values(p_org,p_input->>'source_id',(p_input->>'held')::boolean,p_input->>'reason',auth.uid())
 on conflict(organization_id,source_id) do update set held=excluded.held,reason=excluded.reason,changed_by=excluded.changed_by,changed_at=clock_timestamp(),version=wm.retention_holds.version+1 returning * into h;
 update wm.retention_actions set legal_hold=h.held where organization_id=p_org and tombstone->>'source_id'=h.source_id;
 select exists(select 1 from wm.retention_jobs where organization_id=p_org and source_id=h.source_id and attempted_at is not null and state<>'purged') into hold_uncertain;
 update wm.retention_jobs set hold_race=true where organization_id=p_org and source_id=h.source_id and attempted_at is not null and state<>'purged';
 event_id:=gen_random_uuid();insert into wm.retention_events(organization_id,id,source_id,kind,payload,generation) values(p_org,event_id,h.source_id,case when h.held then 'hold' else 'release' end,jsonb_build_object('version',h.version,'held',h.held,'reason',h.reason,'actor',auth.uid(),'uncertain_inflight',hold_uncertain),g.external_generation);
 result:=jsonb_build_object('event_id',event_id,'source_id',h.source_id,'held',h.held,'version',h.version,'uncertain_inflight',hold_uncertain,'already_absent',exists(select 1 from wm.retention_jobs where organization_id=p_org and source_id=h.source_id and state='purged'),'durability','pending');
 elsif p_command in ('retention.execute','retention.reconcile','retention.cancel') then
 perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);
 select * into j from wm.retention_jobs where organization_id=p_org and id=(p_input->>'id')::uuid for update;
 if not found or j.version<>expected then raise exception 'Retention plan changed';end if;
 if p_command='retention.cancel' then
 if j.state='purged' then raise exception 'Observed absence cannot be cancelled';end if;
 event_id:=gen_random_uuid();
 update wm.retention_jobs set state=case when attempted_at is null then 'cancelled' else 'unknown' end,hold_race=hold_race or attempted_at is not null,reason=case when attempted_at is null then 'Cancelled before attempt' else 'Cancellation after attempt: remote outcome unknown' end,version=version+1 where id=j.id returning * into j;
 insert into wm.retention_events values(p_org,event_id,j.id,j.source_id,'cancel',jsonb_build_object('never_attempted',j.attempted_at is null,'actor',auth.uid()),g.external_generation,clock_timestamp());
 result:=jsonb_build_object('id',j.id,'state',j.state,'version',j.version,'event_id',event_id,'uncertain_inflight',j.attempted_at is not null);
 else
 if p_command='retention.execute' and (g.access_state<>'open' or j.generation<>g.external_generation or j.recovery_generation<>g.recovery_generation or j.state<>'planned' or j.attempted_at is not null) or p_command='retention.reconcile' and (g.access_state not in ('open','restricted') or j.attempted_at is null) then raise exception 'Retention action unavailable; never redispatch unknown delete';end if;
 if p_command='retention.execute' and (wm.retention_blocked(p_org,j.source_id,j.inventory) or wm.retention_target(p_org,j.source_id)<>j.inventory) then raise exception 'Retention legal/backup/restore hold or target changed';end if;
 update wm.retention_jobs set state=case when p_command='retention.execute' then 'authorized' else state end,reviewer=auth.uid(),session_id=(wm.claims()->>'session_id')::uuid,
 grant_digest=wm.backup_actor_digest(p_org,auth.uid()),lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',observer_generation=case when p_command='retention.reconcile' then g.external_generation end,observer_recovery_generation=case when p_command='retention.reconcile' then g.recovery_generation end,version=version+1 where id=j.id returning * into j;
 result:=jsonb_build_object('id',j.id,'state',j.state,'version',j.version,'lease',j.lease,'generation',coalesce(j.observer_generation,j.generation));
 end if;
 else raise exception 'Unsupported retention command';end if;
 insert into wm.retention_commands values(p_org,p_key,p_command,wm.hash_json(p_input),result,clock_timestamp());return result;
end $$;
create function public.wm_retention_context(p_org uuid,p_id uuid,p_lease uuid,p_dispatch boolean default false) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into j from wm.retention_jobs where organization_id=p_org and id=p_id for update;if not found or j.lease is distinct from p_lease then raise exception 'Retention lease unavailable';end if;perform wm.retention_current(j,p_dispatch);
 if p_dispatch and j.state not in ('authorized','intent') then raise exception 'Delete cannot be dispatched again';end if;return to_jsonb(j)||jsonb_build_object('generation',coalesce(j.observer_generation,j.generation));
end $$;
create function public.wm_retention_intent(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;ev wm.retention_events;begin
 perform public.wm_retention_context(p_org,p_id,p_lease,true);select * into j from wm.retention_jobs where id=p_id;
 insert into wm.retention_events(organization_id,id,job_id,source_id,kind,payload,generation) values(p_org,j.intent_id,j.id,j.source_id,'delete_intent',jsonb_build_object('inventory',j.inventory,'policy_version',j.policy_version,'cutoff',j.cutoff,'attempt_nonce',j.attempt_nonce,'actor',j.reviewer),j.generation) on conflict do nothing;
 select * into ev from wm.retention_events where organization_id=p_org and id=j.intent_id;
 update wm.retention_jobs set state='intent' where id=j.id;return to_jsonb(ev);
end $$;
create function public.wm_retention_event(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin perform wm.require_machine();return (select to_jsonb(e) from wm.retention_events e where organization_id=p_org and id=p_id);end $$;
create function public.wm_retention_durable(p_org uuid,p_id uuid,p_overlay jsonb,p_witness jsonb) returns void language plpgsql volatile security definer set search_path='' as $$declare ev wm.retention_events;old wm.retention_durability;begin
 perform wm.require_machine();select * into ev from wm.retention_events where organization_id=p_org and id=p_id;if not found or p_overlay#>>'{context,id}' is distinct from p_id::text or p_overlay#>>'{context,organization_id}' is distinct from p_org::text or p_witness#>>'{context,event_id}' is distinct from p_id::text then raise exception 'Independent retention receipt binding';end if;
 select * into old from wm.retention_durability where organization_id=p_org and event_id=p_id;
 if found then if old.overlay_pointer<>p_overlay or old.witness_pointer<>p_witness then raise exception 'Independent retention receipt conflict';end if;return;end if;
 insert into wm.retention_durability values(p_org,p_id,p_overlay,p_witness,clock_timestamp());
end $$;
create function public.wm_retention_begin(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;begin
 perform public.wm_retention_context(p_org,p_id,p_lease,true);select * into j from wm.retention_jobs where id=p_id;
 if j.attempted_at is not null or j.state<>'intent' or not exists(select 1 from wm.retention_durability where organization_id=p_org and event_id=j.intent_id) then raise exception 'Independent intent and witness required before DELETE';end if;
 update wm.retention_jobs set attempted_at=clock_timestamp(),state='attempted',version=version+1 where id=j.id returning * into j;
 insert into wm.retention_events(organization_id,id,job_id,source_id,kind,payload,generation) values(p_org,j.dispatch_id,j.id,j.source_id,'dispatch',jsonb_build_object('inventory',j.inventory,'attempt_nonce',j.attempt_nonce,'registered_at',j.attempted_at),j.generation);
 return to_jsonb(j);
end $$;
create function public.wm_retention_observe(p_org uuid,p_id uuid,p_lease uuid,p_absent boolean,p_reads integer,p_response text) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;ev wm.retention_events;begin
 perform public.wm_retention_context(p_org,p_id,p_lease,false);select * into j from wm.retention_jobs where id=p_id;
 if j.attempted_at is null or p_absent is null or p_reads not between 1 and 2 or p_response not in ('acknowledged','unknown','denied','read_only') then raise exception 'Invalid retention observation';end if;
 if not p_absent then update wm.retention_jobs set state=case when p_response='denied' then 'attention' else 'unknown' end,reason=case when p_response='denied' then 'Provider denied or locked deletion; operator attention required' else 'Bytes present or absence unconfirmed; no automatic DELETE retry' end,delete_response=p_response where id=j.id;return jsonb_build_object('id',j.id,'state',case when p_response='denied' then 'attention' else 'unknown' end);end if;
 if p_reads<>2 then raise exception 'Two exact absence observations required';end if;
 if j.observation_id is null then
 j.observation_id:=gen_random_uuid();
 insert into wm.retention_events(organization_id,id,job_id,source_id,kind,payload,generation) values(p_org,j.observation_id,j.id,j.source_id,'absent',jsonb_build_object('inventory',j.inventory,'attempt_nonce',j.attempt_nonce,'response',p_response,'absence_reads',p_reads,'attribution','absence observed, not proof of attributable deletion or all copies gone'),coalesce(j.observer_generation,j.generation));
 update wm.retention_jobs set observation_id=j.observation_id,state='observed_absent',delete_response=p_response where id=j.id;
 end if;select * into ev from wm.retention_events where organization_id=p_org and id=j.observation_id;return to_jsonb(ev);
end $$;
create function public.wm_retention_finish(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;held boolean;begin
 perform public.wm_retention_context(p_org,p_id,p_lease,false);select * into j from wm.retention_jobs where id=p_id;
 if j.observation_id is null or not exists(select 1 from wm.retention_durability where organization_id=p_org and event_id=j.observation_id) then raise exception 'Durable absence overlay required';end if;
 held:=j.hold_race or wm.retention_blocked(p_org,j.source_id,j.inventory);
 update wm.retention_jobs set state='purged',hold_race=held,reason=case when held then 'Absence observed after in-flight hold/cancellation; preservation could not be guaranteed' else 'Exact object absence verified; attribution and other copies unproven' end where id=j.id;
 insert into wm.retention_actions(organization_id,id,target_type,target_id,policy_version,expires_at,state,tombstone,legal_hold)
 values(p_org,j.id,case when split_part(j.source_id,':',1)='workspace' then 'file' else split_part(j.source_id,':',1) end,split_part(j.source_id,':',2)::uuid,j.policy_version,j.cutoff,'purged',jsonb_build_object('source_id',j.source_id,'inventory',j.inventory,'event_id',j.observation_id,'only_exact_object',true),held)
 on conflict(organization_id,id) do nothing;
 -- Keep financial/approval/history rows. Only canonical workspace availability is marked.
 if split_part(j.source_id,':',1)='workspace' then update wm.attachments set deleted_at=coalesce(deleted_at,clock_timestamp()),version=version+1 where organization_id=p_org and id=split_part(j.source_id,':',2)::uuid and deleted_at is null and sealed_object_key=j.inventory->>'key' and checksum=j.inventory->>'sha256';end if;
 if split_part(j.source_id,':',1)='inbound' then
 update wm.inbound_emails set attachments=(select jsonb_agg(case when v->>'id'=split_part(j.source_id,':',3) and v->>'object_key'=j.inventory->>'key' and v->>'checksum'=j.inventory->>'sha256' then v||'{"state":"purged"}'::jsonb else v end order by ord) from jsonb_array_elements(attachments) with ordinality a(v,ord)),version=version+1 where id=split_part(j.source_id,':',2)::uuid;
 end if;
 if split_part(j.source_id,':',1)='export' then update wm.customer_exports set state='cancelled',reason='retention_exact_object_absence_verified',version=version+1 where organization_id=p_org and id=split_part(j.source_id,':',2)::uuid and object_key=j.inventory->>'key' and archive_digest=j.inventory->>'sha256';end if;
 return jsonb_build_object('id',j.id,'state','purged','hold_race',held,'scope','exact object only');
end $$;
create function public.wm_retention_status(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.retention_actor(p_org);return jsonb_build_object('items',coalesce((select jsonb_agg(x) from (select id,source_id,inventory,policy_version,cutoff,state,version,reason,hold_race,attempted_at,created_at from wm.retention_jobs where organization_id=p_org order by created_at desc limit 50)x),'[]'),
 'holds',coalesce((select jsonb_agg(to_jsonb(h)-'organization_id') from wm.retention_holds h where organization_id=p_org),'[]'));
end $$;
-- Shared upload/download/backup integration must call this under the tenant guard.
create function public.wm_retention_object_fenced(p_org uuid,p_bucket text,p_key text) returns boolean language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 return exists(select 1 from wm.retention_jobs where organization_id=p_org and inventory->>'bucket'=p_bucket and inventory->>'key'=p_key and (attempted_at is not null or state in ('authorized','intent')));
end $$;
create function wm.retention_immutable_job() returns trigger language plpgsql set search_path='' as $$begin
 if (new.organization_id,new.id,new.source_id,new.inventory,new.policy_version,new.cutoff,new.planned_by,new.created_at,new.generation,new.recovery_generation,new.intent_id,new.dispatch_id,new.attempt_nonce) is distinct from (old.organization_id,old.id,old.source_id,old.inventory,old.policy_version,old.cutoff,old.planned_by,old.created_at,old.generation,old.recovery_generation,old.intent_id,old.dispatch_id,old.attempt_nonce)
 or old.attempted_at is not null and new.attempted_at is distinct from old.attempted_at or old.observation_id is not null and new.observation_id is distinct from old.observation_id then raise exception 'Retention plan/attempt immutable';end if;return new;
end $$;
create trigger retention_job_immutable before update on wm.retention_jobs for each row execute function wm.retention_immutable_job();
do $$declare n text;begin
 foreach n in array array['retention_jobs','retention_holds','retention_events','retention_durability','retention_commands'] loop
 execute format('alter table wm.%I enable row level security',n);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',n);
 insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason,signature) values(n,'tenant','x.organization_id=$1','{}','Retention evidence only; never replay deletion or restore grants',wm.backup_schema_signature(n));
 end loop;
 foreach n in array array['retention_events','retention_durability','retention_commands'] loop execute format('create trigger immutable_history before update or delete on wm.%I for each row execute function wm.reject_history_edit()',n);end loop;
end $$;
revoke all on function wm.retention_actor(uuid),wm.retention_target(uuid,text),wm.retention_blocked(uuid,text,jsonb),wm.retention_current(wm.retention_jobs,boolean),wm.retention_immutable_job(),public.wm_retention_command(uuid,text,jsonb,text),public.wm_retention_context(uuid,uuid,uuid,boolean),public.wm_retention_intent(uuid,uuid,uuid),public.wm_retention_event(uuid,uuid),public.wm_retention_durable(uuid,uuid,jsonb,jsonb),public.wm_retention_begin(uuid,uuid,uuid),public.wm_retention_observe(uuid,uuid,uuid,boolean,integer,text),public.wm_retention_finish(uuid,uuid,uuid),public.wm_retention_status(uuid),public.wm_retention_object_fenced(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_retention_command(uuid,text,jsonb,text),public.wm_retention_status(uuid) to authenticated;
grant execute on function public.wm_retention_context(uuid,uuid,uuid,boolean),public.wm_retention_intent(uuid,uuid,uuid),public.wm_retention_event(uuid,uuid),public.wm_retention_durable(uuid,uuid,jsonb,jsonb),public.wm_retention_begin(uuid,uuid,uuid),public.wm_retention_observe(uuid,uuid,uuid,boolean,integer,text),public.wm_retention_finish(uuid,uuid,uuid),public.wm_retention_object_fenced(uuid,text,text) to service_role;
create function public.wm_retention_predelete(p_org uuid,p_id uuid,p_lease uuid) returns void language plpgsql volatile security definer set search_path='' as $$declare j wm.retention_jobs;begin
 perform public.wm_retention_context(p_org,p_id,p_lease,false);select * into j from wm.retention_jobs where id=p_id;
 perform wm.retention_current(j,true);
 if j.state<>'attempted' or not exists(select 1 from wm.retention_durability where organization_id=p_org and event_id=j.dispatch_id) then raise exception 'Independent dispatch witness required';end if;
end $$;
create function public.wm_retention_attention(p_org uuid,p_id uuid,p_lease uuid,p_reason text) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform public.wm_retention_context(p_org,p_id,p_lease,false);
 if p_reason not in ('missing_bytes','changed_bytes','independent_pending','unsupported_configuration','provider_unavailable') then raise exception 'Invalid retention reason';end if;
 update wm.retention_jobs set state=case when attempted_at is null then 'attention' else 'unknown' end,reason=p_reason where organization_id=p_org and id=p_id and state<>'purged';
end $$;
revoke all on function public.wm_retention_predelete(uuid,uuid,uuid),public.wm_retention_attention(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_retention_predelete(uuid,uuid,uuid),public.wm_retention_attention(uuid,uuid,uuid,text) to service_role;

commit;
