-- Cria convites no servidor para não depender de IDs de usuário enviados pelo navegador.

begin;

create or replace function public.create_project_invitation(
  p_organization_id uuid,
  p_project_id uuid,
  p_team_id uuid,
  p_email text,
  p_role public.membership_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email extensions.citext := lower(trim(p_email));
  v_token uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not private.is_project_admin(p_project_id, v_user_id) then
    raise exception 'only project admins can create invitations';
  end if;

  if p_role = 'owner' then
    raise exception 'owner invitations are not allowed';
  end if;

  if v_email = '' or position('@' in v_email::text) <= 1 then
    raise exception 'invalid invitation email';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'project does not belong to the selected organization';
  end if;

  if p_team_id is not null and not exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.project_id = p_project_id
      and t.organization_id = p_organization_id
  ) then
    raise exception 'team does not belong to the selected project';
  end if;

  if exists (
    select 1
    from public.profiles profile
    join public.project_members member
      on member.user_id = profile.id
     and member.project_id = p_project_id
    where profile.email = v_email
  ) then
    raise exception 'user is already a project member';
  end if;

  delete from public.invitations invitation
  where invitation.organization_id = p_organization_id
    and invitation.project_id = p_project_id
    and invitation.email = v_email
    and invitation.accepted_at is null;

  insert into public.invitations (
    organization_id,
    project_id,
    team_id,
    email,
    role,
    invited_by
  ) values (
    p_organization_id,
    p_project_id,
    p_team_id,
    v_email,
    p_role,
    v_user_id
  )
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_project_invitation(uuid, uuid, uuid, text, public.membership_role) from public;
grant execute on function public.create_project_invitation(uuid, uuid, uuid, text, public.membership_role) to authenticated;

commit;
