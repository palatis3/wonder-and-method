begin;
create function wm.hash_json(value jsonb) returns text language sql immutable set search_path='' as $$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(value::text,'UTF8')),'hex')
$$;
create function wm.claims() returns jsonb language sql stable set search_path='' as $$
  select coalesce(nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create function wm.operator_has(org uuid, capability text) returns boolean language sql volatile security definer set search_path='' as $$
  select coalesce(wm.claims()->>'aal','')='aal2' and exists(
    select 1 from wm.operator_assignments a where a.organization_id=org and a.user_id=auth.uid()
      and a.revoked_at is null and a.active_until>pg_catalog.now()
      and (capability=any(a.capabilities) or 'admin'=any(a.capabilities)))
$$;
create function wm.member_role(org uuid) returns text language sql volatile security definer set search_path='' as $$
  select m.role from wm.memberships m where m.organization_id=org and m.user_id=auth.uid() and m.status='active' and m.revoked_at is null
$$;
create function wm.require_access(org uuid, capability text default 'read') returns void language plpgsql volatile security definer set search_path='' as $$
declare guard wm.tenant_guards; role_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue' using errcode='28000'; end if;
  -- Every human mutation, including membership revocation, locks this same row.
  select * into guard from wm.tenant_guards where organization_id=org for update;
  if not found or guard.access_state<>'open' then raise exception 'Business unavailable' using errcode='42501'; end if;
  -- This is deliberately a separate statement after lock acquisition.
  role_name:=wm.member_role(org);
  if wm.operator_has(org,case when capability='write' then 'delivery' else capability end) then return; end if;
  if capability='read' and role_name is not null then return; end if;
  if capability='write' and role_name in ('customer_admin','contributor') then return; end if;
  if capability='customer_admin' and role_name='customer_admin' then return; end if;
  raise exception 'Action unavailable for this business' using errcode='42501';
end $$;
create function wm.require_recent_auth() returns void language plpgsql volatile set search_path='' as $$
declare latest double precision;
begin
  select max((item->>'timestamp')::double precision) into latest from jsonb_array_elements(coalesce(wm.claims()->'amr','[]'::jsonb)) item;
  if latest is null or latest<extract(epoch from now())-900 or latest>extract(epoch from now())+60 then
    raise exception 'Confirm your sign-in before this decision' using errcode='28000';
  end if;
end $$;
create function wm.authority(org uuid, engagement uuid, decision_domain text) returns wm.engagement_authorities language plpgsql volatile security definer set search_path='' as $$
declare a wm.engagement_authorities;
begin
  if wm.member_role(org) not in ('customer_admin','contributor') or wm.member_role(org) is null then
    raise exception 'A current named customer decision-maker is required' using errcode='42501';
  end if;
  select * into a from wm.engagement_authorities where organization_id=org and engagement_id=engagement
    and user_id=auth.uid() and domain=decision_domain and revoked_at is null and starts_at<=now() and ends_at>now()
    order by case kind when 'primary' then 0 else 1 end limit 1;
  if not found then raise exception 'A current named decision-maker is required' using errcode='42501'; end if;
  return a;
end $$;
create function wm.check_version(actual bigint, expected bigint) returns void language plpgsql set search_path='' as $$
begin if expected is null or actual<>expected then raise exception 'This work changed. Reload before continuing.' using errcode='40001'; end if; end $$;
create function wm.require_text(value text, label text, max_length integer default 4000) returns text language plpgsql immutable set search_path='' as $$
begin if value is null or length(trim(value))<1 or length(value)>max_length then raise exception 'Check %',label using errcode='22023'; end if; return trim(value); end $$;
create function wm.check_input(value jsonb, allowed text[], required text[]) returns void language plpgsql immutable set search_path='' as $$
declare key text;
begin
  if jsonb_typeof(value)<>'object' then raise exception 'An object is required' using errcode='22023';end if;
  for key in select jsonb_object_keys(value) loop
    if not key=any(allowed) then raise exception 'Unsupported field' using errcode='22023'; end if;
  end loop;
  foreach key in array required loop
    if not value ? key or value->key='null'::jsonb then raise exception 'Missing field %',key using errcode='22023'; end if;
  end loop;
end $$;
create function wm.prior_command(org uuid, command text, key text, input jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare prior wm.command_receipts;
begin
  if key is null or length(key) not between 16 and 200 then raise exception 'A stable action key is required' using errcode='22023'; end if;
  select * into prior from wm.command_receipts where organization_id=org and actor_id=auth.uid() and command_type=command and idempotency_key=key;
  if found then
    if prior.payload_digest<>wm.hash_json(input) then raise exception 'Action key already used for different input' using errcode='23505'; end if;
    -- Result refs only; no historical body or private projection is cached here.
    return prior.result_ref;
  end if;
  return null;
end $$;
create function wm.finish_command(org uuid, command text, key text, input jsonb, result jsonb, target uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  insert into wm.command_receipts(organization_id,actor_id,command_type,idempotency_key,payload_digest,result_ref)
    values(org,auth.uid(),command,key,wm.hash_json(input),result);
  insert into wm.audit_events(organization_id,actor_id,action,target_id) values(org,auth.uid(),command,target);
  return result;
end $$;
create function wm.critical(org uuid, event_type text, target uuid, value jsonb) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare receipt_id uuid:=gen_random_uuid(); previous uuid; generation text;
begin
  select id into previous from wm.critical_receipts where organization_id=org order by sequence desc limit 1;
  select external_generation into generation from wm.tenant_guards where organization_id=org;
  insert into wm.critical_receipts(organization_id,id,predecessor_id,event_type,target_id,payload,digest,external_generation)
    values(org,receipt_id,previous,event_type,target,value,wm.hash_json(value),generation);
  return receipt_id;
end $$;

create function public.wm_request_create(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; r wm.requests;
begin
  perform wm.require_access(p_org,'write');
  perform wm.check_input(p_input,array['engagement_id','outcome','source'],array['engagement_id','outcome']);
  result:=wm.prior_command(p_org,'request.create',p_key,p_input); if result is not null then return result;end if;
  if not exists(select 1 from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid and service_state not in ('closed','ending')) then raise exception 'Service unavailable' using errcode='42501';end if;
  insert into wm.requests(organization_id,engagement_id,outcome,created_by,source)
    values(p_org,(p_input->>'engagement_id')::uuid,wm.require_text(p_input->>'outcome','what you need'),auth.uid(),'workspace') returning * into r;
  return wm.finish_command(p_org,'request.create',p_key,p_input,jsonb_build_object('id',r.id,'version',r.version,'state',r.state),r.id);
end $$;
create function public.wm_request_accept(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; r wm.requests; due timestamptz; next_contact timestamptz;
begin
  perform wm.require_access(p_org,'delivery');
  perform wm.check_input(p_input,array['request_id','expected_version','scope','coverage','owner_id','due_at','next_contact_at','approver_id','blockers'],array['request_id','expected_version','scope','coverage','owner_id','due_at','next_contact_at','approver_id']);
  result:=wm.prior_command(p_org,'request.accept',p_key,p_input);if result is not null then return result;end if;
  select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);
  if r.state not in ('received','triage','waiting','changes_requested') then raise exception 'Work cannot be accepted from this state' using errcode='22023';end if;
  if not exists(select 1 from wm.operator_assignments where organization_id=p_org and user_id=(p_input->>'owner_id')::uuid and revoked_at is null and active_until>now()) then raise exception 'Choose an assigned owner' using errcode='22023';end if;
  if not exists(select 1 from wm.engagement_authorities a join wm.memberships m on m.organization_id=a.organization_id and m.user_id=a.user_id where a.organization_id=p_org and a.engagement_id=r.engagement_id and a.user_id=(p_input->>'approver_id')::uuid and a.domain in ('content','spending') and a.revoked_at is null and a.starts_at<=now() and a.ends_at>now() and m.status='active' and m.role<>'viewer') then raise exception 'Confirm the named approver first' using errcode='22023';end if;
  due:=(p_input->>'due_at')::timestamptz;next_contact:=(p_input->>'next_contact_at')::timestamptz;
  if due<=now() or next_contact<=now() then raise exception 'Choose a future date' using errcode='22023';end if;
  update wm.requests set state='accepted',accepted_scope=wm.require_text(p_input->>'scope','scope'),coverage=wm.require_text(p_input->>'coverage','coverage'),owner_user_id=(p_input->>'owner_id')::uuid,approver_user_id=(p_input->>'approver_id')::uuid,due_at=due,next_contact_at=next_contact,waiting_reason=nullif(p_input->>'blockers',''),version=version+1,updated_at=now() where organization_id=p_org and id=r.id returning * into r;
  return wm.finish_command(p_org,'request.accept',p_key,p_input,jsonb_build_object('id',r.id,'version',r.version,'state',r.state),r.id);
end $$;
create function public.wm_message_send(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; m wm.messages; visibility text;
begin
  perform wm.require_access(p_org,'write');
  perform wm.check_input(p_input,array['engagement_id','request_id','body','visibility'],array['engagement_id','body']);
  visibility:=coalesce(p_input->>'visibility','shared');
  if visibility not in ('shared','internal') or (visibility='internal' and not wm.operator_has(p_org,'delivery')) then raise exception 'Message audience unavailable' using errcode='42501';end if;
  result:=wm.prior_command(p_org,'message.send',p_key,p_input);if result is not null then return result;end if;
  if not exists(select 1 from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid) then raise exception 'Service unavailable' using errcode='42501';end if;
  insert into wm.messages(organization_id,engagement_id,request_id,direction,visibility,sender_user_id,body)
    values(p_org,(p_input->>'engagement_id')::uuid,(p_input->>'request_id')::uuid,'workspace',visibility,auth.uid(),wm.require_text(p_input->>'body','message',20000)) returning * into m;
  return wm.finish_command(p_org,'message.send',p_key,p_input,jsonb_build_object('id',m.id,'state','recorded'),m.id);
end $$;
create function public.wm_revision_create(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; r wm.requests; rev wm.revisions; n integer; manifest jsonb;
begin
  perform wm.require_access(p_org,'delivery');
  perform wm.check_input(p_input,array['request_id','expected_version','kind','manifest','summary','cost_effect','date_effect'],array['request_id','expected_version','kind','manifest','summary','cost_effect','date_effect']);
  result:=wm.prior_command(p_org,'revision.create',p_key,p_input);if result is not null then return result;end if;
  select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);
  if r.state not in ('accepted','preparing','in_review','approved','changes_requested') then raise exception 'Accept the scope before preparing a revision' using errcode='22023';end if;
  if jsonb_typeof(p_input->'manifest')<>'object' or length((p_input->'manifest')::text)>100000 then raise exception 'Check the revision manifest' using errcode='22023';end if;
  select coalesce(max(sequence),0)+1 into n from wm.revisions where organization_id=p_org and request_id=r.id;
  manifest:=jsonb_build_object('schema_version',1,'kind',p_input->>'kind','manifest',p_input->'manifest','cost_effect',p_input->>'cost_effect','date_effect',p_input->>'date_effect');
  insert into wm.revisions(organization_id,request_id,sequence,kind,manifest,digest,summary,cost_effect,date_effect,supersedes_id,created_by)
    values(p_org,r.id,n,p_input->>'kind',p_input->'manifest',wm.hash_json(manifest),wm.require_text(p_input->>'summary','summary'),wm.require_text(p_input->>'cost_effect','cost effect'),wm.require_text(p_input->>'date_effect','date effect'),r.current_revision_id,auth.uid()) returning * into rev;
  update wm.requests set current_revision_id=rev.id,state='in_review',version=version+1,updated_at=now() where organization_id=p_org and id=r.id returning * into r;
  update wm.operations set state='cancelled',last_error_code='revision_superseded',version=version+1 where organization_id=p_org and request_id=r.id and positive_effect and state='pending';
  update wm.outbox_jobs j set state='cancelled' from wm.operations o where j.organization_id=p_org and o.organization_id=p_org and j.operation_id=o.id and o.state='cancelled' and j.state in ('pending','leased');
  return wm.finish_command(p_org,'revision.create',p_key,p_input,jsonb_build_object('id',rev.id,'digest',rev.digest,'request_id',r.id,'version',r.version,'sequence',n),rev.id);
end $$;
create function public.wm_decision_record(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; r wm.requests; rev wm.revisions; a wm.engagement_authorities; decision_id uuid:=gen_random_uuid(); action text; domain_name text; prev uuid; receipt uuid;
begin
  perform wm.require_access(p_org,'write');
  perform wm.check_input(p_input,array['request_id','expected_version','revision_id','digest','decision','feedback','shown_scope'],array['request_id','revision_id','digest','decision','shown_scope']);
  action:=p_input->>'decision';if action not in ('approve','request_changes','withdraw') then raise exception 'Check the decision' using errcode='22023';end if;
  select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  select * into rev from wm.revisions where organization_id=p_org and request_id=r.id and id=(p_input->>'revision_id')::uuid;
  if not found or rev.digest<>p_input->>'digest' then raise exception 'This version is unavailable. Reload the review.' using errcode='40001';end if;
  domain_name:=case rev.kind when 'campaign_package' then 'spending' when 'agreement' then 'contract' else 'content' end;
  a:=wm.authority(p_org,r.engagement_id,domain_name);
  result:=wm.prior_command(p_org,'decision.record',p_key,p_input);if result is not null then return result;end if;
  if action='approve' then
    perform wm.require_recent_auth();perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);
    if r.current_revision_id<>rev.id or r.state<>'in_review' then raise exception 'Review the current version before approving' using errcode='40001';end if;
  elsif action='request_changes' then perform wm.require_text(p_input->>'feedback','requested changes');end if;
  select id into prev from wm.decisions where organization_id=p_org and revision_id=rev.id order by created_at desc,id desc limit 1;
  insert into wm.decisions(organization_id,id,request_id,revision_id,digest,actor_id,authority_id,authority_version,decision,shown_scope,feedback,supersedes_decision_id)
    values(p_org,decision_id,r.id,rev.id,rev.digest,auth.uid(),a.id,a.version,action,wm.require_text(p_input->>'shown_scope','decision scope'),p_input->>'feedback',prev);
  if r.current_revision_id=rev.id then
    update wm.requests set state=case action when 'approve' then 'approved' else 'changes_requested' end,version=version+1,updated_at=now() where organization_id=p_org and id=r.id returning * into r;
  end if;
  if action<>'approve' then
    update wm.tenant_guards set authority_version=authority_version+1 where organization_id=p_org;
    update wm.operations set state='cancelled',last_error_code='decision_withdrawn',version=version+1 where organization_id=p_org and revision_id=rev.id and positive_effect and state='pending';
    update wm.outbox_jobs j set state='cancelled' from wm.operations o where j.organization_id=p_org and o.organization_id=p_org and j.operation_id=o.id and o.state='cancelled' and j.state in ('pending','leased');
    -- In-flight attempts are retained. The stop coordinator handles spending
    -- withdrawal once that coordinator is installed by the effect migration.
  end if;
  receipt:=wm.critical(p_org,'decision.'||action,decision_id,jsonb_build_object('request_id',r.id,'revision_id',rev.id,'digest',rev.digest,'actor_id',auth.uid(),'authority_id',a.id,'decision',action,'supersedes',prev));
  return wm.finish_command(p_org,'decision.record',p_key,p_input,jsonb_build_object('id',decision_id,'request_id',r.id,'version',r.version,'decision',action,'receipt_id',receipt,'durability','pending'),decision_id);
end $$;

-- Public functions have no implicit execution access. Their signatures are
-- deliberately individual commands, never arbitrary SQL/table updates.
revoke all on function public.wm_request_create(uuid,jsonb,text),public.wm_request_accept(uuid,jsonb,text),public.wm_message_send(uuid,jsonb,text),public.wm_revision_create(uuid,jsonb,text),public.wm_decision_record(uuid,jsonb,text) from public,anon;
grant execute on function public.wm_request_create(uuid,jsonb,text),public.wm_request_accept(uuid,jsonb,text),public.wm_message_send(uuid,jsonb,text),public.wm_revision_create(uuid,jsonb,text),public.wm_decision_record(uuid,jsonb,text) to authenticated;
revoke all on all functions in schema wm from public,anon,authenticated;
commit;
