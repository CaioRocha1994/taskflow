import { describe, expect, it } from "vitest";
import { getNextTheme } from "./preferences";

describe("getNextTheme", () => {
  it("alterna do tema escuro para o claro", () => {
    expect(getNextTheme("dark")).toBe("light");
  });

  it("alterna do tema claro para o escuro", () => {
    expect(getNextTheme("light")).toBe("dark");
  });
});
