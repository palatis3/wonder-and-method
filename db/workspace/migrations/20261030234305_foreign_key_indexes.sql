begin;
-- Index foreign-key lookup prefixes. Existing covering unique/composite indexes
-- are retained; no production index is dropped based on empty staging usage.
do $$
declare fk record; cols text;
begin
  for fk in select c.oid,c.conrelid,c.conname,c.conkey,n.nspname,t.relname
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname='wm'
  loop
    if not exists(select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid and i.indpred is null and
      (select array_agg(k.attnum order by k.ordinality) from unnest(i.indkey::smallint[]) with ordinality k(attnum,ordinality) where k.ordinality<=cardinality(fk.conkey))=fk.conkey) then
      select string_agg(quote_ident(a.attname),',' order by k.ordinality) into cols from unnest(fk.conkey) with ordinality k(attnum,ordinality) join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.attnum;
      execute format('create index %I on %I.%I (%s)','fk_'||substr(md5(fk.relname||':'||fk.conname),1,24),fk.nspname,fk.relname,cols);
    end if;
  end loop;
end $$;
commit;
