# E-mails de autenticação do TaskFlow

Estes arquivos são a fonte versionada dos modelos usados no Supabase Auth. O painel hospedado exige SMTP próprio antes de liberar a edição dos modelos no plano gratuito.

## Assuntos recomendados

| Modelo | Arquivo | Assunto |
| --- | --- | --- |
| Confirm sign up | `confirm-sign-up.html` | Confirme seu e-mail no TaskFlow |
| Magic link or OTP | `magic-link.html` | Seu link seguro de acesso ao TaskFlow |
| Reset password | `reset-password.html` | Redefina sua senha do TaskFlow |
| Invite user | `invite-user.html` | Você recebeu um convite para o TaskFlow |

O fluxo administrativo atual usa `signInWithOtp`, portanto os convites enviados pela aplicação utilizam o modelo **Magic link or OTP**.

## Configuração recomendada com Resend

Antes de salvar no Supabase, crie uma chave restrita no provedor e verifique um domínio de envio.

| Campo no Supabase | Valor |
| --- | --- |
| Sender email address | `no-reply@auth.seudominio.com.br` |
| Sender name | `TaskFlow` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Minimum interval per user | `60` segundos |
| Username | `resend` |
| Password | chave de API criada no Resend |

O Resend exige um domínio verificado para entregar mensagens a endereços externos. Sem domínio próprio, use temporariamente o Brevo conforme a configuração abaixo.

## Alternativa temporária sem domínio: Brevo

O plano gratuito do Brevo oferece SMTP e até 300 envios por dia. É possível cadastrar um endereço individual, como Gmail ou Outlook, e confirmá-lo pelo código recebido. Como o domínio não estará autenticado, o provedor poderá substituir o remetente por um endereço técnico próprio para manter a entrega.

| Campo no Supabase | Valor |
| --- | --- |
| Sender email address | endereço verificado no Brevo |
| Sender name | `TaskFlow` |
| Host | `smtp-relay.brevo.com` |
| Port | `465` |
| Minimum interval per user | `60` segundos |
| Username | login SMTP exibido no painel do Brevo |
| Password | chave SMTP criada no Brevo, não a chave de API |

Essa alternativa é adequada para iniciar os testes e operar com baixo volume. Para a versão definitiva, compre um domínio, autentique DKIM e DMARC e migre o remetente para um endereço profissional.

Depois de ativar o SMTP:

1. Cole o conteúdo de cada HTML no modelo correspondente.
2. Ative a notificação de alteração de senha.
3. Mantenha rastreamento de links desativado no provedor SMTP.
4. Teste cadastro, convite e recuperação com um endereço externo.
5. Ajuste o limite de e-mails somente após validar a reputação do domínio.

Nunca salve a chave SMTP no repositório, em `.env.local` ou nas variáveis públicas do Vite. A credencial deve existir apenas na configuração protegida do Supabase Auth.
