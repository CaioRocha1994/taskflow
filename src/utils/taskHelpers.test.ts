import { describe, expect, it } from "vitest";
import { isDeadlineDueSoon, isDeadlineOverdue } from "./taskHelpers";

const NOW = new Date("2026-07-19T12:00:00.000Z").getTime();

describe("alertas de prazo", () => {
  it("identifica uma tarefa dentro da janela de 15 minutos", () => {
    expect(isDeadlineDueSoon("2026-07-19T12:14:00.000Z", 15, NOW)).toBe(true);
    expect(isDeadlineDueSoon("2026-07-19T12:16:00.000Z", 15, NOW)).toBe(false);
  });

  it("não considera como próxima uma tarefa que já atrasou", () => {
    expect(isDeadlineDueSoon("2026-07-19T11:59:00.000Z", 15, NOW)).toBe(false);
  });

  it("identifica uma tarefa após o prazo", () => {
    expect(isDeadlineOverdue("2026-07-19T11:59:00.000Z", NOW)).toBe(true);
    expect(isDeadlineOverdue("2026-07-19T12:01:00.000Z", NOW)).toBe(false);
  });
});
