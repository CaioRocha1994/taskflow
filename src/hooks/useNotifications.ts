import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { useUserPreferences } from "./useUserPreferences";
import type { NotificationType, WorkspaceNotification } from "../types/collaboration";

interface NotificationRow {
  id: string;
  task_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function mapNotification(row: NotificationRow): WorkspaceNotification {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function useNotifications(organizationId: string, userId: string) {
  const { preferences } = useUserPreferences();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!organizationId || !userId) return;

    setError("");
    const client = getSupabase();
    const { error: dueNotificationsError } = await client.rpc("refresh_due_notifications", {
      p_organization_id: organizationId,
    });

    if (dueNotificationsError) {
      setError(dueNotificationsError.message);
      setIsLoading(false);
      return;
    }

    const { data, error: queryError } = await client
      .from("notifications")
      .select("id, task_id, type, title, body, read_at, created_at")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) setError(queryError.message);
    else {
      const mappedNotifications = ((data ?? []) as NotificationRow[]).map(mapNotification);
      setNotifications(mappedNotifications);

      if (
        preferences.browserNotificationsEnabled
        && "Notification" in window
        && Notification.permission === "granted"
      ) {
        mappedNotifications
          .filter((notification) => !notification.readAt && (notification.type === "due_soon" || notification.type === "overdue"))
          .forEach((notification) => {
            const storageKey = `taskflow:browser-notification:${notification.id}`;
            if (sessionStorage.getItem(storageKey)) return;
            const browserNotification = new Notification(notification.title, {
              body: notification.body,
              tag: notification.id,
            });
            browserNotification.onclick = () => window.focus();
            sessionStorage.setItem(storageKey, "shown");
          });
      }
    }
    setIsLoading(false);
  }, [organizationId, preferences.browserNotificationsEnabled, userId]);

  useEffect(() => {
    setNotifications([]);
    setIsLoading(true);
    void loadNotifications();

    const intervalId = window.setInterval(() => void loadNotifications(), 30_000);
    const handleFocus = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);

    const client = getSupabase();
    const channel = client
      .channel(`notifications:${userId}:${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void loadNotifications(),
      )
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      void client.removeChannel(channel);
    };
  }, [loadNotifications, organizationId, userId]);

  async function markAsRead(notificationId: string) {
    const readAt = new Date().toISOString();
    const { error: mutationError } = await getSupabase()
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId)
      .eq("user_id", userId);
    if (mutationError) throw mutationError;
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, readAt } : item
    )));
  }

  async function markAllAsRead() {
    const readAt = new Date().toISOString();
    const { error: mutationError } = await getSupabase()
      .from("notifications")
      .update({ read_at: readAt })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .is("read_at", null);
    if (mutationError) throw mutationError;
    setNotifications((current) => current.map((item) => (
      item.readAt ? item : { ...item, readAt }
    )));
  }

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}
