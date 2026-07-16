-- TaskFlow: data confiável de conclusão para indicadores gerenciais.

begin;

alter table public.tasks
  add column completed_at timestamptz;

alter table public.tasks disable trigger tasks_enforce_update;
alter table public.tasks disable trigger tasks_log_activity;

update public.tasks
set completed_at = updated_at
where status = 'done'
  and completed_at is null;

alter table public.tasks enable trigger tasks_enforce_update;
alter table public.tasks enable trigger tasks_log_activity;

create index tasks_completed_at_idx
  on public.tasks(organization_id, completed_at desc)
  where status = 'done';

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
    or new.tags is distinct from old.tags
  then
    raise exception 'members may only update the status of assigned tasks';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function private.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.completed_at := now();
    else
      new.completed_at := null;
    end if;
  elsif new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger tasks_set_completed_at
  before insert or update of status on public.tasks
  for each row execute function private.set_task_completed_at();

commit;
