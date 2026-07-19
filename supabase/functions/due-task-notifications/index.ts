import { createClient } from "npm:@supabase/supabase-js@2";

interface PendingNotification {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  body: string;
  email_attempts: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const fromEmail = Deno.env.get("TASKFLOW_FROM_EMAIL");
  const fromName = Deno.env.get("TASKFLOW_FROM_NAME") ?? "TaskFlow";
  const appUrl = Deno.env.get("TASKFLOW_APP_URL") ?? "https://crtechweb.com.br/taskflow/app";

  if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !fromEmail) {
    return Response.json({ error: "Missing server configuration" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: refreshed, error: refreshError } = await supabase.rpc("refresh_due_notifications_all");
  if (refreshError) {
    return Response.json({ error: refreshError.message }, { status: 500 });
  }

  const { data, error: queueError } = await supabase
    .from("notifications")
    .select("id, user_id, task_id, title, body, email_attempts")
    .in("type", ["due_soon", "overdue"])
    .in("email_status", ["pending", "failed"])
    .lt("email_attempts", 3)
    .order("created_at", { ascending: true })
    .limit(50);

  if (queueError) {
    return Response.json({ error: queueError.message }, { status: 500 });
  }

  const queue = (data ?? []) as PendingNotification[];
  const userIds = [...new Set(queue.map((notification) => notification.user_id))];
  const [{ data: profiles }, { data: preferences }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("user_preferences").select("user_id, email_due_notifications_enabled").in("user_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const emailEnabledById = new Map((preferences ?? []).map((preference) => [
    preference.user_id,
    preference.email_due_notifications_enabled,
  ]));
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notification of queue) {
    const profile = profileById.get(notification.user_id);
    if (!profile?.email || emailEnabledById.get(notification.user_id) === false) {
      await supabase.from("notifications").update({ email_status: "skipped" }).eq("id", notification.id);
      skipped += 1;
      continue;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: profile.email, name: profile.full_name || profile.email }],
        subject: notification.title,
        textContent: `${notification.title}\n${notification.body}\n\nAbra o TaskFlow: ${appUrl}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6">
            <h2 style="margin:0 0 12px;color:#d71920">${escapeHtml(notification.title)}</h2>
            <p>${escapeHtml(notification.body)}</p>
            <p><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:11px 18px;border-radius:8px;color:#fff;background:#d71920;text-decoration:none;font-weight:700">Abrir TaskFlow</a></p>
            <p style="font-size:12px;color:#777980">Você recebe este e-mail conforme as preferências da sua conta.</p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      await supabase.from("notifications").update({
        email_status: "sent",
        email_sent_at: new Date().toISOString(),
        email_attempts: notification.email_attempts + 1,
        email_last_error: null,
      }).eq("id", notification.id);
      sent += 1;
    } else {
      const failureBody = (await response.text()).slice(0, 500);
      await supabase.from("notifications").update({
        email_status: "failed",
        email_attempts: notification.email_attempts + 1,
        email_last_error: failureBody,
      }).eq("id", notification.id);
      failed += 1;
    }
  }

  return Response.json({ refreshed: refreshed ?? 0, queued: queue.length, sent, failed, skipped });
});
