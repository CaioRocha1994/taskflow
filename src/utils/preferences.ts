import type { AppTheme } from "../types/preferences";

export function getNextTheme(theme: AppTheme): AppTheme {
  return theme === "dark" ? "light" : "dark";
}
