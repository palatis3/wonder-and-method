begin;
create function public.wm_runtime_health() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform wm.require_machine();
 return jsonb_build_object(
 'queued_stale',(select count(*) from wm.outbox_jobs where state in ('pending','leased') and not_before<now()-interval '15 minutes' and (lease_until is null or lease_until<now())),
 'unknown_stale',(select count(*) from wm.operation_attempts where state in ('unknown','dispatch_reserved','observed') and started_at<now()-interval '10 minutes'),
 'stops_stale',(select count(*) from wm.stop_intents where state in ('requested','observed_pending','unknown') and created_at<now()-interval '1 minute'),
 'receipt_conflicts',(select count(*) from wm.critical_receipts where durability_status='conflict'),
 'receipts_stale',(select count(*) from wm.critical_receipts where durability_status='pending' and created_at<now()-interval '15 minutes'),
 'backup_schedules',(select count(*) from wm.tenant_backup_schedules where enabled),
 'backup_authority_attention',(select count(*) from wm.tenant_backup_schedules where not enabled and reason is not null),
 'backup_overdue',(select count(*) from wm.tenant_backup_schedules s where s.enabled and coalesce((select max(sealed_at) from wm.tenant_backup_jobs j where j.organization_id=s.organization_id and j.state='sealed' and j.external_generation=s.external_generation and j.recovery_generation=s.recovery_generation),s.created_at)<now()-interval '24 hours'),
 'backup_attention',(select count(*) from wm.tenant_backup_schedules s join wm.tenant_backup_jobs j on j.organization_id=s.organization_id and j.id=s.last_job_id where s.enabled and (j.state in ('attention','cancelled') or j.state<>'sealed' and j.expires_at<now()))
 );
end $$;
revoke all on function public.wm_runtime_health() from public,anon,authenticated;
grant execute on function public.wm_runtime_health() to service_role;
commit;
