-- Alertas de tarefa ficam somente na aplicação; limpeza usa arquivamento lógico.

begin;

alter table public.user_preferences
  alter column email_due_notifications_enabled set default false;

update public.user_preferences
set email_due_notifications_enabled = false
where email_due_notifications_enabled;

update public.notifications
set email_status = 'skipped'
where email_status in ('pending', 'failed');

alter table public.notifications
  add column dismissed_at timestamptz;

create index notifications_visible_user_idx
  on public.notifications(user_id, organization_id, created_at desc)
  where dismissed_at is null;

grant update (dismissed_at) on public.notifications to authenticated;

commit;
