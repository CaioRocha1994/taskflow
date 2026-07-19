import { createContext } from "react";
import type { UserPreferences, UserPreferencesUpdate } from "../types/preferences";

export interface UserPreferencesContextValue {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string;
  updatePreferences: (update: UserPreferencesUpdate) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setBrowserNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

export const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);
