import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "../lib/supabase";
import type { AppTheme, UserPreferences, UserPreferencesUpdate } from "../types/preferences";
import { getNextTheme } from "../utils/preferences";
import { UserPreferencesContext, type UserPreferencesContextValue } from "./userPreferencesContextValue";

interface PreferencesRow {
  theme: AppTheme;
  browser_notifications_enabled: boolean;
  email_due_notifications_enabled: boolean;
  due_soon_minutes: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  browserNotificationsEnabled: false,
  emailDueNotificationsEnabled: false,
  dueSoonMinutes: 15,
};

function mapPreferences(row: PreferencesRow): UserPreferences {
  return {
    theme: row.theme,
    browserNotificationsEnabled: row.browser_notifications_enabled,
    emailDueNotificationsEnabled: row.email_due_notifications_enabled,
    dueSoonMinutes: row.due_soon_minutes,
  };
}

function toRow(userId: string, preferences: UserPreferences) {
  return {
    user_id: userId,
    theme: preferences.theme,
    browser_notifications_enabled: preferences.browserNotificationsEnabled,
    email_due_notifications_enabled: preferences.emailDueNotificationsEnabled,
    due_soon_minutes: preferences.dueSoonMinutes,
  };
}

export function UserPreferencesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPreferences = useCallback(async () => {
    setError("");
    const client = getSupabase();
    const { data, error: queryError } = await client
      .from("user_preferences")
      .select("theme, browser_notifications_enabled, email_due_notifications_enabled, due_soon_minutes")
      .eq("user_id", userId)
      .maybeSingle();

    if (queryError) {
      setError("Não foi possível carregar suas preferências.");
      setIsLoading(false);
      return;
    }

    if (data) {
      setPreferences(mapPreferences(data as PreferencesRow));
    } else {
      const { data: created, error: insertError } = await client
        .from("user_preferences")
        .insert(toRow(userId, DEFAULT_PREFERENCES))
        .select("theme, browser_notifications_enabled, email_due_notifications_enabled, due_soon_minutes")
        .single();
      if (insertError) setError("Não foi possível criar suas preferências.");
      else setPreferences(mapPreferences(created as PreferencesRow));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadPreferences();
    const client = getSupabase();
    const channel = client
      .channel(`user-preferences:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_preferences", filter: `user_id=eq.${userId}` },
        () => void loadPreferences(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadPreferences, userId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.style.colorScheme = preferences.theme;
    return () => {
      delete root.dataset.theme;
      root.style.removeProperty("color-scheme");
    };
  }, [preferences.theme]);

  const updatePreferences = useCallback(async (update: UserPreferencesUpdate) => {
    const previous = preferences;
    const next = { ...previous, ...update };
    setPreferences(next);
    setError("");

    const row = toRow(userId, next);
    const { error: updateError } = await getSupabase()
      .from("user_preferences")
      .update({
        theme: row.theme,
        browser_notifications_enabled: row.browser_notifications_enabled,
        email_due_notifications_enabled: row.email_due_notifications_enabled,
        due_soon_minutes: row.due_soon_minutes,
      })
      .eq("user_id", userId);

    if (updateError) {
      setPreferences(previous);
      setError("Não foi possível salvar suas preferências.");
      throw updateError;
    }
  }, [preferences, userId]);

  const toggleTheme = useCallback(
    () => updatePreferences({ theme: getNextTheme(preferences.theme) }),
    [preferences.theme, updatePreferences],
  );

  const setBrowserNotificationsEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (!("Notification" in window)) {
        throw new Error("Este navegador não oferece notificações do sistema.");
      }
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        throw new Error("Permita as notificações nas configurações do navegador.");
      }
    }
    await updatePreferences({ browserNotificationsEnabled: enabled });
  }, [updatePreferences]);

  const value = useMemo<UserPreferencesContextValue>(() => ({
    preferences,
    isLoading,
    error,
    updatePreferences,
    toggleTheme,
    setBrowserNotificationsEnabled,
  }), [preferences, isLoading, error, updatePreferences, toggleTheme, setBrowserNotificationsEnabled]);

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}
