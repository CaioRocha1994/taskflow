begin;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'owner-taskflow-test@example.com', '{"full_name":"Owner Test"}'),
  ('10000000-0000-4000-8000-000000000002', 'member-taskflow-test@example.com', '{"full_name":"Member Test"}'),
  ('10000000-0000-4000-8000-000000000003', 'outsider-taskflow-test@example.com', '{"full_name":"Outsider Test"}');

insert into public.organizations (id, name, slug, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'Empresa Teste A', 'empresa-teste-a', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Empresa Teste B', 'empresa-teste-b', '10000000-0000-4000-8000-000000000003');

insert into public.organization_members (organization_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'member'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'owner');

insert into public.teams (id, organization_id, name) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Equipe A'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Equipe B');

insert into public.team_members (organization_id, team_id, user_id) values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003');

insert into public.tasks (id, organization_id, team_id, assignee_id, title, created_by, updated_by) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Tarefa do membro', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Tarefa do proprietário', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, 'Tarefa sem responsável', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Tarefa de outra empresa', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select results_eq(
  $$select title from public.tasks order by title$$,
  $$values ('Tarefa do membro'::text)$$,
  'Membro visualiza somente a tarefa atribuída a ele'
);

select is((select count(*) from public.tasks where organization_id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'Membro não visualiza tarefas de outra empresa');
select is((select count(*) from public.profiles), 2::bigint, 'Membro visualiza somente perfis da própria empresa');
select lives_ok($$update public.tasks set status = 'in-progress' where id = '40000000-0000-4000-8000-000000000001'$$, 'Membro pode alterar o status da própria tarefa');
select throws_ok($$update public.tasks set title = 'Alteração indevida' where id = '40000000-0000-4000-8000-000000000001'$$, 'P0001', 'members may only update the status of assigned tasks', 'Membro não pode alterar outros campos');
select results_eq(
  $$with deleted as (delete from public.tasks where id = '40000000-0000-4000-8000-000000000001' returning id) select count(*) from deleted$$,
  $$values (0::bigint)$$,
  'Membro não pode excluir tarefas'
);
select lives_ok(
  $$insert into public.task_comments (organization_id, task_id, author_id, body)
    values (
      '20000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Comentário permitido'
    )$$,
  'Membro pode comentar na tarefa atribuída'
);
select throws_ok(
  $$insert into public.task_comments (organization_id, task_id, author_id, body)
    values (
      '20000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000002',
      'Comentário indevido'
    )$$,
  '42501',
  null,
  'Membro não pode comentar em tarefa não atribuída'
);
select results_eq(
  $$select body from public.task_comments order by created_at$$,
  $$values ('Comentário permitido'::text)$$,
  'Membro visualiza somente comentários das próprias tarefas'
);
select lives_ok(
  $$insert into public.task_attachments (
      organization_id, task_id, uploaded_by, storage_path, file_name, mime_type, file_size
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/teste.pdf',
      'teste.pdf',
      'application/pdf',
      100
    )$$,
  'Membro pode registrar anexo na tarefa atribuída'
);
select is(
  (select count(*) from public.notifications where user_id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Membro não visualiza notificações de outro usuário'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select is((select count(*) from public.tasks), 3::bigint, 'Proprietário visualiza todas as tarefas da empresa');
select is((select count(*) from public.tasks where organization_id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'Proprietário continua isolado de outras empresas');
select is(
  (select count(*) from public.task_comments),
  1::bigint,
  'Proprietário visualiza comentários de todas as tarefas da empresa'
);

select * from finish();
rollback;
