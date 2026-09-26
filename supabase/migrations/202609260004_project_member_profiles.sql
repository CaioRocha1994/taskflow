-- Permite o embed seguro de profiles via PostgREST em project_members.

begin;

alter table public.project_members
  add constraint project_members_user_profile_fk
  foreign key (user_id) references public.profiles(id) on delete cascade;

commit;
