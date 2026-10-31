begin;
alter table wm.billing_schedules add column billing_timezone text not null default 'America/New_York',add column billing_cycle integer not null default 0 check(billing_cycle>=0),add column authorized_by uuid,add column billing_attention text,add column allowance_checked_at timestamptz;
create table wm.service_starts(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,agreement_id uuid not null,
 started_at timestamptz not null,confirmed_by uuid not null,evidence text not null,launch_operation_id uuid,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,engagement_id),
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 foreign key(organization_id,agreement_id) references wm.agreements(organization_id,id),
 foreign key(organization_id,launch_operation_id) references wm.operations(organization_id,id)
);
create table wm.hosting_allocations(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),schedule_id uuid not null,period_start timestamptz not null,
 attachment_id uuid,evidence_digest text,eligible_minor bigint not null check(eligible_minor>=0),offset_minor bigint not null check(offset_minor>=0),
 reason text not null,confirmed_by uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,schedule_id,period_start),unique(organization_id,evidence_digest),
 foreign key(organization_id,schedule_id) references wm.billing_schedules(organization_id,id),
 foreign key(organization_id,attachment_id) references wm.attachments(organization_id,id),
 check((eligible_minor=0 and offset_minor=0) or (attachment_id is not null and evidence_digest is not null))
);
alter table wm.service_starts enable row level security;
alter table wm.hosting_allocations enable row level security;
revoke all on wm.service_starts,wm.hosting_allocations from public,anon,authenticated;
create trigger service_start_immutable before update or delete on wm.service_starts for each row execute function wm.reject_history_edit();
create trigger hosting_allocation_immutable before update or delete on wm.hosting_allocations for each row execute function wm.reject_history_edit();
create function wm.billing_boundary(anchor timestamptz,tz text,cycle integer,frequency text) returns timestamptz language plpgsql stable set search_path='' as $$
begin
 if cycle<0 or cycle>1200 or frequency not in ('month','year') then raise exception 'Invalid anniversary' using errcode='22023';end if;
 return ((anchor at time zone tz)+case frequency when 'month' then make_interval(months=>cycle) else make_interval(years=>cycle) end) at time zone tz;
end $$;
create function wm.prepare_period(org uuid,schedule uuid,who uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.billing_schedules;e wm.engagements;a wm.agreements;acct wm.billing_accounts;g wm.tenant_guards;o wm.billing_obligations;r wm.revisions;allocation wm.hosting_allocations;end_at timestamptz;off bigint:=0;cap bigint;item jsonb;op uuid;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 if g.access_state<>'open' or not g.positive_effects_allowed then raise exception 'Billing is restricted for recovery' using errcode='42501';end if;
 if not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=who and revoked_at is null and active_until>now() and capabilities&&array['finance','admin']) then raise exception 'Current finance operator required' using errcode='42501';end if;
 select * into s from wm.billing_schedules where organization_id=org and id=schedule for update;
 select * into e from wm.engagements where organization_id=org and id=s.engagement_id;
 select * into a from wm.agreements where organization_id=org and id=s.agreement_id;
 select * into r from wm.revisions where organization_id=org and id=a.revision_id;
 if s.id is null or a.status<>'accepted' or (a.supersedes_id is not null and a.effective_state<>'effective') or s.state not in ('due','active') or e.service_state in ('ending','closed') or s.next_invoice_at is null or s.next_invoice_at>now() or (s.effective_until is not null and s.next_invoice_at>=s.effective_until) then raise exception 'No authorized billing period is due' using errcode='42501';end if;
 if s.interval<>'once' and (e.service_start_at is null or e.service_state<>'active') then raise exception 'Verified service commencement required' using errcode='42501';end if;
 select * into o from wm.billing_obligations where organization_id=org and schedule_id=s.id and period_start=s.next_invoice_at;
 if found then return jsonb_build_object('id',o.id,'version',o.version,'existing',true);end if;
 select * into acct from wm.billing_accounts where organization_id=org;
 if not found or acct.verified_at<now()-interval '90 days' or length(acct.tax_qualification)<10 then raise exception 'Verify the mapped billing account and tax treatment first' using errcode='42501';end if;
 if s.interval='once' then end_at:=s.next_invoice_at+interval '1 second';else end_at:=wm.billing_boundary(s.effective_from,s.billing_timezone,s.billing_cycle+1,s.interval);end if;
 if end_at<=s.next_invoice_at or (s.effective_until is not null and end_at>s.effective_until) then raise exception 'Reconcile the final partial period before invoicing' using errcode='42501';end if;
 cap:=coalesce((r.manifest->>'hosting_offset_cap_minor')::bigint,0);
 if s.interval='month' and cap>0 then
  select * into allocation from wm.hosting_allocations where organization_id=org and schedule_id=s.id and period_start=s.next_invoice_at;
  if not found then raise exception 'Record the documented hosting bill or confirm no eligible bill for this period' using errcode='42501';end if;
  off:=least(allocation.offset_minor,s.amount_minor);
 end if;
 if s.amount_minor-off<=0 then raise exception 'A fully offset period requires a zero-balance statement' using errcode='22023';end if;
 insert into wm.billing_obligations(organization_id,schedule_id,engagement_id,period_start,period_end,gross_minor,offset_minor,amount_minor,currency,description,environment,account_id,customer_id,automatic_tax,account_generation,authorized_by)
 values(org,s.id,s.engagement_id,s.next_invoice_at,end_at,s.amount_minor,off,s.amount_minor-off,s.currency,e.title||' — '||s.component||case when off>0 then ' | Agreed service '||(s.amount_minor/100.0)::text||' USD less documented hosting offset '||(off/100.0)::text||' USD' else '' end,acct.environment,acct.account_id,acct.customer_id,acct.automatic_tax,acct.generation,who) returning * into o;
 perform wm.critical(org,'billing.authorized',o.id,to_jsonb(o));
 op:=wm.enqueue(org,e.id,null,null,null,'stripe_invoice_create',jsonb_build_object('obligation_id',o.id),false,'billing:'||o.id||':create',who);
 update wm.billing_schedules set billing_attention=null where organization_id=org and id=s.id;
 return jsonb_build_object('id',o.id,'version',o.version,'operation_id',op);
end $$;

create or replace function public.wm_billing_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;s wm.billing_schedules;e wm.engagements;a wm.agreements;r wm.revisions;f wm.attachments;amount bigint;cap bigint;rid uuid;v bigint;started timestamptz;item jsonb;tz text;launch wm.operations;
begin
 perform wm.require_access(p_org,'finance');perform wm.require_recent_auth();
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='billing.prepare' then
  perform wm.check_input(p_input,array['schedule_id','expected_version'],array['schedule_id','expected_version']);
  select * into s from wm.billing_schedules where organization_id=p_org and id=(p_input->>'schedule_id')::uuid for update;
  if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;perform wm.check_version(s.version,(p_input->>'expected_version')::bigint);
  result:=wm.prepare_period(p_org,s.id,auth.uid());rid:=(result->>'id')::uuid;
 elsif p_command='billing.hosting' then
  perform wm.check_input(p_input,array['schedule_id','expected_version','attachment_id','eligible_minor','reason'],array['schedule_id','expected_version','eligible_minor','reason']);
  select * into s from wm.billing_schedules where organization_id=p_org and id=(p_input->>'schedule_id')::uuid for update;
  if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;perform wm.check_version(s.version,(p_input->>'expected_version')::bigint);
  if s.interval<>'month' or s.next_invoice_at is null or s.state<>'active' or exists(select 1 from wm.billing_obligations where organization_id=p_org and schedule_id=s.id and period_start=s.next_invoice_at) then raise exception 'Choose an uninvoiced active monthly period' using errcode='42501';end if;
  select rv.* into r from wm.revisions rv join wm.agreements ag on ag.organization_id=rv.organization_id and ag.revision_id=rv.id where ag.organization_id=p_org and ag.id=s.agreement_id;
  cap:=coalesce((r.manifest->>'hosting_offset_cap_minor')::bigint,0);
  if cap<=0 or r.manifest->>'care_kind'<>'brochure' then raise exception 'This component has no eligible hosting offset' using errcode='22023';end if;
  amount:=(p_input->>'eligible_minor')::bigint;if amount<0 or amount>100000000 then raise exception 'Invalid eligible hosting amount' using errcode='22023';end if;
  perform wm.require_text(p_input->>'reason','hosting eligibility and covered period evidence');
  if amount>0 then
   select * into f from wm.attachments where organization_id=p_org and id=(p_input->>'attachment_id')::uuid and engagement_id=s.engagement_id and scan_state='ready' and deleted_at is null;
   if not found then raise exception 'A checked hosting bill for this service is required' using errcode='42501';end if;
  elsif p_input->>'attachment_id' is not null then raise exception 'No-bill confirmation does not allocate a file' using errcode='22023';end if;
  insert into wm.hosting_allocations(organization_id,schedule_id,period_start,attachment_id,evidence_digest,eligible_minor,offset_minor,reason,confirmed_by)
   values(p_org,s.id,s.next_invoice_at,f.id,f.checksum,amount,least(amount,cap,s.amount_minor),p_input->>'reason',auth.uid()) returning id into rid;
  perform wm.critical(p_org,'hosting.allocated',rid,jsonb_build_object('schedule_id',s.id,'period_start',s.next_invoice_at,'eligible_minor',amount,'offset_minor',least(amount,cap,s.amount_minor),'file_id',f.id,'checksum',f.checksum));
  update wm.billing_schedules set billing_attention=null where organization_id=p_org and id=s.id;
  result:=jsonb_build_object('id',rid,'version',1);
 elsif p_command in ('billing.enable','billing.start_service') then
  perform wm.check_input(p_input,array['engagement_id','agreement_id','expected_version','started_at','evidence','launch_operation_id'],array['engagement_id','agreement_id','expected_version','evidence']);
  select * into e from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid for update;
  if not found or e.service_state in ('ending','closed') then raise exception 'Service unavailable' using errcode='42501';end if;perform wm.check_version(e.version,(p_input->>'expected_version')::bigint);
  select * into a from wm.agreements where organization_id=p_org and engagement_id=e.id and id=(p_input->>'agreement_id')::uuid and status='accepted' and supersedes_id is null;
  if not found then raise exception 'Use the accepted initial agreement or the amendment workflow' using errcode='42501';end if;
  select * into r from wm.revisions where organization_id=p_org and id=a.revision_id;
  perform wm.require_text(p_input->>'evidence','service-start or billing authorization evidence');
  select timezone into tz from wm.organizations where id=p_org;
  if not exists(select 1 from pg_timezone_names where name=tz) then raise exception 'Choose a valid billing timezone' using errcode='22023';end if;
  if p_command='billing.start_service' then
   perform wm.require_access(p_org,'delivery');started:=(p_input->>'started_at')::timestamptz;
   if started is null or started>now() or started<a.starts_at or started<a.accepted_at or e.service_start_at is not null then raise exception 'Confirm the actual agreed service commencement' using errcode='22023';end if;
   if exists(select 1 from wm.access_requirements where organization_id=p_org and engagement_id=e.id and status<>'verified') then raise exception 'Verify all required service access first' using errcode='42501';end if;
   for item in select value from jsonb_array_elements(r.manifest->'required_facts') loop
    if not exists(select 1 from wm.business_facts bf where bf.organization_id=p_org and bf.key=item#>>'{}' and (bf.valid_until is null or bf.valid_until>now()) and not exists(select 1 from wm.business_facts later where later.organization_id=p_org and later.supersedes_id=bf.id)) then raise exception 'Confirm required business facts first' using errcode='42501';end if;
   end loop;
   if e.service_type in ('ads_search','ads_social','ads_professional') then
    select * into launch from wm.operations where organization_id=p_org and engagement_id=e.id and id=(p_input->>'launch_operation_id')::uuid and kind in ('google_enable','meta_enable','microsoft_enable','tiktok_enable','linkedin_enable') and state='verified';
    if not found or (launch.observed_result->>'observed_at')::timestamptz>started then raise exception 'Verified campaign launch before billing commencement required' using errcode='42501';end if;
   end if;
   insert into wm.service_starts(organization_id,engagement_id,agreement_id,started_at,confirmed_by,evidence,launch_operation_id) values(p_org,e.id,a.id,started,auth.uid(),p_input->>'evidence',launch.id) returning id into rid;
   update wm.engagements set service_state='active',service_start_at=started,version=version+1 where organization_id=p_org and id=e.id returning version into v;
   update wm.agreements set effective_state='effective',version=version+1 where organization_id=p_org and id=a.id;
   update wm.billing_schedules set state=case when amount_minor=0 then 'waived' else 'active' end,effective_from=started,next_invoice_at=case when amount_minor=0 then null else started end,authorized_by=auth.uid(),billing_timezone=tz,version=version+1 where organization_id=p_org and agreement_id=a.id and interval<>'once' and state='planned';
   for item in select value from jsonb_array_elements(r.manifest->'entitlements') loop
    insert into wm.entitlements(organization_id,engagement_id,agreement_id,kind,period_key,quantity,unit,rollover_policy,starts_at,ends_at)
     values(p_org,e.id,a.id,item->>'kind',extract(epoch from started)::text,(item->>'quantity')::integer,item->>'unit',item->>'rollover_policy',started,wm.billing_boundary(started,tz,1,'month'));
   end loop;
   perform wm.critical(p_org,'service.started',rid,jsonb_build_object('engagement_id',e.id,'agreement_id',a.id,'started_at',started,'timezone',tz,'evidence',p_input->>'evidence','launch_operation_id',launch.id));
  else rid:=e.id;v:=e.version;end if;
  update wm.billing_schedules set state=case when amount_minor=0 then 'waived' else 'due' end,next_invoice_at=case when amount_minor=0 then null else now() end,authorized_by=auth.uid(),billing_timezone=tz,version=version+1 where organization_id=p_org and agreement_id=a.id and interval='once' and state='planned' and cancellation_policy->>'trigger'='acceptance';
  perform wm.critical(p_org,'billing.enabled',a.id,jsonb_build_object('agreement_id',a.id,'authorized_by',auth.uid()));
  result:=jsonb_build_object('id',rid,'version',v);
 else raise exception 'Unsupported billing action' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,result,rid);
end $$;

create function wm.close_billing() returns trigger language plpgsql volatile security definer set search_path='' as $$
begin
 update wm.billing_schedules set effective_until=least(coalesce(effective_until,new.effective_at),new.effective_at),billing_attention='settlement_required',version=version+1 where organization_id=new.organization_id and engagement_id=new.engagement_id;
 update wm.operations set state='cancelled',last_error_code='service_cancellation',version=version+1 where organization_id=new.organization_id and engagement_id=new.engagement_id and kind like 'stripe_invoice_%' and state='pending';
 update wm.outbox_jobs j set state='cancelled' where j.organization_id=new.organization_id and exists(select 1 from wm.operations o where o.organization_id=j.organization_id and o.id=j.operation_id and o.engagement_id=new.engagement_id and o.state='cancelled');
 return new;
end $$;
create trigger close_billing_with_service after insert on wm.closures for each row execute function wm.close_billing();
-- A preflight failure before any registered attempt cannot have sent a provider
-- effect. Keep it eligible for a delayed, freshly authorized preflight check.
create or replace function public.wm_job_attention(p_org uuid,p_job uuid,p_lease_generation bigint,p_reason text) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 update wm.outbox_jobs j set state='pending',not_before=now()+interval '5 minutes',lease_until=null,last_error_code=left(p_reason,100)
  where j.organization_id=p_org and j.id=p_job and j.state='leased' and j.lease_generation=p_lease_generation
   and not exists(select 1 from wm.operation_attempts where organization_id=p_org and operation_id=j.operation_id);
end $$;
create function wm.refresh_allowances(org uuid,schedule uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare s wm.billing_schedules;r wm.revisions;cycle integer;start_at timestamptz;end_at timestamptz;item jsonb;
begin
 perform 1 from wm.tenant_guards where organization_id=org and access_state='open' for update;if not found then return;end if;
 select * into s from wm.billing_schedules where organization_id=org and id=schedule and interval='month' and component='management' and state='active' for update;
 if not found or s.effective_from>now() or not exists(select 1 from wm.engagements where organization_id=org and id=s.engagement_id and service_state='active') then return;end if;
 cycle:=greatest(0,(extract(year from now() at time zone s.billing_timezone)-extract(year from s.effective_from at time zone s.billing_timezone))*12+extract(month from now() at time zone s.billing_timezone)-extract(month from s.effective_from at time zone s.billing_timezone));
 if wm.billing_boundary(s.effective_from,s.billing_timezone,cycle,'month')>now() then cycle:=cycle-1;end if;
 start_at:=wm.billing_boundary(s.effective_from,s.billing_timezone,cycle,'month');end_at:=wm.billing_boundary(s.effective_from,s.billing_timezone,cycle+1,'month');
 if s.effective_until is not null and end_at>s.effective_until then return;end if;
 select rv.* into r from wm.revisions rv join wm.agreements a on a.organization_id=rv.organization_id and a.revision_id=rv.id where a.organization_id=org and a.id=s.agreement_id and a.status='accepted' and a.effective_state='effective';
 if not found then return;end if;
 for item in select value from jsonb_array_elements(r.manifest->'entitlements') loop
  insert into wm.entitlements(organization_id,engagement_id,agreement_id,kind,period_key,quantity,unit,rollover_policy,starts_at,ends_at)
   values(org,s.engagement_id,s.agreement_id,item->>'kind',extract(epoch from start_at)::text,(item->>'quantity')::integer,item->>'unit',item->>'rollover_policy',start_at,end_at) on conflict(organization_id,engagement_id,kind,period_key) do nothing;
 end loop;
 update wm.billing_schedules set allowance_checked_at=clock_timestamp() where organization_id=org and id=s.id;
end $$;
create function public.wm_billing_generate(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.billing_schedules;generated integer:=0;attention integer:=0;
begin
 perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Invalid batch' using errcode='22023';end if;
 for s in select x.* from wm.billing_schedules x join wm.engagements e on e.organization_id=x.organization_id and e.id=x.engagement_id join wm.tenant_guards g on g.organization_id=x.organization_id and g.access_state='open' where x.interval='month' and x.component='management' and x.state='active' and e.service_state='active' order by x.allowance_checked_at nulls first,x.id limit p_limit loop
  perform wm.refresh_allowances(s.organization_id,s.id);
 end loop;
 for s in select x.* from wm.billing_schedules x join wm.engagements e on e.organization_id=x.organization_id and e.id=x.engagement_id where x.authorized_by is not null and x.state in ('due','active') and e.service_state not in ('ending','closed') and x.next_invoice_at<=now() and x.billing_attention is null and not exists(select 1 from wm.billing_obligations o where o.organization_id=x.organization_id and o.schedule_id=x.id and o.period_start=x.next_invoice_at) order by x.next_invoice_at,x.id limit p_limit loop
  begin perform wm.prepare_period(s.organization_id,s.id,s.authorized_by);generated:=generated+1;
  exception when others then update wm.billing_schedules set billing_attention=case when sqlstate='42501' then 'authorization_or_evidence_required' else 'billing_review_required' end where organization_id=s.organization_id and id=s.id;attention:=attention+1;
  end;
 end loop;
 return jsonb_build_object('generated',generated,'attention',attention);
end $$;
-- Recurrence advances only after the exact invoice has been finalized and read back.
alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_recurring;
revoke all on function public.wm_attempt_resolve_before_recurring(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;op wm.operations;o wm.billing_obligations;s wm.billing_schedules;
begin
 result:=public.wm_attempt_resolve_before_recurring(p_org,p_attempt,p_nonce,p_proof);
 if result->>'state'='verified' then
  select x.* into op from wm.operations x join wm.operation_attempts a on a.organization_id=x.organization_id and a.operation_id=x.id where a.organization_id=p_org and a.id=p_attempt;
  if op.kind='stripe_invoice_finalize' then
   select * into o from wm.billing_obligations where organization_id=p_org and id=(op.payload->>'obligation_id')::uuid;
   select * into s from wm.billing_schedules where organization_id=p_org and id=o.schedule_id for update;
   if s.next_invoice_at=o.period_start then
    update wm.billing_schedules set next_invoice_at=case when interval='once' then null else o.period_end end,billing_cycle=billing_cycle+1,state=case when interval='once' then 'invoiced' else state end,version=version+1 where organization_id=p_org and id=s.id;
   end if;
  end if;
 end if;
 return result;
end $$;
create or replace function public.wm_service_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; rid uuid; e wm.engagements;r wm.requests;f wm.business_facts;l wm.lead_outcomes;ent wm.entitlements; authz wm.engagement_authorities;
  v bigint;st text;item jsonb;effective timestamptz;qty integer;reserved integer;capability text;
begin
  capability:=case when p_command in ('request.progress','time.record','allowance.reserve','allowance.settle','allowance.release','allowance.defect') then 'delivery'
    when p_command in ('engagement.cancel') then 'customer_admin' when p_command in ('export.request','preference.save','absence.save') then 'read' else 'write' end;
  perform wm.require_access(p_org,capability);
  result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
  if p_input ? 'engagement_id' and p_input->>'engagement_id' is not null then
    select * into e from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid for update;
    if not found then raise exception 'Service unavailable' using errcode='42501';end if;
  end if;
  case p_command
  when 'request.progress' then
    perform wm.check_input(p_input,array['request_id','expected_version','state','reason','next_contact_at'],array['request_id','expected_version','state','reason','next_contact_at']);
    select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
    if not found then raise exception 'Work unavailable' using errcode='42501';end if;
    perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);st:=p_input->>'state';
    if not ((r.state='received' and st in ('triage','waiting')) or (r.state='triage' and st='waiting') or (r.state='waiting' and st='triage') or (r.state='accepted' and st in ('preparing','waiting')) or (r.state='changes_requested' and st='preparing') or (r.state='approved' and st='executing') or (r.state='executing' and st='verifying') or (r.state='verifying' and st='complete')) then raise exception 'Unsupported work transition' using errcode='22023';end if;
    if st in ('executing','complete') and not exists(select 1 from wm.decisions d where d.organization_id=p_org and d.revision_id=r.current_revision_id and d.decision='approve' and d.id=(select d2.id from wm.decisions d2 where d2.organization_id=p_org and d2.revision_id=r.current_revision_id order by d2.created_at desc,d2.id desc limit 1)) then raise exception 'Current approval required' using errcode='42501';end if;
    if st='complete' and (exists(select 1 from wm.operations where organization_id=p_org and request_id=r.id and state not in ('verified','cancelled')) or not exists(select 1 from wm.operations where organization_id=p_org and request_id=r.id and revision_id=r.current_revision_id and state='verified')) then raise exception 'Verified completion evidence required' using errcode='42501';end if;
    update wm.requests set state=st,waiting_reason=wm.require_text(p_input->>'reason','progress explanation'),next_contact_at=(p_input->>'next_contact_at')::timestamptz,version=version+1,updated_at=now() where organization_id=p_org and id=r.id returning id,version into rid,v;
  when 'fact.confirm' then
    perform wm.check_input(p_input,array['key','value','source','valid_until','expected_version'],array['key','value','source']);
    select * into f from wm.business_facts x where organization_id=p_org and key=p_input->>'key' and not exists(select 1 from wm.business_facts n where n.organization_id=p_org and n.supersedes_id=x.id) order by created_at desc limit 1;
    if found then perform wm.check_version(f.version,(p_input->>'expected_version')::bigint);end if;
    insert into wm.business_facts(organization_id,key,value,source,confirmed_by,valid_until,supersedes_id,version) values(p_org,wm.require_text(p_input->>'key','fact',120),p_input->'value',wm.require_text(p_input->>'source','source'),auth.uid(),(p_input->>'valid_until')::timestamptz,f.id,coalesce(f.version,0)+1) returning id,version into rid,v;
  when 'preference.save' then
    perform wm.check_input(p_input,array['digest','email_enabled'],array['digest','email_enabled']);
    if wm.member_role(p_org) is null then raise exception 'Member preferences unavailable' using errcode='42501';end if;
    insert into wm.notification_preferences(organization_id,user_id,digest,email_enabled) values(p_org,auth.uid(),p_input->>'digest',(p_input->>'email_enabled')::boolean) on conflict(organization_id,user_id) do update set digest=excluded.digest,email_enabled=excluded.email_enabled,version=wm.notification_preferences.version+1 returning version into v;rid:=auth.uid();
  when 'absence.save' then
    perform wm.check_input(p_input,array['starts_at','ends_at','next_contact_at','message'],array['starts_at','ends_at','next_contact_at','message']);
    if wm.member_role(p_org) is null then raise exception 'Member absence unavailable' using errcode='42501';end if;
    insert into wm.absence_windows(organization_id,user_id,starts_at,ends_at,next_contact_at,message) values(p_org,auth.uid(),(p_input->>'starts_at')::timestamptz,(p_input->>'ends_at')::timestamptz,(p_input->>'next_contact_at')::timestamptz,wm.require_text(p_input->>'message','message')) returning id,version into rid,v;
  when 'time.record' then
    perform wm.check_input(p_input,array['engagement_id','request_id','category','minutes','occurred_at'],array['engagement_id','category','minutes','occurred_at']);
    insert into wm.time_entries(organization_id,engagement_id,request_id,operator_user_id,category,minutes,occurred_at) values(p_org,e.id,(p_input->>'request_id')::uuid,auth.uid(),wm.require_text(p_input->>'category','time category',100),(p_input->>'minutes')::integer,(p_input->>'occurred_at')::timestamptz) returning id into rid;v:=1;
  when 'lead.save' then
    perform wm.check_input(p_input,array['engagement_id','outcomes'],array['engagement_id','outcomes']);
    if jsonb_typeof(p_input->'outcomes')<>'array' or jsonb_array_length(p_input->'outcomes') not between 1 and 100 then raise exception 'Enter up to 100 outcomes' using errcode='22023';end if;
    for item in select value from jsonb_array_elements(p_input->'outcomes') loop
      perform wm.check_input(item,array['id','expected_version','outcome','value_minor','currency'],array['id','expected_version','outcome']);
      select * into l from wm.lead_outcomes where organization_id=p_org and engagement_id=e.id and id=(item->>'id')::uuid for update;
      if not found then raise exception 'Lead unavailable' using errcode='42501';end if;
      perform wm.check_version(l.version,(item->>'expected_version')::bigint);
      if (item->>'value_minor')::bigint<0 or (item ? 'value_minor' and (item->>'currency' is null or item->>'currency' !~ '^[A-Z]{3}$')) then raise exception 'Check lead value' using errcode='22023';end if;
      update wm.lead_outcomes set outcome=item->>'outcome',value_minor=(item->>'value_minor')::bigint,currency=item->>'currency',last_confirmed_at=now(),confirmed_by=auth.uid(),version=version+1 where organization_id=p_org and id=l.id returning id,version into rid,v;
    end loop;
  when 'export.request' then
    perform wm.check_input(p_input,array['engagement_id'],array[]::text[]);
    insert into wm.export_jobs(organization_id,engagement_id,requested_by,audience,cutoff) values(p_org,e.id,auth.uid(),case when wm.operator_has(p_org,'read') then 'operator' else 'customer' end,now()) returning id,version into rid,v;
  when 'engagement.cancel' then
    perform wm.check_input(p_input,array['engagement_id','expected_version','timing','reason','exit_mode'],array['engagement_id','expected_version','timing','reason','exit_mode']);
    perform wm.require_recent_auth();authz:=wm.authority(p_org,e.id,'contract');perform wm.check_version(e.version,(p_input->>'expected_version')::bigint);
    if e.service_state in ('ending','closed') then raise exception 'Service is already ending' using errcode='40001';end if;
    if p_input->>'timing'='immediate' then effective:=now();
    elsif p_input->>'timing'='period_end' then
      select max(o.period_end) into effective from wm.billing_obligations o join wm.billing_schedules bs on bs.organization_id=o.organization_id and bs.id=o.schedule_id where o.organization_id=p_org and o.engagement_id=e.id and o.period_end>now() and o.provider_state='paid' and o.observed_at is not null and bs.interval in ('month','year');
      if effective is null then raise exception 'Verify the paid service period first' using errcode='22023';end if;
    else raise exception 'Choose an end date' using errcode='22023';end if;
    insert into wm.closures(organization_id,engagement_id,timing,exit_mode,reason,effective_at,requested_by) values(p_org,e.id,p_input->>'timing',p_input->>'exit_mode',wm.require_text(p_input->>'reason','ending reason'),effective,auth.uid()) returning id,version into rid,v;
    update wm.engagements set service_state='ending',commercial_state='ending',ends_at=effective,version=version+1 where organization_id=p_org and id=e.id;
    if effective<=now() and p_input->>'exit_mode'='stop' and exists(select 1 from wm.provider_scopes where organization_id=p_org and engagement_id=e.id and provider in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads')) then perform wm.request_stop(p_org,e.id,'Immediate service closure',auth.uid());end if;
    perform wm.critical(p_org,'engagement.closure',rid,jsonb_build_object('engagement_id',e.id,'effective_at',effective,'timing',p_input->>'timing','exit_mode',p_input->>'exit_mode','authority_id',authz.id));
  when 'allowance.reserve','allowance.settle','allowance.release','allowance.defect' then
    perform wm.check_input(p_input,array['entitlement_id','request_id','expected_version','quantity','reason'],array['entitlement_id','request_id','expected_version','quantity','reason']);
    select * into ent from wm.entitlements where organization_id=p_org and id=(p_input->>'entitlement_id')::uuid for update;
    if not found then raise exception 'Allowance unavailable' using errcode='42501';end if;
    perform wm.check_version(ent.version,(p_input->>'expected_version')::bigint);
    select * into r from wm.requests where organization_id=p_org and engagement_id=ent.engagement_id and id=(p_input->>'request_id')::uuid;
    if not found then raise exception 'Work unavailable' using errcode='42501';end if;
    qty:=(p_input->>'quantity')::integer;
    select coalesce(sum(case kind when 'reserve' then quantity when 'settle' then -quantity when 'release' then -quantity else 0 end),0) into reserved from wm.allowance_entries where organization_id=p_org and entitlement_id=ent.id and request_id=r.id;
    if p_command='allowance.defect' then if qty<>0 then raise exception 'Defect corrections do not consume allowance' using errcode='22023';end if;st:='defect_correction';
    else
      if qty is null or qty<1 then raise exception 'A positive quantity is required' using errcode='22023';end if;
      if p_command='allowance.reserve' then
        if ent.starts_at>now() or ent.ends_at<=now() then raise exception 'Allowance period is not active' using errcode='42501';end if;
        update wm.entitlements set reserved=reserved+qty,version=version+1 where organization_id=p_org and id=ent.id;st:='reserve';
      else
        if qty>reserved then raise exception 'Cannot settle or release another request allowance' using errcode='22023';end if;
        update wm.entitlements set reserved=reserved-qty,consumed=consumed+case when p_command='allowance.settle' then qty else 0 end,version=version+1 where organization_id=p_org and id=ent.id;st:=case when p_command='allowance.settle' then 'settle' else 'release' end;
      end if;
    end if;
    insert into wm.allowance_entries(organization_id,entitlement_id,request_id,quantity,kind,reason,created_by) values(p_org,ent.id,r.id,qty,st,wm.require_text(p_input->>'reason','allowance reason'),auth.uid()) returning id into rid;v:=ent.version+case when st='defect_correction' then 0 else 1 end;
  else raise exception 'Unsupported service action' using errcode='22023';
  end case;
  return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',rid,'version',v),rid);
end $$;

revoke all on all functions in schema wm from public,anon,authenticated;
revoke all on function public.wm_billing_command(uuid,text,jsonb,text) from public,anon;
grant execute on function public.wm_billing_command(uuid,text,jsonb,text) to authenticated;
revoke all on function public.wm_billing_generate(integer),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wm_billing_generate(integer),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) to service_role;
commit;
