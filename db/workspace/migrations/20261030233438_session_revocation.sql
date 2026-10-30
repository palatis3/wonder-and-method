begin;
-- PostgREST verifies JWT signatures; this checks authoritative current session state.
create function wm.require_session() returns void language plpgsql volatile security definer set search_path='' as $$
declare c jsonb:=wm.claims(); sid uuid;
begin
  if auth.uid() is null or c->>'role'<>'authenticated' then raise exception 'Sign in to continue' using errcode='28000';end if;
  begin sid:=(c->>'session_id')::uuid; exception when invalid_text_representation then raise exception 'Sign in again' using errcode='28000';end;
  if sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=auth.uid() and (s.not_after is null or s.not_after>clock_timestamp())) then
    raise exception 'Session ended; sign in again' using errcode='28000';
  end if;
  if coalesce((c->>'exp')::numeric,0)<=extract(epoch from clock_timestamp()) then raise exception 'Session token expired' using errcode='28000';end if;
end $$;
create function public.wm_session_check() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin perform wm.require_session();return jsonb_build_object('active',true);end $$;
revoke all on function wm.require_session(),public.wm_session_check() from public,anon,authenticated;
grant execute on function public.wm_session_check() to authenticated;
create or replace function wm.require_access(org uuid, capability text default 'read') returns void language plpgsql volatile security definer set search_path='' as $$
declare guard wm.tenant_guards; role_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue' using errcode='28000'; end if;
  perform wm.require_session();
  -- Every human mutation, including membership revocation, locks this same row.
  select * into guard from wm.tenant_guards where organization_id=org for update;
  if not found or guard.access_state<>'open' then raise exception 'Business unavailable' using errcode='42501'; end if;
  -- This is deliberately a separate statement after lock acquisition.
  perform wm.require_session();
  role_name:=wm.member_role(org);
  if wm.operator_has(org,case when capability='write' then 'delivery' else capability end) then return; end if;
  if capability='read' and role_name is not null then return; end if;
  if capability='write' and role_name in ('customer_admin','contributor') then return; end if;
  if capability='customer_admin' and role_name='customer_admin' then return; end if;
  raise exception 'Action unavailable for this business' using errcode='42501';
end $$;
create or replace function public.wm_businesses() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
  perform wm.require_session();
  if auth.uid() is null then raise exception 'Sign in to continue' using errcode='28000';end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'role',wm.member_role(o.id),'operator',wm.operator_has(o.id,'read')) order by o.name),'[]'::jsonb)
    from wm.organizations o join wm.tenant_guards g on g.organization_id=o.id
    where g.access_state='open' and (wm.member_role(o.id) is not null or wm.operator_has(o.id,'read')));
end $$;

commit;
