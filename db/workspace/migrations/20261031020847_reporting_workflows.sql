begin;
alter table wm.import_runs add column staged_rows jsonb not null default '[]',add column supersedes_id uuid,add column version bigint not null default 1,
 add foreign key(organization_id,supersedes_id) references wm.import_runs(organization_id,id);
create unique index metric_period_current on wm.import_runs(organization_id,engagement_id,source,account_id,period_start,period_end) where status='promoted';
alter table wm.reports add column reviewed_by uuid,add column reviewed_at timestamptz,add column review_digest text,add column limitations text;
create unique index report_period_current on wm.reports(organization_id,engagement_id,period_key) where status='published';
create function public.wm_reporting_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; e wm.engagements; imp wm.import_runs; previous wm.import_runs; rowvalue jsonb; errs jsonb:='[]';
 rid uuid; ver bigint:=1; n integer:=0; valid integer:=0; seen text[]:=array[]::text[]; keyvalue text; reason text; value_text text;
 start_at timestamptz; end_at timestamptz; obs timestamptz; superseded uuid; report wm.reports; oldreport wm.reports; revision wm.revisions; req wm.requests;
 snapshots uuid[]; manifest jsonb; seq integer; scope_digest text;
begin
 perform wm.require_access(p_org,'reports');
 result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='reporting.stage' then
  perform wm.check_input(p_input,array['engagement_id','source','account_reference','currency','timezone','period_start','period_end','rows','supersedes_id'],array['engagement_id','source','account_reference','currency','timezone','period_start','period_end','rows']);
  select * into e from wm.engagements where organization_id=p_org and id=(p_input->>'engagement_id')::uuid;
  if not found then raise exception 'Service unavailable' using errcode='42501';end if;
  if p_input->>'source' not in ('google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads','analytics','search_console','manual') then raise exception 'Invalid reporting source' using errcode='22023';end if;
  if p_input->>'currency' !~ '^[A-Z]{3}$' or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_input->>'timezone') then raise exception 'Check reporting currency and time zone' using errcode='22023';end if;
  perform wm.require_text(p_input->>'account_reference','source account',200);
  if p_input->>'account_reference' ~ '^[[:space:]]*[=+@-]' then raise exception 'Invalid source account' using errcode='22023';end if;
  start_at:=(p_input->>'period_start')::timestamptz;end_at:=(p_input->>'period_end')::timestamptz;
  if not isfinite(start_at) or not isfinite(end_at) or end_at<=start_at or end_at>now()+interval '1 day' or end_at-start_at>interval '370 days' then raise exception 'Check the reporting period' using errcode='22023';end if;
  if octet_length(p_input::text)>524288 then raise exception 'Import payload too large' using errcode='22023';end if;
  if jsonb_typeof(p_input->'rows')<>'array' or jsonb_array_length(p_input->'rows') not between 1 and 500 then raise exception 'Use 1 to 500 reporting rows' using errcode='22023';end if;
  select * into imp from wm.import_runs where organization_id=p_org and engagement_id=e.id and source=p_input->>'source' and source_hash=wm.hash_json(p_input);
  if found then return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',imp.id,'version',imp.version,'status',imp.status),imp.id);end if;
  if p_input->>'supersedes_id' is not null then
   select * into previous from wm.import_runs where organization_id=p_org and engagement_id=e.id and id=(p_input->>'supersedes_id')::uuid and source=p_input->>'source' and account_id=p_input->>'account_reference' and period_start=start_at and period_end=end_at and currency=p_input->>'currency' and timezone=p_input->>'timezone' and status='promoted';
   if not found then raise exception 'Choose the current matching import to correct' using errcode='40001';end if;
  end if;
  for rowvalue in select value from jsonb_array_elements(p_input->'rows') loop
   n:=n+1;reason:=null;
   begin
    perform wm.check_input(rowvalue,array['metric','value','unit','definition_version','observed_at','provisional'],array['metric','unit','definition_version','observed_at','provisional']);
    if not rowvalue ? 'value' then raise exception 'Missing value; use null for unknown';end if;
    if rowvalue->>'metric' not in ('impressions','clicks','call_clicks','verified_calls','inquiries','booked','attended','suitable','won','sessions','search_clicks','search_impressions','cost','revenue','provider_conversions') then raise exception 'Unsupported metric';end if;
    if rowvalue->>'unit' is distinct from (case when rowvalue->>'metric' in ('cost','revenue') then 'micros' when rowvalue->>'metric'='provider_conversions' then 'decimal' else 'count' end) then raise exception 'Metric unit does not match';end if;
    value_text:=rowvalue->>'value';
    if jsonb_typeof(rowvalue->'value')<>'null' and (jsonb_typeof(rowvalue->'value')<>'string' or value_text !~ '^[0-9]{1,18}([.][0-9]{1,6})?$' or (rowvalue->>'unit'<>'decimal' and value_text ~ '[.]')) then raise exception 'Use a nonnegative exact numeric string or null';end if;
    if jsonb_typeof(rowvalue->'provisional')<>'boolean' then raise exception 'Provisional must be true or false';end if;
    perform wm.require_text(rowvalue->>'definition_version','measurement definition',160);
    if rowvalue->>'definition_version' ~ '^[[:space:]]*[=+@-]' then raise exception 'Invalid measurement definition';end if;
    obs:=(rowvalue->>'observed_at')::timestamptz;
    if not isfinite(obs) or obs>end_at+interval '370 days' or obs>now()+interval '5 minutes' or obs<start_at then raise exception 'Invalid observation date';end if;
    keyvalue:=rowvalue->>'metric';if keyvalue=any(seen) then raise exception 'Duplicate metric in this period';end if;seen:=array_append(seen,keyvalue);valid:=valid+1;
   exception when others then reason:=sqlerrm;end;
   if reason is not null then errs:=errs||jsonb_build_array(jsonb_build_object('row',n,'message',reason));end if;
  end loop;
  insert into wm.import_runs(organization_id,engagement_id,source,source_hash,account_id,currency,timezone,period_start,period_end,schema_version,total_count,accepted_count,rejected_count,status,row_errors,created_by,staged_rows,supersedes_id)
   values(p_org,e.id,p_input->>'source',wm.hash_json(p_input),p_input->>'account_reference',p_input->>'currency',p_input->>'timezone',start_at,end_at,1,n,valid,n-valid,case when valid=n then 'staged' else 'rejected' end,errs,auth.uid(),p_input->'rows',previous.id) returning id into rid;
 elsif p_command='reporting.promote' then
  perform wm.check_input(p_input,array['id','expected_version'],array['id','expected_version']);
  select * into imp from wm.import_runs where organization_id=p_org and id=(p_input->>'id')::uuid for update;
  if not found then raise exception 'Import unavailable' using errcode='42501';end if;
  perform wm.check_version(imp.version,(p_input->>'expected_version')::bigint);
  if imp.status<>'staged' or imp.rejected_count<>0 then raise exception 'Only a complete valid staged import can be promoted' using errcode='22023';end if;
  select * into previous from wm.import_runs where organization_id=p_org and engagement_id=imp.engagement_id and source=imp.source and account_id=imp.account_id and period_start<imp.period_end and period_end>imp.period_start and status='promoted' limit 1;
  if previous.id is distinct from imp.supersedes_id then raise exception 'This period overlaps an existing import; stage an explicit correction' using errcode='40001';end if;
  if previous.id is not null and (previous.period_start<>imp.period_start or previous.period_end<>imp.period_end or previous.currency<>imp.currency or previous.timezone<>imp.timezone) then raise exception 'Correction must keep the exact period, currency and time zone' using errcode='22023';end if;
  update wm.import_runs set status='superseded',version=version+1 where organization_id=p_org and id=previous.id;
  for rowvalue in select value from jsonb_array_elements(imp.staged_rows) loop
   select id into superseded from wm.metric_snapshots where organization_id=p_org and import_run_id=previous.id and metric=rowvalue->>'metric';
   insert into wm.metric_snapshots(organization_id,engagement_id,import_run_id,definition_version,metric,value,unit,source,observed_at,provisional,supersedes_id)
    values(p_org,imp.engagement_id,imp.id,rowvalue->>'definition_version',rowvalue->>'metric',(rowvalue->>'value')::numeric,rowvalue->>'unit',imp.source,(rowvalue->>'observed_at')::timestamptz,(rowvalue->>'provisional')::boolean,superseded);
  end loop;
  update wm.import_runs set status='promoted',version=version+1 where organization_id=p_org and id=imp.id returning id,version into rid,ver;
  perform wm.critical(p_org,p_command,rid,jsonb_build_object('import',imp.id,'hash',imp.source_hash,'supersedes',imp.supersedes_id));
 elsif p_command='reporting.draft' then
  perform wm.check_input(p_input,array['engagement_id','request_id','period_key','snapshot_ids','summary','limitations','supersedes_id'],array['engagement_id','request_id','period_key','snapshot_ids','summary','limitations']);
  select * into req from wm.requests where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and id=(p_input->>'request_id')::uuid for update;
  if not found then raise exception 'Work unavailable' using errcode='42501';end if;
  if jsonb_typeof(p_input->'snapshot_ids')<>'array' or jsonb_array_length(p_input->'snapshot_ids') not between 1 and 500 then raise exception 'Select report evidence' using errcode='22023';end if;
  select array_agg(value::uuid order by value) into snapshots from jsonb_array_elements_text(p_input->'snapshot_ids');
  if (select count(distinct s.id) from wm.metric_snapshots s join wm.import_runs i on i.organization_id=s.organization_id and i.id=s.import_run_id where s.organization_id=p_org and s.engagement_id=req.engagement_id and s.id=any(snapshots) and i.status='promoted')<>cardinality(snapshots) then raise exception 'Use current evidence from this service' using errcode='42501';end if;
  if p_input->>'supersedes_id' is not null then
   select * into oldreport from wm.reports where organization_id=p_org and engagement_id=req.engagement_id and period_key=p_input->>'period_key' and id=(p_input->>'supersedes_id')::uuid and status='published';
   if not found then raise exception 'Choose the current report to correct' using errcode='40001';end if;
  end if;
  manifest:=jsonb_build_object('source_snapshot_ids',snapshots,'period',wm.require_text(p_input->>'period_key','report period',120),'narrative',wm.require_text(p_input->>'summary','report explanation',16000),'limitations',wm.require_text(p_input->>'limitations','confidence and missing data',4000));
  select coalesce(max(sequence),0)+1 into seq from wm.revisions where organization_id=p_org and request_id=req.id;
  insert into wm.revisions(organization_id,request_id,sequence,kind,manifest,digest,summary,cost_effect,date_effect,created_by) values(p_org,req.id,seq,'report',manifest,wm.hash_json(manifest),p_input->>'summary','No charge authorized by this report','Reporting only',auth.uid()) returning * into revision;
  insert into wm.reports(organization_id,engagement_id,request_id,period_key,source_snapshot_ids,narrative_revision_id,supersedes_id,limitations) values(p_org,req.engagement_id,req.id,p_input->>'period_key',snapshots,revision.id,oldreport.id,p_input->>'limitations') returning id into rid;
 elsif p_command in ('reporting.review','reporting.publish') then
  perform wm.check_input(p_input,array['id','expected_version','digest'],array['id','expected_version','digest']);
  select * into report from wm.reports where organization_id=p_org and id=(p_input->>'id')::uuid for update;
  if not found then raise exception 'Report unavailable' using errcode='42501';end if;
  perform wm.check_version(report.version,(p_input->>'expected_version')::bigint);
  select * into revision from wm.revisions where organization_id=p_org and id=report.narrative_revision_id;
  if revision.digest is distinct from p_input->>'digest' then raise exception 'Review the exact report revision' using errcode='40001';end if;
  if exists(select 1 from wm.metric_snapshots s join wm.import_runs i on i.organization_id=s.organization_id and i.id=s.import_run_id where s.organization_id=p_org and s.id=any(report.source_snapshot_ids) and i.status<>'promoted') then raise exception 'Evidence was corrected; create an updated report' using errcode='40001';end if;
  if p_command='reporting.review' then
   if report.status<>'draft' then raise exception 'Only a draft can be reviewed' using errcode='40001';end if;
   update wm.reports set status='reviewed',reviewed_by=auth.uid(),reviewed_at=now(),review_digest=revision.digest,version=version+1 where organization_id=p_org and id=report.id returning id,version into rid,ver;
  else
   if report.status<>'reviewed' or report.review_digest is distinct from revision.digest then raise exception 'Reviewed narrative required before publication' using errcode='42501';end if;
   select * into oldreport from wm.reports where organization_id=p_org and engagement_id=report.engagement_id and period_key=report.period_key and status='published';
   if oldreport.id is distinct from report.supersedes_id then raise exception 'Report changed; make an explicit correction' using errcode='40001';end if;
   update wm.reports set status='superseded',version=version+1 where organization_id=p_org and id=oldreport.id;
   update wm.reports set status='published',published_at=now(),version=version+1 where organization_id=p_org and id=report.id returning id,version into rid,ver;
   perform wm.critical(p_org,p_command,rid,jsonb_build_object('revision',revision.id,'digest',revision.digest,'snapshots',report.source_snapshot_ids,'supersedes',report.supersedes_id));
  end if;
 else raise exception 'Unsupported reporting command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',rid,'version',ver),rid);
end $$;
alter function public.wm_workspace(uuid) rename to wm_workspace_before_reporting;
revoke all on function public.wm_workspace_before_reporting(uuid) from public,anon,authenticated,service_role;
create function public.wm_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; op boolean;
begin
 result:=public.wm_workspace_before_reporting(p_org);op:=wm.operator_has(p_org,'reports');
 return result||jsonb_build_object(
 'imports',case when op then (select coalesce(jsonb_agg((to_jsonb(i)-'staged_rows')||jsonb_build_object('preview_rows',case when i.status='staged' then i.staged_rows else '[]'::jsonb end)),'[]') from wm.import_runs i where i.organization_id=p_org) else '[]'::jsonb end,
 'metrics',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('value',s.value::text,'currency',i.currency,'timezone',i.timezone,'account_reference',i.account_id,'period_start',i.period_start,'period_end',i.period_end,'import_status',i.status)),'[]') from wm.metric_snapshots s join wm.import_runs i on i.organization_id=s.organization_id and i.id=s.import_run_id where s.organization_id=p_org and (op or exists(select 1 from wm.reports r where r.organization_id=p_org and r.status in ('published','superseded') and s.id=any(r.source_snapshot_ids)))),
 'reports',(select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('narrative',v.manifest,'digest',v.digest,'evidence_corrected',exists(select 1 from wm.metric_snapshots s join wm.import_runs i on i.organization_id=s.organization_id and i.id=s.import_run_id where s.organization_id=p_org and s.id=any(r.source_snapshot_ids) and i.status<>'promoted')) order by r.created_at desc),'[]') from wm.reports r join wm.revisions v on v.organization_id=r.organization_id and v.id=r.narrative_revision_id where r.organization_id=p_org and (op or r.status in ('published','superseded'))),
 'revisions',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(result->'revisions') v where v->>'kind'<>'report' or op or exists(select 1 from wm.reports r where r.organization_id=p_org and r.narrative_revision_id=(v->>'id')::uuid and r.status in ('published','superseded'))),
 'can_manage_reports',op);
end $$;
revoke all on function public.wm_reporting_command(uuid,text,jsonb,text),public.wm_workspace(uuid) from public,anon,service_role;
grant execute on function public.wm_reporting_command(uuid,text,jsonb,text),public.wm_workspace(uuid) to authenticated;
commit;
