begin;
alter table wm.lead_outcomes drop constraint lead_outcomes_outcome_check;
alter table wm.lead_outcomes add constraint lead_outcomes_outcome_check check(outcome in ('unknown','booked','attended','no_show','suitable','not_suitable','won','lost','existing_system'));
alter table wm.lead_outcomes add column definition_version text not null default 'legacy-feedback-v1',add column retention_until timestamptz not null default now()+interval '180 days';
create table wm.outcome_events (
 organization_id uuid not null,id uuid not null default gen_random_uuid(),lead_id uuid not null,event_key text not null,payload_digest text not null,
 event_at timestamptz not null,outcome text not null,value_minor bigint,currency text,definition_version text not null,consent_ref text not null,
 time_basis text not null default 'reported_occurrence' check(time_basis in ('reported_occurrence','legacy_confirmation')),recorded_by uuid,recorded_at timestamptz not null default now(),supersedes_id uuid,
 primary key(organization_id,id),unique(organization_id,lead_id,event_key),
 foreign key(organization_id,lead_id) references wm.lead_outcomes(organization_id,id),foreign key(organization_id,supersedes_id) references wm.outcome_events(organization_id,id)
);
create trigger outcome_history_immutable before update or delete on wm.outcome_events for each row execute function wm.reject_history_edit();
alter table wm.outcome_events enable row level security;
revoke all on wm.outcome_events from public,anon,authenticated,service_role;
create function wm.outcome_baseline(p_org uuid,p_lead uuid) returns void language sql volatile security definer set search_path='' as $$
 insert into wm.outcome_events(organization_id,lead_id,event_key,payload_digest,event_at,outcome,value_minor,currency,definition_version,consent_ref,time_basis,recorded_by,recorded_at)
 select l.organization_id,l.id,'legacy_confirmation',wm.hash_json(to_jsonb(l)),l.last_confirmed_at,l.outcome,l.value_minor,l.currency,l.definition_version,coalesce(l.consent_ref,'Legacy source consent needs review'),'legacy_confirmation',l.confirmed_by,l.last_confirmed_at
 from wm.lead_outcomes l where l.organization_id=p_org and l.id=p_lead and l.last_confirmed_at is not null
 and not exists(select 1 from wm.outcome_events e where e.organization_id=l.organization_id and e.lead_id=l.id);
$$;
select wm.outcome_baseline(organization_id,id) from wm.lead_outcomes where last_confirmed_at is not null;
revoke all on function wm.outcome_baseline(uuid,uuid) from public,anon,authenticated,service_role;
create function public.wm_outcome_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;l wm.lead_outcomes;ev wm.outcome_events;prior wm.outcome_events;rid uuid;ver bigint;event_at timestamptz;received timestamptz;retention timestamptz;value_amount bigint;
begin
 if wm.operator_has(p_org,'reports') then perform wm.require_access(p_org,'reports');else perform wm.require_access(p_org,'write');end if;
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command<>'outcome.record' then raise exception 'Unsupported outcome action' using errcode='22023';end if;
 perform wm.check_input(p_input,array['engagement_id','id','expected_version','source','source_key','received_at','event_key','event_at','outcome','value_minor','currency','definition_version','consent_ref','retention_until','supersedes_id'],array['engagement_id','event_key','event_at','outcome','definition_version','consent_ref']);
 perform 1 from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid;
 if not found then raise exception 'Service unavailable' using errcode='42501';end if;
 if p_input->>'event_key' !~ '^[A-Za-z0-9_-]{1,120}$' or p_input->>'event_key'='legacy_confirmation' then raise exception 'Use a pseudonymous event reference' using errcode='22023';end if;
 if p_input->>'outcome' not in ('unknown','booked','attended','no_show','suitable','not_suitable','won','lost','existing_system') then raise exception 'Choose a supported outcome' using errcode='22023';end if;
 event_at:=(p_input->>'event_at')::timestamptz;if not isfinite(event_at) or event_at>now()+interval '5 minutes' then raise exception 'Check the outcome date' using errcode='22023';end if;
 perform wm.require_text(p_input->>'definition_version','outcome definition',160);perform wm.require_text(p_input->>'consent_ref','consent and source reference',500);
 value_amount:=(p_input->>'value_minor')::bigint;
 if value_amount is not null and (value_amount<0 or value_amount>9007199254740991 or p_input->>'outcome'<>'won' or p_input->>'currency' is null or p_input->>'currency' !~ '^[A-Z]{3}$') then raise exception 'Only a confirmed win can have a nonnegative amount and currency' using errcode='22023';end if;
 if p_input->>'id' is not null then
  select * into l from wm.lead_outcomes where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and id=(p_input->>'id')::uuid for update;
  if not found then raise exception 'Outcome unavailable' using errcode='42501';end if;
 else
  perform wm.check_input(p_input,array['engagement_id','id','expected_version','source','source_key','received_at','event_key','event_at','outcome','value_minor','currency','definition_version','consent_ref','retention_until','supersedes_id'],array['source','source_key','received_at','retention_until']);
  if p_input->>'source' not in ('client','crm','phone','booking','website') or p_input->>'source_key' !~ '^[A-Za-z0-9_-]{1,120}$' then raise exception 'Use a supported source and pseudonymous lead reference' using errcode='22023';end if;
  select * into l from wm.lead_outcomes where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and source=p_input->>'source' and source_key=p_input->>'source_key' for update;
  if found and l.occurred_at is distinct from (p_input->>'received_at')::timestamptz then raise exception 'Source reference already belongs to a different inquiry date' using errcode='40001';end if;
  if l.id is null then
   received:=(p_input->>'received_at')::timestamptz;retention:=(p_input->>'retention_until')::timestamptz;
   if not isfinite(received) or received>event_at or not isfinite(retention) or retention<=now() or retention>now()+interval '2 years' then raise exception 'Check the lead date and retention deadline' using errcode='22023';end if;
   insert into wm.lead_outcomes(organization_id,engagement_id,source_key,source,occurred_at,definition_version,consent_ref,retention_until)
    values(p_org,(p_input->>'engagement_id')::uuid,p_input->>'source_key',p_input->>'source',received,p_input->>'definition_version',p_input->>'consent_ref',retention) returning * into l;
  end if;
 end if;
 perform wm.outcome_baseline(p_org,l.id);
 select * into prior from wm.outcome_events where organization_id=p_org and lead_id=l.id and event_key=p_input->>'event_key';
 if found then
  if prior.payload_digest<>wm.hash_json(p_input) then raise exception 'Conflicting duplicate event; record an explicit correction' using errcode='40001';end if;
  return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',l.id,'version',l.version,'event_id',prior.id),l.id);
 end if;
 if l.last_confirmed_at is not null then perform wm.check_version(l.version,(p_input->>'expected_version')::bigint);end if;
 if event_at<l.occurred_at then raise exception 'Outcome cannot precede the original inquiry' using errcode='22023';end if;
 if l.retention_until<=now() then raise exception 'Outcome record has reached its retention deadline' using errcode='42501';end if;
 if p_input->>'supersedes_id' is not null then
  select * into prior from wm.outcome_events where organization_id=p_org and lead_id=l.id and id=(p_input->>'supersedes_id')::uuid;
  if not found or exists(select 1 from wm.outcome_events where organization_id=p_org and supersedes_id=prior.id) then raise exception 'Choose a current event from this inquiry to correct' using errcode='40001';end if;
 end if;
 insert into wm.outcome_events(organization_id,lead_id,event_key,payload_digest,event_at,outcome,value_minor,currency,definition_version,consent_ref,recorded_by,supersedes_id)
  values(p_org,l.id,p_input->>'event_key',wm.hash_json(p_input),event_at,p_input->>'outcome',value_amount,case when value_amount is not null then p_input->>'currency' end,p_input->>'definition_version',p_input->>'consent_ref',auth.uid(),(p_input->>'supersedes_id')::uuid) returning * into ev;
 -- Project the latest effective event; a late-arriving old event never overwrites a newer outcome.
 select * into prior from wm.outcome_events x where organization_id=p_org and lead_id=l.id and not exists(select 1 from wm.outcome_events n where n.organization_id=p_org and n.supersedes_id=x.id) order by event_at desc,recorded_at desc,id desc limit 1;
 update wm.lead_outcomes set outcome=prior.outcome,value_minor=prior.value_minor,currency=prior.currency,definition_version=prior.definition_version,consent_ref=prior.consent_ref,last_confirmed_at=now(),confirmed_by=auth.uid(),version=version+1 where organization_id=p_org and id=l.id returning id,version into rid,ver;
 perform wm.critical(p_org,p_command,rid,jsonb_build_object('lead',rid,'event',ev.id,'supersedes',ev.supersedes_id,'digest',ev.payload_digest));
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',rid,'version',ver,'event_id',ev.id),rid);
end $$;
-- Retire legacy unhistoried edits. Its other service commands keep their current implementations.
alter function public.wm_service_command(uuid,text,jsonb,text) rename to wm_service_command_before_outcomes;
revoke all on function public.wm_service_command_before_outcomes(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
create function public.wm_service_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if p_command='lead.save' then raise exception 'Use the dated outcome workflow to preserve history' using errcode='22023';end if;
 return public.wm_service_command_before_outcomes(p_org,p_command,p_input,p_key);
end $$;
alter function public.wm_workspace(uuid) rename to wm_workspace_before_outcomes;
revoke all on function public.wm_workspace_before_outcomes(uuid) from public,anon,authenticated,service_role;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.wm_workspace_before_outcomes(p_org);
 return result||jsonb_build_object('outcome_events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_at desc,x.recorded_at desc),'[]') from wm.outcome_events x join wm.lead_outcomes l on l.organization_id=x.organization_id and l.id=x.lead_id where x.organization_id=p_org and l.retention_until>now()),'leads',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from wm.lead_outcomes l where l.organization_id=p_org and l.retention_until>now()));
end $$;
revoke all on function public.wm_outcome_command(uuid,text,jsonb,text),public.wm_service_command(uuid,text,jsonb,text),public.wm_workspace(uuid) from public,anon,service_role;
grant execute on function public.wm_outcome_command(uuid,text,jsonb,text),public.wm_service_command(uuid,text,jsonb,text),public.wm_workspace(uuid) to authenticated;
commit;
