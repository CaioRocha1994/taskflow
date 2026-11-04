import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./authErrors";

describe("getAuthErrorMessage", () => {
  it("traduz falhas de rede para uma mensagem clara", () => {
    expect(getAuthErrorMessage({ message: "Failed to fetch" })).toBe(
      "O serviço de acesso está temporariamente indisponível. Aguarde alguns minutos e tente novamente.",
    );
  });

  it("mantém a mensagem amigável para credenciais inválidas", () => {
    expect(getAuthErrorMessage({ message: "Invalid login credentials", status: 400 })).toBe(
      "E-mail ou senha incorretos.",
    );
  });
});
