export type AppTheme = "light" | "dark";

export interface UserPreferences {
  theme: AppTheme;
  browserNotificationsEnabled: boolean;
  emailDueNotificationsEnabled: boolean;
  dueSoonMinutes: number;
}

export type UserPreferencesUpdate = Partial<UserPreferences>;
