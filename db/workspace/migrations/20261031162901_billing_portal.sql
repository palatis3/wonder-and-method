begin;
create table wm.portal_bindings(
 organization_id uuid primary key references wm.organizations(id),id uuid not null unique default gen_random_uuid(),
 environment text not null check(environment in ('test','live')),account_id text not null check(account_id~'^acct_[A-Za-z0-9]+$'),
 customer_id text not null check(customer_id~'^cus_[A-Za-z0-9]+$'),sandbox_id text not null check(length(sandbox_id) between 3 and 100),
 configuration_id text not null check(configuration_id~'^bpc_[A-Za-z0-9]+$'),configuration_digest text not null check(configuration_digest~'^[a-f0-9]{64}$'),
 policy_version text not null check(length(policy_version) between 1 and 100),api_version text not null check(api_version='2026-10-28.endive'),
 return_url text not null check(return_url~'^https://[^/]+/' and length(return_url)<=500),billing_generation bigint not null,
 qualified_at timestamptz not null,qualification text not null check(length(qualification) between 10 and 2000),enabled boolean not null default false,
 version bigint not null default 1,unique(environment,account_id,customer_id)
);
create table wm.portal_grants(
 organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),user_id uuid not null,
 binding_id uuid not null references wm.portal_bindings(id),binding_version bigint not null,
 starts_at timestamptz not null default now(),ends_at timestamptz not null,revoked_at timestamptz,version bigint not null default 1,
 approved_by uuid not null,evidence text not null check(length(evidence) between 10 and 2000),
 primary key(organization_id,id),check(ends_at>starts_at)
);
create unique index portal_current_grant on wm.portal_grants(organization_id,user_id,binding_id) where revoked_at is null;
create table wm.portal_requests(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),operation_id uuid not null,user_id uuid not null,session_id uuid not null,
 context jsonb not null,created_at timestamptz not null default now(),dispatch_until timestamptz not null,
 replay_until timestamptz,kernel_permit jsonb,primary key(organization_id,id),unique(organization_id,operation_id),
 foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create table wm.portal_secrets(
 organization_id uuid not null,request_id uuid not null,attempt_id uuid not null,provider_id text not null,
 context jsonb not null,ciphertext text not null check(length(ciphertext) between 40 and 16000),expires_at timestamptz not null,
 primary key(organization_id,request_id),foreign key(organization_id,request_id) references wm.portal_requests(organization_id,id),
 foreign key(organization_id,attempt_id) references wm.operation_attempts(organization_id,id)
);
create function wm.portal_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Portal evidence is immutable';end if;
 if tg_table_name='portal_requests' then
  if (to_jsonb(new)-array['replay_until','kernel_permit']) is distinct from (to_jsonb(old)-array['replay_until','kernel_permit']) or (old.kernel_permit is not null and new.kernel_permit is distinct from old.kernel_permit) then raise exception 'Portal request identity is immutable';end if;
 elsif tg_table_name='portal_bindings' then
  if (new.organization_id,new.id,new.environment,new.account_id,new.customer_id,new.sandbox_id) is distinct from (old.organization_id,old.id,old.environment,old.account_id,old.customer_id,old.sandbox_id) then raise exception 'Portal merchant identity is immutable';end if;
 else
  if (to_jsonb(new)-array['revoked_at','version']) is distinct from (to_jsonb(old)-array['revoked_at','version']) or old.revoked_at is not null then raise exception 'Portal grant identity is immutable';end if;
 end if;return new;
end $$;
create trigger portal_request_immutable before update or delete on wm.portal_requests for each row execute function wm.portal_immutable();
create trigger portal_binding_immutable before update or delete on wm.portal_bindings for each row execute function wm.portal_immutable();
create trigger portal_grant_immutable before update or delete on wm.portal_grants for each row execute function wm.portal_immutable();

-- A narrow operator workflow grants THIS customer's whole billing audience. It never follows from a role.
create function public.wm_portal_grant(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;b wm.portal_bindings;g wm.portal_grants;uid uuid;
begin
 perform wm.require_access(p_org,'finance');perform wm.require_recent_auth();
 if not wm.operator_has(p_org,'people') or not wm.owner_direct(p_org,auth.uid(),'finance') or not wm.owner_direct(p_org,auth.uid(),'people') then raise exception 'Current finance and people staff required' using errcode='42501';end if;
 perform wm.check_input(p_input,array['user_id','binding_version','ends_at','evidence','revoke','expected_version'],array['user_id','binding_version','revoke','expected_version']);
 if jsonb_typeof(p_input->'revoke') is distinct from 'boolean' or jsonb_typeof(p_input->'binding_version') is distinct from 'number' or jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'binding_version')!~'^[1-9][0-9]*$' or (p_input->>'expected_version')!~'^[0-9]+$' then raise exception 'Strict grant flags and versions required' using errcode='22023';end if;
 result:=wm.prior_command(p_org,'portal.grant',p_key,p_input);if result is not null then return result;end if;
 uid:=(p_input->>'user_id')::uuid;select * into b from wm.portal_bindings where organization_id=p_org and enabled;
 if b.id is null then raise exception 'Qualified portal binding required' using errcode='42501';end if;
 perform wm.check_version(b.version,(p_input->>'binding_version')::bigint);
 select * into g from wm.portal_grants where organization_id=p_org and user_id=uid and binding_id=b.id and revoked_at is null for update;
 if p_input->>'revoke'='true' then
  if g.id is null then raise exception 'Grant unavailable';end if;perform wm.check_version(g.version,(p_input->>'expected_version')::bigint);
  update wm.portal_grants set revoked_at=clock_timestamp(),version=version+1 where organization_id=p_org and id=g.id and revoked_at is null;
 else
  if p_input->>'revoke' is distinct from 'false' or (p_input->>'expected_version')::bigint<>0 or g.id is not null then raise exception 'Explicit new grant required' using errcode='40001';end if;
  if not exists(select 1 from wm.memberships m join auth.users u on u.id=m.user_id where m.organization_id=p_org and m.user_id=uid and m.status='active' and m.revoked_at is null and m.role in ('customer_admin','contributor') and u.email_confirmed_at is not null) then raise exception 'Current verified customer required' using errcode='42501';end if;
  if (p_input->>'ends_at')::timestamptz<=now() or (p_input->>'ends_at')::timestamptz>now()+interval '1 year' then raise exception 'Bounded grant expiry required';end if;
  insert into wm.portal_grants(organization_id,user_id,binding_id,binding_version,ends_at,approved_by,evidence) values(p_org,uid,b.id,b.version,(p_input->>'ends_at')::timestamptz,auth.uid(),p_input->>'evidence') returning * into g;
 end if;
 perform wm.critical(p_org,'portal.authority',g.id,jsonb_build_object('grant_id',g.id,'user_id',uid,'revoke',p_input->'revoke'));
 return wm.finish_command(p_org,'portal.grant',p_key,p_input,jsonb_build_object('id',g.id),g.id);
end $$;

-- Called only by a qualified server setup path, never mapped directly from browser JSON.
create function public.wm_portal_binding_register(p_org uuid,p_input jsonb,p_expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare b wm.billing_accounts;v bigint;bid uuid;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;if not found then raise exception 'Business unavailable';end if;
 if p_expected is null or p_expected<0 then raise exception 'Expected binding version required' using errcode='22023';end if;
 perform wm.check_input(p_input,array['environment','account_id','customer_id','sandbox_id','configuration_id','configuration_digest','policy_version','api_version','return_url','qualification','enabled'],array['environment','account_id','customer_id','sandbox_id','configuration_id','configuration_digest','policy_version','api_version','return_url','qualification','enabled']);
 select * into b from wm.billing_accounts where organization_id=p_org;
 if b.organization_id is null or b.environment<>p_input->>'environment' or b.account_id<>p_input->>'account_id' or b.customer_id<>p_input->>'customer_id' then raise exception 'Exact verified billing mapping required' using errcode='42501';end if;
 if jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then raise exception 'Explicit enabled flag required';end if;
 select version into v from wm.portal_bindings where organization_id=p_org for update;
 if v is not null and not exists(select 1 from wm.portal_bindings where organization_id=p_org and environment=p_input->>'environment' and account_id=p_input->>'account_id' and customer_id=p_input->>'customer_id' and sandbox_id=p_input->>'sandbox_id') then raise exception 'Immutable merchant binding mismatch';end if;
 if coalesce(v,0)<>p_expected then raise exception 'Binding changed' using errcode='40001';end if;
 insert into wm.portal_bindings(organization_id,environment,account_id,customer_id,sandbox_id,configuration_id,configuration_digest,policy_version,api_version,return_url,billing_generation,qualified_at,qualification,enabled)
 values(p_org,b.environment,b.account_id,b.customer_id,p_input->>'sandbox_id',p_input->>'configuration_id',p_input->>'configuration_digest',p_input->>'policy_version',p_input->>'api_version',p_input->>'return_url',b.generation,clock_timestamp(),p_input->>'qualification',(p_input->>'enabled')::boolean)
 on conflict(organization_id) do update set configuration_id=excluded.configuration_id,configuration_digest=excluded.configuration_digest,policy_version=excluded.policy_version,api_version=excluded.api_version,return_url=excluded.return_url,billing_generation=excluded.billing_generation,qualified_at=excluded.qualified_at,qualification=excluded.qualification,enabled=excluded.enabled,version=wm.portal_bindings.version+1
 returning id into bid;
 perform wm.critical(p_org,'portal.binding',bid,jsonb_build_object('binding_id',bid,'configuration_digest',p_input->>'configuration_digest'));
 return jsonb_build_object('id',bid,'version',coalesce(v,0)+1);
end $$;
create function wm.portal_authority(org uuid,uid uuid,sid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare b wm.portal_bindings;g wm.portal_grants;t wm.tenant_guards;account wm.billing_accounts;
begin
 select * into t from wm.tenant_guards where organization_id=org for update;
 if t.organization_id is null or t.access_state<>'open' or not t.positive_effects_allowed then raise exception 'Portal business unavailable' using errcode='42501';end if;
 if not exists(select 1 from auth.sessions where id=sid and user_id=uid and (not_after is null or not_after>clock_timestamp())) then raise exception 'Portal session revoked' using errcode='28000';end if;
 if not exists(select 1 from wm.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and m.user_id=uid and m.status='active' and m.revoked_at is null and m.role in ('customer_admin','contributor') and u.email_confirmed_at is not null) then raise exception 'Current customer-wide portal authority required' using errcode='42501';end if;
 select * into b from wm.portal_bindings where organization_id=org and enabled;
 select * into account from wm.billing_accounts where organization_id=org;
 if b.id is null or account.organization_id is null or (b.environment,b.account_id,b.customer_id,b.billing_generation) is distinct from (account.environment,account.account_id,account.customer_id,account.generation) then raise exception 'Portal billing mapping changed' using errcode='42501';end if;
 select * into g from wm.portal_grants where organization_id=org and user_id=uid and binding_id=b.id and binding_version=b.version and starts_at<=now() and ends_at>clock_timestamp() and revoked_at is null;
 if g.id is null then raise exception 'Explicit customer-wide billing grant required' using errcode='42501';end if;
 return jsonb_build_object('organization_id',org,'user_id',uid,'session_id',sid,'binding_id',b.id,'binding_version',b.version,'grant_id',g.id,'grant_version',g.version,'environment',b.environment,'account_id',b.account_id,'customer_id',b.customer_id,'sandbox_id',b.sandbox_id,'configuration_id',b.configuration_id,'configuration_digest',b.configuration_digest,'policy_version',b.policy_version,'api_version',b.api_version,'return_url',b.return_url,'authority_version',t.authority_version,'recovery_generation',t.recovery_generation,'external_generation',t.external_generation);
end $$;
create function wm.portal_context(org uuid,op wm.operations) returns jsonb language plpgsql security definer set search_path='' as $$
declare r wm.portal_requests;c jsonb;
begin
 select * into r from wm.portal_requests where organization_id=org and operation_id=op.id;
 if r.id is null or op.kind<>'billing_portal_create' then raise exception 'Portal operation unavailable' using errcode='42501';end if;
 c:=wm.portal_authority(org,r.user_id,r.session_id)||jsonb_build_object('request_id',r.id);
 if c is distinct from r.context or op.payload is distinct from jsonb_build_object('request_id',r.id) then raise exception 'Frozen portal authority changed' using errcode='42501';end if;
 return c;
end $$;
create function public.wm_portal_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;result jsonb;rid uuid;opid uuid;r wm.portal_requests;o wm.operations;a wm.operation_attempts;
begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
 c:=wm.portal_authority(p_org,auth.uid(),(wm.claims()->>'session_id')::uuid);
 if p_command='portal.request' then
  perform wm.check_input(p_input,array['expected_version'],array['expected_version']);if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version')!~'^[1-9][0-9]*$' then raise exception 'Whole numeric binding version required' using errcode='22023';end if;perform wm.check_version((c->>'binding_version')::bigint,(p_input->>'expected_version')::bigint);
  result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
  rid:=gen_random_uuid();opid:=wm.enqueue(p_org,null,null,null,null,'billing_portal_create',jsonb_build_object('request_id',rid),false,'portal:'||rid,auth.uid());
  insert into wm.portal_requests(organization_id,id,operation_id,user_id,session_id,context,dispatch_until) values(p_org,rid,opid,auth.uid(),(wm.claims()->>'session_id')::uuid,c||jsonb_build_object('request_id',rid),clock_timestamp()+interval '15 minutes');
  perform wm.critical(p_org,'portal.request',rid,jsonb_build_object('request_id',rid,'operation_id',opid,'configuration_digest',c->>'configuration_digest'));
  return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',rid,'operation_id',opid,'state','pending'),rid);
 elsif p_command='portal.reconcile' then
  perform wm.check_input(p_input,array['id'],array['id']);
  select * into r from wm.portal_requests where organization_id=p_org and id=(p_input->>'id')::uuid and user_id=auth.uid() and session_id=(wm.claims()->>'session_id')::uuid;
  select * into o from wm.operations where organization_id=p_org and id=r.operation_id;
  c:=wm.portal_context(p_org,o);
  select * into a from wm.operation_attempts where organization_id=p_org and operation_id=o.id order by started_at desc limit 1;
  if a.id is null or a.state<>'unknown' or a.started_at<clock_timestamp()-interval '23 hours' then raise exception 'Unknown same-key attempt within qualified window required' using errcode='42501';end if;
  -- Only a fresh explicit authenticated command authorizes another same-key POST.
  result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return jsonb_build_object('id',r.id,'state','unknown','already_requested',true);end if;
  update wm.portal_requests set replay_until=clock_timestamp()+interval '90 seconds' where organization_id=p_org and id=r.id;
  perform wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',r.id,'state','unknown'),r.id);
  return jsonb_build_object('permit',r.kernel_permit);
 end if;
 raise exception 'Unsupported portal command' using errcode='22023';
end $$;

alter function public.wm_attempt_begin(uuid,uuid,bigint,text) rename to wm_attempt_begin_before_portal;
revoke all on function public.wm_attempt_begin_before_portal(uuid,uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.wm_attempt_begin(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o wm.operations;c jsonb;result jsonb;r wm.portal_requests;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select x.* into o from wm.operations x join wm.outbox_jobs j on j.organization_id=x.organization_id and j.operation_id=x.id where j.organization_id=p_org and j.id=p_job;
 if o.kind='billing_portal_create' then
  c:=wm.portal_context(p_org,o);select * into r from wm.portal_requests where organization_id=p_org and operation_id=o.id;
  if r.dispatch_until<=clock_timestamp() or exists(select 1 from wm.operation_attempts where organization_id=p_org and operation_id=o.id) then raise exception 'Portal single attempt expired or already registered' using errcode='42501';end if;
  if exists(select 1 from wm.critical_receipts where organization_id=p_org and durability_status<>'durable') then raise exception 'Independent portal authority evidence pending' using errcode='42501';end if;
 end if;
 result:=public.wm_attempt_begin_before_portal(p_org,p_job,p_lease_generation,p_external_generation);
 if c is not null then
  update wm.operation_attempts set dispatch_context=c where organization_id=p_org and id=(result->'attempt'->>'id')::uuid;
  result:=result||jsonb_build_object('context',c);
  update wm.portal_requests set kernel_permit=result where organization_id=p_org and operation_id=o.id;
 end if;return result;
end $$;
create function public.wm_portal_effect_context(p_org uuid,p_attempt uuid,p_nonce uuid,p_replay boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare o wm.operations;a wm.operation_attempts;r wm.portal_requests;c jsonb;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id;
 c:=wm.portal_context(p_org,o);select * into r from wm.portal_requests where organization_id=p_org and operation_id=o.id;
 if a.dispatch_context is distinct from c or a.recovery_generation<>(c->>'recovery_generation')::bigint or a.external_generation<>c->>'external_generation' then raise exception 'Portal attempt binding changed' using errcode='42501';end if;
 if p_replay then
  if a.state<>'unknown' or r.replay_until is null or r.replay_until<=clock_timestamp() or a.started_at<clock_timestamp()-interval '23 hours' then raise exception 'Current explicit same-key replay required' using errcode='42501';end if;
 elsif a.state<>'dispatch_reserved' or r.dispatch_until<=clock_timestamp() then raise exception 'Portal dispatch unavailable' using errcode='42501';end if;
 return c;
end $$;
create function public.wm_portal_secret_save(p_org uuid,p_attempt uuid,p_nonce uuid,p_context jsonb,p_ciphertext text,p_provider_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a wm.operation_attempts;o wm.operations;c jsonb;expected jsonb;r wm.portal_requests;expiry timestamptz;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id;c:=wm.portal_context(p_org,o);
 if a.dispatch_context is distinct from c or a.state not in ('dispatch_reserved','unknown') or o.provider_reference is distinct from p_provider_id or p_provider_id!~'^bps_[A-Za-z0-9]+$' then raise exception 'Portal response binding changed' using errcode='42501';end if;
 expiry:=(p_context->>'expires_at')::timestamptz;if expiry<=clock_timestamp() or expiry>clock_timestamp()+interval '2 minutes 5 seconds' then raise exception 'Short portal expiry required';end if;
 expected:=jsonb_build_object('type','portal_url','request_id',c->'request_id','organization_id',p_org,'user_id',c->'user_id','session_id',c->'session_id','account_id',c->'account_id','environment',c->'environment','sandbox_id',c->'sandbox_id','customer_id',c->'customer_id','configuration_id',c->'configuration_id','configuration_digest',c->'configuration_digest','external_generation',c->'external_generation','authority_version',c->'authority_version','attempt_id',a.id,'dispatch_nonce',a.dispatch_nonce,'expires_at',p_context->'expires_at');
 if p_context is distinct from expected or p_ciphertext!~'^[A-Za-z0-9+/=]+$' then raise exception 'Invalid portal ciphertext context';end if;
 insert into wm.portal_secrets(organization_id,request_id,attempt_id,provider_id,context,ciphertext,expires_at) values(p_org,(c->>'request_id')::uuid,a.id,p_provider_id,p_context,p_ciphertext,expiry)
 on conflict(organization_id,request_id) do nothing;
 if not exists(select 1 from wm.portal_secrets where organization_id=p_org and request_id=(c->>'request_id')::uuid and attempt_id=a.id and provider_id=p_provider_id) then raise exception 'Portal secret conflict';end if;
 return jsonb_build_object('stored',true);
end $$;
alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_portal;
revoke all on function public.wm_attempt_resolve_before_portal(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o wm.operations;a wm.operation_attempts;c jsonb;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id;
 if o.kind='billing_portal_create' then
  perform wm.check_input(p_proof,array['settled','readback_matches','evidence_reference','provider_reference','observed_at','customer_id','configuration_id','configuration_digest','account_id','environment','sandbox_id','request_id','created','url_available'],array['settled','readback_matches','evidence_reference','provider_reference','observed_at','customer_id','configuration_id','configuration_digest','account_id','environment','sandbox_id','request_id','created','url_available']);
  c:=a.dispatch_context;
  if p_proof->>'provider_reference'!~'^bps_[A-Za-z0-9]+$' or p_proof->>'evidence_reference' is distinct from 'stripe:'||(p_proof->>'provider_reference') or (p_proof->>'customer_id',p_proof->>'configuration_id',p_proof->>'configuration_digest',p_proof->>'account_id',p_proof->>'environment',p_proof->>'sandbox_id',p_proof->>'request_id') is distinct from (c->>'customer_id',c->>'configuration_id',c->>'configuration_digest',c->>'account_id',c->>'environment',c->>'sandbox_id',c->>'request_id') then raise exception 'Portal outcome identity mismatch';end if;
 end if;
 return public.wm_attempt_resolve_before_portal(p_org,p_attempt,p_nonce,p_proof);
end $$;
create function public.wm_portal_disclosure(p_org uuid,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r wm.portal_requests;s wm.portal_secrets;o wm.operations;c jsonb;
begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
 select * into r from wm.portal_requests where organization_id=p_org and id=p_id and user_id=auth.uid() and session_id=(wm.claims()->>'session_id')::uuid;
 select * into o from wm.operations where organization_id=p_org and id=r.operation_id;c:=wm.portal_context(p_org,o);
 select * into s from wm.portal_secrets where organization_id=p_org and request_id=r.id and expires_at>clock_timestamp();
 if s.request_id is null or o.state<>'verified' or not exists(select 1 from wm.critical_receipts where organization_id=p_org and target_id=o.id and event_type='execution.verified' and durability_status='durable') then raise exception 'Portal URL unavailable or evidence pending' using errcode='42501';end if;
 return jsonb_build_object('context',c,'secret_context',s.context,'ciphertext',s.ciphertext);
end $$;
create function public.wm_portal_status(p_org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;items jsonb;
begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();c:=wm.portal_authority(p_org,auth.uid(),(wm.claims()->>'session_id')::uuid);
 select coalesce(jsonb_agg(x),'[]') into items from (select r.id,r.created_at,o.state,(o.state='verified' and s.expires_at>clock_timestamp() and r.context=c||jsonb_build_object('request_id',r.id)) as available
 from wm.portal_requests r join wm.operations o on o.organization_id=r.organization_id and o.id=r.operation_id left join wm.portal_secrets s on s.organization_id=r.organization_id and s.request_id=r.id
 where r.organization_id=p_org and r.user_id=auth.uid() and r.session_id=(wm.claims()->>'session_id')::uuid order by r.created_at desc limit 20) x;
 return jsonb_build_object('available',true,'binding_version',c->'binding_version','items',items);
end $$;
create function public.wm_portal_admin(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_access(p_org,'finance');perform wm.require_recent_auth();
 if not wm.operator_has(p_org,'people') or not wm.owner_direct(p_org,auth.uid(),'finance') or not wm.owner_direct(p_org,auth.uid(),'people') then raise exception 'Current finance and people staff required' using errcode='42501';end if;
 return jsonb_build_object('binding',(select jsonb_build_object('id',id,'version',version,'enabled',enabled,'customer_id',customer_id,'environment',environment,'policy_version',policy_version) from wm.portal_bindings where organization_id=p_org),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.display_name,u.email))) from wm.memberships m join auth.users u on u.id=m.user_id left join wm.profiles p on p.user_id=m.user_id where m.organization_id=p_org and m.status='active' and m.revoked_at is null and m.role in ('customer_admin','contributor') and u.email_confirmed_at is not null),'[]'),
 'grants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'user_id',user_id,'binding_version',binding_version,'version',version,'ends_at',ends_at,'revoked_at',revoked_at)) from wm.portal_grants where organization_id=p_org),'[]'));
end $$;
revoke all on function public.wm_portal_admin(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_portal_admin(uuid) to authenticated;
create function public.wm_portal_expire() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;begin perform wm.require_machine();delete from wm.portal_secrets where expires_at<=clock_timestamp();get diagnostics n=row_count;return n;end $$;
do $$ declare t text;begin foreach t in array array['portal_bindings','portal_grants','portal_requests','portal_secrets'] loop execute format('alter table wm.%I enable row level security',t);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',t);end loop;end $$;
revoke all on function wm.portal_immutable(),wm.portal_authority(uuid,uuid,uuid),wm.portal_context(uuid,wm.operations) from public,anon,authenticated,service_role;
revoke all on function public.wm_portal_grant(uuid,jsonb,text),public.wm_portal_command(uuid,text,jsonb,text),public.wm_portal_disclosure(uuid,uuid),public.wm_portal_status(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_portal_grant(uuid,jsonb,text),public.wm_portal_command(uuid,text,jsonb,text),public.wm_portal_disclosure(uuid,uuid),public.wm_portal_status(uuid) to authenticated;
revoke all on function public.wm_portal_binding_register(uuid,jsonb,bigint),public.wm_portal_effect_context(uuid,uuid,uuid,boolean),public.wm_portal_secret_save(uuid,uuid,uuid,jsonb,text,text),public.wm_portal_expire(),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.wm_portal_binding_register(uuid,jsonb,bigint),public.wm_portal_effect_context(uuid,uuid,uuid,boolean),public.wm_portal_secret_save(uuid,uuid,uuid,jsonb,text,text),public.wm_portal_expire(),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) to service_role;
insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason,signature)
select x.name,x.classification,case when x.classification='tenant' then 'x.organization_id=$1' end,'{}'::text[],x.reason,wm.backup_schema_signature(x.name)
from (values
 ('portal_bindings','tenant','Historical binding evidence; requalify after restore'),
 ('portal_grants','tenant','Historical customer-wide grants; never restore active authority'),
 ('portal_requests','tenant','Inert request/attempt references; never replay after restore'),
 ('portal_secrets','excluded','Ephemeral encrypted bearer URLs; exclude from recovery and customer exports')
) x(name,classification,reason);
commit;
