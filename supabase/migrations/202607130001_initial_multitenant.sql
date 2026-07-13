-- TaskFlow: modelo multiempresa seguro para Supabase/Postgres.
-- Execute com `supabase db push` ou cole no SQL Editor de um projeto vazio.

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create type public.membership_role as enum ('owner', 'admin', 'member');
create type public.task_status as enum ('backlog', 'todo', 'in-progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table public.team_members (
  organization_id uuid not null,
  team_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, organization_id)
    references public.teams(id, organization_id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.organization_members(organization_id, user_id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null,
  assignee_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  status public.task_status not null default 'backlog',
  priority public.task_priority not null default 'medium',
  due_date date,
  tags text[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, organization_id)
    references public.teams(id, organization_id) on delete restrict,
  foreign key (organization_id, assignee_id)
    references public.organization_members(organization_id, user_id) on delete set null (assignee_id)
);

create table public.task_activity (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid,
  email extensions.citext not null,
  role public.membership_role not null default 'member' check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (team_id, organization_id)
    references public.teams(id, organization_id) on delete cascade
);

create index organization_members_user_idx on public.organization_members(user_id);
create index teams_organization_idx on public.teams(organization_id);
create index team_members_user_idx on public.team_members(user_id, organization_id);
create index tasks_organization_idx on public.tasks(organization_id);
create index tasks_team_idx on public.tasks(team_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_status_idx on public.tasks(organization_id, status);
create index task_activity_task_idx on public.task_activity(task_id, created_at desc);
create index invitations_email_idx on public.invitations(email, accepted_at);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_org_member(p_organization_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
  );
$$;

create or replace function private.is_org_admin(p_organization_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
      and om.role in ('owner', 'admin')
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
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = p_user_id
  );
$$;

create or replace function private.shares_organization(p_other_user_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = p_user_id
      and theirs.user_id = p_other_user_id
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
  select private.is_org_admin(p_organization_id, p_user_id)
    or (
      p_assignee_id = p_user_id
      and private.is_team_member(p_team_id, p_user_id)
    );
$$;

grant execute on function private.is_org_member(uuid, uuid) to authenticated;
grant execute on function private.is_org_admin(uuid, uuid) to authenticated;
grant execute on function private.is_team_member(uuid, uuid) to authenticated;
grant execute on function private.shares_organization(uuid, uuid) to authenticated;
grant execute on function private.can_view_task(uuid, uuid, uuid, uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch_updated_at
  before update on public.organizations
  for each row execute function public.touch_updated_at();
create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.create_organization(p_name text, p_team_name text default 'Geral')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_team_id uuid;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(p_name)) < 2 then
    raise exception 'organization name is too short';
  end if;

  v_slug := coalesce(
    nullif(trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')), ''),
    'empresa'
  ) || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), v_slug, v_user_id)
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');

  insert into public.teams (organization_id, name)
  values (v_organization_id, coalesce(nullif(trim(p_team_name), ''), 'Geral'))
  returning id into v_team_id;

  insert into public.team_members (organization_id, team_id, user_id)
  values (v_organization_id, v_team_id, v_user_id);

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
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  select * into v_invitation
  from public.invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found or v_invitation.email <> v_email then
    raise exception 'invalid or expired invitation';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, v_invitation.role)
  on conflict (organization_id, user_id) do nothing;

  if v_invitation.team_id is not null then
    insert into public.team_members (organization_id, team_id, user_id)
    values (v_invitation.organization_id, v_invitation.team_id, v_user_id)
    on conflict (team_id, user_id) do nothing;
  end if;

  update public.invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;

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

create trigger tasks_enforce_update
  before update on public.tasks
  for each row execute function private.enforce_task_update();

create or replace function private.validate_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is not null
    and not private.is_team_member(new.team_id, new.assignee_id)
  then
    raise exception 'the assignee must belong to the selected team';
  end if;
  return new;
end;
$$;

create trigger tasks_validate_assignment
  before insert or update on public.tasks
  for each row execute function private.validate_task_assignment();

create or replace function private.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (organization_id, task_id, actor_id, action, after_data)
    values (new.organization_id, new.id, auth.uid(), 'created', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.task_activity (organization_id, task_id, actor_id, action, before_data, after_data)
    values (new.organization_id, new.id, auth.uid(), 'updated', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.task_activity (organization_id, task_id, actor_id, action, before_data)
    values (old.organization_id, old.id, auth.uid(), 'deleted', to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger tasks_log_activity
  after insert or update or delete on public.tasks
  for each row execute function private.log_task_activity();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_activity enable row level security;
alter table public.invitations enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.shares_organization(id)));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy organizations_select on public.organizations
  for select to authenticated
  using ((select private.is_org_member(id)));
create policy organizations_update on public.organizations
  for update to authenticated
  using ((select private.is_org_admin(id)))
  with check ((select private.is_org_admin(id)));

create policy organization_members_select on public.organization_members
  for select to authenticated
  using ((select private.is_org_member(organization_id)));
create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check ((select private.is_org_admin(organization_id)) and role <> 'owner');
create policy organization_members_update on public.organization_members
  for update to authenticated
  using ((select private.is_org_admin(organization_id)) and role <> 'owner')
  with check ((select private.is_org_admin(organization_id)) and role <> 'owner');
create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)) and role <> 'owner');

create policy teams_select on public.teams
  for select to authenticated
  using ((select private.is_org_member(organization_id)));
create policy teams_insert on public.teams
  for insert to authenticated
  with check ((select private.is_org_admin(organization_id)));
create policy teams_update on public.teams
  for update to authenticated
  using ((select private.is_org_admin(organization_id)))
  with check ((select private.is_org_admin(organization_id)));
create policy teams_delete on public.teams
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)));

create policy team_members_select on public.team_members
  for select to authenticated
  using ((select private.is_org_member(organization_id)));
create policy team_members_insert on public.team_members
  for insert to authenticated
  with check ((select private.is_org_admin(organization_id)));
create policy team_members_delete on public.team_members
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)));

create policy tasks_select on public.tasks
  for select to authenticated
  using ((select private.can_view_task(organization_id, team_id, assignee_id)));
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and (
      (select private.is_org_admin(organization_id))
      or (
        assignee_id = (select auth.uid())
        and (select private.is_team_member(team_id))
      )
    )
  );
create policy tasks_update on public.tasks
  for update to authenticated
  using ((select private.can_view_task(organization_id, team_id, assignee_id)))
  with check ((select private.can_view_task(organization_id, team_id, assignee_id)));
create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)));

create policy task_activity_select on public.task_activity
  for select to authenticated
  using (
    (select private.is_org_admin(organization_id))
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (select private.can_view_task(t.organization_id, t.team_id, t.assignee_id))
    )
  );

create policy invitations_select on public.invitations
  for select to authenticated
  using ((select private.is_org_admin(organization_id)));
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    (select private.is_org_admin(organization_id))
    and invited_by = (select auth.uid())
    and role <> 'owner'
  );
create policy invitations_delete on public.invitations
  for delete to authenticated
  using ((select private.is_org_admin(organization_id)));

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.task_activity to authenticated;
grant select, insert, delete on public.invitations to authenticated;
