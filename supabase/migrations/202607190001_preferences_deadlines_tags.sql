-- TaskFlow: preferências pessoais, prazos com horário e tags normalizadas.

begin;

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light', 'dark')),
  browser_notifications_enabled boolean not null default false,
  email_due_notifications_enabled boolean not null default true,
  due_soon_minutes smallint not null default 15 check (due_soon_minutes between 5 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();

create or replace function private.create_default_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_default_preferences
  after insert on public.profiles
  for each row execute function private.create_default_user_preferences();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index tags_organization_normalized_name_unique
  on public.tags (organization_id, lower(trim(name)));

create index tags_organization_name_idx
  on public.tags (organization_id, name);

create table public.task_tags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade,
  foreign key (tag_id, organization_id)
    references public.tags(id, organization_id) on delete cascade
);

create index task_tags_organization_idx on public.task_tags(organization_id);
create index task_tags_tag_idx on public.task_tags(tag_id);

insert into public.tags (organization_id, name, created_by)
select
  source.organization_id,
  min(source.name),
  min(source.created_by::text)::uuid
from (
  select t.organization_id, trim(raw_tag) as name, t.created_by
  from public.tasks t
  cross join lateral unnest(t.tags) as raw_tag
  where char_length(trim(raw_tag)) between 1 and 50
) source
group by source.organization_id, lower(source.name)
on conflict do nothing;

insert into public.task_tags (organization_id, task_id, tag_id)
select distinct t.organization_id, t.id, tag.id
from public.tasks t
cross join lateral unnest(t.tags) as raw_tag
join public.tags tag
  on tag.organization_id = t.organization_id
 and lower(trim(tag.name)) = lower(trim(raw_tag))
on conflict do nothing;

alter table public.tasks add column deadline_at timestamptz;

alter table public.tasks disable trigger tasks_enforce_update;
alter table public.tasks disable trigger tasks_log_activity;

update public.tasks
set deadline_at = (due_date::timestamp + time '23:59') at time zone 'America/Sao_Paulo'
where due_date is not null;

alter table public.tasks enable trigger tasks_enforce_update;
alter table public.tasks enable trigger tasks_log_activity;

create index tasks_deadline_active_idx
  on public.tasks(deadline_at, assignee_id)
  where deadline_at is not null and status <> 'done';

create or replace function private.sync_task_deadline_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deadline_at is not null then
    new.due_date := (new.deadline_at at time zone 'America/Sao_Paulo')::date;
  elsif tg_op = 'INSERT' and new.due_date is not null then
    new.deadline_at := (new.due_date::timestamp + time '23:59') at time zone 'America/Sao_Paulo';
  elsif tg_op = 'UPDATE' and new.deadline_at is distinct from old.deadline_at then
    new.due_date := null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_deadline_date
  before insert or update of deadline_at on public.tasks
  for each row execute function private.sync_task_deadline_date();

create or replace function private.enforce_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.completed_at is distinct from old.completed_at
  then
    raise exception 'task ownership fields are immutable';
  end if;

  if private.is_org_admin(old.organization_id, auth.uid()) then
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;

  if old.assignee_id <> auth.uid()
    or new.team_id is distinct from old.team_id
    or new.assignee_id is distinct from old.assignee_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.due_date is distinct from old.due_date
    or new.deadline_at is distinct from old.deadline_at
    or new.tags is distinct from old.tags
  then
    raise exception 'members may only update the status of assigned tasks';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function private.sync_task_tags(
  p_task_id uuid,
  p_organization_id uuid,
  p_tag_names text[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text;
  v_tag_id uuid;
begin
  delete from public.task_tags
  where task_id = p_task_id
    and organization_id = p_organization_id;

  for v_name in
    select min(trim(value))
    from unnest(coalesce(p_tag_names, '{}'::text[])) as value
    where char_length(trim(value)) between 1 and 50
    group by lower(trim(value))
    order by lower(trim(value))
  loop
    insert into public.tags (organization_id, name, created_by)
    values (p_organization_id, v_name, auth.uid())
    on conflict do nothing
    returning id into v_tag_id;

    if v_tag_id is null then
      select id into v_tag_id
      from public.tags
      where organization_id = p_organization_id
        and lower(trim(name)) = lower(trim(v_name));
    end if;

    insert into public.task_tags (organization_id, task_id, tag_id)
    values (p_organization_id, p_task_id, v_tag_id)
    on conflict do nothing;

    v_tag_id := null;
  end loop;
end;
$$;

create or replace function public.save_task_with_tags(
  p_task_id uuid,
  p_organization_id uuid,
  p_team_id uuid,
  p_assignee_id uuid,
  p_title text,
  p_description text,
  p_status public.task_status,
  p_priority public.task_priority,
  p_deadline_at timestamptz,
  p_tag_names text[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_task_id uuid;
  v_normalized_tags text[];
begin
  select coalesce(array_agg(name order by lower(name)), '{}'::text[])
  into v_normalized_tags
  from (
    select min(trim(value)) as name
    from unnest(coalesce(p_tag_names, '{}'::text[])) as value
    where char_length(trim(value)) between 1 and 50
    group by lower(trim(value))
  ) normalized;

  if p_task_id is null then
    insert into public.tasks (
      organization_id, team_id, assignee_id, title, description,
      status, priority, deadline_at, tags, created_by, updated_by
    )
    values (
      p_organization_id, p_team_id, p_assignee_id, trim(p_title), trim(p_description),
      p_status, p_priority, p_deadline_at, v_normalized_tags, auth.uid(), auth.uid()
    )
    returning id into v_task_id;
  else
    update public.tasks
    set team_id = p_team_id,
        assignee_id = p_assignee_id,
        title = trim(p_title),
        description = trim(p_description),
        status = p_status,
        priority = p_priority,
        deadline_at = p_deadline_at,
        tags = v_normalized_tags
    where id = p_task_id
      and organization_id = p_organization_id
    returning id into v_task_id;

    if v_task_id is null then
      raise exception 'task not found or access denied';
    end if;
  end if;

  perform private.sync_task_tags(v_task_id, p_organization_id, v_normalized_tags);
  return v_task_id;
end;
$$;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
    check (type in ('assignment', 'comment', 'due_today', 'due_tomorrow', 'due_soon', 'overdue')),
  add column email_status text not null default 'not_applicable'
    check (email_status in ('not_applicable', 'pending', 'sent', 'failed', 'skipped')),
  add column email_sent_at timestamptz,
  add column email_attempts smallint not null default 0,
  add column email_last_error text;

create index notifications_pending_email_idx
  on public.notifications(created_at)
  where email_status in ('pending', 'failed');

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
    organization_id, user_id, task_id, type, title, body,
    dedupe_key, email_status
  )
  select
    t.organization_id,
    p_user_id,
    t.id,
    case when t.deadline_at <= now() then 'overdue' else 'due_soon' end,
    left(
      case
        when t.deadline_at <= now() then concat('A tarefa ', t.title, ' está atrasada')
        else concat('A tarefa ', t.title, ' está prestes a atrasar')
      end,
      120
    ),
    concat(
      'Prazo: ',
      to_char(t.deadline_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
    ),
    concat(
      'deadline:', t.id, ':', extract(epoch from t.deadline_at)::bigint, ':',
      case when t.deadline_at <= now() then 'overdue' else 'due_soon' end
    ),
    case
      when coalesce(pref.email_due_notifications_enabled, true) then 'pending'
      else 'skipped'
    end
  from public.tasks t
  left join public.user_preferences pref on pref.user_id = p_user_id
  where t.organization_id = p_organization_id
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
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if not private.is_org_member(p_organization_id, v_user_id) then
    raise exception 'organization access denied';
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  for v_target in
    select distinct organization_id, assignee_id as user_id
    from public.tasks
    where assignee_id is not null
      and status <> 'done'
      and deadline_at is not null
      and deadline_at <= now() + interval '24 hours'
  loop
    v_total := v_total + private.refresh_due_notifications_for(
      v_target.organization_id,
      v_target.user_id
    );
  end loop;
  return v_total;
end;
$$;


alter table public.user_preferences enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

create policy user_preferences_select on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_preferences_insert on public.user_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_preferences_update on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tags_select on public.tags
  for select to authenticated
  using ((select private.is_org_member(organization_id)));
create policy tags_insert on public.tags
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_org_member(organization_id))
  );
create policy tags_update on public.tags
  for update to authenticated
  using ((select private.is_org_admin(organization_id)))
  with check ((select private.is_org_admin(organization_id)));
create policy tags_delete on public.tags
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)));

create policy task_tags_select on public.task_tags
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_tags.task_id
        and t.organization_id = task_tags.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );
create policy task_tags_insert on public.task_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_tags.task_id
        and t.organization_id = task_tags.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );
create policy task_tags_delete on public.task_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_tags.task_id
        and t.organization_id = task_tags.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

alter publication supabase_realtime add table public.user_preferences;
alter publication supabase_realtime add table public.tags;
alter publication supabase_realtime add table public.task_tags;

grant select, insert on public.user_preferences to authenticated;
grant update (theme, browser_notifications_enabled, email_due_notifications_enabled, due_soon_minutes)
  on public.user_preferences to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, delete on public.task_tags to authenticated;

revoke all on function public.save_task_with_tags(uuid, uuid, uuid, uuid, text, text, public.task_status, public.task_priority, timestamptz, text[]) from public, anon;
grant execute on function public.save_task_with_tags(uuid, uuid, uuid, uuid, text, text, public.task_status, public.task_priority, timestamptz, text[]) to authenticated;

revoke all on function public.refresh_due_notifications(uuid) from public, anon;
grant execute on function public.refresh_due_notifications(uuid) to authenticated;
revoke all on function public.refresh_due_notifications_all() from public, anon, authenticated;
grant execute on function public.refresh_due_notifications_all() to service_role;

commit;
