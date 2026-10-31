begin;
-- Private buckets deliberately have no authenticated Storage object policy.
-- The Worker checks current record authorization and streams bytes per request.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit) values('workspace-quarantine','workspace-quarantine',false,20971520),('workspace-sealed','workspace-sealed',false,20971520) on conflict(id) do nothing;
    if exists(select 1 from storage.buckets where id in ('workspace-quarantine','workspace-sealed') and public) then raise exception 'Workspace buckets must be private';end if;
  end if;
end $$;

create function wm.file_visible(f wm.attachments) returns boolean language plpgsql volatile security definer set search_path='' as $$
begin
  if f.deleted_at is not null then return false;end if;
  if wm.operator_has(f.organization_id,'read') then return true;end if;
  if wm.member_role(f.organization_id) is null then return false;end if;
  if f.visibility='internal' or (f.visibility='draft' and f.uploader_id<>auth.uid()) then return false;end if;
  if f.message_id is not null and not exists(select 1 from wm.messages where organization_id=f.organization_id and engagement_id=f.engagement_id and id=f.message_id and visibility='shared') then return false;end if;
  return true;
end $$;
create function public.wm_file_intent(p_org uuid,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;f wm.attachments;parent_message wm.messages;filename text;media text;ext text;visibility_name text;files_count integer;file_id uuid:=gen_random_uuid();
begin
  perform wm.require_access(p_org,'write');
  perform wm.check_input(p_input,array['engagement_id','request_id','message_id','name','media_type','bytes','visibility'],array['engagement_id','name','media_type','bytes','visibility']);
  result:=wm.prior_command(p_org,'file.intent',p_key,p_input);if result is not null then return result;end if;
  filename:=wm.require_text(p_input->>'name','filename',180);media:=p_input->>'media_type';ext:=lower(substring(filename from '\.([^.]+)$'));visibility_name:=p_input->>'visibility';
  if filename ~ '[/\\[:cntrl:]]' or ext is null or not ((ext in ('jpg','jpeg') and media='image/jpeg') or (ext='png' and media='image/png') or (ext='webp' and media='image/webp') or (ext='pdf' and media='application/pdf') or (ext='txt' and media='text/plain') or (ext='csv' and media='text/csv') or (ext='docx' and media='application/vnd.openxmlformats-officedocument.wordprocessingml.document') or (ext='xlsx' and media='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) then raise exception 'Unsupported filename or file type' using errcode='22023';end if;
  if visibility_name not in ('draft','shared','internal') or (visibility_name='internal' and not wm.operator_has(p_org,'delivery')) then raise exception 'File audience unavailable' using errcode='42501';end if;
  if p_input->>'message_id' is not null then
    select * into parent_message from wm.messages where organization_id=p_org and engagement_id=(p_input->>'engagement_id')::uuid and id=(p_input->>'message_id')::uuid;
    if not found or (parent_message.visibility<>'shared' and not wm.operator_has(p_org,'delivery')) or (parent_message.visibility<>'shared' and visibility_name='shared') then raise exception 'File parent audience unavailable' using errcode='42501';end if;
  end if;
  if p_input->>'request_id' is not null or p_input->>'message_id' is not null then
    select count(*) into files_count from wm.attachments where organization_id=p_org and deleted_at is null and scan_state<>'rejected' and ((request_id=(p_input->>'request_id')::uuid) or (message_id=(p_input->>'message_id')::uuid));
    if files_count>=10 then raise exception 'Up to ten files can be attached to one request or message' using errcode='22023';end if;
  end if;
  select count(*) into files_count from wm.attachments where organization_id=p_org and uploader_id=auth.uid() and scan_state='received' and expires_at>now();
  if files_count>=10 then raise exception 'Complete the pending uploads before adding more' using errcode='22023';end if;
  insert into wm.attachments(organization_id,id,engagement_id,request_id,message_id,uploader_id,visibility,upload_object_key,original_name,declared_media_type,declared_bytes,expires_at)
    values(p_org,file_id,(p_input->>'engagement_id')::uuid,(p_input->>'request_id')::uuid,(p_input->>'message_id')::uuid,auth.uid(),visibility_name,p_org||'/'||file_id||'/'||gen_random_uuid()||'.upload',filename,media,(p_input->>'bytes')::bigint,now()+interval '30 minutes') returning * into f;
  return wm.finish_command(p_org,'file.intent',p_key,p_input,jsonb_build_object('id',f.id,'state','received','expires_at',f.expires_at),f.id);
end $$;
create function public.wm_file_access(p_org uuid,p_id uuid,p_action text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;
begin
  perform wm.require_access(p_org,case when p_action='upload' then 'write' else 'read' end);
  select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
  if not found or not wm.file_visible(f) then raise exception 'File unavailable' using errcode='42501';end if;
  if p_action='upload' then
    if f.uploader_id<>auth.uid() or f.scan_state<>'received' or f.expires_at<=now() then raise exception 'Upload authorization expired or already used' using errcode='42501';end if;
    return jsonb_build_object('id',f.id,'engagement_id',f.engagement_id,'object_key',f.upload_object_key,'media_type',f.declared_media_type,'bytes',f.declared_bytes,'name',f.original_name);
  elsif p_action='download' then
    if f.scan_state<>'ready' or f.sealed_object_key is null then raise exception 'File checks are not complete' using errcode='42501';end if;
    return jsonb_build_object('id',f.id,'engagement_id',f.engagement_id,'object_key',f.sealed_object_key,'media_type',f.actual_media_type,'bytes',f.actual_bytes,'name',f.original_name,'checksum',f.checksum);
  else raise exception 'Unsupported file action' using errcode='22023';end if;
end $$;
create function public.wm_file_uploaded(p_org uuid,p_id uuid,p_checksum text,p_bytes bigint,p_media_type text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;op uuid;
begin
  perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
  select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
  if not found or f.deleted_at is not null then raise exception 'File unavailable' using errcode='42501';end if;
  if f.scan_state<>'received' then
    if f.checksum=p_checksum and f.actual_bytes=p_bytes then return jsonb_build_object('id',f.id,'state',f.scan_state);end if;
    raise exception 'Upload content changed' using errcode='23505';
  end if;
  if f.declared_bytes<>p_bytes or f.declared_media_type<>p_media_type or p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'File content does not match the upload' using errcode='22023';end if;
  update wm.attachments set checksum=p_checksum,actual_bytes=p_bytes,actual_media_type=p_media_type,scan_state='quarantined',version=version+1 where organization_id=p_org and id=f.id;
  op:=wm.enqueue(p_org,f.engagement_id,null,null,null,'file_scan',jsonb_build_object('file_id',f.id,'checksum',p_checksum),false,'file-scan:'||f.id||':'||p_checksum,f.uploader_id);
  return jsonb_build_object('id',f.id,'state','quarantined','operation_id',op);
end $$;
create function public.wm_file_scan_input(p_org uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;
begin
  perform wm.require_machine();select * into f from wm.attachments where organization_id=p_org and id=p_id;
  if not found or f.deleted_at is not null or f.scan_state not in ('quarantined','checking') then raise exception 'File scan unavailable' using errcode='42501';end if;
  return to_jsonb(f);
end $$;
create function public.wm_file_scan_complete(p_org uuid,p_id uuid,p_checksum text,p_clean boolean,p_policy text,p_evidence jsonb,p_sealed_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare f wm.attachments;guard wm.tenant_guards;
begin
  perform wm.require_machine();select * into guard from wm.tenant_guards where organization_id=p_org for update;
  select * into f from wm.attachments where organization_id=p_org and id=p_id for update;
  if not found or f.deleted_at is not null or f.checksum is distinct from p_checksum or guard.access_state<>'open' then raise exception 'File changed or unavailable' using errcode='42501';end if;
  if f.scan_state in ('ready','rejected') then return jsonb_build_object('id',f.id,'state',f.scan_state);end if;
  if f.scan_state not in ('quarantined','checking') or p_clean is null or jsonb_typeof(p_evidence)<>'object' then raise exception 'File scan incomplete' using errcode='22023';end if;
  if p_clean and (p_sealed_key is null or p_sealed_key not like p_org||'/'||p_id||'/%') then raise exception 'Sealed object identity required' using errcode='22023';end if;
  update wm.attachments set scan_state=case when p_clean then 'ready' else 'rejected' end,scan_policy_version=wm.require_text(p_policy,'scan policy',100),scan_observation=p_evidence,sealed_object_key=case when p_clean then p_sealed_key else null end,version=version+1 where organization_id=p_org and id=p_id;
  return jsonb_build_object('id',f.id,'state',case when p_clean then 'ready' else 'rejected' end);
end $$;
revoke all on function public.wm_file_intent(uuid,jsonb,text),public.wm_file_access(uuid,uuid,text) from public,anon;
grant execute on function public.wm_file_intent(uuid,jsonb,text),public.wm_file_access(uuid,uuid,text) to authenticated;
revoke all on function public.wm_file_uploaded(uuid,uuid,text,bigint,text),public.wm_file_scan_input(uuid,uuid),public.wm_file_scan_complete(uuid,uuid,text,boolean,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.wm_file_uploaded(uuid,uuid,text,bigint,text),public.wm_file_scan_input(uuid,uuid),public.wm_file_scan_complete(uuid,uuid,text,boolean,text,jsonb,text) to service_role;
revoke all on all functions in schema wm from public,anon,authenticated;
commit;
