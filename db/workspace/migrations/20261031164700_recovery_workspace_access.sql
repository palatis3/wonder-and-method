begin;
-- Restricted tenants are deliberately absent from wm_businesses/workspace.
-- Current direct recovery operators have this separate, narrow entry point.
create function public.wm_recovery_businesses() returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform wm.require_session();
 if not exists(select 1 from wm.organizations o where wm.operator_has(o.id,'recovery') and wm.owner_direct(o.id,auth.uid(),'recovery')) then return '[]'::jsonb;end if;
 perform wm.require_recent_auth();
 return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'timezone',o.timezone,'recovery_only',true) order by o.name) from wm.organizations o join wm.tenant_guards g on g.organization_id=o.id where wm.operator_has(o.id,'recovery') and wm.owner_direct(o.id,auth.uid(),'recovery')),'[]');
end $$;
create function public.wm_recovery_workspace(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$declare g wm.tenant_guards;status jsonb;choices jsonb;begin
 perform wm_restore.operator(p_org);select * into g from wm.tenant_guards where organization_id=p_org;
 status:=public.wm_restore_status(p_org);
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label','Verified encrypted backup from '||b.sealed_at::text,'manifest_pointer',b.manifest_pointer,'expected_generation',g.external_generation) order by b.sealed_at desc),'[]') into choices from (select id,sealed_at,manifest_pointer from wm.tenant_backup_jobs where organization_id=p_org and state='sealed' and manifest_pointer is not null order by sealed_at desc limit 20) b where g.access_state='open';
 return jsonb_build_object('business',(select jsonb_build_object('id',id,'name',name,'timezone',timezone) from wm.organizations where id=p_org),'viewer',jsonb_build_object('operator',true,'capabilities',jsonb_build_array('recovery'),'role',null),'recovery_only',g.access_state<>'open','access_state',g.access_state,'generation',g.external_generation,'restore',status,'backups',choices);
end $$;
revoke all on function public.wm_recovery_businesses(),public.wm_recovery_workspace(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_recovery_businesses(),public.wm_recovery_workspace(uuid) to authenticated;
commit;
