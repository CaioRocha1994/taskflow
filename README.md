# TaskFlow

Kanban multiempresa para gestão de tarefas, equipes e usuários. O frontend usa React, TypeScript e Vite; autenticação, banco PostgreSQL, autorização por linha e sincronização usam Supabase.

## Funcionalidades

- Cadastro, login, confirmação de e-mail e recuperação de senha
- Empresas isoladas (multi-tenant)
- Equipes ou setores dentro de cada empresa
- Papéis de proprietário, administrador e membro
- Proprietários e administradores enxergam todas as tarefas da empresa
- Membros enxergam somente tarefas atribuídas a eles
- Convites de usuários por link, com validade e validação do e-mail
- Responsável e equipe por tarefa
- Kanban com drag-and-drop, busca, filtros, prioridades e prazos
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

No Supabase, execute a migração [`supabase/migrations/202607130001_initial_multitenant.sql`](supabase/migrations/202607130001_initial_multitenant.sql) pelo SQL Editor. Se estiver usando a CLI:

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

- defina `Site URL` com a URL de produção do Vercel;
- adicione `http://localhost:5173/**` em Redirect URLs;
- adicione também `https://SEU-DOMINIO.vercel.app/**`.

Em **Authentication → Providers → Email**, mantenha login por e-mail habilitado. Em produção, é recomendado exigir confirmação do endereço.

Para eventos instantâneos entre usuários, habilite a tabela `public.tasks` na publicação do Realtime pelo painel do Supabase.

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
```
