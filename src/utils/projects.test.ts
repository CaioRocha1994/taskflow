import { describe, expect, it } from "vitest";
import type { ProjectMembership } from "../types/workspace";
import { selectActiveProjectId } from "./projects";

function membership(id: string, status: "active" | "inactive" = "active"): ProjectMembership {
  return {
    projectId: id, organizationId: "org", role: "member",
    project: { id, organizationId: "org", name: id, description: "", status, color: "#d71920", icon: "briefcase", createdBy: "user", createdAt: "2026-01-01" },
  };
}

describe("selectActiveProjectId", () => {
  it("mantém o projeto ativo previamente escolhido", () => {
    expect(selectActiveProjectId([membership("a"), membership("b")], "b")).toBe("b");
  });
  it("não reabre um projeto inativo", () => {
    expect(selectActiveProjectId([membership("a", "inactive"), membership("b")], "a")).toBe("b");
  });
  it("retorna vazio quando não há projetos", () => {
    expect(selectActiveProjectId([], "inexistente")).toBe("");
  });
});
