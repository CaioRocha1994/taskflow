-- TaskFlow: projetos independentes dentro de cada empresa.

begin;

create type public.project_status as enum ('active', 'inactive');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  status public.project_status not null default 'active',
  color text not null default '#d71920' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'briefcase' check (char_length(icon) between 1 and 40),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table public.project_members (
  organization_id uuid not null,
  project_id uuid not null,
  user_id uuid not null,
  role public.membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.organization_members(organization_id, user_id) on delete cascade
);

create index projects_organization_idx on public.projects(organization_id, status, name);
create index project_members_user_idx on public.project_members(user_id, organization_id);

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- Cada empresa existente recebe um projeto inicial; nada é apagado ou recriado.
insert into public.projects (organization_id, name, description, created_by)
select o.id, 'Projeto principal', 'Projeto criado automaticamente durante a migração.', o.created_by
from public.organizations o;

insert into public.project_members (organization_id, project_id, user_id, role, joined_at)
select om.organization_id, p.id, om.user_id, om.role, om.joined_at
from public.organization_members om
join public.projects p on p.organization_id = om.organization_id;

alter table public.teams add column project_id uuid;
alter table public.team_members add column project_id uuid;
alter table public.tasks add column project_id uuid;
alter table public.task_activity add column project_id uuid;
alter table public.invitations add column project_id uuid;
alter table public.tags add column project_id uuid;
alter table public.task_tags add column project_id uuid;
alter table public.task_comments add column project_id uuid;
alter table public.task_attachments add column project_id uuid;
alter table public.notifications add column project_id uuid;

update public.teams t
set project_id = p.id
from public.projects p
where p.organization_id = t.organization_id;

update public.team_members tm
set project_id = t.project_id
from public.teams t
where t.id = tm.team_id;

alter table public.tasks disable trigger tasks_enforce_update;
alter table public.tasks disable trigger tasks_log_activity;
update public.tasks t
set project_id = tm.project_id
from public.teams tm
where tm.id = t.team_id;
alter table public.tasks enable trigger tasks_enforce_update;
alter table public.tasks enable trigger tasks_log_activity;

update public.task_activity a
set project_id = t.project_id
from public.tasks t
where t.id = a.task_id;

update public.task_activity a
set project_id = p.id
from public.projects p
where a.project_id is null and p.organization_id = a.organization_id;

update public.invitations i
set project_id = t.project_id
from public.teams t
where t.id = i.team_id;

update public.invitations i
set project_id = p.id
from public.projects p
where i.project_id is null and p.organization_id = i.organization_id;

update public.tags tag
set project_id = p.id
from public.projects p
where p.organization_id = tag.organization_id;

update public.task_tags tt
set project_id = t.project_id
from public.tasks t
where t.id = tt.task_id;

update public.task_comments c
set project_id = t.project_id
from public.tasks t
where t.id = c.task_id;

update public.task_attachments a
set project_id = t.project_id
from public.tasks t
where t.id = a.task_id;

update public.notifications n
set project_id = t.project_id
from public.tasks t
where t.id = n.task_id;

update public.notifications n
set project_id = p.id
from public.projects p
where n.project_id is null and p.organization_id = n.organization_id;

alter table public.teams alter column project_id set not null;
alter table public.team_members alter column project_id set not null;
alter table public.tasks alter column project_id set not null;
alter table public.task_activity alter column project_id set not null;
alter table public.invitations alter column project_id set not null;
alter table public.tags alter column project_id set not null;
alter table public.task_tags alter column project_id set not null;
alter table public.task_comments alter column project_id set not null;
alter table public.task_attachments alter column project_id set not null;
alter table public.notifications alter column project_id set not null;

-- As relações antigas por empresa são substituídas pelas relações mais estritas por projeto.
alter table public.team_members drop constraint team_members_team_id_organization_id_fkey;
alter table public.tasks drop constraint tasks_team_id_organization_id_fkey;
alter table public.invitations drop constraint invitations_team_id_organization_id_fkey;
alter table public.task_tags drop constraint task_tags_task_id_organization_id_fkey;
alter table public.task_tags drop constraint task_tags_tag_id_organization_id_fkey;
alter table public.task_comments drop constraint task_comments_task_id_organization_id_fkey;
alter table public.task_attachments drop constraint task_attachments_task_id_organization_id_fkey;
alter table public.notifications drop constraint notifications_task_id_organization_id_fkey;

alter table public.teams drop constraint teams_organization_id_name_key;
alter table public.teams
  add constraint teams_project_name_unique unique (project_id, name),
  add constraint teams_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint teams_id_project_unique unique (id, project_id);

alter table public.team_members
  add constraint team_members_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint team_members_team_project_fk foreign key (team_id, project_id)
    references public.teams(id, project_id) on delete cascade,
  add constraint team_members_project_user_fk foreign key (project_id, user_id)
    references public.project_members(project_id, user_id) on delete cascade;

alter table public.tasks
  add constraint tasks_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint tasks_team_project_fk foreign key (team_id, project_id)
    references public.teams(id, project_id) on delete restrict,
  add constraint tasks_id_project_unique unique (id, project_id),
  add constraint tasks_id_organization_project_unique unique (id, organization_id, project_id);

alter table public.task_activity
  add constraint task_activity_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade;

alter table public.invitations
  add constraint invitations_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint invitations_team_project_fk foreign key (team_id, project_id)
    references public.teams(id, project_id) on delete cascade;

alter table public.tags
  add constraint tags_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint tags_id_project_unique unique (id, project_id);
drop index tags_organization_normalized_name_unique;
create unique index tags_project_normalized_name_unique
  on public.tags(project_id, lower(trim(name)));

alter table public.task_tags
  add constraint task_tags_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint task_tags_task_project_fk foreign key (task_id, project_id)
    references public.tasks(id, project_id) on delete cascade,
  add constraint task_tags_tag_project_fk foreign key (tag_id, project_id)
    references public.tags(id, project_id) on delete cascade;

alter table public.task_comments
  add constraint task_comments_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint task_comments_task_project_fk foreign key (task_id, project_id)
    references public.tasks(id, project_id) on delete cascade;

alter table public.task_attachments
  add constraint task_attachments_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint task_attachments_task_project_fk foreign key (task_id, project_id)
    references public.tasks(id, project_id) on delete cascade;

alter table public.notifications
  add constraint notifications_project_organization_fk foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  add constraint notifications_task_project_fk foreign key (task_id, project_id)
    references public.tasks(id, project_id) on delete cascade;

create index teams_project_idx on public.teams(project_id, name);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_project_assignee_idx on public.tasks(project_id, assignee_id);
create index tags_project_name_idx on public.tags(project_id, name);
create index notifications_project_user_idx on public.notifications(project_id, user_id, created_at desc);

create or replace function private.is_project_member(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and p.status = 'active'
  );
$$;

create or replace function private.is_project_admin(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and pm.role in ('owner', 'admin')
      and p.status = 'active'
  );
$$;

create or replace function private.is_team_member(p_team_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = p_user_id
      and private.is_project_member(tm.project_id, p_user_id)
  );
$$;

create or replace function private.can_view_task(
  p_organization_id uuid,
  p_team_id uuid,
  p_assignee_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and t.organization_id = p_organization_id
      and (
        private.is_project_admin(t.project_id, p_user_id)
        or (
          p_assignee_id = p_user_id
          and private.is_team_member(p_team_id, p_user_id)
        )
      )
  );
$$;

grant execute on function private.is_project_member(uuid, uuid) to authenticated;
grant execute on function private.is_project_admin(uuid, uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy projects_select on public.projects
  for select to authenticated
  using ((select private.is_project_member(id)));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (select private.is_org_admin(organization_id)));
create policy projects_update on public.projects
  for update to authenticated
  using ((select private.is_project_admin(id)))
  with check ((select private.is_project_admin(id)));

create policy project_members_select on public.project_members
  for select to authenticated
  using ((select private.is_project_member(project_id)));
create policy project_members_insert on public.project_members
  for insert to authenticated
  with check ((select private.is_project_admin(project_id)) and role <> 'owner');
create policy project_members_update on public.project_members
  for update to authenticated
  using ((select private.is_project_admin(project_id)) and role <> 'owner')
  with check ((select private.is_project_admin(project_id)) and role <> 'owner');
create policy project_members_delete on public.project_members
  for delete to authenticated
  using ((select private.is_project_admin(project_id)) and role <> 'owner');

create or replace function private.enforce_project_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'project ownership fields are immutable';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_update
  before update on public.projects
  for each row execute function private.enforce_project_update();

drop policy teams_select on public.teams;
drop policy teams_insert on public.teams;
drop policy teams_update on public.teams;
drop policy teams_delete on public.teams;
create policy teams_select on public.teams for select to authenticated
  using ((select private.is_project_member(project_id)));
create policy teams_insert on public.teams for insert to authenticated
  with check ((select private.is_project_admin(project_id)));
create policy teams_update on public.teams for update to authenticated
  using ((select private.is_project_admin(project_id)))
  with check ((select private.is_project_admin(project_id)));
create policy teams_delete on public.teams for delete to authenticated
  using ((select private.is_project_admin(project_id)));

drop policy team_members_select on public.team_members;
drop policy team_members_insert on public.team_members;
drop policy team_members_delete on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using ((select private.is_project_member(project_id)));
create policy team_members_insert on public.team_members for insert to authenticated
  with check ((select private.is_project_admin(project_id)));
create policy team_members_delete on public.team_members for delete to authenticated
  using ((select private.is_project_admin(project_id)));

drop policy tasks_insert on public.tasks;
drop policy tasks_delete on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and (
      (select private.is_project_admin(project_id))
      or (assignee_id = (select auth.uid()) and (select private.is_team_member(team_id)))
    )
  );
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select private.is_project_admin(project_id)));

drop policy task_activity_select on public.task_activity;
create policy task_activity_select on public.task_activity for select to authenticated
  using (
    (select private.is_project_admin(project_id))
    or exists (
      select 1 from public.tasks t
      where t.id = task_activity.task_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

drop policy task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_project_admin(project_id)));

drop policy task_attachments_delete on public.task_attachments;
create policy task_attachments_delete on public.task_attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()) or (select private.is_project_admin(project_id)));

drop policy tags_select on public.tags;
drop policy tags_insert on public.tags;
drop policy tags_update on public.tags;
drop policy tags_delete on public.tags;
create policy tags_select on public.tags for select to authenticated
  using ((select private.is_project_member(project_id)));
create policy tags_insert on public.tags for insert to authenticated
  with check (created_by = (select auth.uid()) and (select private.is_project_member(project_id)));
create policy tags_update on public.tags for update to authenticated
  using ((select private.is_project_admin(project_id)))
  with check ((select private.is_project_admin(project_id)));
create policy tags_delete on public.tags for delete to authenticated
  using ((select private.is_project_admin(project_id)));

drop policy invitations_select on public.invitations;
drop policy invitations_insert on public.invitations;
drop policy invitations_delete on public.invitations;
create policy invitations_select on public.invitations for select to authenticated
  using ((select private.is_project_admin(project_id)));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    (select private.is_project_admin(project_id))
    and invited_by = (select auth.uid())
    and role <> 'owner'
  );
create policy invitations_delete on public.invitations for delete to authenticated
  using ((select private.is_project_admin(project_id)));

create or replace function private.enforce_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.project_id is distinct from old.project_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.completed_at is distinct from old.completed_at
  then
    raise exception 'task ownership fields are immutable';
  end if;

  if private.is_project_admin(old.project_id, auth.uid()) then
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

create or replace function private.validate_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.teams t
    where t.id = new.team_id
      and t.project_id = new.project_id
      and t.organization_id = new.organization_id
  ) then
    raise exception 'the selected team does not belong to this project';
  end if;
  if new.assignee_id is not null
    and not private.is_team_member(new.team_id, new.assignee_id)
  then
    raise exception 'the assignee must belong to the selected team';
  end if;
  return new;
end;
$$;

create or replace function private.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (organization_id, project_id, task_id, actor_id, action, after_data)
    values (new.organization_id, new.project_id, new.id, auth.uid(), 'created', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.task_activity (organization_id, project_id, task_id, actor_id, action, before_data, after_data)
    values (new.organization_id, new.project_id, new.id, auth.uid(), 'updated', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.task_activity (organization_id, project_id, task_id, actor_id, action, before_data)
    values (old.organization_id, old.project_id, old.id, auth.uid(), 'deleted', to_jsonb(old));
    return old;
  end if;
end;
$$;

create or replace function public.create_project(
  p_organization_id uuid,
  p_name text,
  p_description text default '',
  p_color text default '#d71920',
  p_icon text default 'briefcase'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_team_id uuid;
begin
  if v_user_id is null or not private.is_org_admin(p_organization_id, v_user_id) then
    raise exception 'organization admin access required';
  end if;

  insert into public.projects (organization_id, name, description, color, icon, created_by)
  values (p_organization_id, trim(p_name), trim(coalesce(p_description, '')), p_color, p_icon, v_user_id)
  returning id into v_project_id;

  insert into public.project_members (organization_id, project_id, user_id, role)
  values (p_organization_id, v_project_id, v_user_id, 'owner');

  insert into public.teams (organization_id, project_id, name)
  values (p_organization_id, v_project_id, 'Geral')
  returning id into v_team_id;

  insert into public.team_members (organization_id, project_id, team_id, user_id)
  values (p_organization_id, v_project_id, v_team_id, v_user_id);

  return v_project_id;
end;
$$;

create or replace function public.create_organization(p_name text, p_team_name text default 'Geral')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_project_id uuid;
  v_team_id uuid;
  v_slug text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'organization name is too short'; end if;

  v_slug := coalesce(
    nullif(trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')), ''),
    'empresa'
  ) || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), v_slug, v_user_id)
  returning id into v_organization_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');
  insert into public.projects (organization_id, name, description, created_by)
  values (v_organization_id, 'Projeto principal', 'Primeiro projeto da empresa.', v_user_id)
  returning id into v_project_id;
  insert into public.project_members (organization_id, project_id, user_id, role)
  values (v_organization_id, v_project_id, v_user_id, 'owner');
  insert into public.teams (organization_id, project_id, name)
  values (v_organization_id, v_project_id, coalesce(nullif(trim(p_team_name), ''), 'Geral'))
  returning id into v_team_id;
  insert into public.team_members (organization_id, project_id, team_id, user_id)
  values (v_organization_id, v_project_id, v_team_id, v_user_id);
  return v_organization_id;
end;
$$;

create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email extensions.citext;
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  select email into v_email from auth.users where id = v_user_id;
  select * into v_invitation from public.invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if not found or v_invitation.email <> v_email then
    raise exception 'invalid or expired invitation';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, 'member')
  on conflict (organization_id, user_id) do nothing;
  insert into public.project_members (organization_id, project_id, user_id, role)
  values (v_invitation.organization_id, v_invitation.project_id, v_user_id, v_invitation.role)
  on conflict (project_id, user_id) do update set role = excluded.role;
  if v_invitation.team_id is not null then
    insert into public.team_members (organization_id, project_id, team_id, user_id)
    values (v_invitation.organization_id, v_invitation.project_id, v_invitation.team_id, v_user_id)
    on conflict (team_id, user_id) do nothing;
  end if;
  update public.invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.project_id;
end;
$$;

create or replace function private.sync_task_tags(
  p_task_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
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
  where task_id = p_task_id and project_id = p_project_id;

  for v_name in
    select min(trim(value))
    from unnest(coalesce(p_tag_names, '{}'::text[])) as value
    where char_length(trim(value)) between 1 and 50
    group by lower(trim(value))
    order by lower(trim(value))
  loop
    insert into public.tags (organization_id, project_id, name, created_by)
    values (p_organization_id, p_project_id, v_name, auth.uid())
    on conflict do nothing
    returning id into v_tag_id;
    if v_tag_id is null then
      select id into v_tag_id from public.tags
      where project_id = p_project_id and lower(trim(name)) = lower(trim(v_name));
    end if;
    insert into public.task_tags (organization_id, project_id, task_id, tag_id)
    values (p_organization_id, p_project_id, p_task_id, v_tag_id)
    on conflict do nothing;
    v_tag_id := null;
  end loop;
end;
$$;

create or replace function public.save_project_task_with_tags(
  p_task_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
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
      organization_id, project_id, team_id, assignee_id, title, description,
      status, priority, deadline_at, tags, created_by, updated_by
    ) values (
      p_organization_id, p_project_id, p_team_id, p_assignee_id, trim(p_title), trim(p_description),
      p_status, p_priority, p_deadline_at, v_normalized_tags, auth.uid(), auth.uid()
    ) returning id into v_task_id;
  else
    update public.tasks
    set team_id = p_team_id, assignee_id = p_assignee_id, title = trim(p_title),
        description = trim(p_description), status = p_status, priority = p_priority,
        deadline_at = p_deadline_at, tags = v_normalized_tags
    where id = p_task_id and organization_id = p_organization_id and project_id = p_project_id
    returning id into v_task_id;
    if v_task_id is null then raise exception 'task not found or access denied'; end if;
  end if;

  perform private.sync_task_tags(v_task_id, p_organization_id, p_project_id, v_normalized_tags);
  return v_task_id;
end;
$$;

revoke all on function public.create_project(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_project(uuid, text, text, text, text) to authenticated;
revoke all on function public.save_project_task_with_tags(uuid, uuid, uuid, uuid, uuid, text, text, public.task_status, public.task_priority, timestamptz, text[]) from public, anon;
grant execute on function public.save_project_task_with_tags(uuid, uuid, uuid, uuid, uuid, text, text, public.task_status, public.task_priority, timestamptz, text[]) to authenticated;

grant select, insert on public.projects to authenticated;
grant update (name, description, status, color, icon) on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_members;

commit;
