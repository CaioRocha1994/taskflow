-- Qualquer membro da empresa pode criar seu próprio projeto; inserts diretos permanecem bloqueados.

begin;

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
  if v_user_id is null or not private.is_org_member(p_organization_id, v_user_id) then
    raise exception 'organization membership required';
  end if;
  insert into public.projects (organization_id, name, description, color, icon, created_by)
  values (p_organization_id, trim(p_name), trim(coalesce(p_description, '')), p_color, p_icon, v_user_id)
  returning id into v_project_id;
  insert into public.project_members (organization_id, project_id, user_id, role)
  values (p_organization_id, v_project_id, v_user_id, 'owner');
  insert into public.teams (organization_id, project_id, name)
  values (p_organization_id, v_project_id, 'Geral') returning id into v_team_id;
  insert into public.team_members (organization_id, project_id, team_id, user_id)
  values (p_organization_id, v_project_id, v_team_id, v_user_id);
  return v_project_id;
end;
$$;

revoke insert on public.projects from authenticated;

commit;
