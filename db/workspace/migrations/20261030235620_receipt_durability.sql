begin;
alter table wm.critical_receipts add column last_attempt_at timestamptz;
create function public.wm_receipts_pending(p_limit integer default 25) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
  perform wm.require_machine();
  if p_limit not between 1 and 100 then raise exception 'Invalid receipt batch' using errcode='22023';end if;
  -- One earliest unresolved receipt per tenant, with fair retries. A failing
  -- tenant cannot monopolize the batch or skip over a conflicted predecessor.
  with first_unresolved as (
    select distinct on (organization_id) * from wm.critical_receipts where durability_status<>'durable' order by organization_id,sequence
  ), chosen as (
    select id from first_unresolved where durability_status='pending' order by last_attempt_at nulls first,sequence limit p_limit
  ), attempted as (
    update wm.critical_receipts r set last_attempt_at=clock_timestamp() from chosen c where r.id=c.id returning r.*
  ) select coalesce(jsonb_agg(jsonb_build_object('organization_id',organization_id,'id',id,'sequence',sequence::text,'predecessor_id',predecessor_id,'event_type',event_type,'target_id',target_id,'payload',payload,'digest',digest,'external_generation',external_generation,'created_at',created_at) order by sequence),'[]') into result from attempted;
  return result;
end $$;
create function public.wm_receipt_persisted(p_org uuid,p_id uuid,p_digest text,p_generation text,p_key text,p_ciphertext_digest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;r wm.critical_receipts;
begin
  perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
  select * into r from wm.critical_receipts where organization_id=p_org and id=p_id for update;
  if not found or g.organization_id is null or r.digest is distinct from p_digest or r.external_generation is distinct from p_generation or g.external_generation is distinct from p_generation then raise exception 'Receipt identity or generation changed' using errcode='40001';end if;
  if p_key is distinct from 'receipts/'||p_org::text||'/'||p_generation||'/items/'||r.sequence::text||'-'||p_id::text||'.bin' or p_ciphertext_digest is null or p_ciphertext_digest !~ '^[a-f0-9]{64}$' then raise exception 'Invalid receipt evidence' using errcode='22023';end if;
  if r.durability_status='conflict' then raise exception 'Receipt requires reconciliation' using errcode='42501';end if;
  if r.predecessor_id is not null and not exists(select 1 from wm.critical_receipts where organization_id=p_org and id=r.predecessor_id and durability_status='durable') then raise exception 'Persist the preceding receipt first' using errcode='40001';end if;
  update wm.critical_receipts set durability_status='durable',external_key=p_key,persisted_at=coalesce(persisted_at,now()) where organization_id=p_org and id=p_id;
  return jsonb_build_object('id',p_id,'durability','durable');
end $$;
create function public.wm_receipt_conflict(p_org uuid,p_id uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
  perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
  update wm.critical_receipts set durability_status='conflict' where organization_id=p_org and id=p_id;
  update wm.tenant_guards set positive_effects_allowed=false where organization_id=p_org;
end $$;
revoke all on function public.wm_receipts_pending(integer),public.wm_receipt_persisted(uuid,uuid,text,text,text,text),public.wm_receipt_conflict(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wm_receipts_pending(integer),public.wm_receipt_persisted(uuid,uuid,text,text,text,text),public.wm_receipt_conflict(uuid,uuid) to service_role;
commit;
