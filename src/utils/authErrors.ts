interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

export function getAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback = "Não foi possível concluir a operação.",
): string {
  if (!error) return fallback;

  const message = error.message?.trim() ?? "";
  const normalized = message.toLowerCase();

  if (
    (error.status ?? 0) >= 500
    || normalized.includes("error sending")
    || normalized.includes("unexpected_failure")
  ) {
    return "Não foi possível enviar o e-mail. Verifique a configuração SMTP e tente novamente.";
  }

  if (error.status === 429 || normalized.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (normalized.includes("user already registered")) {
    return "Já existe uma conta cadastrada com este e-mail.";
  }

  if (normalized.includes("same password")) {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  return message || fallback;
}
