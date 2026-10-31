begin;
create table wm.tenant_backup_jobs(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),requested_by uuid not null,session_id uuid not null,grant_digest text not null,
 recovery_generation bigint not null,external_generation text not null,qualification jsonb not null,key_id text not null,
 state text not null default 'queued' check(state in ('queued','captured','copying','sealed','attention','cancelled')),
 requested_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 day',captured_at timestamptz,
 snapshot_text text,snapshot_digest text,files jsonb,coverage jsonb,tail jsonb,
 lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),attempts integer not null default 0,reason text,version bigint not null default 1,
 manifest jsonb,manifest_digest text,manifest_pointer jsonb,witness_pointer jsonb,sealed_at timestamptz,
 primary key(organization_id,id),unique(id),foreign key(organization_id) references wm.organizations(id)
);
create table wm.tenant_backup_parts(
 organization_id uuid not null,backup_id uuid not null,part_key text not null,pointer jsonb not null,created_at timestamptz not null default now(),
 primary key(organization_id,backup_id,part_key),foreign key(organization_id,backup_id) references wm.tenant_backup_jobs(organization_id,id)
);
create table wm.tenant_backup_registry(name text primary key,classification text not null,predicate_sql text,redacted text[] not null default '{}',reason text not null,signature text);
create index tenant_backup_due on wm.tenant_backup_jobs(next_attempt_at) where state in ('queued','captured','copying');
create trigger backup_part_immutable before update or delete on wm.tenant_backup_parts for each row execute function wm.reject_history_edit();
create function wm.backup_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if (new.organization_id,new.id,new.requested_by,new.session_id,new.grant_digest,new.recovery_generation,new.external_generation,new.qualification,new.key_id,new.requested_at,new.expires_at) is distinct from (old.organization_id,old.id,old.requested_by,old.session_id,old.grant_digest,old.recovery_generation,old.external_generation,old.qualification,old.key_id,old.requested_at,old.expires_at)
 or (old.snapshot_text is not null and (new.snapshot_text,new.snapshot_digest,new.files,new.coverage,new.tail,new.captured_at) is distinct from (old.snapshot_text,old.snapshot_digest,old.files,old.coverage,old.tail,old.captured_at))
 or (old.manifest is not null and (new.manifest,new.manifest_digest) is distinct from (old.manifest,old.manifest_digest)) then raise exception 'Backup capture and manifests are immutable';end if;return new;end $$;
create trigger backup_immutable before update on wm.tenant_backup_jobs for each row execute function wm.backup_immutable();
create function wm.backup_schema_signature(p_name text) returns text language sql stable security definer set search_path='' as $$
 select wm.hash_json(coalesce(jsonb_agg(jsonb_build_array(a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod),a.attnotnull) order by a.attnum),'[]')) from pg_catalog.pg_attribute a where a.attrelid=to_regclass('wm.'||quote_ident(p_name)) and a.attnum>0 and not a.attisdropped
$$;
insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason) values
('absence_windows','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('access_requirements','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('agreements','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('ai_attempts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('ai_runs','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('allowance_entries','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('analytics_bindings','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('analytics_imports','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('analytics_normalized_pages','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('analytics_pages','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('analytics_partitions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('asset_rights','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('attachments','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('attempt_observations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('audit_events','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('backup_manifests','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('billing_accounts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('billing_obligations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('billing_schedules','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('budget_authorizations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('budget_reservations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('business_facts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('campaign_bindings','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('capacity_periods','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('care_checks','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('catalog_active','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('catalog_registry','related','true',array[]::text[],'Tenant or explicitly related recovery evidence'),
('catalog_snapshots','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('charge_bindings','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('closure_statements','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('closures','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('command_receipts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('commitments','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('connection_mappings','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('connection_tickets','excluded',null,array[]::text[],'Ephemeral one-use access tickets; never restore authority'),
('critical_receipts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('customer_export_receipts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('customer_exports','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('decisions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('delivery_observations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('delivery_runs','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('delivery_templates','related','true',array[]::text[],'Tenant or explicitly related recovery evidence'),
('dependencies','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('engagement_authorities','tenant','x.organization_id=$1',array[]::text[],'Historical evidence only; restore cannot revive authority'),
('engagements','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('entitlements','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('event_receipts','excluded',null,array[]::text[],'Global provider ingress without a proven tenant object binding; project-level evidence only'),
('export_jobs','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('fact_impacts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('financial_adjustments','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('hosting_allocations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('import_runs','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('inbound_anomalies','related','exists(select 1 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id where e.id=x.email_id and r.organization_id=$1)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('inbound_emails','related','exists(select 1 from wm.inbound_routes r where r.id=x.route_id and r.organization_id=$1)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('inbound_events','related','exists(select 1 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id where r.organization_id=$1 and e.connection=x.connection and e.environment=x.environment and e.provider_id::text=x.payload->''data''->>''email_id'')',array[]::text[],'Tenant or explicitly related recovery evidence'),
('inbound_inventory','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('inbound_inventory_pages','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('inbound_routes','tenant','x.organization_id=$1',array['token_hash']::text[],'Historical evidence only; restore cannot revive authority'),
('incidents','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('intake_arrivals','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_commands','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_conflict_decisions','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_conflicts','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_creation_grants','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_events','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_grant_revocations','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_grant_uses','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_links','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_lock','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_opportunities','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_receipts','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('intake_sources','excluded',null,array[]::text[],'Global prospect/creation authority is excluded; never restore into a tenant'),
('integration_credentials','tenant','x.organization_id=$1',array['ciphertext','refresh_nonce','refresh_ticket']::text[],'Historical evidence only; restore cannot revive authority'),
('intro_care_slots','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('invitations','tenant','x.organization_id=$1',array['token_hash']::text[],'Historical evidence only; restore cannot revive authority'),
('lead_outcomes','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('measurement_checks','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('measurement_definitions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('memberships','tenant','x.organization_id=$1',array[]::text[],'Historical evidence only; restore cannot revive authority'),
('messages','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('metric_snapshots','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('milestones','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_anomalies','related','exists(select 1 from wm.notification_webhooks w join wm.notification_sends s on s.channel_id=w.channel_id and s.provider_id::text=w.payload->''data''->>''email_id'' where s.organization_id=$1 and w.channel_id=x.channel_id and w.event_id=x.event_id)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_batches','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_blocks','related','exists(select 1 from wm.notification_sends s where s.organization_id=$1 and s.channel_id=x.channel_id and s.address_hash=x.address_hash) or exists(select 1 from wm.notification_routes r join wm.memberships m on m.organization_id=r.organization_id join auth.users u on u.id=m.user_id where r.organization_id=$1 and r.channel_id=x.channel_id and encode(sha256(convert_to(lower(u.email),''UTF8'')),''hex'')=x.address_hash)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_channels','related','exists(select 1 from wm.notification_routes r where r.organization_id=$1 and r.channel_id=x.id)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_exception_notes','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_items','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_notices','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_observations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_preferences','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_routes','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_sends','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('notification_webhooks','related','exists(select 1 from wm.notification_sends s where s.organization_id=$1 and s.channel_id=x.channel_id and s.provider_id::text=x.payload->''data''->>''email_id'')',array[]::text[],'Tenant or explicitly related recovery evidence'),
('oauth_sessions','excluded',null,array[]::text[],'Ephemeral authorization/session material; reconnect independently'),
('operation_attempts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('operations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('operator_assignments','tenant','x.organization_id=$1',array[]::text[],'Historical evidence only; restore cannot revive authority'),
('opportunities','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('organizations','related','x.id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('outbox_jobs','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('outcome_events','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('owner_capacity','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('owner_cover_revocations','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('owner_covers','tenant','x.organization_id=$1',array[]::text[],'Historical evidence only; restore cannot revive authority'),
('owner_date_decisions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('owner_date_proposals','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('owner_estimates','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('payment_references','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('profiles','related','x.user_id in (select user_id from wm.memberships where organization_id=$1 union select user_id from wm.operator_assignments where organization_id=$1)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('provider_connections','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('provider_scopes','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('recovery_scopes','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('reports','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('requests','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('retention_actions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('revision_facts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('revisions','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('seo_items','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('service_starts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('source_imports','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('staff','excluded',null,array[]::text[],'Global authority or global operational state; requires separately governed project recovery'),
('stop_attempt_links','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('stop_intents','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('stripe_event_inbox','related','exists(select 1 from wm.payment_references p where p.organization_id=$1 and p.environment=x.environment and p.account_id=x.account_id and p.external_id=x.object_id) or exists(select 1 from wm.billing_obligations b where b.organization_id=$1 and b.environment=x.environment and b.account_id=x.account_id and b.invoice_id=x.object_id)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('stripe_readbacks','related','exists(select 1 from wm.payment_references p where p.organization_id=$1 and p.environment=x.environment and p.account_id=x.account_id and p.external_id=x.object_id) or exists(select 1 from wm.billing_obligations b where b.organization_id=$1 and b.environment=x.environment and b.account_id=x.account_id and b.invoice_id=x.object_id)',array[]::text[],'Tenant or explicitly related recovery evidence'),
('tenant_guards','tenant','x.organization_id=$1',array[]::text[],'Historical evidence only; restore cannot revive authority'),
('time_entries','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('website_artifacts','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('website_releases','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('website_targets','tenant','x.organization_id=$1',array[]::text[],'Tenant or explicitly related recovery evidence'),
('tenant_backup_jobs','excluded',null,'{}','Producer control state is independently sealed; avoid recursive snapshots'),
('tenant_backup_parts','excluded',null,'{}','Producer control state is independently sealed; avoid recursive snapshots'),
('tenant_backup_registry','excluded',null,'{}','Producer control state is independently sealed; avoid recursive snapshots');
update wm.tenant_backup_registry set signature=wm.backup_schema_signature(name);

do $$declare n text;begin foreach n in array array['tenant_backup_jobs','tenant_backup_parts','tenant_backup_registry'] loop execute format('alter table wm.%I enable row level security',n);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',n);end loop;end $$;
-- STABLE SPI SELECTs all use the calling statement's MVCC snapshot.
create function wm.backup_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare registry_row wm.tenant_backup_registry;rows jsonb;tables jsonb:='{}';coverage jsonb:='[]';total integer:=0;files jsonb;tail jsonb;begin
 if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='wm' and c.relkind in ('r','p') and not exists(select 1 from wm.tenant_backup_registry known where known.name=c.relname)) then raise exception 'backup_coverage_unclassified';end if;
 for registry_row in select * from wm.tenant_backup_registry order by name loop
 if to_regclass('wm.'||quote_ident(registry_row.name)) is null or wm.backup_schema_signature(registry_row.name)<>registry_row.signature then raise exception 'backup_schema_changed';end if;
 if registry_row.classification='excluded' then coverage:=coverage||jsonb_build_array(jsonb_build_object('table',registry_row.name,'classification','excluded','reason',registry_row.reason,'signature',registry_row.signature));continue;end if;
 execute format('select coalesce(jsonb_agg(data order by data),''[]'') from (select (to_jsonb(x)-$2)::text as data from wm.%I x where %s limit 20001) s',registry_row.name,registry_row.predicate_sql) into rows using org,registry_row.redacted;
 total:=total+jsonb_array_length(rows);if total>20000 then raise exception 'backup_row_limit';end if;
 if octet_length(rows::text)>8388608 then raise exception 'backup_table_bytes_limit';end if;
 tables:=tables||jsonb_build_object(registry_row.name,rows);if octet_length(tables::text)>16777216 then raise exception 'backup_snapshot_bytes_limit';end if;
 coverage:=coverage||jsonb_build_array(jsonb_build_object('table',registry_row.name,'classification',registry_row.classification,'rows',jsonb_array_length(rows),'signature',registry_row.signature,'redacted',registry_row.redacted,'reason',registry_row.reason));
 end loop;
 select coalesce(jsonb_agg(f order by f->>'id'),'[]') into files from (
 select jsonb_build_object('id','workspace:'||a.id,'version',a.version::text,'backend','supabase','bucket',case when a.sealed_object_key is null then 'workspace-quarantine' else 'workspace-sealed' end,'key',coalesce(a.sealed_object_key,a.upload_object_key),'bytes',a.actual_bytes::text,'sha256',a.checksum,'state',a.scan_state) f
 from wm.attachments a where a.organization_id=org and a.checksum is not null and a.actual_bytes is not null
 and not exists(select 1 from wm.retention_actions ra where ra.organization_id=org and ra.target_id=a.id and ra.target_type='file' and ra.state='purged' and ra.tombstone is not null and not ra.legal_hold)
 union all
 select jsonb_build_object('id','inbound:'||e.id||':'||(v->>'id'),'version',e.version::text,'backend','supabase','bucket','workspace-inbound','key',v->>'object_key','bytes',v->>'bytes','sha256',v->>'checksum','state',e.routing)
 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id cross join lateral jsonb_array_elements(e.attachments) v where r.organization_id=org and v->>'state'='stored_unscanned'
 union all
 select jsonb_build_object('id','export:'||id,'version',version::text,'backend',split_part(storage_target,':',1),'storage_target',storage_target,'bucket','workspace-customer-exports','key',object_key,'bytes',archive_bytes::text,'sha256',archive_digest,'state',state) from wm.customer_exports where organization_id=org and state='sealed'
 ) src;
 if jsonb_array_length(files)>500 or (select coalesce(sum((v->>'bytes')::bigint),0) from jsonb_array_elements(files) v)>268435456 then raise exception 'backup_file_limit';end if;
 if exists(select 1 from jsonb_array_elements(files) v where v->>'sha256' !~ '^[a-f0-9]{64}$' or v->>'key' is null or (v->>'bytes')::bigint not between 1 and 33554432) then raise exception 'backup_file_identity';end if;
 if exists(select 1 from wm.export_jobs where organization_id=org and object_key is not null) then raise exception 'backup_legacy_export_unclassified';end if;
 select jsonb_build_object('receipts',coalesce((select jsonb_object_agg(id::text,digest) from wm.critical_receipts where organization_id=org),'{}'),
 'attempts',coalesce((select jsonb_object_agg(id::text,jsonb_build_object('nonce',dispatch_nonce,'state',state)) from wm.operation_attempts where organization_id=org),'{}')) into tail;
 return jsonb_build_object('snapshot',jsonb_build_object('format','wm-tenant-backup/1','organization_id',org,'tables',tables)::text,'files',files,'coverage',coverage,'tail',tail);
end $$;
create function wm.backup_actor_digest(org uuid,who uuid) returns text language sql stable security definer set search_path='' as $$
 select wm.hash_json(jsonb_build_object('assignment',to_jsonb(a),'staff',(select to_jsonb(s) from wm.staff s where s.user_id=who)))
 from wm.operator_assignments a where a.organization_id=org and a.user_id=who
$$;
create function wm.backup_current(j wm.tenant_backup_jobs) returns void language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;grant_hash text;begin
 select * into g from wm.tenant_guards where organization_id=j.organization_id for update;
 grant_hash:=wm.backup_actor_digest(j.organization_id,j.requested_by);
 if g.organization_id is null or g.access_state<>'open' or g.recovery_generation<>j.recovery_generation or g.external_generation<>j.external_generation or j.expires_at<=clock_timestamp() or j.state='cancelled' or grant_hash is distinct from j.grant_digest
 or not wm.operator_for(j.organization_id,j.requested_by,'recovery') or not exists(select 1 from auth.sessions where id=j.session_id and user_id=j.requested_by and (not_after is null or not_after>clock_timestamp())) then raise exception 'Backup authority or generation changed' using errcode='42501';end if;
end $$;
create function public.wm_backup_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare prior jsonb;j wm.tenant_backup_jobs;g wm.tenant_guards;begin
 perform wm.require_access(p_org,'recovery');perform wm.require_recent_auth();
 if not wm.operator_has(p_org,'recovery') then raise exception 'Recovery operator required' using errcode='42501';end if;
 if p_command='backup.request' then
 perform wm.check_input(p_input,array['qualification','key_id'],array['qualification','key_id']);
 perform wm.check_input(p_input->'qualification',array['bytes_identity','witness_identity','custody_reference','witness_hooks_version'],array['bytes_identity','witness_identity','custody_reference','witness_hooks_version']);
 if p_input->>'key_id' !~ '^[A-Za-z0-9_-]{1,60}$' then raise exception 'Key version required' using errcode='22023';end if;
 perform wm.require_text(p_input->'qualification'->>'bytes_identity','bytes identity',160);perform wm.require_text(p_input->'qualification'->>'witness_identity','witness identity',160);perform wm.require_text(p_input->'qualification'->>'custody_reference','custody reference',160);perform wm.require_text(p_input->'qualification'->>'witness_hooks_version','hook version',80);
 prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 if exists(select 1 from wm.tenant_backup_jobs where organization_id=p_org and state in ('queued','captured','copying') and expires_at>clock_timestamp()) then raise exception 'An active backup already exists' using errcode='22023';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 insert into wm.tenant_backup_jobs(organization_id,requested_by,session_id,grant_digest,recovery_generation,external_generation,qualification,key_id)
 select p_org,auth.uid(),(wm.claims()->>'session_id')::uuid,wm.backup_actor_digest(p_org,auth.uid()),g.recovery_generation,g.external_generation,p_input->'qualification',p_input->>'key_id' from wm.operator_assignments a where a.organization_id=p_org and a.user_id=auth.uid() returning * into j;
 if j.id is null then raise exception 'Direct recovery assignment required' using errcode='42501';end if;
 elsif p_command='backup.cancel' then
 perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 select * into j from wm.tenant_backup_jobs where organization_id=p_org and id=(p_input->>'id')::uuid for update;if not found then raise exception 'Backup unavailable' using errcode='42501';end if;perform wm.check_version(j.version,(p_input->>'expected_version')::bigint);
 update wm.tenant_backup_jobs set state='cancelled',version=version+1 where organization_id=p_org and id=j.id returning * into j;
 else raise exception 'Unsupported backup command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',j.id,'version',j.version,'state',j.state,'external_generation',j.external_generation),j.id);
end $$;
create function public.wm_backup_status(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_access(p_org,'recovery');perform wm.require_recent_auth();if not wm.operator_has(p_org,'recovery') then raise exception 'Recovery operator required' using errcode='42501';end if;
 return jsonb_build_object('external_generation',(select external_generation from wm.tenant_guards where organization_id=p_org),'items',coalesce((select jsonb_agg(x order by requested_at desc) from (select id,case when expires_at<=clock_timestamp() and state<>'sealed' then 'expired' else state end state,reason,version,requested_at,captured_at,expires_at,sealed_at,key_id,qualification,snapshot_digest,manifest_digest from wm.tenant_backup_jobs where organization_id=p_org order by requested_at desc,id limit 50) x),'[]'));
end $$;
create function public.wm_backup_claim(p_limit integer default 2) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.tenant_backup_jobs;result jsonb:='[]';begin
 perform wm.require_machine();if p_limit not between 1 and 5 then raise exception 'Invalid backup claim bound' using errcode='22023';end if;
 for j in select * from wm.tenant_backup_jobs where state in ('queued','captured','copying') and expires_at>clock_timestamp() and next_attempt_at<=clock_timestamp() and (lease_until is null or lease_until<clock_timestamp()) order by next_attempt_at for update skip locked limit p_limit loop
 update wm.tenant_backup_jobs set lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',next_attempt_at=clock_timestamp()+interval '5 minutes',attempts=attempts+1,version=version+1 where organization_id=j.organization_id and id=j.id returning * into j;
 result:=result||jsonb_build_array(jsonb_build_object('organization_id',j.organization_id,'id',j.id,'lease_token',j.lease_token));end loop;return result;
end $$;
create function public.wm_backup_context(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.tenant_backup_jobs;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;select * into j from wm.tenant_backup_jobs where organization_id=p_org and id=p_id for update;
 if not found or j.lease_token is distinct from p_lease or j.lease_until<=clock_timestamp() or j.state not in ('queued','captured','copying') then raise exception 'Backup lease unavailable' using errcode='42501';end if;perform wm.backup_current(j);
 return (to_jsonb(j)-array['snapshot_text','grant_digest','session_id','lease_token'])||jsonb_build_object('snapshot_bytes',octet_length(j.snapshot_text),'parts',coalesce((select jsonb_object_agg(part_key,pointer) from wm.tenant_backup_parts where organization_id=p_org and backup_id=p_id),'{}'));
end $$;
create function public.wm_backup_capture(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare c jsonb;s jsonb;begin
 perform wm.require_machine();c:=public.wm_backup_context(p_org,p_id,p_lease);if c->>'snapshot_digest' is not null then return c;end if;
 begin s:=wm.backup_snapshot(p_org);if octet_length(s->>'snapshot')>16777216 then raise exception 'backup_snapshot_bytes_limit';end if;exception when others then
 update wm.tenant_backup_jobs set state='attention',reason=case when sqlerrm like 'backup_%' then sqlerrm else 'capture_failed' end,lease_until=null,version=version+1 where organization_id=p_org and id=p_id;return jsonb_build_object('id',p_id,'state','attention');end;
 update wm.tenant_backup_jobs set snapshot_text=s->>'snapshot',snapshot_digest=encode(sha256(convert_to(s->>'snapshot','UTF8')),'hex'),files=s->'files',coverage=s->'coverage',tail=s->'tail',captured_at=statement_timestamp(),state='captured',version=version+1 where organization_id=p_org and id=p_id;
 return public.wm_backup_context(p_org,p_id,p_lease);
end $$;
create function public.wm_backup_page(p_org uuid,p_id uuid,p_lease uuid,p_offset integer) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare bytes bytea;begin
 perform wm.require_machine();perform public.wm_backup_context(p_org,p_id,p_lease);if p_offset<0 or p_offset%262144<>0 then raise exception 'Invalid snapshot chunk' using errcode='22023';end if;
 select convert_to(snapshot_text,'UTF8') into bytes from wm.tenant_backup_jobs where organization_id=p_org and id=p_id;if bytes is null or p_offset>=octet_length(bytes) then raise exception 'Snapshot chunk unavailable' using errcode='22023';end if;
 return jsonb_build_object('offset',p_offset,'bytes',encode(substring(bytes from p_offset+1 for 262144),'base64'));
end $$;
create function public.wm_backup_part(p_org uuid,p_id uuid,p_lease uuid,p_key text,p_pointer jsonb) returns void language plpgsql volatile security definer set search_path='' as $$declare old jsonb;begin
 perform wm.require_machine();perform public.wm_backup_context(p_org,p_id,p_lease);if p_key !~ '^(anchor|snapshot/[0-9]+|file/[0-9]+/[0-9]+|verified/(snapshot|[0-9]+))$' or jsonb_typeof(p_pointer) is distinct from 'object' or length(p_key)>180 or octet_length(p_pointer::text)>4096 then raise exception 'Invalid part receipt' using errcode='22023';end if;
 select pointer into old from wm.tenant_backup_parts where organization_id=p_org and backup_id=p_id and part_key=p_key;if found then if old<>p_pointer then raise exception 'Backup part conflict' using errcode='23505';end if;return;end if;
 insert into wm.tenant_backup_parts values(p_org,p_id,p_key,p_pointer,now());
end $$;
create function public.wm_backup_manifest(p_org uuid,p_id uuid,p_lease uuid,p_manifest jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm.tenant_backup_jobs;begin
 perform wm.require_machine();perform public.wm_backup_context(p_org,p_id,p_lease);select * into j from wm.tenant_backup_jobs where organization_id=p_org and id=p_id;
 if octet_length(p_manifest::text)>2097152 or p_manifest->>'snapshot_digest' is distinct from j.snapshot_digest or p_manifest->>'backup_id' is distinct from p_id::text then raise exception 'Invalid backup manifest' using errcode='22023';end if;

 if p_manifest->>'organization_id' is distinct from p_org::text or p_manifest->>'external_generation' is distinct from j.external_generation or p_manifest->'files' is distinct from j.files or p_manifest->'coverage' is distinct from j.coverage or jsonb_typeof(p_manifest->'parts') is distinct from 'array' then raise exception 'Backup completeness manifest mismatch';end if;
 if exists(
 with expected as (
 select 'snapshot/'||n part,n off,least(262144,octet_length(j.snapshot_text)-n) len,j.snapshot_digest whole from generate_series(0,octet_length(j.snapshot_text)-1,262144) n
 union all select 'file/'||(idx-1)||'/'||n,n,least(262144,(f->>'bytes')::integer-n),f->>'sha256' from jsonb_array_elements(j.files) with ordinality a(f,idx) cross join lateral generate_series(0,(f->>'bytes')::integer-1,262144) n
 ), actual as (select v from jsonb_array_elements(p_manifest->'parts') v)
 select 1 from expected e full join actual a on a.v->>'part'=e.part left join wm.tenant_backup_parts bp on bp.organization_id=p_org and bp.backup_id=p_id and bp.part_key=e.part
 where e.part is null or a.v is null or bp.pointer is null or a.v->'pointer' is distinct from bp.pointer or (a.v->>'offset')::integer is distinct from e.off or (a.v->>'length')::integer is distinct from e.len or a.v->>'whole' is distinct from e.whole
 ) or (select count(*)<>count(distinct v->>'part') from jsonb_array_elements(p_manifest->'parts') v) then raise exception 'Backup parts incomplete';end if;
 if not exists(select 1 from wm.tenant_backup_parts where organization_id=p_org and backup_id=p_id and part_key='verified/snapshot' and pointer->>'sha256'=j.snapshot_digest and (pointer->>'bytes')::integer=octet_length(j.snapshot_text))
 or exists(select 1 from jsonb_array_elements(j.files) with ordinality a(f,idx) where not exists(select 1 from wm.tenant_backup_parts where organization_id=p_org and backup_id=p_id and part_key='verified/'||(idx-1) and pointer->>'sha256'=f->>'sha256' and pointer->>'bytes'=f->>'bytes')) then raise exception 'Whole source verification required';end if;
 if j.manifest is not null and j.manifest<>p_manifest then raise exception 'Manifest conflict' using errcode='23505';end if;
 update wm.tenant_backup_jobs set manifest=p_manifest,manifest_digest=wm.hash_json(p_manifest),state='copying',version=version+1 where organization_id=p_org and id=p_id;return p_manifest;
end $$;
create function public.wm_backup_finish(p_org uuid,p_id uuid,p_lease uuid,p_pointer jsonb,p_witness jsonb) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform public.wm_backup_context(p_org,p_id,p_lease);
 if p_pointer is null or p_witness is null or coalesce(p_pointer->>'ciphertext_digest','') !~ '^[a-f0-9]{64}$' or coalesce(p_witness->>'ciphertext_digest','') !~ '^[a-f0-9]{64}$' or p_pointer->'context'->>'backup_id' is distinct from p_id::text or p_pointer->'context'->>'organization_id' is distinct from p_org::text or p_witness->'context'->>'event_id' is distinct from p_id::text or octet_length(p_pointer::text)>4096 or octet_length(p_witness::text)>8192 then raise exception 'Verified backup and witness required' using errcode='22023';end if;
 update wm.tenant_backup_jobs set manifest_pointer=p_pointer,witness_pointer=p_witness,sealed_at=clock_timestamp(),state='sealed',lease_until=null,version=version+1 where organization_id=p_org and id=p_id and manifest is not null;if not found then raise exception 'Manifest required';end if;
end $$;
create function public.wm_backup_release(p_org uuid,p_id uuid,p_lease uuid,p_reason text default null) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();if p_reason is not null and p_reason !~ '^[a-z_]{1,80}$' then raise exception 'Invalid backup reason';end if;
 update wm.tenant_backup_jobs set state=case when p_reason is null then 'captured' else 'attention' end,reason=p_reason,lease_until=null,next_attempt_at=clock_timestamp(),version=version+1 where organization_id=p_org and id=p_id and lease_token=p_lease and state in ('queued','captured','copying');
end $$;
-- Source hold query for the separately owned GC workflow. No deletion is performed.
create function public.wm_backup_hold(p_bucket text,p_key text) returns boolean language plpgsql volatile security definer set search_path='' as $$begin perform wm.require_machine();return exists(select 1 from wm.tenant_backup_jobs j cross join lateral jsonb_array_elements(j.files) f where j.state in ('captured','copying') and j.expires_at>clock_timestamp() and f->>'bucket'=p_bucket and f->>'key'=p_key);end $$;
revoke all on function wm.backup_immutable(),wm.backup_schema_signature(text),wm.backup_snapshot(uuid),wm.backup_current(wm.tenant_backup_jobs),public.wm_backup_command(uuid,text,jsonb,text),public.wm_backup_status(uuid),public.wm_backup_claim(integer),public.wm_backup_context(uuid,uuid,uuid),public.wm_backup_capture(uuid,uuid,uuid),public.wm_backup_page(uuid,uuid,uuid,integer),public.wm_backup_part(uuid,uuid,uuid,text,jsonb),public.wm_backup_manifest(uuid,uuid,uuid,jsonb),public.wm_backup_finish(uuid,uuid,uuid,jsonb,jsonb),public.wm_backup_release(uuid,uuid,uuid,text),public.wm_backup_hold(text,text) from public,anon,authenticated,service_role;
revoke all on function wm.backup_actor_digest(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_backup_command(uuid,text,jsonb,text),public.wm_backup_status(uuid) to authenticated;
grant execute on function public.wm_backup_claim(integer),public.wm_backup_context(uuid,uuid,uuid),public.wm_backup_capture(uuid,uuid,uuid),public.wm_backup_page(uuid,uuid,uuid,integer),public.wm_backup_part(uuid,uuid,uuid,text,jsonb),public.wm_backup_manifest(uuid,uuid,uuid,jsonb),public.wm_backup_finish(uuid,uuid,uuid,jsonb,jsonb),public.wm_backup_release(uuid,uuid,uuid,text),public.wm_backup_hold(text,text) to service_role;
commit;
