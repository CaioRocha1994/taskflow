import { useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiClock,
  FiMessageSquare,
  FiUserCheck,
} from "react-icons/fi";
import { useNotifications } from "../../hooks/useNotifications";
import type { NotificationType } from "../../types/collaboration";
import "./NotificationsMenu.css";

interface NotificationsMenuProps {
  organizationId: string;
  userId: string;
  onOpenTask: (taskId: string) => void;
}

function formatRelativeDate(date: string) {
  const difference = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days} dia${days === 1 ? "" : "s"}`;
}

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === "assignment") return <FiUserCheck />;
  if (type === "comment") return <FiMessageSquare />;
  if (type === "overdue") return <FiAlertTriangle />;
  return <FiClock />;
}

export function NotificationsMenu({ organizationId, userId, onOpenTask }: NotificationsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useNotifications(organizationId, userId);

  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function openNotification(notificationId: string, taskId?: string) {
    setMutationError("");
    try {
      await store.markAsRead(notificationId);
    } catch {
      setMutationError("Não foi possível atualizar a notificação.");
    }
    setIsOpen(false);
    if (taskId) onOpenTask(taskId);
  }

  async function markAllAsRead() {
    setMutationError("");
    try {
      await store.markAllAsRead();
    } catch {
      setMutationError("Não foi possível marcar as notificações como lidas.");
    }
  }

  return (
    <div className="notifications-menu" ref={containerRef}>
      <button
        type="button"
        className="taskflow-header__button taskflow-header__button--secondary notifications-menu__trigger"
        aria-label={`Notificações${store.unreadCount ? `, ${store.unreadCount} não lidas` : ""}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FiBell size={18} />
        <span>Notificações</span>
        {store.unreadCount > 0 && <strong>{store.unreadCount > 99 ? "99+" : store.unreadCount}</strong>}
      </button>

      {isOpen && (
        <section className="notifications-menu__panel" aria-label="Central de notificações">
          <header>
            <div><strong>Notificações</strong><span>{store.unreadCount} não lida(s)</span></div>
            {store.unreadCount > 0 && (
              <button type="button" onClick={() => void markAllAsRead()}>
                <FiCheck /> Marcar todas
              </button>
            )}
          </header>

          <div className="notifications-menu__list">
            {store.isLoading && <p className="notifications-menu__state">Carregando...</p>}
            {(store.error || mutationError) && (
              <p className="notifications-menu__state notifications-menu__state--error">
                {mutationError || "Não foi possível carregar as notificações."}
              </p>
            )}
            {!store.isLoading && !store.error && !mutationError && store.notifications.length === 0 && (
              <p className="notifications-menu__state">Nenhuma notificação por enquanto.</p>
            )}
            {store.notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notifications-menu__item${notification.readAt ? "" : " notifications-menu__item--unread"}`}
                onClick={() => void openNotification(notification.id, notification.taskId)}
              >
                <span className={`notifications-menu__icon notifications-menu__icon--${notification.type}`}>
                  <NotificationIcon type={notification.type} />
                </span>
                <span>
                  <strong>{notification.title}</strong>
                  <small>{notification.body}</small>
                  <time dateTime={notification.createdAt}>{formatRelativeDate(notification.createdAt)}</time>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
