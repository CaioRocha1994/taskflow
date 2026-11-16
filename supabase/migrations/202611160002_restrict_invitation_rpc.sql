begin;

revoke execute on function public.create_project_invitation(uuid, uuid, uuid, text, public.membership_role) from anon;

commit;
