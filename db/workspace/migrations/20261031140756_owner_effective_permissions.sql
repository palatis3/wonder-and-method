begin;
alter table wm.staff add column grant_version bigint not null default 1 check(grant_version>0);
alter table wm.operator_assignments add column grant_version bigint not null default 1 check(grant_version>0);
-- One effective capability check for human projections and original machine actors.
-- Covers stay separate from direct assignments and can never become admin/finance/
-- people/ads/recovery or named customer authority.
create or replace function wm.owner_direct(org uuid,person uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from wm.operator_assignments a join auth.users u on u.id=a.user_id
 where a.organization_id=org and a.user_id=person and a.revoked_at is null and a.active_until>clock_timestamp()
 and (cap=any(a.capabilities) or 'admin'=any(a.capabilities)) and u.email_confirmed_at is not null)
 and not exists(select 1 from wm.staff s where s.user_id=person and (s.revoked_at is not null or s.active_until<=clock_timestamp()))
$$;
create or replace function wm.owner_cover_for(org uuid,person uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(
 select 1 from wm.owner_covers c join wm.operator_assignments a on a.organization_id=c.organization_id and a.user_id=c.issuer_id
 join wm.staff s on s.user_id=c.issuer_id join wm.staff recipient on recipient.user_id=c.recipient_id
 join wm.tenant_guards g on g.organization_id=c.organization_id
 where c.organization_id=org and c.recipient_id=person and cap=any(c.capabilities)
 and c.starts_at<=clock_timestamp() and c.ends_at>clock_timestamp()
 and g.access_state='open' and g.recovery_generation=c.recovery_generation and g.external_generation=c.external_generation
 and wm.owner_direct(org,c.issuer_id,'people')
 and s.revoked_at is null and s.active_until>clock_timestamp() and 'coverage'=any(s.capabilities)
 and recipient.revoked_at is null and recipient.active_until>clock_timestamp()
 and wm.hash_json(to_jsonb(a))=c.issuer_assignment_digest and wm.hash_json(to_jsonb(s))=c.issuer_staff_digest
 and wm.hash_json(to_jsonb(recipient))=c.recipient_staff_digest
 and exists(select 1 from auth.users u where u.id=c.recipient_id and u.email_confirmed_at is not null)
 and not exists(select 1 from wm.owner_cover_revocations x where x.organization_id=org and x.cover_id=c.id))
$$;
create function wm.operator_for(org uuid,person uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select wm.owner_direct(org,person,cap) or (cap=any(array['read','delivery','reports']) and wm.owner_cover_for(org,person,cap))
$$;
create or replace function wm.operator_has(org uuid,capability text) returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(wm.claims()->>'aal','')='aal2' and wm.operator_for(org,auth.uid(),capability)
$$;
create or replace function wm.analytics_operator(org uuid,who uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select wm.operator_for(org,who,'reports')
$$;
create function wm.operation_capability(kind_name text) returns text language sql immutable set search_path='' as $$
 select case when wm.ad_provider(kind_name) is not null then 'ads' when kind_name like 'stripe_%' then 'finance'
 when kind_name in ('identity_provision','invitation_notify') then 'people'
 when kind_name in ('website_publish','file_scan','message_notify','notice_notify') then 'delivery' else 'admin' end
$$;
-- Global staff changes take the intake lock before tenant guards in UUID order.
-- All grant updates are serialized with authorization, revoke queued positive
-- effects, and leave late in-flight effects for read-only reconciliation.
create function wm.staff_grant_fence() returns trigger language plpgsql volatile security definer set search_path='' as $$
declare tenant uuid;
begin
 if tg_op='DELETE' then raise exception 'Retain staff identity; revoke the grant explicitly' using errcode='42501';end if;
 if new.user_id is distinct from old.user_id then raise exception 'Staff identity cannot be replaced' using errcode='42501';end if;
 if to_jsonb(new)=to_jsonb(old) then return new;end if;
 new.grant_version:=old.grant_version+1;
 perform 1 from wm.intake_lock where id for update;
 for tenant in select distinct organization_id from (
  select organization_id from wm.operator_assignments where user_id=old.user_id and revoked_at is null and active_until>clock_timestamp()
  union select c.organization_id from wm.owner_covers c where c.recipient_id=old.user_id
   and wm.owner_cover_for(c.organization_id,old.user_id,'read')
 ) involved order by organization_id loop
  perform 1 from wm.tenant_guards where organization_id=tenant for update;
  perform wm.invalidate_authority(tenant);
  perform wm.critical(tenant,'staff.grant.changed',old.user_id,jsonb_build_object('staff_id',old.user_id,'prior_digest',wm.hash_json(to_jsonb(old)),'current_digest',wm.hash_json(to_jsonb(new))));
 end loop;
 return new;
end $$;
create trigger staff_grant_fence before update or delete on wm.staff for each row execute function wm.staff_grant_fence();
create function wm.operator_grant_fence() returns trigger language plpgsql volatile security definer set search_path='' as $$
declare tenant uuid:=case when tg_op='DELETE' then old.organization_id else new.organization_id end;
begin
 if tg_op='UPDATE' and (new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id) then raise exception 'Operator grant identity cannot be replaced' using errcode='42501';end if;
 perform 1 from wm.tenant_guards where organization_id=tenant for update;
 if tg_op<>'INSERT' and (tg_op='DELETE' or to_jsonb(new) is distinct from to_jsonb(old)) then
  if tg_op='UPDATE' then new.grant_version:=old.grant_version+1;end if;
  perform wm.invalidate_authority(tenant);
  perform wm.critical(tenant,'operator.grant.changed',old.user_id,jsonb_build_object('operator_id',old.user_id,'prior_digest',wm.hash_json(to_jsonb(old)),'current_digest',case when tg_op='DELETE' then null else wm.hash_json(to_jsonb(new)) end));
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger operator_grant_fence before insert or update or delete on wm.operator_assignments for each row execute function wm.operator_grant_fence();
revoke all on function wm.operator_for(uuid,uuid,text),wm.operation_capability(text),wm.staff_grant_fence(),wm.operator_grant_fence() from public,anon,authenticated,service_role;

-- The following replacements retain every prior approval, lease, durability,
-- provider and recovery check, changing only the repeated actor-grant predicate.
-- public.wm_attempt_begin_before_services(uuid,uuid,bigint,text)
CREATE OR REPLACE FUNCTION public.wm_attempt_begin_before_services(p_org uuid, p_job uuid, p_lease_generation bigint, p_external_generation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare guard wm.tenant_guards; j wm.outbox_jobs; op wm.operations; remote wm.provider_scopes; a wm.operation_attempts; approval wm.decisions; rev wm.revisions; authority wm.engagement_authorities; r wm.requests;
begin
  perform wm.require_machine();
  select * into guard from wm.tenant_guards where organization_id=p_org for update;
  if not found or guard.access_state<>'open' or guard.external_generation<>p_external_generation then raise exception 'Scope requires recovery verification' using errcode='42501';end if;
  -- Read identity without acquiring the outbox row before the provider scope.
  select o.* into op from wm.operations o join wm.outbox_jobs b on b.organization_id=o.organization_id and b.operation_id=o.id where b.organization_id=p_org and b.id=p_job;
  if not found then raise exception 'Job unavailable' using errcode='42501';end if;
  if op.provider_scope_id is not null then select * into remote from wm.provider_scopes where organization_id=p_org and id=op.provider_scope_id for update;end if;
  if op.request_id is not null then select * into r from wm.requests where organization_id=p_org and id=op.request_id for update;end if;
  select * into op from wm.operations where organization_id=p_org and id=op.id for update;
  select * into j from wm.outbox_jobs where organization_id=p_org and id=p_job for update;
  if j.state<>'leased' or j.lease_generation<>p_lease_generation or j.lease_until<=now() or op.state<>'pending' then raise exception 'Dispatch lease is no longer current' using errcode='40001';end if;
  if op.recovery_generation<>guard.recovery_generation or op.external_generation<>p_external_generation then raise exception 'Restored or replaced job cannot dispatch' using errcode='42501';end if;
  if exists(select 1 from wm.operation_attempts where organization_id=p_org and operation_id=op.id and state not in ('resolved','cancelled_before_dispatch')) then raise exception 'Reconcile the earlier attempt first' using errcode='40001';end if;
  if op.positive_effect then
    if not guard.positive_effects_allowed or op.authority_version<>guard.authority_version or (remote.id is not null and (remote.active_stop_id is not null or op.stop_epoch<>remote.stop_epoch)) then raise exception 'Current permission does not allow this effect' using errcode='42501';end if;
    if not wm.operator_for(p_org,op.actor_id,case when wm.ad_provider(op.kind) is not null then 'ads' else 'delivery' end) then raise exception 'Executing operator no longer assigned' using errcode='42501';end if;
    select * into rev from wm.revisions where organization_id=p_org and id=op.revision_id;
    select * into approval from wm.decisions where organization_id=p_org and revision_id=rev.id order by created_at desc,id desc limit 1;
    select * into authority from wm.engagement_authorities where organization_id=p_org and id=approval.authority_id;
    if rev.id is null or r.current_revision_id<>rev.id or rev.digest<>op.desired_digest or approval.decision is distinct from 'approve' or authority.id is null or authority.revoked_at is not null or authority.starts_at>now() or authority.ends_at<=now() or authority.version<>approval.authority_version or not exists(select 1 from wm.memberships where organization_id=p_org and user_id=approval.actor_id and status='active' and revoked_at is null and role<>'viewer') then raise exception 'Approval is no longer current' using errcode='42501';end if;
    if not exists(select 1 from wm.critical_receipts where organization_id=p_org and target_id=approval.id and event_type='decision.approve' and durability_status='durable') or exists(select 1 from wm.critical_receipts where organization_id=p_org and durability_status<>'durable') then raise exception 'Independent authority evidence is pending' using errcode='42501';end if;
    if wm.ad_provider(op.kind) is not null and not exists(select 1 from wm.budget_authorizations where organization_id=p_org and id=(op.payload->>'budget_id')::uuid and revision_id=rev.id and status='active' and valid_from<=now() and valid_until>now()) then raise exception 'Budget authority is no longer current' using errcode='42501';end if;
  end if;
  insert into wm.operation_attempts(organization_id,operation_id,lease_generation,recovery_generation,external_generation,stop_epoch)
    values(p_org,op.id,j.lease_generation,guard.recovery_generation,p_external_generation,remote.stop_epoch) returning * into a;
  update wm.operations set state='in_flight',version=version+1,updated_at=now() where organization_id=p_org and id=op.id;
  return jsonb_build_object('attempt',to_jsonb(a),'operation',to_jsonb(op),'scope',case when remote.id is null then null else to_jsonb(remote) end);
end $function$;

-- wm.website_context(uuid,wm.operations)
CREATE OR REPLACE FUNCTION wm.website_context(org uuid, op wm.operations)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a wm.website_artifacts;t wm.website_targets;v wm.revisions;g wm.tenant_guards;
begin
 select * into v from wm.revisions where organization_id=org and id=op.revision_id;
 select * into a from wm.website_artifacts where organization_id=org and id=(v.manifest->>'artifact_id')::uuid;
 select * into t from wm.website_targets where organization_id=org and id=a.target_id and engagement_id=op.engagement_id and enabled for update;
 select * into g from wm.tenant_guards where organization_id=org;
 if t.id is null or a.id is null or v.manifest->>'artifact_digest' is distinct from a.artifact_digest or v.manifest->>'version_id' is distinct from a.version_id::text or v.manifest->>'dependency_revision' is distinct from t.dependency_revision or a.dependency_revision<>t.dependency_revision or not wm.delivery_approved(org,op.request_id,v.id) then raise exception 'Current exact website approval and dependencies required' using errcode='42501';end if;
 if v.manifest<>jsonb_build_object('artifact_id',a.id,'target_id',t.id,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'commit',a.commit_sha,'repository',a.repository,'build',a.ci_reference,'target',t.origin,'baseline_deployment_id',(v.manifest->>'baseline_deployment_id')::uuid,'dependency_revision',t.dependency_revision) then raise exception 'Approved website target and artifact bindings changed' using errcode='42501';end if;
 if not wm.operator_for(org,op.actor_id,'delivery') then raise exception 'Website operator is no longer authorized' using errcode='42501';end if;
 if not exists(select 1 from wm.critical_receipts where organization_id=org and target_id=a.id and event_type='website.artifact_uploaded' and durability_status='durable') then raise exception 'Independent upload evidence is pending' using errcode='42501';end if;
 if exists(select 1 from wm.operations o join wm.revisions other on other.organization_id=o.organization_id and other.id=o.revision_id where o.organization_id=org and o.id<>op.id and o.kind='website_publish' and o.state in ('in_flight','unknown') and other.manifest->>'target_id'=t.id::text) then raise exception 'Reconcile earlier publication before another write' using errcode='42501';end if;
 return jsonb_build_object('target_id',t.id,'artifact_id',a.id,'account_id',t.account_id,'worker_name',t.worker_name,'environment',t.environment,'origin',t.origin,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'release_marker',a.manifest->>'release_marker','baseline_deployment_id',(v.manifest->>'baseline_deployment_id')::uuid);
end $function$;

-- public.wm_file_release_unscanned(uuid,uuid,text,text)
CREATE OR REPLACE FUNCTION public.wm_file_release_unscanned(p_org uuid, p_id uuid, p_checksum text, p_sealed_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f wm.attachments;guard wm.tenant_guards;
begin
 perform wm.require_machine();select * into guard from wm.tenant_guards where organization_id=p_org for update;
 select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
 if not found or f.deleted_at is not null or f.checksum is distinct from p_checksum or guard.access_state<>'open' then raise exception 'File changed or unavailable' using errcode='42501';end if;
 if not exists(select 1 from wm.memberships where organization_id=p_org and user_id=f.uploader_id and status='active' and revoked_at is null)
  and not wm.operator_for(p_org,f.uploader_id,'delivery') then raise exception 'Uploader access no longer current' using errcode='42501';end if;
 if p_sealed_key is distinct from p_org||'/'||p_id||'/'||p_checksum then raise exception 'Sealed object identity required' using errcode='22023';end if;
 if f.scan_state='unscanned' and f.sealed_object_key=p_sealed_key then return jsonb_build_object('id',f.id,'state','unscanned');end if;
 if f.scan_state not in ('quarantined','checking') then raise exception 'File cannot be released unscanned' using errcode='42501';end if;
 update wm.attachments set scan_state='unscanned',scan_policy_version='invite-only-unscanned-v1',scan_observation=jsonb_build_object('malware_scanned',false,'policy','invite-only-unscanned-v1','checksum',p_checksum,'observed_at',now()),sealed_object_key=p_sealed_key,version=version+1 where organization_id=p_org and id=p_id;
 return jsonb_build_object('id',f.id,'state','unscanned');
end $function$;

-- wm.service_context_before_notifications(uuid,wm.operations)
CREATE OR REPLACE FUNCTION wm.service_context_before_notifications(org uuid, op wm.operations)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare inv wm.invitations; msg wm.messages; f wm.attachments; destination text; identity_id uuid; business text;
begin
  select name into business from wm.organizations where id=org;
  if op.kind in ('identity_provision','invitation_notify') then
    select * into inv from wm.invitations where organization_id=org and id=(op.payload->>'invitation_id')::uuid;
    if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now() then raise exception 'Invitation no longer current' using errcode='42501';end if;
    if not exists(select 1 from wm.memberships where organization_id=org and user_id=inv.invited_by and status='active' and revoked_at is null and role='customer_admin')
      and not wm.operator_for(org,inv.invited_by,'people') then raise exception 'Inviter no longer authorized' using errcode='42501';end if;
    select id into identity_id from auth.users where lower(email)=inv.email;
    if op.kind='invitation_notify' and identity_id is null then raise exception 'Identity provisioning is unconfirmed' using errcode='42501';end if;
    return jsonb_build_object('invitation_id',inv.id,'email',inv.email,'business_name',business,'identity_id',identity_id);
  elsif op.kind='message_notify' then
    select * into msg from wm.messages where organization_id=org and id=(op.payload->>'message_id')::uuid and visibility='shared';
    if not found then raise exception 'Shared message unavailable' using errcode='42501';end if;
    select u.email into destination from wm.memberships m join auth.users u on u.id=m.user_id left join wm.notification_preferences p on p.organization_id=m.organization_id and p.user_id=m.user_id
      where m.organization_id=org and m.user_id=(op.payload->>'recipient_id')::uuid and m.status='active' and m.revoked_at is null and u.email_confirmed_at is not null and coalesce(p.email_enabled,true);
    if destination is null then raise exception 'Notification recipient unavailable' using errcode='42501';end if;
    return jsonb_build_object('email',destination,'business_name',business,'message_id',msg.id);
  elsif op.kind='file_scan' then
    select * into f from wm.attachments where organization_id=org and id=(op.payload->>'file_id')::uuid and deleted_at is null and scan_state in ('quarantined','checking') and checksum=op.payload->>'checksum';
    if not found then raise exception 'File no longer available for scanning' using errcode='42501';end if;
    if not exists(select 1 from wm.memberships where organization_id=org and user_id=f.uploader_id and status='active' and revoked_at is null)
      and not wm.operator_for(org,f.uploader_id,'delivery') then raise exception 'Uploader access no longer current' using errcode='42501';end if;
    return jsonb_build_object('file_id',f.id);
  end if;
  return null;
end $function$;

-- wm.billing_context(uuid,wm.operations)
CREATE OR REPLACE FUNCTION wm.billing_context(org uuid, op wm.operations)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if not wm.operator_for(org,op.actor_id,'finance') then raise exception 'Finance operator no longer assigned' using errcode='42501';end if;
 if exists(select 1 from wm.critical_receipts where organization_id=org and durability_status<>'durable') then raise exception 'Independent financial evidence is pending' using errcode='42501';end if;
 return to_jsonb(o)||jsonb_build_object('binding_id',b.id,'binding_version',b.version,'charge_id',b.charge_id,'adjustment_id',f.id,'refund_minor',f.amount_minor);
end $function$;

-- wm.billing_context_before_adjustments(uuid,wm.operations)
CREATE OR REPLACE FUNCTION wm.billing_context_before_adjustments(org uuid, op wm.operations)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o wm.billing_obligations;acct wm.billing_accounts;g wm.tenant_guards;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into o from wm.billing_obligations where organization_id=org and id=(op.payload->>'obligation_id')::uuid;
 select * into acct from wm.billing_accounts where organization_id=org;
 if o.id is null or acct.generation is distinct from o.account_generation or acct.environment<>o.environment or acct.account_id<>o.account_id or acct.customer_id<>o.customer_id or not g.positive_effects_allowed or g.access_state<>'open' or op.authority_version<>g.authority_version then raise exception 'Current billing authority unavailable' using errcode='42501';end if;
 if exists(select 1 from wm.engagements where organization_id=org and id=o.engagement_id and service_state in ('ending','closed')) then raise exception 'Cancellation requires settlement reconciliation before new billing effects' using errcode='42501';end if;
 if not wm.operator_for(org,op.actor_id,'finance') then raise exception 'Finance operator no longer assigned' using errcode='42501';end if;
 if exists(select 1 from wm.critical_receipts where organization_id=org and durability_status<>'durable') then raise exception 'Independent financial evidence is pending' using errcode='42501';end if;
 return to_jsonb(o);
end $function$;

-- wm.prepare_period(uuid,uuid,uuid)
CREATE OR REPLACE FUNCTION wm.prepare_period(org uuid, schedule uuid, who uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s wm.billing_schedules;e wm.engagements;a wm.agreements;acct wm.billing_accounts;g wm.tenant_guards;o wm.billing_obligations;r wm.revisions;allocation wm.hosting_allocations;end_at timestamptz;off bigint:=0;cap bigint;item jsonb;op uuid;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 if g.access_state<>'open' or not g.positive_effects_allowed then raise exception 'Billing is restricted for recovery' using errcode='42501';end if;
 if not wm.operator_for(org,who,'finance') then raise exception 'Current finance operator required' using errcode='42501';end if;
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
end $function$;

-- wm.connection_actor_current(uuid,uuid,text)
CREATE OR REPLACE FUNCTION wm.connection_actor_current(org uuid, who uuid, actor_kind text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when actor_kind='customer_admin' then exists(select 1 from wm.memberships where organization_id=org and user_id=who and status='active' and role='customer_admin' and revoked_at is null)
 when actor_kind='operator' then wm.operator_for(org,who,'ads') else false end
$function$;

-- wm.analytics_current(uuid,uuid)
CREATE OR REPLACE FUNCTION wm.analytics_current(org uuid, job uuid)
 RETURNS wm.analytics_bindings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare j wm.analytics_imports;b wm.analytics_bindings;g wm.tenant_guards;c wm.integration_credentials;s wm.provider_scopes;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into j from wm.analytics_imports where organization_id=org and id=job for update;
 select * into b from wm.analytics_bindings where organization_id=org and id=j.binding_id;
 select * into c from wm.integration_credentials where organization_id=org and id=b.credential_id;
 select * into s from wm.provider_scopes where organization_id=org and id=b.scope_id;
 if j.id is null or b.id is null or not b.enabled or g.access_state<>'open' or g.authority_version<>j.authority_version or g.recovery_generation<>j.recovery_generation or g.external_generation<>j.external_generation or b.recovery_generation<>g.recovery_generation or b.external_generation<>g.external_generation or b.version<>j.binding_version
 or not wm.analytics_operator(org,j.requested_by) or not wm.analytics_operator(org,b.configured_by) or c.revoked_at is not null or c.state not in ('connected','refreshing') or c.recovery_generation<>g.recovery_generation or c.external_generation<>g.external_generation or not wm.connection_actor_current(org,c.authorized_by,c.actor_kind)
 or (c.actor_kind='operator' and not wm.operator_for(org,c.authorized_by,'ads'))
 or s.id is null or s.version<>b.scope_version or s.credential_id is distinct from c.id or s.account_id<>b.account_id or s.provider<>b.provider or s.engagement_id<>b.engagement_id or s.access_status<>'read_verified'
 or not exists(select 1 from wm.engagements where organization_id=org and id=b.engagement_id and service_state not in ('ending','closed')) then raise exception 'Analytics binding or authority changed' using errcode='42501';end if;
 if j.status in ('publish_queued','publishing') and (not wm.analytics_operator(org,j.publish_actor) or not exists(select 1 from auth.sessions where id=j.publish_session and user_id=j.publish_actor and (not_after is null or not_after>clock_timestamp()))) then raise exception 'Publishing session ended' using errcode='28000';end if;
 return b;
end $function$;

-- public.wm_request_accept(uuid,jsonb,text)
CREATE OR REPLACE FUNCTION public.wm_request_accept(p_org uuid, p_input jsonb, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; r wm.requests; due timestamptz; next_contact timestamptz;
begin
  perform wm.require_access(p_org,'delivery');
  perform wm.check_input(p_input,array['request_id','expected_version','scope','coverage','owner_id','due_at','next_contact_at','approver_id','blockers'],array['request_id','expected_version','scope','coverage','owner_id','due_at','next_contact_at','approver_id']);
  result:=wm.prior_command(p_org,'request.accept',p_key,p_input);if result is not null then return result;end if;
  select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);
  if r.state not in ('received','triage','waiting','changes_requested') then raise exception 'Work cannot be accepted from this state' using errcode='22023';end if;
  if not wm.operator_for(p_org,(p_input->>'owner_id')::uuid,'delivery') then raise exception 'Choose an assigned owner' using errcode='22023';end if;
  if not exists(select 1 from wm.engagement_authorities a join wm.memberships m on m.organization_id=a.organization_id and m.user_id=a.user_id where a.organization_id=p_org and a.engagement_id=r.engagement_id and a.user_id=(p_input->>'approver_id')::uuid and a.domain in ('content','spending') and a.revoked_at is null and a.starts_at<=now() and a.ends_at>now() and m.status='active' and m.role<>'viewer') then raise exception 'Confirm the named approver first' using errcode='22023';end if;
  due:=(p_input->>'due_at')::timestamptz;next_contact:=(p_input->>'next_contact_at')::timestamptz;
  if due<=now() or next_contact<=now() then raise exception 'Choose a future date' using errcode='22023';end if;
  update wm.requests set state='accepted',accepted_scope=wm.require_text(p_input->>'scope','scope'),coverage=wm.require_text(p_input->>'coverage','coverage'),owner_user_id=(p_input->>'owner_id')::uuid,approver_user_id=(p_input->>'approver_id')::uuid,due_at=due,next_contact_at=next_contact,waiting_reason=nullif(p_input->>'blockers',''),version=version+1,updated_at=now() where organization_id=p_org and id=r.id returning * into r;
  return wm.finish_command(p_org,'request.accept',p_key,p_input,jsonb_build_object('id',r.id,'version',r.version,'state',r.state),r.id);
end $function$;

-- wm.service_context(uuid,wm.operations), final notification generation fences retained
create or replace function wm.service_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.notification_channels;b wm.notification_batches;n wm.notification_notices;p wm.notification_preferences;ctx jsonb;address text;recipient uuid;kind_name text;zone text;
begin
 if op.kind not in ('message_notify','notice_notify','invitation_notify') then return wm.service_context_before_notifications(org,op);end if;
 select ch.* into c from wm.notification_channels ch join wm.notification_routes r on r.channel_id=ch.id where r.organization_id=org and ch.enabled;
 if c.id is null then raise exception 'Notification channel unqualified' using errcode='42501';end if;
 if op.kind='invitation_notify' then
  if not exists(select 1 from wm.invitations i where i.organization_id=org and i.id=(op.payload->>'invitation_id')::uuid and i.expires_at>clock_timestamp()
   and (exists(select 1 from wm.memberships m where m.organization_id=org and m.user_id=i.invited_by and m.status='active' and m.revoked_at is null and m.role='customer_admin')
    or wm.operator_for(org,i.invited_by,'people'))) then raise exception 'Invitation authority expired' using errcode='42501';end if;
  ctx:=wm.service_context_before_notifications(org,op);address:=ctx->>'email';recipient:=(ctx->>'identity_id')::uuid;kind_name:='invitation';
 elsif op.kind='notice_notify' then
  select * into n from wm.notification_notices where organization_id=org and id=(op.payload->>'notice_id')::uuid;
  if not found then raise exception 'Mandatory notice evidence unavailable' using errcode='42501';end if;
  if not exists(select 1 from wm.critical_receipts r join wm.tenant_guards g on g.organization_id=r.organization_id where r.organization_id=org and r.id=n.receipt_id and r.external_generation=g.external_generation) then raise exception 'Notice recovery generation changed' using errcode='42501';end if;
  recipient:=n.recipient_id;kind_name:=n.notice_type;
  select lower(email) into address from auth.users where id=recipient and email_confirmed_at is not null;
  if address is distinct from n.email_at_creation or (kind_name<>'security_access_changed' and not exists(select 1 from wm.memberships where organization_id=org and user_id=recipient and status='active' and revoked_at is null)) then raise exception 'Notice recipient no longer current' using errcode='42501';end if;
 else
  if not op.payload ? 'batch_id' then raise exception 'Legacy per-message notification requires cadence migration' using errcode='42501';end if;
  select * into b from wm.notification_batches where organization_id=org and id=(op.payload->>'batch_id')::uuid;
  if not found or b.state<>'enqueued' or b.operation_id<>op.id or b.due_at>clock_timestamp() or b.period_end+interval '7 days'<=clock_timestamp() then raise exception 'Digest unavailable or expired' using errcode='42501';end if;
  if not exists(select 1 from wm.tenant_guards where organization_id=org and recovery_generation=b.recovery_generation and external_generation=b.external_generation) then raise exception 'Digest recovery generation changed' using errcode='42501';end if;
  recipient:=b.recipient_id;kind_name:='digest';select * into p from wm.notification_preferences where organization_id=org and user_id=recipient;
  select coalesce(p.timezone,o.timezone) into zone from wm.organizations o where o.id=org;
  if coalesce(p.version,0)<>b.preference_version or coalesce(p.digest,'daily')<>b.cadence or not coalesce(p.email_enabled,true) or zone<>b.timezone then raise exception 'Digest preference changed' using errcode='42501';end if;
  select lower(u.email) into address from auth.users u join wm.memberships m on m.user_id=u.id where m.organization_id=org and m.user_id=recipient and m.status='active' and m.revoked_at is null and u.email_confirmed_at is not null;
  if not exists(select 1 from wm.notification_items i join wm.messages m on m.organization_id=i.organization_id and m.id=i.message_id where i.organization_id=org and i.batch_id=b.id and m.visibility='shared') then raise exception 'Digest audience unavailable' using errcode='42501';end if;
 end if;
 if address is null or exists(select 1 from wm.notification_blocks where channel_id=c.id and address_hash=encode(sha256(convert_to(lower(address),'UTF8')),'hex')) then raise exception 'Recipient unavailable or suppressed' using errcode='42501';end if;
 return coalesce(ctx,'{}')||jsonb_build_object('email',lower(address),'recipient_id',recipient,'notification_kind',kind_name,'channel_id',c.id,'account_id',c.account_id,'environment',c.environment,'from',c.from_address,'origin',c.workspace_origin);
end $$;

alter function public.wm_workspace(uuid) rename to wm_workspace_before_cover;
revoke all on function public.wm_workspace_before_cover(uuid) from public,anon,authenticated,service_role;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;caps text[];
begin
 result:=public.wm_workspace_before_cover(p_org);
 select coalesce(array_agg(c),'{}') into caps from unnest(array['read','delivery','reports','ads','finance','people','recovery','admin']) c where wm.operator_has(p_org,c);
 result:=jsonb_set(result,'{viewer,capabilities}',to_jsonb(caps));
 if result->'operator_data' is not null and result->'operator_data'<>'null'::jsonb then
  result:=jsonb_set(result,'{operator_data,operations}',coalesce((select jsonb_agg(o) from jsonb_array_elements(coalesce(result->'operator_data'->'operations','[]')) o where wm.operator_has(p_org,wm.operation_capability(o->>'kind'))),'[]'));
  if not 'delivery'=any(caps) then result:=jsonb_set(result,'{operator_data,ai}','[]');end if;
 end if;
 return result;
end $$;
revoke all on function public.wm_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_workspace(uuid) to authenticated;
commit;
