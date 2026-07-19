# TaskFlow

Kanban multiempresa para gestão de tarefas, equipes e usuários. O frontend usa React, TypeScript e Vite; autenticação, banco PostgreSQL, autorização por linha e sincronização usam Supabase.

## Funcionalidades

- Cadastro, login, confirmação de e-mail e recuperação de senha
- Empresas isoladas (multi-tenant)
- Equipes ou setores dentro de cada empresa
- Papéis de proprietário, administrador e membro
- Proprietários e administradores enxergam todas as tarefas da empresa
- Membros enxergam somente tarefas atribuídas a eles
- Convites de usuários por e-mail e link, com validade e validação do endereço
- Responsável e equipe por tarefa
- Kanban com drag-and-drop, busca, filtros, prioridades e prazos
- Prazo com data e hora, alertas em tempo real e notificações do navegador
- Alertas de prazo por e-mail com fila segura e Edge Function
- Tema claro/escuro persistido por usuário no PostgreSQL
- Tags por empresa com autocomplete, criação automática e associação N:N
- Histórico de criação, edição e exclusão no banco
- Atualização em tempo real preparada com Supabase Realtime
- Row Level Security (RLS) em todas as tabelas expostas

## Desenvolvimento local

Requisitos: Node.js 20+ e um projeto Supabase.

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

No Supabase, aplique as migrações em ordem. Se estiver usando a CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Inicie o frontend:

```bash
npm run dev
```

## Configuração do Supabase

Em **Authentication → URL Configuration**:

- defina `Site URL` como `https://crtechweb.com.br/taskflow/login`;
- adicione `http://localhost:5173/**` em Redirect URLs;
- adicione também as rotas oficiais de login e aplicação.

Em **Authentication → Providers → Email**, mantenha login por e-mail habilitado. Em produção, é recomendado exigir confirmação do endereço.

Convites e recuperação de senha usam os e-mails transacionais do Supabase Auth. Para ampliar os limites de envio e personalizar remetente e domínio, configure um SMTP próprio nas opções de autenticação do projeto.

Os modelos profissionais e o roteiro de configuração ficam em [`supabase/email-templates`](supabase/email-templates).

Para eventos instantâneos entre usuários, habilite a tabela `public.tasks` na publicação do Realtime pelo painel do Supabase.

### Alertas de prazo por e-mail

A função [`supabase/functions/due-task-notifications`](supabase/functions/due-task-notifications) processa os prazos e envia a fila pela API transacional da Brevo sem expor credenciais no navegador. Consulte o README da função para cadastrar os secrets, publicar e agendar sua execução a cada minuto.

## Deploy no Vercel

Configure no projeto Vercel as mesmas variáveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Nunca use `service_role`, secret key ou senha do banco no frontend. A chave publicável identifica o projeto; as políticas RLS são responsáveis pela autorização.

Depois, faça um novo deploy. O comando de build permanece:

```bash
npm run build
```

## Modelo de permissão

| Papel | Empresas/equipes | Tarefas |
| --- | --- | --- |
| Proprietário | Administração total | Visualiza e gerencia todas |
| Administrador | Gerencia equipes e convites | Visualiza e gerencia todas |
| Membro | Consulta sua empresa/equipes | Visualiza as atribuídas; altera apenas o status |

As regras são aplicadas no PostgreSQL, não apenas na interface. Mesmo uma requisição manual usando a chave pública continua limitada pelas políticas RLS.

## Estrutura principal

```text
src/
├── components/       # interface, autenticação e administração
├── hooks/            # sessão, workspace e tarefas
├── lib/supabase.ts   # cliente Supabase
├── types/            # tipos do domínio
└── App.tsx           # composição dos fluxos
supabase/
└── migrations/       # schema, funções, triggers, índices e RLS
```

## Verificação

```bash
npm run lint
npm run build
npm test
npm run test:db
```

Os testes de banco usam pgTAP e ficam em `supabase/tests/database`. A execução local requer Docker ativo e a stack local do Supabase CLI iniciada.
