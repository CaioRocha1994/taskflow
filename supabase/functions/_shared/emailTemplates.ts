interface DeliveryPayload {
  recipient_name?: string;
  title?: string;
  body?: string;
  task_id?: string;
  project_id?: string;
  invite_token?: string;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

const SUBJECTS: Record<string, string> = {
  assignment: "Nova tarefa atribuída",
  task_updated: "Uma tarefa importante foi atualizada",
  comment: "Novo comentário em uma tarefa",
  mention: "Você foi mencionado no TaskFlow",
  due_soon: "Uma tarefa está perto do prazo",
  overdue: "Uma tarefa está atrasada",
  project_invite: "Convite para um projeto no TaskFlow",
};

export function renderDeliveryEmail(eventType: string, payload: DeliveryPayload, appUrl: string) {
  const subject = payload.title || SUBJECTS[eventType] || "Notificação do TaskFlow";
  const greeting = payload.recipient_name ? `Olá, ${payload.recipient_name}.` : "Olá.";
  const body = payload.body || "Há uma atualização esperando por você no TaskFlow.";
  const actionUrl = payload.invite_token
    ? `${appUrl}?invite=${encodeURIComponent(payload.invite_token)}`
    : `${appUrl}?project=${encodeURIComponent(payload.project_id || "")}${payload.task_id ? `&task=${encodeURIComponent(payload.task_id)}` : ""}`;
  const actionLabel = payload.invite_token ? "Aceitar convite" : "Abrir no TaskFlow";
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${actionLabel}: ${actionUrl}`,
    html: `<div style="background:#f4f4f5;padding:28px;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:28px"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#d71920">TASKFLOW</div><h1 style="font-size:22px;margin:16px 0 8px">${escapeHtml(subject)}</h1><p style="color:#52525b;line-height:1.6">${escapeHtml(greeting)}</p><p style="color:#52525b;line-height:1.6">${escapeHtml(body)}</p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:9px;color:#fff;background:#d71920;text-decoration:none;font-weight:700">${actionLabel}</a><p style="margin-top:24px;font-size:12px;color:#71717a">Você pode alterar os avisos por e-mail em Minha conta → Notificações.</p></div></div>`,
  };
}
