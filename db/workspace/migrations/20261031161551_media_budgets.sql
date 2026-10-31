begin;
create table wm.media_budget_pools(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,agreement_id uuid not null,
 terms jsonb not null,digest text not null,scope_bindings jsonb not null,proposed_by uuid not null,created_at timestamptz not null default now(),
 currency text not null,total_minor bigint not null,reserve_minor bigint not null,timezone text not null,starts_at timestamptz not null,ends_at timestamptz not null,expires_at timestamptz not null,recurrence text not null,
 replaces_pool_id uuid,state text not null default 'proposed' check(state in ('proposed','active','revoked','superseded','expired')),version bigint not null default 1,approved_decision_id uuid,reason text,next_check_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 foreign key(organization_id,agreement_id) references wm.agreements(organization_id,id),foreign key(organization_id,replaces_pool_id) references wm.media_budget_pools(organization_id,id)
);
create table wm.media_budget_decisions(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),pool_id uuid not null,decision text not null check(decision in ('approve','revoke')),
 actor_id uuid not null,authority_id uuid not null,authority_snapshot jsonb not null,membership_snapshot jsonb not null,identity_snapshot jsonb not null,agreement_snapshot jsonb not null,
 recovery_generation bigint not null,external_generation text not null,digest text not null,reason text not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,pool_id) references wm.media_budget_pools(organization_id,id),foreign key(organization_id,authority_id) references wm.engagement_authorities(organization_id,id)
);
alter table wm.media_budget_pools add foreign key(organization_id,approved_decision_id) references wm.media_budget_decisions(organization_id,id);
create table wm.media_budget_periods(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),pool_id uuid not null,period_key text not null,period_start timestamptz not null,period_end timestamptz not null,
 valid_from timestamptz not null,valid_until timestamptz not null,rebalance_count integer not null default 0,rebalance_minor bigint not null default 0,version bigint not null default 1,
 primary key(organization_id,id),unique(organization_id,pool_id,period_key),foreign key(organization_id,pool_id) references wm.media_budget_pools(organization_id,id)
);
create table wm.media_budget_allocations(
 organization_id uuid not null,period_id uuid not null,allocation_key text not null,provider_scope_id uuid not null,assigned_minor bigint not null,unmanaged_minor bigint not null,cap_minor bigint not null,version bigint not null default 1,
 primary key(organization_id,period_id,allocation_key),unique(organization_id,period_id,provider_scope_id),foreign key(organization_id,period_id) references wm.media_budget_periods(organization_id,id),foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id),
 check(assigned_minor>=unmanaged_minor and assigned_minor<=cap_minor and unmanaged_minor>=0)
);
create table wm.media_budget_commitments(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,provider_scope_id uuid not null,currency text not null,timezone text not null,
 period_start timestamptz not null,period_end timestamptz not null,package_key text not null,high_water_minor bigint not null check(high_water_minor>0),carry_required boolean not null default true,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,provider_scope_id,timezone,period_start,period_end,package_key),foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id)
);
create table wm.media_budget_links(
 organization_id uuid not null,budget_id uuid not null,pool_id uuid not null,period_id uuid not null,allocation_key text not null,provider_scope_id uuid not null,revision_id uuid not null,package_key text not null,plan_hash text not null,
 primary key(organization_id,budget_id),unique(organization_id,pool_id,period_id,revision_id),foreign key(organization_id,budget_id) references wm.budget_authorizations(organization_id,id),foreign key(organization_id,period_id,allocation_key) references wm.media_budget_allocations(organization_id,period_id,allocation_key)
);
create table wm.media_budget_operation_links(
 organization_id uuid not null,operation_id uuid not null,budget_id uuid not null,commitment_id uuid not null,required_minor bigint not null,
 primary key(organization_id,operation_id),foreign key(organization_id,operation_id) references wm.operations(organization_id,id),foreign key(organization_id,budget_id) references wm.media_budget_links(organization_id,budget_id),foreign key(organization_id,commitment_id) references wm.media_budget_commitments(organization_id,id)
);
create table wm.media_budget_spend_evidence(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),provider_scope_id uuid not null,period_start timestamptz not null,period_end timestamptz not null,timezone text not null,currency text not null,amount_minor bigint not null,proof jsonb not null,proof_digest text not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,provider_scope_id,proof_digest),foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id)
);
create function wm.media_minor(v jsonb,positive boolean default false) returns bigint language plpgsql immutable set search_path='' as $$declare n bigint;begin
 if jsonb_typeof(v) is distinct from 'string' or v#>>'{}' !~ '^(0|[1-9][0-9]{0,17})$' then raise exception 'Exact minor-unit integer strings required' using errcode='22023';end if;
 n:=(v#>>'{}')::bigint;if positive and n=0 then raise exception 'Positive amount required' using errcode='22023';end if;return n;
end $$;
create function wm.media_operator_digest(org uuid,who uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(wm.hash_json(jsonb_build_object('assignment',to_jsonb(a),'staff',(select to_jsonb(s) from wm.staff s where s.user_id=who)))) from wm.operator_assignments a where a.organization_id=org and a.user_id=who
$$;
create function wm.media_scope_binding(org uuid,scope uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare s wm.provider_scopes;c wm.integration_credentials;g wm.tenant_guards;owner jsonb;begin
 select * into s from wm.provider_scopes where organization_id=org and id=scope;
 select * into c from wm.integration_credentials where organization_id=org and id=s.credential_id;
 select * into g from wm.tenant_guards where organization_id=org;
 if s.id is null or s.provider not in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads') or s.access_status<>'verified' or s.currency is null or s.timezone is null or c.id is null or c.provider<>s.provider or c.environment<>s.environment or c.engagement_id<>s.engagement_id or c.revoked_at is not null or c.state not in ('connected','refreshing') or c.recovery_generation<>g.recovery_generation or c.external_generation<>g.external_generation or wm.media_identity(c.authorized_by) is null or not wm.connection_actor_current(org,c.authorized_by,c.actor_kind) or c.actor_kind='operator' and not wm.operator_for(org,c.authorized_by,'ads') then raise exception 'Current exact connected ad account required' using errcode='42501';end if;
 if c.actor_kind='operator' then owner:=wm.media_operator_digest(org,c.authorized_by);else select to_jsonb(m) into owner from wm.memberships m where m.organization_id=org and m.user_id=c.authorized_by;end if;
 return jsonb_build_object('scope_id',s.id,'engagement_id',s.engagement_id,'provider',s.provider,'environment',s.environment,'account_id',s.account_id,'currency',s.currency,'timezone',s.timezone,'manager_id',s.manager_id,'credential_id',c.id,'oauth_session_id',c.oauth_session_id,'authorized_by',c.authorized_by,'owner_grant',owner,'recovery_generation',c.recovery_generation,'external_generation',c.external_generation);
end $$;
create function wm.media_identity(who uuid) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('id',u.id,'email',u.email,'email_confirmed_at',u.email_confirmed_at) from auth.users u where u.id=who and u.email_confirmed_at is not null$$;
create function wm.media_pool_live(org uuid,pool uuid,at_time timestamptz default clock_timestamp(),require_service boolean default true) returns wm.media_budget_pools language plpgsql volatile security definer set search_path='' as $$
declare p wm.media_budget_pools;d wm.media_budget_decisions;g wm.tenant_guards;a wm.engagement_authorities;m wm.memberships;ag wm.agreements;e wm.engagements;v jsonb;begin
 perform 1 from wm.tenant_guards where organization_id=org for update;select * into p from wm.media_budget_pools where organization_id=org and id=pool for update;
 select * into d from wm.media_budget_decisions where organization_id=org and id=p.approved_decision_id;
 select * into g from wm.tenant_guards where organization_id=org;select * into a from wm.engagement_authorities where organization_id=org and id=d.authority_id;
 select * into m from wm.memberships where organization_id=org and user_id=d.actor_id;select * into ag from wm.agreements where organization_id=org and id=p.agreement_id;select * into e from wm.engagements where organization_id=org and id=p.engagement_id;
 if p.id is null or p.state<>'active' or d.decision is distinct from 'approve' or g.access_state<>'open' or (require_service and not g.positive_effects_allowed) or d.recovery_generation<>g.recovery_generation or d.external_generation<>g.external_generation
 or p.starts_at>at_time or p.ends_at<=at_time or p.expires_at<=at_time or a.revoked_at is not null or a.starts_at>clock_timestamp() or a.ends_at<=clock_timestamp() or a.domain<>'spending' or a.user_id<>d.actor_id
 or to_jsonb(a) is distinct from d.authority_snapshot or to_jsonb(m) is distinct from d.membership_snapshot or wm.media_identity(d.actor_id) is distinct from d.identity_snapshot
 or m.status<>'active' or m.revoked_at is not null or m.role not in ('customer_admin','contributor') or to_jsonb(ag) is distinct from d.agreement_snapshot or ag.status<>'accepted' or (ag.supersedes_id is not null and ag.effective_state<>'effective')
 or (ag.starts_at is not null and ag.starts_at>at_time) or (ag.ends_at is not null and ag.ends_at<=at_time) or e.service_state not in ('setup','active') or (require_service and (e.service_state<>'active' or e.service_start_at is null)) or e.commercial_state in ('ending','closed') then raise exception 'Current accepted media authority required' using errcode='42501';end if;
 for v in select value from jsonb_array_elements(p.scope_bindings) loop if wm.media_scope_binding(org,(v->>'scope_id')::uuid) is distinct from v then raise exception 'Accepted account binding changed' using errcode='42501';end if;end loop;
 return p;
end $$;
create function wm.media_budget_pause(org uuid,pool uuid,who uuid,why text) returns void language plpgsql volatile security definer set search_path='' as $$declare p wm.media_budget_pools;s wm.provider_scopes;stop uuid;resources jsonb;begin
 perform 1 from wm.tenant_guards where organization_id=org for update;select * into p from wm.media_budget_pools where organization_id=org and id=pool;
 for s in select native_scope.* from wm.provider_scopes native_scope where native_scope.organization_id=org and native_scope.id in(select (v->>'provider_scope_id')::uuid from jsonb_array_elements(p.terms->'allocations') v) order by native_scope.id for update loop
 if s.active_stop_id is not null then continue;end if;stop:=gen_random_uuid();select coalesce(jsonb_agg(resource_name order by resource_name),'[]') into resources from wm.campaign_bindings where organization_id=org and provider_scope_id=s.id;
 insert into wm.stop_intents(organization_id,id,engagement_id,provider_scope_id,stop_epoch,actor_id,reason,managed_resources) values(org,stop,p.engagement_id,s.id,s.stop_epoch+1,who,why,resources);
 update wm.provider_scopes set stop_epoch=stop_epoch+1,active_stop_id=stop,version=version+1 where organization_id=org and id=s.id;
 update wm.operations set state='cancelled',last_error_code='media_authority_ended',version=version+1 where organization_id=org and provider_scope_id=s.id and positive_effect and state='pending';
 update wm.outbox_jobs j set state='cancelled' from wm.operations o where j.organization_id=org and o.organization_id=org and j.operation_id=o.id and o.state='cancelled' and j.state in ('pending','leased');
 insert into wm.stop_attempt_links select org,stop,a.id from wm.operation_attempts a join wm.operations o on o.organization_id=a.organization_id and o.id=a.operation_id where a.organization_id=org and o.provider_scope_id=s.id and o.positive_effect and a.state not in ('resolved','cancelled_before_dispatch');
 perform wm.enqueue(org,p.engagement_id,null,null,s.id,wm.pause_kind(s.provider),jsonb_build_object('stop_id',stop),false,'stop:'||stop,who);
 perform wm.critical(org,'media_budget.defensive_stop',stop,jsonb_build_object('pool_id',pool,'scope_id',s.id,'reason',why));
 end loop;
end $$;
create function wm.media_invalidate_pool(org uuid,pool uuid,why text) returns void language plpgsql volatile security definer set search_path='' as $$declare p wm.media_budget_pools;begin
 perform 1 from wm.tenant_guards where organization_id=org for update;
 update wm.media_budget_pools set state='revoked',reason=why,version=version+1 where organization_id=org and id=pool and state='active' returning * into p;if not found then return;end if;
 perform wm.media_budget_pause(org,pool,p.proposed_by,why);perform wm.critical(org,'media_budget.invalidated',pool,jsonb_build_object('reason',why,'policy','current_authority_and_service'));
end $$;
create function wm.media_authority_fence() returns trigger language plpgsql volatile security definer set search_path='' as $$declare p record;tenant uuid;eng uuid;begin
 if to_jsonb(new)=to_jsonb(old) then return new;end if;
 if tg_table_name='staff' then
 -- The existing BEFORE staff fence already holds exactly these current direct
 -- assignment tenant guards in UUID order. Do not add stale-history tenants.
 for tenant in select organization_id from wm.operator_assignments where user_id=old.user_id and revoked_at is null and active_until>clock_timestamp() order by organization_id loop
 for p in select x.id from wm.media_budget_pools x where x.organization_id=tenant and x.state='active' and exists(select 1 from jsonb_array_elements(x.scope_bindings) v where v->>'authorized_by'=old.user_id::text) order by x.id loop perform wm.media_invalidate_pool(tenant,p.id,'Native connection owner grant changed');end loop;end loop;
 return new;end if;
 tenant:=new.organization_id;
 if tg_table_name='engagements' then if not (new.service_state is distinct from old.service_state and new.service_state<>'active' or new.commercial_state in ('ending','closed') and new.commercial_state is distinct from old.commercial_state) then return new;end if;end if;
 perform 1 from wm.tenant_guards where organization_id=tenant for update;
 for p in select x.id from wm.media_budget_pools x join wm.media_budget_decisions d on d.organization_id=x.organization_id and d.id=x.approved_decision_id where x.organization_id=tenant and x.state='active' and case tg_table_name
 when 'memberships' then d.actor_id=(to_jsonb(old)->>'user_id')::uuid
 when 'engagement_authorities' then d.authority_id=(to_jsonb(old)->>'id')::uuid
 when 'agreements' then x.agreement_id=(to_jsonb(old)->>'id')::uuid
 when 'engagements' then x.engagement_id=(to_jsonb(old)->>'id')::uuid else false end order by x.id loop perform wm.media_invalidate_pool(tenant,p.id,'Current media issuer, agreement or service changed');end loop;
 return new;
end $$;
create trigger media_membership_fence after update on wm.memberships for each row execute function wm.media_authority_fence();
create trigger media_named_authority_fence after update on wm.engagement_authorities for each row execute function wm.media_authority_fence();
create trigger media_agreement_fence after update on wm.agreements for each row execute function wm.media_authority_fence();
create trigger media_service_fence after update on wm.engagements for each row execute function wm.media_authority_fence();
create trigger media_staff_fence after update on wm.staff for each row execute function wm.media_authority_fence();
create function wm.media_scope_quiet(org uuid,scope uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from wm.provider_scopes s join wm.stop_intents x on x.organization_id=s.organization_id and x.id=s.active_stop_id where s.organization_id=org and s.id=scope and x.state='verified' and x.stop_epoch=s.stop_epoch)
 and not exists(select 1 from wm.operations o where o.organization_id=org and o.provider_scope_id=scope and o.positive_effect and o.state in ('pending','in_flight','unknown'))
 and not exists(select 1 from wm.operation_attempts a join wm.operations o on o.organization_id=a.organization_id and o.id=a.operation_id where a.organization_id=org and o.provider_scope_id=scope and o.positive_effect and a.state not in ('resolved','cancelled_before_dispatch'))
$$;
create function wm.media_period(org uuid,pool uuid,at_time timestamptz default clock_timestamp()) returns wm.media_budget_periods language plpgsql volatile security definer set search_path='' as $$
declare p wm.media_budget_pools;d wm.media_budget_decisions;r wm.media_budget_periods;v jsonb;lo timestamptz;hi timestamptz;k text;begin
 p:=wm.media_pool_live(org,pool,at_time);select * into d from wm.media_budget_decisions where organization_id=org and id=p.approved_decision_id;
 lo:=date_trunc('month',at_time at time zone p.timezone) at time zone p.timezone;hi:=(date_trunc('month',at_time at time zone p.timezone)+interval '1 month') at time zone p.timezone;k:=to_char(lo at time zone p.timezone,'YYYY-MM');
 if p.recurrence='once' and date_trunc('month',p.starts_at at time zone p.timezone)<>date_trunc('month',at_time at time zone p.timezone) then raise exception 'One-period media authority ended' using errcode='42501';end if;
 select * into r from wm.media_budget_periods where organization_id=org and pool_id=pool and period_key=k;if found then return r;end if;
 insert into wm.media_budget_periods(organization_id,pool_id,period_key,period_start,period_end,valid_from,valid_until) values(org,pool,k,lo,hi,greatest(lo,p.starts_at,d.created_at),least(hi,p.ends_at,p.expires_at,(d.authority_snapshot->>'ends_at')::timestamptz)) returning * into r;
 for v in select value from jsonb_array_elements(p.terms->'allocations') loop
 insert into wm.media_budget_allocations values(org,r.id,v->>'key',(v->>'provider_scope_id')::uuid,wm.media_minor(v->'initial_minor'),wm.media_minor(v->'unmanaged_minor'),wm.media_minor(v->'cap_minor'),1);
 if wm.media_scope_quiet(org,(v->>'provider_scope_id')::uuid) then update wm.media_budget_commitments set carry_required=false where organization_id=org and provider_scope_id=(v->>'provider_scope_id')::uuid;end if;
 -- A new calendar does not erase an unresolved running package. Copy the latest
 -- high-water hold once per logical package into the new account period.
 insert into wm.media_budget_commitments(organization_id,engagement_id,provider_scope_id,currency,timezone,period_start,period_end,package_key,high_water_minor)
 select org,p.engagement_id,(v->>'provider_scope_id')::uuid,p.currency,p.timezone,lo,hi,c.package_key,max(c.high_water_minor) from wm.media_budget_commitments c where c.organization_id=org and c.provider_scope_id=(v->>'provider_scope_id')::uuid and c.period_start<lo and c.carry_required group by c.package_key
 on conflict(organization_id,provider_scope_id,timezone,period_start,period_end,package_key) do update set high_water_minor=greatest(wm.media_budget_commitments.high_water_minor,excluded.high_water_minor);
 end loop;return r;
end $$;
-- Sum commitments conservatively across replacement pools and overlapping
-- calendars. Actual account spend is a floor, not permission to free a hold.
create function wm.media_scope_held(org uuid,scope uuid,lo timestamptz,hi timestamptz,unmanaged bigint) returns bigint language sql stable security definer set search_path='' as $$
 select greatest(greatest(unmanaged,coalesce((select max(a.unmanaged_minor) from wm.media_budget_allocations a join wm.media_budget_periods r on r.organization_id=a.organization_id and r.id=a.period_id where a.organization_id=org and a.provider_scope_id=scope and r.period_start<hi and r.period_end>lo),0))+coalesce((select sum(high_water_minor) from wm.media_budget_commitments c where c.organization_id=org and c.provider_scope_id=scope and c.period_start<hi and c.period_end>lo),0),coalesce((select max(amount_minor) from wm.media_budget_spend_evidence e where e.organization_id=org and e.provider_scope_id=scope and e.period_start<hi and e.period_end>lo),0))::bigint
$$;
create function wm.media_budget_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if tg_table_name='media_budget_pools' and (to_jsonb(new)-array['state','version','approved_decision_id','reason','next_check_at']) is distinct from (to_jsonb(old)-array['state','version','approved_decision_id','reason','next_check_at']) then raise exception 'Media pool terms are immutable';end if;
 if tg_table_name='media_budget_commitments' then if new.high_water_minor<old.high_water_minor or (to_jsonb(new)-array['high_water_minor','carry_required']) is distinct from (to_jsonb(old)-array['high_water_minor','carry_required']) then raise exception 'Media commitment cannot be erased or rebound';end if;end if;return new;
end $$;
create trigger media_pool_immutable before update on wm.media_budget_pools for each row execute function wm.media_budget_immutable();
create trigger media_commitment_immutable before update on wm.media_budget_commitments for each row execute function wm.media_budget_immutable();
create function wm.media_canonical(v jsonb) returns text language plpgsql immutable set search_path='' as $$declare s text;begin
 if jsonb_typeof(v)='object' then select '{'||coalesce(string_agg(to_jsonb(key)::text||':'||wm.media_canonical(value),',' order by key collate "C"),'')||'}' into s from jsonb_each(v);
 elsif jsonb_typeof(v)='array' then select '['||coalesce(string_agg(wm.media_canonical(value),',' order by ord),'')||']' into s from jsonb_array_elements(v) with ordinality a(value,ord);else s:=v::text;end if;return s;
end $$;
create function public.wm_media_budget_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare p wm.media_budget_pools;old_pool wm.media_budget_pools;ag wm.agreements;e wm.engagements;a wm.engagement_authorities;g wm.tenant_guards;d wm.media_budget_decisions;r wm.media_budget_periods;
 prior jsonb;t jsonb;v jsonb;bound jsonb;bindings jsonb:='[]';total bigint;reserve bigint;initial numeric:=0;lo timestamptz;hi timestamptz;expiry timestamptz;tz text;count_keys integer;delta numeric:=0;allocated numeric:=0;current_alloc wm.media_budget_allocations;target bigint;held bigint;new_id uuid;begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
 if p_command in ('media_budget.propose','media_budget.rebalance') and not wm.operator_has(p_org,'ads') then raise exception 'Assigned ads operator required' using errcode='42501';end if;
 if p_command='media_budget.propose' then
 perform wm.check_input(p_input,array['engagement_id','agreement_id','terms','replaces_pool_id'],array['engagement_id','agreement_id','terms']);t:=p_input->'terms';
 perform wm.check_input(t,array['currency','total_minor','reserve_minor','timezone','starts_at','ends_at','expires_at','recurrence','routine_limits','allocations'],array['currency','total_minor','reserve_minor','timezone','starts_at','ends_at','expires_at','recurrence','routine_limits','allocations']);
 total:=wm.media_minor(t->'total_minor',true);reserve:=wm.media_minor(t->'reserve_minor');tz:=t->>'timezone';
 if t->>'currency' !~ '^[A-Z]{3}$' or reserve>total or not exists(select 1 from pg_timezone_names where name=tz) or (tz<>'UTC' and position('/' in tz)=0) or t->>'recurrence' not in ('once','calendar_month') then raise exception 'Explicit currency/calendar and bounded reserve required' using errcode='22023';end if;
 if t->>'starts_at' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' or t->>'ends_at' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' or t->>'expires_at' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Explicit timestamp offsets required' using errcode='22023';end if;
 lo:=(t->>'starts_at')::timestamptz;hi:=(t->>'ends_at')::timestamptz;expiry:=(t->>'expires_at')::timestamptz;
 if not isfinite(lo) or not isfinite(hi) or not isfinite(expiry) or lo>=hi or expiry<=lo or expiry>hi or expiry<=clock_timestamp() or hi>clock_timestamp()+interval '2 years' or t->>'recurrence'='once' and hi>(date_trunc('month',lo at time zone tz)+interval '1 month') at time zone tz then raise exception 'Bounded explicit media period required' using errcode='22023';end if;
 perform wm.check_input(t->'routine_limits',array['max_rebalance_minor','max_rebalances','allowed_actions'],array['max_rebalance_minor','max_rebalances','allowed_actions']);perform wm.media_minor(t->'routine_limits'->'max_rebalance_minor');
 if jsonb_typeof(t->'routine_limits'->'max_rebalances') is distinct from 'number' or t->'routine_limits'->>'max_rebalances' !~ '^(0|[1-9][0-9]?)$' or (t->'routine_limits'->>'max_rebalances')::integer>24 or jsonb_typeof(t->'routine_limits'->'allowed_actions') is distinct from 'array' or jsonb_array_length(t->'routine_limits'->'allowed_actions') not between 1 and 4 or exists(select 1 from jsonb_array_elements_text(t->'routine_limits'->'allowed_actions') x where x not in ('create','enable','update','pause')) then raise exception 'Fixed bounded routine limits required' using errcode='22023';end if;
 select * into e from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid;select * into ag from wm.agreements where organization_id=p_org and engagement_id=e.id and id=(p_input->>'agreement_id')::uuid;
 if e.id is null or e.currency<>t->>'currency' or e.service_state not in ('setup','active') or ag.id is null or ag.status<>'accepted' or ag.supersedes_id is not null and ag.effective_state<>'effective' then raise exception 'Current accepted service agreement required' using errcode='42501';end if;
 if jsonb_typeof(t->'allocations') is distinct from 'array' or jsonb_array_length(t->'allocations') not between 1 and 20 then raise exception 'One to twenty fixed account allocations required' using errcode='22023';end if;
 select count(distinct item.value->>'key') into count_keys from jsonb_array_elements(t->'allocations') item(value);if count_keys<>jsonb_array_length(t->'allocations') or (select count(distinct item.value->>'provider_scope_id') from jsonb_array_elements(t->'allocations') item(value))<>count_keys then raise exception 'Unique allocation keys/accounts required' using errcode='22023';end if;
 for v in select value from jsonb_array_elements(t->'allocations') loop
 perform wm.check_input(v,array['key','provider_scope_id','provider','environment','account_id','currency','timezone','initial_minor','cap_minor','unmanaged_minor'],array['key','provider_scope_id','provider','environment','account_id','currency','timezone','initial_minor','cap_minor','unmanaged_minor']);
 if v->>'key' !~ '^[a-z0-9][a-z0-9_-]{0,59}$' or v->>'currency'<>t->>'currency' or wm.media_minor(v->'unmanaged_minor')>wm.media_minor(v->'initial_minor') or wm.media_minor(v->'initial_minor')>wm.media_minor(v->'cap_minor') or wm.media_minor(v->'cap_minor')>total-reserve then raise exception 'Allocation cap/reserve arithmetic mismatch' using errcode='22023';end if;
 bound:=wm.media_scope_binding(p_org,(v->>'provider_scope_id')::uuid);if bound->>'engagement_id'<>e.id::text or exists(select 1 from unnest(array['provider','environment','account_id','currency','timezone']) k where bound->>k is distinct from v->>k) then raise exception 'Exact provider/account/currency/calendar required' using errcode='42501';end if;
 if exists(select 1 from wm.media_budget_commitments c where c.organization_id=p_org and c.provider_scope_id=(v->>'provider_scope_id')::uuid and c.currency<>t->>'currency') then raise exception 'Reconcile old account currency commitments first' using errcode='42501';end if;
 if wm.media_minor(v->'unmanaged_minor')<coalesce((select max(al.unmanaged_minor) from wm.media_budget_allocations al where al.organization_id=p_org and al.provider_scope_id=(v->>'provider_scope_id')::uuid),0) then raise exception 'Unmanaged commitment evidence pending; no manual downward release' using errcode='42501';end if;
 bindings:=bindings||jsonb_build_array(bound);initial:=initial+wm.media_minor(v->'initial_minor');end loop;
 if initial+reserve<>total then raise exception 'Allocations plus unallocated reserve must equal total' using errcode='22023';end if;
 prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 insert into wm.media_budget_pools(organization_id,engagement_id,agreement_id,terms,digest,scope_bindings,proposed_by,currency,total_minor,reserve_minor,timezone,starts_at,ends_at,expires_at,recurrence,replaces_pool_id)
 values(p_org,e.id,ag.id,t,wm.hash_json(t),bindings,auth.uid(),t->>'currency',total,reserve,tz,lo,hi,expiry,t->>'recurrence',nullif(p_input->>'replaces_pool_id','')::uuid) returning * into p;
 else
 if p_command='media_budget.approve' then perform wm.check_input(p_input,array['pool_id','expected_version','digest','shown_terms_digest'],array['pool_id','expected_version','digest','shown_terms_digest']);
 elsif p_command='media_budget.revoke' then perform wm.check_input(p_input,array['pool_id','expected_version','reason'],array['pool_id','expected_version','reason']);
 elsif p_command='media_budget.rebalance' then perform wm.check_input(p_input,array['pool_id','expected_version','period_key','allocations','reason'],array['pool_id','expected_version','period_key','allocations','reason']);else raise exception 'Unsupported media budget action' using errcode='22023';end if;
 select * into p from wm.media_budget_pools where organization_id=p_org and id=(p_input->>'pool_id')::uuid for update;if not found then raise exception 'Media pool unavailable' using errcode='42501';end if;
 if p_command in ('media_budget.approve','media_budget.revoke') then
 if wm.member_role(p_org) is null or wm.member_role(p_org) not in ('customer_admin','contributor') or wm.media_identity(auth.uid()) is null then raise exception 'Current named customer authority required' using errcode='42501';end if;
 if p_command='media_budget.approve' then a:=wm.authority(p_org,p.engagement_id,'spending');else select * into a from wm.engagement_authorities where organization_id=p_org and engagement_id=p.engagement_id and user_id=auth.uid() and domain in ('spending','stop') and revoked_at is null and starts_at<=clock_timestamp() and ends_at>clock_timestamp() order by domain limit 1;if not found then raise exception 'Current defensive customer authority required' using errcode='42501';end if;end if;
 end if;
 prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or p_input->>'expected_version' !~ '^[1-9][0-9]*$' then raise exception 'Whole current version required' using errcode='22023';end if;
 if p_command='media_budget.rebalance' then r:=wm.media_period(p_org,p.id);perform wm.check_version(r.version,(p_input->>'expected_version')::bigint);else perform wm.check_version(p.version,(p_input->>'expected_version')::bigint);end if;
 if p_command='media_budget.approve' then
 if p.state<>'proposed' or p.digest is distinct from p_input->>'digest' or p.digest is distinct from p_input->>'shown_terms_digest' or p.expires_at<=clock_timestamp() or p.expires_at>a.ends_at then raise exception 'Exact current terms and bounded named spending authority required' using errcode='42501';end if;
 select * into ag from wm.agreements where organization_id=p_org and id=p.agreement_id;select * into e from wm.engagements where organization_id=p_org and id=p.engagement_id;select * into g from wm.tenant_guards where organization_id=p_org;
 if ag.status<>'accepted' or e.service_state not in ('setup','active') or ag.supersedes_id is not null and ag.effective_state<>'effective' or ag.ends_at is not null and p.expires_at>ag.ends_at then raise exception 'Current accepted service agreement required' using errcode='42501';end if;
 for v in select value from jsonb_array_elements(p.scope_bindings) loop if wm.media_scope_binding(p_org,(v->>'scope_id')::uuid) is distinct from v then raise exception 'Proposed account binding changed' using errcode='42501';end if;end loop;
 if p.replaces_pool_id is not null then select * into old_pool from wm.media_budget_pools where organization_id=p_org and id=p.replaces_pool_id for update;if old_pool.id is null or old_pool.engagement_id<>p.engagement_id or old_pool.currency<>p.currency or old_pool.timezone<>p.timezone or old_pool.state<>'active' or p.starts_at>clock_timestamp()
 or (select jsonb_agg(jsonb_build_array(item.value->>'key',item.value->>'provider_scope_id') order by item.value->>'key') from jsonb_array_elements(p.terms->'allocations') item(value)) is distinct from (select jsonb_agg(jsonb_build_array(item.value->>'key',item.value->>'provider_scope_id') order by item.value->>'key') from jsonb_array_elements(old_pool.terms->'allocations') item(value)) then raise exception 'Current replacement must preserve exact calendar/account/allocation identities' using errcode='42501';end if;end if;
 if exists(select 1 from wm.media_budget_pools other where other.organization_id=p_org and other.engagement_id=p.engagement_id and other.state='active' and other.id is distinct from p.replaces_pool_id and other.starts_at<p.ends_at and other.ends_at>p.starts_at and exists(select 1 from jsonb_array_elements(other.terms->'allocations') x join jsonb_array_elements(p.terms->'allocations') y on x->>'provider_scope_id'=y->>'provider_scope_id')) then raise exception 'Explicit replacement required for an overlapping pool' using errcode='42501';end if;
 insert into wm.media_budget_decisions(organization_id,pool_id,decision,actor_id,authority_id,authority_snapshot,membership_snapshot,identity_snapshot,agreement_snapshot,recovery_generation,external_generation,digest,reason)
 select p_org,p.id,'approve',auth.uid(),a.id,to_jsonb(a),to_jsonb(m),wm.media_identity(auth.uid()),to_jsonb(ag),g.recovery_generation,g.external_generation,p.digest,'Exact immutable terms accepted' from wm.memberships m where m.organization_id=p_org and m.user_id=auth.uid() returning id into new_id;
 if old_pool.id is not null then update wm.media_budget_pools set state='superseded',reason='explicit_accepted_replacement',version=version+1 where organization_id=p_org and id=old_pool.id;end if;
 update wm.media_budget_pools set state='active',approved_decision_id=new_id,next_check_at=greatest(clock_timestamp(),starts_at),version=version+1 where organization_id=p_org and id=p.id returning * into p;
 elsif p_command='media_budget.revoke' then
 perform wm.require_text(p_input->>'reason','withdrawal reason',2000);select * into ag from wm.agreements where organization_id=p_org and id=p.agreement_id;select * into g from wm.tenant_guards where organization_id=p_org;
 insert into wm.media_budget_decisions(organization_id,pool_id,decision,actor_id,authority_id,authority_snapshot,membership_snapshot,identity_snapshot,agreement_snapshot,recovery_generation,external_generation,digest,reason)
 select p_org,p.id,'revoke',auth.uid(),a.id,to_jsonb(a),to_jsonb(m),wm.media_identity(auth.uid()),to_jsonb(ag),g.recovery_generation,g.external_generation,p.digest,p_input->>'reason' from wm.memberships m where m.organization_id=p_org and m.user_id=auth.uid();
 update wm.media_budget_pools set state='revoked',reason=p_input->>'reason',version=version+1 where organization_id=p_org and id=p.id returning * into p;perform wm.media_budget_pause(p_org,p.id,auth.uid(),'Media authority withdrawn');
 else
 if r.period_key is distinct from p_input->>'period_key' or jsonb_typeof(p_input->'allocations') is distinct from 'array' or jsonb_array_length(p_input->'allocations')<>(select count(*) from wm.media_budget_allocations where organization_id=p_org and period_id=r.id) or (select count(distinct item.value->>'key') from jsonb_array_elements(p_input->'allocations') item(value))<>jsonb_array_length(p_input->'allocations') then raise exception 'Exact current period/allocation set required' using errcode='22023';end if;
 for v in select value from jsonb_array_elements(p_input->'allocations') loop
 perform wm.check_input(v,array['key','assigned_minor'],array['key','assigned_minor']);select * into current_alloc from wm.media_budget_allocations where organization_id=p_org and period_id=r.id and allocation_key=v->>'key' for update;if not found then raise exception 'Fixed allocation key required' using errcode='22023';end if;
 target:=wm.media_minor(v->'assigned_minor');held:=wm.media_scope_held(p_org,current_alloc.provider_scope_id,r.period_start,r.period_end,current_alloc.unmanaged_minor);
 if target<held or target>current_alloc.cap_minor then raise exception 'Rebalance cannot move committed or unknown money' using errcode='42501';end if;delta:=delta+greatest(0,target-current_alloc.assigned_minor);allocated:=allocated+target;
 end loop;
 if allocated+p.reserve_minor<>p.total_minor or r.rebalance_count>=(p.terms->'routine_limits'->>'max_rebalances')::integer or r.rebalance_minor+delta>wm.media_minor(p.terms->'routine_limits'->'max_rebalance_minor') then raise exception 'Accepted routine rebalance bounds exceeded' using errcode='42501';end if;
 perform wm.require_text(p_input->>'reason','rebalance reason',2000);
 update wm.media_budget_allocations al set assigned_minor=wm.media_minor(item.value->'assigned_minor'),version=al.version+1 from jsonb_array_elements(p_input->'allocations') item(value) where al.organization_id=p_org and al.period_id=r.id and al.allocation_key=item.value->>'key';
 update wm.media_budget_periods set rebalance_count=rebalance_count+1,rebalance_minor=rebalance_minor+delta::bigint,version=version+1 where organization_id=p_org and id=r.id returning * into r;
 end if;end if;
 perform wm.critical(p_org,p_command,p.id,jsonb_build_object('pool_id',p.id,'digest',p.digest,'version',p.version,'period_id',r.id,'period_version',r.version,'reason',p_input->>'reason'));
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',p.id,'version',p.version,'digest',p.digest,'state',p.state,'period_id',r.id,'period_version',r.version),p.id);
end $$;
create function wm.ad_budget_attach(org uuid,revision uuid) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare v wm.revisions;r wm.requests;approval wm.decisions;p wm.media_budget_pools;period wm.media_budget_periods;allocation wm.media_budget_allocations;d wm.media_budget_decisions;native jsonb;b uuid;amount bigint;package text;begin
 perform 1 from wm.tenant_guards where organization_id=org for update;
 select * into v from wm.revisions where organization_id=org and id=revision;select * into r from wm.requests where organization_id=org and id=v.request_id;
 select * into approval from wm.decisions where organization_id=org and revision_id=v.id order by created_at desc,id desc limit 1;
 if v.kind is distinct from 'campaign_package' or r.current_revision_id is distinct from v.id or r.state not in ('approved','executing','verifying','complete') or approval.decision is distinct from 'approve' or approval.digest is distinct from v.digest then raise exception 'Exact current approved campaign revision required' using errcode='42501';end if;
 native:=v.manifest->'native_ads';perform wm.check_input(native,array['schema','pool_id','allocation_key','provider_scope_id','plan_hash','native_plan','rights_ids','measurement_id'],array['schema','pool_id','allocation_key','provider_scope_id','plan_hash','native_plan','rights_ids']);
 if not native ? 'measurement_id' or jsonb_typeof(native->'rights_ids') is distinct from 'array' or jsonb_array_length(native->'rights_ids')>50 or native->'native_plan'->>'schema' is distinct from 'wm-native-ads/1' or native->>'schema' is distinct from 'wm-native-package/1' or native->>'plan_hash' !~ '^[a-f0-9]{64}$' or jsonb_typeof(native->'native_plan') is distinct from 'object' or encode(sha256(convert_to(wm.media_canonical(native->'native_plan'),'UTF8')),'hex') is distinct from native->>'plan_hash' or native->'native_plan'->>'marker' !~ '^[a-z0-9][a-z0-9_-]{15,63}$' then raise exception 'Exact frozen native plan/hash required' using errcode='22023';end if;
 p:=wm.media_pool_live(org,(native->>'pool_id')::uuid);period:=wm.media_period(org,p.id);
 if p.engagement_id<>r.engagement_id then raise exception 'Campaign is outside accepted pool engagement' using errcode='42501';end if;
 select * into allocation from wm.media_budget_allocations where organization_id=org and period_id=period.id and allocation_key=native->>'allocation_key';
 if allocation.provider_scope_id is distinct from (native->>'provider_scope_id')::uuid or v.manifest->>'currency' is distinct from p.currency or native->'native_plan'->>'currency' is distinct from p.currency
 or not exists(select 1 from wm.provider_scopes s where s.organization_id=org and s.id=allocation.provider_scope_id and s.account_id=v.manifest->>'account_id' and s.provider=v.manifest->>'provider' and s.account_id=native->'native_plan'->>'account_id' and s.provider=native->'native_plan'->>'provider' and s.environment=native->'native_plan'->>'environment' and s.currency=p.currency) then raise exception 'Wrong accepted allocation/account/currency/environment' using errcode='42501';end if;
 amount:=wm.media_minor(v.manifest->'budget_minor',true);if amount>allocation.cap_minor-allocation.unmanaged_minor then raise exception 'Approved campaign exceeds account allocation cap' using errcode='42501';end if;
 select * into d from wm.media_budget_decisions where organization_id=org and id=p.approved_decision_id;package:=r.id::text||':'||(native->'native_plan'->>'marker');
 select budget_id into b from wm.media_budget_links where organization_id=org and pool_id=p.id and period_id=period.id and revision_id=v.id;if found then return b;end if;
 insert into wm.budget_authorizations(organization_id,engagement_id,revision_id,authority_id,currency,total_minor,reserve_minor,period_key,valid_from,valid_until,allocation,recurrence,routine_limits)
 values(org,p.engagement_id,v.id,d.authority_id,p.currency,amount,0,p.id::text||':'||period.period_key,period.valid_from,period.valid_until,jsonb_build_object('pool_id',p.id,'period_id',period.id,'allocation_key',allocation.allocation_key,'provider_scope_id',allocation.provider_scope_id,'package_key',package,'plan_hash',native->>'plan_hash'),jsonb_build_object('kind',p.recurrence,'timezone',p.timezone),p.terms->'routine_limits') returning id into b;
 insert into wm.media_budget_links values(org,b,p.id,period.id,allocation.allocation_key,allocation.provider_scope_id,v.id,package,native->>'plan_hash');return b;
end $$;
create function wm.ad_budget_current(org uuid,budget uuid,operation uuid,require_reservation boolean default false) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare l wm.media_budget_links;b wm.budget_authorizations;p wm.media_budget_pools;r wm.media_budget_periods;o wm.operations;g wm.tenant_guards;s wm.provider_scopes;hold wm.media_budget_operation_links;action text;begin
 perform 1 from wm.tenant_guards where organization_id=org for update;select * into l from wm.media_budget_links where organization_id=org and budget_id=budget;if not found then raise exception 'Bound media budget unavailable' using errcode='42501';end if;
 p:=wm.media_pool_live(org,l.pool_id);select * into b from wm.budget_authorizations where organization_id=org and id=budget;select * into r from wm.media_budget_periods where organization_id=org and id=l.period_id;
 if b.status<>'active' or b.valid_from>clock_timestamp() or b.valid_until<=clock_timestamp() or r.valid_until<=clock_timestamp() or wm.ad_budget_attach(org,l.revision_id) is distinct from budget then raise exception 'Current exact media period/revision required' using errcode='42501';end if;
 select * into s from wm.provider_scopes where organization_id=org and id=l.provider_scope_id;if s.active_stop_id is not null then raise exception 'Explicit current STOP clearance required; no automatic resume' using errcode='42501';end if;
 if operation is not null then
 select * into o from wm.operations where organization_id=org and id=operation;select * into g from wm.tenant_guards where organization_id=org;action:=split_part(o.kind,'_',2);
 if o.id is null or not o.positive_effect or o.revision_id<>l.revision_id or o.provider_scope_id<>l.provider_scope_id or o.engagement_id<>p.engagement_id or o.payload->>'budget_id' is distinct from budget::text or wm.ad_provider(o.kind) is distinct from s.provider or action not in ('create','enable','update')
 or not (p.terms->'routine_limits'->'allowed_actions' ? action) or o.state in ('failed','cancelled') or o.recovery_generation<>g.recovery_generation or o.external_generation<>g.external_generation or o.authority_version<>g.authority_version or o.stop_epoch<>s.stop_epoch or not wm.operator_for(org,o.actor_id,'ads') then raise exception 'Current operation/actor/stop/media binding required' using errcode='42501';end if;
 end if;
 if require_reservation then
 select * into hold from wm.media_budget_operation_links where organization_id=org and operation_id=operation and budget_id=budget;
 if hold.operation_id is null or hold.required_minor<b.total_minor or not exists(select 1 from wm.media_budget_commitments c where c.organization_id=org and c.id=hold.commitment_id and c.high_water_minor>=b.total_minor) or not exists(select 1 from wm.budget_reservations x where x.organization_id=org and x.budget_id=budget and x.operation_id=operation and x.state='reserved') then raise exception 'Conservative package reservation required' using errcode='42501';end if;
 end if;
 return jsonb_build_object('budget_id',budget,'pool_id',p.id,'period_id',r.id,'period_key',r.period_key,'period_start',r.period_start,'period_end',r.period_end,'currency',p.currency,'timezone',p.timezone,'amount_minor',b.total_minor::text,'allocation_key',l.allocation_key,'package_key',l.package_key,'plan_hash',l.plan_hash,'native_daily_hard_cap',false,'actual_spend_status','pending_native_evidence');
end $$;
create function wm.ad_budget_reserve(org uuid,budget uuid,operation uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare checked jsonb;l wm.media_budget_links;b wm.budget_authorizations;r wm.media_budget_periods;p wm.media_budget_pools;al wm.media_budget_allocations;c wm.media_budget_commitments;prior wm.media_budget_operation_links;delta bigint;held bigint;sum_held numeric;begin
 checked:=wm.ad_budget_current(org,budget,operation,false);select * into l from wm.media_budget_links where organization_id=org and budget_id=budget;select * into b from wm.budget_authorizations where organization_id=org and id=budget;select * into r from wm.media_budget_periods where organization_id=org and id=l.period_id;select * into p from wm.media_budget_pools where organization_id=org and id=l.pool_id;
 select * into prior from wm.media_budget_operation_links where organization_id=org and operation_id=operation;if found then if prior.budget_id<>budget then raise exception 'Operation budget binding is immutable' using errcode='23505';end if;return wm.ad_budget_current(org,budget,operation,true);end if;
 select * into al from wm.media_budget_allocations where organization_id=org and period_id=r.id and allocation_key=l.allocation_key for update;
 select * into c from wm.media_budget_commitments where organization_id=org and provider_scope_id=l.provider_scope_id and timezone=p.timezone and period_start=r.period_start and period_end=r.period_end and package_key=l.package_key for update;
 delta:=greatest(0,b.total_minor-coalesce(c.high_water_minor,0));held:=wm.media_scope_held(org,al.provider_scope_id,r.period_start,r.period_end,al.unmanaged_minor);
 select coalesce(sum(wm.media_scope_held(org,x.provider_scope_id,r.period_start,r.period_end,x.unmanaged_minor)),0) into sum_held from wm.media_budget_allocations x where x.organization_id=org and x.period_id=r.id;
 if held+delta>al.assigned_minor or sum_held+delta>p.total_minor-p.reserve_minor then raise exception 'No uncommitted accepted media room; unknown holds remain' using errcode='42501';end if;
 if c.id is null then insert into wm.media_budget_commitments(organization_id,engagement_id,provider_scope_id,currency,timezone,period_start,period_end,package_key,high_water_minor) values(org,p.engagement_id,l.provider_scope_id,p.currency,p.timezone,r.period_start,r.period_end,l.package_key,b.total_minor) returning * into c;
 else update wm.media_budget_commitments set high_water_minor=greatest(high_water_minor,b.total_minor),carry_required=true where organization_id=org and id=c.id returning * into c;end if;
 insert into wm.budget_reservations values(org,budget,operation,delta,'reserved');insert into wm.media_budget_operation_links values(org,operation,budget,c.id,b.total_minor);
 perform wm.critical(org,'media_budget.reserved',operation,jsonb_build_object('budget_id',budget,'commitment_id',c.id,'new_commitment_minor',delta::text,'high_water_minor',c.high_water_minor::text));return wm.ad_budget_current(org,budget,operation,true);
end $$;
create function public.wm_media_budget_observe_stop(p_org uuid,p_scope uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 if not wm.media_scope_quiet(p_org,p_scope) then return jsonb_build_object('closed_for_future',false,'current_holds_released',false);end if;
 update wm.media_budget_commitments set carry_required=false where organization_id=p_org and provider_scope_id=p_scope;
 return jsonb_build_object('closed_for_future',true,'current_holds_released',false,'resumed',false);
end $$;
create function public.wm_media_budget_record_spend(p_org uuid,p_input jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.provider_scopes;g wm.tenant_guards;lo timestamptz;hi timestamptz;observed timestamptz;amount bigint;digest text;rid uuid;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 perform wm.check_input(p_input,array['schema','provider_scope_id','provider','environment','account_id','currency','timezone','period_start','period_end','source','query_hash','raw_hash','normalized_hash','coverage','scope','finalized_through','observed_at','amount_minor','recovery_generation','external_generation'],array['schema','provider_scope_id','provider','environment','account_id','currency','timezone','period_start','period_end','source','query_hash','raw_hash','normalized_hash','coverage','scope','finalized_through','observed_at','amount_minor','recovery_generation','external_generation']);
 select * into s from wm.provider_scopes where organization_id=p_org and id=(p_input->>'provider_scope_id')::uuid;select * into g from wm.tenant_guards where organization_id=p_org;
 lo:=(p_input->>'period_start')::timestamptz;hi:=(p_input->>'period_end')::timestamptz;observed:=(p_input->>'observed_at')::timestamptz;amount:=wm.media_minor(p_input->'amount_minor');
 if s.id is null or p_input->>'schema' is distinct from 'wm-native-media-spend/1' or p_input->>'provider' is distinct from s.provider or p_input->>'environment' is distinct from s.environment or p_input->>'account_id' is distinct from s.account_id or p_input->>'currency' is distinct from s.currency
 or p_input->>'source' is distinct from s.provider||'_native_account_spend/v1' or p_input->>'coverage' is distinct from 'complete' or p_input->>'scope' is distinct from 'ACCOUNT_ALL_CAMPAIGNS' or p_input->>'external_generation' is distinct from g.external_generation or (p_input->>'recovery_generation')::bigint is distinct from g.recovery_generation
 or p_input->>'query_hash' !~ '^[a-f0-9]{64}$' or p_input->>'raw_hash' !~ '^[a-f0-9]{64}$' or p_input->>'normalized_hash' is distinct from encode(sha256(convert_to(wm.media_canonical(p_input-array['query_hash','raw_hash','normalized_hash','observed_at','recovery_generation','external_generation','finalized_through']),'UTF8')),'hex')
 or not isfinite(lo) or not isfinite(hi) or not isfinite(observed) or not isfinite((p_input->>'finalized_through')::timestamptz) or lo is distinct from date_trunc('month',lo at time zone (p_input->>'timezone')) at time zone (p_input->>'timezone') or hi is distinct from (date_trunc('month',lo at time zone (p_input->>'timezone'))+interval '1 month') at time zone (p_input->>'timezone')
 or observed>clock_timestamp()+interval '1 minute' or observed<clock_timestamp()-interval '10 minutes' or observed<hi or (p_input->>'finalized_through')::timestamptz<hi or (p_input->>'finalized_through')::timestamptz>observed
 or not exists(select 1 from wm.media_budget_periods r join wm.media_budget_pools p on p.organization_id=r.organization_id and p.id=r.pool_id join wm.media_budget_allocations al on al.organization_id=r.organization_id and al.period_id=r.id where r.organization_id=p_org and al.provider_scope_id=s.id and r.period_start=lo and r.period_end=hi and p.timezone=p_input->>'timezone' and p.currency=s.currency) then raise exception 'Exact complete machine spend provenance required' using errcode='42501';end if;
 perform wm.media_scope_binding(p_org,s.id);digest:=wm.hash_json(p_input);
 insert into wm.media_budget_spend_evidence(organization_id,provider_scope_id,period_start,period_end,timezone,currency,amount_minor,proof,proof_digest) values(p_org,s.id,lo,hi,p_input->>'timezone',s.currency,amount,p_input,digest) on conflict(organization_id,provider_scope_id,proof_digest) do nothing returning id into rid;
 if rid is null then select id into rid from wm.media_budget_spend_evidence where organization_id=p_org and provider_scope_id=s.id and proof_digest=digest;end if;
 return jsonb_build_object('id',rid,'recorded',true,'held_commitments_released',false,'amount_minor',amount::text);
end $$;
create function public.wm_media_budget_generate(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare candidate record;p wm.media_budget_pools;r wm.media_budget_periods;v wm.media_budget_allocations;bad boolean;result jsonb:='[]';why text;begin
 perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Bounded media period generation required' using errcode='22023';end if;
 for candidate in select organization_id,id from (select organization_id,id from wm.media_budget_pools where state='active' and next_check_at<=clock_timestamp() order by next_check_at,organization_id,id limit p_limit) due order by organization_id,id loop
 perform 1 from wm.tenant_guards where organization_id=candidate.organization_id for update;select * into p from wm.media_budget_pools where organization_id=candidate.organization_id and id=candidate.id for update;
 if p.state<>'active' or p.starts_at>clock_timestamp() or p.next_check_at>clock_timestamp() then continue;end if;
 update wm.media_budget_pools set next_check_at=clock_timestamp()+interval '1 minute' where organization_id=p.organization_id and id=p.id;
 begin perform wm.media_pool_live(p.organization_id,p.id,clock_timestamp(),false);exception when sqlstate '42501' then
 update wm.media_budget_pools set state=case when expires_at<=clock_timestamp() or ends_at<=clock_timestamp() then 'expired' else 'revoked' end,reason='authority_or_service_changed',version=version+1 where organization_id=p.organization_id and id=p.id;
 perform wm.media_budget_pause(p.organization_id,p.id,p.proposed_by,'Media authority expired or changed');perform wm.critical(p.organization_id,'media_budget.invalidated',p.id,jsonb_build_object('reason','authority_or_service_changed'));result:=result||jsonb_build_array(jsonb_build_object('pool_id',p.id,'state','attention'));continue;end;
 if exists(select 1 from wm.engagements e where e.organization_id=p.organization_id and e.id=p.engagement_id and (e.service_state='setup' or e.service_start_at is null)) or not exists(select 1 from wm.tenant_guards g where g.organization_id=p.organization_id and g.positive_effects_allowed) then result:=result||jsonb_build_array(jsonb_build_object('pool_id',p.id,'state','pending_service_or_positive_control'));continue;end if;
 r:=wm.media_period(p.organization_id,p.id);bad:=false;
 for v in select * from wm.media_budget_allocations where organization_id=p.organization_id and period_id=r.id loop if wm.media_scope_held(p.organization_id,v.provider_scope_id,r.period_start,r.period_end,v.unmanaged_minor)>v.assigned_minor then bad:=true;end if;end loop;
 if bad then perform wm.media_budget_pause(p.organization_id,p.id,p.proposed_by,'Carried or actual media holds exceed available allocation');end if;
 result:=result||jsonb_build_array(jsonb_build_object('pool_id',p.id,'period_id',r.id,'period_key',r.period_key,'state',case when bad then 'attention' else 'current' end));end loop;return result;
end $$;
create function public.wm_media_budget_list(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare items jsonb;can_decide boolean;begin
 perform wm.require_access(p_org,'read');
 can_decide:=wm.member_role(p_org)='customer_admin' or exists(select 1 from wm.engagement_authorities a where a.organization_id=p_org and a.user_id=auth.uid() and a.domain in ('spending','stop') and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.ends_at>clock_timestamp() and wm.member_role(p_org) in ('customer_admin','contributor'));
 if not wm.operator_has(p_org,'ads') and not coalesce(can_decide,false) then raise exception 'Media budget audience unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(x order by created_at desc,id),'[]') into items from (select p.id,p.engagement_id,p.agreement_id,e.title engagement_title,p.state,p.reason,p.version::text,p.digest,p.terms,p.created_at,
 exists(select 1 from wm.engagement_authorities a where a.organization_id=p_org and a.engagement_id=p.engagement_id and a.user_id=auth.uid() and a.domain='spending' and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.ends_at>clock_timestamp() and wm.member_role(p_org) in ('customer_admin','contributor') and wm.media_identity(auth.uid()) is not null) can_approve,
 exists(select 1 from wm.engagement_authorities a where a.organization_id=p_org and a.engagement_id=p.engagement_id and a.user_id=auth.uid() and a.domain in ('spending','stop') and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.ends_at>clock_timestamp() and wm.member_role(p_org) in ('customer_admin','contributor') and wm.media_identity(auth.uid()) is not null) can_revoke,
 (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'period_key',r.period_key,'period_start',r.period_start,'period_end',r.period_end,'valid_from',r.valid_from,'valid_until',r.valid_until,'version',r.version::text,'allocations',(select jsonb_agg(jsonb_build_object('key',al.allocation_key,'provider_scope_id',al.provider_scope_id,'assigned_minor',al.assigned_minor::text,'unmanaged_minor',al.unmanaged_minor::text,'cap_minor',al.cap_minor::text,'held_minor',wm.media_scope_held(p_org,al.provider_scope_id,r.period_start,r.period_end,al.unmanaged_minor)::text,'actual_spend_status',case when exists(select 1 from wm.media_budget_spend_evidence se where se.organization_id=p_org and se.provider_scope_id=al.provider_scope_id and se.period_start=r.period_start and se.period_end=r.period_end) then 'complete_evidence_retained' else 'pending_native_evidence' end) order by al.allocation_key) from wm.media_budget_allocations al where al.organization_id=p_org and al.period_id=r.id)) order by r.period_start desc),'[]') from (select * from wm.media_budget_periods where organization_id=p_org and pool_id=p.id order by period_start desc limit 2) r) periods,
 (select coalesce(jsonb_agg(jsonb_build_object('decision',d.decision,'actor_id',d.actor_id,'created_at',d.created_at,'reason',d.reason) order by d.created_at),'[]') from wm.media_budget_decisions d where d.organization_id=p_org and d.pool_id=p.id) decisions
 from wm.media_budget_pools p join wm.engagements e on e.organization_id=p.organization_id and e.id=p.engagement_id where p.organization_id=p_org and (wm.operator_has(p_org,'ads') or wm.member_role(p_org)='customer_admin' or exists(select 1 from wm.engagement_authorities aa where aa.organization_id=p_org and aa.engagement_id=p.engagement_id and aa.user_id=auth.uid() and aa.domain in ('spending','stop') and aa.revoked_at is null and aa.starts_at<=clock_timestamp() and aa.ends_at>clock_timestamp())) order by p.created_at desc,p.id limit 20) x;
 return jsonb_build_object('items',items,'can_propose',wm.operator_has(p_org,'ads'),'can_review',coalesce(can_decide,false),'actual_spend_reader','unavailable_until_qualified','native_daily_hard_cap',false);
end $$;
do $$declare n text;begin
 foreach n in array array['media_budget_pools','media_budget_decisions','media_budget_periods','media_budget_allocations','media_budget_commitments','media_budget_links','media_budget_operation_links','media_budget_spend_evidence'] loop
 execute format('alter table wm.%I enable row level security',n);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',n);
 insert into wm.tenant_backup_registry(name,classification,predicate_sql,redacted,reason,signature) values(n,'tenant','x.organization_id=$1','{}','Media budget evidence only; restored grants/reservations cannot authorize effects',wm.backup_schema_signature(n));
 end loop;
 foreach n in array array['media_budget_decisions','media_budget_links','media_budget_operation_links','media_budget_spend_evidence'] loop execute format('create trigger immutable_media_history before update or delete on wm.%I for each row execute function wm.reject_history_edit()',n);end loop;
end $$;
-- Existing restore registry/replicas deliberately remain frozen. Its exact
-- compatibility checks must reject this new schema until a reviewed amendment.
revoke all on function wm.media_minor(jsonb,boolean),wm.media_operator_digest(uuid,uuid),wm.media_scope_binding(uuid,uuid),wm.media_identity(uuid),wm.media_pool_live(uuid,uuid,timestamptz,boolean),wm.media_budget_pause(uuid,uuid,uuid,text),wm.media_scope_quiet(uuid,uuid),wm.media_period(uuid,uuid,timestamptz),wm.media_scope_held(uuid,uuid,timestamptz,timestamptz,bigint),wm.media_budget_immutable(),wm.media_canonical(jsonb),wm.ad_budget_attach(uuid,uuid),wm.ad_budget_current(uuid,uuid,uuid,boolean),wm.ad_budget_reserve(uuid,uuid,uuid),public.wm_media_budget_command(uuid,text,jsonb,text),public.wm_media_budget_observe_stop(uuid,uuid),public.wm_media_budget_record_spend(uuid,jsonb),public.wm_media_budget_generate(integer),public.wm_media_budget_list(uuid) from public,anon,authenticated,service_role;
revoke all on function wm.media_invalidate_pool(uuid,uuid,text),wm.media_authority_fence() from public,anon,authenticated,service_role;
grant execute on function public.wm_media_budget_command(uuid,text,jsonb,text),public.wm_media_budget_list(uuid) to authenticated;
grant execute on function public.wm_media_budget_observe_stop(uuid,uuid),public.wm_media_budget_record_spend(uuid,jsonb),public.wm_media_budget_generate(integer) to service_role;
commit;
