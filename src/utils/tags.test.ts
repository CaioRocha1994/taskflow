import { describe, expect, it } from "vitest";
import { normalizeTagName, normalizeTagNames } from "./tags";

describe("normalização de tags", () => {
  it("remove espaços excedentes e limita o tamanho", () => {
    expect(normalizeTagName("  Front   End  ")).toBe("Front End");
    expect(normalizeTagName("x".repeat(60))).toHaveLength(50);
  });

  it("remove vazios e duplicações sem diferenciar maiúsculas", () => {
    expect(normalizeTagNames(["React", " react ", "", "UI"])).toEqual(["React", "UI"]);
  });
});
