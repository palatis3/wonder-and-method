begin;
-- Explicit addition of checkpoint history. Standing setup is historical only
-- in the isolated namespace, and cannot enroll a publisher or source attester.
do $$declare names text[]:=array['checkpoint_setups','checkpoint_publications'];r record;c record;cols text;refcols text;target text;begin
 if exists(select 1 from wm_restore.runs) then raise exception 'Schema amendment requires no existing recovery candidates';end if;
 insert into wm_restore.registry select * from wm.tenant_backup_registry where name=any(names);
 for r in select * from wm_restore.registry where name=any(names) loop
  execute format('create table wm_restore.%I (recovery_run uuid not null references wm_restore.runs(id),like wm.%I including constraints)',r.name,r.name);
  for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype in ('p','u') loop
   select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
   execute format('alter table wm_restore.%I add unique(recovery_run,%s)',r.name,cols);
  end loop;
 end loop;
 for r in select * from wm_restore.registry where name=any(names) loop
  for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype='f' loop
   select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
   select string_agg(quote_ident(a.attname),',' order by k.ord) into refcols from unnest(c.confkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n;
   select relname into target from pg_class where oid=c.confrelid;
   if exists(select 1 from wm_restore.registry where name=target and classification<>'excluded') then execute format('alter table wm_restore.%I add foreign key(recovery_run,%s) references wm_restore.%I(recovery_run,%s) deferrable initially deferred',r.name,cols,target,refcols);
   else execute format('alter table wm_restore.%I add foreign key(%s) references %s(%s) deferrable initially deferred',r.name,cols,c.confrelid::regclass,refcols);end if;
  end loop;
  execute format('create trigger immutable_candidate before update or delete on wm_restore.%I for each row execute function wm_restore.protect_rows()',r.name);
  execute format('alter table wm_restore.%I enable row level security',r.name);execute format('revoke all on wm_restore.%I from public,anon,authenticated,service_role',r.name);
 end loop;
end $$;

-- The original applied signature describes columns. Add a separate immutable
-- integrity profile, including constraint definitions and partial/expression
-- unique indexes. Nonunique performance indexes do not change logical data.
create function wm_restore.integrity_signature(p_name text) returns text language sql stable security definer set search_path='' as $$
 select wm.hash_json(jsonb_build_object(
 'columns',(select coalesce(jsonb_agg(jsonb_build_array(a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod),a.attnotnull) order by a.attnum),'[]') from pg_attribute a where a.attrelid=to_regclass('wm.'||quote_ident(p_name)) and a.attnum>0 and not a.attisdropped),
 'constraints',(select coalesce(jsonb_agg(v order by v::text),'[]') from (select jsonb_build_array(c.contype,c.convalidated,pg_get_constraintdef(c.oid,false)) v from pg_constraint c where c.conrelid=to_regclass('wm.'||quote_ident(p_name))) s),
 'unique_indexes',(select coalesce(jsonb_agg(v order by v::text),'[]') from (select jsonb_build_array(i.indisvalid,i.indisready,i.indislive,pg_get_indexdef(i.indexrelid,0,false)) v from pg_index i where i.indrelid=to_regclass('wm.'||quote_ident(p_name)) and i.indisunique) s)))
$$;
create function wm_restore.integrity_profile() returns text language sql immutable set search_path='' as $$select 'recovery-integrity-v1'::text$$;
create table wm_restore.integrity_registry(profile text not null,name text not null,signature text not null,primary key(profile,name));
insert into wm_restore.integrity_registry select wm_restore.integrity_profile(),name,wm_restore.integrity_signature(name) from wm.tenant_backup_registry;
alter table wm_restore.integrity_registry enable row level security;
revoke all on wm_restore.integrity_registry from public,anon,authenticated,service_role;
create trigger immutable_integrity_profile before update or delete on wm_restore.integrity_registry for each row execute function wm_restore.immutable();
create function wm_restore.integrity_current() returns void language plpgsql stable security definer set search_path='' as $$begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='wm' and c.relkind in ('r','p') and not exists(select 1 from wm_restore.integrity_registry r where r.profile=wm_restore.integrity_profile() and r.name=c.relname))
 or exists(select 1 from wm_restore.integrity_registry r where r.profile=wm_restore.integrity_profile() and (to_regclass('wm.'||quote_ident(r.name)) is null or wm_restore.integrity_signature(r.name) is distinct from r.signature)) then raise exception 'Recovery constraint or unique-index schema changed';end if;
end $$;
alter function wm.backup_snapshot(uuid) rename to backup_snapshot_before_integrity;
create function wm.backup_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare s jsonb;begin
 s:=wm.backup_snapshot_before_integrity(org);perform wm_restore.integrity_current();return s;
end $$;
alter function wm_restore.baseline(uuid) rename to baseline_before_integrity;
create function wm_restore.baseline(org uuid) returns text language plpgsql stable security definer set search_path='' as $$begin
 perform wm_restore.integrity_current();return wm_restore.baseline_before_integrity(org);
end $$;
alter function public.wm_restore_stage(uuid,uuid,text,jsonb,jsonb,jsonb) rename to wm_restore_stage_before_integrity;
create function public.wm_restore_stage(p_org uuid,p_id uuid,p_snapshot text,p_manifest jsonb,p_proof jsonb,p_files jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare j wm_restore.runs;r jsonb;begin
 perform wm.require_machine();select * into j from wm_restore.runs where organization_id=p_org and id=p_id;if not found then raise exception 'Restore unavailable';end if;perform wm_restore.current(j);
 begin
  r:=public.wm_restore_stage_before_integrity(p_org,p_id,p_snapshot,p_manifest,p_proof,p_files);
  if r->>'state'='ready' then perform wm_restore.integrity_current();end if;return r;
 exception when others then
  update wm_restore.runs set state='attention',reason=left(sqlerrm,180),version=version+1 where organization_id=p_org and id=p_id;
  return jsonb_build_object('id',p_id,'state','attention','reason',left(sqlerrm,180));
 end;
end $$;
alter function public.wm_checkpoint_source(uuid) rename to wm_checkpoint_source_before_integrity;
create function public.wm_checkpoint_source(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform wm_restore.integrity_current();return public.wm_checkpoint_source_before_integrity(p_org);
end $$;
revoke all on function wm_restore.integrity_signature(text),wm_restore.integrity_profile(),wm_restore.integrity_current(),wm.backup_snapshot(uuid),wm.backup_snapshot_before_integrity(uuid),wm_restore.baseline(uuid),wm_restore.baseline_before_integrity(uuid),public.wm_restore_stage_before_integrity(uuid,uuid,text,jsonb,jsonb,jsonb),public.wm_restore_stage(uuid,uuid,text,jsonb,jsonb,jsonb),public.wm_checkpoint_source(uuid),public.wm_checkpoint_source_before_integrity(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_restore_stage(uuid,uuid,text,jsonb,jsonb,jsonb),public.wm_checkpoint_source(uuid) to service_role;
commit;
