begin;
alter table wm.invitations add column version bigint not null default 1;

-- Every authority change shares the same tenant lock as effect authorization.
create function wm.invalidate_authority(org uuid, engagement uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
  update wm.tenant_guards set authority_version=authority_version+1 where organization_id=org;
  update wm.operations set state='cancelled',last_error_code='authority_changed',version=version+1
    where organization_id=org and positive_effect and state='pending';
  update wm.outbox_jobs j set state='cancelled' from wm.operations o
    where j.organization_id=org and o.organization_id=org and j.operation_id=o.id and o.state='cancelled' and j.state in ('pending','leased');
end $$;

create function public.wm_people_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; target uuid; v bigint; receipt uuid; m wm.memberships; a wm.engagement_authorities; inv wm.invitations;
  email_address text; permission text; starts timestamptz; ends timestamptz; guard wm.tenant_guards;
begin
  if p_command='invitation.accept' then
    perform wm.require_session();perform wm.require_recent_auth();
    select * into guard from wm.tenant_guards where organization_id=p_org for update;
    perform wm.require_session();
    if guard.organization_id is null or guard.access_state<>'open' then raise exception 'Invitation unavailable' using errcode='42501';end if;
  else
    perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
    if not wm.operator_has(p_org,'people') and wm.member_role(p_org) is distinct from 'customer_admin' then raise exception 'People management unavailable' using errcode='42501';end if;
  end if;
  result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
  case p_command
  when 'invitation.create' then
    perform wm.check_input(p_input,array['email','role'],array['email','role']);
    email_address:=lower(trim(p_input->>'email'));permission:=p_input->>'role';
    if email_address is null or length(email_address)>254 or email_address !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or permission not in ('customer_admin','contributor','viewer') then raise exception 'Check the email and customer role' using errcode='22023';end if;
    if exists(select 1 from wm.invitations where organization_id=p_org and email=email_address and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'A current invitation already exists' using errcode='40001';end if;
    insert into wm.invitations(organization_id,email,role,token_hash,invited_by,expires_at)
      values(p_org,email_address,permission,wm.hash_json(to_jsonb(gen_random_uuid())),auth.uid(),now()+interval '7 days') returning id,version into target,v;
  when 'invitation.revoke' then
    perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);
    select * into inv from wm.invitations where organization_id=p_org and id=(p_input->>'id')::uuid for update;
    if not found or inv.accepted_at is not null then raise exception 'Invitation unavailable' using errcode='42501';end if;
    perform wm.check_version(inv.version,(p_input->>'expected_version')::bigint);
    update wm.invitations set revoked_at=now(),version=version+1 where organization_id=p_org and id=inv.id returning id,version into target,v;
  when 'invitation.accept' then
    perform wm.check_input(p_input,array['id','business_name'],array['id','business_name']);
    select * into inv from wm.invitations where organization_id=p_org and id=(p_input->>'id')::uuid for update;
    if not found or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at<=now()
      or not exists(select 1 from auth.users u where u.id=auth.uid() and lower(u.email)=inv.email and u.email_confirmed_at is not null)
      or not exists(select 1 from wm.organizations o where o.id=p_org and o.name=p_input->>'business_name') then raise exception 'Invitation unavailable or identity not confirmed' using errcode='42501';end if;
    if exists(select 1 from wm.memberships where organization_id=p_org and user_id=auth.uid() and status='active') then raise exception 'Already a member of this business' using errcode='40001';end if;
    insert into wm.memberships(organization_id,user_id,role,invited_by) values(p_org,auth.uid(),inv.role,inv.invited_by)
      on conflict(organization_id,user_id) do update set role=excluded.role,status='active',revoked_at=null,invited_by=excluded.invited_by,version=wm.memberships.version+1;
    update wm.invitations set accepted_by=auth.uid(),accepted_at=now(),version=version+1 where organization_id=p_org and id=inv.id returning id,version into target,v;
    perform wm.invalidate_authority(p_org);
  when 'member.change' then
    perform wm.check_input(p_input,array['user_id','role','status','expected_version'],array['user_id','role','status','expected_version']);
    select * into m from wm.memberships where organization_id=p_org and user_id=(p_input->>'user_id')::uuid for update;
    if not found or m.status<>'active' then raise exception 'Member unavailable' using errcode='42501';end if;
    perform wm.check_version(m.version,(p_input->>'expected_version')::bigint);
    if p_input->>'role' not in ('customer_admin','contributor','viewer') or p_input->>'status' not in ('active','revoked') then raise exception 'Choose a customer role and status' using errcode='22023';end if;
    if m.role='customer_admin' and (p_input->>'role'<>'customer_admin' or p_input->>'status'='revoked')
      and not exists(select 1 from wm.memberships where organization_id=p_org and user_id<>m.user_id and status='active' and revoked_at is null and role='customer_admin') then raise exception 'Keep at least one active business administrator' using errcode='22023';end if;
    update wm.memberships set role=p_input->>'role',status=p_input->>'status',revoked_at=case when p_input->>'status'='revoked' then now() else null end,version=version+1 where organization_id=p_org and user_id=m.user_id returning user_id,version into target,v;
    if p_input->>'status'='revoked' or p_input->>'role'='viewer' then
      update wm.engagement_authorities set revoked_at=now(),version=version+1 where organization_id=p_org and user_id=m.user_id and revoked_at is null;
    end if;
    -- An outstanding invitation predating an access reduction cannot undo it.
    update wm.invitations i set revoked_at=now(),version=version+1
      from auth.users u where u.id=m.user_id and i.organization_id=p_org and i.email=lower(u.email) and i.accepted_at is null and i.revoked_at is null;
    perform wm.invalidate_authority(p_org);
  when 'authority.assign' then
    perform wm.check_input(p_input,array['engagement_id','user_id','domain','kind','starts_at','ends_at','evidence','previous_id','expected_version'],array['engagement_id','user_id','domain','kind','starts_at','ends_at','evidence']);
    if not wm.operator_has(p_org,'people') then raise exception 'Verified studio assignment required' using errcode='42501';end if;
    if (p_input->>'user_id')::uuid=auth.uid() then raise exception 'An operator cannot attest their own customer authority' using errcode='42501';end if;
    if not exists(select 1 from wm.memberships where organization_id=p_org and user_id=(p_input->>'user_id')::uuid and status='active' and revoked_at is null and role in ('customer_admin','contributor')) then raise exception 'Choose an active customer decision-maker' using errcode='42501';end if;
    starts:=(p_input->>'starts_at')::timestamptz;ends:=(p_input->>'ends_at')::timestamptz;
    if starts is null or ends is null or ends<=starts or ends<=now() or ends>now()+interval '2 years' then raise exception 'Choose a bounded authority period' using errcode='22023';end if;
    if p_input->>'previous_id' is not null then
      select * into a from wm.engagement_authorities where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and id=(p_input->>'previous_id')::uuid and domain=p_input->>'domain' and kind=p_input->>'kind' and revoked_at is null for update;
      if not found then raise exception 'Previous authority unavailable' using errcode='42501';end if;
      perform wm.check_version(a.version,(p_input->>'expected_version')::bigint);
      update wm.engagement_authorities set revoked_at=now(),version=version+1 where organization_id=p_org and id=a.id;
    end if;
    insert into wm.engagement_authorities(organization_id,engagement_id,user_id,domain,kind,starts_at,ends_at,verified_by,evidence)
      values(p_org,(p_input->>'engagement_id')::uuid,(p_input->>'user_id')::uuid,p_input->>'domain',p_input->>'kind',starts,ends,auth.uid(),wm.require_text(p_input->>'evidence','independent verification evidence')) returning id,version into target,v;
    perform wm.invalidate_authority(p_org,(p_input->>'engagement_id')::uuid);
  when 'authority.revoke' then
    perform wm.check_input(p_input,array['id','expected_version','reason'],array['id','expected_version','reason']);
    select * into a from wm.engagement_authorities where organization_id=p_org and id=(p_input->>'id')::uuid for update;
    if not found then raise exception 'Authority unavailable' using errcode='42501';end if;
    perform wm.check_version(a.version,(p_input->>'expected_version')::bigint);perform wm.require_text(p_input->>'reason','reason');
    update wm.engagement_authorities set revoked_at=now(),version=version+1 where organization_id=p_org and id=a.id returning id,version into target,v;
    perform wm.invalidate_authority(p_org,a.engagement_id);
  else raise exception 'Unsupported people action' using errcode='22023';
  end case;
  receipt:=wm.critical(p_org,p_command,target,jsonb_build_object('actor',auth.uid(),'input',p_input,'version',v));
  return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',target,'version',v,'receipt_id',receipt,'durability','pending'),target);
end $$;

create function public.wm_invitations() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  perform wm.require_session();
  return (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'organization_id',i.organization_id,'business_name',o.name,'role',i.role,'expires_at',i.expires_at)),'[]')
    from wm.invitations i join wm.organizations o on o.id=i.organization_id join wm.tenant_guards g on g.organization_id=o.id join auth.users u on lower(u.email)=i.email
    where u.id=auth.uid() and u.email_confirmed_at is not null and i.revoked_at is null and i.accepted_at is null and i.expires_at>now() and g.access_state='open');
end $$;
alter function public.wm_workspace(uuid) rename to wm_workspace_before_people;
revoke all on function public.wm_workspace_before_people(uuid) from public,anon,authenticated;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; manages boolean;
begin
  result:=public.wm_workspace_before_people(p_org);
  manages:=wm.operator_has(p_org,'people') or coalesce(wm.member_role(p_org)='customer_admin',false);
  return result||jsonb_build_object('can_manage_people',manages,'can_assign_authority',wm.operator_has(p_org,'people'),
    'invitations',case when manages then (select coalesce(jsonb_agg(to_jsonb(i)-'token_hash'),'[]') from wm.invitations i where i.organization_id=p_org) else '[]'::jsonb end);
end $$;
revoke all on function public.wm_workspace(uuid) from public,anon;
grant execute on function public.wm_workspace(uuid) to authenticated;
revoke all on function public.wm_people_command(uuid,text,jsonb,text),public.wm_invitations() from public,anon;
grant execute on function public.wm_people_command(uuid,text,jsonb,text),public.wm_invitations() to authenticated;
revoke all on function wm.invalidate_authority(uuid,uuid) from public,anon,authenticated;
commit;
