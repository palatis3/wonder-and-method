begin;
alter table wm.organizations add column ai_enabled boolean not null default false;
alter table wm.ai_runs add column dispatch_nonce uuid not null default gen_random_uuid();
alter table wm.ai_runs add column reviewed_text text;
alter table wm.ai_runs add column review_minutes integer check(review_minutes between 0 and 1440);
alter table wm.ai_runs add column failure_code text;
alter table wm.ai_runs add column attempt_started_at timestamptz not null default now();
alter table wm.ai_runs drop constraint ai_runs_status_check;
alter table wm.ai_runs add constraint ai_runs_status_check check(status in ('pending','prepared','accepted','rejected','stale','failed','unknown'));
create table wm.ai_attempts (
  organization_id uuid not null,run_id uuid not null,nonce uuid not null,
  state text not null check(state in ('pending','completed','failed','unknown')),
  started_at timestamptz not null default now(),ended_at timestamptz,usage jsonb,
  primary key(organization_id,nonce),foreign key(organization_id,run_id) references wm.ai_runs(organization_id,id)
);
alter table wm.ai_attempts enable row level security;
revoke all on wm.ai_attempts from public,anon,authenticated;
create function wm.ai_sources(org uuid,engagement uuid,request uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
  select coalesce(jsonb_agg(s order by s->>'ref'),'[]') into result from (
    select jsonb_build_object('ref','engagement:'||e.id,'version',e.version,'kind','engagement','data',jsonb_build_object('title',e.title,'service',e.service_type,'state',e.service_state)) s from wm.engagements e where e.organization_id=org and e.id=engagement
    union all
    select jsonb_build_object('ref','request:'||r.id,'version',r.version,'kind','request','data',to_jsonb(r)-'organization_id'-'created_by'-'approver_id'-'owner_id') from wm.requests r where r.organization_id=org and r.engagement_id=engagement and (request is null or r.id=request)
    union all
    select jsonb_build_object('ref','fact:'||f.id,'version',f.version,'kind','fact','data',jsonb_build_object('key',f.key,'value',f.value,'source',f.source,'confirmed_at',f.confirmed_at,'valid_until',f.valid_until)) from wm.business_facts f where f.organization_id=org and not exists(select 1 from wm.business_facts n where n.organization_id=org and n.supersedes_id=f.id)
    union all
    select jsonb_build_object('ref','message:'||m.id,'version',1,'kind','message','data',jsonb_build_object('body',m.body,'created_at',m.created_at,'visibility',m.visibility)) from wm.messages m where m.organization_id=org and m.engagement_id=engagement and m.visibility='shared' and (request is null or m.request_id=request)
    union all
    select jsonb_build_object('ref','revision:'||v.id,'version',v.digest,'kind','revision','data',jsonb_build_object('summary',v.summary,'cost_effect',v.cost_effect,'date_effect',v.date_effect,'manifest',v.manifest)) from wm.revisions v join wm.requests r on r.organization_id=v.organization_id and r.current_revision_id=v.id where v.organization_id=org and r.engagement_id=engagement and (request is null or r.id=request)
    union all
    select jsonb_build_object('ref','metric:'||s.id,'version',s.id,'kind','metric','data',to_jsonb(s)-'organization_id') from wm.metric_snapshots s where s.organization_id=org and s.engagement_id=engagement and not exists(select 1 from wm.metric_snapshots n where n.organization_id=org and n.supersedes_id=s.id)
  ) sources;
  if length(result::text)>60000 then raise exception 'Choose a narrower request for AI preparation' using errcode='22023';end if;
  return result;
end $$;
create function public.wm_ai_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare previous jsonb; a wm.ai_runs; sources jsonb; digest text; e uuid; r uuid; answer jsonb;
begin
  perform wm.require_access(p_org,case when p_command='ai.preference' then 'customer_admin' else 'delivery' end);
  if p_command='ai.preference' then
    perform wm.require_recent_auth();perform wm.check_input(p_input,array['enabled'],array['enabled']);
    if jsonb_typeof(p_input->'enabled')<>'boolean' then raise exception 'Choose an AI preference' using errcode='22023';end if;
  end if;
  previous:=wm.prior_command(p_org,p_command,p_key,p_input);
  if previous is not null then return previous||jsonb_build_object('dispatch',false);end if;
  if p_command='ai.preference' then
    update wm.organizations set ai_enabled=(p_input->>'enabled')::boolean,version=version+1 where id=p_org;
    answer:=jsonb_build_object('enabled',(p_input->>'enabled')::boolean);
    return wm.finish_command(p_org,p_command,p_key,p_input,answer,p_org);
  elsif p_command='ai.prepare' then
    perform wm.check_input(p_input,array['engagement_id','request_id','task_type','retry_unknown'],array['engagement_id','task_type']);
    if not (select ai_enabled from wm.organizations where id=p_org) then raise exception 'AI preparation is disabled for this business' using errcode='42501';end if;
    e:=(p_input->>'engagement_id')::uuid;r:=(p_input->>'request_id')::uuid;
    if not exists(select 1 from wm.engagements where organization_id=p_org and id=e and service_state<>'closed') or (r is not null and not exists(select 1 from wm.requests where organization_id=p_org and engagement_id=e and id=r)) then raise exception 'Work unavailable' using errcode='42501';end if;
    sources:=wm.ai_sources(p_org,e,r);digest:=wm.hash_json(sources);
    select * into a from wm.ai_runs where organization_id=p_org and task_type=p_input->>'task_type' and input_digest=digest and prompt_version='wm-ai-v1';
    if found and a.status='pending' and a.attempt_started_at<now()-interval '2 minutes' then
      update wm.ai_runs set status='unknown',failure_code='interrupted',version=version+1 where organization_id=p_org and id=a.id returning * into a;
      update wm.ai_attempts set state='unknown' where organization_id=p_org and nonce=a.dispatch_nonce and state='pending';
    end if;
    if a.id is not null and not (a.status in ('failed','stale') or (a.status='unknown' and coalesce(p_input->'retry_unknown'='true'::jsonb,false))) then
      return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',a.id,'status',a.status,'dispatch',false),a.id);
    end if;
    -- Bound provider charges even if the browser sends fresh identifiers repeatedly.
    if (select count(*) from wm.audit_events where organization_id=p_org and action='ai.prepare' and created_at>now()-interval '1 day')>=20 then raise exception 'Daily AI preparation limit reached' using errcode='22023';end if;
    if a.id is not null then
      update wm.ai_runs set status='pending',dispatch_nonce=gen_random_uuid(),attempt_started_at=now(),failure_code=null,version=version+1 where organization_id=p_org and id=a.id returning * into a;
    else
      insert into wm.ai_runs(organization_id,engagement_id,request_id,task_type,input_refs,input_digest,model_config,prompt_version,created_by)
        values(p_org,e,r,p_input->>'task_type',sources,digest,'{"provider":"openai","model":"gpt-6-astra","store":false,"max_output_tokens":3000,"reasoning":"low"}','wm-ai-v1',auth.uid()) returning * into a;
    end if;
    insert into wm.ai_attempts(organization_id,run_id,nonce,state) values(p_org,a.id,a.dispatch_nonce,'pending');
    answer:=jsonb_build_object('id',a.id,'status',a.status,'dispatch',false);
    perform wm.finish_command(p_org,p_command,p_key,p_input,answer,a.id);
    return answer||jsonb_build_object('dispatch',true,'dispatch_nonce',a.dispatch_nonce,'task_type',a.task_type,'sources',sources,'model_config',a.model_config);
  elsif p_command='ai.review' then
    perform wm.check_input(p_input,array['id','expected_version','decision','text','minutes'],array['id','expected_version','decision','minutes']);
    select * into a from wm.ai_runs where organization_id=p_org and id=(p_input->>'id')::uuid for update;
    if not found or a.status<>'prepared' then raise exception 'AI draft unavailable' using errcode='42501';end if;
    perform wm.check_version(a.version,(p_input->>'expected_version')::bigint);
    if p_input->>'decision' not in ('accepted','rejected') then raise exception 'Review this draft' using errcode='22023';end if;
    if a.input_digest<>wm.hash_json(wm.ai_sources(p_org,a.engagement_id,a.request_id)) then
      update wm.ai_runs set status='stale',version=version+1 where organization_id=p_org and id=a.id returning * into a;
    else
      if p_input->>'decision'='accepted' then perform wm.require_text(p_input->>'text','reviewed draft',16000);end if;
      update wm.ai_runs set status=p_input->>'decision',reviewed_text=p_input->>'text',review_minutes=(p_input->>'minutes')::integer,reviewed_by=auth.uid(),reviewed_at=now(),version=version+1 where organization_id=p_org and id=a.id returning * into a;
    end if;
    return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',a.id,'status',a.status,'version',a.version),a.id);
  end if;
  raise exception 'Unknown AI action' using errcode='22023';
end $$;
create function public.wm_ai_complete(p_org uuid,p_id uuid,p_nonce uuid,p_output jsonb,p_usage jsonb,p_failure text default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.ai_runs; new_status text; g wm.tenant_guards;
begin
  select * into g from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.ai_runs where organization_id=p_org and id=p_id for update;
  if not found or a.dispatch_nonce<>p_nonce then raise exception 'AI attempt unavailable' using errcode='42501';end if;
  if a.status<>'pending' then return jsonb_build_object('id',a.id,'status',a.status);end if;
  new_status:=case when p_failure='not_started' then 'failed' when p_failure is not null then 'unknown' when g.access_state<>'open' or not (select ai_enabled from wm.organizations where id=p_org) or a.input_digest<>wm.hash_json(wm.ai_sources(p_org,a.engagement_id,a.request_id)) then 'stale' else 'prepared' end;
  if new_status='prepared' and (p_output is null or jsonb_typeof(p_output)<>'object' or length(p_output::text)>24000) then raise exception 'Invalid AI output' using errcode='22023';end if;
  update wm.ai_runs set status=new_status,output=case when new_status='prepared' then p_output end,usage=p_usage,failure_code=p_failure,version=version+1 where organization_id=p_org and id=p_id;
  update wm.ai_attempts set state=case when p_failure='not_started' then 'failed' when p_failure is not null then 'unknown' else 'completed' end,usage=p_usage,ended_at=now() where organization_id=p_org and nonce=p_nonce;
  return jsonb_build_object('id',p_id,'status',new_status);
end $$;
revoke all on function wm.ai_sources(uuid,uuid,uuid),public.wm_ai_command(uuid,text,jsonb,text),public.wm_ai_complete(uuid,uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.wm_ai_command(uuid,text,jsonb,text) to authenticated;
grant execute on function public.wm_ai_complete(uuid,uuid,uuid,jsonb,jsonb,text) to service_role;
create or replace function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; is_operator boolean; can_finance boolean;
begin
  perform wm.require_access(p_org,'read');is_operator:=wm.operator_has(p_org,'read');can_finance:=wm.operator_has(p_org,'finance') or wm.member_role(p_org)='customer_admin';
  update wm.ai_runs a set status='stale',version=version+1 where a.organization_id=p_org and a.status in ('prepared','accepted') and a.input_digest<>wm.hash_json(wm.ai_sources(p_org,a.engagement_id,a.request_id));
  select jsonb_build_object(
    'business',jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'version',o.version,'ai_enabled',o.ai_enabled),
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
      'ai',(select coalesce(jsonb_agg(to_jsonb(x)-'dispatch_nonce'),'[]') from wm.ai_runs x where x.organization_id=p_org),
      'opportunities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from wm.opportunities x where x.organization_id=p_org),
      'receipt_backlog',(select count(*) from wm.critical_receipts x where x.organization_id=p_org and x.durability_status<>'durable')
    ) else null end
  ) into result from wm.organizations o where o.id=p_org;
  return result;
end $$;

commit;
