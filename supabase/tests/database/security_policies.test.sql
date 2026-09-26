begin;

select plan(33);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array[
        'profiles', 'organizations', 'organization_members', 'teams',
        'team_members', 'tasks', 'task_activity', 'invitations',
        'task_comments', 'task_attachments', 'notifications',
        'user_preferences', 'tags', 'task_tags', 'projects', 'project_members',
        'notification_preferences', 'notification_deliveries'
      ])
      and c.relrowsecurity
  ),
  18,
  'RLS está habilitado em todas as tabelas expostas'
);

select policies_are('public', 'profiles', array[
  'profiles_select', 'profiles_update_self'
], 'Perfis possuem somente as políticas esperadas');

select policies_are('public', 'organizations', array[
  'organizations_select', 'organizations_update'
], 'Empresas possuem somente as políticas esperadas');

select policies_are('public', 'organization_members', array[
  'organization_members_select', 'organization_members_insert',
  'organization_members_update', 'organization_members_delete'
], 'Membros da empresa possuem somente as políticas esperadas');

select policies_are('public', 'projects', array[
  'projects_select', 'projects_insert', 'projects_update'
], 'Projetos possuem políticas próprias');

select policies_are('public', 'project_members', array[
  'project_members_select', 'project_members_insert',
  'project_members_update', 'project_members_delete'
], 'Membros do projeto possuem papéis isolados');

select policies_are('public', 'teams', array[
  'teams_select', 'teams_insert', 'teams_update', 'teams_delete'
], 'Equipes possuem somente as políticas esperadas');

select policies_are('public', 'team_members', array[
  'team_members_select', 'team_members_insert', 'team_members_delete'
], 'Vínculos de equipe possuem somente as políticas esperadas');

select policies_are('public', 'tasks', array[
  'tasks_select', 'tasks_insert', 'tasks_update', 'tasks_delete'
], 'Tarefas possuem somente as políticas esperadas');

select policies_are('public', 'task_activity', array[
  'task_activity_select'
], 'Histórico possui somente a política de leitura esperada');

select policies_are('public', 'invitations', array[
  'invitations_select', 'invitations_insert', 'invitations_delete'
], 'Convites possuem somente as políticas esperadas');

select policies_are('public', 'task_comments', array[
  'task_comments_select', 'task_comments_insert',
  'task_comments_update', 'task_comments_delete'
], 'Comentários possuem somente as políticas esperadas');

select policies_are('public', 'task_attachments', array[
  'task_attachments_select', 'task_attachments_insert', 'task_attachments_delete'
], 'Anexos possuem somente as políticas esperadas');

select policies_are('public', 'notifications', array[
  'notifications_select', 'notifications_update', 'notifications_delete'
], 'Notificações possuem somente as políticas esperadas');

select policies_are('public', 'user_preferences', array[
  'user_preferences_select', 'user_preferences_insert', 'user_preferences_update'
], 'Preferências são privadas por usuário');

select policies_are('public', 'notification_preferences', array[
  'notification_preferences_select', 'notification_preferences_insert', 'notification_preferences_update'
], 'Preferências de canais são privadas por usuário');

select policies_are('public', 'notification_deliveries', array[
  'notification_deliveries_select'
], 'Entregas de e-mail são visíveis apenas para administradores do projeto');

select policies_are('public', 'tags', array[
  'tags_select', 'tags_insert', 'tags_update', 'tags_delete'
], 'Tags são isoladas por projeto');

select policies_are('public', 'task_tags', array[
  'task_tags_select', 'task_tags_insert', 'task_tags_delete'
], 'Associações de tags respeitam a visibilidade da tarefa');

select is(
  (select public from storage.buckets where id = 'task-attachments'),
  false,
  'Bucket de anexos é privado'
);

select policy_cmd_is('public', 'tasks', 'tasks_select'::name, 'SELECT', 'Leitura de tarefas usa política SELECT');
select policy_cmd_is('public', 'tasks', 'tasks_insert'::name, 'INSERT', 'Criação de tarefas usa política INSERT');
select policy_cmd_is('public', 'tasks', 'tasks_update'::name, 'UPDATE', 'Alteração de tarefas usa política UPDATE');
select policy_cmd_is('public', 'tasks', 'tasks_delete'::name, 'DELETE', 'Exclusão de tarefas usa política DELETE');
select policy_cmd_is('public', 'organization_members', 'organization_members_update'::name, 'UPDATE', 'Alteração de acesso usa política UPDATE');
select policy_cmd_is('public', 'organization_members', 'organization_members_delete'::name, 'DELETE', 'Remoção de acesso usa política DELETE');
select policy_cmd_is('public', 'invitations', 'invitations_insert'::name, 'INSERT', 'Criação de convite usa política INSERT');
select policy_cmd_is('public', 'invitations', 'invitations_delete'::name, 'DELETE', 'Cancelamento de convite usa política DELETE');

select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_organization'),
  'Criação de empresa executa como security definer'
);

select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'accept_invitation'),
  'Aceite de convite executa como security definer'
);

select function_privs_are(
  'public', 'create_organization', array['text', 'text'],
  'authenticated', array['EXECUTE'],
  'Usuários autenticados podem criar empresas'
);

select function_privs_are(
  'public', 'create_project', array['uuid', 'text', 'text', 'text', 'text'],
  'authenticated', array['EXECUTE'],
  'Administradores autenticados podem criar projetos'
);

select function_privs_are(
  'public', 'accept_invitation', array['uuid'],
  'authenticated', array['EXECUTE'],
  'Usuários autenticados podem aceitar convites'
);

select * from finish();
rollback;
