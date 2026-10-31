begin;
-- A charge is refundable only after a provider read binds it to an existing
-- invoice, customer, account and business. User input is only a lookup request.
create table wm.charge_bindings(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),obligation_id uuid not null,payment_reference_id uuid,
 charge_id text not null check(charge_id ~ '^ch_[A-Za-z0-9]+$'),state text not null default 'requested',
 captured_minor bigint,refunded_minor bigint,disputed boolean,observed_at timestamptz,version bigint not null default 1,
 primary key(organization_id,id),unique(organization_id,obligation_id,charge_id),
 foreign key(organization_id,obligation_id) references wm.billing_obligations(organization_id,id),
 foreign key(organization_id,payment_reference_id) references wm.payment_references(organization_id,id)
);
create unique index one_verified_charge_binding on wm.charge_bindings(organization_id,charge_id) where payment_reference_id is not null;
alter table wm.charge_bindings enable row level security;
revoke all on wm.charge_bindings from public,anon,authenticated;
alter table wm.financial_adjustments add column charge_binding_id uuid,
 add column tax_evidence text,add column observed_at timestamptz,
 add column readback_lease uuid,add column readback_until timestamptz,add column last_check_at timestamptz,add column claimed_request_at timestamptz,
 add foreign key(organization_id,charge_binding_id) references wm.charge_bindings(organization_id,id);

alter function public.wm_billing_command(uuid,text,jsonb,text) rename to wm_billing_command_before_adjustments;
revoke all on function public.wm_billing_command_before_adjustments(uuid,text,jsonb,text) from public,anon,authenticated;
create function public.wm_billing_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;o wm.billing_obligations;b wm.charge_bindings;f wm.financial_adjustments;rid uuid;op uuid;n bigint;held bigint;returned bigint;
begin
 if p_command not in ('billing.check_charge','billing.refund') then return public.wm_billing_command_before_adjustments(p_org,p_command,p_input,p_key);end if;
 perform wm.require_access(p_org,'finance');perform wm.require_recent_auth();
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='billing.check_charge' then
  perform wm.check_input(p_input,array['obligation_id','charge_reference','expected_version'],array['obligation_id','charge_reference','expected_version']);
  select * into o from wm.billing_obligations where organization_id=p_org and id=(p_input->>'obligation_id')::uuid for update;
  if not found or o.invoice_id is null then raise exception 'Mapped invoice required' using errcode='42501';end if;
  perform wm.check_version(o.version,(p_input->>'expected_version')::bigint);
  if p_input->>'charge_reference' !~ '^ch_[A-Za-z0-9]+$' then raise exception 'Check the Stripe charge reference' using errcode='22023';end if;
  insert into wm.charge_bindings(organization_id,obligation_id,charge_id) values(p_org,o.id,p_input->>'charge_reference') on conflict do nothing;
  select * into b from wm.charge_bindings where organization_id=p_org and obligation_id=o.id and charge_id=p_input->>'charge_reference' for update;
  rid:=b.id;op:=wm.enqueue(p_org,o.engagement_id,null,null,null,'stripe_charge_read',jsonb_build_object('binding_id',b.id),false,'charge-read:'||b.id||':'||b.version,auth.uid());
  result:=jsonb_build_object('id',rid,'version',b.version,'operation_id',op);
 else
  perform wm.check_input(p_input,array['charge_binding_id','expected_version','amount_minor','reason','tax_evidence'],array['charge_binding_id','expected_version','amount_minor','reason','tax_evidence']);
  select * into b from wm.charge_bindings where organization_id=p_org and id=(p_input->>'charge_binding_id')::uuid for update;
  if not found or b.state<>'verified' or b.disputed is distinct from false or b.observed_at<now()-interval '1 day' then raise exception 'Verify the undisputed charge before refunding' using errcode='42501';end if;
  perform wm.check_version(b.version,(p_input->>'expected_version')::bigint);
  select * into o from wm.billing_obligations where organization_id=p_org and id=b.obligation_id;
  n:=(p_input->>'amount_minor')::bigint;
  select coalesce(sum(amount_minor) filter(where state not in ('failed','canceled')),0),coalesce(sum(amount_minor) filter(where state='succeeded'),0) into held,returned from wm.financial_adjustments where organization_id=p_org and charge_binding_id=b.id;
  if n is null or n<=0 or n>b.captured_minor-held-greatest(0,b.refunded_minor-returned) then raise exception 'Refund exceeds the unreserved charge balance' using errcode='22023';end if;
  perform wm.require_text(p_input->>'reason','refund reason');perform wm.require_text(p_input->>'tax_evidence','tax and credit-note treatment');
  rid:=gen_random_uuid();op:=wm.enqueue(p_org,o.engagement_id,null,null,null,'stripe_refund_create',jsonb_build_object('adjustment_id',rid),false,'refund:'||rid,auth.uid());
  insert into wm.financial_adjustments(organization_id,id,engagement_id,payment_reference_id,operation_id,amount_minor,currency,reason,authorized_by,charge_binding_id,tax_evidence)
   values(p_org,rid,o.engagement_id,b.payment_reference_id,op,n,o.currency,p_input->>'reason',auth.uid(),b.id,p_input->>'tax_evidence');
  update wm.charge_bindings set version=version+1 where organization_id=p_org and id=b.id;
  perform wm.critical(p_org,'refund.authorized',rid,jsonb_build_object('charge_id',b.charge_id,'amount_minor',n,'currency',o.currency,'reason',p_input->>'reason','tax_evidence',p_input->>'tax_evidence','authorized_by',auth.uid()));
  result:=jsonb_build_object('id',rid,'version',1,'operation_id',op);
 end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,result,rid);
end $$;

alter function wm.billing_context(uuid,wm.operations) rename to billing_context_before_adjustments;
create function wm.billing_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare b wm.charge_bindings;f wm.financial_adjustments;o wm.billing_obligations;acct wm.billing_accounts;g wm.tenant_guards;
begin
 if op.kind not in ('stripe_charge_read','stripe_refund_create') then return wm.billing_context_before_adjustments(org,op);end if;
 select * into g from wm.tenant_guards where organization_id=org for update;
 if op.kind='stripe_refund_create' then
  select * into f from wm.financial_adjustments where organization_id=org and id=(op.payload->>'adjustment_id')::uuid;
  select * into b from wm.charge_bindings where organization_id=org and id=f.charge_binding_id;
  if f.id is null or f.state<>'pending' or b.state<>'verified' or b.disputed is distinct from false then raise exception 'Refund authority unavailable' using errcode='42501';end if;
 else select * into b from wm.charge_bindings where organization_id=org and id=(op.payload->>'binding_id')::uuid;end if;
 select * into o from wm.billing_obligations where organization_id=org and id=b.obligation_id;
 select * into acct from wm.billing_accounts where organization_id=org;
 if o.id is null or acct.generation is distinct from o.account_generation or acct.environment<>o.environment or acct.account_id<>o.account_id or acct.customer_id<>o.customer_id or not g.positive_effects_allowed or g.access_state<>'open' or op.authority_version<>g.authority_version then raise exception 'Current financial authority unavailable' using errcode='42501';end if;
 if not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=op.actor_id and revoked_at is null and active_until>now() and capabilities&&array['finance','admin']) then raise exception 'Finance operator no longer assigned' using errcode='42501';end if;
 if exists(select 1 from wm.critical_receipts where organization_id=org and durability_status<>'durable') then raise exception 'Independent financial evidence is pending' using errcode='42501';end if;
 return to_jsonb(o)||jsonb_build_object('binding_id',b.id,'binding_version',b.version,'charge_id',b.charge_id,'adjustment_id',f.id,'refund_minor',f.amount_minor);
end $$;

alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_adjustments;
revoke all on function public.wm_attempt_resolve_before_adjustments(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations;a wm.operation_attempts;c jsonb;b wm.charge_bindings;f wm.financial_adjustments;result jsonb;ref uuid;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into op from wm.operations where organization_id=p_org and id=a.operation_id;
 if op.kind not in ('stripe_charge_read','stripe_refund_create') or op.id is null then return public.wm_attempt_resolve_before_adjustments(p_org,p_attempt,p_nonce,p_proof);end if;
 c:=a.dispatch_context;
 if p_proof->>'binding_id' is distinct from c->>'binding_id' or p_proof->>'charge_id' is distinct from c->>'charge_id' or p_proof->>'customer_id' is distinct from c->>'customer_id' or p_proof->>'environment' is distinct from c->>'environment' or p_proof->>'account_id' is distinct from c->>'account_id' or p_proof->>'currency' is distinct from c->>'currency' then raise exception 'Financial readback binding mismatch' using errcode='22023';end if;
 select * into b from wm.charge_bindings where organization_id=p_org and id=(c->>'binding_id')::uuid for update;
 if op.kind='stripe_refund_create' then
  select * into f from wm.financial_adjustments where organization_id=p_org and id=(c->>'adjustment_id')::uuid for update;
  if p_proof->>'adjustment_id' is distinct from f.id::text or (p_proof->>'amount_minor')::bigint is distinct from f.amount_minor or p_proof->>'provider_reference' !~ '^re_[A-Za-z0-9]+$' or p_proof->>'state' not in ('pending','requires_action','succeeded','failed','canceled') then raise exception 'Refund readback mismatch' using errcode='22023';end if;
 else
  if p_proof->>'provider_reference' is distinct from b.charge_id or (p_proof->>'captured_minor')::bigint<0 or (p_proof->>'refunded_minor')::bigint<0 or (p_proof->>'refunded_minor')::bigint>(p_proof->>'captured_minor')::bigint or jsonb_typeof(p_proof->'captured_minor') is distinct from 'number' or jsonb_typeof(p_proof->'refunded_minor') is distinct from 'number' or jsonb_typeof(p_proof->'disputed') is distinct from 'boolean' then raise exception 'Charge readback mismatch' using errcode='22023';end if;
 end if;
 -- Bypass invoice-specific projection, retaining the shared immutable attempt resolver.
 result:=public.wm_attempt_resolve_before_billing(p_org,p_attempt,p_nonce,p_proof);
 if result->>'state'<>'verified' then return result;end if;
 if op.kind='stripe_charge_read' then
  if b.version is distinct from (c->>'binding_version')::bigint then return result||jsonb_build_object('state','superseded','current',false);end if;
  insert into wm.payment_references(organization_id,engagement_id,environment,account_id,object_type,external_id,observed_state,amount_minor,currency,observed_at)
   values(p_org,op.engagement_id,c->>'environment',c->>'account_id','charge',b.charge_id,'succeeded',(p_proof->>'captured_minor')::bigint,c->>'currency',(p_proof->>'observed_at')::timestamptz)
   on conflict(provider,environment,account_id,object_type,external_id) do update set observed_state=excluded.observed_state,amount_minor=excluded.amount_minor,observed_at=excluded.observed_at,version=wm.payment_references.version+1
   where wm.payment_references.organization_id=excluded.organization_id and wm.payment_references.engagement_id=excluded.engagement_id returning id into ref;
  if ref is null then raise exception 'Charge belongs to a different service' using errcode='42501';end if;
  update wm.charge_bindings set payment_reference_id=ref,state='verified',captured_minor=(p_proof->>'captured_minor')::bigint,refunded_minor=(p_proof->>'refunded_minor')::bigint,disputed=(p_proof->>'disputed')::boolean,observed_at=(p_proof->>'observed_at')::timestamptz,version=version+1 where organization_id=p_org and id=b.id;
 else
  update wm.financial_adjustments set provider_id=p_proof->>'provider_reference',state=p_proof->>'state',observed_at=(p_proof->>'observed_at')::timestamptz,version=version+1 where organization_id=p_org and id=f.id;
  update wm.charge_bindings set state='needs_refresh',version=version+1 where organization_id=p_org and id=b.id;
  insert into wm.stripe_readbacks(environment,account_id,object_id,object_type) values(c->>'environment',c->>'account_id',p_proof->>'provider_reference','refund') on conflict(environment,account_id,object_id) do update set requested_at=clock_timestamp();
 end if;
 perform wm.critical(p_org,'financial.provider_verified',op.id,p_proof);
 return result;
end $$;

-- Read-only refreshes of known refunds continue after finance access is revoked.
create function public.wm_refunds_poll(p_environment text,p_account text,p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 perform wm.require_machine();
 with selected as (
  select f.organization_id,f.id from wm.financial_adjustments f
  join wm.charge_bindings b on b.organization_id=f.organization_id and b.id=f.charge_binding_id
  join wm.billing_obligations o on o.organization_id=b.organization_id and o.id=b.obligation_id
  left join wm.stripe_readbacks q on q.environment=o.environment and q.account_id=o.account_id and q.object_id=f.provider_id
  where o.environment=p_environment and o.account_id=p_account and f.provider_id is not null
   and (f.readback_until is null or f.readback_until<now())
   and (f.state in ('pending','requires_action') or (f.state='succeeded' and f.created_at>now()-interval '45 days') or q.observed_at is null or q.observed_at<q.requested_at)
   and (f.last_check_at is null or f.last_check_at<now()-interval '5 minutes' or q.requested_at>f.last_check_at)
  order by f.last_check_at nulls first,f.id for update of f skip locked limit least(greatest(p_limit,1),100)
 ), claimed as (
  update wm.financial_adjustments f set readback_lease=gen_random_uuid(),readback_until=now()+interval '2 minutes',last_check_at=clock_timestamp(),claimed_request_at=clock_timestamp()
   from selected x where f.organization_id=x.organization_id and f.id=x.id returning f.*
 ) select coalesce(jsonb_agg(jsonb_build_object('adjustment_id',f.id,'organization_id',f.organization_id,'provider_id',f.provider_id,'amount_minor',f.amount_minor,'currency',f.currency,'state',f.state,'charge_id',b.charge_id,'customer_id',o.customer_id,'environment',o.environment,'account_id',o.account_id,'binding_id',b.id,'readback_lease',f.readback_lease)),'[]') into result from claimed f join wm.charge_bindings b on b.organization_id=f.organization_id and b.id=f.charge_binding_id join wm.billing_obligations o on o.organization_id=b.organization_id and o.id=b.obligation_id;
 return result;
end $$;
create function public.wm_refund_observe(p_org uuid,p_adjustment uuid,p_lease uuid,p_refund jsonb) returns void language plpgsql volatile security definer set search_path='' as $$
declare f wm.financial_adjustments;b wm.charge_bindings;o wm.billing_obligations;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into f from wm.financial_adjustments where organization_id=p_org and id=p_adjustment for update;
 select * into b from wm.charge_bindings where organization_id=p_org and id=f.charge_binding_id;
 select * into o from wm.billing_obligations where organization_id=p_org and id=b.obligation_id;
 if f.id is null or f.readback_lease is distinct from p_lease or f.readback_until is null or f.readback_until<=now() or p_refund->>'id' is distinct from f.provider_id or p_refund->>'charge' is distinct from b.charge_id or (p_refund->>'amount')::bigint is distinct from f.amount_minor or p_refund->>'currency' is distinct from lower(f.currency) or (p_refund->>'livemode')::boolean is distinct from (o.environment='live') or p_refund->'metadata'->>'wm_adjustment' is distinct from f.id::text or p_refund->>'status' not in ('pending','requires_action','succeeded','failed','canceled') then raise exception 'Refund observation mismatch' using errcode='22023';end if;
 -- A successful refund may later be returned by the receiving bank. This is
 -- a fresh GET under a lease, not an older webhook snapshot or retry result.
 update wm.financial_adjustments set state=p_refund->>'status',observed_at=clock_timestamp(),readback_until=null,readback_lease=null,version=version+1 where organization_id=p_org and id=f.id;
 update wm.stripe_readbacks set observed_at=f.claimed_request_at,lease_until=null where environment=o.environment and account_id=o.account_id and object_id=f.provider_id;
 update wm.stripe_event_inbox set processed_at=clock_timestamp() where environment=o.environment and account_id=o.account_id and object_id=f.provider_id and received_at<=f.claimed_request_at;
 if f.state is distinct from p_refund->>'status' then
  update wm.charge_bindings set state='needs_refresh',version=version+1 where organization_id=p_org and id=b.id;
  perform wm.critical(p_org,'refund.observed',f.id,jsonb_build_object('provider_id',f.provider_id,'state',p_refund->>'status','amount_minor',f.amount_minor));
 end if;
end $$;

alter function public.wm_workspace(uuid) rename to wm_workspace_before_adjustments;
revoke all on function public.wm_workspace_before_adjustments(uuid) from public,anon,authenticated;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r jsonb;finance boolean;
begin
 r:=public.wm_workspace_before_adjustments(p_org);finance:=wm.operator_has(p_org,'finance') or wm.member_role(p_org)='customer_admin';
 return r||jsonb_build_object('charges',case when wm.operator_has(p_org,'finance') then (select coalesce(jsonb_agg(to_jsonb(b)),'[]') from wm.charge_bindings b where organization_id=p_org) else '[]'::jsonb end,'adjustments',case when finance then (select coalesce(jsonb_agg(to_jsonb(f)-'tax_evidence'-'authorized_by'),'[]') from wm.financial_adjustments f where organization_id=p_org) else '[]'::jsonb end);
end $$;
revoke all on all functions in schema wm from public,anon,authenticated;
revoke all on function public.wm_billing_command(uuid,text,jsonb,text),public.wm_workspace(uuid) from public,anon;
grant execute on function public.wm_billing_command(uuid,text,jsonb,text),public.wm_workspace(uuid) to authenticated;
revoke all on function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_refunds_poll(text,text,integer),public.wm_refund_observe(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_refunds_poll(text,text,integer),public.wm_refund_observe(uuid,uuid,uuid,jsonb) to service_role;
commit;
