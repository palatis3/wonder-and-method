begin;
-- Named customer exports are deliberately separate from legacy export_jobs and DR.
create table wm.customer_exports(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),ordinal bigint generated always as identity,engagement_id uuid not null,requested_by uuid not null,
 membership_version bigint not null,membership_role text not null,recovery_generation bigint not null,external_generation text not null,
 organization_status text not null,engagement_state text not null,closure_digest text not null,
 snapshot jsonb not null,snapshot_digest text not null,captured_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',
 state text not null check(state in ('captured','building','reserved','sealed','attention','cancelled')),
 reason text,version bigint not null default 1,lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz not null default now(),attempts integer not null default 0,
 storage_target text,object_key text,archive_digest text,archive_bytes bigint,manifest_digest text,write_started_at timestamptz,sealed_at timestamptz,
 primary key(organization_id,id),unique(id),unique(storage_target,object_key),
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 foreign key(organization_id,requested_by) references wm.memberships(organization_id,user_id),
 check(archive_digest is null or archive_digest ~ '^[a-f0-9]{64}$'),check(archive_bytes is null or archive_bytes between 1 and 33554432),
 check(state<>'sealed' or (sealed_at is not null and object_key is not null and archive_digest is not null))
);
create index customer_export_queue on wm.customer_exports(next_attempt_at,captured_at) where state in ('captured','building','reserved');
create index customer_export_requester on wm.customer_exports(organization_id,requested_by,captured_at desc);
create table wm.customer_export_receipts(
 organization_id uuid not null,export_id uuid not null,kind text not null,payload jsonb not null,created_at timestamptz not null default now(),
 primary key(organization_id,export_id,kind),foreign key(organization_id,export_id) references wm.customer_exports(organization_id,id)
);
alter table wm.customer_exports enable row level security;
alter table wm.customer_export_receipts enable row level security;
revoke all on wm.customer_exports,wm.customer_export_receipts from public,anon,authenticated,service_role;
create trigger customer_export_receipt_immutable before update or delete on wm.customer_export_receipts for each row execute function wm.reject_history_edit();
create function wm.customer_export_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new)-array['state','reason','version','lease_token','lease_until','next_attempt_at','attempts','storage_target','object_key','archive_digest','archive_bytes','manifest_digest','write_started_at','sealed_at']) is distinct from
    (to_jsonb(old)-array['state','reason','version','lease_token','lease_until','next_attempt_at','attempts','storage_target','object_key','archive_digest','archive_bytes','manifest_digest','write_started_at','sealed_at'])
 or (old.object_key is not null and (new.storage_target,new.object_key,new.archive_digest,new.archive_bytes,new.manifest_digest) is distinct from (old.storage_target,old.object_key,old.archive_digest,old.archive_bytes,old.manifest_digest))
 or (old.write_started_at is not null and new.write_started_at is distinct from old.write_started_at)
 or (old.sealed_at is not null and new.sealed_at is distinct from old.sealed_at) then raise exception 'Export snapshot and reserved bytes are immutable';end if;return new;
end $$;
create trigger customer_export_immutable before update on wm.customer_exports for each row execute function wm.customer_export_immutable();
do $$begin
 if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit) values('workspace-customer-exports','workspace-customer-exports',false,33554432) on conflict(id) do nothing;
 if exists(select 1 from storage.buckets where id='workspace-customer-exports' and public) then raise exception 'Customer export bucket must be private';end if;end if;
end $$;
-- JSON numbers are decimal strings, including nested report decimals. No JS float loss.
create function wm.customer_export_numbers(j jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare r jsonb;begin
 case jsonb_typeof(j)
 when 'number' then return to_jsonb(j#>>'{}');
 when 'object' then select coalesce(jsonb_object_agg(key,wm.customer_export_numbers(value)),'{}') into r from jsonb_each(j);return r;
 when 'array' then select coalesce(jsonb_agg(wm.customer_export_numbers(value) order by n),'[]') into r from jsonb_array_elements(j) with ordinality a(value,n);return r;
 else return j;end case;
end $$;
create function wm.customer_export_pick(j jsonb,keys text[]) returns jsonb language sql immutable set search_path='' as $$
 select wm.customer_export_numbers(coalesce(jsonb_object_agg(key,value),'{}')) from jsonb_each(j) where key=any(keys)
$$;
create function wm.customer_export_closure(org uuid,eng uuid) returns text language sql stable security definer set search_path='' as $$
 select wm.hash_json(coalesce(jsonb_agg(jsonb_build_array(id,version,access_state,export_state,service_state,campaign_state,billing_state,refund_state,effective_at) order by id),'[]')) from wm.closures where organization_id=org and engagement_id=eng
$$;
-- Customer-only audience predicate: operator grants never widen an archive.
create function wm.customer_export_file(f wm.attachments,who uuid) returns boolean language sql stable set search_path='' as $$
 select f.deleted_at is null and (f.visibility='shared' or (f.visibility='draft' and f.uploader_id=who))
 and (f.message_id is null or exists(select 1 from wm.messages m where m.organization_id=f.organization_id and m.engagement_id=f.engagement_id and m.id=f.message_id and m.visibility='shared'))
$$;
-- Match the customer commercial audience; staff assignments never widen it.
create function wm.customer_export_agreement(org uuid,agreement uuid,who uuid,finance boolean) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from wm.agreements a where a.organization_id=org and a.id=agreement and a.sent_at is not null
  and (finance or exists(select 1 from wm.engagement_authorities z where z.organization_id=org and z.engagement_id=a.engagement_id and z.user_id=who and z.domain='contract' and z.revoked_at is null and z.starts_at<=clock_timestamp() and z.ends_at>clock_timestamp())))
$$;
create function wm.customer_export_snapshot(org uuid,eng uuid,who uuid,finance boolean) returns jsonb language sql stable security definer set search_path='' as $$
with records as materialized (
 select * from (
select 'engagement'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','title','service_type','catalog_id','catalog_version','service_state','commercial_state','starts_at','ends_at','currency','version']) as data from wm.engagements x where x.organization_id=org and x.id=eng
 union all
select 'requests'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','engagement_id','outcome','state','accepted_scope','coverage','due_at','next_contact_at','waiting_reason','current_revision_id','created_at','updated_at','version']) as data from wm.requests x where x.organization_id=org and x.engagement_id=eng and (not exists(select 1 from wm.agreements a where a.organization_id=org and a.request_id=x.id) or exists(select 1 from wm.agreements a where a.organization_id=org and a.request_id=x.id and wm.customer_export_agreement(org,a.id,who,finance)))
 union all
select 'messages'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','engagement_id','request_id','direction','body','created_at','version']) as data from wm.messages x where x.organization_id=org and x.engagement_id=eng and x.visibility='shared'
 union all
select 'revisions'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','request_id','sequence','kind','digest','summary','cost_effect','date_effect','supersedes_id','created_at'])||jsonb_build_object('customer_content',wm.customer_export_pick(x.manifest,array['title','body','content','narrative','summary','scope','terms','components','milestones','entitlements'])) as data from wm.revisions x where x.organization_id=org and exists(select 1 from wm.requests q where q.organization_id=org and q.id=x.request_id and q.engagement_id=eng) and (x.kind<>'report' or exists(select 1 from wm.reports p where p.organization_id=org and p.narrative_revision_id=x.id and p.status in ('published','superseded'))) and (x.kind<>'agreement' or exists(select 1 from wm.agreements a where a.organization_id=org and a.revision_id=x.id and wm.customer_export_agreement(org,a.id,who,finance)))
 union all
select 'decisions'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','request_id','revision_id','digest','decision','shown_scope','feedback','supersedes_decision_id','created_at']) as data from wm.decisions x where x.organization_id=org and exists(select 1 from wm.requests q where q.organization_id=org and q.id=x.request_id and q.engagement_id=eng) and exists(select 1 from wm.revisions v where v.organization_id=org and v.id=x.revision_id and (v.kind<>'agreement' or exists(select 1 from wm.agreements a where a.organization_id=org and a.revision_id=v.id and wm.customer_export_agreement(org,a.id,who,finance))))
 union all
select 'agreements'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','engagement_id','request_id','revision_id','status','starts_at','ends_at','supersedes_id','accepted_decision_id','version']) as data from wm.agreements x where x.organization_id=org and x.engagement_id=eng and wm.customer_export_agreement(org,x.id,who,finance)
 union all
select 'milestones'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','agreement_id','deliverable','acceptance_rule','due_at','amount_minor','earned_minor','currency','status','version']) as data from wm.milestones x where x.organization_id=org and x.engagement_id=eng and finance
 union all
select 'invoices'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','schedule_id','period_start','period_end','gross_minor','offset_minor','amount_minor','amount_paid_minor','currency','description','state','provider_state','invoice_id','observed_at','version']) as data from wm.billing_obligations x where x.organization_id=org and x.engagement_id=eng and finance
 union all
select 'billing'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','agreement_id','component','amount_minor','currency','interval','effective_from','effective_until','next_invoice_at','state','billing_timezone','version']) as data from wm.billing_schedules x where x.organization_id=org and x.engagement_id=eng and finance
 union all
select 'payments'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','object_type','external_id','observed_state','amount_minor','currency','period_start','period_end','observed_at','version']) as data from wm.payment_references x where x.organization_id=org and x.engagement_id=eng and finance and x.object_type not in ('customer','checkout')
 union all
select 'adjustments'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','payment_reference_id','amount_minor','currency','reason','state','created_at','version']) as data from wm.financial_adjustments x where x.organization_id=org and x.engagement_id=eng and finance
 union all
select 'commitments'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','engagement_id','request_id','deliverable','due_at','status','waiting_reason','next_update_at','version']) as data from wm.commitments x where x.organization_id=org and x.engagement_id=eng
 union all
select 'entitlements'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','agreement_id','kind','period_key','quantity','unit','reserved','consumed','rollover_policy','starts_at','ends_at','version']) as data from wm.entitlements x where x.organization_id=org and x.engagement_id=eng
 union all
select 'seo'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','request_id','period_key','target_url','topic','deliverable','content_revision_id','publication_state','indexing_state','indexing_observed_at','version']) as data from wm.seo_items x where x.organization_id=org and x.engagement_id=eng
 union all
select 'care'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','period_key','check_type','scheduled_at','observed_at','status','version']) as data from wm.care_checks x where x.organization_id=org and x.engagement_id=eng
 union all
select 'leads'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','source','occurred_at','outcome','value_minor','currency','last_confirmed_at','version']) as data from wm.lead_outcomes x where x.organization_id=org and x.engagement_id=eng
 union all
select 'outcome_events'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','lead_id','event_at','outcome','value_minor','currency','definition_version','time_basis','recorded_at','supersedes_id']) as data from wm.outcome_events x where x.organization_id=org and exists(select 1 from wm.lead_outcomes l where l.organization_id=org and l.id=x.lead_id and l.engagement_id=eng)
 union all
select 'reports'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','request_id','period_key','source_snapshot_ids','narrative_revision_id','status','published_at','supersedes_id','limitations','version']) as data from wm.reports x where x.organization_id=org and x.engagement_id=eng and x.status in ('published','superseded')
 union all
select 'metrics'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','definition_version','metric','value','unit','source','observed_at','provisional','supersedes_id','import_run_id']) as data from wm.metric_snapshots x where x.organization_id=org and x.engagement_id=eng and exists(select 1 from wm.reports p where p.organization_id=org and p.engagement_id=eng and p.status in ('published','superseded') and x.id=any(p.source_snapshot_ids))
 union all
select 'analytics'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','kind','profile','day','status','result','result_digest','finished_at','version']) as data from wm.analytics_imports x where x.organization_id=org and exists(select 1 from wm.analytics_bindings b where b.organization_id=org and b.id=x.binding_id and b.engagement_id=eng) and x.status in ('published','superseded')
 union all
select 'closures'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','timing','exit_mode','reason','effective_at','service_state','campaign_state','billing_state','export_state','access_state','refund_state','version']) as data from wm.closures x where x.organization_id=org and x.engagement_id=eng
 union all
select 'stops'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','provider_scope_id','stop_epoch','reason','state','verified_at','created_at','version']) as data from wm.stop_intents x where x.organization_id=org and x.engagement_id=eng
 union all
select 'accounts'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','provider','environment','account_id','currency','timezone','access_status','observed_state','observed_at','last_checked_at']) as data from wm.provider_scopes x where x.organization_id=org and x.engagement_id=eng
 union all
select 'access'::text as section,wm.customer_export_pick(to_jsonb(x),array['id','provider','account_reference','capability','status','last_checked_at','next_action','version']) as data from wm.access_requirements x where x.organization_id=org and x.engagement_id=eng
 union all
 select 'catalog'::text,wm.customer_export_pick(to_jsonb(x),array['id','catalog_id','catalog_version','snapshot','digest']) from wm.catalog_snapshots x where x.organization_id=org and exists(select 1 from wm.agreements a where a.organization_id=org and a.engagement_id=eng and a.catalog_snapshot_id=x.id and wm.customer_export_agreement(org,a.id,who,finance))
 union all
 select 'facts'::text,wm.customer_export_pick(to_jsonb(x),array['id','key','value','confirmed_at','valid_until','supersedes_id','version']) from wm.business_facts x where x.organization_id=org
 union all
 select 'hosting_offsets'::text,wm.customer_export_pick(to_jsonb(x),array['id','schedule_id','period_start','eligible_minor','offset_minor','reason','created_at']) from wm.hosting_allocations x where x.organization_id=org and finance and exists(select 1 from wm.billing_schedules bs where bs.organization_id=org and bs.id=x.schedule_id and bs.engagement_id=eng)
 union all
 select 'closure_statements'::text,wm.customer_export_pick(to_jsonb(x),array['id','closure_id','sequence','created_at'])||jsonb_build_object('summary',x.snapshot->>'summary','refund_status',x.snapshot->>'refund_status','lines',(select coalesce(jsonb_agg(wm.customer_export_pick(v,array['id','description','currency','amount_minor','paid_minor','earned_minor','service_paid_minor','tax_paid_minor','other_paid_minor','tax_credit_minor','return_due_minor','unpaid_earned_minor','unearned_unpaid_minor','provider_state','observed_at'])),'[]') from jsonb_array_elements(coalesce(x.snapshot->'lines','[]')) v))
 from wm.closure_statements x where x.organization_id=org and finance and exists(select 1 from wm.closures c where c.organization_id=org and c.id=x.closure_id and c.engagement_id=eng)
 ) all_records limit 2001
), files as materialized (
 select * from (
 select jsonb_build_object('kind','workspace','id',a.id,'name',a.original_name,'bytes',a.actual_bytes::text,'checksum',a.checksum,'object_key',a.sealed_object_key,'bucket','workspace-sealed','state',a.scan_state) as data
 from wm.attachments a where a.organization_id=org and a.engagement_id=eng and wm.customer_export_file(a,who) and a.scan_state in ('ready','unscanned')
 union all
 select jsonb_build_object('kind','inbound','id',v->>'id','email_id',e.id,'name',v->>'name','bytes',v->>'bytes','checksum',v->>'checksum','object_key',v->>'object_key','bucket','workspace-inbound','state','unscanned')
 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id join wm.messages m on m.organization_id=r.organization_id and m.engagement_id=r.engagement_id and m.id=e.message_id cross join lateral jsonb_array_elements(e.attachments) v
 where r.organization_id=org and r.engagement_id=eng and e.routing='accepted' and m.visibility='shared' and v->>'state'='stored_unscanned'
 ) all_files limit 101
)
select jsonb_build_object('profile','customer-engagement-v1','organization',(select jsonb_build_object('id',id,'name',name,'timezone',timezone) from wm.organizations where id=org),'engagement_id',eng,
 'records',(select coalesce(jsonb_agg(jsonb_build_object('section',section,'data',data) order by section,data->>'id'),'[]') from records),
 'files',(select coalesce(jsonb_agg(data order by data->>'kind',data->>'id'),'[]') from files),
 'pending_files',exists(select 1 from wm.attachments a where a.organization_id=org and a.engagement_id=eng and wm.customer_export_file(a,who) and a.scan_state in ('received','quarantined','checking')) or exists(select 1 from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id join wm.messages m on m.organization_id=r.organization_id and m.engagement_id=r.engagement_id and m.id=e.message_id where r.organization_id=org and r.engagement_id=eng and e.routing='accepted' and m.visibility='shared' and e.state<>'captured'))
$$;
-- Recheck the original named member, exact generations and all retained audience refs.
create function wm.customer_export_current(j wm.customer_exports) returns void language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;m wm.memberships;f jsonb;r jsonb;a wm.attachments;v jsonb;begin
 select * into g from wm.tenant_guards where organization_id=j.organization_id for update;
 select * into m from wm.memberships where organization_id=j.organization_id and user_id=j.requested_by;
 if g.organization_id is null or g.access_state<>'open' or g.recovery_generation<>j.recovery_generation or g.external_generation<>j.external_generation
 or m.user_id is null or m.status<>'active' or m.revoked_at is not null or m.version<>j.membership_version or m.role<>j.membership_role
 or j.expires_at<=clock_timestamp() or j.state='cancelled'
 or not exists(select 1 from wm.organizations where id=j.organization_id and status=j.organization_status and status<>'closed')
 or not exists(select 1 from wm.engagements where organization_id=j.organization_id and id=j.engagement_id and service_state=j.engagement_state)
 or wm.customer_export_closure(j.organization_id,j.engagement_id)<>j.closure_digest then raise exception 'Customer export access changed or expired' using errcode='42501';end if;
 for r in select value from jsonb_array_elements(j.snapshot->'records') where value->>'section'='agreements' loop
 if not wm.customer_export_agreement(j.organization_id,(r->'data'->>'id')::uuid,j.requested_by,j.membership_role='customer_admin') then raise exception 'Export contract audience changed' using errcode='42501';end if;end loop;
 for r in select value from jsonb_array_elements(j.snapshot->'records') where value->>'section'='messages' loop
 if not exists(select 1 from wm.messages where organization_id=j.organization_id and engagement_id=j.engagement_id and id=(r->'data'->>'id')::uuid and visibility='shared') then raise exception 'Export audience changed' using errcode='42501';end if;end loop;
 for r in select value from jsonb_array_elements(j.snapshot->'records') where value->>'section' in ('reports','analytics') loop
 if r->>'section'='reports' and not exists(select 1 from wm.reports where organization_id=j.organization_id and id=(r->'data'->>'id')::uuid and status in ('published','superseded')) then raise exception 'Export report audience changed' using errcode='42501';end if;
 if r->>'section'='analytics' and not exists(select 1 from wm.analytics_imports where organization_id=j.organization_id and id=(r->'data'->>'id')::uuid and status in ('published','superseded')) then raise exception 'Export analytics audience changed' using errcode='42501';end if;
 end loop;
 for f in select value from jsonb_array_elements(j.snapshot->'files') loop
 if f->>'kind'='workspace' then
 select * into a from wm.attachments where organization_id=j.organization_id and engagement_id=j.engagement_id and id=(f->>'id')::uuid;
 if not found or not wm.customer_export_file(a,j.requested_by) or a.scan_state not in ('ready','unscanned') or a.sealed_object_key is distinct from f->>'object_key' or a.checksum is distinct from f->>'checksum' or a.actual_bytes::text is distinct from f->>'bytes' then raise exception 'Export file audience or bytes changed' using errcode='42501';end if;
 else
 select item into v from wm.inbound_emails e join wm.inbound_routes ir on ir.id=e.route_id join wm.messages msg on msg.organization_id=ir.organization_id and msg.engagement_id=ir.engagement_id and msg.id=e.message_id cross join lateral jsonb_array_elements(e.attachments) item
 where e.id=(f->>'email_id')::uuid and ir.organization_id=j.organization_id and ir.engagement_id=j.engagement_id and e.routing='accepted' and msg.visibility='shared' and item->>'id'=f->>'id' and item->>'state'='stored_unscanned';
 if v is null or v->>'checksum' is distinct from f->>'checksum' or v->>'object_key' is distinct from f->>'object_key' or v->>'bytes' is distinct from f->>'bytes' then raise exception 'Export inbound audience or bytes changed' using errcode='42501';end if;
 end if;end loop;
end $$;
create function public.wm_customer_export_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare prior jsonb;j wm.customer_exports;m wm.memberships;g wm.tenant_guards;e wm.engagements;s jsonb;why text;orgstatus text;begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();
 select * into m from wm.memberships where organization_id=p_org and user_id=auth.uid() and status='active' and revoked_at is null;
 if not found then raise exception 'Named current customer member required' using errcode='42501';end if;
 if p_command='customer_export.request' then
 perform wm.check_input(p_input,array['engagement_id','expected_version','acknowledge_unscanned'],array['engagement_id','expected_version','acknowledge_unscanned']);
 if p_input->'acknowledge_unscanned' is distinct from 'true'::jsonb then raise exception 'Acknowledge unscanned file warning' using errcode='22023';end if;
 prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 select * into e from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid;
 if not found then raise exception 'Engagement unavailable' using errcode='42501';end if;perform wm.check_version(e.version,(p_input->>'expected_version')::bigint);
 select status into orgstatus from wm.organizations where id=p_org;if orgstatus='closed' then raise exception 'Business closed' using errcode='42501';end if;
 if (select count(*) from wm.customer_exports where organization_id=p_org and requested_by=auth.uid() and captured_at>now()-interval '1 hour')>=3 then raise exception 'Export request limit reached; use an existing request' using errcode='22023';end if;
 select * into g from wm.tenant_guards where organization_id=p_org;
 -- One STABLE statement snapshot, never stitched pages from separate RPC calls.
 s:=wm.customer_export_snapshot(p_org,e.id,auth.uid(),m.role='customer_admin');
 if jsonb_array_length(s->'records')>2000 then why:='record_limit';
 elsif jsonb_array_length(s->'files')>100 then why:='file_limit';
 elsif octet_length(s::text)>2097152 then why:='record_bytes_limit';
 elsif (s->>'pending_files')::boolean then why:='files_not_ready';
 elsif (select coalesce(sum((v->>'bytes')::bigint),0) from jsonb_array_elements(s->'files') v)>20971520 then why:='file_bytes_limit';end if;
 -- Never persist a truncated snapshot as a complete export, or leak excluded counts.
 if why is not null then s:=jsonb_build_object('profile','customer-engagement-v1','records','[]'::jsonb,'files','[]'::jsonb,'incomplete',true);end if;
 insert into wm.customer_exports(organization_id,engagement_id,requested_by,membership_version,membership_role,recovery_generation,external_generation,organization_status,engagement_state,closure_digest,snapshot,snapshot_digest,state,reason)
 values(p_org,e.id,auth.uid(),m.version,m.role,g.recovery_generation,g.external_generation,orgstatus,e.service_state,wm.customer_export_closure(p_org,e.id),s,wm.hash_json(s),case when why is null then 'captured' else 'attention' end,why) returning * into j;
 insert into wm.customer_export_receipts values(p_org,j.id,'captured',jsonb_build_object('snapshot_digest',j.snapshot_digest,'complete',why is null),now());
 elsif p_command='customer_export.cancel' then
 perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);prior:=wm.prior_command(p_org,p_command,p_key,p_input);if prior is not null then return prior;end if;
 select * into j from wm.customer_exports where organization_id=p_org and id=(p_input->>'id')::uuid and requested_by=auth.uid() for update;
 if not found then raise exception 'Export unavailable' using errcode='42501';end if;perform wm.check_version(j.version,(p_input->>'expected_version')::bigint);
 update wm.customer_exports set state='cancelled',reason='cancelled',version=version+1 where organization_id=p_org and id=j.id returning * into j;
 else raise exception 'Unsupported export command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',j.id,'state',j.state,'version',j.version,'external_generation',j.external_generation),j.id);
end $$;
create function public.wm_customer_export_list(p_org uuid,p_before bigint default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;items jsonb:='[]';available boolean;begin
 perform wm.require_access(p_org,'read');if wm.member_role(p_org) is null then raise exception 'Named customer required' using errcode='42501';end if;
 for j in select * from wm.customer_exports where organization_id=p_org and requested_by=auth.uid() and (p_before is null or ordinal<p_before) order by ordinal desc limit 21 loop
 available:=false;
 begin perform wm.customer_export_current(j);available:=j.state='sealed';exception when sqlstate '42501' then available:=false;end;
 items:=items||jsonb_build_array(jsonb_build_object('id',j.id,'engagement_id',j.engagement_id,'state',case when j.expires_at<=clock_timestamp() then 'expired' else j.state end,'reason',j.reason,'version',j.version,'captured_at',j.captured_at,'expires_at',j.expires_at,'download_available',available,'archive_digest',case when available then j.archive_digest else null end,'archive_bytes',case when available then j.archive_bytes else null end,'cursor',j.ordinal::text));
 end loop;return jsonb_build_object('items',items,'external_generation',(select external_generation from wm.tenant_guards where organization_id=p_org));
end $$;
create function public.wm_customer_export_claim(p_limit integer default 2) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;items jsonb:='[]';begin
 perform wm.require_machine();if p_limit not between 1 and 5 then raise exception 'Invalid claim limit' using errcode='22023';end if;
 -- A crash on the last lease becomes explicit attention rather than stranded building.
 update wm.customer_exports set state='attention',reason='build_failed',version=version+1 where state in ('building','reserved') and attempts>=5 and lease_until<clock_timestamp();
 -- Queue locks do not acquire tenant guards; avoids reversing guard->job order.
 for j in select * from wm.customer_exports where state in ('captured','building','reserved') and next_attempt_at<=clock_timestamp() and expires_at>clock_timestamp() and (lease_until is null or lease_until<clock_timestamp()) and attempts<5 order by next_attempt_at,captured_at for update skip locked limit p_limit loop
 update wm.customer_exports set state=case when object_key is null then 'building' else 'reserved' end,lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes',attempts=attempts+1,next_attempt_at=clock_timestamp()+interval '10 minutes',version=version+1 where organization_id=j.organization_id and id=j.id returning * into j;
 items:=items||jsonb_build_array(jsonb_build_object('organization_id',j.organization_id,'id',j.id,'lease_token',j.lease_token));end loop;return items;
end $$;
create function public.wm_customer_export_context(p_org uuid,p_id uuid,p_lease uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into j from wm.customer_exports where organization_id=p_org and id=p_id for update;
 if not found or j.lease_token is distinct from p_lease or j.lease_until<=clock_timestamp() or j.state not in ('building','reserved') then raise exception 'Export lease unavailable' using errcode='42501';end if;perform wm.customer_export_current(j);
 return to_jsonb(j)-array['lease_token','reason'];
end $$;
create function public.wm_customer_export_reserve(p_org uuid,p_id uuid,p_lease uuid,p_target text,p_hash text,p_bytes bigint,p_manifest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;k text;begin
 perform wm.require_machine();perform public.wm_customer_export_context(p_org,p_id,p_lease);
 select * into j from wm.customer_exports where organization_id=p_org and id=p_id;
 if p_target !~ '^(r2|supabase):[a-zA-Z0-9_-]{1,80}$' or p_hash !~ '^[a-f0-9]{64}$' or p_manifest !~ '^[a-f0-9]{64}$' or p_bytes not between 1 and 33554432 or p_target is null or p_hash is null or p_bytes is null or p_manifest is null then raise exception 'Invalid archive reservation' using errcode='22023';end if;
 k:='customer-exports/'||p_org||'/'||p_id||'/'||p_hash||'.zip';
 if j.object_key is not null then
 if (j.storage_target,j.archive_digest,j.archive_bytes,j.manifest_digest) is distinct from (p_target,p_hash,p_bytes,p_manifest) then raise exception 'Immutable export reservation conflict' using errcode='23505';end if;
 else update wm.customer_exports set storage_target=p_target,object_key=k,archive_digest=p_hash,archive_bytes=p_bytes,manifest_digest=p_manifest,state='reserved',version=version+1 where organization_id=p_org and id=p_id;
 insert into wm.customer_export_receipts values(p_org,p_id,'reserved',jsonb_build_object('key',k,'target',p_target,'sha256',p_hash,'bytes',p_bytes,'manifest_sha256',p_manifest),now());end if;
 return jsonb_build_object('key',k,'target',p_target);
end $$;
create function public.wm_customer_export_write_once(p_org uuid,p_id uuid,p_lease uuid) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;begin
 perform wm.require_machine();perform public.wm_customer_export_context(p_org,p_id,p_lease);
 select * into j from wm.customer_exports where organization_id=p_org and id=p_id;
 if j.object_key is null then raise exception 'Reservation required' using errcode='42501';end if;
 if j.write_started_at is not null then return false;end if;
 update wm.customer_exports set write_started_at=clock_timestamp(),version=version+1 where organization_id=p_org and id=p_id;return true;
end $$;
create function public.wm_customer_export_seal(p_org uuid,p_id uuid,p_lease uuid,p_hash text,p_bytes bigint,p_manifest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into j from wm.customer_exports where organization_id=p_org and id=p_id for update;
 if not found then raise exception 'Export unavailable' using errcode='42501';end if;perform wm.customer_export_current(j);
 if (j.archive_digest,j.archive_bytes,j.manifest_digest) is distinct from (p_hash,p_bytes,p_manifest) or j.object_key is null then raise exception 'Archive readback conflict' using errcode='23505';end if;
 if j.state='sealed' then return jsonb_build_object('id',j.id,'state','sealed');end if;
 perform public.wm_customer_export_context(p_org,p_id,p_lease);
 update wm.customer_exports set state='sealed',sealed_at=clock_timestamp(),lease_until=null,reason=null,version=version+1 where organization_id=p_org and id=p_id;
 insert into wm.customer_export_receipts values(p_org,p_id,'sealed',jsonb_build_object('sha256',p_hash,'bytes',p_bytes,'manifest_sha256',p_manifest),now());
 return jsonb_build_object('id',j.id,'state','sealed');
end $$;
create function public.wm_customer_export_attention(p_org uuid,p_id uuid,p_lease uuid,p_reason text) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_machine();if p_reason not in ('source_unavailable','source_integrity','archive_unknown','archive_integrity','build_limit','access_changed','configuration','build_failed') then raise exception 'Invalid export attention reason' using errcode='22023';end if;
 update wm.customer_exports set state=case when object_key is not null and p_reason in ('archive_unknown','build_failed') and attempts<5 then 'reserved' else 'attention' end,reason=p_reason,lease_until=null,version=version+1 where organization_id=p_org and id=p_id and lease_token=p_lease and state in ('building','reserved');
end $$;
create function public.wm_customer_export_download(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare j wm.customer_exports;begin
 perform wm.require_access(p_org,'read');perform wm.require_recent_auth();select * into j from wm.customer_exports where organization_id=p_org and id=p_id and requested_by=auth.uid();
 if not found or j.state<>'sealed' then raise exception 'Export unavailable' using errcode='42501';end if;perform wm.customer_export_current(j);
 return jsonb_build_object('id',j.id,'target',j.storage_target,'key',j.object_key,'sha256',j.archive_digest,'bytes',j.archive_bytes,'manifest_sha256',j.manifest_digest,'external_generation',j.external_generation);
end $$;
-- GC integration: holds are bounded by expiry, never a bypass of audience revocation.
create function public.wm_customer_export_holds() returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin perform wm.require_machine();return coalesce((select jsonb_agg(jsonb_build_object('bucket',f->>'bucket','key',f->>'object_key','until',j.expires_at)) from wm.customer_exports j cross join lateral jsonb_array_elements(j.snapshot->'files') f where j.expires_at>clock_timestamp() and j.state in ('captured','building','reserved')),'[]');end $$;
revoke all on function wm.customer_export_agreement(uuid,uuid,uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function wm.customer_export_immutable(),wm.customer_export_numbers(jsonb),wm.customer_export_pick(jsonb,text[]),wm.customer_export_closure(uuid,uuid),wm.customer_export_file(wm.attachments,uuid),wm.customer_export_snapshot(uuid,uuid,uuid,boolean),wm.customer_export_current(wm.customer_exports),public.wm_customer_export_command(uuid,text,jsonb,text),public.wm_customer_export_list(uuid,bigint),public.wm_customer_export_claim(integer),public.wm_customer_export_context(uuid,uuid,uuid),public.wm_customer_export_reserve(uuid,uuid,uuid,text,text,bigint,text),public.wm_customer_export_write_once(uuid,uuid,uuid),public.wm_customer_export_seal(uuid,uuid,uuid,text,bigint,text),public.wm_customer_export_attention(uuid,uuid,uuid,text),public.wm_customer_export_download(uuid,uuid),public.wm_customer_export_holds() from public,anon,authenticated,service_role;
grant execute on function public.wm_customer_export_command(uuid,text,jsonb,text),public.wm_customer_export_list(uuid,bigint),public.wm_customer_export_download(uuid,uuid) to authenticated;
grant execute on function public.wm_customer_export_claim(integer),public.wm_customer_export_context(uuid,uuid,uuid),public.wm_customer_export_reserve(uuid,uuid,uuid,text,text,bigint,text),public.wm_customer_export_write_once(uuid,uuid,uuid),public.wm_customer_export_seal(uuid,uuid,uuid,text,bigint,text),public.wm_customer_export_attention(uuid,uuid,uuid,text),public.wm_customer_export_holds() to service_role;
commit;
