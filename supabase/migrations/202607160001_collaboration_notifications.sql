-- TaskFlow: colaboração, anexos privados e notificações.

begin;

alter table public.tasks
  add constraint tasks_id_organization_unique unique (id, organization_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade
);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid,
  type text not null check (type in ('assignment', 'comment', 'due_today', 'due_tomorrow', 'overdue')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade,
  unique (user_id, dedupe_key)
);

create index task_comments_task_idx on public.task_comments(task_id, created_at);
create index task_attachments_task_idx on public.task_attachments(task_id, created_at);
create index notifications_user_idx on public.notifications(user_id, organization_id, read_at, created_at desc);

alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_attachments;
alter publication supabase_realtime add table public.notifications;

create trigger task_comments_touch_updated_at
  before update on public.task_comments
  for each row execute function public.touch_updated_at();

alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;

create policy task_comments_select on public.task_comments
  for select to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_comments.task_id
        and t.organization_id = task_comments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_comments_insert on public.task_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.tasks t
      where t.id = task_comments.task_id
        and t.organization_id = task_comments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_comments_update on public.task_comments
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.tasks t
      where t.id = task_comments.task_id
        and t.organization_id = task_comments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  )
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.tasks t
      where t.id = task_comments.task_id
        and t.organization_id = task_comments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_comments_delete on public.task_comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.is_org_admin(organization_id))
  );

create policy task_attachments_select on public.task_attachments
  for select to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and t.organization_id = task_attachments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_attachments_insert on public.task_attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and t.organization_id = task_attachments.organization_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_attachments_delete on public.task_attachments
  for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or (select private.is_org_admin(organization_id))
  );

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.task_comments to authenticated;
grant update (body) on public.task_comments to authenticated;
grant select, insert, delete on public.task_attachments to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'task-attachments',
  'task-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy task_attachments_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.tasks t
      where t.organization_id = ((storage.foldername(name))[1])::uuid
        and t.id = ((storage.foldername(name))[2])::uuid
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_attachments_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.tasks t
      where t.organization_id = ((storage.foldername(name))[1])::uuid
        and t.id = ((storage.foldername(name))[2])::uuid
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy task_attachments_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.task_attachments a
      where a.storage_path = name
        and (
          a.uploaded_by = (select auth.uid())
          or (select private.is_org_admin(a.organization_id))
        )
    )
  );

create or replace function private.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is not null
    and new.assignee_id is distinct from auth.uid()
    and (
      tg_op = 'INSERT'
      or new.assignee_id is distinct from old.assignee_id
    )
  then
    insert into public.notifications (
      organization_id,
      user_id,
      task_id,
      type,
      title,
      body
    )
    values (
      new.organization_id,
      new.assignee_id,
      new.id,
      'assignment',
      'Nova tarefa atribuída',
      new.title
    );
  end if;

  return new;
end;
$$;

create trigger tasks_notify_assignment
  after insert or update of assignee_id on public.tasks
  for each row execute function private.notify_task_assignment();

create or replace function private.notify_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task
  from public.tasks
  where id = new.task_id;

  insert into public.notifications (
    organization_id,
    user_id,
    task_id,
    type,
    title,
    body
  )
  select
    new.organization_id,
    recipient.user_id,
    new.task_id,
    'comment',
    'Novo comentário',
    left(concat(v_task.title, ': ', new.body), 500)
  from (
    select v_task.assignee_id as user_id
    union
    select v_task.created_by as user_id
  ) recipient
  where recipient.user_id is not null
    and recipient.user_id is distinct from new.author_id;

  return new;
end;
$$;

create trigger task_comments_notify
  after insert on public.task_comments
  for each row execute function private.notify_task_comment();

create or replace function public.refresh_due_notifications(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not private.is_org_member(p_organization_id, v_user_id) then
    raise exception 'organization access denied';
  end if;

  insert into public.notifications (
    organization_id,
    user_id,
    task_id,
    type,
    title,
    body,
    dedupe_key
  )
  select
    t.organization_id,
    v_user_id,
    t.id,
    case
      when t.due_date < current_date then 'overdue'
      when t.due_date = current_date then 'due_today'
      else 'due_tomorrow'
    end,
    case
      when t.due_date < current_date then 'Tarefa atrasada'
      when t.due_date = current_date then 'Tarefa vence hoje'
      else 'Tarefa vence amanhã'
    end,
    t.title,
    concat(
      'due:',
      t.id,
      ':',
      current_date,
      ':',
      case
        when t.due_date < current_date then 'overdue'
        when t.due_date = current_date then 'today'
        else 'tomorrow'
      end
    )
  from public.tasks t
  where t.organization_id = p_organization_id
    and t.assignee_id = v_user_id
    and t.status <> 'done'
    and t.due_date is not null
    and t.due_date <= current_date + 1
  on conflict (user_id, dedupe_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.refresh_due_notifications(uuid) from public, anon;
grant execute on function public.refresh_due_notifications(uuid) to authenticated;

commit;
