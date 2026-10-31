begin;
-- An email is evidence of correspondence, never a human command.
create table wm.inbound_routes(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,engagement_id uuid not null,request_id uuid,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),created_by uuid not null,created_at timestamptz not null default now(),revoked_at timestamptz,
 foreign key(organization_id,engagement_id) references wm.engagements(organization_id,id),
 foreign key(organization_id,engagement_id,request_id) references wm.requests(organization_id,engagement_id,id)
);
create table wm.inbound_events(
 connection text not null,environment text not null,event_id text not null,raw_hash text not null,payload jsonb not null,
 key_version text not null,received_at timestamptz not null default now(),primary key(connection,environment,event_id)
);
create table wm.inbound_emails(
 id uuid primary key default gen_random_uuid(),connection text not null,environment text not null,provider_id uuid not null,
 first_seen_at timestamptz not null default now(),state text not null default 'queued' check(state in ('queued','retrieving','partial','captured','blocked')),
 routing text not null default 'triage' check(routing in ('triage','accepted','dismissed')),reason text not null default 'awaiting_capture',
 metadata jsonb not null default '{}',body_text text,body_html text,content_hash text,attachments jsonb not null default '[]',
 route_id uuid references wm.inbound_routes(id),message_id uuid,urgent boolean not null default false,
 lease_generation bigint not null default 0,lease_until timestamptz,next_attempt_at timestamptz not null default now(),attempts integer not null default 0,
 captured_at timestamptz,resolved_by uuid,resolved_at timestamptz,resolution text,version bigint not null default 1,
 unique(connection,environment,provider_id)
);
create table wm.inbound_anomalies(id uuid primary key default gen_random_uuid(),email_id uuid references wm.inbound_emails(id),connection text not null,environment text not null,event_id text,reason text not null,created_at timestamptz not null default now(),unique(connection,environment,event_id,reason));
create table wm.inbound_inventory(
 connection text not null,environment text not null,cursor text,cycle_id uuid not null default gen_random_uuid(),lease_generation bigint not null default 0,lease_until timestamptz,next_attempt_at timestamptz not null default now(),last_complete_at timestamptz,
 primary key(connection,environment)
);
create table wm.inbound_inventory_pages(id uuid primary key default gen_random_uuid(),connection text not null,environment text not null,cycle_id uuid not null,cursor_before text,cursor_after text,page_hash text not null,item_count integer not null,observed_at timestamptz not null default now());
create index inbound_capture_queue on wm.inbound_emails(connection,environment,next_attempt_at,first_seen_at) where state in ('queued','retrieving','partial');
create index inbound_route_lookup on wm.inbound_routes(organization_id,engagement_id) where revoked_at is null;
create index inbound_triage on wm.inbound_emails(routing,first_seen_at);
do $$declare t text;begin
 foreach t in array array['inbound_routes','inbound_events','inbound_emails','inbound_anomalies','inbound_inventory','inbound_inventory_pages'] loop
 execute format('alter table wm.%I enable row level security',t);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',t);end loop;
 if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit) values('workspace-inbound','workspace-inbound',false,20971520) on conflict(id) do nothing;
 if exists(select 1 from storage.buckets where id='workspace-inbound' and public) then raise exception 'Inbound bucket must be private';end if;end if;
end $$;
create function wm.inbound_staff() returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(wm.claims()->>'aal','')='aal2' and exists(select 1 from wm.staff where user_id=auth.uid() and 'intake'=any(capabilities) and revoked_at is null and active_until>clock_timestamp())
$$;
create function public.wm_inbound_event_receive(p_connection text,p_environment text,p_id text,p_hash text,p_event jsonb,p_key_version text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e wm.inbound_events;mail uuid;
begin
 perform wm.require_machine();
 if p_connection !~ '^[A-Za-z0-9_-]{1,100}$' or p_environment not in ('production','staging') or length(p_id) not between 1 and 200 or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid inbound identity' using errcode='22023';end if;
 insert into wm.inbound_events(connection,environment,event_id,raw_hash,payload,key_version) values(p_connection,p_environment,p_id,p_hash,p_event,p_key_version) on conflict do nothing;
 select * into e from wm.inbound_events where connection=p_connection and environment=p_environment and event_id=p_id for update;
 if e.raw_hash<>p_hash then
 insert into wm.inbound_anomalies(connection,environment,event_id,reason) values(p_connection,p_environment,p_id,'event_id_hash_conflict') on conflict do nothing;
 return jsonb_build_object('anomaly',true);end if;
 if p_event->>'type'='email.received' and coalesce(p_event->'data'->>'email_id','') ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
 insert into wm.inbound_emails(connection,environment,provider_id,urgent,metadata) values(p_connection,p_environment,(p_event->'data'->>'email_id')::uuid,coalesce(p_event->'data'->>'subject','') ~* '\m(stop|pause|cancel)\M',jsonb_build_object('subject',left(p_event->'data'->>'subject',500))) on conflict do nothing;
 select id into mail from wm.inbound_emails where connection=p_connection and environment=p_environment and provider_id=(p_event->'data'->>'email_id')::uuid;
 else insert into wm.inbound_anomalies(connection,environment,event_id,reason) values(p_connection,p_environment,p_id,'unknown_schema') on conflict do nothing;end if;
 return jsonb_build_object('received',true,'id',mail);
end $$;
create function public.wm_inbound_claim(p_connection text,p_environment text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e wm.inbound_emails;
begin
 perform wm.require_machine();select * into e from wm.inbound_emails where connection=p_connection and environment=p_environment and state in ('queued','retrieving','partial') and next_attempt_at<=clock_timestamp() and (lease_until is null or lease_until<clock_timestamp()) and attempts<10 order by first_seen_at,id for update skip locked limit 1;
 if not found then return null;end if;
 update wm.inbound_emails set state='retrieving',lease_generation=lease_generation+1,lease_until=clock_timestamp()+interval '5 minutes',attempts=attempts+1 where id=e.id returning * into e;
 return jsonb_build_object('id',e.id,'provider_id',e.provider_id,'lease_generation',e.lease_generation);
end $$;
create function public.wm_inbound_inventory_claim(p_connection text,p_environment text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.inbound_inventory;
begin
 perform wm.require_machine();if p_connection !~ '^[A-Za-z0-9_-]{1,100}$' or p_environment not in ('production','staging') then raise exception 'Invalid inventory identity' using errcode='22023';end if;
 insert into wm.inbound_inventory(connection,environment) values(p_connection,p_environment) on conflict do nothing;
 select * into s from wm.inbound_inventory where connection=p_connection and environment=p_environment for update skip locked;
 if not found or s.next_attempt_at>clock_timestamp() or s.lease_until>clock_timestamp() then return null;end if;
 update wm.inbound_inventory set lease_generation=lease_generation+1,lease_until=clock_timestamp()+interval '5 minutes',cycle_id=case when cursor is null then gen_random_uuid() else cycle_id end where connection=p_connection and environment=p_environment returning * into s;
 return jsonb_build_object('cursor',s.cursor,'cycle_id',s.cycle_id,'generation',s.lease_generation);
end $$;
create function public.wm_inbound_inventory_page(p_connection text,p_environment text,p_generation bigint,p_page jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.inbound_inventory;item jsonb;next_cursor text;seen text[]:='{}';
begin
 perform wm.require_machine();select * into s from wm.inbound_inventory where connection=p_connection and environment=p_environment for update;
 if not found or s.lease_generation<>p_generation or s.lease_until<=clock_timestamp() then raise exception 'Inventory lease changed' using errcode='40001';end if;
 if jsonb_typeof(p_page->'items') is distinct from 'array' or jsonb_array_length(p_page->'items')>100 or jsonb_typeof(p_page->'has_more') is distinct from 'boolean' or coalesce(p_page->>'page_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid inventory page' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_page->'items') loop
 if coalesce(item->>'id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' or item->>'id'=any(seen) then raise exception 'Invalid or duplicate inventory identity' using errcode='22023';end if;
 seen:=array_append(seen,item->>'id');
 insert into wm.inbound_emails(connection,environment,provider_id,urgent,metadata,reason) values(p_connection,p_environment,(item->>'id')::uuid,coalesce(item->>'subject','') ~* '\m(stop|pause|cancel)\M',jsonb_build_object('subject',left(item->>'subject',500)),'inventory_discovered') on conflict do nothing;
 end loop;
 next_cursor:=case when (p_page->>'has_more')::boolean then seen[cardinality(seen)] else null end;
 if (p_page->>'has_more')::boolean and (next_cursor is null or next_cursor is not distinct from s.cursor or exists(select 1 from wm.inbound_inventory_pages where connection=p_connection and environment=p_environment and cycle_id=s.cycle_id and cursor_after=next_cursor)) then raise exception 'Inventory pagination repeated or empty' using errcode='22023';end if;
 insert into wm.inbound_inventory_pages(connection,environment,cycle_id,cursor_before,cursor_after,page_hash,item_count) values(p_connection,p_environment,s.cycle_id,s.cursor,next_cursor,p_page->>'page_hash',cardinality(seen));
 update wm.inbound_inventory set cursor=next_cursor,lease_until=null,next_attempt_at=clock_timestamp()+case when next_cursor is null then interval '15 minutes' else interval '0 seconds' end,last_complete_at=case when next_cursor is null then clock_timestamp() else last_complete_at end where connection=p_connection and environment=p_environment;
 return jsonb_build_object('complete',next_cursor is null,'discovered',cardinality(seen));
end $$;
create function wm.inbound_publish(mail uuid,route uuid,actor uuid) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare e wm.inbound_emails;r wm.inbound_routes;message uuid;
begin
 select * into e from wm.inbound_emails where id=mail for update;select * into r from wm.inbound_routes where id=route and revoked_at is null;
 if not found or e.state not in ('captured','partial') or e.content_hash is null then raise exception 'Captured message and active route required' using errcode='22023';end if;
 perform 1 from wm.tenant_guards where organization_id=r.organization_id and access_state='open' for update;if not found then raise exception 'Business unavailable' using errcode='42501';end if;
 select * into r from wm.inbound_routes where id=route and revoked_at is null;
 if not found or (actor is not null and not exists(select 1 from wm.memberships m join auth.users u on u.id=m.user_id where m.organization_id=r.organization_id and m.user_id=actor and m.status='active' and m.revoked_at is null and u.email_confirmed_at is not null and lower(u.email)=e.metadata->>'from')) then raise exception 'Sender or route changed' using errcode='42501';end if;
 if e.message_id is not null then return e.message_id;end if;
 insert into wm.messages(organization_id,engagement_id,request_id,direction,visibility,sender_user_id,body,provider_message_id,status)
 values(r.organization_id,r.engagement_id,r.request_id,'inbound','shared',actor,
 '[Received email — correspondence only]'||E'\n'||left(coalesce(e.metadata->>'subject',''),500)||E'\n'||case when e.body_text is null then '[HTML-only email: review the private original with the studio.]' else left(e.body_text,18000) end||case when length(e.body_text)>18000 then E'\n[Message shortened here; full text retained privately.]' else '' end,
 'resend:'||e.id,'received_email') returning id into message;
 update wm.inbound_emails set route_id=route,message_id=message,routing='accepted',version=version+1 where id=mail;
 return message;
end $$;
create function public.wm_inbound_capture(p_id uuid,p_generation bigint,p_capture jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e wm.inbound_emails;r wm.inbound_routes;routes uuid[];sender uuid;item jsonb;expected_key text;prior_attachment jsonb;inventory jsonb:='[]';
begin
 perform wm.require_machine();select * into e from wm.inbound_emails where id=p_id for update;
 if not found or e.lease_generation<>p_generation or e.lease_until<=clock_timestamp() or e.state<>'retrieving' then raise exception 'Capture lease changed' using errcode='40001';end if;
 if p_capture->>'error' is not null then
 update wm.inbound_emails set state=case when attempts>=10 then 'blocked' else 'partial' end,reason=left(p_capture->>'error',100),lease_until=null,next_attempt_at=clock_timestamp()+interval '2 minutes',version=version+1 where id=p_id;return jsonb_build_object('attention',true);end if;
 perform wm.check_input(p_capture,array['body_text','body_html','content_hash','metadata','attachments','route_hashes','routing_safe','urgent','complete'],array['content_hash','metadata','attachments','route_hashes','routing_safe','urgent','complete']);
 if p_capture->>'content_hash' !~ '^[a-f0-9]{64}$' or length(coalesce(p_capture->>'body_text',''))>524288 or length(coalesce(p_capture->>'body_html',''))>524288 or jsonb_typeof(p_capture->'attachments')<>'array' or jsonb_array_length(p_capture->'attachments')>20 then raise exception 'Capture exceeds policy' using errcode='22023';end if;
 if e.content_hash is not null and e.content_hash<>p_capture->>'content_hash' then
 insert into wm.inbound_anomalies(email_id,connection,environment,reason) values(e.id,e.connection,e.environment,'captured_content_changed');
 update wm.inbound_emails set state='blocked',reason='captured_content_changed',lease_until=null where id=e.id;return jsonb_build_object('attention',true);end if;
 for item in select value from jsonb_array_elements(p_capture->'attachments') loop
 select value into prior_attachment from jsonb_array_elements(e.attachments) where value->>'id'=item->>'id' and value->>'state'='stored_unscanned';
 if prior_attachment is not null then
 if item->>'state'='stored_unscanned' and item->>'checksum' is distinct from prior_attachment->>'checksum' then
 insert into wm.inbound_anomalies(email_id,connection,environment,reason) values(e.id,e.connection,e.environment,'attachment_bytes_changed');
 update wm.inbound_emails set state='blocked',reason='attachment_bytes_changed',lease_until=null where id=e.id;return jsonb_build_object('attention',true);end if;
 item:=prior_attachment;end if;
 if item->>'state'='stored_unscanned' then
 expected_key:='inbound/'||e.id||'/'||(item->>'id')||'/'||(item->>'checksum');
 if item->>'id' !~* '^[a-f0-9-]{36}$' or item->>'checksum' !~ '^[a-f0-9]{64}$' or item->>'object_key' is distinct from expected_key or (item->>'bytes')::bigint not between 1 and 20971520 then raise exception 'Attachment integrity manifest required' using errcode='22023';end if;
 end if;inventory:=inventory||jsonb_build_array(item);end loop;
 -- An incomplete inventory must never detach bytes already captured. A full
 -- but changed provider inventory is an anomaly, not permission to erase history.
 if e.metadata->'expected_attachment_ids' is not null and p_capture->'metadata'->'expected_attachment_ids' is distinct from e.metadata->'expected_attachment_ids' then
 insert into wm.inbound_anomalies(email_id,connection,environment,reason) values(e.id,e.connection,e.environment,'attachment_inventory_changed');
 update wm.inbound_emails set state='blocked',reason='attachment_inventory_changed',lease_until=null,version=version+1 where id=e.id;return jsonb_build_object('attention',true);end if;
 for prior_attachment in select value from jsonb_array_elements(e.attachments) loop
 if not exists(select 1 from jsonb_array_elements(inventory) n where n->>'id'=prior_attachment->>'id') then
 if p_capture->'metadata'->>'capture_limitation' is null then
 insert into wm.inbound_anomalies(email_id,connection,environment,reason) values(e.id,e.connection,e.environment,'attachment_inventory_changed');
 update wm.inbound_emails set state='blocked',reason='attachment_inventory_changed',lease_until=null,version=version+1 where id=e.id;return jsonb_build_object('attention',true);end if;
 inventory:=inventory||jsonb_build_array(prior_attachment);
 end if;end loop;
 update wm.inbound_emails set state=case when (p_capture->>'complete')::boolean then 'captured' else 'partial' end,
 body_text=p_capture->>'body_text',body_html=p_capture->>'body_html',content_hash=p_capture->>'content_hash',metadata=p_capture->'metadata',attachments=inventory,
 urgent=urgent or (p_capture->>'urgent')::boolean,captured_at=clock_timestamp(),lease_until=null,next_attempt_at=clock_timestamp()+interval '10 minutes',reason=coalesce(p_capture->'metadata'->>'capture_limitation','sender_or_route_needs_review'),version=version+1 where id=p_id;
 select array_agg(id order by id) into routes from wm.inbound_routes where revoked_at is null and token_hash in (select jsonb_array_elements_text(p_capture->'route_hashes'));
 if cardinality(routes)=1 then
 select * into r from wm.inbound_routes where id=routes[1];
 select u.id into sender from auth.users u join wm.memberships m on m.user_id=u.id and m.organization_id=r.organization_id where lower(u.email)=p_capture->'metadata'->>'from' and u.email_confirmed_at is not null and m.status='active' and m.revoked_at is null order by u.id limit 1;
 if sender is not null and p_capture->'metadata'->>'dmarc'='pass' and (p_capture->>'routing_safe')::boolean and (p_capture->>'complete')::boolean and e.routing='triage' and exists(select 1 from wm.tenant_guards where organization_id=r.organization_id and access_state='open') then
 perform wm.inbound_publish(p_id,r.id,sender);update wm.inbound_emails set reason='verified_correspondence' where id=p_id;
 end if;end if;
 return jsonb_build_object('id',p_id,'state',(select state from wm.inbound_emails where id=p_id));
end $$;
create function public.wm_inbound_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;r wm.inbound_routes;e wm.inbound_emails;token text;
begin
 perform wm.require_access(p_org,'delivery');perform wm.require_recent_auth();result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='inbound.route' then
 perform wm.check_input(p_input,array['engagement_id','request_id'],array['engagement_id']);token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into wm.inbound_routes(organization_id,engagement_id,request_id,token_hash,created_by) values(p_org,(p_input->>'engagement_id')::uuid,(p_input->>'request_id')::uuid,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid()) returning * into r;
 result:=jsonb_build_object('id',r.id,'token',token);
 elsif p_command='inbound.revoke' then
 perform wm.check_input(p_input,array['route_id'],array['route_id']);update wm.inbound_routes set revoked_at=clock_timestamp() where organization_id=p_org and id=(p_input->>'route_id')::uuid returning * into r;if not found then raise exception 'Route unavailable' using errcode='42501';end if;result:=jsonb_build_object('id',r.id);
 elsif p_command in ('inbound.accept','inbound.dismiss','inbound.retry') then
 perform wm.check_input(p_input,array['id','expected_version','route_id','reason'],array['id','expected_version','reason']);
 select * into e from wm.inbound_emails where id=(p_input->>'id')::uuid for update;
 if not found or not wm.inbound_staff() then raise exception 'Current intake staff required' using errcode='42501';end if;
 if e.version<>(p_input->>'expected_version')::bigint or e.routing<>'triage' then raise exception 'Email changed' using errcode='40001';end if;
 if p_command='inbound.accept' then
 select * into r from wm.inbound_routes where organization_id=p_org and id=(p_input->>'route_id')::uuid and revoked_at is null;if not found then raise exception 'Active route required' using errcode='42501';end if;
 perform wm.inbound_publish(e.id,r.id,null);
 elsif p_command='inbound.dismiss' then update wm.inbound_emails set routing='dismissed',version=version+1 where id=e.id;
 else update wm.inbound_emails set state='queued',attempts=0,next_attempt_at=clock_timestamp(),lease_until=null,lease_generation=lease_generation+1,version=version+1 where id=e.id;
 end if;
 update wm.inbound_emails set resolved_by=auth.uid(),resolved_at=clock_timestamp(),resolution=wm.require_text(p_input->>'reason','routing evidence',2000) where id=e.id;
 result:=jsonb_build_object('id',e.id);
 else raise exception 'Unsupported inbound action' using errcode='22023';end if;
 perform wm.critical(p_org,p_command,coalesce(r.id,e.id),result-'token');return wm.finish_command(p_org,p_command,p_key,p_input,result,coalesce(r.id,e.id));
end $$;
create function wm.inbound_attachment_projection(items jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',value->>'id','name',value->>'name','state',value->>'state','reason',value->>'reason','bytes',value->'bytes','checksum',value->>'checksum')),'[]') from jsonb_array_elements(items)
$$;
create function public.wm_inbound_list(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform wm.require_access(p_org,'read');return jsonb_build_object(
 'routes',case when wm.operator_has(p_org,'delivery') then coalesce((select jsonb_agg(jsonb_build_object('id',id,'engagement_id',engagement_id,'request_id',request_id,'revoked_at',revoked_at)) from wm.inbound_routes where organization_id=p_org),'[]') else '[]'::jsonb end,
 'triage',case when wm.inbound_staff() and wm.operator_has(p_org,'delivery') then coalesce((select jsonb_agg(x) from (select id,state,routing,reason,urgent,first_seen_at,captured_at,version,metadata->>'from' as sender,metadata->>'subject' as subject,left(body_text,20000) as body_text,wm.inbound_attachment_projection(attachments) as attachments from wm.inbound_emails where routing='triage' order by urgent desc,first_seen_at limit 100) x),'[]') else '[]'::jsonb end,
 'received',coalesce((select jsonb_agg(x) from (select e.id,e.message_id,e.state,e.captured_at,wm.inbound_attachment_projection(e.attachments) as attachments from wm.inbound_emails e join wm.inbound_routes r on r.id=e.route_id where r.organization_id=p_org and e.routing='accepted' order by e.first_seen_at desc limit 100) x),'[]'));
end $$;
create function public.wm_inbound_file_access(p_org uuid,p_id uuid,p_attachment uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e wm.inbound_emails;item jsonb;
begin
 perform wm.require_access(p_org,'read');select e1.* into e from wm.inbound_emails e1 join wm.inbound_routes r on r.id=e1.route_id where e1.id=p_id and r.organization_id=p_org and e1.routing='accepted';
 if not found then raise exception 'File unavailable' using errcode='42501';end if;
 select value into item from jsonb_array_elements(e.attachments) where value->>'id'=p_attachment::text and value->>'state'='stored_unscanned';
 if item is null then raise exception 'Attachment unavailable' using errcode='42501';end if;
 insert into wm.audit_events(organization_id,actor_id,action,target_id,detail) values(p_org,auth.uid(),'inbound.unscanned_download',p_id,jsonb_build_object('attachment',p_attachment,'checksum',item->>'checksum','acknowledged',true));return item;
end $$;
revoke all on function public.wm_inbound_inventory_claim(text,text),public.wm_inbound_inventory_page(text,text,bigint,jsonb),wm.inbound_attachment_projection(jsonb),wm.inbound_staff(),wm.inbound_publish(uuid,uuid,uuid),public.wm_inbound_event_receive(text,text,text,text,jsonb,text),public.wm_inbound_claim(text,text),public.wm_inbound_capture(uuid,bigint,jsonb),public.wm_inbound_command(uuid,text,jsonb,text),public.wm_inbound_list(uuid),public.wm_inbound_file_access(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_inbound_inventory_claim(text,text),public.wm_inbound_inventory_page(text,text,bigint,jsonb) to service_role;
grant execute on function public.wm_inbound_event_receive(text,text,text,text,jsonb,text),public.wm_inbound_claim(text,text),public.wm_inbound_capture(uuid,bigint,jsonb) to service_role;
grant execute on function public.wm_inbound_command(uuid,text,jsonb,text),public.wm_inbound_list(uuid),public.wm_inbound_file_access(uuid,uuid,uuid) to authenticated;
commit;
