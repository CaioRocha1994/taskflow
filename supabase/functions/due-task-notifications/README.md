# E-mails transacionais do TaskFlow

Esta Edge Function cria os alertas de prazo e processa a fila transacional de atribuições, alterações importantes, comentários, menções, prazos, atrasos e convites de projeto por meio da API da Brevo. A fila usa deduplicação, claim atômico, até três tentativas e backoff. Execute a função a cada minuto pelo Supabase Cron.

Secrets obrigatórios no projeto Supabase:

- `BREVO_API_KEY`: chave da API transacional da Brevo (não é a senha SMTP).
- `TASKFLOW_FROM_EMAIL`: remetente verificado na Brevo.
- `TASKFLOW_FROM_NAME`: nome do remetente, por exemplo `TaskFlow`.
- `TASKFLOW_APP_URL`: `https://crtechweb.com.br/taskflow/app`.
- `CRON_SECRET`: segredo aleatório enviado no header `x-cron-secret` pelo agendamento.

Deploy:

```sh
supabase functions deploy due-task-notifications --no-verify-jwt
```

O agendamento deve fazer `POST` para `/functions/v1/due-task-notifications` com o header `x-cron-secret`. A service role permanece somente dentro da Edge Function e nunca é enviada ao navegador.
