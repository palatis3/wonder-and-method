begin;
create schema wm_restore;
revoke all on schema wm_restore from public,anon,authenticated,service_role;
create table wm_restore.runs(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references wm.organizations(id),
 requested_by uuid not null,session_id uuid not null,request_grant_digest text not null,request_key text not null,input_hash text not null,manifest_pointer jsonb not null,
 old_generation text not null,generation text not null,recovery_generation bigint not null,
 state text not null default 'requested' check(state in ('requested','ready','promotion_authorized','promoted_pending_receipt','promoted_read_only','attention')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 day',
 plan jsonb,plan_hash text,baseline text,proof_digest text,approval_intent jsonb,receipt jsonb,reason text,version bigint not null default 1,
 unique(organization_id,request_key));
create table wm_restore.registry as select * from wm.tenant_backup_registry;
alter table wm_restore.registry add primary key(name);
create table wm_restore.file_proofs(run_id uuid not null references wm_restore.runs(id),source_id text not null,sha256 text not null,bytes bigint not null,disposition text not null check(disposition in ('private_verified','purged')),source_descriptor jsonb not null,pointers jsonb not null,primary key(run_id,source_id));
create table wm_restore.active(organization_id uuid primary key references wm.organizations(id),run_id uuid not null references wm_restore.runs(id),plan_hash text not null,promoted_at timestamptz not null default now());
create function wm_restore.immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Restore evidence is immutable';end $$;
create trigger immutable before update or delete on wm_restore.registry for each row execute function wm_restore.immutable();
-- Vetted local schema only. No artifact supplies identifiers, SQL, triggers or defaults.
do $$declare r record;c record;cols text;refcols text;target text;red text;begin
 for r in select * from wm_restore.registry where classification<>'excluded' loop
 execute format('create table wm_restore.%I (recovery_run uuid not null references wm_restore.runs(id), like wm.%I including constraints)',r.name,r.name);
 foreach red in array r.redacted loop execute format('alter table wm_restore.%I alter column %I drop not null',r.name,red);end loop;
 for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype in ('p','u') loop
 select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
 execute format('alter table wm_restore.%I add unique(recovery_run,%s)',r.name,cols);
 end loop;
 end loop;
 for r in select * from wm_restore.registry where classification<>'excluded' loop
 for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype='f' loop
 select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
 select string_agg(quote_ident(a.attname),',' order by k.ord) into refcols from unnest(c.confkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n;
 select relname into target from pg_class where oid=c.confrelid;
 if exists(select 1 from wm_restore.registry where name=target and classification<>'excluded') then
 execute format('alter table wm_restore.%I add foreign key(recovery_run,%s) references wm_restore.%I(recovery_run,%s) deferrable initially deferred',r.name,cols,target,refcols);
 else
 execute format('alter table wm_restore.%I add foreign key(%s) references %s(%s) deferrable initially deferred',r.name,cols,c.confrelid::regclass,refcols);
 end if;
 end loop;
 end loop;
end $$;
create function wm_restore.operator(org uuid) returns void language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_session();perform wm.require_recent_auth();
 perform 1 from wm.tenant_guards where organization_id=org for update;if not found then raise exception 'Recovery unavailable' using errcode='42501';end if;
 perform wm.require_session();
 if not wm.operator_has(org,'recovery') or not wm.owner_direct(org,auth.uid(),'recovery') then raise exception 'Current recovery operator required' using errcode='42501';end if;
end $$;
create function wm_restore.current(j wm_restore.runs) returns void language plpgsql volatile security definer set search_path='' as $$declare g wm.tenant_guards;begin
 select * into g from wm.tenant_guards where organization_id=j.organization_id for update;
 if g.organization_id is null or g.external_generation<>j.generation or g.recovery_generation<>j.recovery_generation or g.access_state<>'restricted' or g.positive_effects_allowed or j.expires_at<=clock_timestamp() or j.request_grant_digest is distinct from wm.backup_actor_digest(j.organization_id,j.requested_by)
 or not wm.owner_direct(j.organization_id,j.requested_by,'recovery') or not exists(select 1 from auth.sessions where id=j.session_id and user_id=j.requested_by and (not_after is null or not_after>clock_timestamp())) then raise exception 'Restore current authority or generation changed' using errcode='42501';end if;
end $$;
create function wm_restore.baseline(org uuid) returns text language plpgsql stable security definer set search_path='' as $$declare r record;rows jsonb;allrows jsonb:='{}';begin
 for r in select * from wm_restore.registry order by name loop
 if not exists(select 1 from wm.tenant_backup_registry b where to_jsonb(b)=to_jsonb(r)) or wm.backup_schema_signature(r.name)<>r.signature then raise exception 'Restore schema changed';end if;
 if r.classification='excluded' then continue;end if;
 execute format('select coalesce(jsonb_agg(rowdata order by rowdata),''[]'') from (select (to_jsonb(x)-$2)::text rowdata from wm.%I x where %s limit 20001) s',r.name,r.predicate_sql) into rows using org,r.redacted;
 if jsonb_array_length(rows)>20000 or octet_length(rows::text)>8388608 then raise exception 'Restore baseline limit';end if;
 allrows:=allrows||jsonb_build_object(r.name,wm.hash_json(rows));
 end loop;return wm.hash_json(allrows);
end $$;
create function public.wm_restore_request(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;g wm.tenant_guards;begin
 perform wm_restore.operator(p_org);
 if p_input is null or jsonb_typeof(p_input)<>'object' or (select count(*) from jsonb_object_keys(p_input))<>2 or not p_input ?& array['manifest_pointer','expected_generation'] or p_key !~ '^[A-Za-z0-9_-]{16,200}$' or octet_length(p_input::text)>8192 or p_input#>>'{manifest_pointer,context,organization_id}' is distinct from p_org::text or p_input#>>'{manifest_pointer,context,type}'<>'tenant_backup_manifest' then raise exception 'Invalid restore request';end if;
 select * into j from wm_restore.runs where organization_id=p_org and request_key=p_key;
 if found then if j.input_hash<>wm.hash_json(p_input) then raise exception 'Restore key conflict';end if;return to_jsonb(j)-'plan';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 if g.external_generation<>p_input->>'expected_generation' or exists(select 1 from wm_restore.runs where organization_id=p_org and state in ('requested','ready','promotion_authorized','promoted_pending_receipt')) then raise exception 'Restore baseline changed or active restore exists';end if;
 insert into wm_restore.runs(organization_id,requested_by,session_id,request_grant_digest,request_key,input_hash,manifest_pointer,old_generation,generation,recovery_generation)
 values(p_org,auth.uid(),(wm.claims()->>'session_id')::uuid,wm.backup_actor_digest(p_org,auth.uid()),p_key,wm.hash_json(p_input),p_input->'manifest_pointer',g.external_generation,gen_random_uuid()::text,g.recovery_generation+1) returning * into j;
 update wm.tenant_guards set access_state='restricted',positive_effects_allowed=false,external_generation=j.generation,recovery_generation=j.recovery_generation,authority_version=authority_version+1 where organization_id=p_org;
 return to_jsonb(j)-'plan';
end $$;
create function public.wm_restore_context(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;begin
 select * into j from wm_restore.runs where organization_id=p_org and id=p_id; if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);return to_jsonb(j);
end $$;
create function public.wm_restore_stage(p_org uuid,p_id uuid,p_snapshot text,p_manifest jsonb,p_proof jsonb,p_files jsonb) returns jsonb language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare j wm_restore.runs;s jsonb;r record;entry jsonb;rowdata jsonb;cols text;cnt integer;total integer:=0;preview jsonb:='[]';vplan jsonb;vbaseline text;cov jsonb;pr jsonb;expected_files jsonb;begin
 select * into j from wm_restore.runs where organization_id=p_org and id=p_id for update;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 if j.state<>'requested' then raise exception 'Restore already staged';end if;
 begin
 if p_snapshot is null or p_manifest is null or jsonb_typeof(p_manifest)<>'object' or p_proof is null or jsonb_typeof(p_proof)<>'object' or p_files is null or jsonb_typeof(p_files)<>'array' then raise exception 'Restore typed evidence required';end if;
 if octet_length(p_snapshot)>16777216 or octet_length(p_manifest::text)>2097152 or octet_length(p_proof::text)>1048576 then raise exception 'Restore size limit';end if;
 s:=p_snapshot::jsonb;
 if s->>'format'<>'wm-tenant-backup/1' or s->>'organization_id' is distinct from p_org::text or p_manifest->>'organization_id' is distinct from p_org::text
 or p_manifest->>'snapshot_digest' is distinct from encode(sha256(convert_to(p_snapshot,'UTF8')),'hex') or p_manifest->>'restore_authority'<>'none' then raise exception 'Restore snapshot binding';end if;
 if p_proof->>'organization_id' is distinct from p_org::text or p_proof->>'generation' is distinct from j.generation or p_proof->>'run_id' is distinct from j.id::text
 or p_proof->>'complete'<>'true' or (p_proof->>'valid_until')::timestamptz<=clock_timestamp() or (p_proof->>'valid_until')::timestamptz>clock_timestamp()+interval '15 minutes'
 or not p_proof ?& array['tombstones','holds','revoked_users','withdrawn_approvals','checkpoint_digest','head'] then raise exception 'Latest independent proof required';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='wm' and c.relkind in ('r','p') and not exists(select 1 from wm_restore.registry where name=c.relname)) then raise exception 'Unsupported restore schema family';end if;
 if (select count(*) from jsonb_array_elements(p_manifest->'coverage'))<>(select count(*) from wm_restore.registry)
 or (select count(distinct v->>'table') from jsonb_array_elements(p_manifest->'coverage') v)<>(select count(*) from wm_restore.registry) then raise exception 'Restore coverage incomplete';end if;
 if (select count(*) from jsonb_object_keys(s->'tables'))<>(select count(*) from wm_restore.registry where classification<>'excluded') then raise exception 'Restore tables incomplete';end if;
 for r in select * from wm_restore.registry order by name loop
 select v into cov from jsonb_array_elements(p_manifest->'coverage') v where v->>'table'=r.name;
 if not exists(select 1 from wm.tenant_backup_registry b where to_jsonb(b)=to_jsonb(r)) then raise exception 'Restore registry classification changed';end if;
 if cov is null or cov->>'signature' is distinct from r.signature or wm.backup_schema_signature(r.name)<>r.signature or cov->>'classification' is distinct from r.classification then raise exception 'Restore schema coverage mismatch: %',r.name;end if;
 if r.classification='excluded' then if s->'tables' ? r.name then raise exception 'Excluded restore family';end if;continue;end if;
 if jsonb_typeof(s->'tables'->r.name)<>'array' or (cov->>'rows')::integer<>jsonb_array_length(s->'tables'->r.name) then raise exception 'Restore row coverage';end if;
 total:=total+jsonb_array_length(s->'tables'->r.name);if total>20000 then raise exception 'Restore row limit';end if;
 select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute where attrelid=to_regclass('wm.'||quote_ident(r.name)) and attnum>0 and not attisdropped;
 for entry in select value from jsonb_array_elements(s->'tables'->r.name) loop
 if jsonb_typeof(entry)<>'string' then raise exception 'Restore exact row text required';end if;
 rowdata:=(entry#>>'{}')::jsonb;
 if rowdata ?| r.redacted then raise exception 'Restore credential material excluded';end if;
 if exists(select 1 from jsonb_object_keys(rowdata) k where not exists(select 1 from pg_attribute where attrelid=to_regclass('wm.'||quote_ident(r.name)) and attnum>0 and not attisdropped and attname=k)) then raise exception 'Restore unknown row field';end if;
 if rowdata ? 'organization_id' and rowdata->>'organization_id' is distinct from p_org::text then raise exception 'Restore cross tenant';end if;
 if r.name='organizations' and rowdata->>'id' is distinct from p_org::text then raise exception 'Restore cross tenant';end if;
 -- Related global records must still be exact currently scoped dependencies.
 if not rowdata ? 'organization_id' and r.name<>'organizations' then
 execute format('select count(*) from wm.%I x where (%s) and (to_jsonb(x)-$2)=$3',r.name,r.predicate_sql) into cnt using p_org,r.redacted,rowdata;
 if cnt<>1 then raise exception 'Unsupported missing or changed global dependency: %',r.name;end if;
 end if;
 execute format('insert into wm_restore.%I(recovery_run,%s) select $1,%s from jsonb_populate_record(null::wm.%I,$2)',r.name,cols,cols,r.name) using j.id,rowdata;
 end loop;
 preview:=preview||jsonb_build_array(jsonb_build_object('family',r.name,'rows',jsonb_array_length(s->'tables'->r.name),'action','isolated typed import; no live replacement'));
 end loop;
 -- Actual FK validation across all typed replicas; no disabled constraints/triggers.
 set constraints all immediate;
 -- Authority is permanently inert in this namespace; original facts remain in encrypted backup.
 update wm_restore.memberships set status='revoked',revoked_at=coalesce(revoked_at,clock_timestamp()) where recovery_run=j.id;
 update wm_restore.operator_assignments set revoked_at=coalesce(revoked_at,clock_timestamp()),capabilities='{}' where recovery_run=j.id;
 update wm_restore.engagement_authorities set revoked_at=coalesce(revoked_at,clock_timestamp()) where recovery_run=j.id;
 update wm_restore.tenant_guards set access_state='restricted',positive_effects_allowed=false,external_generation=j.generation,recovery_generation=j.recovery_generation where recovery_run=j.id;
 update wm_restore.messages set body='[Retained deletion tombstone]',provider_message_id=null where recovery_run=j.id and p_proof->'tombstones' ? ('message:'||id);
 update wm_restore.requests set outcome='[Retained deletion tombstone]',accepted_scope=null,coverage=null,waiting_reason='Deleted by retained policy' where recovery_run=j.id and p_proof->'tombstones' ? ('request:'||id);
 update wm_restore.attachments set original_name='retained-deletion-tombstone',deleted_at=coalesce(deleted_at,clock_timestamp()) where recovery_run=j.id and p_proof->'tombstones' ? ('workspace:'||id);
 -- Source descriptors must be the exact committed objects of the typed rows.
 select coalesce(jsonb_agg(f order by f->>'id'),'[]') into expected_files from (
 select jsonb_build_object('id','workspace:'||a.id,'version',a.version::text,'backend','supabase','bucket',case when a.sealed_object_key is null then 'workspace-quarantine' else 'workspace-sealed' end,'key',coalesce(a.sealed_object_key,a.upload_object_key),'bytes',a.actual_bytes::text,'sha256',a.checksum,'state',a.scan_state) f
 from wm_restore.attachments a where a.recovery_run=j.id and a.checksum is not null and a.actual_bytes is not null
 and not exists(select 1 from wm_restore.retention_actions ra where ra.recovery_run=j.id and ra.organization_id=a.organization_id and ra.target_id=a.id and ra.target_type='file' and ra.state='purged' and ra.tombstone is not null and not ra.legal_hold)
 union all
 select jsonb_build_object('id','inbound:'||e.id||':'||(v->>'id'),'version',e.version::text,'backend','supabase','bucket','workspace-inbound','key',v->>'object_key','bytes',v->>'bytes','sha256',v->>'checksum','state',e.routing)
 from wm_restore.inbound_emails e join wm_restore.inbound_routes route on route.recovery_run=e.recovery_run and route.id=e.route_id cross join lateral jsonb_array_elements(e.attachments) v where e.recovery_run=j.id and route.organization_id=p_org and v->>'state'='stored_unscanned'
 union all
 select jsonb_build_object('id','export:'||id,'version',version::text,'backend',split_part(storage_target,':',1),'storage_target',storage_target,'bucket','workspace-customer-exports','key',object_key,'bytes',archive_bytes::text,'sha256',archive_digest,'state',state) from wm_restore.customer_exports where recovery_run=j.id and state='sealed'
 ) f where not exists(select 1 from wm_restore.retention_jobs retained where retained.recovery_run=j.id and retained.organization_id=p_org and retained.state='purged' and retained.inventory->>'bucket'=f->>'bucket' and retained.inventory->>'key'=f->>'key');
 if expected_files is distinct from p_manifest->'files' then raise exception 'Restore committed file coverage mismatch';end if;
 if exists(select 1 from jsonb_array_elements_text(p_proof->'tombstones') t where t !~ '^(workspace|inbound|export|message|request):[a-f0-9-]{36}(:[a-f0-9-]{36})?$') then raise exception 'Unsupported retention overlay family';end if;
 -- Latest purges remain tombstones. Do not copy or expose purged file bytes.
 if jsonb_array_length(p_files)<>jsonb_array_length(p_manifest->'files') then raise exception 'Restore file coverage';end if;
 for entry in select value from jsonb_array_elements(p_manifest->'files') loop
 select v into pr from jsonb_array_elements(p_files) v where v->>'source_id'=entry->>'id';
 if pr is null or pr->>'sha256' is distinct from entry->>'sha256' or pr->>'bytes' is distinct from entry->>'bytes'
 or (pr->>'disposition'='purged') is distinct from (p_proof->'tombstones' ? (entry->>'id')) then raise exception 'Restore file proof';end if;
 insert into wm_restore.file_proofs values(j.id,entry->>'id',entry->>'sha256',(entry->>'bytes')::bigint,pr->>'disposition',entry,coalesce(pr->'pointers','[]'));
 end loop;
 preview:='[]';
 for r in select * from wm_restore.registry where classification<>'excluded' order by name loop
 execute format('select wm.hash_json(coalesce(jsonb_agg(rowdata order by rowdata),''[]'')) from (select (to_jsonb(x)-''recovery_run'')::text rowdata from wm_restore.%I x where recovery_run=$1) q',r.name) into cols using j.id;
 preview:=preview||jsonb_build_array(jsonb_build_object('family',r.name,'rows',jsonb_array_length(s->'tables'->r.name),'candidate_sha256',cols,'action','isolated typed import; no live replacement'));
 end loop;
 vbaseline:=wm_restore.baseline(p_org);
 vplan:=jsonb_build_object('format','wm-tenant-restore/1','run_id',j.id,'organization_id',p_org,'generation',j.generation,'manifest_pointer',j.manifest_pointer,'baseline',vbaseline,'coverage',preview,'overlay',p_proof,'files',p_files,'mode','restricted_read_only','effects','never_replay','authority','current live operator only');
 update wm_restore.runs set state='ready',plan=vplan,plan_hash=wm.hash_json(vplan),baseline=vbaseline,proof_digest=p_proof->>'checkpoint_digest',version=version+1 where id=j.id;
 return jsonb_build_object('id',j.id,'state','ready','plan_hash',wm.hash_json(vplan),'preview',preview);
 exception when others then
 update wm_restore.runs set state='attention',reason=left(sqlerrm,180),version=version+1 where id=j.id;
 return jsonb_build_object('id',j.id,'state','attention','reason',left(sqlerrm,180));
 end;
end $$;
create function public.wm_restore_promote(p_org uuid,p_id uuid,p_hash text,p_version bigint,p_proof_digest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm_restore.runs;begin
 perform wm_restore.operator(p_org);select * into j from wm_restore.runs where organization_id=p_org and id=p_id for update;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 if p_version is null or p_version<1 or j.plan_hash is distinct from p_hash or j.proof_digest is distinct from p_proof_digest then raise exception 'Restore exact plan or proof changed';end if;
 if j.state in ('promotion_authorized','promoted_pending_receipt','promoted_read_only') then return jsonb_build_object('id',j.id,'state',j.state,'plan_hash',j.plan_hash);end if;
 if j.state<>'ready' or j.version<>p_version or wm_restore.baseline(p_org)<>j.baseline or (j.plan#>>'{overlay,valid_until}')::timestamptz<=clock_timestamp() then raise exception 'Restore stale plan baseline or proof';end if;
 update wm_restore.runs set state='promotion_authorized',approval_intent=jsonb_build_object('actor',auth.uid(),'session',(wm.claims()->>'session_id'),'grant_digest',wm.backup_actor_digest(p_org,auth.uid()),'authorized_at',clock_timestamp()),version=version+1 where id=j.id;
 return jsonb_build_object('id',j.id,'state','promotion_authorized','plan_hash',j.plan_hash);
end $$;
create function public.wm_restore_commit(p_org uuid,p_id uuid,p_hash text,p_proof_digest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm_restore.runs;begin
 select * into j from wm_restore.runs where id=p_id and organization_id=p_org for update;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 if j.plan_hash is distinct from p_hash or j.proof_digest is distinct from p_proof_digest then raise exception 'Restore exact plan changed';end if;
 if j.state in ('promoted_pending_receipt','promoted_read_only') then return jsonb_build_object('id',j.id,'state',j.state,'plan_hash',j.plan_hash);end if;
 if j.state<>'promotion_authorized' or wm_restore.baseline(p_org)<>j.baseline or (j.plan#>>'{overlay,valid_until}')::timestamptz<=clock_timestamp()
 or (j.approval_intent->>'authorized_at')::timestamptz<clock_timestamp()-interval '15 minutes'
 or not wm.owner_direct(p_org,(j.approval_intent->>'actor')::uuid,'recovery')
 or j.approval_intent->>'grant_digest' is distinct from wm.backup_actor_digest(p_org,(j.approval_intent->>'actor')::uuid)
 or not exists(select 1 from auth.sessions where id=(j.approval_intent->>'session')::uuid and user_id=(j.approval_intent->>'actor')::uuid and (not_after is null or not_after>clock_timestamp())) then raise exception 'Restore stale authority baseline or proof';end if;
 insert into wm_restore.active(organization_id,run_id,plan_hash) values(p_org,j.id,j.plan_hash) on conflict(organization_id) do update set run_id=excluded.run_id,plan_hash=excluded.plan_hash,promoted_at=now();
 update wm_restore.runs set state='promoted_pending_receipt',version=version+1 where id=j.id;
 return jsonb_build_object('id',j.id,'state','promoted_pending_receipt','plan_hash',j.plan_hash);
end $$;
create function public.wm_restore_receipt(p_org uuid,p_id uuid,p_hash text,p_receipt jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;begin
 select * into j from wm_restore.runs where organization_id=p_org and id=p_id for update;perform wm_restore.current(j);
 if j.state not in ('promoted_pending_receipt','promoted_read_only') or j.plan_hash is distinct from p_hash or p_receipt#>>'{context,type}'<>'tenant_restore_promotion' or p_receipt#>>'{context,run_id}' is distinct from j.id::text or p_receipt#>>'{context,plan_hash}' is distinct from j.plan_hash or p_receipt#>>'{context,external_generation}' is distinct from j.generation or p_receipt->>'ciphertext_digest' !~ '^[a-f0-9]{64}$' then raise exception 'Restore receipt binding';end if;
 if j.receipt is not null and j.receipt<>p_receipt then raise exception 'Restore receipt conflict';end if;
 update wm_restore.runs set state='promoted_read_only',receipt=p_receipt where id=j.id;
 return jsonb_build_object('id',j.id,'state','promoted_read_only','plan_hash',j.plan_hash);
end $$;
create function public.wm_restore_status(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm_restore.operator(p_org);return jsonb_build_object('items',coalesce((select jsonb_agg(v) from(select id,state,reason,version,created_at,expires_at,plan_hash,generation,plan from wm_restore.runs where organization_id=p_org order by created_at desc limit 20)v),'[]'));
end $$;
-- Fixed operator recovery projection, never a generic table or SQL endpoint.
create function public.wm_restore_view(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;begin
 select * into j from wm_restore.runs where id=p_id and organization_id=p_org;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 if (j.plan#>>'{overlay,valid_until}')::timestamptz<=clock_timestamp() or j.state<>'promoted_read_only' or not exists(select 1 from wm_restore.active where organization_id=p_org and run_id=j.id) then raise exception 'Restore receipt or promotion pending';end if;
 return jsonb_build_object('mode','restricted_read_only','run_id',j.id,'plan_hash',j.plan_hash,
 'engagements',coalesce((select jsonb_agg((to_jsonb(x)-'recovery_run')||'{"service_state":"paused","commercial_state":"attention"}'::jsonb) from wm_restore.engagements x where recovery_run=j.id),'[]'),
 'requests',coalesce((select jsonb_agg((to_jsonb(x)-'recovery_run')||'{"state":"waiting","waiting_reason":"Recovery: fresh authority and provider reconciliation required","current_revision_id":null}'::jsonb) from wm_restore.requests x where recovery_run=j.id and not (j.plan#>'{overlay,tombstones}') ? ('request:'||x.id)),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(x)-'recovery_run') from wm_restore.messages x where recovery_run=j.id and not (j.plan#>'{overlay,tombstones}') ? ('message:'||x.id)),'[]'),
 'files',coalesce((select jsonb_agg(jsonb_build_object('source_id',source_id,'sha256',sha256,'bytes',bytes,'disposition',disposition)) from wm_restore.file_proofs where run_id=j.id),'[]'),
 'facts',coalesce((select jsonb_agg((to_jsonb(x)-'recovery_run')||'{"recovery_status":"requires fresh confirmation"}'::jsonb) from wm_restore.business_facts x where recovery_run=j.id),'[]'),
 'provider_status','unverified; no automatic resume','customer_access','requires separate fresh workflow');
end $$;
create function wm_restore.protect_rows() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from wm_restore.runs where id=old.recovery_run and state<>'requested') then raise exception 'Restore candidate is immutable';end if;return case when tg_op='DELETE' then old else new end;
end $$;
create function wm_restore.protect_run() returns trigger language plpgsql set search_path='' as $$begin
 if (new.organization_id,new.id,new.requested_by,new.session_id,new.request_grant_digest,new.manifest_pointer,new.generation,new.old_generation,new.recovery_generation,new.input_hash,new.request_key,new.created_at,new.expires_at) is distinct from (old.organization_id,old.id,old.requested_by,old.session_id,old.request_grant_digest,old.manifest_pointer,old.generation,old.old_generation,old.recovery_generation,old.input_hash,old.request_key,old.created_at,old.expires_at)
 or old.approval_intent is not null and new.approval_intent is distinct from old.approval_intent
 or old.plan is not null and (new.plan,new.plan_hash,new.baseline,new.proof_digest) is distinct from (old.plan,old.plan_hash,old.baseline,old.proof_digest) then raise exception 'Restore plan immutable';end if;return new;
end $$;
create trigger immutable_plan before update on wm_restore.runs for each row execute function wm_restore.protect_run();
create trigger immutable_file_proof before update or delete on wm_restore.file_proofs for each row execute function wm_restore.immutable();
do $$declare r record;begin
 for r in select name from wm_restore.registry where classification<>'excluded' loop execute format('create trigger immutable_candidate before update or delete on wm_restore.%I for each row execute function wm_restore.protect_rows()',r.name);end loop;
 for r in select tablename from pg_tables where schemaname='wm_restore' loop execute format('alter table wm_restore.%I enable row level security',r.tablename);execute format('revoke all on wm_restore.%I from public,anon,authenticated,service_role',r.tablename);end loop;
end $$;
revoke all on all functions in schema wm_restore from public,anon,authenticated,service_role;
revoke all on function public.wm_restore_request(uuid,jsonb,text),public.wm_restore_context(uuid,uuid),public.wm_restore_stage(uuid,uuid,text,jsonb,jsonb,jsonb),public.wm_restore_promote(uuid,uuid,text,bigint,text),public.wm_restore_receipt(uuid,uuid,text,jsonb),public.wm_restore_status(uuid),public.wm_restore_view(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_restore_request(uuid,jsonb,text),public.wm_restore_promote(uuid,uuid,text,bigint,text),public.wm_restore_status(uuid) to authenticated;
grant execute on function public.wm_restore_view(uuid,uuid) to service_role;
revoke all on function public.wm_restore_commit(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_restore_commit(uuid,uuid,text,text) to service_role;
grant execute on function public.wm_restore_context(uuid,uuid),public.wm_restore_stage(uuid,uuid,text,jsonb,jsonb,jsonb),public.wm_restore_receipt(uuid,uuid,text,jsonb) to service_role;
create function public.wm_restore_abandon(p_org uuid,p_id uuid,p_version bigint) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;begin
 perform wm_restore.operator(p_org);select * into j from wm_restore.runs where id=p_id and organization_id=p_org for update;
 if not found or p_version is null or p_version<1 or j.version<>p_version or j.state not in ('requested','ready','promotion_authorized','attention') then raise exception 'Restore cannot be abandoned after commit or stale version';end if;
 update wm_restore.runs set state='attention',reason='Abandoned by current recovery operator; restrictions retained',version=version+1 where id=j.id;
 return jsonb_build_object('id',j.id,'state','attention');
end $$;
revoke all on function public.wm_restore_abandon(uuid,uuid,bigint) from public,anon,authenticated,service_role;
grant execute on function public.wm_restore_abandon(uuid,uuid,bigint) to authenticated;

create function public.wm_restore_records(p_org uuid,p_id uuid,p_family text,p_offset integer default 0) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm_restore.runs;result jsonb;total bigint;begin
 select * into j from wm_restore.runs where id=p_id and organization_id=p_org;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 if p_offset is null or p_offset<0 or p_offset>20000 or j.state not in ('ready','promotion_authorized','promoted_read_only')
 or (j.plan#>>'{overlay,valid_until}')::timestamptz<=clock_timestamp()
 or not exists(select 1 from wm_restore.registry where name=p_family and classification<>'excluded') then raise exception 'Restore preview unavailable';end if;
 execute format('select count(*) from wm_restore.%I where recovery_run=$1',p_family) into total using j.id;
 execute format('select coalesce(jsonb_agg(rowdata),''[]'') from (select (to_jsonb(x)-''recovery_run'')::text rowdata from wm_restore.%I x where recovery_run=$1 order by rowdata limit 100 offset $2) q',p_family) into result using j.id,p_offset;
 return jsonb_build_object('family',p_family,'plan_hash',j.plan_hash,'offset',p_offset,'total',total,'rows',result,'next_offset',case when p_offset+100<total then p_offset+100 else null end,'mode','inert historical recovery data; no execution authority');
end $$;
revoke all on function public.wm_restore_records(uuid,uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.wm_restore_records(uuid,uuid,text,integer) to service_role;

commit;
