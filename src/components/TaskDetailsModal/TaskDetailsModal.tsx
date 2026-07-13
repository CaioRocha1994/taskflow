import { useEffect, useState } from "react";
import {
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import { getSupabase } from "../../lib/supabase";
import type { Task } from "../../types/task";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../utils/constants";
import "./TaskDetailsModal.css";

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canManage: boolean;
}

interface TaskActivity {
  id: number;
  actorId: string | null;
  actorName: string;
  action: "created" | "updated" | "deleted";
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  createdAt: string;
}

interface TaskActivityRow {
  id: number;
  actor_id: string | null;
  action: "created" | "updated" | "deleted";
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

function formatDate(date?: string): string {
  if (!date) return "Não definido";
  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(normalizedDate));
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function describeActivity(activity: TaskActivity): string {
  if (activity.action === "created") return "criou a tarefa";
  if (activity.action === "deleted") return "excluiu a tarefa";

  const before = activity.beforeData ?? {};
  const after = activity.afterData ?? {};
  const changes: string[] = [];

  if (before.status !== after.status && typeof before.status === "string" && typeof after.status === "string") {
    const oldStatus = STATUS_LABELS[before.status as keyof typeof STATUS_LABELS] ?? before.status;
    const newStatus = STATUS_LABELS[after.status as keyof typeof STATUS_LABELS] ?? after.status;
    changes.push(`alterou o status de ${oldStatus} para ${newStatus}`);
  }
  if (before.priority !== after.priority && typeof before.priority === "string" && typeof after.priority === "string") {
    const oldPriority = PRIORITY_LABELS[before.priority as keyof typeof PRIORITY_LABELS] ?? before.priority;
    const newPriority = PRIORITY_LABELS[after.priority as keyof typeof PRIORITY_LABELS] ?? after.priority;
    changes.push(`alterou a prioridade de ${oldPriority} para ${newPriority}`);
  }
  if (before.assignee_id !== after.assignee_id) changes.push("alterou o responsável");
  if (before.team_id !== after.team_id) changes.push("moveu a tarefa para outra equipe");
  if (before.due_date !== after.due_date) changes.push("alterou o prazo");
  if (before.title !== after.title) changes.push("alterou o título");
  if (before.description !== after.description) changes.push("atualizou a descrição");
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) changes.push("atualizou as tags");

  if (changes.length === 0) return "atualizou a tarefa";
  if (changes.length <= 2) return changes.join(" e ");
  return `${changes.slice(0, 2).join(" e ")} e mais ${changes.length - 2} alteração(ões)`;
}

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canManage,
}: TaskDetailsModalProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !task) {
      setActivities([]);
      setHistoryError("");
      return;
    }

    let active = true;

    async function loadHistory(taskId: string) {
      setIsLoadingHistory(true);
      setHistoryError("");

      const { data, error } = await getSupabase()
        .from("task_activity")
        .select("id, actor_id, action, before_data, after_data, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!active) return;
      if (error) {
        setHistoryError("Não foi possível carregar o histórico.");
        setIsLoadingHistory(false);
        return;
      }

      const rows = (data ?? []) as TaskActivityRow[];
      const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
      const actorNames = new Map<string, string>();

      if (actorIds.length > 0) {
        const { data: profiles } = await getSupabase()
          .from("profiles")
          .select("id, full_name, email")
          .in("id", actorIds);

        for (const profile of (profiles ?? []) as Array<{ id: string; full_name: string; email: string }>) {
          actorNames.set(profile.id, profile.full_name || profile.email);
        }
      }

      if (!active) return;
      setActivities(rows.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actorName: row.actor_id ? actorNames.get(row.actor_id) ?? "Usuário" : "Sistema",
        action: row.action,
        beforeData: row.before_data,
        afterData: row.after_data,
        createdAt: row.created_at,
      })));
      setIsLoadingHistory(false);
    }

    void loadHistory(task.id);
    return () => {
      active = false;
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  return (
    <div className="task-details__overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="task-details" role="dialog" aria-modal="true" aria-labelledby="task-details-title">
        <header className="task-details__header">
          <div>
            <span className="task-details__eyebrow">Detalhes da tarefa</span>
            <h2 id="task-details-title">{task.title}</h2>
          </div>
          <button type="button" className="task-details__close" aria-label="Fechar detalhes" onClick={onClose}>
            <FiX size={21} />
          </button>
        </header>

        <div className="task-details__content">
          <div className="task-details__badges">
            <span className={`task-details__priority task-details__priority--${task.priority}`}>
              Prioridade: {PRIORITY_LABELS[task.priority]}
            </span>
            <span className="task-details__status">{STATUS_LABELS[task.status]}</span>
          </div>

          <section className="task-details__section">
            <h3>Descrição</h3>
            <p>{task.description || "Nenhuma descrição informada."}</p>
          </section>

          <section className="task-details__section">
            <h3>Alocação</h3>
            <div className="task-details__allocation">
              <div>
                <FiBriefcase size={18} />
                <span><small>Equipe ou setor</small><strong>{task.teamName}</strong></span>
              </div>
              <div>
                <FiUser size={18} />
                <span><small>Responsável</small><strong>{task.assigneeName || "Não atribuído"}</strong></span>
              </div>
            </div>
          </section>

          <section className="task-details__section">
            <h3>Tags</h3>
            <div className="task-details__tags">
              {task.tags.length > 0 ? task.tags.map((tag) => <span key={tag}>{tag}</span>) : <p>Nenhuma tag cadastrada.</p>}
            </div>
          </section>

          <div className="task-details__dates">
            <div>
              <FiCalendar size={18} />
              <span><small>Prazo</small><strong>{formatDate(task.dueDate)}</strong></span>
            </div>
            <div>
              <FiClock size={18} />
              <span><small>Última atualização</small><strong>{formatDateTime(task.updatedAt)}</strong></span>
            </div>
          </div>

          <section className="task-details__section task-details__history">
            <h3><FiActivity /> Histórico de atividade</h3>
            {isLoadingHistory && <p className="task-details__history-state">Carregando movimentações...</p>}
            {historyError && <p className="task-details__history-state task-details__history-state--error">{historyError}</p>}
            {!isLoadingHistory && !historyError && activities.length === 0 && (
              <p className="task-details__history-state">Nenhuma movimentação registrada.</p>
            )}
            <ol>
              {activities.map((activity) => (
                <li key={activity.id}>
                  <span className="task-details__history-marker" />
                  <div>
                    <p><strong>{activity.actorName}</strong> {describeActivity(activity)}</p>
                    <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {canManage && (
          <footer className="task-details__footer">
            <button type="button" className="task-details__button task-details__button--danger" onClick={() => { onClose(); onDelete(task); }}>
              <FiTrash2 size={17} /> Excluir
            </button>
            <button type="button" className="task-details__button task-details__button--primary" onClick={() => { onClose(); onEdit(task); }}>
              <FiEdit2 size={17} /> Editar tarefa
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
