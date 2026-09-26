export interface EmailMessage {
  to: { email: string; name: string };
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface EmailResult { providerMessageId?: string }

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

interface BrevoProviderOptions { apiKey: string; fromEmail: string; fromName: string }

export class BrevoEmailProvider implements EmailProvider {
  constructor(private readonly options: BrevoProviderOptions) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.options.apiKey,
        "content-type": "application/json",
        accept: "application/json",
        "idempotency-key": message.idempotencyKey,
      },
      body: JSON.stringify({
        sender: { email: this.options.fromEmail, name: this.options.fromName },
        to: [message.to],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Brevo ${response.status}: ${(await response.text()).slice(0, 400)}`);
    }
    const result = await response.json().catch(() => ({})) as { messageId?: string };
    return { providerMessageId: result.messageId };
  }
}
