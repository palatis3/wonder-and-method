begin;
alter table wm.operations alter column engagement_id drop not null;
alter table wm.operation_attempts add column dispatch_context jsonb;
alter table wm.invitations add column delivery_state text not null default 'pending' check(delivery_state in ('pending','accepted_by_provider','failed','unknown'));
alter table wm.invitations add column provider_message_id text;

create function wm.invitation_job() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform wm.enqueue(new.organization_id,null,null,null,null,'identity_provision',jsonb_build_object('invitation_id',new.id),false,'identity-invite:'||new.id,new.invited_by);
  return new;
end $$;
create trigger invitation_effect after insert on wm.invitations for each row execute function wm.invitation_job();

create function wm.message_jobs() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  if new.visibility<>'shared' or new.direction='inbound' then return new;end if;
  for recipient in select m.user_id from wm.memberships m left join wm.notification_preferences p on p.organization_id=m.organization_id and p.user_id=m.user_id
    where m.organization_id=new.organization_id and m.status='active' and m.revoked_at is null and m.user_id is distinct from new.sender_user_id and coalesce(p.email_enabled,true) loop
    perform wm.enqueue(new.organization_id,new.engagement_id,new.request_id,null,null,'message_notify',jsonb_build_object('message_id',new.id,'recipient_id',recipient),false,'message-notify:'||new.id||':'||recipient,new.sender_user_id);
  end loop;
  return new;
end $$;
create trigger message_notification_effect after insert on wm.messages for each row execute function wm.message_jobs();

create function wm.service_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare inv wm.invitations; msg wm.messages; f wm.attachments; destination text; identity_id uuid; business text;
begin
  select name into business from wm.organizations where id=org;
  if op.kind in ('identity_provision','invitation_notify') then
    select * into inv from wm.invitations where organization_id=org and id=(op.payload->>'invitation_id')::uuid;
    if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now() then raise exception 'Invitation no longer current' using errcode='42501';end if;
    if not exists(select 1 from wm.memberships where organization_id=org and user_id=inv.invited_by and status='active' and revoked_at is null and role='customer_admin')
      and not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=inv.invited_by and revoked_at is null and active_until>now() and capabilities&&array['people','admin']) then raise exception 'Inviter no longer authorized' using errcode='42501';end if;
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
      and not exists(select 1 from wm.operator_assignments where organization_id=org and user_id=f.uploader_id and revoked_at is null and active_until>now() and capabilities&&array['delivery','admin']) then raise exception 'Uploader access no longer current' using errcode='42501';end if;
    return jsonb_build_object('file_id',f.id);
  end if;
  return null;
end $$;

alter function public.wm_attempt_begin(uuid,uuid,bigint,text) rename to wm_attempt_begin_before_services;
revoke all on function public.wm_attempt_begin_before_services(uuid,uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.wm_attempt_begin(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations; context jsonb; result jsonb;
begin
  perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
  select o.* into op from wm.operations o join wm.outbox_jobs j on j.organization_id=o.organization_id and j.operation_id=o.id where j.organization_id=p_org and j.id=p_job;
  context:=wm.service_context(p_org,op);
  result:=public.wm_attempt_begin_before_services(p_org,p_job,p_lease_generation,p_external_generation);
  update wm.operation_attempts set dispatch_context=context where organization_id=p_org and id=(result->'attempt'->>'id')::uuid;
  return result||jsonb_build_object('context',context);
end $$;
create function public.wm_service_effect_context(p_org uuid,p_attempt uuid,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations; a wm.operation_attempts; g wm.tenant_guards;
begin
  perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
  if not found or a.state in ('resolved','cancelled_before_dispatch') or a.external_generation<>g.external_generation or a.recovery_generation<>g.recovery_generation or g.access_state<>'open' then raise exception 'Attempt no longer current' using errcode='42501';end if;
  select * into op from wm.operations where organization_id=p_org and id=a.operation_id;
  return wm.service_context(p_org,op);
end $$;

alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_services;
revoke all on function public.wm_attempt_resolve_before_services(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;op wm.operations;inv wm.invitations;
begin
  result:=public.wm_attempt_resolve_before_services(p_org,p_attempt,p_nonce,p_proof);
  select o.* into op from wm.operations o join wm.operation_attempts a on a.organization_id=o.organization_id and a.operation_id=o.id where a.organization_id=p_org and a.id=p_attempt and a.dispatch_nonce=p_nonce;
  if result->>'state'='verified' and op.kind='identity_provision' then
    select * into inv from wm.invitations where organization_id=p_org and id=(op.payload->>'invitation_id')::uuid;
    if inv.revoked_at is null and inv.accepted_at is null and inv.expires_at>now() then
      perform wm.enqueue(p_org,null,null,null,null,'invitation_notify',jsonb_build_object('invitation_id',inv.id),false,'invitation-notify:'||inv.id,inv.invited_by);
    end if;
  elsif result->>'state'='verified' and op.kind='invitation_notify' then
    update wm.invitations set delivery_state='accepted_by_provider',provider_message_id=p_proof->>'provider_reference' where organization_id=p_org and id=(op.payload->>'invitation_id')::uuid;
  end if;
  return result;
end $$;
create function public.wm_job_attention(p_org uuid,p_job uuid,p_lease_generation bigint,p_reason text) returns void language plpgsql volatile security definer set search_path='' as $$
begin
  perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
  update wm.outbox_jobs j set state='attention',last_error_code=left(p_reason,100)
    where j.organization_id=p_org and j.id=p_job and j.state='leased' and j.lease_generation=p_lease_generation
      and not exists(select 1 from wm.operation_attempts where organization_id=p_org and operation_id=j.operation_id);
end $$;
create function public.wm_attempt_checkpoint(p_org uuid,p_attempt uuid,p_nonce uuid,p_reference text) returns void language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts;g wm.tenant_guards;
begin
  perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
  if not found or a.external_generation<>g.external_generation or a.recovery_generation<>g.recovery_generation or a.state in ('resolved','cancelled_before_dispatch') then raise exception 'Attempt no longer current' using errcode='42501';end if;
  perform wm.require_text(p_reference,'provider reference',300);
  update wm.operations set provider_reference=p_reference where organization_id=p_org and id=a.operation_id and (provider_reference is null or provider_reference=p_reference);
  if not found then raise exception 'Conflicting provider reference' using errcode='40001';end if;
end $$;
create function public.wm_unresolved_attempts(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
  perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023';end if;
  with selected as (
    select j.organization_id,j.id from wm.outbox_jobs j join wm.operations o on o.organization_id=j.organization_id and o.id=j.operation_id
      where o.state in ('unknown','in_flight') and j.not_before<=now() and (j.state='attention' or j.lease_until<now())
      order by j.not_before,j.id for update of j skip locked limit p_limit
  ), postponed as (
    update wm.outbox_jobs j set not_before=now()+interval '5 minutes' from selected s where j.organization_id=s.organization_id and j.id=s.id returning j.organization_id,j.operation_id
  ) select coalesce(jsonb_agg(jsonb_build_object('operation',to_jsonb(o),'attempt',to_jsonb(a),'context',a.dispatch_context,'scope',to_jsonb(s))),'[]') into result
    from postponed j join wm.operations o on o.organization_id=j.organization_id and o.id=j.operation_id
      join lateral (select * from wm.operation_attempts x where x.organization_id=o.organization_id and x.operation_id=o.id and x.state not in ('resolved','cancelled_before_dispatch') order by started_at desc,id desc limit 1) a on true
      left join wm.provider_scopes s on s.organization_id=o.organization_id and s.id=o.provider_scope_id;
  return result;
end $$;
create function public.wm_service_readback(p_org uuid,p_attempt uuid,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts;op wm.operations;g wm.tenant_guards;identity_id uuid;f wm.attachments;
begin
  perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
  if not found or g.access_state<>'open' or a.external_generation<>g.external_generation or a.recovery_generation<>g.recovery_generation then raise exception 'Recovery reconciliation required' using errcode='42501';end if;
  select * into op from wm.operations where organization_id=p_org and id=a.operation_id;
  if op.kind='identity_provision' then
    select id into identity_id from auth.users where lower(email)=a.dispatch_context->>'email';
    return jsonb_build_object('identity_id',identity_id);
  elsif op.kind='file_scan' then
    select * into f from wm.attachments where organization_id=p_org and id=(op.payload->>'file_id')::uuid and deleted_at is null and checksum=op.payload->>'checksum';
    if not found then raise exception 'File evidence unavailable' using errcode='42501';end if;
    return jsonb_build_object('id',f.id,'state',f.scan_state,'checksum',f.checksum,'bytes',f.actual_bytes,'object_key',f.sealed_object_key);
  end if;
  return null;
end $$;
create function public.wm_reconcile_request(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op wm.operations;result jsonb;
begin
  perform wm.require_access(p_org,'read');perform wm.check_input(p_input,array['operation_id','expected_version'],array['operation_id','expected_version']);
  result:=wm.prior_command(p_org,'operation.reconcile',p_key,p_input);if result is not null then return result;end if;
  select * into op from wm.operations where organization_id=p_org and id=(p_input->>'operation_id')::uuid for update;
  if not found then raise exception 'Operation unavailable' using errcode='42501';end if;
  perform wm.require_access(p_org,case when wm.ad_provider(op.kind) is not null then 'ads' else 'delivery' end);
  perform wm.check_version(op.version,(p_input->>'expected_version')::bigint);
  if op.state not in ('unknown','in_flight') then raise exception 'Only unresolved attempts need readback' using errcode='22023';end if;
  update wm.outbox_jobs set not_before=now() where organization_id=p_org and operation_id=op.id;
  return wm.finish_command(p_org,'operation.reconcile',p_key,p_input,jsonb_build_object('id',op.id,'state','readback_requested'),op.id);
end $$;
revoke all on function public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_service_effect_context(uuid,uuid,uuid),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_job_attention(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_service_effect_context(uuid,uuid,uuid),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb),public.wm_job_attention(uuid,uuid,bigint,text) to service_role;
revoke all on function public.wm_attempt_checkpoint(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.wm_attempt_checkpoint(uuid,uuid,uuid,text) to service_role;
revoke all on function public.wm_unresolved_attempts(integer),public.wm_service_readback(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.wm_unresolved_attempts(integer),public.wm_service_readback(uuid,uuid,uuid) to service_role;
revoke all on function public.wm_reconcile_request(uuid,jsonb,text) from public,anon;
grant execute on function public.wm_reconcile_request(uuid,jsonb,text) to authenticated;
revoke all on all functions in schema wm from public,anon,authenticated;
commit;
