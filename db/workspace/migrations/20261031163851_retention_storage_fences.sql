begin;
-- Called only after a checked human/machine entry point takes the tenant guard.
-- A started physical attempt permanently fences the identity, including after
-- cancellation or an unknown response. A new attempt cannot recreate that key.
create function wm.retention_fenced(org uuid,bucket text,object_key text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from wm.retention_jobs j where j.organization_id=org and j.inventory->>'bucket'=bucket and j.inventory->>'key'=object_key and (j.attempted_at is not null or j.state in ('authorized','intent')))
$$;
create function wm.retention_guard(org uuid) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform 1 from wm.tenant_guards where organization_id=org for update;
 if not found then raise exception 'Retention guard unavailable' using errcode='42501';end if;
end $$;
create function wm.retention_assert(org uuid,bucket text,object_key text) returns void language plpgsql stable security definer set search_path='' as $$begin
 if object_key is not null and wm.retention_fenced(org,bucket,object_key) then raise exception 'Object unavailable during or after retention' using errcode='42501';end if;
end $$;
create or replace function public.wm_retention_object_fenced(p_org uuid,p_bucket text,p_key text) returns boolean language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform wm.retention_guard(p_org);return wm.retention_fenced(p_org,p_bucket,p_key);
end $$;

alter function public.wm_file_access(uuid,uuid,text) rename to wm_file_access_before_retention;
create function public.wm_file_access(p_org uuid,p_id uuid,p_action text) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare v jsonb;begin
 v:=public.wm_file_access_before_retention(p_org,p_id,p_action);perform wm.retention_guard(p_org);
 perform wm.retention_assert(p_org,case when p_action='upload' then 'workspace-quarantine' else 'workspace-sealed' end,v->>'object_key');return v;
end $$;
create function wm.retention_file(org uuid,file_id uuid,proposed text default null) returns void language plpgsql volatile security definer set search_path='' as $$declare a wm.attachments;begin
 perform wm.retention_guard(org);select * into a from wm.attachments where organization_id=org and id=file_id;
 if not found then raise exception 'File unavailable' using errcode='42501';end if;
 perform wm.retention_assert(org,'workspace-quarantine',a.upload_object_key);
 perform wm.retention_assert(org,'workspace-sealed',a.sealed_object_key);
 perform wm.retention_assert(org,'workspace-sealed',coalesce(proposed,org::text||'/'||file_id::text||'/'||a.checksum));
end $$;
alter function public.wm_file_scan_input(uuid,uuid) rename to wm_file_scan_input_before_retention;
create function public.wm_file_scan_input(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare v jsonb;begin
 perform wm.require_machine();perform wm.retention_file(p_org,p_id);v:=public.wm_file_scan_input_before_retention(p_org,p_id);return v;
end $$;
alter function public.wm_file_uploaded(uuid,uuid,text,bigint,text) rename to wm_file_uploaded_before_retention;
create function public.wm_file_uploaded(p_org uuid,p_id uuid,p_checksum text,p_bytes bigint,p_media_type text) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform wm.retention_file(p_org,p_id,p_org::text||'/'||p_id::text||'/'||p_checksum);return public.wm_file_uploaded_before_retention(p_org,p_id,p_checksum,p_bytes,p_media_type);
end $$;
alter function public.wm_file_scan_complete(uuid,uuid,text,boolean,text,jsonb,text) rename to wm_file_scan_complete_before_retention;
create function public.wm_file_scan_complete(p_org uuid,p_id uuid,p_checksum text,p_clean boolean,p_policy text,p_evidence jsonb,p_sealed_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform wm.retention_file(p_org,p_id,p_sealed_key);return public.wm_file_scan_complete_before_retention(p_org,p_id,p_checksum,p_clean,p_policy,p_evidence,p_sealed_key);
end $$;
alter function public.wm_file_release_unscanned(uuid,uuid,text,text) rename to wm_file_release_unscanned_before_retention;
create function public.wm_file_release_unscanned(p_org uuid,p_id uuid,p_checksum text,p_sealed_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform wm.retention_file(p_org,p_id,p_sealed_key);return public.wm_file_release_unscanned_before_retention(p_org,p_id,p_checksum,p_sealed_key);
end $$;
alter function public.wm_inbound_file_access(uuid,uuid,uuid) rename to wm_inbound_file_access_before_retention;
create function public.wm_inbound_file_access(p_org uuid,p_id uuid,p_attachment uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare v jsonb;begin
 v:=public.wm_inbound_file_access_before_retention(p_org,p_id,p_attachment);perform wm.retention_guard(p_org);perform wm.retention_assert(p_org,'workspace-inbound',v->>'object_key');return v;
end $$;

-- Persist the first POST before contacting Storage. A stale scanner/capture
-- may read existing bytes, but can never POST again after a later deletion.
create table wm.file_seal_writes(organization_id uuid not null,file_id uuid not null,object_key text not null,checksum text not null check(checksum ~ '^[a-f0-9]{64}$'),started_at timestamptz not null default now(),primary key(organization_id,file_id),foreign key(organization_id,file_id) references wm.attachments(organization_id,id));
create table wm.inbound_attachment_writes(email_id uuid not null references wm.inbound_emails(id),attachment_id uuid not null,object_key text not null,checksum text not null check(checksum ~ '^[a-f0-9]{64}$'),started_at timestamptz not null default now(),primary key(email_id,attachment_id));
insert into wm.file_seal_writes(organization_id,file_id,object_key,checksum) select organization_id,id,sealed_object_key,checksum from wm.attachments where sealed_object_key is not null and checksum is not null;
insert into wm.inbound_attachment_writes(email_id,attachment_id,object_key,checksum) select e.id,(v->>'id')::uuid,v->>'object_key',v->>'checksum' from wm.inbound_emails e cross join lateral jsonb_array_elements(e.attachments) v where v->>'state' in ('stored_unscanned','purged');
create function public.wm_file_seal_write_once(p_org uuid,p_id uuid,p_checksum text,p_key text) returns boolean language plpgsql volatile security definer set search_path='' as $$declare a wm.attachments;prior wm.file_seal_writes;n integer;begin
 perform wm.require_machine();perform wm.retention_file(p_org,p_id,p_key);
 select * into a from wm.attachments where organization_id=p_org and id=p_id for update;
 if a.deleted_at is not null or a.checksum is distinct from p_checksum or p_key is distinct from p_org::text||'/'||p_id::text||'/'||p_checksum or a.scan_state not in ('quarantined','checking','ready','unscanned') then raise exception 'Sealing identity unavailable' using errcode='42501';end if;
 select * into prior from wm.file_seal_writes where organization_id=p_org and file_id=p_id;
 if found then if prior.object_key<>p_key or prior.checksum<>p_checksum then raise exception 'Immutable sealing identity conflict';end if;return false;end if;
 if a.scan_state in ('ready','unscanned') then return false;end if;
 insert into wm.file_seal_writes values(p_org,p_id,p_key,p_checksum,clock_timestamp()) on conflict do nothing;get diagnostics n=row_count;return n=1;
end $$;
create function public.wm_inbound_attachment_write_once(p_id uuid,p_generation bigint,p_attachment uuid,p_checksum text,p_key text) returns boolean language plpgsql volatile security definer set search_path='' as $$declare org uuid;current_org uuid;e wm.inbound_emails;prior wm.inbound_attachment_writes;n integer;begin
 perform wm.require_machine();select r.organization_id into org from wm.inbound_emails mail join wm.inbound_routes r on r.id=mail.route_id where mail.id=p_id;
 if org is not null then perform wm.retention_guard(org);end if;
 select * into e from wm.inbound_emails where id=p_id for update;
 if not found or e.state<>'retrieving' or e.lease_generation<>p_generation or e.lease_until<=clock_timestamp() then raise exception 'Capture lease changed' using errcode='40001';end if;
 select organization_id into current_org from wm.inbound_routes where id=e.route_id;
 if current_org is distinct from org then raise exception 'Inbound route changed' using errcode='40001';end if;
 if org is not null then perform wm.retention_assert(org,'workspace-inbound',p_key);end if;
 if p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' or p_key is distinct from 'inbound/'||p_id::text||'/'||p_attachment::text||'/'||p_checksum then raise exception 'Inbound write identity unavailable';end if;
 select * into prior from wm.inbound_attachment_writes where email_id=p_id and attachment_id=p_attachment;
 if found then if prior.object_key<>p_key or prior.checksum<>p_checksum then raise exception 'Immutable inbound write conflict';end if;return false;end if;
 if exists(select 1 from jsonb_array_elements(e.attachments) a where a->>'id'=p_attachment::text and a->>'state' in ('stored_unscanned','purged')) then return false;end if;
 insert into wm.inbound_attachment_writes values(p_id,p_attachment,p_key,p_checksum,clock_timestamp()) on conflict do nothing;get diagnostics n=row_count;return n=1;
end $$;
-- Never let a retried capture replace a tombstone with previously captured bytes.
alter function public.wm_inbound_capture(uuid,bigint,jsonb) rename to wm_inbound_capture_before_retention;
create function public.wm_inbound_capture(p_id uuid,p_generation bigint,p_capture jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare org uuid;current_org uuid;e wm.inbound_emails;v jsonb;begin
 perform wm.require_machine();select r.organization_id into org from wm.inbound_emails mail join wm.inbound_routes r on r.id=mail.route_id where mail.id=p_id;
 if org is not null then perform wm.retention_guard(org);end if;select * into e from wm.inbound_emails where id=p_id for update;
 select organization_id into current_org from wm.inbound_routes where id=e.route_id;if current_org is distinct from org then raise exception 'Inbound route changed' using errcode='40001';end if;
 if org is not null then for v in select value from jsonb_array_elements(coalesce(p_capture->'attachments','[]')) where value->>'state'='stored_unscanned' loop perform wm.retention_assert(org,'workspace-inbound',v->>'object_key');end loop;end if;
 if exists(select 1 from jsonb_array_elements(e.attachments) a join jsonb_array_elements(coalesce(p_capture->'attachments','[]')) b on a->>'id'=b->>'id' where a->>'state'='purged' and b->>'state'='stored_unscanned') then raise exception 'Purged inbound identity cannot be recaptured';end if;
 return public.wm_inbound_capture_before_retention(p_id,p_generation,p_capture);
end $$;

create function wm.retention_export_sources(org uuid,files jsonb) returns void language plpgsql stable security definer set search_path='' as $$declare f jsonb;begin
 for f in select value from jsonb_array_elements(files) loop perform wm.retention_assert(org,f->>'bucket',f->>'object_key');end loop;
end $$;
alter function wm.customer_export_snapshot(uuid,uuid,uuid,boolean) rename to customer_export_snapshot_before_retention;
create function wm.customer_export_snapshot(org uuid,engagement uuid,who uuid,admin boolean) returns jsonb language plpgsql stable security definer set search_path='' as $$declare s jsonb;begin
 s:=wm.customer_export_snapshot_before_retention(org,engagement,who,admin);perform wm.retention_export_sources(org,s->'files');return s;
end $$;
alter function wm.customer_export_current(wm.customer_exports) rename to customer_export_current_before_retention;
create function wm.customer_export_current(j wm.customer_exports) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.retention_guard(j.organization_id);perform wm.customer_export_current_before_retention(j);perform wm.retention_export_sources(j.organization_id,j.snapshot->'files');perform wm.retention_assert(j.organization_id,'workspace-customer-exports',j.object_key);
end $$;
alter function wm.backup_snapshot(uuid) rename to backup_snapshot_before_retention;
create function wm.backup_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$declare s jsonb;files jsonb;f jsonb;begin
 s:=wm.backup_snapshot_before_retention(org);
 -- Absence after an in-flight hold remains a tombstone, not permission to
 -- recopy the object. Its hold and uncertain attribution remain in the rows.
 select coalesce(jsonb_agg(v order by v->>'id'),'[]') into files from jsonb_array_elements(s->'files') v where not exists(select 1 from wm.retention_jobs j where j.organization_id=org and j.state='purged' and j.inventory->>'bucket'=v->>'bucket' and j.inventory->>'key'=v->>'key');
 for f in select value from jsonb_array_elements(files) loop perform wm.retention_assert(org,f->>'bucket',f->>'key');end loop;
 return jsonb_set(jsonb_set(s,'{files}',files),'{tail,retention_receipts}',coalesce((select jsonb_object_agg(d.event_id::text,jsonb_build_object('digest',d.overlay_pointer#>>'{context,digest}','key',d.overlay_pointer->>'key','generation',e.generation,'kind',e.kind)) from wm.retention_durability d join wm.retention_events e on e.organization_id=d.organization_id and e.id=d.event_id where d.organization_id=org),'{}'));
end $$;
alter function public.wm_backup_context(uuid,uuid,uuid) rename to wm_backup_context_before_retention;
create function public.wm_backup_context(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare s jsonb;f jsonb;begin
 perform wm.require_machine();perform wm.retention_guard(p_org);s:=public.wm_backup_context_before_retention(p_org,p_id,p_lease);
 for f in select value from jsonb_array_elements(case when jsonb_typeof(s->'files')='array' then s->'files' else '[]' end) loop perform wm.retention_assert(p_org,f->>'bucket',f->>'key');end loop;return s;
end $$;

alter table wm.file_seal_writes enable row level security;
alter table wm.inbound_attachment_writes enable row level security;
revoke all on wm.file_seal_writes,wm.inbound_attachment_writes from public,anon,authenticated,service_role;
create trigger immutable_file_write before update or delete on wm.file_seal_writes for each row execute function wm.reject_history_edit();
create trigger immutable_inbound_write before update or delete on wm.inbound_attachment_writes for each row execute function wm.reject_history_edit();
insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason,signature) values
 ('file_seal_writes','tenant','x.organization_id=$1','{}','Immutable Storage attempt history; restored attempts never authorize a write',wm.backup_schema_signature('file_seal_writes')),
 ('inbound_attachment_writes','related','exists(select 1 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id where e.id=x.email_id and r.organization_id=$1)','{}','Only routed tenant attachment attempt evidence; never replay',wm.backup_schema_signature('inbound_attachment_writes'));

revoke all on function wm.retention_fenced(uuid,text,text),wm.retention_guard(uuid),wm.retention_assert(uuid,text,text),wm.retention_file(uuid,uuid,text),wm.retention_export_sources(uuid,jsonb),wm.customer_export_snapshot(uuid,uuid,uuid,boolean),wm.customer_export_current(wm.customer_exports),wm.backup_snapshot(uuid),wm.customer_export_snapshot_before_retention(uuid,uuid,uuid,boolean),wm.customer_export_current_before_retention(wm.customer_exports),wm.backup_snapshot_before_retention(uuid),public.wm_file_access_before_retention(uuid,uuid,text),public.wm_file_scan_input_before_retention(uuid,uuid),public.wm_file_uploaded_before_retention(uuid,uuid,text,bigint,text),public.wm_file_scan_complete_before_retention(uuid,uuid,text,boolean,text,jsonb,text),public.wm_file_release_unscanned_before_retention(uuid,uuid,text,text),public.wm_inbound_file_access_before_retention(uuid,uuid,uuid),public.wm_inbound_capture_before_retention(uuid,bigint,jsonb),public.wm_backup_context_before_retention(uuid,uuid,uuid),public.wm_file_access(uuid,uuid,text),public.wm_file_scan_input(uuid,uuid),public.wm_file_uploaded(uuid,uuid,text,bigint,text),public.wm_file_scan_complete(uuid,uuid,text,boolean,text,jsonb,text),public.wm_file_release_unscanned(uuid,uuid,text,text),public.wm_inbound_file_access(uuid,uuid,uuid),public.wm_file_seal_write_once(uuid,uuid,text,text),public.wm_inbound_attachment_write_once(uuid,bigint,uuid,text,text),public.wm_inbound_capture(uuid,bigint,jsonb),public.wm_backup_context(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_file_access(uuid,uuid,text),public.wm_inbound_file_access(uuid,uuid,uuid) to authenticated;
grant execute on function public.wm_file_scan_input(uuid,uuid),public.wm_file_uploaded(uuid,uuid,text,bigint,text),public.wm_file_scan_complete(uuid,uuid,text,boolean,text,jsonb,text),public.wm_file_release_unscanned(uuid,uuid,text,text),public.wm_file_seal_write_once(uuid,uuid,text,text),public.wm_inbound_attachment_write_once(uuid,bigint,uuid,text,text),public.wm_inbound_capture(uuid,bigint,jsonb),public.wm_backup_context(uuid,uuid,uuid) to service_role;
commit;
