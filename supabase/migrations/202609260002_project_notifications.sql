-- TaskFlow: preferências por evento, notificações por projeto e fila de e-mail.

begin;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'assignment', 'task_updated', 'comment', 'mention',
    'due_today', 'due_tomorrow', 'due_soon', 'overdue', 'project_invite'
  ));

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'assignment', 'task_updated', 'comment', 'mention',
    'due_soon', 'overdue', 'project_invite'
  )),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_type)
);

create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

insert into public.notification_preferences (user_id, event_type)
select p.id, event.event_type
from public.profiles p
cross join unnest(array[
  'assignment', 'task_updated', 'comment', 'mention',
  'due_soon', 'overdue', 'project_invite'
]::text[]) event(event_type)
on conflict do nothing;

create type public.delivery_channel as enum ('email');
create type public.delivery_status as enum ('pending', 'processing', 'sent', 'failed', 'skipped');

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_email extensions.citext not null,
  event_type text not null,
  channel public.delivery_channel not null default 'email',
  status public.delivery_status not null default 'pending',
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  check (notification_id is not null or invitation_id is not null)
);

create index notification_deliveries_pending_idx
  on public.notification_deliveries(next_attempt_at, created_at)
  where status in ('pending', 'failed');
create index notification_deliveries_project_idx
  on public.notification_deliveries(project_id, created_at desc);

create trigger notification_deliveries_touch_updated_at
  before update on public.notification_deliveries
  for each row execute function public.touch_updated_at();

create or replace function private.create_default_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id, event_type)
  select new.id, event_type
  from unnest(array[
    'assignment', 'task_updated', 'comment', 'mention',
    'due_soon', 'overdue', 'project_invite'
  ]::text[]) as event(event_type)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function private.notification_channel_enabled(
  p_user_id uuid,
  p_event_type text,
  p_channel text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_channel
    when 'email' then coalesce(np.email_enabled, false)
    else coalesce(np.in_app_enabled, true)
  end
  from (select 1) seed
  left join public.notification_preferences np
    on np.user_id = p_user_id and np.event_type = p_event_type;
$$;

create or replace function private.apply_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.notification_channel_enabled(new.user_id, new.type, 'in_app') then
    new.dismissed_at := coalesce(new.dismissed_at, now());
  end if;
  return new;
end;
$$;

create trigger notifications_apply_preferences
  before insert on public.notifications
  for each row execute function private.apply_notification_preferences();

create or replace function private.queue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email extensions.citext;
  v_name text;
begin
  if new.type = 'project_invite'
    or not private.notification_channel_enabled(new.user_id, new.type, 'email')
  then
    return new;
  end if;

  select email, full_name into v_email, v_name
  from public.profiles where id = new.user_id;
  if v_email is null then return new; end if;

  insert into public.notification_deliveries (
    notification_id, organization_id, project_id, recipient_user_id,
    recipient_email, event_type, dedupe_key, payload
  ) values (
    new.id, new.organization_id, new.project_id, new.user_id,
    v_email, new.type, 'notification:' || new.id,
    jsonb_build_object(
      'recipient_name', coalesce(nullif(v_name, ''), v_email::text),
      'title', new.title,
      'body', new.body,
      'task_id', new.task_id,
      'project_id', new.project_id
    )
  ) on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger notifications_queue_email
  after insert on public.notifications
  for each row execute function private.queue_notification_email();

create or replace function private.queue_invitation_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_name text;
  v_inviter_name text;
  v_existing_user uuid;
begin
  select name into v_project_name from public.projects where id = new.project_id;
  select full_name into v_inviter_name from public.profiles where id = new.invited_by;
  select id into v_existing_user from public.profiles where email = new.email limit 1;

  if v_existing_user is not null then
    insert into public.notifications (
      organization_id, project_id, user_id, type, title, body, dedupe_key
    ) values (
      new.organization_id, new.project_id, v_existing_user, 'project_invite',
      'Convite para projeto',
      left(concat(coalesce(nullif(v_inviter_name, ''), 'Um administrador'),
        ' convidou você para o projeto ', v_project_name), 500),
      'project-invite:' || new.id
    ) on conflict (user_id, dedupe_key) do nothing;
  end if;

  insert into public.notification_deliveries (
    invitation_id, organization_id, project_id, recipient_user_id,
    recipient_email, event_type, dedupe_key, payload
  ) values (
    new.id, new.organization_id, new.project_id, v_existing_user,
    new.email, 'project_invite', 'invitation:' || new.id,
    jsonb_build_object(
      'recipient_name', new.email::text,
      'title', 'Convite para o TaskFlow',
      'body', concat('Você foi convidado para participar do projeto ', v_project_name, '.'),
      'project_name', v_project_name,
      'inviter_name', coalesce(nullif(v_inviter_name, ''), 'Administrador'),
      'invite_token', new.token,
      'project_id', new.project_id
    )
  ) on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger invitations_queue_delivery
  after insert on public.invitations
  for each row execute function private.queue_invitation_delivery();

create or replace function private.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is not null
    and new.assignee_id is distinct from auth.uid()
    and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
  then
    insert into public.notifications (
      organization_id, project_id, user_id, task_id, type, title, body, dedupe_key
    ) values (
      new.organization_id, new.project_id, new.assignee_id, new.id, 'assignment',
      'Nova tarefa atribuída', new.title,
      concat('assignment:', new.id, ':', new.assignee_id, ':', extract(epoch from now())::bigint)
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status
    and new.priority is not distinct from old.priority
    and new.deadline_at is not distinct from old.deadline_at
    and new.title is not distinct from old.title
  then
    return new;
  end if;

  insert into public.notifications (
    organization_id, project_id, user_id, task_id, type, title, body, dedupe_key
  )
  select
    new.organization_id, new.project_id, recipient.user_id, new.id, 'task_updated',
    'Tarefa atualizada', new.title,
    concat('task-update:', new.id, ':', recipient.user_id, ':', extract(epoch from new.updated_at)::bigint)
  from (
    select new.assignee_id as user_id
    union select new.created_by as user_id
  ) recipient
  where recipient.user_id is not null and recipient.user_id is distinct from auth.uid()
  on conflict (user_id, dedupe_key) do nothing;
  return new;
end;
$$;

create trigger tasks_notify_update
  after update of title, status, priority, deadline_at on public.tasks
  for each row execute function private.notify_task_update();

create or replace function private.notify_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id;

  insert into public.notifications (
    organization_id, project_id, user_id, task_id, type, title, body, dedupe_key
  )
  select new.organization_id, new.project_id, recipient.user_id, new.task_id,
    'comment', 'Novo comentário', left(concat(v_task.title, ': ', new.body), 500),
    concat('comment:', new.id, ':', recipient.user_id)
  from (
    select v_task.assignee_id as user_id
    union select v_task.created_by as user_id
  ) recipient
  where recipient.user_id is not null and recipient.user_id is distinct from new.author_id
  on conflict (user_id, dedupe_key) do nothing;

  insert into public.notifications (
    organization_id, project_id, user_id, task_id, type, title, body, dedupe_key
  )
  select new.organization_id, new.project_id, pm.user_id, new.task_id,
    'mention', 'Você foi mencionado', left(concat(v_task.title, ': ', new.body), 500),
    concat('mention:', new.id, ':', pm.user_id)
  from public.project_members pm
  join public.profiles p on p.id = pm.user_id
  where pm.project_id = new.project_id
    and pm.user_id is distinct from new.author_id
    and (
      position('@' || lower(p.email::text) in lower(new.body)) > 0
      or (nullif(trim(p.full_name), '') is not null
        and position('@' || lower(trim(p.full_name)) in lower(new.body)) > 0)
    )
  on conflict (user_id, dedupe_key) do nothing;
  return new;
end;
$$;

create or replace function private.refresh_due_notifications_for(
  p_organization_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.notifications (
    organization_id, project_id, user_id, task_id, type, title, body, dedupe_key
  )
  select
    t.organization_id, t.project_id, p_user_id, t.id,
    case when t.deadline_at <= now() then 'overdue' else 'due_soon' end,
    left(case when t.deadline_at <= now()
      then concat('A tarefa ', t.title, ' está atrasada')
      else concat('A tarefa ', t.title, ' está prestes a atrasar') end, 120),
    concat('Prazo: ', to_char(t.deadline_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')),
    concat('deadline:', t.id, ':', extract(epoch from t.deadline_at)::bigint, ':',
      case when t.deadline_at <= now() then 'overdue' else 'due_soon' end)
  from public.tasks t
  left join public.user_preferences pref on pref.user_id = p_user_id
  where t.project_id = p_organization_id
    and t.assignee_id = p_user_id
    and t.status <> 'done'
    and t.deadline_at is not null
    and t.deadline_at <= now() + make_interval(mins => coalesce(pref.due_soon_minutes, 15))
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.refresh_due_notifications(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  -- O nome antigo do argumento é mantido por compatibilidade do PostgREST;
  -- o valor agora representa o projeto ativo.
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not private.is_project_member(p_organization_id, v_user_id) then
    raise exception 'project access denied';
  end if;
  return private.refresh_due_notifications_for(p_organization_id, v_user_id);
end;
$$;

create or replace function public.refresh_due_notifications_all()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target record;
  v_total integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  for v_target in
    select distinct project_id, assignee_id as user_id
    from public.tasks
    where assignee_id is not null and status <> 'done' and deadline_at is not null
      and deadline_at <= now() + interval '24 hours'
  loop
    v_total := v_total + private.refresh_due_notifications_for(v_target.project_id, v_target.user_id);
  end loop;
  return v_total;
end;
$$;

create or replace function public.claim_email_deliveries(p_limit integer default 50)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service role required'; end if;
  return query
  with candidates as (
    select id from public.notification_deliveries
    where status in ('pending', 'failed')
      and attempt_count < 3
      and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  update public.notification_deliveries d
  set status = 'processing', claimed_at = now(), attempt_count = attempt_count + 1
  from candidates c
  where d.id = c.id
  returning d.*;
end;
$$;

alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

create policy notification_preferences_select on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notification_preferences_update on public.notification_preferences
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy notification_deliveries_select on public.notification_deliveries
  for select to authenticated using ((select private.is_project_admin(project_id)));

grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_deliveries to authenticated;
revoke all on function public.claim_email_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_email_deliveries(integer) to service_role;

alter publication supabase_realtime add table public.notification_preferences;

commit;
