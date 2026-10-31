begin;
create function wm.ad_provider(kind_name text) returns text language sql immutable set search_path='' as $$
select case split_part(kind_name,'_',1) when 'google' then 'google_ads' when 'meta' then 'meta_ads' when 'microsoft' then 'microsoft_ads' when 'tiktok' then 'tiktok_ads' when 'linkedin' then 'linkedin_ads' end
$$;
create function wm.pause_kind(provider_name text) returns text language sql immutable set search_path='' as $$
select case provider_name when 'google_ads' then 'google_pause' when 'meta_ads' then 'meta_pause' when 'microsoft_ads' then 'microsoft_pause' when 'tiktok_ads' then 'tiktok_pause' when 'linkedin_ads' then 'linkedin_pause' end
$$;
create table wm.campaign_bindings (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), provider_scope_id uuid not null,
  resource_name text not null, approved_revision_id uuid, desired_state text not null default 'PAUSED',
  observed_state text not null default 'UNVERIFIED', observed_at timestamptz,
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(provider_scope_id,resource_name),
  foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id),
  foreign key(organization_id,approved_revision_id) references wm.revisions(organization_id,id),
  check(resource_name ~ '^(customers/[0-9]+/campaigns/[0-9]+|meta/[0-9]+/campaigns/[0-9]+|microsoft/[0-9]+/campaigns/[0-9]+|tiktok/[0-9]+/campaigns/[0-9]+|linkedin/[0-9]+/campaigns/[0-9]+)$')
);
alter table wm.campaign_bindings enable row level security;
revoke all on wm.campaign_bindings from public,anon,authenticated;
create function wm.require_machine() returns void language plpgsql volatile set search_path='' as $$
begin if coalesce(auth.role(),'')<>'service_role' then raise exception 'Worker identity required' using errcode='42501';end if;end $$;
create function wm.enqueue(org uuid,engagement uuid,request uuid,revision uuid,scope uuid,kind_name text,parameters jsonb,positive boolean,key text,actor uuid default auth.uid()) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare guard wm.tenant_guards; remote wm.provider_scopes; op uuid; d text;
begin
  select * into guard from wm.tenant_guards where organization_id=org for update;
  if not found then raise exception 'Unknown business' using errcode='42501';end if;
  if scope is not null then
    select * into remote from wm.provider_scopes where organization_id=org and id=scope and engagement_id=engagement for update;
    if not found then raise exception 'Account mapping unavailable' using errcode='42501';end if;
  end if;
  if revision is not null then select digest into d from wm.revisions where organization_id=org and id=revision and request_id=request;end if;
  insert into wm.operations(organization_id,engagement_id,request_id,revision_id,provider_scope_id,actor_id,operation_key,kind,desired_digest,payload,positive_effect,authority_version,recovery_generation,external_generation,stop_epoch)
    values(org,engagement,request,revision,scope,actor,key,kind_name,d,parameters,positive,guard.authority_version,guard.recovery_generation,guard.external_generation,remote.stop_epoch)
    on conflict(organization_id,operation_key) do nothing returning id into op;
  if op is null then select id into op from wm.operations where organization_id=org and operation_key=key;return op;end if;
  insert into wm.outbox_jobs(organization_id,operation_id,kind,priority) values(org,op,kind_name,case when kind_name like '%_pause' then 100 else 0 end);
  return op;
end $$;
create function wm.request_stop(org uuid,engagement uuid,reason_text text,actor uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare remote wm.provider_scopes; stop_id uuid; op uuid; result jsonb:='[]'; resources jsonb;
begin
  perform 1 from wm.tenant_guards where organization_id=org for update;
  for remote in select * from wm.provider_scopes where organization_id=org and engagement_id=engagement and provider in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads') order by id for update loop
    -- Resource identity comes from the account mapping, never a customer list.
    select coalesce(jsonb_agg(resource_name order by resource_name),'[]'::jsonb) into resources from wm.campaign_bindings where organization_id=org and provider_scope_id=remote.id;
    stop_id:=gen_random_uuid();
    insert into wm.stop_intents(organization_id,id,engagement_id,provider_scope_id,stop_epoch,actor_id,reason,managed_resources)
      values(org,stop_id,engagement,remote.id,remote.stop_epoch+1,actor,reason_text,resources);
    update wm.provider_scopes set stop_epoch=stop_epoch+1,active_stop_id=stop_id,version=version+1 where organization_id=org and id=remote.id;
    update wm.operations set state='cancelled',last_error_code='active_stop',version=version+1 where organization_id=org and provider_scope_id=remote.id and positive_effect and state='pending';
    update wm.outbox_jobs j set state='cancelled' from wm.operations o where j.organization_id=org and o.organization_id=org and j.operation_id=o.id and o.state='cancelled' and j.state in ('pending','leased');
    insert into wm.stop_attempt_links(organization_id,stop_id,attempt_id)
      select org,stop_id,a.id from wm.operation_attempts a join wm.operations o on o.organization_id=a.organization_id and o.id=a.operation_id
      where a.organization_id=org and o.provider_scope_id=remote.id and o.positive_effect and a.state not in ('resolved','cancelled_before_dispatch');
    op:=wm.enqueue(org,engagement,null,null,remote.id,wm.pause_kind(remote.provider),jsonb_build_object('stop_id',stop_id),false,'stop:'||stop_id,actor);
    perform wm.critical(org,'ads.stop',stop_id,jsonb_build_object('stop_id',stop_id,'scope_id',remote.id,'stop_epoch',remote.stop_epoch+1,'actor_id',actor,'reason',reason_text));
    result:=result||jsonb_build_array(jsonb_build_object('stop_id',stop_id,'operation_id',op,'state','requested','account_id',remote.account_id));
  end loop;
  if jsonb_array_length(result)=0 then raise exception 'No managed ad account is connected. Contact the studio for urgent help.' using errcode='22023';end if;
  return result;
end $$;
create function public.wm_ads_stop(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; eng uuid:=(p_input->>'engagement_id')::uuid;
begin
  perform wm.require_access(p_org,'write');
  perform wm.check_input(p_input,array['engagement_id','reason'],array['engagement_id']);
  if not wm.operator_has(p_org,'ads') then
    if not exists(select 1 from wm.engagement_authorities a join wm.memberships m on m.organization_id=a.organization_id and m.user_id=a.user_id where a.organization_id=p_org and a.engagement_id=eng and a.user_id=auth.uid() and a.domain in ('stop','spending') and a.revoked_at is null and a.starts_at<=now() and a.ends_at>now() and m.status='active' and m.role<>'viewer') then raise exception 'Current defensive authority required' using errcode='42501';end if;
  end if;
  result:=wm.prior_command(p_org,'ads.stop',p_key,p_input);if result is not null then return result;end if;
  result:=wm.request_stop(p_org,eng,coalesce(nullif(p_input->>'reason',''),'Customer requested a pause'),auth.uid());
  return wm.finish_command(p_org,'ads.stop',p_key,p_input,jsonb_build_object('stops',result,'state','requested'),eng);
end $$;
create function wm.withdrawal_stop() returns trigger language plpgsql volatile security definer set search_path='' as $$
declare eng uuid; kind_name text;
begin
  if new.decision in ('withdraw','request_changes') then
    select r.engagement_id,v.kind into eng,kind_name from wm.requests r join wm.revisions v on v.organization_id=r.organization_id and v.request_id=r.id where r.organization_id=new.organization_id and v.id=new.revision_id;
    if kind_name='campaign_package' and exists(select 1 from wm.provider_scopes where organization_id=new.organization_id and engagement_id=eng and provider in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads')) then
      perform wm.request_stop(new.organization_id,eng,'Spending approval withdrawn or changes requested',new.actor_id);
    end if;
  end if;
  return new;
end $$;
create trigger decision_defensive_stop after insert on wm.decisions for each row execute function wm.withdrawal_stop();

create function public.wm_operation_prepare(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; r wm.requests; rev wm.revisions; decision wm.decisions; remote wm.provider_scopes; kind_name text; op uuid; budget wm.budget_authorizations;
begin
  kind_name:=p_input->>'kind';
  if kind_name not in ('google_create','google_update','google_enable','meta_create','meta_update','meta_enable','microsoft_create','microsoft_update','microsoft_enable','tiktok_create','tiktok_update','tiktok_enable','linkedin_create','linkedin_update','linkedin_enable','website_publish') then raise exception 'Unsupported prepared effect' using errcode='22023';end if;
  perform wm.require_access(p_org,case when wm.ad_provider(kind_name) is not null then 'ads' else 'delivery' end);
  perform wm.check_input(p_input,array['engagement_id','request_id','revision_id','digest','kind','expected_version'],array['engagement_id','request_id','revision_id','digest','kind','expected_version']);
  result:=wm.prior_command(p_org,'operation.prepare',p_key,p_input);if result is not null then return result;end if;
  select * into r from wm.requests where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);
  select * into rev from wm.revisions where organization_id=p_org and request_id=r.id and id=(p_input->>'revision_id')::uuid;
  if not found or r.current_revision_id<>rev.id or rev.digest<>p_input->>'digest' or r.state<>'approved' then raise exception 'Current approved version required' using errcode='40001';end if;
  select * into decision from wm.decisions where organization_id=p_org and revision_id=rev.id order by created_at desc,id desc limit 1;
  if decision.decision is distinct from 'approve' then raise exception 'Current approval required' using errcode='42501';end if;
  if wm.ad_provider(kind_name) is not null then
    if coalesce(rev.manifest->>'provider','google_ads')<>wm.ad_provider(kind_name) then raise exception 'Approval is for a different advertising platform' using errcode='42501';end if;
    if rev.kind<>'campaign_package' then raise exception 'Campaign approval required' using errcode='22023';end if;
    select * into remote from wm.provider_scopes where organization_id=p_org and engagement_id=r.engagement_id and provider=wm.ad_provider(kind_name) and account_id=rev.manifest->>'account_id' for update;
    if not found then raise exception 'Approved account mapping unavailable' using errcode='42501';end if;
    if remote.active_stop_id is not null then raise exception 'Explicit clearance of the active stop is required' using errcode='42501';end if;
    select * into budget from wm.budget_authorizations where organization_id=p_org and engagement_id=r.engagement_id and revision_id=rev.id and status='active' and valid_from<=now() and valid_until>now() order by valid_from desc limit 1 for update;
    if not found then raise exception 'Current budget authority required' using errcode='42501';end if;
  elsif rev.kind<>'web_preview' then raise exception 'Website artifact approval required' using errcode='22023';end if;
  -- Parameters are taken exclusively from the frozen approved manifest.
  op:=wm.enqueue(p_org,r.engagement_id,r.id,rev.id,remote.id,kind_name,jsonb_build_object('manifest',rev.manifest,'decision_id',decision.id,'budget_id',budget.id),true,'prepared:'||kind_name||':'||rev.id||':'||decision.id||':'||coalesce(remote.stop_epoch,0),auth.uid());
  return wm.finish_command(p_org,'operation.prepare',p_key,p_input,jsonb_build_object('id',op,'state','pending'),op);
end $$;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts; op wm.operations; guard wm.tenant_guards; remote wm.provider_scopes; current_stop wm.stop_intents; pending_count integer; again uuid; observed timestamptz;
begin
  perform wm.require_machine();select * into guard from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
  if not found then raise exception 'Attempt unavailable' using errcode='42501';end if;
  select * into op from wm.operations where organization_id=p_org and id=a.operation_id;
  if op.provider_scope_id is not null then select * into remote from wm.provider_scopes where organization_id=p_org and id=op.provider_scope_id for update;end if;
  perform 1 from wm.operations where organization_id=p_org and id=op.id for update;
  perform 1 from wm.operation_attempts where organization_id=p_org and id=a.id for update;
  if p_proof->>'settled' is distinct from 'true' or p_proof->>'readback_matches' is distinct from 'true' or nullif(p_proof->>'evidence_reference','') is null then raise exception 'Settled provider action and matching readback are required' using errcode='22023';end if;
  observed:=(p_proof->>'observed_at')::timestamptz;
  if observed is null or observed<a.started_at or observed>now()+interval '1 minute' then raise exception 'A current readback timestamp is required' using errcode='22023';end if;
  insert into wm.attempt_observations(organization_id,attempt_id,kind,evidence,observed_at) values(p_org,a.id,'verified_readback',p_proof,observed);
  if a.recovery_generation<>guard.recovery_generation or a.external_generation<>guard.external_generation then return jsonb_build_object('recorded',true,'current',false);end if;
  if a.state in ('resolved','cancelled_before_dispatch') then return jsonb_build_object('recorded',true,'state',a.state);end if;
  update wm.operation_attempts set state='resolved',resolved_at=now() where organization_id=p_org and id=a.id;
  update wm.outbox_jobs set state='done' where organization_id=p_org and operation_id=op.id;
  if op.kind=wm.pause_kind(remote.provider) then
    select * into current_stop from wm.stop_intents where organization_id=p_org and id=(op.payload->>'stop_id')::uuid for update;
    if current_stop.id is null or remote.active_stop_id is distinct from current_stop.id then
      update wm.operations set state='cancelled',last_error_code='stop_superseded',observed_result=p_proof,version=version+1 where organization_id=p_org and id=op.id;
      return jsonb_build_object('recorded',true,'state','superseded');
    end if;
    if p_proof->>'observed_state' is distinct from 'PAUSED' or p_proof->>'complete_managed_set' is distinct from 'true' then raise exception 'Pause readback must cover the complete managed set' using errcode='22023';end if;
    select count(*) into pending_count from wm.stop_attempt_links l join wm.operation_attempts x on x.organization_id=l.organization_id and x.id=l.attempt_id where l.organization_id=p_org and l.stop_id=current_stop.id and x.state not in ('resolved','cancelled_before_dispatch');
    if exists(select 1 from wm.stop_attempt_links l join wm.operation_attempts x on x.organization_id=l.organization_id and x.id=l.attempt_id where l.organization_id=p_org and l.stop_id=current_stop.id and x.resolved_at>observed) then pending_count:=pending_count+1;end if;
    -- An observed pause is provisional while an older positive effect can win.
    update wm.stop_intents set state=case when pending_count=0 then 'verified' else 'observed_pending' end,verified_at=case when pending_count=0 then observed else null end,version=version+1 where organization_id=p_org and id=current_stop.id;
    update wm.operations set state=case when pending_count=0 then 'verified' else 'unknown' end,observed_result=p_proof,last_error_code=case when pending_count>0 then 'older_positive_attempt_unresolved' else null end,version=version+1 where organization_id=p_org and id=op.id;
    update wm.provider_scopes set observed_state='PAUSED',observed_at=observed,version=version+1 where organization_id=p_org and id=remote.id;
    if pending_count=0 then perform wm.critical(p_org,'execution.verified',op.id,jsonb_build_object('operation_id',op.id,'attempt_id',a.id,'stop_id',current_stop.id,'proof',p_proof));end if;
    return jsonb_build_object('recorded',true,'state',case when pending_count=0 then 'verified' else 'observed_pending' end);
  end if;
  update wm.operations set state='verified',observed_result=p_proof,provider_reference=coalesce(p_proof->>'provider_reference',provider_reference),version=version+1 where organization_id=p_org and id=op.id;
  if op.positive_effect and remote.active_stop_id is not null then
    -- Reapply even if the first pause readback was already successful.
    again:=wm.enqueue(p_org,op.engagement_id,null,null,remote.id,wm.pause_kind(remote.provider),jsonb_build_object('stop_id',remote.active_stop_id),false,'stop:'||remote.active_stop_id||':after:'||a.id,op.actor_id);
    update wm.stop_intents set state='requested',verified_at=null,version=version+1 where organization_id=p_org and id=remote.active_stop_id;
  end if;
  perform wm.critical(p_org,'execution.verified',op.id,jsonb_build_object('operation_id',op.id,'attempt_id',a.id,'proof',p_proof));
  return jsonb_build_object('recorded',true,'state','verified','followup_pause',again);
end $$;

create function public.wm_jobs_claim(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
  perform wm.require_machine();
  if p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023';end if;
  -- Claim does NOT authorize dispatch. Expired leases with existing attempts
  -- become reconciliation work; they must never be silently dispatched again.
  update wm.outbox_jobs j set state='attention',last_error_code='lease_expired_with_attempt'
    where j.state='leased' and j.lease_until<now() and exists(select 1 from wm.operation_attempts a where a.organization_id=j.organization_id and a.operation_id=j.operation_id and a.state not in ('resolved','cancelled_before_dispatch'));
  with candidates as (
    select organization_id,id from wm.outbox_jobs where (state='pending' or (state='leased' and lease_until<now())) and not_before<=now()
      order by priority desc,not_before,id for update skip locked limit p_limit
  ), claimed as (
    update wm.outbox_jobs j set state='leased',lease_until=now()+interval '90 seconds',lease_generation=lease_generation+1,attempts=attempts+1
      from candidates c where j.organization_id=c.organization_id and j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;
create function public.wm_attempt_begin(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
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
    if not exists(select 1 from wm.operator_assignments where organization_id=p_org and user_id=op.actor_id and revoked_at is null and active_until>now() and (case when wm.ad_provider(op.kind) is not null then 'ads' else 'delivery' end=any(capabilities) or 'admin'=any(capabilities))) then raise exception 'Executing operator no longer assigned' using errcode='42501';end if;
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
end $$;
create function public.wm_attempt_observe(p_org uuid,p_attempt uuid,p_nonce uuid,p_kind text,p_evidence jsonb,p_observed_at timestamptz) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts; op wm.operations; guard wm.tenant_guards; remote wm.provider_scopes; again uuid;
begin
  perform wm.require_machine();select * into guard from wm.tenant_guards where organization_id=p_org for update;
  select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce for update;
  if not found then raise exception 'Attempt unavailable' using errcode='42501';end if;
  if p_kind not in ('provider_response','timeout','readback','cancelled_before_dispatch','manual_evidence','failure') or jsonb_typeof(p_evidence)<>'object' or p_observed_at>now()+interval '1 minute' then raise exception 'Invalid observation' using errcode='22023';end if;
  insert into wm.attempt_observations(organization_id,attempt_id,kind,evidence,observed_at) values(p_org,a.id,p_kind,p_evidence,p_observed_at);
  -- Stale workers may append evidence, but cannot overwrite a new generation.
  if a.recovery_generation<>guard.recovery_generation or a.external_generation<>guard.external_generation then return jsonb_build_object('recorded',true,'current',false);end if;
  select * into op from wm.operations where organization_id=p_org and id=a.operation_id for update;
  if a.state in ('resolved','cancelled_before_dispatch') then return jsonb_build_object('recorded',true,'current',true,'state',a.state);end if;
  if p_kind='timeout' then
    update wm.operation_attempts set state='unknown' where organization_id=p_org and id=a.id;
    update wm.operations set state='unknown',last_error_code='provider_result_unknown',version=version+1 where organization_id=p_org and id=op.id;
    update wm.outbox_jobs set state='attention',last_error_code='provider_result_unknown' where organization_id=p_org and operation_id=op.id;
  elsif p_kind='cancelled_before_dispatch' and a.state='dispatch_reserved' then
    update wm.operation_attempts set state='cancelled_before_dispatch',resolved_at=now() where organization_id=p_org and id=a.id;
    update wm.operations set state='cancelled',version=version+1 where organization_id=p_org and id=op.id;
    update wm.outbox_jobs set state='cancelled' where organization_id=p_org and operation_id=op.id;
    select * into remote from wm.provider_scopes where organization_id=p_org and id=op.provider_scope_id;
    if op.positive_effect and remote.active_stop_id is not null then
      again:=wm.enqueue(p_org,op.engagement_id,null,null,remote.id,wm.pause_kind(remote.provider),jsonb_build_object('stop_id',remote.active_stop_id),false,'stop:'||remote.active_stop_id||':cancelled:'||a.id,op.actor_id);
      update wm.stop_intents set state='requested',verified_at=null,version=version+1 where organization_id=p_org and id=remote.active_stop_id;
    end if;
  else
    update wm.operation_attempts set state=case when state='resolved' then state else 'observed' end,provider_request_id=coalesce(provider_request_id,p_evidence->>'request_id') where organization_id=p_org and id=a.id;
    -- An HTTP response alone never changes the operation to verified.
  end if;
  return jsonb_build_object('recorded',true,'current',true);
end $$;
revoke all on function public.wm_ads_stop(uuid,jsonb,text),public.wm_operation_prepare(uuid,jsonb,text) from public,anon;
grant execute on function public.wm_ads_stop(uuid,jsonb,text),public.wm_operation_prepare(uuid,jsonb,text) to authenticated;
revoke all on function public.wm_jobs_claim(integer),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_observe(uuid,uuid,uuid,text,jsonb,timestamptz),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wm_jobs_claim(integer),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_observe(uuid,uuid,uuid,text,jsonb,timestamptz),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) to service_role;
revoke all on all functions in schema wm from public,anon,authenticated;
commit;
