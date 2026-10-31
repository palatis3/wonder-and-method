begin;
alter table wm.engagements add column service_start_at timestamptz;
create table wm.billing_accounts(
 organization_id uuid primary key references wm.organizations(id),environment text not null check(environment in ('test','live')),
 account_id text not null check(account_id ~ '^acct_[A-Za-z0-9]+$'),customer_id text not null check(customer_id ~ '^cus_[A-Za-z0-9]+$'),
 automatic_tax boolean not null,tax_qualification text not null,verified_at timestamptz not null,generation bigint not null default 1,
 unique(environment,account_id,customer_id)
);
create table wm.billing_obligations(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),schedule_id uuid not null,engagement_id uuid not null,
 period_start timestamptz not null,period_end timestamptz not null,gross_minor bigint not null check(gross_minor>0),offset_minor bigint not null default 0,
 amount_minor bigint not null check(amount_minor>0),currency text not null check(currency='USD'),description text not null,
 environment text not null,account_id text not null,customer_id text not null,automatic_tax boolean not null,account_generation bigint not null,
 invoice_id text,invoice_item_id text,state text not null default 'prepared',provider_state text,amount_paid_minor bigint not null default 0,
 hosted_url text,observed_at timestamptz,authorized_by uuid not null,version bigint not null default 1,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,schedule_id,period_start),unique(environment,account_id,invoice_id),
 foreign key(organization_id,schedule_id) references wm.billing_schedules(organization_id,id),
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 check(period_end>period_start),check(amount_minor=gross_minor-offset_minor and offset_minor>=0)
);
create table wm.stripe_event_inbox(
 environment text not null,account_id text not null,event_id text not null,event_type text not null,object_id text not null,
 payload_digest text not null,received_at timestamptz not null default now(),processed_at timestamptz,
 primary key(environment,account_id,event_id)
);
create table wm.stripe_readbacks(
 environment text not null,account_id text not null,object_id text not null,object_type text not null,
 requested_at timestamptz not null default now(),claimed_request_at timestamptz,observed_at timestamptz,lease_until timestamptz,lease_generation bigint not null default 0,
 primary key(environment,account_id,object_id)
);
alter table wm.billing_accounts enable row level security;
alter table wm.billing_obligations enable row level security;
alter table wm.stripe_event_inbox enable row level security;
alter table wm.stripe_readbacks enable row level security;
revoke all on wm.billing_accounts,wm.billing_obligations,wm.stripe_event_inbox,wm.stripe_readbacks from public,anon,authenticated;

create function public.wm_billing_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;s wm.billing_schedules;a wm.agreements;e wm.engagements;acct wm.billing_accounts;o wm.billing_obligations;start_at timestamptz;end_at timestamptz;op uuid;
begin
 perform wm.require_access(p_org,'finance');perform wm.require_recent_auth();
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command<>'billing.prepare' then raise exception 'Unsupported billing action' using errcode='22023';end if;
 perform wm.check_input(p_input,array['schedule_id','expected_version'],array['schedule_id','expected_version']);
 select * into s from wm.billing_schedules where organization_id=p_org and id=(p_input->>'schedule_id')::uuid for update;
 if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;perform wm.check_version(s.version,(p_input->>'expected_version')::bigint);
 select * into a from wm.agreements where organization_id=p_org and id=s.agreement_id;
 select * into e from wm.engagements where organization_id=p_org and id=s.engagement_id;
 if a.status<>'accepted' or (a.supersedes_id is not null and a.effective_state<>'effective') or s.state not in ('due','active') or e.service_state in ('ending','closed') or s.next_invoice_at is null or s.next_invoice_at>now() or (s.effective_until is not null and s.next_invoice_at>=s.effective_until) then raise exception 'No authorized billing period is due' using errcode='42501';end if;
 if s.interval<>'once' and (e.service_start_at is null or e.service_state<>'active') then raise exception 'Verified service commencement required' using errcode='42501';end if;
 select * into acct from wm.billing_accounts where organization_id=p_org;
 if not found or acct.verified_at<now()-interval '90 days' or length(acct.tax_qualification)<10 then raise exception 'Verify the mapped billing account and tax treatment first' using errcode='42501';end if;
 -- Initial controlled-invoice path; variable hosting offsets require the offset allocation command before this gate can open.
 if s.interval<>'once' and exists(select 1 from wm.revisions r where r.organization_id=p_org and r.id=a.revision_id and coalesce((r.manifest->>'hosting_offset_cap_minor')::bigint,0)>0) then raise exception 'Allocate documented hosting evidence or confirm the period has no eligible bill before invoicing' using errcode='42501';end if;
 start_at:=s.next_invoice_at;
 if s.interval='once' then end_at:=start_at+interval '1 second';
 elsif s.interval='month' then end_at:=s.effective_from+(((extract(year from start_at at time zone 'UTC')-extract(year from s.effective_from at time zone 'UTC'))*12+extract(month from start_at at time zone 'UTC')-extract(month from s.effective_from at time zone 'UTC')+1)::text||' months')::interval;
 else end_at:=start_at+interval '1 year';end if;
 if s.effective_until is not null and end_at>s.effective_until then raise exception 'Reconcile the final partial period before invoicing' using errcode='42501';end if;
 insert into wm.billing_obligations(organization_id,schedule_id,engagement_id,period_start,period_end,gross_minor,amount_minor,currency,description,environment,account_id,customer_id,automatic_tax,account_generation,authorized_by)
 values(p_org,s.id,s.engagement_id,start_at,end_at,s.amount_minor,s.amount_minor,s.currency,e.title||' — '||s.component,acct.environment,acct.account_id,acct.customer_id,acct.automatic_tax,acct.generation,auth.uid()) returning * into o;
 perform wm.critical(p_org,'billing.authorized',o.id,to_jsonb(o));
 op:=wm.enqueue(p_org,e.id,null,null,null,'stripe_invoice_create',jsonb_build_object('obligation_id',o.id),false,'billing:'||o.id||':create',auth.uid());
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',o.id,'version',o.version,'operation_id',op),o.id);
end $$;

create function wm.billing_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o wm.billing_obligations;acct wm.billing_accounts;g wm.tenant_guards;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into o from wm.billing_obligations where organization_id=org and id=(op.payload->>'obligation_id')::uuid;
 select * into acct from wm.billing_accounts where organization_id=org;
 if o.id is null or acct.generation is distinct from o.account_generation or acct.environment<>o.environment or acct.account_id<>o.account_id or acct.customer_id<>o.customer_id or not g.positive_effects_allowed or g.access_state<>'open' or op.authority_version<>g.authority_version then raise exception 'Current billing authority unavailable' using errcode='42501';end if;
 if exists(select 1 from wm.engagements where organization_id=org and id=o.engagement_id and service_state in ('ending','closed')) then raise exception 'Cancellation requires settlement reconciliation before new billing effects' using errcode='42501';end if;
 if not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=op.actor_id and revoked_at is null and active_until>now() and capabilities&&array['finance','admin']) then raise exception 'Finance operator no longer assigned' using errcode='42501';end if;
 if exists(select 1 from wm.critical_receipts where organization_id=org and durability_status<>'durable') then raise exception 'Independent financial evidence is pending' using errcode='42501';end if;
 return to_jsonb(o);
end $$;
alter function public.wm_attempt_begin(uuid,uuid,bigint,text) rename to wm_attempt_begin_before_billing;
revoke all on function public.wm_attempt_begin_before_billing(uuid,uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.wm_attempt_begin(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations;c jsonb;r jsonb;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select o.* into op from wm.operations o join wm.outbox_jobs j on j.organization_id=o.organization_id and j.operation_id=o.id where j.organization_id=p_org and j.id=p_job;
 if op.kind like 'stripe_%' then c:=wm.billing_context(p_org,op);end if;
 r:=public.wm_attempt_begin_before_billing(p_org,p_job,p_lease_generation,p_external_generation);
 if c is not null then update wm.operation_attempts set dispatch_context=c where organization_id=p_org and id=(r->'attempt'->>'id')::uuid;r:=r||jsonb_build_object('context',c);end if;
 return r;
end $$;
create function public.wm_billing_effect_context(p_org uuid,p_attempt uuid,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations;a wm.operation_attempts;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce and state='dispatch_reserved';
 if not found then raise exception 'Billing dispatch unavailable' using errcode='42501';end if;
 select * into op from wm.operations where organization_id=p_org and id=a.operation_id and kind like 'stripe_%';
 if op.id is null then raise exception 'Billing operation unavailable' using errcode='42501';end if;
 return wm.billing_context(p_org,op);
end $$;

alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_billing;
revoke all on function public.wm_attempt_resolve_before_billing(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r jsonb;op wm.operations;o wm.billing_obligations;next_kind text;g wm.tenant_guards;
begin
 perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
 select x.* into op from wm.operations x join wm.operation_attempts a on a.organization_id=x.organization_id and a.operation_id=x.id where a.organization_id=p_org and a.id=p_attempt and a.dispatch_nonce=p_nonce;
 if op.kind like 'stripe_%' then
  select * into o from wm.billing_obligations where organization_id=p_org and id=(op.payload->>'obligation_id')::uuid for update;
  if p_proof->>'obligation_id' is distinct from o.id::text or p_proof->>'customer_id' is distinct from o.customer_id or p_proof->>'environment' is distinct from o.environment or p_proof->>'account_id' is distinct from o.account_id or (p_proof->>'amount_minor')::bigint is distinct from o.amount_minor or p_proof->>'currency' is distinct from o.currency then raise exception 'Billing readback does not match obligation' using errcode='22023';end if;
 end if;
 r:=public.wm_attempt_resolve_before_billing(p_org,p_attempt,p_nonce,p_proof);
 if r->>'state'<>'verified' or op.kind not like 'stripe_%' then return r;end if;
 if op.kind='stripe_invoice_create' then
  if p_proof->>'provider_reference' !~ '^in_[A-Za-z0-9]+$' then raise exception 'Invalid invoice reference' using errcode='22023';end if;
  update wm.billing_obligations set invoice_id=p_proof->>'provider_reference',state='draft',version=version+1 where organization_id=p_org and id=o.id;
  next_kind:='stripe_invoice_item';
 elsif op.kind='stripe_invoice_item' then
  if p_proof->>'provider_reference' !~ '^ii_[A-Za-z0-9]+$' or p_proof->>'invoice_id' is distinct from o.invoice_id then raise exception 'Invalid invoice line' using errcode='22023';end if;
  update wm.billing_obligations set invoice_item_id=p_proof->>'provider_reference',state='assembled',version=version+1 where organization_id=p_org and id=o.id;next_kind:='stripe_invoice_finalize';
 elsif op.kind='stripe_invoice_finalize' then
  if p_proof->>'invoice_id' is distinct from o.invoice_id then raise exception 'Invalid finalized invoice' using errcode='22023';end if;
  update wm.billing_obligations set state='finalized',version=version+1 where organization_id=p_org and id=o.id;next_kind:='stripe_invoice_send';
 elsif op.kind='stripe_invoice_send' then update wm.billing_obligations set state='send_accepted',version=version+1 where organization_id=p_org and id=o.id;
 end if;
 perform wm.critical(p_org,'billing.provider_verified',op.id,p_proof);
 if next_kind is not null and op.authority_version=g.authority_version and not exists(select 1 from wm.engagements where organization_id=p_org and id=o.engagement_id and service_state in ('ending','closed')) then
  perform wm.enqueue(p_org,o.engagement_id,null,null,null,next_kind,op.payload,false,'billing:'||o.id||':'||next_kind,op.actor_id);
 end if;
 if o.invoice_id is not null or op.kind='stripe_invoice_create' then
  insert into wm.stripe_readbacks(environment,account_id,object_id,object_type) values(o.environment,o.account_id,coalesce(o.invoice_id,p_proof->>'provider_reference'),'invoice') on conflict(environment,account_id,object_id) do update set requested_at=clock_timestamp();
 end if;
 return r;
end $$;

create function public.wm_stripe_event_receive(p_environment text,p_account text,p_event jsonb,p_digest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare old wm.stripe_event_inbox;oid text;otype text;
begin
 perform wm.require_machine();
 if p_environment not in ('test','live') or p_account !~ '^acct_[A-Za-z0-9]+$' or p_event->>'id' !~ '^evt_[A-Za-z0-9]+$' or p_digest !~ '^[0-9a-f]{64}$' or (p_event->>'livemode')::boolean is distinct from (p_environment='live') or (p_event ? 'account' and p_event->>'account' is distinct from p_account) then raise exception 'Invalid Stripe event identity' using errcode='22023';end if;
 oid:=p_event->'data'->'object'->>'id';otype:=p_event->'data'->'object'->>'object';
 if oid is null or otype is null then raise exception 'Invalid Stripe object' using errcode='22023';end if;
 insert into wm.stripe_event_inbox(environment,account_id,event_id,event_type,object_id,payload_digest) values(p_environment,p_account,p_event->>'id',p_event->>'type',oid,p_digest) on conflict do nothing;
 select * into old from wm.stripe_event_inbox where environment=p_environment and account_id=p_account and event_id=p_event->>'id';
 if old.payload_digest<>p_digest then raise exception 'Conflicting event identity' using errcode='23505';end if;
 if otype in ('invoice','charge','refund','subscription','dispute') then
  insert into wm.stripe_readbacks(environment,account_id,object_id,object_type) values(p_environment,p_account,oid,otype) on conflict(environment,account_id,object_id) do update set requested_at=clock_timestamp();
 end if;
 return jsonb_build_object('received',true);
end $$;
create function public.wm_stripe_readback_claim(p_environment text,p_account text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r wm.stripe_readbacks;
begin
 perform wm.require_machine();
 select * into r from wm.stripe_readbacks where environment=p_environment and account_id=p_account and object_type='invoice' and (lease_until is null or lease_until<now()) and (observed_at is null or observed_at<requested_at) order by requested_at for update skip locked limit 1;
 if not found then return null;end if;
 update wm.stripe_readbacks set lease_until=now()+interval '2 minutes',lease_generation=lease_generation+1,claimed_request_at=requested_at where environment=p_environment and account_id=p_account and object_id=r.object_id returning * into r;
 return to_jsonb(r);
end $$;
create function public.wm_stripe_invoice_observe(p_environment text,p_account text,p_generation bigint,p_invoice jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare q wm.stripe_readbacks;o wm.billing_obligations;url text;
begin
 perform wm.require_machine();
 select * into q from wm.stripe_readbacks where environment=p_environment and account_id=p_account and object_id=p_invoice->>'id' for update;
 if not found or q.lease_generation<>p_generation or q.lease_until is null or q.claimed_request_at is null or q.lease_until<=now() or p_invoice->>'object'<>'invoice' or (p_invoice->>'livemode')::boolean is distinct from (p_environment='live') then raise exception 'Invoice readback lease unavailable' using errcode='40001';end if;
 select * into o from wm.billing_obligations where environment=p_environment and account_id=p_account and invoice_id=q.object_id for update;
 if found then
  if p_invoice->>'customer' is distinct from o.customer_id or p_invoice->>'currency' is distinct from lower(o.currency) or p_invoice->'metadata'->>'wm_obligation' is distinct from o.id::text then raise exception 'Invoice mapping mismatch' using errcode='42501';end if;
  url:=p_invoice->>'hosted_invoice_url';if url is not null and url !~ '^https://invoice\.stripe\.com/' then url:=null;end if;
  update wm.billing_obligations set provider_state=p_invoice->>'status',amount_paid_minor=greatest(0,(p_invoice->>'amount_paid')::bigint),hosted_url=url,observed_at=clock_timestamp(),version=version+1 where organization_id=o.organization_id and id=o.id;
  -- Payment is a provider observation. It never earns work or activates service.
  insert into wm.payment_references(organization_id,engagement_id,provider,environment,account_id,object_type,external_id,observed_state,amount_minor,currency,hosted_url,period_start,period_end,observed_at)
   values(o.organization_id,o.engagement_id,'stripe',p_environment,p_account,'invoice',q.object_id,p_invoice->>'status',(p_invoice->>'amount_paid')::bigint,o.currency,url,o.period_start,o.period_end,clock_timestamp())
   on conflict(provider,environment,account_id,object_type,external_id) do update set observed_state=excluded.observed_state,amount_minor=excluded.amount_minor,hosted_url=excluded.hosted_url,observed_at=excluded.observed_at,version=wm.payment_references.version+1;
 end if;
 update wm.stripe_readbacks set observed_at=q.claimed_request_at,lease_until=null where environment=p_environment and account_id=p_account and object_id=q.object_id;
 update wm.stripe_event_inbox set processed_at=clock_timestamp() where environment=p_environment and account_id=p_account and object_id=q.object_id and received_at<=q.claimed_request_at;
 return jsonb_build_object('mapped',o.id is not null);
end $$;

alter function public.wm_workspace(uuid) rename to wm_workspace_before_billing;
revoke all on function public.wm_workspace_before_billing(uuid) from public,anon,authenticated;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r jsonb;
begin
 r:=public.wm_workspace_before_billing(p_org);
 return r||jsonb_build_object('invoices',case when wm.operator_has(p_org,'finance') or wm.member_role(p_org)='customer_admin' then (select coalesce(jsonb_agg(to_jsonb(o)-'customer_id'-'account_id'-'account_generation'),'[]') from wm.billing_obligations o where o.organization_id=p_org) else '[]'::jsonb end);
end $$;
revoke all on all functions in schema wm from public,anon,authenticated;
revoke all on function public.wm_billing_command(uuid,text,jsonb,text),public.wm_workspace(uuid) from public,anon;
grant execute on function public.wm_billing_command(uuid,text,jsonb,text),public.wm_workspace(uuid) to authenticated;
revoke all on function public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_billing_effect_context(uuid,uuid,uuid),public.wm_stripe_event_receive(text,text,jsonb,text),public.wm_stripe_readback_claim(text,text),public.wm_stripe_invoice_observe(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_billing_effect_context(uuid,uuid,uuid),public.wm_stripe_event_receive(text,text,jsonb,text),public.wm_stripe_readback_claim(text,text),public.wm_stripe_invoice_observe(text,text,bigint,jsonb) to service_role;
commit;
