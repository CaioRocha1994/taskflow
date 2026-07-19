import { useContext } from "react";
import { UserPreferencesContext } from "../contexts/userPreferencesContextValue";

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error("useUserPreferences deve ser usado dentro de UserPreferencesProvider.");
  return context;
}
