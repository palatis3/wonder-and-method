begin;
-- Approved invite-only phase: availability never implies a malware scan.
alter table wm.attachments drop constraint attachments_scan_state_check;
alter table wm.attachments add constraint attachments_scan_state_check check(scan_state in ('received','quarantined','checking','ready','unscanned','rejected','expired'));
alter table wm.attachments add constraint attachments_unscanned_seal_check check(scan_state<>'unscanned' or (checksum is not null and sealed_object_key is not null and actual_bytes=declared_bytes and scan_policy_version='invite-only-unscanned-v1'));
create or replace function public.wm_file_access(p_org uuid,p_id uuid,p_action text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;
begin
  perform wm.require_access(p_org,case when p_action='upload' then 'write' else 'read' end);
  select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
  if not found or not wm.file_visible(f) then raise exception 'File unavailable' using errcode='42501';end if;
  if p_action='upload' then
    if f.uploader_id<>auth.uid() or f.scan_state<>'received' or f.expires_at<=now() then raise exception 'Upload authorization expired or already used' using errcode='42501';end if;
    return jsonb_build_object('id',f.id,'engagement_id',f.engagement_id,'object_key',f.upload_object_key,'media_type',f.declared_media_type,'bytes',f.declared_bytes,'name',f.original_name);
  elsif p_action='download' then
    if f.scan_state not in ('ready','unscanned') or f.sealed_object_key is null then raise exception 'File checks are not complete' using errcode='42501';end if;
    return jsonb_build_object('id',f.id,'engagement_id',f.engagement_id,'object_key',f.sealed_object_key,'media_type',f.actual_media_type,'bytes',f.actual_bytes,'name',f.original_name,'checksum',f.checksum,'malware_status',case when f.scan_state='unscanned' then 'unscanned' else 'scanned' end);
  else raise exception 'Unsupported file action' using errcode='22023';end if;
end $$;

create function public.wm_file_release_unscanned(p_org uuid,p_id uuid,p_checksum text,p_sealed_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;guard wm.tenant_guards;
begin
 perform wm.require_machine();select * into guard from wm.tenant_guards where organization_id=p_org for update;
 select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
 if not found or f.deleted_at is not null or f.checksum is distinct from p_checksum or guard.access_state<>'open' then raise exception 'File changed or unavailable' using errcode='42501';end if;
 if not exists(select 1 from wm.memberships where organization_id=p_org and user_id=f.uploader_id and status='active' and revoked_at is null)
  and not exists(select 1 from wm.operator_assignments where organization_id=p_org and user_id=f.uploader_id and revoked_at is null and active_until>now() and capabilities&&array['delivery','admin']) then raise exception 'Uploader access no longer current' using errcode='42501';end if;
 if p_sealed_key is distinct from p_org||'/'||p_id||'/'||p_checksum then raise exception 'Sealed object identity required' using errcode='22023';end if;
 if f.scan_state='unscanned' and f.sealed_object_key=p_sealed_key then return jsonb_build_object('id',f.id,'state','unscanned');end if;
 if f.scan_state not in ('quarantined','checking') then raise exception 'File cannot be released unscanned' using errcode='42501';end if;
 update wm.attachments set scan_state='unscanned',scan_policy_version='invite-only-unscanned-v1',scan_observation=jsonb_build_object('malware_scanned',false,'policy','invite-only-unscanned-v1','checksum',p_checksum,'observed_at',now()),sealed_object_key=p_sealed_key,version=version+1 where organization_id=p_org and id=p_id;
 return jsonb_build_object('id',f.id,'state','unscanned');
end $$;
revoke all on function public.wm_file_release_unscanned(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.wm_file_release_unscanned(uuid,uuid,text,text) to service_role;
create or replace function public.wm_billing_command_before_adjustments(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
   select * into f from wm.attachments where organization_id=p_org and id=(p_input->>'attachment_id')::uuid and engagement_id=s.engagement_id and scan_state in ('ready','unscanned') and deleted_at is null;
   if not found then raise exception 'An available hosting bill for this service is required' using errcode='42501';end if;
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

revoke all on function public.wm_billing_command_before_adjustments(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
commit;
