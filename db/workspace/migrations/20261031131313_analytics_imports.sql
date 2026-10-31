begin;
create table wm.analytics_bindings(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,scope_id uuid not null,scope_version bigint not null,credential_id uuid not null,
 provider text not null check(provider in ('analytics','search_console')),account_id text not null,currency text,timezone text not null,scope_key text not null check(scope_key ~ '^[a-f0-9]{64}$'),
 stream_ids text[] not null default '{}',hostnames text[] not null default '{}',event_names text[] not null default '{}',profiles text[] not null,
 enabled boolean not null default true,auto_collect boolean not null default false,next_refresh_at timestamptz not null default now(),
 consent_evidence text not null,configured_by uuid not null,recovery_generation bigint not null,external_generation text not null,
 created_at timestamptz not null default now(),version bigint not null default 1,
 primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),foreign key(organization_id,scope_id) references wm.provider_scopes(organization_id,id),foreign key(organization_id,credential_id) references wm.integration_credentials(organization_id,id)
);
create table wm.analytics_imports(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),ordinal bigint generated always as identity,binding_id uuid not null,binding_version bigint not null,profile text not null,day date not null,
 kind text not null default 'report' check(kind in ('report','inspection')),inspection_url text,
 status text not null default 'queued' check(status in ('queued','running','staged','publish_queued','publishing','published','superseded','failed')),
 requested_by uuid not null,authority_version bigint not null,recovery_generation bigint not null,external_generation text not null,
 lease_generation bigint not null default 0,lease_until timestamptz,ticket_nonce uuid,error_code text,result jsonb,result_digest text,import_run_id uuid,
 publish_actor uuid,publish_session uuid,publish_digest text,created_at timestamptz not null default now(),finished_at timestamptz,version bigint not null default 1,
 primary key(organization_id,id),foreign key(organization_id,binding_id) references wm.analytics_bindings(organization_id,id),foreign key(organization_id,import_run_id) references wm.import_runs(organization_id,id)
);
create table wm.analytics_pages(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),import_id uuid not null,lease_generation bigint not null,sequence integer not null,request jsonb not null,
 raw_json text not null,raw_hash text not null,observed_at timestamptz not null,outcome text not null,http_status integer not null,
 primary key(organization_id,id),unique(organization_id,import_id,lease_generation,sequence),foreign key(organization_id,import_id) references wm.analytics_imports(organization_id,id)
);
create table wm.analytics_normalized_pages(
 organization_id uuid not null,import_id uuid not null,page integer not null,rows jsonb not null,normalized_hash text not null,
 primary key(organization_id,import_id,page),foreign key(organization_id,import_id) references wm.analytics_imports(organization_id,id)
);
create table wm.analytics_partitions(
 organization_id uuid not null,binding_id uuid not null,scope_key text not null,profile text not null,day date not null,current_import_id uuid not null,ordinal bigint not null,
 primary key(organization_id,scope_key,profile,day),foreign key(organization_id,binding_id) references wm.analytics_bindings(organization_id,id),foreign key(organization_id,current_import_id) references wm.analytics_imports(organization_id,id)
);
alter table wm.import_runs add column profile_id text not null default 'manual';
drop index wm.metric_period_current;
create unique index metric_period_current on wm.import_runs(organization_id,engagement_id,source,account_id,profile_id,period_start,period_end) where status='promoted';
create index analytics_work on wm.analytics_imports(status,created_at) where status in ('queued','running','publish_queued','publishing');
do $$declare t text;begin foreach t in array array['analytics_bindings','analytics_imports','analytics_pages','analytics_normalized_pages','analytics_partitions'] loop
 execute format('alter table wm.%I enable row level security',t);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',t);end loop;end $$;
create trigger immutable_analytics_page before update or delete on wm.analytics_pages for each row execute function wm.delivery_immutable();
create trigger immutable_analytics_normalized_page before update or delete on wm.analytics_normalized_pages for each row execute function wm.delivery_immutable();
create function wm.analytics_operator(org uuid,who uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from wm.operator_assignments where organization_id=org and user_id=who and revoked_at is null and active_until>clock_timestamp() and capabilities&&array['reports','admin'])
$$;
create function wm.analytics_current(org uuid,job uuid) returns wm.analytics_bindings language plpgsql volatile security definer set search_path='' as $$
declare j wm.analytics_imports;b wm.analytics_bindings;g wm.tenant_guards;c wm.integration_credentials;s wm.provider_scopes;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into j from wm.analytics_imports where organization_id=org and id=job for update;
 select * into b from wm.analytics_bindings where organization_id=org and id=j.binding_id;
 select * into c from wm.integration_credentials where organization_id=org and id=b.credential_id;
 select * into s from wm.provider_scopes where organization_id=org and id=b.scope_id;
 if j.id is null or b.id is null or not b.enabled or g.access_state<>'open' or g.authority_version<>j.authority_version or g.recovery_generation<>j.recovery_generation or g.external_generation<>j.external_generation or b.recovery_generation<>g.recovery_generation or b.external_generation<>g.external_generation or b.version<>j.binding_version
 or not wm.analytics_operator(org,j.requested_by) or not wm.analytics_operator(org,b.configured_by) or c.revoked_at is not null or c.state not in ('connected','refreshing') or c.recovery_generation<>g.recovery_generation or c.external_generation<>g.external_generation or not wm.connection_actor_current(org,c.authorized_by,c.actor_kind)
 or (c.actor_kind='operator' and not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=c.authorized_by and revoked_at is null and active_until>clock_timestamp() and capabilities&&array['ads','admin']))
 or s.id is null or s.version<>b.scope_version or s.credential_id is distinct from c.id or s.account_id<>b.account_id or s.provider<>b.provider or s.engagement_id<>b.engagement_id or s.access_status<>'read_verified'
 or not exists(select 1 from wm.engagements where organization_id=org and id=b.engagement_id and service_state not in ('ending','closed')) then raise exception 'Analytics binding or authority changed' using errcode='42501';end if;
 if j.status in ('publish_queued','publishing') and (not wm.analytics_operator(org,j.publish_actor) or not exists(select 1 from auth.sessions where id=j.publish_session and user_id=j.publish_actor and (not_after is null or not_after>clock_timestamp()))) then raise exception 'Publishing session ended' using errcode='28000';end if;
 return b;
end $$;
create function public.wm_analytics_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;b wm.analytics_bindings;j wm.analytics_imports;s wm.provider_scopes;g wm.tenant_guards;profiles text[];streams text[];hosts text[];events text[];item text;
begin
 perform wm.require_access(p_org,'reports');perform wm.require_recent_auth();result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;select * into g from wm.tenant_guards where organization_id=p_org;
 if p_command='analytics.bind' then
 perform wm.check_input(p_input,array['scope_id','stream_ids','hostnames','event_names','profiles','auto_collect','consent_evidence'],array['scope_id','profiles','auto_collect','consent_evidence']);
 select * into s from wm.provider_scopes where organization_id=p_org and id=(p_input->>'scope_id')::uuid and provider in ('analytics','search_console') and access_status='read_verified' and credential_id is not null;
 if not found then raise exception 'Verified reporting account required' using errcode='42501';end if;
 streams:=array(select jsonb_array_elements_text(coalesce(p_input->'stream_ids','[]')));hosts:=array(select jsonb_array_elements_text(coalesce(p_input->'hostnames','[]')));events:=array(select jsonb_array_elements_text(coalesce(p_input->'event_names','[]')));profiles:=array(select jsonb_array_elements_text(p_input->'profiles'));
 if cardinality(profiles) not between 1 and 9 or cardinality(streams)>20 or cardinality(hosts)>20 or cardinality(events)>20 or jsonb_typeof(p_input->'auto_collect') is distinct from 'boolean' then raise exception 'Check reporting scope' using errcode='22023';end if;
 foreach item in array profiles loop if (s.provider='analytics' and item not in ('ga_daily_v1','ga_acquisition_daily_v1','ga_landing_daily_v1','ga_events_daily_v1','ga_revenue_daily_v1')) or (s.provider='search_console' and item not in ('sc_daily_total_v1','sc_daily_pages_v1','sc_daily_queries_v1','sc_daily_device_v1')) then raise exception 'Fixed reporting profile required' using errcode='22023';end if;end loop;
 if s.provider='analytics' and (cardinality(streams)=0 or cardinality(hosts)=0 or s.currency is null or s.timezone is null) then raise exception 'Exact streams, hosts and property calendar required' using errcode='22023';end if;
 foreach item in array streams loop if item !~ '^[0-9]+$' then raise exception 'Numeric stream identity required' using errcode='22023';end if;end loop;
 foreach item in array hosts loop if item !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$' then raise exception 'Exact hostnames required' using errcode='22023';end if;end loop;
 foreach item in array events loop if item !~ '^[A-Za-z][A-Za-z0-9_]{0,39}$' then raise exception 'Exact event names required' using errcode='22023';end if;end loop;
 streams:=array(select distinct v from unnest(streams) v order by v);hosts:=array(select distinct v from unnest(hosts) v order by v);events:=array(select distinct v from unnest(events) v order by v);
 if s.provider='search_console' and cardinality(streams)+cardinality(hosts)+cardinality(events)<>0 then raise exception 'GA stream filters cannot describe a Search Console site' using errcode='22023';end if;
 if 'ga_events_daily_v1'=any(profiles) and cardinality(events)=0 then raise exception 'Approved event list required' using errcode='22023';end if;
 if exists(select 1 from wm.analytics_bindings where organization_id=p_org and scope_id=s.id and enabled) then raise exception 'Disable the earlier binding before replacing its scope' using errcode='40001';end if;
 insert into wm.analytics_bindings(organization_id,engagement_id,scope_id,scope_version,credential_id,provider,account_id,currency,timezone,scope_key,stream_ids,hostnames,event_names,profiles,auto_collect,consent_evidence,configured_by,recovery_generation,external_generation)
 values(p_org,s.engagement_id,s.id,s.version,s.credential_id,s.provider,s.account_id,s.currency,case when s.provider='search_console' then 'America/Los_Angeles' else s.timezone end,
 wm.hash_json(jsonb_build_object('provider',s.provider,'account',s.account_id,'currency',s.currency,'timezone',case when s.provider='search_console' then 'America/Los_Angeles' else s.timezone end,'streams',streams,'hosts',hosts,'events',events)),
 streams,hosts,events,profiles,(p_input->>'auto_collect')::boolean,wm.require_text(p_input->>'consent_evidence','scope and consent evidence',2000),auth.uid(),g.recovery_generation,g.external_generation) returning * into b;
 result:=jsonb_build_object('id',b.id,'version',b.version);
 elsif p_command='analytics.disable' then
 perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);select * into b from wm.analytics_bindings where organization_id=p_org and id=(p_input->>'id')::uuid for update;if not found then raise exception 'Binding unavailable' using errcode='42501';end if;perform wm.check_version(b.version,(p_input->>'expected_version')::bigint);
 update wm.analytics_bindings set enabled=false,auto_collect=false,version=version+1 where organization_id=p_org and id=b.id;result:=jsonb_build_object('id',b.id);
 elsif p_command in ('analytics.run','analytics.inspect') then
 perform wm.check_input(p_input,array['binding_id','profile','day','url'],array['binding_id','day']);select * into b from wm.analytics_bindings where organization_id=p_org and id=(p_input->>'binding_id')::uuid and enabled;
 if not found or coalesce(p_input->>'day','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (p_input->>'day')::date>current_date or (p_input->>'day')::date<current_date-interval '16 months' then raise exception 'Check binding and historical date' using errcode='22023';end if;
 if p_command='analytics.run' and not (p_input->>'profile'=any(b.profiles)) then raise exception 'Select an approved fixed profile' using errcode='22023';end if;
 if p_command='analytics.inspect' and (b.provider<>'search_console' or p_input->>'url' is null) then raise exception 'Search Console URL required' using errcode='22023';end if;
 insert into wm.analytics_imports(organization_id,binding_id,binding_version,profile,day,kind,inspection_url,requested_by,authority_version,recovery_generation,external_generation)
 values(p_org,b.id,b.version,case when p_command='analytics.inspect' then 'url_inspection_v1' else p_input->>'profile' end,(p_input->>'day')::date,case when p_command='analytics.inspect' then 'inspection' else 'report' end,p_input->>'url',auth.uid(),g.authority_version,g.recovery_generation,g.external_generation) returning * into j;
 perform wm.analytics_current(p_org,j.id);result:=jsonb_build_object('id',j.id,'state',j.status);
 elsif p_command='analytics.promote' then
 perform wm.check_input(p_input,array['id','expected_version','digest'],array['id','expected_version','digest']);select * into j from wm.analytics_imports where organization_id=p_org and id=(p_input->>'id')::uuid for update;
 if not found then raise exception 'Import unavailable' using errcode='42501';end if;perform wm.check_version(j.version,(p_input->>'expected_version')::bigint);perform wm.analytics_current(p_org,j.id);
 if j.status<>'staged' or j.result_digest is distinct from p_input->>'digest' then raise exception 'Review the exact validated import' using errcode='40001';end if;
 update wm.analytics_imports set status='publish_queued',publish_actor=auth.uid(),publish_session=(wm.claims()->>'session_id')::uuid,publish_digest=j.result_digest,version=version+1 where organization_id=p_org and id=j.id;result:=jsonb_build_object('id',j.id,'state','publish_queued');
 else raise exception 'Unsupported analytics action' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,result,coalesce(j.id,b.id));
end $$;
create function public.wm_analytics_claim() returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.analytics_imports;b wm.analytics_bindings;
begin
 perform wm.require_machine();select * into j from wm.analytics_imports where status in ('queued','publish_queued','running','publishing') and (lease_until is null or lease_until<clock_timestamp()) order by created_at,ordinal for update skip locked limit 1;
 if not found then return null;end if;
 if j.status in ('running','publishing') then update wm.analytics_imports set status='failed',error_code='interrupted_read',version=version+1 where organization_id=j.organization_id and id=j.id;return jsonb_build_object('interrupted',true);end if;
 begin b:=wm.analytics_current(j.organization_id,j.id);exception when insufficient_privilege or invalid_authorization_specification then update wm.analytics_imports set status='failed',error_code='binding_changed',version=version+1 where organization_id=j.organization_id and id=j.id;return jsonb_build_object('attention',true);end;
 update wm.analytics_imports set status=case when status='queued' then 'running' else 'publishing' end,lease_generation=lease_generation+1,lease_until=clock_timestamp()+interval '10 minutes',ticket_nonce=gen_random_uuid(),version=version+1 where organization_id=j.organization_id and id=j.id returning * into j;
 return to_jsonb(j)-'publish_session';
end $$;
create function public.wm_analytics_context(p_org uuid,p_id uuid,p_generation bigint,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.analytics_imports;b wm.analytics_bindings;c wm.integration_credentials;
begin
 perform wm.require_machine();b:=wm.analytics_current(p_org,p_id);select * into j from wm.analytics_imports where organization_id=p_org and id=p_id;
 if j.status not in ('running','publishing') or j.lease_generation<>p_generation or j.ticket_nonce is distinct from p_nonce or j.lease_until<=clock_timestamp() then raise exception 'Analytics lease changed' using errcode='40001';end if;
 select * into c from wm.integration_credentials where organization_id=p_org and id=b.credential_id;
 return jsonb_build_object('binding',to_jsonb(b),'job',to_jsonb(j),'connection',to_jsonb(c));
end $$;
create function public.wm_analytics_page(p_org uuid,p_id uuid,p_generation bigint,p_nonce uuid,p_page jsonb) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform public.wm_analytics_context(p_org,p_id,p_generation,p_nonce);
 if octet_length(p_page->>'raw')>8388608 or encode(sha256(convert_to(p_page->>'raw','UTF8')),'hex') is distinct from p_page->>'raw_hash' then raise exception 'Raw page hash required' using errcode='22023';end if;
 insert into wm.analytics_pages(organization_id,import_id,lease_generation,sequence,request,raw_json,raw_hash,observed_at,outcome,http_status)
 values(p_org,p_id,p_generation,(p_page->>'sequence')::integer,jsonb_build_object('url',p_page->>'url','body',p_page->'request'),p_page->>'raw',p_page->>'raw_hash',(p_page->>'observed_at')::timestamptz,p_page->>'outcome',(p_page->>'http_status')::integer);
end $$;
create function public.wm_analytics_normalized(p_org uuid,p_id uuid,p_generation bigint,p_nonce uuid,p_page integer,p_json text,p_hash text) returns void language plpgsql volatile security definer set search_path='' as $$
declare duplicate boolean;
begin
 perform public.wm_analytics_context(p_org,p_id,p_generation,p_nonce);
 if octet_length(p_json)>16777216 or jsonb_typeof(p_json::jsonb)<>'array' or encode(sha256(convert_to(p_json,'UTF8')),'hex') is distinct from p_hash then raise exception 'Normalized page hash required' using errcode='22023';end if;
 select exists(select 1 from (select x->'dimensions' k,count(*) n from (select jsonb_array_elements(rows) x from wm.analytics_normalized_pages where organization_id=p_org and import_id=p_id union all select jsonb_array_elements(p_json::jsonb)) a group by x->'dimensions' having count(*)>1) d) into duplicate;
 if duplicate then raise exception 'Duplicate normalized row key' using errcode='22023';end if;
 insert into wm.analytics_normalized_pages(organization_id,import_id,page,rows,normalized_hash) values(p_org,p_id,p_page,p_json::jsonb,p_hash);
end $$;
create function public.wm_analytics_refresh(p_org uuid,p_id uuid,p_generation bigint,p_nonce uuid,p_input jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare b wm.analytics_bindings;c wm.integration_credentials;n uuid;
begin
 perform public.wm_analytics_context(p_org,p_id,p_generation,p_nonce);b:=wm.analytics_current(p_org,p_id);select * into c from wm.integration_credentials where organization_id=p_org and id=b.credential_id for update;
 if p_input->>'action'='begin' then
 if c.state<>'connected' or c.version<>(p_input->>'expected_version')::bigint then raise exception 'Credential refresh changed' using errcode='40001';end if;n:=gen_random_uuid();update wm.integration_credentials set state='refreshing',refresh_nonce=n,refresh_ticket=null,refresh_started_at=clock_timestamp(),version=version+1 where organization_id=p_org and id=c.id;return jsonb_build_object('nonce',n);
 end if;
 if c.state<>'refreshing' or c.refresh_nonce is distinct from (p_input->>'refresh_nonce')::uuid then raise exception 'Refresh lease changed' using errcode='40001';end if;
 if p_input->>'action'='failed' then update wm.integration_credentials set state='reauth_required',version=version+1 where organization_id=p_org and id=c.id;
 elsif p_input->>'action'='complete' then update wm.integration_credentials set ciphertext=p_input->>'ciphertext',key_version=p_input->>'key_version',expires_at=(p_input->>'expires_at')::timestamptz,state='connected',refresh_nonce=null,refresh_started_at=null,version=version+1 where organization_id=p_org and id=c.id;
 else raise exception 'Unknown refresh action' using errcode='22023';end if;return '{}';
end $$;
create function public.wm_analytics_finish(p_org uuid,p_id uuid,p_generation bigint,p_nonce uuid,p_result jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.analytics_imports;b wm.analytics_bindings;g wm.analytics_partitions;old_import uuid;imp uuid;total bigint;item jsonb;rows_count bigint;
begin
 perform public.wm_analytics_context(p_org,p_id,p_generation,p_nonce);b:=wm.analytics_current(p_org,p_id);select * into j from wm.analytics_imports where organization_id=p_org and id=p_id;
 if p_result->>'error' is not null then
 update wm.analytics_imports set status='failed',error_code=left(p_result->>'error',100),lease_until=null,version=version+1 where organization_id=p_org and id=p_id;
 if p_result->>'error' in ('analytics_quota_deferred','analytics_provider_error','provider_unavailable') then update wm.analytics_bindings set next_refresh_at=least(next_refresh_at,clock_timestamp()+interval '15 minutes'+random()*interval '5 minutes') where organization_id=p_org and id=b.id and auto_collect;end if;
 return jsonb_build_object('state','failed');end if;
 if j.status='running' then
 if coalesce(p_result->>'digest','') !~ '^[a-f0-9]{64}$' or p_result->>'scope_key' is distinct from b.scope_key or (j.kind='report' and (p_result->>'profile' is distinct from j.profile or p_result->>'account_id' is distinct from b.account_id or p_result->>'start' is distinct from j.day::text)) then raise exception 'Exact typed import required' using errcode='22023';end if;
 if j.kind='report' then
 select coalesce(sum(jsonb_array_length(rows)),0) into rows_count from wm.analytics_normalized_pages where organization_id=p_org and import_id=j.id;
 if rows_count<>(p_result->>'row_count')::bigint or exists(select 1 from jsonb_array_elements(p_result->'page_manifest') m where not exists(select 1 from wm.analytics_normalized_pages n where n.organization_id=p_org and n.import_id=j.id and n.page=(m->>'page')::integer and n.normalized_hash=m->>'normalized_hash' and jsonb_array_length(n.rows)=(m->>'rows')::integer)) then raise exception 'Incomplete normalized import' using errcode='22023';end if;end if;
 update wm.analytics_imports set result=p_result,result_digest=p_result->>'digest',status='staged',finished_at=clock_timestamp(),lease_until=null,version=version+1 where organization_id=p_org and id=p_id;return jsonb_build_object('id',j.id,'state','staged');
 end if;
 if j.status<>'publishing' or p_result->>'configuration_hash' is distinct from j.result->>'configuration_hash' then raise exception 'Live configuration or publication changed' using errcode='40001';end if;
 select * into g from wm.analytics_partitions where organization_id=p_org and scope_key=b.scope_key and profile=j.profile and day=j.day for update;
 if found and g.ordinal>=j.ordinal then raise exception 'A newer import is already current' using errcode='40001';end if;
 select import_run_id into old_import from wm.analytics_imports where organization_id=p_org and id=g.current_import_id;
 update wm.import_runs set status='superseded',version=version+1 where organization_id=p_org and id=old_import;
 if j.kind='report' then
 total:=jsonb_array_length(coalesce(j.result->'summary_rows','[]'));
 insert into wm.import_runs(organization_id,engagement_id,source,source_hash,account_id,currency,timezone,period_start,period_end,schema_version,total_count,accepted_count,rejected_count,status,created_by,staged_rows,supersedes_id,profile_id)
 values(p_org,b.engagement_id,b.provider,j.result_digest,b.account_id,coalesce(b.currency,'N/A'),b.timezone,(j.day::timestamp at time zone b.timezone),((j.day+1)::timestamp at time zone b.timezone),1,total,total,0,'promoted',j.publish_actor,coalesce(j.result->'summary_rows','[]'),old_import,j.profile||':'||b.scope_key) returning id into imp;
 for item in select value from jsonb_array_elements(coalesce(j.result->'summary_rows','[]')) loop
 insert into wm.metric_snapshots(organization_id,engagement_id,import_run_id,definition_version,metric,value,unit,source,observed_at,provisional)
 values(p_org,b.engagement_id,imp,j.profile||':'||left(b.scope_key,32)||':'||left(j.result->>'configuration_hash',32),item->>'metric',(item->>'value')::numeric,item->>'unit',b.provider,(j.result->>'observed_at')::timestamptz,(j.result->>'freshness')<>'provider_final');end loop;
 end if;
 update wm.analytics_imports set status='superseded',version=version+1 where organization_id=p_org and id=g.current_import_id;
 insert into wm.analytics_partitions(organization_id,binding_id,scope_key,profile,day,current_import_id,ordinal) values(p_org,b.id,b.scope_key,j.profile,j.day,j.id,j.ordinal) on conflict(organization_id,scope_key,profile,day) do update set binding_id=excluded.binding_id,current_import_id=excluded.current_import_id,ordinal=excluded.ordinal;
 update wm.analytics_imports set status='published',import_run_id=imp,finished_at=clock_timestamp(),lease_until=null,version=version+1 where organization_id=p_org and id=j.id;
 perform wm.critical(p_org,'analytics.published',j.id,jsonb_build_object('import',j.id,'digest',j.result_digest,'replaces',g.current_import_id));return jsonb_build_object('id',j.id,'state','published');
end $$;
create function public.wm_analytics_schedule(p_limit integer default 3) returns integer language plpgsql volatile security definer set search_path='' as $$
declare b wm.analytics_bindings;g wm.tenant_guards;selected_profile text;selected_day date;n integer:=0;
begin
 perform wm.require_machine();for b in select * from wm.analytics_bindings where enabled and auto_collect and next_refresh_at<=clock_timestamp() order by next_refresh_at for update skip locked limit least(greatest(p_limit,1),10) loop
 select * into g from wm.tenant_guards where organization_id=b.organization_id;
 if g.access_state='open' and g.recovery_generation=b.recovery_generation and g.external_generation=b.external_generation and wm.analytics_operator(b.organization_id,b.configured_by) then
 foreach selected_profile in array b.profiles loop for selected_day in select ((clock_timestamp() at time zone b.timezone)::date-i) from generate_series(1,14) i loop
 if not exists(select 1 from wm.analytics_imports i where i.organization_id=b.organization_id and i.binding_id=b.id and i.profile=selected_profile and i.day=selected_day and i.created_at>clock_timestamp()-interval '20 hours' and i.status<>'failed') then
 insert into wm.analytics_imports(organization_id,binding_id,binding_version,profile,day,requested_by,authority_version,recovery_generation,external_generation) values(b.organization_id,b.id,b.version,selected_profile,selected_day,b.configured_by,g.authority_version,g.recovery_generation,g.external_generation);n:=n+1;end if;end loop;end loop;end if;
 update wm.analytics_bindings set next_refresh_at=clock_timestamp()+interval '24 hours' where organization_id=b.organization_id and id=b.id;
 end loop;return n;
end $$;
create function public.wm_analytics_list(p_org uuid,p_before bigint default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(p_org,'read');return jsonb_build_object('can_manage',wm.operator_has(p_org,'reports'),
 'scopes',case when wm.operator_has(p_org,'reports') then coalesce((select jsonb_agg(jsonb_build_object('id',id,'provider',provider,'account_id',account_id,'currency',currency,'timezone',timezone)) from wm.provider_scopes where organization_id=p_org and provider in ('analytics','search_console') and access_status='read_verified'),'[]') else '[]'::jsonb end,
 'bindings',coalesce((select jsonb_agg(to_jsonb(b)-'credential_id'-'external_generation'-'recovery_generation') from wm.analytics_bindings b where organization_id=p_org),'[]'),
 'next_cursor',(select case when count(*)=20 then min(ordinal)::text else null end from (select ordinal from wm.analytics_imports where organization_id=p_org and (p_before is null or ordinal<p_before) and (wm.operator_has(p_org,'reports') or status='published') order by ordinal desc limit 20) cursor_page),
 'imports',coalesce((select jsonb_agg(x) from (select id,binding_id,profile,day,kind,status,error_code,
 jsonb_build_object('scope_key',result->'scope_key','scope_definition',result->'scope_definition','configuration_hash',result->'configuration_hash','summary_rows',result->'summary_rows','quality',result->'quality','collection',result->'collection','freshness',result->'freshness','value_state',result->'value_state','row_count',result->'row_count','observed_at',result->'observed_at','currency',result->'currency',
 'preview_rows',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(coalesce(result->'preview_rows','[]')) with ordinality a(v,n) where n<=10),
 'result',case when kind='inspection' then jsonb_build_object('indexStatusResult',(result->'result'->'indexStatusResult')-'referringUrls'-'sitemap') else null end) as result,
 result_digest,created_at,finished_at,version from wm.analytics_imports where organization_id=p_org and (p_before is null or ordinal<p_before) and (wm.operator_has(p_org,'reports') or status='published') order by ordinal desc limit 20) x),'[]'));
end $$;
create function public.wm_analytics_manifest(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.analytics_imports;
begin
 perform wm.require_access(p_org,'read');select * into j from wm.analytics_imports where organization_id=p_org and id=p_id;
 if not found or (j.status not in ('published','superseded') and not wm.operator_has(p_org,'reports')) then raise exception 'Observation unavailable' using errcode='42501';end if;
 return jsonb_build_object('id',j.id,'state',j.status,'digest',j.result_digest,'manifest',j.result);
end $$;
-- Automatic imports use a distinct typed publication path. A CSV correction may
-- not silently replace one of these profile partitions.
alter function public.wm_reporting_command(uuid,text,jsonb,text) rename to wm_reporting_command_before_analytics;
revoke all on function public.wm_reporting_command_before_analytics(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
create function public.wm_reporting_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(p_org,'reports');
 if p_command='reporting.promote' and exists(select 1 from wm.import_runs where organization_id=p_org and id=(p_input->>'id')::uuid and profile_id<>'manual') then raise exception 'Use the current analytics publication review' using errcode='42501';end if;
 if p_command='reporting.stage' and exists(select 1 from wm.import_runs where organization_id=p_org and source=p_input->>'source' and account_id=p_input->>'account_reference' and profile_id<>'manual' and status='promoted' and period_start<(p_input->>'period_end')::timestamptz and period_end>(p_input->>'period_start')::timestamptz) then raise exception 'Re-read the bound analytics profile to correct this source' using errcode='40001';end if;
 return public.wm_reporting_command_before_analytics(p_org,p_command,p_input,p_key);
end $$;
revoke all on function public.wm_analytics_manifest(uuid,uuid),wm.analytics_operator(uuid,uuid),wm.analytics_current(uuid,uuid),public.wm_analytics_command(uuid,text,jsonb,text),public.wm_analytics_claim(),public.wm_analytics_context(uuid,uuid,bigint,uuid),public.wm_analytics_page(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_normalized(uuid,uuid,bigint,uuid,integer,text,text),public.wm_analytics_refresh(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_finish(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_schedule(integer),public.wm_analytics_list(uuid,bigint),public.wm_reporting_command(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_analytics_manifest(uuid,uuid),public.wm_analytics_command(uuid,text,jsonb,text),public.wm_analytics_list(uuid,bigint),public.wm_reporting_command(uuid,text,jsonb,text) to authenticated;
grant execute on function public.wm_analytics_claim(),public.wm_analytics_context(uuid,uuid,bigint,uuid),public.wm_analytics_page(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_normalized(uuid,uuid,bigint,uuid,integer,text,text),public.wm_analytics_refresh(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_finish(uuid,uuid,bigint,uuid,jsonb),public.wm_analytics_schedule(integer) to service_role;
commit;
