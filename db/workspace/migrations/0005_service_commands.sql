begin;
create function public.wm_businesses() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to continue' using errcode='28000';end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'role',wm.member_role(o.id),'operator',wm.operator_has(o.id,'read')) order by o.name),'[]'::jsonb)
    from wm.organizations o join wm.tenant_guards g on g.organization_id=o.id
    where g.access_state='open' and (wm.member_role(o.id) is not null or wm.operator_has(o.id,'read')));
end $$;

create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; is_operator boolean; can_finance boolean;
begin
  perform wm.require_access(p_org,'read');is_operator:=wm.operator_has(p_org,'read');can_finance:=wm.operator_has(p_org,'finance') or wm.member_role(p_org)='customer_admin';
  select jsonb_build_object(
    'business',jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'version',o.version),
    'viewer',jsonb_build_object('id',auth.uid(),'role',wm.member_role(p_org),'operator',is_operator),
    'engagements',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]') from wm.engagements x where x.organization_id=p_org),
    'requests',(select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc),'[]') from wm.requests x where x.organization_id=p_org),
    'messages',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]') from wm.messages x where x.organization_id=p_org and (is_operator or x.visibility='shared')),
    'revisions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from wm.revisions x where x.organization_id=p_org),
    'decisions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from wm.decisions x where x.organization_id=p_org),
    'files',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'engagement_id',x.engagement_id,'request_id',x.request_id,'message_id',x.message_id,'name',x.original_name,'bytes',x.declared_bytes,'state',x.scan_state,'visibility',x.visibility,'version',x.version)),'[]') from wm.attachments x where x.organization_id=p_org and x.deleted_at is null and (is_operator or x.visibility='shared' or (x.visibility='draft' and x.uploader_id=auth.uid()))),
    'people',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.display_name,'Member'),'role',m.role,'status',m.status,'version',m.version)),'[]') from wm.memberships m left join wm.profiles p on p.user_id=m.user_id where m.organization_id=p_org),
    'authorities',(select coalesce(jsonb_agg(to_jsonb(x)-'evidence'-'verified_by'),'[]') from wm.engagement_authorities x where x.organization_id=p_org),
    'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'engagement_id',x.engagement_id,'provider',x.provider,'account_id',x.account_id,'environment',x.environment,'access_status',x.access_status,'observed_state',x.observed_state,'observed_at',x.observed_at,'last_checked_at',x.last_checked_at)),'[]') from wm.provider_scopes x where x.organization_id=p_org),
    'stops',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.stop_intents x where x.organization_id=p_org),
    'commitments',(select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at),'[]') from wm.commitments x where x.organization_id=p_org),
    'access',(select coalesce(jsonb_agg(to_jsonb(x)-'evidence'),'[]') from wm.access_requirements x where x.organization_id=p_org),
    'facts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.business_facts x where x.organization_id=p_org and not exists(select 1 from wm.business_facts newer where newer.organization_id=p_org and newer.supersedes_id=x.id)),
    'entitlements',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.entitlements x where x.organization_id=p_org),
    'seo',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.seo_items x where x.organization_id=p_org),
    'care',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.care_checks x where x.organization_id=p_org),
    'leads',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.lead_outcomes x where x.organization_id=p_org),
    'reports',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.reports x where x.organization_id=p_org and (is_operator or x.status in ('published','superseded'))),
    'payments',(select coalesce(jsonb_agg(to_jsonb(x)-'account_id'),'[]') from wm.payment_references x where x.organization_id=p_org and can_finance),
    'billing',(select coalesce(jsonb_agg(to_jsonb(x)-'provider_subscription_id'),'[]') from wm.billing_schedules x where x.organization_id=p_org and can_finance),
    'closures',(select coalesce(jsonb_agg(to_jsonb(x)-'evidence'),'[]') from wm.closures x where x.organization_id=p_org),
    'preferences',(select to_jsonb(x) from wm.notification_preferences x where x.organization_id=p_org and x.user_id=auth.uid()),
    'absences',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.absence_windows x where x.organization_id=p_org),
    'exports',(select coalesce(jsonb_agg(to_jsonb(x)-'object_key'-'manifest'),'[]') from wm.export_jobs x where x.organization_id=p_org and x.requested_by=auth.uid()),
    'operator_data',case when is_operator then jsonb_build_object(
      'operations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.operations x where x.organization_id=p_org),
      'incidents',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.incidents x where x.organization_id=p_org),
      'time',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.time_entries x where x.organization_id=p_org),
      'ai',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.ai_runs x where x.organization_id=p_org),
      'opportunities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.opportunities x where x.organization_id=p_org),
      'receipt_backlog',(select count(*) from wm.critical_receipts x where x.organization_id=p_org and x.durability_status<>'durable')
    ) else null end
  ) into result from wm.organizations o where o.id=p_org;
  return result;
end $$;

create function public.wm_service_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
      select max(period_end) into effective from wm.payment_references where organization_id=p_org and engagement_id=e.id and period_end>now() and object_type in ('invoice','subscription');
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

revoke all on function public.wm_businesses(),public.wm_workspace(uuid),public.wm_service_command(uuid,text,jsonb,text) from public,anon;
grant execute on function public.wm_businesses(),public.wm_workspace(uuid),public.wm_service_command(uuid,text,jsonb,text) to authenticated;
revoke all on all functions in schema wm from public,anon,authenticated;
commit;
