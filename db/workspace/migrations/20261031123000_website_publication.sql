begin;
create table wm.website_targets(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),engagement_id uuid not null,account_id text not null check(account_id ~ '^[a-f0-9]{32}$'),
 worker_name text not null check(worker_name ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),environment text not null check(environment in ('staging','production')),
 origin text not null check(origin ~ '^https://[a-zA-Z0-9.-]+$'),dependency_revision text not null,enabled boolean not null default true,created_by uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(account_id,worker_name),foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id)
);
create table wm.website_artifacts(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),target_id uuid not null,version_id uuid not null,
 artifact_digest text not null check(artifact_digest ~ '^[a-f0-9]{64}$'),config_digest text not null check(config_digest ~ '^[a-f0-9]{64}$'),
 manifest jsonb not null,repository text not null,commit_sha text not null check(commit_sha ~ '^[a-f0-9]{40,64}$'),ci_reference text not null,upload_receipt jsonb not null,
 dependency_revision text not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,target_id,version_id),foreign key(organization_id,target_id) references wm.website_targets(organization_id,id)
);
alter table wm.website_targets enable row level security;alter table wm.website_artifacts enable row level security;
revoke all on wm.website_targets,wm.website_artifacts from public,anon,authenticated,service_role;
create trigger immutable_website_artifact before update or delete on wm.website_artifacts for each row execute function wm.delivery_immutable();
create function public.wm_website_artifact_register(p_org uuid,p_input jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare t wm.website_targets; a wm.website_artifacts; item jsonb; names text[]:=array[]::text[];
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 perform wm.check_input(p_input,array['target_id','version_id','artifact_digest','config_digest','manifest','manifest_json','repository','commit_sha','ci_reference','upload_receipt','dependency_revision'],array['target_id','version_id','artifact_digest','config_digest','manifest','manifest_json','repository','commit_sha','ci_reference','upload_receipt','dependency_revision']);
 select * into t from wm.website_targets where organization_id=p_org and id=(p_input->>'target_id')::uuid and enabled for update;
 if not found or t.dependency_revision is distinct from p_input->>'dependency_revision' then raise exception 'Website target or dependencies changed' using errcode='40001';end if;
 if (p_input->>'manifest_json')::jsonb is distinct from p_input->'manifest' or encode(sha256(convert_to(p_input->>'manifest_json','UTF8')),'hex') is distinct from p_input->>'artifact_digest' or p_input->'manifest'->>'config_digest' is distinct from p_input->>'config_digest' then raise exception 'Artifact digest must cover the final uploaded parts and configuration' using errcode='22023';end if;
 if jsonb_typeof(p_input->'manifest'->'modules')<>'array' or jsonb_array_length(p_input->'manifest'->'modules') not between 1 and 1000 then raise exception 'Final artifact module inventory required' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_input->'manifest'->'modules') loop
  if item->>'name' is null or item->>'name'=any(names) or item->>'sha256' !~ '^[a-f0-9]{64}$' or (item->>'bytes')::bigint<0 then raise exception 'Check final artifact parts' using errcode='22023';end if;names:=array_append(names,item->>'name');
 end loop;
 if p_input->'upload_receipt'->>'version_id' is distinct from p_input->>'version_id' or p_input->'upload_receipt'->>'artifact_digest' is distinct from p_input->>'artifact_digest' or p_input->'upload_receipt'->>'account_id' is distinct from t.account_id or p_input->'upload_receipt'->>'worker_name' is distinct from t.worker_name then raise exception 'Trusted upload receipt does not match this target and artifact' using errcode='22023';end if;
 if p_input->'upload_receipt'->>'state' is distinct from 'uploaded' or p_input->'upload_receipt'->'build_identity' is distinct from jsonb_build_object('organization_id',p_org,'target_id',t.id,'account_id',t.account_id,'worker_name',t.worker_name,'dependency_revision',t.dependency_revision,'repository',p_input->>'repository','commit_sha',p_input->>'commit_sha','ci_reference',p_input->>'ci_reference') then raise exception 'Trusted upload provenance changed' using errcode='22023';end if;
 select * into a from wm.website_artifacts where organization_id=p_org and target_id=t.id and version_id=(p_input->>'version_id')::uuid;
 if found then if a.artifact_digest<>p_input->>'artifact_digest' or a.upload_receipt<>p_input->'upload_receipt' then raise exception 'Conflicting upload receipt' using errcode='40001';end if;return jsonb_build_object('id',a.id);end if;
 insert into wm.website_artifacts(organization_id,target_id,version_id,artifact_digest,config_digest,manifest,repository,commit_sha,ci_reference,upload_receipt,dependency_revision)
 values(p_org,t.id,(p_input->>'version_id')::uuid,p_input->>'artifact_digest',p_input->>'config_digest',p_input->'manifest',wm.require_text(p_input->>'repository','repository',500),p_input->>'commit_sha',wm.require_text(p_input->>'ci_reference','immutable build reference',1000),p_input->'upload_receipt',t.dependency_revision) returning * into a;
 perform wm.critical(p_org,'website.artifact_uploaded',a.id,jsonb_build_object('artifact',a.id,'digest',a.artifact_digest,'version',a.version_id,'target',t.id));return jsonb_build_object('id',a.id);
end $$;
create function public.wm_website_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;t wm.website_targets;a wm.website_artifacts;r wm.requests;rid uuid;
begin
 perform wm.require_access(p_org,'delivery');result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='website.target' then
  perform wm.check_input(p_input,array['engagement_id','account_id','worker_name','environment','origin','dependency_revision'],array['engagement_id','account_id','worker_name','environment','origin','dependency_revision']);
  if not exists(select 1 from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid and service_state not in ('ending','closed')) then raise exception 'Current service required' using errcode='42501';end if;
  insert into wm.website_targets(organization_id,engagement_id,account_id,worker_name,environment,origin,dependency_revision,created_by) values(p_org,(p_input->>'engagement_id')::uuid,p_input->>'account_id',p_input->>'worker_name',p_input->>'environment',p_input->>'origin',wm.require_text(p_input->>'dependency_revision','dependency contract'),auth.uid()) returning id into rid;
  result:=jsonb_build_object('id',rid);
 elsif p_command='website.preview' then
  perform wm.check_input(p_input,array['request_id','expected_version','artifact_id','baseline_deployment_id','summary','cost_effect','date_effect'],array['request_id','expected_version','artifact_id','baseline_deployment_id','summary','cost_effect','date_effect']);
  select * into a from wm.website_artifacts where organization_id=p_org and id=(p_input->>'artifact_id')::uuid;
  select * into t from wm.website_targets where organization_id=p_org and id=a.target_id and enabled;
  select * into r from wm.requests where organization_id=p_org and id=(p_input->>'request_id')::uuid and engagement_id=t.engagement_id;
  if a.id is null or t.id is null or r.id is null or t.dependency_revision<>a.dependency_revision then raise exception 'Choose a current uploaded artifact for this service' using errcode='42501';end if;
  result:=public.wm_revision_create(p_org,jsonb_build_object('request_id',r.id,'expected_version',p_input->'expected_version','kind','web_preview','summary',p_input->>'summary','cost_effect',p_input->>'cost_effect','date_effect',p_input->>'date_effect',
   'manifest',jsonb_build_object('artifact_id',a.id,'target_id',t.id,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'commit',a.commit_sha,'repository',a.repository,'build',a.ci_reference,'target',t.origin,'baseline_deployment_id',(p_input->>'baseline_deployment_id')::uuid,'dependency_revision',t.dependency_revision)),p_key||'_revision');rid:=(result->>'id')::uuid;
 else raise exception 'Unknown website command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,result,rid);
end $$;
create function wm.website_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.website_artifacts;t wm.website_targets;v wm.revisions;g wm.tenant_guards;
begin
 select * into v from wm.revisions where organization_id=org and id=op.revision_id;
 select * into a from wm.website_artifacts where organization_id=org and id=(v.manifest->>'artifact_id')::uuid;
 select * into t from wm.website_targets where organization_id=org and id=a.target_id and engagement_id=op.engagement_id and enabled for update;
 select * into g from wm.tenant_guards where organization_id=org;
 if t.id is null or a.id is null or v.manifest->>'artifact_digest' is distinct from a.artifact_digest or v.manifest->>'version_id' is distinct from a.version_id::text or v.manifest->>'dependency_revision' is distinct from t.dependency_revision or a.dependency_revision<>t.dependency_revision or not wm.delivery_approved(org,op.request_id,v.id) then raise exception 'Current exact website approval and dependencies required' using errcode='42501';end if;
 if v.manifest<>jsonb_build_object('artifact_id',a.id,'target_id',t.id,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'commit',a.commit_sha,'repository',a.repository,'build',a.ci_reference,'target',t.origin,'baseline_deployment_id',(v.manifest->>'baseline_deployment_id')::uuid,'dependency_revision',t.dependency_revision) then raise exception 'Approved website target and artifact bindings changed' using errcode='42501';end if;
 if not exists(select 1 from wm.operator_assignments oa where oa.organization_id=org and oa.user_id=op.actor_id and oa.revoked_at is null and oa.active_until>clock_timestamp() and oa.capabilities&&array['delivery','admin']) then raise exception 'Website operator is no longer authorized' using errcode='42501';end if;
 if not exists(select 1 from wm.critical_receipts where organization_id=org and target_id=a.id and event_type='website.artifact_uploaded' and durability_status='durable') then raise exception 'Independent upload evidence is pending' using errcode='42501';end if;
 if exists(select 1 from wm.operations o join wm.revisions other on other.organization_id=o.organization_id and other.id=o.revision_id where o.organization_id=org and o.id<>op.id and o.kind='website_publish' and o.state in ('in_flight','unknown') and other.manifest->>'target_id'=t.id::text) then raise exception 'Reconcile earlier publication before another write' using errcode='42501';end if;
 return jsonb_build_object('target_id',t.id,'artifact_id',a.id,'account_id',t.account_id,'worker_name',t.worker_name,'environment',t.environment,'origin',t.origin,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'release_marker',a.manifest->>'release_marker','baseline_deployment_id',(v.manifest->>'baseline_deployment_id')::uuid);
end $$;
create function public.wm_website_preview_context(p_org uuid,p_artifact uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.website_artifacts;t wm.website_targets;
begin
 perform wm.require_access(p_org,'delivery');select * into a from wm.website_artifacts where organization_id=p_org and id=p_artifact;
 select * into t from wm.website_targets where organization_id=p_org and id=a.target_id and enabled;
 if t.id is null or t.dependency_revision<>a.dependency_revision then raise exception 'Current website artifact required' using errcode='42501';end if;
 return jsonb_build_object('target_id',t.id,'artifact_id',a.id,'account_id',t.account_id,'worker_name',t.worker_name,'environment',t.environment,'origin',t.origin,'version_id',a.version_id,'artifact_digest',a.artifact_digest,'config_digest',a.config_digest,'release_marker',a.manifest->>'release_marker','baseline_deployment_id',a.version_id);
end $$;
alter function public.wm_attempt_begin(uuid,uuid,bigint,text) rename to wm_attempt_begin_before_website;
revoke all on function public.wm_attempt_begin_before_website(uuid,uuid,bigint,text) from public,anon,authenticated,service_role;
create function public.wm_attempt_begin(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o wm.operations;c jsonb;r jsonb;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select op.* into o from wm.operations op join wm.outbox_jobs j on j.organization_id=op.organization_id and j.operation_id=op.id where j.organization_id=p_org and j.id=p_job;
 if o.positive_effect and o.revision_id is not null and not wm.revision_sources_current(p_org,o.revision_id) then raise exception 'Source facts changed or expired; prepare a current revision' using errcode='40001';end if;
 if o.kind='website_publish' then c:=wm.website_context(p_org,o);end if;
 r:=public.wm_attempt_begin_before_website(p_org,p_job,p_lease_generation,p_external_generation);
 if c is not null then update wm.operation_attempts set dispatch_context=c where organization_id=p_org and id=(r->'attempt'->>'id')::uuid;r:=r||jsonb_build_object('context',c);end if;return r;
end $$;
create function public.wm_website_effect_context(p_org uuid,p_attempt uuid,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o wm.operations;a wm.operation_attempts;g wm.tenant_guards;
begin
 perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce and state='dispatch_reserved';
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id and kind='website_publish';
 if o.id is null or g.access_state<>'open' or not g.positive_effects_allowed or o.authority_version<>g.authority_version or a.external_generation<>g.external_generation or a.recovery_generation<>g.recovery_generation then raise exception 'Publication authority changed' using errcode='42501';end if;
 return wm.website_context(p_org,o);
end $$;
alter function public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) rename to wm_attempt_resolve_before_website;
revoke all on function public.wm_attempt_resolve_before_website(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wm_attempt_resolve(p_org uuid,p_attempt uuid,p_nonce uuid,p_proof jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o wm.operations;a wm.operation_attempts;r jsonb;c jsonb;
begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id;
 if o.kind='website_publish' then
  c:=a.dispatch_context;
  if p_proof->>'artifact_id' is distinct from c->>'artifact_id' or p_proof->>'artifact_digest' is distinct from c->>'artifact_digest' or p_proof->>'version_id' is distinct from c->>'version_id' or p_proof->>'target_id' is distinct from c->>'target_id' or p_proof->>'deployment_id' is distinct from p_proof->>'provider_reference' or p_proof->'runtime'->>'version_id' is distinct from c->>'version_id' or p_proof->'runtime'->>'release_marker' is distinct from c->>'release_marker' then raise exception 'Website readback does not match frozen dispatch' using errcode='22023';end if;
 end if;
 r:=public.wm_attempt_resolve_before_website(p_org,p_attempt,p_nonce,p_proof);return r;
end $$;
alter function public.wm_workspace(uuid) rename to wm_workspace_before_website;
revoke all on function public.wm_workspace_before_website(uuid) from public,anon,authenticated,service_role;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r jsonb;
begin r:=public.wm_workspace_before_website(p_org);return r||jsonb_build_object('website_targets',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from wm.website_targets t where organization_id=p_org),
 'website_artifacts',case when wm.operator_has(p_org,'delivery') then (select coalesce(jsonb_agg(to_jsonb(a)-'upload_receipt'),'[]') from wm.website_artifacts a where organization_id=p_org) else '[]'::jsonb end);end $$;
revoke all on function wm.website_context(uuid,wm.operations) from public,anon,authenticated,service_role;
revoke all on function public.wm_website_command(uuid,text,jsonb,text),public.wm_website_preview_context(uuid,uuid),public.wm_workspace(uuid) from public,anon,service_role;
grant execute on function public.wm_website_command(uuid,text,jsonb,text),public.wm_website_preview_context(uuid,uuid),public.wm_workspace(uuid) to authenticated;
revoke all on function public.wm_website_artifact_register(uuid,jsonb),public.wm_website_effect_context(uuid,uuid,uuid),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wm_website_artifact_register(uuid,jsonb),public.wm_website_effect_context(uuid,uuid,uuid),public.wm_attempt_begin(uuid,uuid,bigint,text),public.wm_attempt_resolve(uuid,uuid,uuid,jsonb) to service_role;
commit;
