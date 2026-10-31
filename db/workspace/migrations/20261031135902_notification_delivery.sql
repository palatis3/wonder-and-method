begin;
alter table wm.notification_preferences add column timezone text;
create table wm.notification_channels(
 id text primary key,account_id text not null,environment text not null check(environment in ('production','staging')),
 from_address text not null,workspace_origin text not null,enabled boolean not null default false,
 check(id ~ '^[a-z0-9_-]{1,60}$'),check(workspace_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$')
);
create table wm.notification_routes(organization_id uuid primary key references wm.organizations(id),channel_id text not null references wm.notification_channels(id));
create table wm.notification_batches(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),recipient_id uuid not null,
 cadence text not null check(cadence in ('daily','weekly')),timezone text not null,preference_version bigint not null,
 recovery_generation bigint not null,external_generation text not null,
 period_start timestamptz not null,period_end timestamptz not null,due_at timestamptz not null,
 state text not null default 'pending' check(state in ('pending','leased','enqueued','cancelled','attention')),
 lease_generation bigint not null default 0,lease_until timestamptz,operation_id uuid,last_error text,
 primary key(organization_id,id),unique(organization_id,recipient_id,cadence,timezone,preference_version,period_start,recovery_generation,external_generation),
 foreign key(organization_id,recipient_id) references wm.memberships(organization_id,user_id),
 foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create index notification_due on wm.notification_batches(due_at,id) where state in ('pending','leased');
create table wm.notification_items(
 organization_id uuid not null,recipient_id uuid not null,message_id uuid not null,batch_id uuid not null,
 primary key(organization_id,recipient_id,message_id),foreign key(organization_id,message_id) references wm.messages(organization_id,id),
 foreign key(organization_id,batch_id) references wm.notification_batches(organization_id,id)
);
create table wm.notification_notices(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),recipient_id uuid not null,receipt_id uuid not null,
 notice_type text not null check(notice_type in ('security_access_changed','authority_changed','stop_recorded','service_changed')),
 email_at_creation text not null,primary key(organization_id,id),unique(organization_id,receipt_id,recipient_id),
 foreign key(organization_id,receipt_id) references wm.critical_receipts(organization_id,id)
);
create table wm.notification_sends(
 organization_id uuid not null,operation_id uuid not null,attempt_id uuid not null,recipient_id uuid,
 channel_id text not null references wm.notification_channels(id),account_id text not null,environment text not null,
 address_hash text not null,message jsonb not null,message_hash text not null,first_reserved_at timestamptz not null default clock_timestamp(),
 idempotency_key text not null,provider_id uuid,conflicted boolean not null default false,
 read_after timestamptz not null default now(),read_lease_until timestamptz,read_generation bigint not null default 0,last_error text,
 primary key(organization_id,operation_id),unique(channel_id,provider_id),
 foreign key(organization_id,operation_id) references wm.operations(organization_id,id),foreign key(organization_id,attempt_id) references wm.operation_attempts(organization_id,id)
);
create table wm.notification_webhooks(
 channel_id text not null references wm.notification_channels(id),event_id text not null,raw_hash text not null,payload jsonb not null,key_version text not null,
 received_at timestamptz not null default now(),primary key(channel_id,event_id)
);
create table wm.notification_anomalies(
 channel_id text not null,event_id text not null,raw_hash text not null,reason text not null,created_at timestamptz not null default now(),
 primary key(channel_id,event_id,raw_hash),foreign key(channel_id,event_id) references wm.notification_webhooks(channel_id,event_id)
);
create table wm.notification_observations(
 organization_id uuid not null,operation_id uuid not null,id bigint generated always as identity,
 source text not null,source_key text not null,event_type text not null,observed_at timestamptz not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,operation_id,source,source_key),
 foreign key(organization_id,operation_id) references wm.notification_sends(organization_id,operation_id)
);
create table wm.notification_blocks(
 channel_id text not null references wm.notification_channels(id),address_hash text not null,reason text not null,created_at timestamptz not null default now(),
 primary key(channel_id,address_hash)
);
create table wm.notification_exception_notes(
 organization_id uuid not null,operation_id uuid not null,id uuid not null default gen_random_uuid(),actor_id uuid not null,note text not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,operation_id) references wm.operations(organization_id,id)
);
create function wm.notification_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Notification evidence is immutable' using errcode='42501';end $$;
do $$declare n text;begin
 foreach n in array array['notification_channels','notification_routes','notification_batches','notification_items','notification_notices','notification_sends','notification_webhooks','notification_anomalies','notification_observations','notification_blocks','notification_exception_notes'] loop
  execute format('alter table wm.%I enable row level security',n);execute format('revoke all on wm.%I from public,anon,authenticated,service_role',n);
 end loop;
 foreach n in array array['notification_items','notification_notices','notification_webhooks','notification_anomalies','notification_observations','notification_blocks','notification_exception_notes'] loop
  execute format('create trigger notification_immutable before update or delete on wm.%I for each row execute function wm.notification_immutable()',n);
 end loop;
end $$;

create function wm.notification_collect(msg wm.messages) returns void language plpgsql volatile security definer set search_path='' as $$
declare r record;g wm.tenant_guards;zone text;start_local timestamp;start_at timestamptz;end_at timestamptz;batch uuid;
begin
 if msg.visibility<>'shared' or msg.direction='inbound' then return;end if;
 select * into g from wm.tenant_guards where organization_id=msg.organization_id for update;
 for r in select m.user_id,coalesce(p.digest,'daily') as cadence,coalesce(p.timezone,o.timezone) as timezone,coalesce(p.version,0) as preference_version
  from wm.memberships m join wm.organizations o on o.id=m.organization_id left join wm.notification_preferences p on p.organization_id=m.organization_id and p.user_id=m.user_id
  where m.organization_id=msg.organization_id and m.status='active' and m.revoked_at is null and m.user_id is distinct from msg.sender_user_id
   and coalesce(p.email_enabled,true) and coalesce(p.digest,'daily')<>'none' loop
  -- A different recipient's unsent legacy job must not requeue this recipient's
  -- already registered/unknown/sent copy during migration backfill.
  if exists(select 1 from wm.operations o where o.organization_id=msg.organization_id and o.kind='message_notify'
   and o.payload->>'message_id'=msg.id::text and o.payload->>'recipient_id'=r.user_id::text
   and (o.state in ('in_flight','unknown','verified') or exists(select 1 from wm.operation_attempts a where a.organization_id=o.organization_id and a.operation_id=o.id))) then continue;end if;
  zone:=r.timezone;start_local:=date_trunc(case when r.cadence='weekly' then 'week' else 'day' end,msg.created_at at time zone zone);
  start_at:=start_local at time zone zone;end_at:=(start_local+case when r.cadence='weekly' then interval '7 days' else interval '1 day' end) at time zone zone;
  insert into wm.notification_batches(organization_id,recipient_id,cadence,timezone,preference_version,period_start,period_end,due_at,recovery_generation,external_generation)
   values(msg.organization_id,r.user_id,r.cadence,zone,r.preference_version,start_at,end_at,end_at,g.recovery_generation,g.external_generation) on conflict do nothing;
  select id into batch from wm.notification_batches where organization_id=msg.organization_id and recipient_id=r.user_id and cadence=r.cadence and timezone=zone and preference_version=r.preference_version and period_start=start_at and recovery_generation=g.recovery_generation and external_generation=g.external_generation;
  insert into wm.notification_items values(msg.organization_id,r.user_id,msg.id,batch) on conflict do nothing;
 end loop;
end $$;
create or replace function wm.message_jobs() returns trigger language plpgsql security definer set search_path='' as $$
begin perform wm.notification_collect(new);return new;end $$;

create function wm.notification_preference_fence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from wm.tenant_guards where organization_id=new.organization_id for update;
 update wm.notification_batches set state='cancelled',last_error='preference_changed' where organization_id=new.organization_id and recipient_id=new.user_id and preference_version<>new.version and state in ('pending','leased');
 update wm.operations o set state='cancelled',last_error_code='preference_changed',version=o.version+1 from wm.notification_batches b
  where b.organization_id=new.organization_id and b.recipient_id=new.user_id and b.preference_version<>new.version and o.organization_id=b.organization_id and o.id=b.operation_id and o.state='pending' and not exists(select 1 from wm.operation_attempts a where a.organization_id=o.organization_id and a.operation_id=o.id);
 update wm.outbox_jobs j set state='cancelled',last_error_code='preference_changed' from wm.operations o where j.organization_id=new.organization_id and o.organization_id=j.organization_id and o.id=j.operation_id and o.state='cancelled' and j.state in ('pending','leased');
 return new;
end $$;
create trigger notification_preference_fence after insert or update on wm.notification_preferences for each row execute function wm.notification_preference_fence();

create function wm.notification_receipt_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;notice uuid;kind_name text;address text;
begin
 kind_name:=case when new.event_type='member.change' then 'security_access_changed' when new.event_type in ('authority.assign','authority.revoke') then 'authority_changed' when new.event_type='ads.stop' then 'stop_recorded' when new.event_type in ('service.started','engagement.closure','closure.statement_recorded') then 'service_changed' end;
 if kind_name is null then return new;end if;
 for recipient in
  select m.user_id from wm.memberships m where m.organization_id=new.organization_id and (
   (kind_name='security_access_changed' and m.user_id=(new.payload->'input'->>'user_id')::uuid)
   or (kind_name<>'security_access_changed' and m.status='active' and m.revoked_at is null and (m.role='customer_admin' or (kind_name='authority_changed' and exists(select 1 from wm.engagement_authorities a where a.organization_id=new.organization_id and a.id=new.target_id and a.user_id=m.user_id))))) loop
  select email into address from auth.users where id=recipient and email_confirmed_at is not null;
  if address is null then continue;end if;
  insert into wm.notification_notices(organization_id,recipient_id,receipt_id,notice_type,email_at_creation) values(new.organization_id,recipient,new.id,kind_name,lower(address)) on conflict do nothing returning id into notice;
  if notice is not null then perform wm.enqueue(new.organization_id,null,null,null,null,'notice_notify',jsonb_build_object('notice_id',notice),false,'notice:'||notice,recipient);end if;
 end loop;return new;
end $$;
create trigger notification_receipt_notice after insert on wm.critical_receipts for each row execute function wm.notification_receipt_notice();

alter function wm.service_context(uuid,wm.operations) rename to service_context_before_notifications;
revoke all on function wm.service_context_before_notifications(uuid,wm.operations) from public,anon,authenticated,service_role;
create function wm.service_context(org uuid,op wm.operations) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare c wm.notification_channels;b wm.notification_batches;n wm.notification_notices;p wm.notification_preferences;ctx jsonb;address text;recipient uuid;kind_name text;zone text;
begin
 if op.kind not in ('message_notify','notice_notify','invitation_notify') then return wm.service_context_before_notifications(org,op);end if;
 select ch.* into c from wm.notification_channels ch join wm.notification_routes r on r.channel_id=ch.id where r.organization_id=org and ch.enabled;
 if c.id is null then raise exception 'Notification channel unqualified' using errcode='42501';end if;
 if op.kind='invitation_notify' then
  if not exists(select 1 from wm.invitations i where i.organization_id=org and i.id=(op.payload->>'invitation_id')::uuid and i.expires_at>clock_timestamp()
   and (exists(select 1 from wm.memberships m where m.organization_id=org and m.user_id=i.invited_by and m.status='active' and m.revoked_at is null and m.role='customer_admin')
    or exists(select 1 from wm.operator_assignments a where a.organization_id=org and a.user_id=i.invited_by and a.revoked_at is null and a.active_until>clock_timestamp() and a.capabilities&&array['people','admin']::text[]))) then raise exception 'Invitation authority expired' using errcode='42501';end if;
  ctx:=wm.service_context_before_notifications(org,op);address:=ctx->>'email';recipient:=(ctx->>'identity_id')::uuid;kind_name:='invitation';
 elsif op.kind='notice_notify' then
  select * into n from wm.notification_notices where organization_id=org and id=(op.payload->>'notice_id')::uuid;
  if not found then raise exception 'Mandatory notice evidence unavailable' using errcode='42501';end if;
  if not exists(select 1 from wm.critical_receipts r join wm.tenant_guards g on g.organization_id=r.organization_id where r.organization_id=org and r.id=n.receipt_id and r.external_generation=g.external_generation) then raise exception 'Notice recovery generation changed' using errcode='42501';end if;
  recipient:=n.recipient_id;kind_name:=n.notice_type;
  select lower(email) into address from auth.users where id=recipient and email_confirmed_at is not null;
  if address is distinct from n.email_at_creation or (kind_name<>'security_access_changed' and not exists(select 1 from wm.memberships where organization_id=org and user_id=recipient and status='active' and revoked_at is null)) then raise exception 'Notice recipient no longer current' using errcode='42501';end if;
 else
  if not op.payload ? 'batch_id' then raise exception 'Legacy per-message notification requires cadence migration' using errcode='42501';end if;
  select * into b from wm.notification_batches where organization_id=org and id=(op.payload->>'batch_id')::uuid;
  if not found or b.state<>'enqueued' or b.operation_id<>op.id or b.due_at>clock_timestamp() or b.period_end+interval '7 days'<=clock_timestamp() then raise exception 'Digest unavailable or expired' using errcode='42501';end if;
  if not exists(select 1 from wm.tenant_guards where organization_id=org and recovery_generation=b.recovery_generation and external_generation=b.external_generation) then raise exception 'Digest recovery generation changed' using errcode='42501';end if;
  recipient:=b.recipient_id;kind_name:='digest';select * into p from wm.notification_preferences where organization_id=org and user_id=recipient;
  select coalesce(p.timezone,o.timezone) into zone from wm.organizations o where o.id=org;
  if coalesce(p.version,0)<>b.preference_version or coalesce(p.digest,'daily')<>b.cadence or not coalesce(p.email_enabled,true) or zone<>b.timezone then raise exception 'Digest preference changed' using errcode='42501';end if;
  select lower(u.email) into address from auth.users u join wm.memberships m on m.user_id=u.id where m.organization_id=org and m.user_id=recipient and m.status='active' and m.revoked_at is null and u.email_confirmed_at is not null;
  if not exists(select 1 from wm.notification_items i join wm.messages m on m.organization_id=i.organization_id and m.id=i.message_id where i.organization_id=org and i.batch_id=b.id and m.visibility='shared') then raise exception 'Digest audience unavailable' using errcode='42501';end if;
 end if;
 if address is null or exists(select 1 from wm.notification_blocks where channel_id=c.id and address_hash=encode(sha256(convert_to(lower(address),'UTF8')),'hex')) then raise exception 'Recipient unavailable or suppressed' using errcode='42501';end if;
 return coalesce(ctx,'{}')||jsonb_build_object('email',lower(address),'recipient_id',recipient,'notification_kind',kind_name,'channel_id',c.id,'account_id',c.account_id,'environment',c.environment,'from',c.from_address,'origin',c.workspace_origin);
end $$;

create function public.wm_notification_claim(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;begin
 perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Invalid batch limit' using errcode='22023';end if;
 with selected as (select organization_id,id from wm.notification_batches where due_at<=clock_timestamp() and (state='pending' or (state='leased' and lease_until<clock_timestamp())) order by coalesce(lease_until,due_at),id for update skip locked limit p_limit),
 claimed as (update wm.notification_batches b set state='leased',lease_generation=lease_generation+1,lease_until=clock_timestamp()+interval '2 minutes' from selected s where b.organization_id=s.organization_id and b.id=s.id returning b.organization_id,b.id,b.lease_generation)
 select coalesce(jsonb_agg(claimed),'[]') into result from claimed;return result;
end $$;
create function wm.notification_generation(org uuid,op wm.operations) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 if op.kind='message_notify' and not exists(select 1 from wm.notification_batches b join wm.tenant_guards g on g.organization_id=b.organization_id
  where b.organization_id=org and b.id=(op.payload->>'batch_id')::uuid and b.recovery_generation=g.recovery_generation and b.external_generation=g.external_generation) then
  raise exception 'Digest recovery generation changed' using errcode='42501';end if;
 if op.kind='notice_notify' and not exists(select 1 from wm.notification_notices n join wm.critical_receipts r on r.organization_id=n.organization_id and r.id=n.receipt_id
  join wm.tenant_guards g on g.organization_id=n.organization_id where n.organization_id=org and n.id=(op.payload->>'notice_id')::uuid and r.external_generation=g.external_generation) then
  raise exception 'Notice recovery generation changed' using errcode='42501';end if;
end $$;
create function public.wm_notification_prepare(p_org uuid,p_batch uuid,p_lease bigint) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare b wm.notification_batches;op uuid;ctx jsonb;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org and access_state='open' for update;
 if not found then raise exception 'Business unavailable' using errcode='42501';end if;
 select * into b from wm.notification_batches where organization_id=p_org and id=p_batch for update;
 if b.id is null or b.state<>'leased' or b.lease_generation<>p_lease or b.lease_until<=clock_timestamp() then raise exception 'Digest lease stale' using errcode='40001';end if;
 op:=wm.enqueue(p_org,null,null,null,null,'message_notify',jsonb_build_object('batch_id',b.id,'recipient_id',b.recipient_id),false,'digest:'||b.id,b.recipient_id);
 update wm.notification_batches set operation_id=op,state='enqueued' where organization_id=p_org and id=b.id;
 perform wm.notification_generation(p_org,o) from wm.operations o where organization_id=p_org and id=op;
 select wm.service_context(p_org,o) into ctx from wm.operations o where organization_id=p_org and id=op;
 return jsonb_build_object('operation_id',op);
end $$;
create function public.wm_notification_attention(p_org uuid,p_batch uuid,p_lease bigint) returns void language plpgsql volatile security definer set search_path='' as $$
begin perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 update wm.notification_batches set state='attention',last_error='review_current_recipient_preferences_or_channel' where organization_id=p_org and id=p_batch and state='leased' and lease_generation=p_lease;end $$;

create function wm.notification_message(ctx jsonb,op uuid,attempt uuid) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('from',ctx->>'from','to',jsonb_build_array(ctx->>'email'),
 'subject',case when ctx->>'notification_kind'='invitation' then 'Your Wonder and Method workspace invitation' when ctx->>'notification_kind'='security_access_changed' then 'Your Wonder and Method access changed' else 'An update is ready in your Wonder and Method workspace' end,
 'text',case when ctx->>'notification_kind'='invitation' then 'You have been invited to a Wonder and Method workspace. Sign in at '||(ctx->>'origin')||'/workspace/ to review and accept the invitation. This email does not grant business access.' else 'An update is ready in your private workspace. Sign in at '||(ctx->>'origin')||'/workspace/. Current permissions are checked there. This message contains no approval or spending authority.' end,
 'tags',jsonb_build_array(jsonb_build_object('name','workspace_operation','value',op::text),jsonb_build_object('name','workspace_attempt','value',attempt::text)))
$$;
create function public.wm_notification_reserve(p_org uuid,p_attempt uuid,p_nonce uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts;op wm.operations;ctx jsonb;msg jsonb;begin
 ctx:=public.wm_service_effect_context(p_org,p_attempt,p_nonce);
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 select * into op from wm.operations where organization_id=p_org and id=a.operation_id;
 perform wm.notification_generation(p_org,op);
 if op.kind not in ('message_notify','notice_notify','invitation_notify') or a.state<>'dispatch_reserved' or a.started_at<clock_timestamp()-interval '23 hours' then raise exception 'Notification send not eligible' using errcode='42501';end if;
 if a.dispatch_context is distinct from ctx then raise exception 'Recipient or channel changed after attempt registration' using errcode='42501';end if;
 if exists(select 1 from wm.notification_sends where organization_id=p_org and operation_id=op.id) then raise exception 'Send already reserved; reconcile unknown outcome without replay' using errcode='40001';end if;
 msg:=wm.notification_message(ctx,op.id,a.id);
 insert into wm.notification_sends(organization_id,operation_id,attempt_id,recipient_id,channel_id,account_id,environment,address_hash,message,message_hash,idempotency_key)
 values(p_org,op.id,a.id,(ctx->>'recipient_id')::uuid,ctx->>'channel_id',ctx->>'account_id',ctx->>'environment',encode(sha256(convert_to(ctx->>'email','UTF8')),'hex'),msg,wm.hash_json(msg),'workspace/'||op.id);
 return jsonb_build_object('message',msg,'idempotency_key','workspace/'||op.id,'channel_id',ctx->>'channel_id','account_id',ctx->>'account_id','environment',ctx->>'environment');
end $$;
create function public.wm_notification_bind(p_org uuid,p_attempt uuid,p_nonce uuid,p_provider uuid) returns void language plpgsql volatile security definer set search_path='' as $$
declare a wm.operation_attempts;s wm.notification_sends;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce;
 if a.id is null then raise exception 'Attempt unavailable' using errcode='42501';end if;
 select * into s from wm.notification_sends where organization_id=p_org and operation_id=a.operation_id for update;
 if s.operation_id is null or s.conflicted or (s.provider_id is not null and s.provider_id<>p_provider) then raise exception 'Provider identity conflict' using errcode='40001';end if;
 perform public.wm_attempt_checkpoint(p_org,p_attempt,p_nonce,p_provider::text);
 update wm.notification_sends set provider_id=p_provider,read_after=now() where organization_id=p_org and operation_id=s.operation_id;
end $$;
create function public.wm_notification_read_context(p_org uuid,p_operation uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;begin perform wm.require_machine();
 select jsonb_build_object('operation_id',s.operation_id,'provider_id',s.provider_id,'message',s.message,'channel_id',s.channel_id,'account_id',s.account_id,'environment',s.environment,'conflicted',s.conflicted,'attempt_id',a.id,'nonce',a.dispatch_nonce) into result
 from wm.notification_sends s join wm.operation_attempts a on a.organization_id=s.organization_id and a.id=s.attempt_id where s.organization_id=p_org and s.operation_id=p_operation;
 if result is null then raise exception 'Registered notification unavailable' using errcode='42501';end if;return result;
end $$;
create function public.wm_notification_observe(p_org uuid,p_operation uuid,p_provider uuid,p_event text,p_observed timestamptz,p_hash text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s wm.notification_sends;begin
 perform wm.require_machine();perform 1 from wm.tenant_guards where organization_id=p_org for update;
 select * into s from wm.notification_sends where organization_id=p_org and operation_id=p_operation for update;
 if s.operation_id is null or s.provider_id is distinct from p_provider or s.conflicted or p_hash !~ '^[a-f0-9]{64}$' or p_observed>clock_timestamp()+interval '1 minute' or p_observed<s.first_reserved_at then raise exception 'Bound readback required' using errcode='42501';end if;
 if p_event not in ('sent','delivered','bounced','complained','suppressed','failed','delivery_delayed','unknown') then p_event:='unknown';end if;
 insert into wm.notification_observations(organization_id,operation_id,source,source_key,event_type,observed_at) values(p_org,p_operation,'readback',p_hash,p_event,p_observed) on conflict do nothing;
 if p_event in ('bounced','complained','suppressed') then insert into wm.notification_blocks values(s.channel_id,s.address_hash,p_event,now()) on conflict do nothing;end if;
 update wm.notification_sends set read_after=clock_timestamp()+interval '6 hours',read_lease_until=null,last_error=case when p_event in ('bounced','complained','suppressed','failed','unknown') then p_event else null end where organization_id=p_org and operation_id=p_operation;
 return jsonb_build_object('recorded',true);
end $$;

create function public.wm_notification_webhook(p_channel text,p_account text,p_environment text,p_event_id text,p_raw text,p_hash text,p_key_version text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare old wm.notification_webhooks;e jsonb;s wm.notification_sends;provider uuid;op uuid;attempt uuid;event_type text;observed timestamptz;
begin
 perform wm.require_machine();
 if not exists(select 1 from wm.notification_channels where id=p_channel and account_id=p_account and environment=p_environment and enabled) then raise exception 'Outbound webhook binding unavailable' using errcode='42501';end if;
 if length(p_event_id) not between 1 and 200 or length(p_raw)>1000000 or p_hash<>encode(sha256(convert_to(p_raw,'UTF8')),'hex') then raise exception 'Raw webhook receipt invalid' using errcode='22023';end if;
 e:=p_raw::jsonb;insert into wm.notification_webhooks values(p_channel,p_event_id,p_hash,e,p_key_version,now()) on conflict do nothing;
 select * into old from wm.notification_webhooks where channel_id=p_channel and event_id=p_event_id;
 if old.raw_hash<>p_hash then
  insert into wm.notification_anomalies values(p_channel,p_event_id,p_hash,'event_hash_conflict',now()) on conflict do nothing;
  update wm.notification_sends set last_error='webhook_hash_conflict',read_after=now() where channel_id=p_channel and provider_id::text=old.payload->'data'->>'email_id';
  return jsonb_build_object('received',true,'attention',true);end if;
 event_type:=substring(e->>'type' from 7);
 if e->>'type' not in ('email.sent','email.delivered','email.bounced','email.complained','email.suppressed','email.failed','email.delivery_delayed') then return jsonb_build_object('received',true,'ignored',true);end if;
 begin provider:=(e->'data'->>'email_id')::uuid;op:=(e->'data'->'tags'->>'workspace_operation')::uuid;attempt:=(e->'data'->'tags'->>'workspace_attempt')::uuid;observed:=(e->>'created_at')::timestamptz;
 exception when others then insert into wm.notification_anomalies values(p_channel,p_event_id,p_hash,'unsupported_event_schema',now()) on conflict do nothing;return jsonb_build_object('received',true,'attention',true);end;
 select * into s from wm.notification_sends where channel_id=p_channel and ((provider_id=provider) or (operation_id=op and attempt_id=attempt)) limit 1;
 if s.operation_id is null then return jsonb_build_object('received',true,'unmatched',true);end if;
 perform 1 from wm.tenant_guards where organization_id=s.organization_id for update;
 select * into s from wm.notification_sends where organization_id=s.organization_id and operation_id=s.operation_id for update;
 if observed is null or not isfinite(observed) or observed<s.first_reserved_at-interval '1 minute' or observed>clock_timestamp()+interval '1 minute'
  or e->'data'->'to' is distinct from s.message->'to' or e->'data'->>'from' is distinct from s.message->>'from' or e->'data'->>'subject' is distinct from s.message->>'subject'
  or (s.provider_id is null and (op is distinct from s.operation_id or attempt is distinct from s.attempt_id)) then
  insert into wm.notification_anomalies values(p_channel,p_event_id,p_hash,'notification_binding_mismatch',now()) on conflict do nothing;return jsonb_build_object('received',true,'attention',true);end if;
 if s.provider_id is not null and s.provider_id<>provider then
  update wm.notification_sends set conflicted=true,last_error='provider_identity_conflict' where organization_id=s.organization_id and operation_id=s.operation_id;
  insert into wm.notification_anomalies values(p_channel,p_event_id,p_hash,'provider_identity_conflict',now()) on conflict do nothing;return jsonb_build_object('received',true,'attention',true);end if;
 update wm.notification_sends set provider_id=provider,read_after=now() where organization_id=s.organization_id and operation_id=s.operation_id;
 insert into wm.notification_observations(organization_id,operation_id,source,source_key,event_type,observed_at) values(s.organization_id,s.operation_id,'webhook',p_event_id,event_type,observed) on conflict do nothing;
 if event_type in ('bounced','complained','suppressed') then insert into wm.notification_blocks values(p_channel,s.address_hash,event_type,now()) on conflict do nothing;end if;
 return jsonb_build_object('received',true);
end $$;
create function public.wm_notification_reads_claim(p_limit integer default 10) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;begin perform wm.require_machine();if p_limit not between 1 and 25 then raise exception 'Invalid read limit' using errcode='22023';end if;
 with selected as (select organization_id,operation_id from wm.notification_sends where read_after<=clock_timestamp() and (read_lease_until is null or read_lease_until<clock_timestamp()) order by read_after,operation_id for update skip locked limit p_limit),
 claimed as (update wm.notification_sends s set read_lease_until=clock_timestamp()+interval '2 minutes',read_after=clock_timestamp()+interval '15 minutes',read_generation=read_generation+1 from selected x where s.organization_id=x.organization_id and s.operation_id=x.operation_id returning s.organization_id,s.operation_id,s.read_generation)
 select coalesce(jsonb_agg(claimed),'[]') into result from claimed;return result;end $$;

create function public.wm_notification_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;v bigint;target uuid;begin
 perform wm.require_access(p_org,'read');result:=wm.prior_command(p_org,p_command,p_key,p_input);if result is not null then return result;end if;
 if p_command='notification.preference' then
  if wm.member_role(p_org) is null then raise exception 'Current member required' using errcode='42501';end if;
  perform wm.check_input(p_input,array['digest','email_enabled','timezone','expected_version'],array['digest','email_enabled','timezone','expected_version']);
  if p_input->>'digest' not in ('daily','weekly','none') or jsonb_typeof(p_input->'email_enabled') is distinct from 'boolean' or not exists(select 1 from pg_timezone_names where name=p_input->>'timezone') or jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version') !~ '^[0-9]+$' then raise exception 'Invalid notification preference' using errcode='22023';end if;
  select version into v from wm.notification_preferences where organization_id=p_org and user_id=auth.uid();perform wm.check_version(coalesce(v,0),(p_input->>'expected_version')::bigint);
  insert into wm.notification_preferences(organization_id,user_id,digest,email_enabled,timezone) values(p_org,auth.uid(),p_input->>'digest',(p_input->>'email_enabled')::boolean,p_input->>'timezone') on conflict(organization_id,user_id) do update set digest=excluded.digest,email_enabled=excluded.email_enabled,timezone=excluded.timezone,version=wm.notification_preferences.version+1 returning version into v;target:=auth.uid();
 elsif p_command='notification.batch.retry' then
  perform wm.require_access(p_org,'delivery');perform wm.require_recent_auth();perform wm.check_input(p_input,array['batch_id','expected_generation'],array['batch_id','expected_generation']);
  if jsonb_typeof(p_input->'expected_generation') is distinct from 'number' or (p_input->>'expected_generation') !~ '^[0-9]+$' then raise exception 'Whole numeric generation required' using errcode='22023';end if;
  update wm.notification_batches set state='pending',last_error=null,lease_until=null where organization_id=p_org and id=(p_input->>'batch_id')::uuid and state='attention' and operation_id is null and lease_generation=(p_input->>'expected_generation')::bigint and period_end+interval '7 days'>clock_timestamp() returning id,lease_generation into target,v;
  if target is null then
   update wm.outbox_jobs j set state='pending',not_before=now(),lease_until=null,last_error_code=null from wm.notification_batches b,wm.operations o
    where b.organization_id=p_org and b.id=(p_input->>'batch_id')::uuid and b.state='enqueued' and b.lease_generation=(p_input->>'expected_generation')::bigint and b.period_end+interval '7 days'>clock_timestamp()
    and o.organization_id=p_org and o.id=b.operation_id and o.state='pending' and j.organization_id=p_org and j.operation_id=o.id and j.state='attention'
    and not exists(select 1 from wm.operation_attempts a where a.organization_id=p_org and a.operation_id=o.id)
    returning b.id,b.lease_generation into target,v;
  end if;
  if target is null then raise exception 'Only current unattempted preparation may be retried' using errcode='40001';end if;
 elsif p_command='notification.exception.note' then
  perform wm.require_access(p_org,'delivery');perform wm.require_recent_auth();perform wm.check_input(p_input,array['operation_id','note'],array['operation_id','note']);
  if not exists(select 1 from wm.operations where organization_id=p_org and id=(p_input->>'operation_id')::uuid and kind in ('message_notify','notice_notify','invitation_notify')) then raise exception 'Notification unavailable' using errcode='42501';end if;
  insert into wm.notification_exception_notes(organization_id,operation_id,actor_id,note) values(p_org,(p_input->>'operation_id')::uuid,auth.uid(),wm.require_text(p_input->>'note','follow-up note',2000)) returning id into target;v:=1;
 else raise exception 'Unsupported notification command' using errcode='22023';end if;
 return wm.finish_command(p_org,p_command,p_key,p_input,jsonb_build_object('id',target,'version',v),target);
end $$;
create function public.wm_notification_status(p_org uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare manages boolean;result jsonb;begin
 perform wm.require_access(p_org,'read');manages:=wm.operator_has(p_org,'delivery');
 select jsonb_build_object('preferences',(select to_jsonb(p)-'organization_id'-'user_id' from wm.notification_preferences p where p.organization_id=p_org and p.user_id=auth.uid()),'timezone',(select timezone from wm.organizations where id=p_org),'can_manage',manages,
 'batches',(select coalesce(jsonb_agg(x),'[]') from (select b.id,b.cadence,b.period_start,b.period_end,b.state,b.last_error,b.lease_generation,
  (b.period_end+interval '7 days'>clock_timestamp() and ((b.state='attention' and b.operation_id is null) or (b.state='enqueued' and exists(select 1 from wm.operations o join wm.outbox_jobs j on j.organization_id=o.organization_id and j.operation_id=o.id where o.organization_id=p_org and o.id=b.operation_id and o.state='pending' and j.state='attention' and not exists(select 1 from wm.operation_attempts a where a.organization_id=p_org and a.operation_id=o.id))))) as preparation_retryable
  from wm.notification_batches b where b.organization_id=p_org and (b.recipient_id=auth.uid() or manages) order by b.period_end desc,b.id limit 100) x),
 'deliveries',(select coalesce(jsonb_agg(x),'[]') from (select o.id,o.kind,o.state,o.created_at,coalesce(s.last_error,o.last_error_code,j.last_error_code) as attention,
  exists(select 1 from wm.notification_observations e where e.organization_id=p_org and e.operation_id=o.id and e.event_type='delivered') as delivered_to_server,
  exists(select 1 from wm.notification_observations e where e.organization_id=p_org and e.operation_id=o.id and e.event_type in ('bounced','complained','suppressed')) as blocked,
  (select coalesce(jsonb_agg(jsonb_build_object('type',e.event_type,'at',e.observed_at) order by e.observed_at),'[]') from wm.notification_observations e where e.organization_id=p_org and e.operation_id=o.id) as observations,
  case when manages then (select coalesce(jsonb_agg(jsonb_build_object('note',n.note,'at',n.created_at)),'[]') from wm.notification_exception_notes n where n.organization_id=p_org and n.operation_id=o.id) else '[]'::jsonb end as notes
  from wm.operations o left join wm.notification_sends s on s.organization_id=o.organization_id and s.operation_id=o.id left join wm.outbox_jobs j on j.organization_id=o.organization_id and j.operation_id=o.id and j.kind=o.kind
  where o.organization_id=p_org and o.kind in ('message_notify','notice_notify','invitation_notify') and (manages or s.recipient_id=auth.uid()) order by o.created_at desc,o.id limit 100) x)) into result;return result;
end $$;

-- Retire the unversioned preference writer without weakening any other command.
alter function public.wm_service_command(uuid,text,jsonb,text) rename to wm_service_command_before_notifications;
revoke all on function public.wm_service_command_before_notifications(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
create function public.wm_service_command(p_org uuid,p_command text,p_input jsonb,p_key text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if p_command='preference.save' then perform wm.require_access(p_org,'read');raise exception 'Use versioned notification.preference' using errcode='22023';end if;
 return public.wm_service_command_before_notifications(p_org,p_command,p_input,p_key);
end $$;
revoke all on function public.wm_service_command(uuid,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_service_command(uuid,text,jsonb,text) to authenticated;

-- Migration of unsent legacy jobs only. Registered/unknown sends remain historical
-- reconciliation work; never turn one into a new digest after an uncertain send.
do $$declare msg wm.messages;begin
 for msg in select distinct m.* from wm.messages m join wm.operations o on o.organization_id=m.organization_id and o.payload->>'message_id'=m.id::text
  where o.kind='message_notify' and o.state='pending' and not exists(select 1 from wm.operation_attempts a where a.organization_id=o.organization_id and a.operation_id=o.id) loop perform wm.notification_collect(msg);end loop;
 update wm.operations o set state='cancelled',last_error_code='migrated_to_digest',version=version+1 where kind='message_notify' and not payload ? 'batch_id' and state='pending' and not exists(select 1 from wm.operation_attempts a where a.organization_id=o.organization_id and a.operation_id=o.id);
 update wm.outbox_jobs j set state='cancelled' from wm.operations o where o.organization_id=j.organization_id and o.id=j.operation_id and o.last_error_code='migrated_to_digest';
end $$;
revoke all on function wm.notification_generation(uuid,wm.operations),wm.notification_immutable(),wm.notification_collect(wm.messages),wm.message_jobs(),wm.notification_preference_fence(),wm.notification_receipt_notice(),wm.service_context(uuid,wm.operations),wm.notification_message(jsonb,uuid,uuid),public.wm_notification_claim(integer),public.wm_notification_prepare(uuid,uuid,bigint),public.wm_notification_attention(uuid,uuid,bigint),public.wm_notification_reserve(uuid,uuid,uuid),public.wm_notification_bind(uuid,uuid,uuid,uuid),public.wm_notification_read_context(uuid,uuid),public.wm_notification_observe(uuid,uuid,uuid,text,timestamptz,text),public.wm_notification_webhook(text,text,text,text,text,text,text),public.wm_notification_reads_claim(integer),public.wm_notification_command(uuid,text,jsonb,text),public.wm_notification_status(uuid) from public,anon,authenticated,service_role;
grant execute on function public.wm_notification_claim(integer),public.wm_notification_prepare(uuid,uuid,bigint),public.wm_notification_attention(uuid,uuid,bigint),public.wm_notification_reserve(uuid,uuid,uuid),public.wm_notification_bind(uuid,uuid,uuid,uuid),public.wm_notification_read_context(uuid,uuid),public.wm_notification_observe(uuid,uuid,uuid,text,timestamptz,text),public.wm_notification_webhook(text,text,text,text,text,text,text),public.wm_notification_reads_claim(integer) to service_role;
grant execute on function public.wm_notification_command(uuid,text,jsonb,text),public.wm_notification_status(uuid) to authenticated;

-- Select the exact current channel before registering any attempt. Runtime
-- credentials are checked by the Worker against this machine-only projection.
create function public.wm_notification_preflight(p_org uuid,p_job uuid,p_lease_generation bigint,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;j wm.outbox_jobs;o wm.operations;
begin
 perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
 select * into j from wm.outbox_jobs where organization_id=p_org and id=p_job;
 select * into o from wm.operations where organization_id=p_org and id=j.operation_id;
 if g.access_state is distinct from 'open' or g.external_generation is distinct from p_external_generation or j.id is null or j.state<>'leased' or j.lease_generation<>p_lease_generation or j.lease_until<=clock_timestamp()
  or o.state<>'pending' or o.kind not in ('message_notify','notice_notify','invitation_notify') or o.external_generation<>g.external_generation or o.recovery_generation<>g.recovery_generation then raise exception 'Current notification lease required' using errcode='42501';end if;
 perform wm.notification_generation(p_org,o);return wm.service_context(p_org,o);
end $$;

-- New-protocol POSTs require a committed immutable notification_sends row.
-- Under the same tenant lock as reservation, its absence proves no POST was
-- authorized. Recover only that case; a reserved unknown send is never replayed.
create function public.wm_notification_no_post(p_org uuid,p_attempt uuid,p_nonce uuid,p_external_generation text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare g wm.tenant_guards;a wm.operation_attempts;o wm.operations;retry boolean:=true;failure text;
begin
 perform wm.require_machine();select * into g from wm.tenant_guards where organization_id=p_org for update;
 select * into a from wm.operation_attempts where organization_id=p_org and id=p_attempt and dispatch_nonce=p_nonce for update;
 select * into o from wm.operations where organization_id=p_org and id=a.operation_id for update;
 if g.access_state is distinct from 'open' or g.external_generation is distinct from p_external_generation or a.id is null or a.external_generation<>g.external_generation or a.recovery_generation<>g.recovery_generation
  or o.external_generation<>g.external_generation or o.recovery_generation<>g.recovery_generation then raise exception 'Current notification recovery generation required' using errcode='42501';end if;
 if o.kind not in ('message_notify','notice_notify','invitation_notify') or not a.dispatch_context ? 'channel_id' or a.provider_request_id is not null or o.provider_reference is not null
  or exists(select 1 from wm.notification_sends s where s.organization_id=p_org and s.operation_id=o.id) then return jsonb_build_object('no_post',false);end if;
 if a.state='cancelled_before_dispatch' then return jsonb_build_object('no_post',true,'requeued',false);end if;
 if a.state not in ('dispatch_reserved','unknown','observed') or o.state not in ('in_flight','unknown') then return jsonb_build_object('no_post',false);end if;
 begin perform wm.notification_generation(p_org,o);perform wm.service_context(p_org,o);
 exception when insufficient_privilege then get stacked diagnostics failure=message_text;retry:=failure='Notification channel unqualified';end;
 insert into wm.attempt_observations(organization_id,attempt_id,kind,evidence,observed_at) values(p_org,a.id,'cancelled_before_dispatch',jsonb_build_object('protocol','wm-notification-1','reservation_present',false,'reason','durable_reservation_absent'),clock_timestamp());
 update wm.operation_attempts set state='cancelled_before_dispatch',resolved_at=clock_timestamp() where organization_id=p_org and id=a.id;
 update wm.operations set state=case when retry then 'pending' else 'cancelled' end,last_error_code=case when retry then 'notification_no_post_retry' else 'notification_source_unavailable' end,version=version+1 where organization_id=p_org and id=o.id;
 update wm.outbox_jobs set state=case when retry then 'pending' else 'cancelled' end,lease_until=null,not_before=clock_timestamp()+interval '5 minutes',last_error_code='notification_no_post' where organization_id=p_org and operation_id=o.id;
 return jsonb_build_object('no_post',true,'requeued',retry);
end $$;
revoke all on function public.wm_notification_preflight(uuid,uuid,bigint,text),public.wm_notification_no_post(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.wm_notification_preflight(uuid,uuid,bigint,text),public.wm_notification_no_post(uuid,uuid,uuid,text) to service_role;
commit;
