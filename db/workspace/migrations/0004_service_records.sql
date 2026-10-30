begin;
create table wm.staff (
  user_id uuid primary key, capabilities text[] not null,
  active_until timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check(capabilities <@ array['intake','create_business','coverage','recovery']::text[])
);
create table wm.invitations (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  email text not null, role text not null check(role in ('customer_admin','contributor','viewer')),
  token_hash text not null unique, invited_by uuid not null, expires_at timestamptz not null,
  accepted_by uuid, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
  primary key(organization_id,id)
);
create table wm.catalog_snapshots (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  catalog_id text not null, catalog_version text not null, snapshot jsonb not null,
  digest text not null, created_by uuid not null, created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(organization_id,catalog_id,digest)
);
create table wm.source_imports (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  source_system text not null, source_id text not null, source_hash text not null,
  status text not null default 'accepted', imported_at timestamptz not null default now(),
  primary key(organization_id,id), unique(source_system,source_id)
);
create table wm.opportunities (
  organization_id uuid not null references wm.organizations(id), id uuid not null default gen_random_uuid(),
  source_import_id uuid, stage text not null default 'new' check(stage in ('new','qualified','proposed','won','lost')),
  source text not null, requested_services text[] not null, next_action text not null,
  assigned_operator uuid not null, won_lost_reason text, created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id), foreign key(organization_id,source_import_id) references wm.source_imports(organization_id,id)
);
create table wm.agreements (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  request_id uuid not null, revision_id uuid not null, catalog_snapshot_id uuid not null,
  status text not null default 'draft' check(status in ('draft','sent','accepted','superseded','terminated')),
  accepted_decision_id uuid, starts_at timestamptz, ends_at timestamptz, supersedes_id uuid,
  created_at timestamptz not null default now(), created_by uuid not null, version bigint not null default 1,
  primary key(organization_id,id), unique(id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),
  foreign key(organization_id,request_id,revision_id) references wm.revisions(organization_id,request_id,id),
  foreign key(organization_id,catalog_snapshot_id) references wm.catalog_snapshots(organization_id,id),
  foreign key(organization_id,accepted_decision_id) references wm.decisions(organization_id,id),
  foreign key(organization_id,supersedes_id) references wm.agreements(organization_id,id)
);
create table wm.milestones (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  agreement_id uuid not null, deliverable text not null, acceptance_rule text not null, due_at timestamptz,
  amount_minor bigint not null check(amount_minor>=0), earned_minor bigint not null default 0 check(earned_minor>=0),
  currency text not null check(currency ~ '^[A-Z]{3}$'), status text not null default 'planned' check(status in ('planned','due','delivered','accepted','cancelled')),
  invoice_ref text, created_at timestamptz not null default now(), version bigint not null default 1,
  primary key(organization_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,agreement_id) references wm.agreements(organization_id,id),check(earned_minor<=amount_minor)
);
create table wm.payment_references (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), engagement_id uuid not null,
  provider text not null default 'stripe', environment text not null, account_id text not null,
  object_type text not null check(object_type in ('customer','checkout','invoice','charge','subscription','refund','dispute')),
  external_id text not null, observed_state text not null, amount_minor bigint, currency text,
  hosted_url text, period_start timestamptz,period_end timestamptz,observed_at timestamptz not null,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),unique(provider,environment,account_id,object_type,external_id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.billing_schedules (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,agreement_id uuid not null,
  component text not null, provider_subscription_id text,amount_minor bigint not null check(amount_minor>=0),currency text not null,
  interval text not null check(interval in ('once','month','year')),effective_from timestamptz not null,effective_until timestamptz,
  next_invoice_at timestamptz,cancellation_policy jsonb not null,state text not null default 'planned',
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,agreement_id) references wm.agreements(organization_id,id)
);
create unique index one_billing_component on wm.billing_schedules(organization_id,engagement_id,component) where effective_until is null;
create table wm.financial_adjustments (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,payment_reference_id uuid not null,
  operation_id uuid not null,amount_minor bigint not null check(amount_minor>0),currency text not null,
  reason text not null,authorized_by uuid not null,provider_id text,state text not null default 'pending',
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,payment_reference_id) references wm.payment_references(organization_id,id),
  foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create table wm.business_facts (
  organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),
  key text not null,value jsonb not null,source text not null,confirmed_by uuid not null,confirmed_at timestamptz not null default now(),valid_until timestamptz,
  supersedes_id uuid,created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,supersedes_id) references wm.business_facts(organization_id,id)
);
create table wm.asset_rights (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),attachment_id uuid not null,
  license text not null,source text not null,confirmed_by uuid not null,confirmed_at timestamptz not null default now(),valid_until timestamptz,
  primary key(organization_id,id),foreign key(organization_id,attachment_id) references wm.attachments(organization_id,id)
);
create table wm.access_requirements (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  provider text not null,account_reference text,capability text not null,person_to_act uuid,
  status text not null default 'needed' check(status in ('needed','no_account','wrong_account','provider_owned','lost_access','verified','help_requested')),
  evidence text,last_checked_at timestamptz,next_action text not null,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.entitlements (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,agreement_id uuid not null,
  kind text not null,period_key text not null,quantity integer not null check(quantity>=0),unit text not null,
  reserved integer not null default 0 check(reserved>=0),consumed integer not null default 0 check(consumed>=0),rollover_policy text not null,
  starts_at timestamptz not null,ends_at timestamptz not null,version bigint not null default 1,
  primary key(organization_id,id),unique(organization_id,engagement_id,kind,period_key),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,agreement_id) references wm.agreements(organization_id,id),
  check(reserved+consumed<=quantity),check(ends_at>starts_at)
);
create table wm.allowance_entries (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),entitlement_id uuid not null,request_id uuid not null,
  quantity integer not null check(quantity>=0),kind text not null check(kind in ('reserve','settle','release','defect_correction')),
  reason text not null,created_by uuid not null,created_at timestamptz not null default now(),
  primary key(organization_id,id),foreign key(organization_id,entitlement_id) references wm.entitlements(organization_id,id),
  foreign key(organization_id,request_id) references wm.requests(organization_id,id),check(kind<>'defect_correction' or quantity=0)
);
create table wm.commitments (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,request_id uuid,
  deliverable text not null,owner_user_id uuid not null,due_at timestamptz not null,
  status text not null default 'open' check(status in ('open','waiting','delivered','cancelled')),waiting_reason text,next_update_at timestamptz not null,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id)
);
create table wm.dependencies (
  organization_id uuid not null,request_id uuid not null,blocking_request_id uuid not null,reason text not null,owner_user_id uuid not null,
  primary key(organization_id,request_id,blocking_request_id),check(request_id<>blocking_request_id),
  foreign key(organization_id,request_id) references wm.requests(organization_id,id),foreign key(organization_id,blocking_request_id) references wm.requests(organization_id,id)
);
create table wm.website_releases (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),request_id uuid not null,revision_id uuid not null,operation_id uuid not null,
  target text not null,repository text not null,commit_sha text not null,artifact_digest text not null,
  deploy_id text,previous_release_id uuid,verification jsonb,status text not null default 'prepared',
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,request_id,revision_id) references wm.revisions(organization_id,request_id,id),
  foreign key(organization_id,operation_id) references wm.operations(organization_id,id),foreign key(organization_id,previous_release_id) references wm.website_releases(organization_id,id)
);
create table wm.seo_items (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,request_id uuid,
  period_key text not null,target_url text not null,topic text not null,source_findings jsonb not null,
  deliverable text not null,content_revision_id uuid,publication_state text not null default 'draft',publication_evidence text,
  indexing_state text not null default 'unknown',indexing_observed_at timestamptz,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),
  foreign key(organization_id,request_id,content_revision_id) references wm.revisions(organization_id,request_id,id)
);
create table wm.care_checks (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  period_key text not null,check_type text not null,scheduled_at timestamptz not null,
  observed_at timestamptz,observations jsonb,status text not null default 'scheduled',owner_user_id uuid not null,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.measurement_definitions (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  outcome text not null,primary_source text not null,external_action_id text,bidding_role text not null,
  qualification_rule text not null,dedupe_rule text not null,consent_version text not null,status text not null default 'untested',
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.measurement_checks (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),definition_id uuid not null,
  scenario text not null,outcome text not null check(outcome in ('passed','failed','unknown')),evidence_ref text not null,
  tested_at timestamptz not null,tester uuid not null,expires_at timestamptz,
  primary key(organization_id,id),foreign key(organization_id,definition_id) references wm.measurement_definitions(organization_id,id)
);
create table wm.import_runs (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  source text not null,source_hash text not null,account_id text not null,currency text not null,timezone text not null,
  period_start timestamptz not null,period_end timestamptz not null,schema_version integer not null,
  total_count integer not null,accepted_count integer not null,rejected_count integer not null,
  status text not null default 'staged' check(status in ('staged','rejected','partial','promoted','superseded')),
  row_errors jsonb not null default '[]',created_by uuid not null,created_at timestamptz not null default now(),
  primary key(organization_id,id),unique(organization_id,engagement_id,source,source_hash),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  check(period_end>period_start),check(accepted_count+rejected_count=total_count)
);
create table wm.metric_snapshots (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,import_run_id uuid not null,
  definition_version text not null,metric text not null,value numeric,unit text not null,source text not null,
  observed_at timestamptz not null,provisional boolean not null,supersedes_id uuid,created_at timestamptz not null default now(),
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,import_run_id) references wm.import_runs(organization_id,id),foreign key(organization_id,supersedes_id) references wm.metric_snapshots(organization_id,id)
);
create table wm.lead_outcomes (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  source_key text not null,source text not null,occurred_at timestamptz not null,
  outcome text not null default 'unknown' check(outcome in ('unknown','suitable','not_suitable','won','lost','existing_system')),
  value_minor bigint,currency text,consent_ref text,last_confirmed_at timestamptz,confirmed_by uuid,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),unique(organization_id,engagement_id,source,source_key),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.reports (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,request_id uuid not null,
  period_key text not null,source_snapshot_ids uuid[] not null,narrative_revision_id uuid,
  status text not null default 'draft' check(status in ('draft','reviewed','published','superseded')),
  published_at timestamptz,supersedes_id uuid,created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),
  foreign key(organization_id,request_id,narrative_revision_id) references wm.revisions(organization_id,request_id,id),foreign key(organization_id,supersedes_id) references wm.reports(organization_id,id)
);
create table wm.notification_preferences (
  organization_id uuid not null,user_id uuid not null,digest text not null default 'daily' check(digest in ('daily','weekly','none')),
  email_enabled boolean not null default true,version bigint not null default 1,
  primary key(organization_id,user_id),foreign key(organization_id,user_id) references wm.memberships(organization_id,user_id)
);
create table wm.absence_windows (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),user_id uuid not null,
  starts_at timestamptz not null,ends_at timestamptz not null,next_contact_at timestamptz not null,message text,
  created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),check(ends_at>starts_at),foreign key(organization_id,user_id) references wm.memberships(organization_id,user_id)
);
create table wm.time_entries (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,request_id uuid,
  operator_user_id uuid not null,category text not null,minutes integer not null check(minutes between 1 and 1440),occurred_at timestamptz not null,
  supersedes_id uuid,created_at timestamptz not null default now(),
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
  foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id),foreign key(organization_id,supersedes_id) references wm.time_entries(organization_id,id)
);
create table wm.capacity_periods (
  operator_user_id uuid not null,period_key text not null,available_minutes integer not null check(available_minutes>=0),
  other_minutes integer not null default 0 check(other_minutes>=0),contingency_minutes integer not null default 0 check(contingency_minutes>=0),
  created_at timestamptz not null default now(),version bigint not null default 1,primary key(operator_user_id,period_key)
);
create table wm.incidents (
  organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),
  capability text not null,severity text not null check(severity in ('urgent','high','normal')),summary text not null,
  owner_user_id uuid not null,status text not null default 'open',last_verified_state text,next_update_at timestamptz not null,
  created_at timestamptz not null default now(),version bigint not null default 1,primary key(organization_id,id)
);
create table wm.recovery_scopes (
  organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),incident_id uuid not null,
  affected_capabilities text[] not null,external_generation text not null,recovery_generation bigint not null,
  status text not null default 'isolated',evidence jsonb not null default '{}',owner_user_id uuid not null,
  created_at timestamptz not null default now(),version bigint not null default 1,primary key(organization_id,id),
  foreign key(organization_id,incident_id) references wm.incidents(organization_id,id)
);
create table wm.export_jobs (
  organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),engagement_id uuid,
  requested_by uuid not null,audience text not null check(audience in ('customer','operator')),cutoff timestamptz not null,
  state text not null default 'pending',manifest jsonb,object_key text,expires_at timestamptz,
  created_at timestamptz not null default now(),version bigint not null default 1,primary key(organization_id,id),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.retention_actions (
  organization_id uuid not null references wm.organizations(id),id uuid not null default gen_random_uuid(),
  target_type text not null,target_id uuid not null,policy_version text not null,expires_at timestamptz not null,
  legal_hold boolean not null default false,state text not null default 'scheduled',tombstone jsonb,
  created_at timestamptz not null default now(),version bigint not null default 1,primary key(organization_id,id)
);
create table wm.ai_runs (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,request_id uuid,
  task_type text not null check(task_type in ('request_brief','scope_comparison','missing_inputs','feedback_grouping','cover_handoff','completion_explanation','weekly_improvement')),
  input_refs jsonb not null,input_digest text not null,model_config jsonb not null,prompt_version text not null,
  output jsonb,status text not null default 'pending' check(status in ('pending','prepared','accepted','rejected','stale','failed')),
  reviewed_by uuid,reviewed_at timestamptz,usage jsonb,created_by uuid not null,created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),unique(organization_id,task_type,input_digest,prompt_version),
  foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id)
);
create table wm.closures (
  organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,
  timing text not null check(timing in ('immediate','period_end')),exit_mode text not null check(exit_mode in ('stop','transfer')),
  reason text not null,effective_at timestamptz not null,requested_by uuid not null,
  service_state text not null default 'requested',campaign_state text not null default 'unconfirmed',billing_state text not null default 'unconfirmed',
  export_state text not null default 'pending',access_state text not null default 'pending',refund_state text not null default 'review',
  evidence jsonb not null default '{}',created_at timestamptz not null default now(),version bigint not null default 1,
  primary key(organization_id,id),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.backup_manifests (
  id uuid primary key default gen_random_uuid(),backup_class text not null,object_manifest_ref text not null,
  counts jsonb not null,checksums jsonb not null,cutoff timestamptz not null,schema_version text not null,key_version text not null,
  created_at timestamptz not null default now(),restored_test_at timestamptz,expiry_at timestamptz not null
);
create index commitments_due on wm.commitments(organization_id,status,due_at);
create index outcomes_period on wm.lead_outcomes(organization_id,engagement_id,occurred_at);
create index incidents_open on wm.incidents(organization_id,status,next_update_at);
create index retention_due on wm.retention_actions(state,expires_at) where not legal_hold;
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='wm' loop
    execute format('alter table wm.%I enable row level security',t.tablename);
    execute format('revoke all on wm.%I from public,anon,authenticated',t.tablename);
  end loop;
end $$;
do $$ declare n text; begin
  foreach n in array array['catalog_snapshots','allowance_entries','time_entries','measurement_checks','metric_snapshots'] loop
    execute format('create trigger immutable_history before update or delete on wm.%I for each row execute function wm.reject_history_edit()',n);
  end loop;
end $$;
commit;
