begin;

-- All new data stays behind checked RPCs. Existing grants are never overwritten.
create table wm.owner_estimates(
 organization_id uuid not null,request_id uuid not null,minutes integer not null check(minutes between 0 and 10080),
 version bigint not null default 1,updated_by uuid not null,updated_at timestamptz not null default now(),
 primary key(organization_id,request_id),foreign key(organization_id,request_id) references wm.requests(organization_id,id)
);
create table wm.owner_capacity(
 organization_id uuid not null references wm.organizations(id),user_id uuid not null,week_start date not null,timezone text not null,
 available_minutes integer not null check(available_minutes between 0 and 10080),other_minutes integer not null check(other_minutes between 0 and 10080),
 contingency_minutes integer not null check(contingency_minutes between 0 and 10080),version bigint not null default 1,
 primary key(organization_id,user_id,week_start),check(extract(isodow from week_start)=1),check(other_minutes+contingency_minutes<=available_minutes)
);
create table wm.owner_date_proposals(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),request_id uuid not null,blocking_request_id uuid,
 request_version bigint not null,request_outcome text not null,engagement_id uuid not null,engagement_title text not null,old_due_at timestamptz,old_next_contact_at timestamptz,
 due_at timestamptz not null,next_contact_at timestamptz not null,commitment_snapshot jsonb not null,
 reason text not null,created_by uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,request_id) references wm.requests(organization_id,id),
 foreign key(organization_id,blocking_request_id) references wm.requests(organization_id,id),check(request_id is distinct from blocking_request_id)
);
create table wm.owner_date_decisions(
 organization_id uuid not null,proposal_id uuid not null,decision text not null check(decision in ('accept','reject','withdraw')),
 reason text not null,actor_id uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,proposal_id),foreign key(organization_id,proposal_id) references wm.owner_date_proposals(organization_id,id)
);
create table wm.owner_covers(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),recipient_id uuid not null,issuer_id uuid not null,
 capabilities text[] not null check(cardinality(capabilities)>0 and capabilities <@ array['read','delivery','reports']::text[]),
 starts_at timestamptz not null,ends_at timestamptz not null,reason text not null,
 issuer_assignment_digest text not null,issuer_staff_digest text not null,recipient_staff_digest text not null,
 recovery_generation bigint not null,external_generation text not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,issuer_id) references wm.operator_assignments(organization_id,user_id),
 foreign key(recipient_id) references wm.staff(user_id),check(recipient_id<>issuer_id),check(ends_at>starts_at),check(ends_at<=starts_at+interval '31 days')
);
create index owner_covers_recipient on wm.owner_covers(recipient_id,organization_id,ends_at);
create table wm.owner_cover_revocations(
 organization_id uuid not null,cover_id uuid not null,actor_id uuid not null,reason text not null,created_at timestamptz not null default now(),
 primary key(organization_id,cover_id),foreign key(organization_id,cover_id) references wm.owner_covers(organization_id,id)
);
create index owner_dates_request on wm.owner_date_proposals(organization_id,request_id,created_at);

create function wm.owner_history_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Owner history is immutable' using errcode='42501';end $$;
do $$declare n text;begin
 foreach n in array array['owner_estimates','owner_capacity','owner_date_proposals','owner_date_decisions','owner_covers','owner_cover_revocations'] loop
  execute format('alter table wm.%I enable row level security',n);
  execute format('revoke all on wm.%I from public,anon,authenticated',n);
 end loop;
 foreach n in array array['owner_date_proposals','owner_date_decisions','owner_covers','owner_cover_revocations'] loop
  execute format('create trigger owner_history before update or delete on wm.%I for each row execute function wm.owner_history_immutable()',n);
 end loop;
end $$;

-- Deliberately reads base assignments, never calls a future cover-aware operator_has.
create function wm.owner_direct(org uuid,person uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from wm.operator_assignments a where a.organization_id=org and a.user_id=person and a.revoked_at is null
 and a.active_until>clock_timestamp() and (cap=any(a.capabilities) or 'admin'=any(a.capabilities)))
$$;
create function wm.owner_cover_for(org uuid,person uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(
 select 1 from wm.owner_covers c join wm.operator_assignments a on a.organization_id=c.organization_id and a.user_id=c.issuer_id
 join wm.staff s on s.user_id=c.issuer_id join wm.staff recipient on recipient.user_id=c.recipient_id
 join wm.tenant_guards g on g.organization_id=c.organization_id
 where c.organization_id=org and c.recipient_id=person and cap=any(c.capabilities)
 and c.starts_at<=clock_timestamp() and c.ends_at>clock_timestamp()
 and g.access_state='open' and g.recovery_generation=c.recovery_generation and g.external_generation=c.external_generation
 and a.revoked_at is null and a.active_until>clock_timestamp() and ('people'=any(a.capabilities) or 'admin'=any(a.capabilities))
 and s.revoked_at is null and s.active_until>clock_timestamp() and 'coverage'=any(s.capabilities)
 and recipient.revoked_at is null and recipient.active_until>clock_timestamp()
 and wm.hash_json(to_jsonb(a))=c.issuer_assignment_digest and wm.hash_json(to_jsonb(s))=c.issuer_staff_digest
 and wm.hash_json(to_jsonb(recipient))=c.recipient_staff_digest
 and exists(select 1 from auth.users u where u.id=c.recipient_id and u.email_confirmed_at is not null)
 and not exists(select 1 from wm.owner_cover_revocations x where x.organization_id=org and x.cover_id=c.id))
$$;
create function wm.owner_cover_has(org uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(wm.claims()->>'aal','')='aal2' and wm.owner_cover_for(org,auth.uid(),cap)
$$;
create function wm.owner_has(org uuid,cap text) returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(wm.claims()->>'aal','')='aal2' and exists(select 1 from wm.tenant_guards where organization_id=org and access_state='open')
 and (wm.owner_direct(org,auth.uid(),cap) or wm.owner_cover_has(org,cap))
$$;
create function wm.owner_require(org uuid,cap text) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_session();
 perform 1 from wm.tenant_guards where organization_id=org and access_state='open' for update;
 if not found then raise exception 'Business unavailable' using errcode='42501';end if;
 perform wm.require_session();
 if not wm.owner_has(org,cap) then raise exception 'Current operator capability required' using errcode='42501';end if;
 if wm.owner_direct(org,auth.uid(),cap) then perform wm.require_access(org,cap);end if;
end $$;
create function wm.owner_issuer(org uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.owner_require(org,'people');perform wm.require_recent_auth();
 if not wm.owner_direct(org,auth.uid(),'people') or not exists(select 1 from wm.staff where user_id=auth.uid() and revoked_at is null and active_until>clock_timestamp() and 'coverage'=any(capabilities)) then
  raise exception 'Current coverage staff and direct tenant authority required' using errcode='42501';
 end if;
end $$;
create function wm.owner_minutes(value jsonb) returns integer language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(value)<>'number' or value::text !~ '^[0-9]+$' or (value::text)::numeric>10080 then raise exception 'Whole minutes from 0 to 10080 required' using errcode='22023';end if;
 return (value::text)::integer;
end $$;
create function wm.owner_commitment_snapshot(org uuid,req uuid) returns jsonb language sql volatile security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'deliverable',deliverable,'due_at',due_at,'next_update_at',next_update_at) order by id),'[]')
 from wm.commitments where organization_id=org and request_id=req and status in ('open','waiting')
$$;
create function wm.owner_timestamp(value jsonb) returns timestamptz language plpgsql immutable set search_path='' as $$
declare result timestamptz;begin
 if jsonb_typeof(value)<>'string' or (value#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.+(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Explicit timezone required' using errcode='22023';end if;
 result:=(value#>>'{}')::timestamptz;
 if not isfinite(result) then raise exception 'Finite date required' using errcode='22023';end if;return result;
end $$;

create function public.wm_owner_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;rid uuid;v bigint;req wm.requests;prop wm.owner_date_proposals;c wm.owner_covers;
 a wm.operator_assignments;s wm.staff;recipient wm.staff;g wm.tenant_guards;caps text[];effective_caps text[];
 starts timestamptz;ends timestamptz;due timestamptz;contact timestamptz;week date;zone text;decision text;
 minutes integer;available integer;other_work integer;reserve integer;snapshot jsonb;decision_authority wm.engagement_authorities;
begin
 if p_input ? 'expected_version' and (jsonb_typeof(p_input->'expected_version')<>'number' or (p_input->>'expected_version') !~ '^[0-9]+$') then raise exception 'Whole numeric version required' using errcode='22023';end if;
 if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,200}$' then raise exception 'Stable action key required' using errcode='22023';end if;
 if p_command in ('owner.cover.assign','owner.cover.revoke') then perform wm.owner_issuer(p_org);
 elsif p_command='owner.date.decide' and p_input->>'decision'<>'withdraw' then
  perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
 else perform wm.owner_require(p_org,'delivery');end if;
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='owner.estimate' then
  perform wm.check_input(p_input,array['request_id','expected_version','minutes'],array['request_id','expected_version','minutes']);
  select * into req from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  select version into v from wm.owner_estimates where organization_id=p_org and request_id=req.id;
  perform wm.check_version(coalesce(v,0),(p_input->>'expected_version')::bigint);minutes:=wm.owner_minutes(p_input->'minutes');
  insert into wm.owner_estimates values(p_org,req.id,minutes,1,auth.uid(),now()) on conflict(organization_id,request_id)
   do update set minutes=excluded.minutes,version=wm.owner_estimates.version+1,updated_by=auth.uid(),updated_at=now() returning version into v;rid:=req.id;
 elsif p_command='owner.capacity' then
  perform wm.check_input(p_input,array['week_start','timezone','expected_version','available_minutes','other_minutes','contingency_minutes'],array['week_start','timezone','expected_version','available_minutes','other_minutes','contingency_minutes']);
  week:=(p_input->>'week_start')::date;zone:=p_input->>'timezone';
  if extract(isodow from week)<>1 or not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Choose a Monday and valid timezone' using errcode='22023';end if;
  select version into v from wm.owner_capacity where organization_id=p_org and user_id=auth.uid() and week_start=week;
  perform wm.check_version(coalesce(v,0),(p_input->>'expected_version')::bigint);
  available:=wm.owner_minutes(p_input->'available_minutes');other_work:=wm.owner_minutes(p_input->'other_minutes');reserve:=wm.owner_minutes(p_input->'contingency_minutes');
  insert into wm.owner_capacity values(p_org,auth.uid(),week,zone,available,other_work,reserve,1) on conflict(organization_id,user_id,week_start)
   do update set timezone=excluded.timezone,available_minutes=excluded.available_minutes,other_minutes=excluded.other_minutes,contingency_minutes=excluded.contingency_minutes,version=wm.owner_capacity.version+1 returning version into v;rid:=auth.uid();
 elsif p_command='owner.date.propose' then
  perform wm.check_input(p_input,array['request_id','expected_version','blocking_request_id','due_at','next_contact_at','reason'],array['request_id','expected_version','due_at','next_contact_at','reason']);
  select * into req from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
  if not found or req.accepted_scope is null or req.state='complete' then raise exception 'Accepted work unavailable' using errcode='42501';end if;
  perform wm.check_version(req.version,(p_input->>'expected_version')::bigint);
  if p_input->>'blocking_request_id' is not null and not exists(select 1 from wm.dependencies where organization_id=p_org and request_id=req.id and blocking_request_id=(p_input->>'blocking_request_id')::uuid) then raise exception 'Verified work dependency required' using errcode='42501';end if;
  due:=wm.owner_timestamp(p_input->'due_at');contact:=wm.owner_timestamp(p_input->'next_contact_at');
  if not isfinite(due) or not isfinite(contact) or due<=clock_timestamp() or contact<=clock_timestamp() or contact>due then raise exception 'Choose a future contact no later than delivery' using errcode='22023';end if;
  snapshot:=wm.owner_commitment_snapshot(p_org,req.id);
  insert into wm.owner_date_proposals(organization_id,request_id,blocking_request_id,request_version,request_outcome,engagement_id,engagement_title,old_due_at,old_next_contact_at,due_at,next_contact_at,commitment_snapshot,reason,created_by)
   values(p_org,req.id,(p_input->>'blocking_request_id')::uuid,req.version,req.outcome,req.engagement_id,(select title from wm.engagements where organization_id=p_org and id=req.engagement_id),req.due_at,req.next_contact_at,due,contact,snapshot,wm.require_text(p_input->>'reason','date explanation'),auth.uid()) returning id into rid;v:=1;
 elsif p_command='owner.date.decide' then
  perform wm.check_input(p_input,array['proposal_id','expected_version','decision','reason'],array['proposal_id','expected_version','decision','reason']);
  select * into prop from wm.owner_date_proposals where organization_id=p_org and id=(p_input->>'proposal_id')::uuid;
  if not found then raise exception 'Date proposal unavailable' using errcode='42501';end if;
  perform wm.check_version(case when exists(select 1 from wm.owner_date_decisions where organization_id=p_org and proposal_id=prop.id) then 2 else 1 end,(p_input->>'expected_version')::bigint);
  if exists(select 1 from wm.owner_date_decisions where organization_id=p_org and proposal_id=prop.id) then raise exception 'Date proposal already decided' using errcode='40001';end if;
  select * into req from wm.requests where organization_id=p_org and id=prop.request_id for update;
  decision:=p_input->>'decision';
  if decision='withdraw' then perform wm.owner_require(p_org,'delivery');
  elsif decision in ('accept','reject') then
   decision_authority:=wm.authority(p_org,req.engagement_id,'contract');
   if decision_authority.starts_at>clock_timestamp() or decision_authority.ends_at<=clock_timestamp() then raise exception 'Current contract authority required' using errcode='42501';end if;
  else raise exception 'Choose accept, reject or withdraw' using errcode='22023';end if;
  if decision='accept' then
   perform wm.check_version(req.version,prop.request_version);
   if req.state='complete' or prop.due_at<=clock_timestamp() or prop.next_contact_at<=clock_timestamp() or wm.owner_commitment_snapshot(p_org,req.id)<>prop.commitment_snapshot then raise exception 'Dates or commitments changed; request a new proposal' using errcode='40001';end if;
   update wm.requests set due_at=prop.due_at,next_contact_at=prop.next_contact_at,version=version+1,updated_at=now() where organization_id=p_org and id=req.id;
   update wm.commitments set due_at=prop.due_at,next_update_at=prop.next_contact_at,version=version+1 where organization_id=p_org and request_id=req.id and status in ('open','waiting');
  end if;
  insert into wm.owner_date_decisions values(p_org,prop.id,decision,wm.require_text(p_input->>'reason','decision explanation'),auth.uid(),now());rid:=prop.id;v:=2;
  perform wm.critical(p_org,'owner.date.'||decision,rid,jsonb_build_object('proposal_id',rid,'request_id',req.id,'snapshot',to_jsonb(prop)));
 elsif p_command='owner.cover.assign' then
  perform wm.check_input(p_input,array['recipient_id','capabilities','starts_at','ends_at','reason'],array['recipient_id','capabilities','starts_at','ends_at','reason']);
  if jsonb_typeof(p_input->'capabilities')<>'array' then raise exception 'Choose bounded capabilities' using errcode='22023';end if;
  select array_agg(x order by x) into caps from jsonb_array_elements_text(p_input->'capabilities') x;
  select * into a from wm.operator_assignments where organization_id=p_org and user_id=auth.uid();
  select * into s from wm.staff where user_id=auth.uid();
  select * into recipient from wm.staff where user_id=(p_input->>'recipient_id')::uuid and revoked_at is null and active_until>clock_timestamp();
  if recipient.user_id is null or recipient.user_id=auth.uid() or not exists(select 1 from auth.users where id=recipient.user_id and email_confirmed_at is not null) then raise exception 'Choose a different current verified staff identity' using errcode='42501';end if;
  effective_caps:=case when 'admin'=any(a.capabilities) then array['read','delivery','finance','people','ads','reports','recovery','admin'] else a.capabilities end;
  if caps is null or not 'read'=any(caps) or not caps <@ array['read','delivery','reports']::text[] or not caps <@ effective_caps or effective_caps <@ caps or cardinality(caps)<>(select count(distinct x) from unnest(caps) x) then raise exception 'Cover must be a strict bounded subset of issuer authority' using errcode='42501';end if;
  starts:=wm.owner_timestamp(p_input->'starts_at');ends:=wm.owner_timestamp(p_input->'ends_at');
  if not isfinite(starts) or not isfinite(ends) or starts<clock_timestamp()-interval '5 minutes' or ends<=clock_timestamp() or ends>least(a.active_until,s.active_until,recipient.active_until) then raise exception 'Cover expiry exceeds current authority' using errcode='42501';end if;
  select * into g from wm.tenant_guards where organization_id=p_org;
  insert into wm.owner_covers(organization_id,recipient_id,issuer_id,capabilities,starts_at,ends_at,reason,issuer_assignment_digest,issuer_staff_digest,recipient_staff_digest,recovery_generation,external_generation)
   values(p_org,recipient.user_id,auth.uid(),caps,starts,ends,wm.require_text(p_input->>'reason','cover reason'),wm.hash_json(to_jsonb(a)),wm.hash_json(to_jsonb(s)),wm.hash_json(to_jsonb(recipient)),g.recovery_generation,g.external_generation) returning id into rid;v:=1;
  perform wm.critical(p_org,'owner.cover.assigned',rid,jsonb_build_object('recipient',recipient.user_id,'capabilities',caps,'ends_at',ends));
 elsif p_command='owner.cover.revoke' then
  perform wm.check_input(p_input,array['cover_id','expected_version','reason'],array['cover_id','expected_version','reason']);
  select * into c from wm.owner_covers where organization_id=p_org and id=(p_input->>'cover_id')::uuid;
  if not found then raise exception 'Cover unavailable' using errcode='42501';end if;
  perform wm.check_version(case when exists(select 1 from wm.owner_cover_revocations where organization_id=p_org and cover_id=c.id) then 2 else 1 end,(p_input->>'expected_version')::bigint);
  insert into wm.owner_cover_revocations values(p_org,c.id,auth.uid(),wm.require_text(p_input->>'reason','revocation reason'),now());rid:=c.id;v:=2;
  -- Local revocation takes effect before any independent receipt flush.
  perform wm.invalidate_authority(p_org);
  perform wm.critical(p_org,'owner.cover.revoked',rid,jsonb_build_object('recipient',c.recipient_id));
 else raise exception 'Unsupported owner command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',rid,'version',v),rid);
end $$;

create function public.wm_owner_dates(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(p_org,'read');
 return (select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('decision',d.decision,'version',case when d.proposal_id is null then 1 else 2 end) order by p.created_at desc),'[]')
 from wm.owner_date_proposals p left join wm.owner_date_decisions d on d.organization_id=p.organization_id and d.proposal_id=p.id where p.organization_id=p_org);
end $$;

create function public.wm_owner_queue(p_query text,p_week date,p_timezone text,p_after uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare org uuid;result jsonb:='[]';item jsonb;counted integer:=0;cursor_id uuid;more boolean:=false;starts timestamptz;ends timestamptz;
begin
 perform wm.require_session();
 if coalesce(wm.claims()->>'aal','')<>'aal2' then raise exception 'Verify operator MFA' using errcode='42501';end if;
 if p_query is null or length(p_query)>100 or p_week is null or extract(isodow from p_week)<>1 or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Choose a Monday, timezone and short search' using errcode='22023';end if;
 starts:=p_week::timestamp at time zone p_timezone;ends:=(p_week+7)::timestamp at time zone p_timezone;
 for org in select o.id from wm.organizations o where (p_after is null or o.id>p_after) and wm.owner_has(o.id,'read') order by o.id limit 101 loop
  if counted=100 then more:=true;exit;end if;
  begin perform wm.owner_require(org,'read');exception when insufficient_privilege then continue;end;
  counted:=counted+1;cursor_id:=org;
  select jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'can_deliver',wm.owner_has(org,'delivery'),
   'can_cover',wm.owner_direct(org,auth.uid(),'people') and exists(select 1 from wm.staff s where s.user_id=auth.uid() and s.revoked_at is null and s.active_until>clock_timestamp() and 'coverage'=any(s.capabilities)),
   'cover_candidates',case when wm.owner_direct(org,auth.uid(),'people') and exists(select 1 from wm.staff s where s.user_id=auth.uid() and s.revoked_at is null and s.active_until>clock_timestamp() and 'coverage'=any(s.capabilities)) then
    (select coalesce(jsonb_agg(jsonb_build_object('id',s.user_id,'name',coalesce(p.display_name,'Verified staff '||left(s.user_id::text,8)))),'[]') from wm.staff s join auth.users u on u.id=s.user_id left join wm.profiles p on p.user_id=s.user_id where s.user_id<>auth.uid() and s.revoked_at is null and s.active_until>clock_timestamp() and u.email_confirmed_at is not null) else '[]'::jsonb end,
   'requests',(select coalesce(jsonb_agg(x),'[]') from (select r.id,r.engagement_id,r.outcome,r.state,r.owner_user_id,r.due_at,r.next_contact_at,r.version,
     r.due_at<clock_timestamp() as overdue,r.next_contact_at<clock_timestamp() as contact_overdue,e.minutes as estimated_minutes,coalesce(e.version,0) as estimate_version
     from wm.requests r left join wm.owner_estimates e on e.organization_id=r.organization_id and e.request_id=r.id
     where r.organization_id=org and r.state<>'complete' and (p_query='' or strpos(lower(r.outcome),lower(p_query))>0 or strpos(lower(o.name),lower(p_query))>0)
     order by r.due_at nulls last,r.id limit 100) x),
   'requests_truncated',(select count(*)>100 from wm.requests r where r.organization_id=org and r.state<>'complete'),
   'commitments',(select coalesce(jsonb_agg(x),'[]') from (select id,request_id,deliverable,owner_user_id,due_at,next_update_at,status,version,due_at<clock_timestamp() as overdue from wm.commitments where organization_id=org and status in ('open','waiting') order by due_at,id limit 100) x),
   'commitments_truncated',(select count(*)>100 from wm.commitments where organization_id=org and status in ('open','waiting')),
   'dependencies',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from wm.dependencies d where d.organization_id=org),
   'capacity',(select to_jsonb(c) from wm.owner_capacity c where c.organization_id=org and c.user_id=auth.uid() and c.week_start=p_week),
   'capacity_timezone_matches',not exists(select 1 from wm.owner_capacity c where c.organization_id=org and c.user_id=auth.uid() and c.week_start=p_week and c.timezone<>p_timezone),
   'logged_minutes',(select coalesce(sum(t.minutes),0) from wm.time_entries t where t.organization_id=org and t.operator_user_id=auth.uid() and t.occurred_at>=starts and t.occurred_at<ends and not exists(select 1 from wm.time_entries n where n.organization_id=org and n.supersedes_id=t.id)),
   'estimated_remaining_minutes',(select coalesce(sum(e.minutes),0) from wm.owner_estimates e join wm.requests r on r.organization_id=e.organization_id and r.id=e.request_id where e.organization_id=org and r.owner_user_id=auth.uid() and r.state<>'complete' and r.due_at>=starts and r.due_at<ends),
   'unestimated_requests',(select count(*) from wm.requests r where r.organization_id=org and r.owner_user_id=auth.uid() and r.state<>'complete' and r.due_at>=starts and r.due_at<ends and not exists(select 1 from wm.owner_estimates e where e.organization_id=org and e.request_id=r.id)),
   'date_proposals',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('decision',d.decision,'version',case when d.proposal_id is null then 1 else 2 end)),'[]') from wm.owner_date_proposals p left join wm.owner_date_decisions d on d.organization_id=p.organization_id and d.proposal_id=p.id where p.organization_id=org),
   'covers',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'recipient_id',c.recipient_id,'capabilities',c.capabilities,'starts_at',c.starts_at,'ends_at',c.ends_at,'revoked',x.cover_id is not null,'version',case when x.cover_id is null then 1 else 2 end)),'[]') from wm.owner_covers c left join wm.owner_cover_revocations x on x.organization_id=c.organization_id and x.cover_id=c.id where c.organization_id=org)
  ) into item from wm.organizations o where o.id=org;
  perform wm.owner_require(org,'read');result:=result||jsonb_build_array(item);
 end loop;
 return jsonb_build_object('businesses',result,'week_start',p_week,'timezone',p_timezone,'has_more',more,'next_after',case when more then cursor_id end,'scope','Current authorized businesses only; capacity is allocated per business.');
end $$;

revoke all on function wm.owner_history_immutable(),wm.owner_direct(uuid,uuid,text),wm.owner_cover_for(uuid,uuid,text),wm.owner_cover_has(uuid,text),wm.owner_has(uuid,text),wm.owner_require(uuid,text),wm.owner_issuer(uuid),wm.owner_minutes(jsonb),wm.owner_timestamp(jsonb),wm.owner_commitment_snapshot(uuid,uuid) from public,anon,authenticated;
revoke all on function public.wm_owner_command(uuid,text,jsonb,text),public.wm_owner_queue(text,date,text,uuid),public.wm_owner_dates(uuid) from public,anon,authenticated;
grant execute on function public.wm_owner_command(uuid,text,jsonb,text),public.wm_owner_queue(text,date,text,uuid),public.wm_owner_dates(uuid) to authenticated;
commit;
