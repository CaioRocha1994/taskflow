begin;

select plan(14);

select has_table('public', 'user_preferences', 'Tabela de preferências criada');
select has_table('public', 'tags', 'Tabela de tags criada');
select has_table('public', 'task_tags', 'Tabela N:N de tags criada');
select has_column('public', 'tasks', 'deadline_at', 'Tarefa possui prazo com data e hora');
select has_column('public', 'notifications', 'email_status', 'Notificação possui estado de envio de e-mail');

select col_type_is('public', 'tasks', 'deadline_at', 'timestamp with time zone', 'Prazo usa timestamptz');
select col_default_is('public', 'user_preferences', 'theme', '''dark''::text', 'Tema escuro é o padrão');
select col_default_is('public', 'user_preferences', 'due_soon_minutes', '15', 'Alerta padrão ocorre 15 minutos antes');

select has_function('public', 'save_task_with_tags', array[
  'uuid', 'uuid', 'uuid', 'uuid', 'text', 'text',
  'task_status', 'task_priority', 'timestamp with time zone', 'text[]'
], 'RPC transacional de tarefa e tags existe');

select has_function('public', 'refresh_due_notifications', array['uuid'], 'RPC individual de prazos existe');
select has_function('public', 'refresh_due_notifications_all', array[]::text[], 'RPC de processamento global existe');

select function_privs_are(
  'public', 'refresh_due_notifications', array['uuid'],
  'authenticated', array['EXECUTE'],
  'Usuários autenticados podem atualizar seus próprios alertas'
);

select function_privs_are(
  'public', 'refresh_due_notifications_all', array[]::text[],
  'authenticated', array[]::text[],
  'Usuários comuns não podem processar a fila global'
);

select trigger_is(
  'public', 'tasks', 'tasks_sync_deadline_date',
  'private', 'sync_task_deadline_date',
  'Prazo mantém a data legada sincronizada'
);

select * from finish();
rollback;
