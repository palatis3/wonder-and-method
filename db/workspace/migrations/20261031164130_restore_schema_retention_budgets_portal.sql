begin;
-- Explicit vetted additions only. Future unclassified tables still fail closed.
-- The types, NOT NULL/CHECK constraints, composite keys and deferred FKs come
-- from this migration's trusted local schema, never from a backup artifact.
do $$declare names text[]:=array['retention_jobs','retention_holds','retention_events','retention_durability','retention_commands','media_budget_pools','media_budget_decisions','media_budget_periods','media_budget_allocations','media_budget_commitments','media_budget_links','media_budget_operation_links','media_budget_spend_evidence','portal_bindings','portal_grants','portal_requests','portal_secrets','file_seal_writes','inbound_attachment_writes'];r record;c record;cols text;refcols text;target text;red text;begin
 if exists(select 1 from wm_restore.runs) then raise exception 'Restore schema amendment requires no existing candidate runs';end if;
 if exists(select 1 from wm.tenant_backup_registry b where not exists(select 1 from wm_restore.registry old where old.name=b.name) and not b.name=any(names)) then raise exception 'Unexpected restore schema addition';end if;
 if (select count(*) from wm.tenant_backup_registry where name=any(names))<>array_length(names,1) then raise exception 'Missing reviewed restore schema family';end if;
 insert into wm_restore.registry select * from wm.tenant_backup_registry where name=any(names);
 for r in select * from wm_restore.registry where name=any(names) and classification<>'excluded' loop
  execute format('create table wm_restore.%I (recovery_run uuid not null references wm_restore.runs(id),like wm.%I including constraints)',r.name,r.name);
  foreach red in array r.redacted loop execute format('alter table wm_restore.%I alter column %I drop not null',r.name,red);end loop;
  for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype in ('p','u') loop
   select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
   execute format('alter table wm_restore.%I add unique(recovery_run,%s)',r.name,cols);
  end loop;
 end loop;
 for r in select * from wm_restore.registry where name=any(names) and classification<>'excluded' loop
  for c in select * from pg_constraint where conrelid=to_regclass('wm.'||quote_ident(r.name)) and contype='f' loop
   select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(c.conkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n;
   select string_agg(quote_ident(a.attname),',' order by k.ord) into refcols from unnest(c.confkey) with ordinality k(n,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n;
   select relname into target from pg_class where oid=c.confrelid;
   if exists(select 1 from wm_restore.registry where name=target and classification<>'excluded') then execute format('alter table wm_restore.%I add foreign key(recovery_run,%s) references wm_restore.%I(recovery_run,%s) deferrable initially deferred',r.name,cols,target,refcols);
   else execute format('alter table wm_restore.%I add foreign key(%s) references %s(%s) deferrable initially deferred',r.name,cols,c.confrelid::regclass,refcols);end if;
  end loop;
  execute format('create trigger immutable_candidate before update or delete on wm_restore.%I for each row execute function wm_restore.protect_rows()',r.name);
  execute format('alter table wm_restore.%I enable row level security',r.name);
  execute format('revoke all on wm_restore.%I from public,anon,authenticated,service_role',r.name);
 end loop;
end $$;
-- Preserve vetted unique indexes with predicates/expressions as well as SQL
-- UNIQUE constraints. Each candidate run has its own identity namespace.
do $$declare i record;keys text;predicate text;begin
 for i in select x.indexrelid,x.indrelid,x.indnkeyatts,x.indpred,t.relname from pg_index x join pg_class t on t.oid=x.indrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='wm' and x.indisunique and not exists(select 1 from pg_constraint c where c.conindid=x.indexrelid) and exists(select 1 from wm_restore.registry r where r.name=t.relname and r.classification<>'excluded') loop
  select string_agg(pg_get_indexdef(i.indexrelid,k,true),',' order by k) into keys from generate_series(1,i.indnkeyatts) k;
  predicate:=pg_get_expr(i.indpred,i.indrelid);
  execute format('create unique index %I on wm_restore.%I(recovery_run,%s)%s','typed_unique_'||i.indexrelid,i.relname,keys,case when predicate is null then '' else ' where '||predicate end);
 end loop;
end $$;
commit;
