import {
  FiAlertCircle,
  FiCalendar,
  FiEdit2,
  FiMoreHorizontal,
  FiTrash2,
} from "react-icons/fi";

import type { Task } from "../../types/task";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../../utils/constants";

import {
  isTaskDueToday,
  isTaskOverdue,
} from "../../utils/taskHelpers";

import "./TaskCard.css";

interface TaskCardProps {
  task: Task;
  canManage: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenDetails: (task: Task) => void;
}

function formatDate(date?: string): string {
  if (!date) {
    return "Sem prazo";
  }

  const parsedDate = new Date(date.includes("T") ? date : `${date}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(date.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsedDate);
}

export function TaskCard({
  task,
  canManage,
  onEdit,
  onDelete,
  onOpenDetails,
}: TaskCardProps) {
  const isOverdue = isTaskOverdue(task);
  const isDueToday = isTaskDueToday(task);

  return (
    <article
      className={`task-card ${
        isOverdue
          ? "task-card--overdue"
          : ""
      }`}
      onClick={() => onOpenDetails(task)}
    >
      <div className="task-card__top">
        <span
          className={`task-card__priority task-card__priority--${task.priority}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        <button
          type="button"
          className="task-card__details-button"
          aria-label={`Abrir detalhes da tarefa ${task.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(task);
          }}
        >
          <FiMoreHorizontal size={19} />
        </button>
      </div>

      <div className="task-card__content">
        <h3>{task.title}</h3>

        <p>{task.description}</p>
        <small className="task-card__assignment">{task.teamName} · {task.assigneeName ?? "Sem responsável"}</small>
      </div>

      {task.tags.length > 0 && (
        <div className="task-card__tags">
          {task.tags
            .slice(0, 3)
            .map((tag) => (
              <span key={tag}>{tag}</span>
            ))}

          {task.tags.length > 3 && (
            <span>
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="task-card__meta">
        <div
          className={`task-card__date ${
            isOverdue
              ? "task-card__date--overdue"
              : ""
          } ${
            isDueToday
              ? "task-card__date--today"
              : ""
          }`}
        >
          {isOverdue || isDueToday ? (
            <FiAlertCircle size={16} />
          ) : (
            <FiCalendar size={16} />
          )}

          <span>
            {isOverdue
              ? `Atrasada · ${formatDate(
                  task.deadlineAt ?? task.dueDate,
                )}`
              : isDueToday
                ? "Vence hoje"
                : formatDate(task.deadlineAt ?? task.dueDate)}
          </span>
        </div>

        <span className="task-card__status">
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {canManage && <div className="task-card__actions">
        <button
          type="button"
          className="task-card__action-button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(task);
          }}
        >
          <FiEdit2 size={16} />
          Editar
        </button>

        <button
          type="button"
          className="task-card__action-button task-card__action-button--danger"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task);
          }}
        >
          <FiTrash2 size={16} />
          Excluir
        </button>
      </div>}
    </article>
  );
}
