-- Supabase Postgres. The wm schema is deliberately NOT exposed in PostgREST.
-- Public entry functions are added in subsequent migrations with explicit grants.
begin;
create schema if not exists wm;
revoke all on schema wm from public, anon, authenticated;
alter default privileges in schema wm revoke all on tables from public, anon, authenticated;
alter default privileges in schema wm revoke execute on functions from public, anon, authenticated;

create table wm.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 160),
  timezone text not null default 'America/New_York',
  status text not null default 'active' check(status in ('active','ending','closed')),
  created_at timestamptz not null default now(), version bigint not null default 1
);
create table wm.tenant_guards (
  organization_id uuid primary key references wm.organizations(id),
  authority_version bigint not null default 1,
  recovery_generation bigint not null default 1,
  external_generation text not null,
  access_state text not null default 'open' check(access_state in ('open','restricted','closed')),
  positive_effects_allowed boolean not null default false,
  created_at timestamptz not null default now()
);
create table wm.profiles (
  user_id uuid primary key, display_name text not null check(length(display_name) between 1 and 160),
  preferred_locale text not null default 'en-US', created_at timestamptz not null default now()
);
create table wm.memberships (
  organization_id uuid not null references wm.organizations(id), user_id uuid not null,
  role text not null check(role in ('customer_admin','contributor','viewer')),
  status text not null default 'active' check(status in ('invited','active','revoked')),
  invited_by uuid, authority_verified_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,user_id)
);
create table wm.operator_assignments (
  organization_id uuid not null references wm.organizations(id), user_id uuid not null,
  capabilities text[] not null default '{}', active_until timestamptz not null,
  revoked_at timestamptz, created_at timestamptz not null default now(),
  primary key(organization_id,user_id),
  check(capabilities <@ array['read','delivery','finance','people','ads','reports','recovery','admin']::text[])
);
create table wm.engagements (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  service_type text not null check(service_type in ('ads_search','ads_social','ads_professional','web_design','seo','care','catalog_project')),
  catalog_id text not null, catalog_version text not null, title text not null,
  service_state text not null default 'setup' check(service_state in ('setup','active','paused','ending','closed')),
  commercial_state text not null default 'proposal' check(commercial_state in ('proposal','accepted','payment_due','current','attention','ending','closed')),
  owner_user_id uuid, starts_at timestamptz, ends_at timestamptz,
  currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null, version bigint not null default 1,
  primary key(organization_id,id), unique(id)
);
create table wm.engagement_authorities (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  user_id uuid not null, domain text not null check(domain in ('contract','content','spending','finance','stop')),
  kind text not null check(kind in ('primary','substitute')),
  starts_at timestamptz not null, ends_at timestamptz not null,
  verified_by uuid not null, evidence text not null, revoked_at timestamptz,
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,user_id) references wm.memberships(organization_id,user_id),
  check(ends_at>starts_at)
);
create unique index one_primary_authority on wm.engagement_authorities(organization_id,engagement_id,domain) where kind='primary' and revoked_at is null;

create table wm.requests (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  outcome text not null check(length(outcome) between 1 and 4000),
  state text not null default 'received' check(state in ('received','triage','waiting','accepted','preparing','in_review','approved','executing','verifying','complete','changes_requested')),
  accepted_scope text, coverage text, owner_user_id uuid, approver_user_id uuid,
  due_at timestamptz, next_contact_at timestamptz, waiting_reason text,
  current_revision_id uuid, source text not null default 'workspace',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null, version bigint not null default 1,
  primary key(organization_id,id), unique(id), unique(organization_id,engagement_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.messages (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null, request_id uuid,
  direction text not null check(direction in ('inbound','outbound','workspace')),
  visibility text not null check(visibility in ('shared','internal','triage')),
  sender_user_id uuid, body text not null check(length(body) between 1 and 20000),
  provider_message_id text, status text not null default 'recorded',
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id), unique(organization_id,engagement_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id)
);
create table wm.attachments (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  request_id uuid, message_id uuid, uploader_id uuid not null,
  visibility text not null check(visibility in ('draft','shared','internal')),
  upload_object_key text not null unique, sealed_object_key text unique,
  original_name text not null check(length(original_name) between 1 and 180),
  declared_media_type text not null, declared_bytes bigint not null check(declared_bytes between 1 and 20971520),
  actual_media_type text, actual_bytes bigint, checksum text check(checksum ~ '^[a-f0-9]{64}$'),
  scan_state text not null default 'received' check(scan_state in ('received','quarantined','checking','ready','rejected','expired')),
  scan_policy_version text, scan_observation jsonb, expires_at timestamptz not null,
  deleted_at timestamptz, retention_class text not null default 'service',
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),
  foreign key(organization_id,engagement_id,message_id) references wm.messages(organization_id,engagement_id,id),
  check(message_id is null or request_id is null),
  check(scan_state<>'ready' or (checksum is not null and sealed_object_key is not null and actual_bytes=declared_bytes and scan_policy_version is not null))
);
create table wm.revisions (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), request_id uuid not null,
  sequence integer not null check(sequence>0), schema_version integer not null default 1,
  kind text not null check(kind in ('campaign_package','agreement','report','web_preview','seo_content','catalog_deliverable')),
  manifest jsonb not null check(jsonb_typeof(manifest)='object'),
  digest text not null check(digest ~ '^[a-f0-9]{64}$'), summary text not null,
  cost_effect text not null, date_effect text not null, supersedes_id uuid,
  created_by uuid not null, created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(id), unique(organization_id,request_id,id), unique(organization_id,request_id,sequence),
  foreign key(organization_id,request_id) references wm.requests(organization_id,id),
  foreign key(organization_id,request_id,supersedes_id) references wm.revisions(organization_id,request_id,id)
);
alter table wm.requests add constraint current_revision_parent foreign key(organization_id,id,current_revision_id) references wm.revisions(organization_id,request_id,id) deferrable initially deferred;
create table wm.decisions (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), request_id uuid not null, revision_id uuid not null,
  digest text not null, actor_id uuid not null, authority_id uuid not null, authority_version bigint not null,
  decision text not null check(decision in ('approve','request_changes','withdraw')),
  shown_scope text not null, feedback text, supersedes_decision_id uuid,
  created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,request_id,revision_id) references wm.revisions(organization_id,request_id,id),
  foreign key(organization_id,authority_id) references wm.engagement_authorities(organization_id,id),
  foreign key(organization_id,supersedes_decision_id) references wm.decisions(organization_id,id)
);
create table wm.provider_scopes (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  provider text not null check(provider in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads','stripe','resend','cloudflare','analytics','search_console')),
  environment text not null check(environment in ('test','production')), account_id text not null,
  currency text, timezone text, permissions text[] not null default '{}', access_status text not null default 'unverified',
  stop_epoch bigint not null default 0, active_stop_id uuid, observed_state text not null default 'unverified',
  observed_at timestamptz, last_checked_at timestamptz,
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id), unique(provider,environment,account_id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.stop_intents (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null, provider_scope_id uuid not null,
  stop_epoch bigint not null, actor_id uuid not null, reason text not null, managed_resources jsonb not null,
  state text not null default 'requested' check(state in ('requested','observed_pending','verified','unknown','cleared')),
  clearance_actor uuid, clearance_at timestamptz, clearance_reason text, verified_at timestamptz,
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id)
);
alter table wm.provider_scopes add constraint active_stop_parent foreign key(organization_id,active_stop_id) references wm.stop_intents(organization_id,id);
create table wm.budget_authorizations (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  revision_id uuid not null, authority_id uuid not null, currency text not null check(currency ~ '^[A-Z]{3}$'),
  total_minor bigint not null check(total_minor>0), reserve_minor bigint not null check(reserve_minor>=0),
  period_key text not null, valid_from timestamptz not null, valid_until timestamptz not null,
  allocation jsonb not null, recurrence jsonb, routine_limits jsonb not null,
  status text not null default 'active' check(status in ('active','revoked','expired')),
  created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id), unique(organization_id,engagement_id,period_key,revision_id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,revision_id) references wm.revisions(organization_id,id),
  foreign key(organization_id,authority_id) references wm.engagement_authorities(organization_id,id),
  check(valid_until>valid_from and reserve_minor<=total_minor)
);

create table wm.operations (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  request_id uuid, revision_id uuid, provider_scope_id uuid, actor_id uuid not null,
  operation_key text not null, kind text not null,
  desired_digest text, payload jsonb not null,
  state text not null default 'pending' check(state in ('pending','in_flight','unknown','verified','failed','cancelled')),
  positive_effect boolean not null default false, authority_version bigint not null,
  recovery_generation bigint not null, external_generation text not null, stop_epoch bigint,
  provider_reference text, observed_result jsonb, last_error_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id), unique(id), unique(organization_id,operation_key),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),
  foreign key(organization_id,request_id,revision_id) references wm.revisions(organization_id,request_id,id),
  foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id)
);
create table wm.outbox_jobs (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), operation_id uuid not null,
  kind text not null, priority integer not null default 0, state text not null default 'pending' check(state in ('pending','leased','done','attention','cancelled')),
  not_before timestamptz not null default now(), lease_until timestamptz, lease_generation bigint not null default 0,
  attempts integer not null default 0, last_error_code text, created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(id), unique(organization_id,operation_id,kind),
  foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create table wm.operation_attempts (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), operation_id uuid not null,
  dispatch_nonce uuid not null unique default gen_random_uuid(), lease_generation bigint not null,
  recovery_generation bigint not null, external_generation text not null, stop_epoch bigint,
  state text not null default 'dispatch_reserved' check(state in ('dispatch_reserved','unknown','observed','resolved','cancelled_before_dispatch')),
  provider_request_id text, started_at timestamptz not null default now(), resolved_at timestamptz,
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create table wm.attempt_observations (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), attempt_id uuid not null,
  kind text not null, evidence jsonb not null, observed_at timestamptz not null, created_at timestamptz not null default now(),
  primary key(organization_id,id),
  foreign key(organization_id,attempt_id) references wm.operation_attempts(organization_id,id)
);
create table wm.stop_attempt_links (
  organization_id uuid not null, stop_id uuid not null, attempt_id uuid not null,
  primary key(organization_id,stop_id,attempt_id),
  foreign key(organization_id,stop_id) references wm.stop_intents(organization_id,id),
  foreign key(organization_id,attempt_id) references wm.operation_attempts(organization_id,id)
);
create table wm.budget_reservations (
  organization_id uuid not null, budget_id uuid not null, operation_id uuid not null,
  amount_minor bigint not null check(amount_minor>=0), state text not null check(state in ('reserved','settled','released')),
  primary key(organization_id,budget_id,operation_id),
  foreign key(organization_id,budget_id) references wm.budget_authorizations(organization_id,id),
  foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create table wm.command_receipts (
  organization_id uuid not null references wm.organizations(id), actor_id uuid not null,
  command_type text not null, idempotency_key text not null check(length(idempotency_key) between 16 and 200),
  payload_digest text not null, result_ref jsonb not null, created_at timestamptz not null default now(),
  primary key(organization_id,actor_id,command_type,idempotency_key)
);
create table wm.audit_events (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(), actor_id uuid,
  action text not null, target_id uuid, detail jsonb not null default '{}', correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(), primary key(organization_id,id)
);
create table wm.critical_receipts (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  sequence bigint generated always as identity, predecessor_id uuid, event_type text not null, target_id uuid not null,
  payload jsonb not null, digest text not null, external_generation text not null,
  durability_status text not null default 'pending' check(durability_status in ('pending','durable','conflict')),
  external_key text, persisted_at timestamptz, created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(id), unique(organization_id,sequence),
  foreign key(organization_id,predecessor_id) references wm.critical_receipts(organization_id,id)
);
create table wm.event_receipts (
  id uuid primary key default gen_random_uuid(), provider text not null, environment text not null,
  account_id text not null, external_event_id text not null, payload_hash text not null, payload jsonb not null,
  processing_state text not null default 'received', received_at timestamptz not null default now(),
  unique(provider,environment,account_id,external_event_id)
);
create table wm.provider_connections (
  id uuid primary key default gen_random_uuid(), provider text not null, principal text not null,
  environment text not null, key_version text not null, ciphertext text not null, nonce text not null,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
  unique(provider,environment,principal)
);
create table wm.connection_mappings (
  organization_id uuid not null, provider_scope_id uuid not null, connection_id uuid not null references wm.provider_connections(id),
  primary key(organization_id,provider_scope_id),
  foreign key(organization_id,provider_scope_id) references wm.provider_scopes(organization_id,id)
);
create index request_work_queue on wm.requests(organization_id,state,due_at);
create index messages_by_engagement on wm.messages(organization_id,engagement_id,created_at);
create index outbox_due on wm.outbox_jobs(state,not_before,priority desc);
create index attempts_unresolved on wm.operation_attempts(organization_id,operation_id,state);
create index current_authorities on wm.engagement_authorities(organization_id,engagement_id,user_id,domain) where revoked_at is null;

-- Defense in depth: no caller obtains direct table grants. Commands and snapshots
-- will still check current membership even when invoked with an old valid JWT.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='wm' loop
    execute format('alter table wm.%I enable row level security',t.tablename);
    execute format('revoke all on wm.%I from public,anon,authenticated',t.tablename);
  end loop;
end $$;
create function wm.reject_history_edit() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Append-only history cannot be edited' using errcode='42501'; end $$;
do $$ declare n text; begin
  foreach n in array array['revisions','decisions','audit_events','attempt_observations'] loop
    execute format('create trigger immutable_history before update or delete on wm.%I for each row execute function wm.reject_history_edit()',n);
  end loop;
end $$;
commit;
