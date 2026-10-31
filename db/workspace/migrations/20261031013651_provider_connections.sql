begin;
create table wm.oauth_sessions (
 organization_id uuid not null,id uuid not null,engagement_id uuid not null,provider text not null,
 environment text not null check(environment in ('test','production')),
 actor_id uuid not null,actor_kind text not null check(actor_kind in ('customer_admin','operator')),
 session_id uuid not null,state_hash text not null unique,browser_hash text not null,verifier_ciphertext text not null,
 authority_version bigint not null,recovery_generation bigint not null,external_generation text not null,
 state text not null default 'pending' check(state in ('pending','exchanging','connected','failed')),
 exchange_nonce uuid,expires_at timestamptz not null default now()+interval '10 minutes',created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(id),
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 check(provider in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads','analytics','search_console')),
 check(state_hash ~ '^[a-f0-9]{64}$' and browser_hash ~ '^[a-f0-9]{64}$'),check(length(verifier_ciphertext) between 20 and 4096)
);
create table wm.integration_credentials (
 organization_id uuid not null,id uuid not null,engagement_id uuid not null,provider text not null,environment text not null,
 authorized_by uuid not null,actor_kind text not null,oauth_session_id uuid not null,
 recovery_generation bigint not null,external_generation text not null,
 ciphertext text not null,key_version text not null,expires_at timestamptz,
 state text not null default 'connected' check(state in ('connected','refreshing','reauth_required','revoked')),
 refresh_nonce uuid,refresh_started_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now(),version bigint not null default 1,
 primary key(organization_id,id),unique(id),unique(oauth_session_id),
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 foreign key(organization_id,oauth_session_id) references wm.oauth_sessions(organization_id,id),
 check(length(ciphertext) between 20 and 32768)
);
alter table wm.provider_scopes add column credential_id uuid,add column manager_id text;
alter table wm.provider_scopes add constraint scope_credential_parent foreign key(organization_id,credential_id) references wm.integration_credentials(organization_id,id);
create table wm.connection_tickets (
 organization_id uuid not null,id uuid not null default gen_random_uuid(),credential_id uuid not null,actor_id uuid not null,session_id uuid not null,
 purpose text not null check(purpose in ('discover','bind')),account_id text,manager_id text,
 authority_version bigint not null,recovery_generation bigint not null,external_generation text not null,
 expires_at timestamptz not null default now()+interval '3 minutes',consumed_at timestamptz,
 primary key(organization_id,id),foreign key(organization_id,credential_id) references wm.integration_credentials(organization_id,id)
);
alter table wm.integration_credentials add column refresh_ticket uuid;
alter table wm.integration_credentials add constraint refresh_ticket_parent foreign key(organization_id,refresh_ticket) references wm.connection_tickets(organization_id,id);
alter table wm.oauth_sessions enable row level security;
alter table wm.integration_credentials enable row level security;
alter table wm.connection_tickets enable row level security;
revoke all on wm.oauth_sessions,wm.integration_credentials,wm.connection_tickets from public,anon,authenticated;

create function wm.connection_actor_current(org uuid,who uuid,actor_kind text) returns boolean language sql volatile security definer set search_path='' as $$
 select case when actor_kind='customer_admin' then exists(select 1 from wm.memberships where organization_id=org and user_id=who and status='active' and role='customer_admin' and revoked_at is null)
 when actor_kind='operator' then exists(select 1 from wm.operator_assignments where organization_id=org and user_id=who and revoked_at is null and active_until>now() and capabilities&&array['ads','admin']) else false end
$$;
create function wm.require_connection_actor(org uuid) returns text language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(org,'read');perform wm.require_recent_auth();
 if wm.operator_has(org,'ads') then return 'operator';end if;
 if wm.member_role(org)='customer_admin' then return 'customer_admin';end if;
 raise exception 'Business administrator or advertising operator required' using errcode='42501';
end $$;
create function wm.require_oauth_current(s wm.oauth_sessions) returns void language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;
begin
 select * into g from wm.tenant_guards where organization_id=s.organization_id for update;
 if g.access_state<>'open' or g.authority_version<>s.authority_version or g.recovery_generation<>s.recovery_generation or g.external_generation<>s.external_generation or s.expires_at<=now()
 or not exists(select 1 from auth.sessions where id=s.session_id and user_id=s.actor_id and (not_after is null or not_after>now()))
 or not exists(select 1 from wm.engagements where organization_id=s.organization_id and id=s.engagement_id and service_state not in ('ending','closed'))
 or not wm.connection_actor_current(s.organization_id,s.actor_id,s.actor_kind) then raise exception 'Authorization no longer current' using errcode='42501';end if;
end $$;
create function public.wm_connection_start(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare kind text;g wm.tenant_guards;result jsonb;s wm.oauth_sessions;
begin
 kind:=wm.require_connection_actor(p_org);
 perform wm.check_input(p_input,array['id','engagement_id','provider','environment','state_hash','browser_hash','verifier_ciphertext'],array['id','engagement_id','provider','environment','state_hash','browser_hash','verifier_ciphertext']);
 result:=wm.prior_command(p_org,'connection.start',p_key,p_input);if result is not null then return result;end if;
 if not exists(select 1 from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid and service_state not in ('ending','closed')) then raise exception 'Service unavailable' using errcode='42501';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 if (select count(*) from wm.oauth_sessions where organization_id=p_org and actor_id=auth.uid() and expires_at>now() and state in ('pending','exchanging'))>=5 then raise exception 'Finish or wait for earlier connections' using errcode='22023';end if;
 insert into wm.oauth_sessions(organization_id,id,engagement_id,provider,environment,actor_id,actor_kind,session_id,state_hash,browser_hash,verifier_ciphertext,authority_version,recovery_generation,external_generation)
 values(p_org,(p_input->>'id')::uuid,(p_input->>'engagement_id')::uuid,p_input->>'provider',p_input->>'environment',auth.uid(),kind,(wm.claims()->>'session_id')::uuid,p_input->>'state_hash',p_input->>'browser_hash',p_input->>'verifier_ciphertext',g.authority_version,g.recovery_generation,g.external_generation) returning * into s;
 return wm.finish_command(p_org,'connection.start',p_key,p_input,jsonb_build_object('id',s.id,'expires_at',s.expires_at),s.id);
end $$;
create function public.wm_connection_claim(p_provider text,p_state_hash text,p_browser_hash text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.oauth_sessions;n uuid:=gen_random_uuid();
begin
 perform wm.require_machine();select * into s from wm.oauth_sessions where state_hash=p_state_hash;
 if not found then raise exception 'Authorization unavailable' using errcode='42501';end if;
 perform wm.require_oauth_current(s);select * into s from wm.oauth_sessions where id=s.id for update;
 if s.provider<>p_provider or s.browser_hash<>p_browser_hash or s.state<>'pending' then raise exception 'Authorization unavailable or already used' using errcode='42501';end if;
 update wm.oauth_sessions set state='exchanging',exchange_nonce=n where id=s.id;
 return jsonb_build_object('id',s.id,'organization_id',s.organization_id,'engagement_id',s.engagement_id,'provider',s.provider,'environment',s.environment,'verifier_ciphertext',s.verifier_ciphertext,'exchange_nonce',n,'external_generation',s.external_generation);
end $$;
create function public.wm_connection_complete(p_org uuid,p_id uuid,p_nonce uuid,p_ciphertext text,p_key_version text,p_expires_at timestamptz) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.oauth_sessions;
begin
 perform wm.require_machine();select * into s from wm.oauth_sessions where organization_id=p_org and id=p_id;
 if not found then raise exception 'Authorization unavailable' using errcode='42501';end if;perform wm.require_oauth_current(s);
 select * into s from wm.oauth_sessions where organization_id=p_org and id=p_id for update;
 if s.state<>'exchanging' or s.exchange_nonce is distinct from p_nonce then raise exception 'Authorization no longer current' using errcode='42501';end if;
 perform wm.require_text(p_key_version,'credential key version',100);
 if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expired provider token' using errcode='22023';end if;
 insert into wm.integration_credentials(organization_id,id,engagement_id,provider,environment,authorized_by,actor_kind,oauth_session_id,recovery_generation,external_generation,ciphertext,key_version,expires_at)
 values(p_org,s.id,s.engagement_id,s.provider,s.environment,s.actor_id,s.actor_kind,s.id,s.recovery_generation,s.external_generation,p_ciphertext,p_key_version,p_expires_at);
 update wm.oauth_sessions set state='connected',verifier_ciphertext='[consumed authorization verifier]' where organization_id=p_org and id=p_id;
 perform wm.critical(p_org,'connection.authorized',s.id,jsonb_build_object('provider',s.provider,'environment',s.environment,'authorized_by',s.actor_id));
 return jsonb_build_object('id',s.id,'state','connected');
end $$;
create function public.wm_connection_failed(p_org uuid,p_id uuid,p_nonce uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_machine();update wm.oauth_sessions set state='failed',verifier_ciphertext='[consumed authorization verifier]' where organization_id=p_org and id=p_id and exchange_nonce=p_nonce and state='exchanging';
end $$;
create function public.wm_connections(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(p_org,'read');
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'engagement_id',engagement_id,'provider',provider,'environment',environment,'state',state,'expires_at',expires_at,'version',version) order by created_at),'[]') from wm.integration_credentials where organization_id=p_org and authorized_by=auth.uid());
end $$;
create function public.wm_connection_ticket(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare kind text;c wm.integration_credentials;g wm.tenant_guards;rid uuid;result jsonb;
begin
 kind:=wm.require_connection_actor(p_org);perform wm.check_input(p_input,array['connection_id','purpose','account_id','manager_id'],array['connection_id','purpose']);
 result:=wm.prior_command(p_org,'connection.ticket',p_key,p_input);if result is not null then return result;end if;
 select * into c from wm.integration_credentials where organization_id=p_org and id=(p_input->>'connection_id')::uuid;
 if not found or c.authorized_by<>auth.uid() or c.state not in ('connected','refreshing') then raise exception 'Your current connection is required' using errcode='42501';end if;
 if not exists(select 1 from wm.engagements where organization_id=p_org and id=c.engagement_id and service_state not in ('ending','closed')) then raise exception 'Service unavailable' using errcode='42501';end if;
 if p_input->>'purpose'='bind' then perform wm.require_text(p_input->>'account_id','account identity',300);end if;
 if p_input->>'purpose'='discover' and (p_input->>'account_id' is not null or p_input->>'manager_id' is not null) then raise exception 'Discovery has no selected account' using errcode='22023';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 if c.recovery_generation<>g.recovery_generation or c.external_generation<>g.external_generation then raise exception 'Reconnect after recovery' using errcode='42501';end if;
 insert into wm.connection_tickets(organization_id,credential_id,actor_id,session_id,purpose,account_id,manager_id,authority_version,recovery_generation,external_generation)
 values(p_org,c.id,auth.uid(),(wm.claims()->>'session_id')::uuid,p_input->>'purpose',p_input->>'account_id',p_input->>'manager_id',g.authority_version,g.recovery_generation,g.external_generation) returning id into rid;
 return wm.finish_command(p_org,'connection.ticket',p_key,p_input,jsonb_build_object('id',rid),rid);
end $$;
create function wm.require_connection_ticket(org uuid,ticket uuid) returns wm.integration_credentials language plpgsql volatile security definer set search_path='' as $$
declare t wm.connection_tickets;c wm.integration_credentials;g wm.tenant_guards;
begin
 select * into g from wm.tenant_guards where organization_id=org for update;
 select * into t from wm.connection_tickets where organization_id=org and id=ticket for update;
 if not found or t.expires_at<=now() or t.consumed_at is not null or g.access_state<>'open' or g.authority_version<>t.authority_version or g.recovery_generation<>t.recovery_generation or g.external_generation<>t.external_generation
 or not exists(select 1 from auth.sessions where id=t.session_id and user_id=t.actor_id and (not_after is null or not_after>now())) then raise exception 'Connection request expired or changed' using errcode='42501';end if;
 select * into c from wm.integration_credentials where organization_id=org and id=t.credential_id for update;
 if c.recovery_generation<>g.recovery_generation or c.external_generation<>g.external_generation or not exists(select 1 from wm.engagements where organization_id=org and id=c.engagement_id and service_state not in ('ending','closed')) or c.revoked_at is not null or c.state not in ('connected','refreshing') or not wm.connection_actor_current(org,c.authorized_by,c.actor_kind) then raise exception 'Connection no longer current' using errcode='42501';end if;
 return c;
end $$;
create function public.wm_connection_context(p_org uuid,p_ticket uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.integration_credentials;t wm.connection_tickets;
begin
 perform wm.require_machine();c:=wm.require_connection_ticket(p_org,p_ticket);select * into t from wm.connection_tickets where organization_id=p_org and id=p_ticket;
 return jsonb_build_object('connection',to_jsonb(c),'ticket',to_jsonb(t));
end $$;
create function public.wm_connection_refresh_begin(p_org uuid,p_ticket uuid,p_version bigint) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.integration_credentials;n uuid:=gen_random_uuid();
begin
 perform wm.require_machine();c:=wm.require_connection_ticket(p_org,p_ticket);perform wm.check_version(c.version,p_version);
 if c.state<>'connected' then raise exception 'Refresh outcome needs reconciliation or reauthorization' using errcode='42501';end if;
 update wm.integration_credentials set state='refreshing',refresh_ticket=p_ticket,refresh_nonce=n,refresh_started_at=now(),version=version+1 where organization_id=p_org and id=c.id;
 return jsonb_build_object('nonce',n,'version',c.version+1);
end $$;
create function public.wm_connection_refresh_complete(p_org uuid,p_id uuid,p_nonce uuid,p_ciphertext text,p_key_version text,p_expires_at timestamptz) returns void language plpgsql volatile security definer set search_path='' as $$
declare c wm.integration_credentials;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into c from wm.integration_credentials where organization_id=p_org and id=p_id for update;
 if not found or c.state<>'refreshing' or c.refresh_nonce is distinct from p_nonce or c.revoked_at is not null or not wm.connection_actor_current(p_org,c.authorized_by,c.actor_kind) then raise exception 'Refresh no longer current' using errcode='42501';end if;
 perform wm.require_connection_ticket(p_org,c.refresh_ticket);
 if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expired provider token' using errcode='22023';end if;
 update wm.integration_credentials set ciphertext=p_ciphertext,key_version=wm.require_text(p_key_version,'key version',100),expires_at=p_expires_at,state='connected',refresh_nonce=null,version=version+1 where organization_id=p_org and id=p_id;
end $$;
create function public.wm_connection_bind(p_org uuid,p_ticket uuid,p_observation jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.integration_credentials;t wm.connection_tickets;s wm.provider_scopes;rid uuid;
begin
 perform wm.require_machine();c:=wm.require_connection_ticket(p_org,p_ticket);select * into t from wm.connection_tickets where organization_id=p_org and id=p_ticket;
 perform wm.check_input(p_observation,array['account_id','currency','timezone','permissions','observed_at','environment','name','manager_id'],array['account_id','currency','timezone','permissions','observed_at','environment','name']);
 if jsonb_typeof(p_observation->'observed_at') is distinct from 'string' or jsonb_typeof(p_observation->'permissions') is distinct from 'array' or jsonb_typeof(p_observation->'name') is distinct from 'string' or jsonb_typeof(p_observation->'environment') is distinct from 'string' or t.purpose<>'bind' or c.state<>'connected' or t.account_id is distinct from p_observation->>'account_id' or coalesce(t.manager_id,'')<>coalesce(p_observation->>'manager_id','') or c.environment<>p_observation->>'environment'
 or (p_observation->>'observed_at')::timestamptz<now()-interval '2 minutes' or (p_observation->>'observed_at')::timestamptz>now()+interval '30 seconds'
 or jsonb_typeof(p_observation->'permissions')<>'array' or not p_observation->'permissions' ? 'read' then raise exception 'Current exact account observation required' using errcode='42501';end if;
 if (p_observation->>'currency' is not null and p_observation->>'currency' !~ '^[A-Z]{3}$') or (p_observation->>'timezone' is not null and not exists(select 1 from pg_timezone_names where name=p_observation->>'timezone')) then raise exception 'Verify account currency and timezone' using errcode='22023';end if;
 select * into s from wm.provider_scopes where provider=c.provider and environment=c.environment and account_id=t.account_id for update;
 if found then
  if s.organization_id<>p_org or s.engagement_id<>c.engagement_id then raise exception 'Account is already bound to another service' using errcode='42501';end if;
  if exists(select 1 from wm.operations where organization_id=p_org and provider_scope_id=s.id and state in ('pending','in_flight','unknown')) then raise exception 'Reconcile operations before replacing account authorization' using errcode='42501';end if;
  update wm.provider_scopes set credential_id=c.id,manager_id=t.manager_id,currency=p_observation->>'currency',timezone=p_observation->>'timezone',permissions=array(select jsonb_array_elements_text(p_observation->'permissions')),access_status='read_verified',last_checked_at=(p_observation->>'observed_at')::timestamptz,version=version+1 where organization_id=p_org and id=s.id;rid:=s.id;
 else
  insert into wm.provider_scopes(organization_id,engagement_id,provider,environment,account_id,currency,timezone,permissions,access_status,last_checked_at,credential_id,manager_id)
  values(p_org,c.engagement_id,c.provider,c.environment,t.account_id,p_observation->>'currency',p_observation->>'timezone',array(select jsonb_array_elements_text(p_observation->'permissions')),'read_verified',(p_observation->>'observed_at')::timestamptz,c.id,t.manager_id) returning id into rid;
 end if;
 update wm.connection_tickets set consumed_at=now() where organization_id=p_org and id=p_ticket;
 perform wm.critical(p_org,'connection.account_bound',rid,jsonb_build_object('credential_id',c.id,'provider',c.provider,'account_id',t.account_id,'environment',c.environment,'actor_id',t.actor_id));
 return jsonb_build_object('id',rid,'state','read_verified');
end $$;
create function public.wm_connection_disconnect(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.integration_credentials;result jsonb;
begin
 perform wm.require_connection_actor(p_org);perform wm.check_input(p_input,array['connection_id','expected_version'],array['connection_id','expected_version']);
 result:=wm.prior_command(p_org,'connection.disconnect',p_key,p_input);if result is not null then return result;end if;
 select * into c from wm.integration_credentials where organization_id=p_org and id=(p_input->>'connection_id')::uuid for update;
 if not found or (c.authorized_by<>auth.uid() and not wm.operator_has(p_org,'ads')) then raise exception 'Connection unavailable' using errcode='42501';end if;perform wm.check_version(c.version,(p_input->>'expected_version')::bigint);
 if exists(select 1 from wm.provider_scopes s join wm.campaign_bindings b on b.organization_id=s.organization_id and b.provider_scope_id=s.id where s.organization_id=p_org and s.credential_id=c.id)
 or exists(select 1 from wm.provider_scopes s join wm.operations o on o.organization_id=s.organization_id and o.provider_scope_id=s.id where s.organization_id=p_org and s.credential_id=c.id and o.state in ('pending','in_flight','unknown')) then raise exception 'Complete campaign stop or handoff before disconnecting' using errcode='42501';end if;
 update wm.integration_credentials set state='revoked',revoked_at=now(),ciphertext='[revoked provider credential]',refresh_nonce=null,version=version+1 where organization_id=p_org and id=c.id;
 update wm.provider_scopes set access_status='revoked',version=version+1 where organization_id=p_org and credential_id=c.id;
 perform wm.critical(p_org,'connection.disconnected',c.id,jsonb_build_object('actor_id',auth.uid()));
 return wm.finish_command(p_org,'connection.disconnect',p_key,p_input,jsonb_build_object('id',c.id,'state','revoked'),c.id);
end $$;
create function public.wm_connection_discovered(p_org uuid,p_ticket uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_machine();perform wm.require_connection_ticket(p_org,p_ticket);
 update wm.connection_tickets set consumed_at=now() where organization_id=p_org and id=p_ticket and purpose='discover';
 if not found then raise exception 'Discovery ticket required' using errcode='42501';end if;
end $$;
revoke all on function public.wm_connection_discovered(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wm_connection_discovered(uuid,uuid) to service_role;
revoke all on all functions in schema wm from public,anon,authenticated;
revoke all on function public.wm_connection_start(uuid,jsonb,text),public.wm_connections(uuid),public.wm_connection_ticket(uuid,jsonb,text),public.wm_connection_disconnect(uuid,jsonb,text) from public,anon;
grant execute on function public.wm_connection_start(uuid,jsonb,text),public.wm_connections(uuid),public.wm_connection_ticket(uuid,jsonb,text),public.wm_connection_disconnect(uuid,jsonb,text) to authenticated;
revoke all on function public.wm_connection_claim(text,text,text),public.wm_connection_complete(uuid,uuid,uuid,text,text,timestamptz),public.wm_connection_failed(uuid,uuid,uuid),public.wm_connection_context(uuid,uuid),public.wm_connection_refresh_begin(uuid,uuid,bigint),public.wm_connection_refresh_complete(uuid,uuid,uuid,text,text,timestamptz),public.wm_connection_bind(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wm_connection_claim(text,text,text),public.wm_connection_complete(uuid,uuid,uuid,text,text,timestamptz),public.wm_connection_failed(uuid,uuid,uuid),public.wm_connection_context(uuid,uuid),public.wm_connection_refresh_begin(uuid,uuid,bigint),public.wm_connection_refresh_complete(uuid,uuid,uuid,text,text,timestamptz),public.wm_connection_bind(uuid,uuid,jsonb) to service_role;
commit;
