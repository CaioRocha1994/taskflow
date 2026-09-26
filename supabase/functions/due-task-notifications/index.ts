import { createClient } from "npm:@supabase/supabase-js@2";
import { BrevoEmailProvider } from "../_shared/emailProvider.ts";
import { renderDeliveryEmail } from "../_shared/emailTemplates.ts";

interface Delivery {
  id: string;
  recipient_email: string;
  event_type: string;
  dedupe_key: string;
  attempt_count: number;
  payload: Record<string, string | undefined>;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

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
  const provider = new BrevoEmailProvider({ apiKey: brevoApiKey, fromEmail, fromName });

  const { data: refreshed, error: refreshError } = await supabase.rpc("refresh_due_notifications_all");
  if (refreshError) return Response.json({ error: refreshError.message }, { status: 500 });

  const { data, error: claimError } = await supabase.rpc("claim_email_deliveries", { p_limit: 50 });
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 });

  const deliveries = (data ?? []) as Delivery[];
  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const template = renderDeliveryEmail(delivery.event_type, delivery.payload, appUrl);
    try {
      const result = await provider.send({
        to: {
          email: delivery.recipient_email,
          name: delivery.payload.recipient_name || delivery.recipient_email,
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
        idempotencyKey: delivery.dedupe_key,
      });
      await supabase.from("notification_deliveries").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: result.providerMessageId ?? null,
        last_error: null,
      }).eq("id", delivery.id);
      sent += 1;
    } catch (error) {
      const retryMinutes = Math.min(60, 2 ** delivery.attempt_count);
      await supabase.from("notification_deliveries").update({
        status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error",
        next_attempt_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
      }).eq("id", delivery.id);
      failed += 1;
    }
  }

  return Response.json({ refreshed: refreshed ?? 0, claimed: deliveries.length, sent, failed });
});
