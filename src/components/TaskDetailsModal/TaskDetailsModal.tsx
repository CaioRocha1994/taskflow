import { useEffect } from "react";

import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import type { Task } from "../../types/task";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../../utils/constants";

import "./TaskDetailsModal.css";

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canManage: boolean;
}

function formatDate(date?: string): string {
  if (!date) {
    return "Não definido";
  }

  const normalizedDate = date.includes("T")
    ? date
    : `${date}T00:00:00`;

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

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canManage,
}: TaskDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) {
    return null;
  }

  return (
    <div
      className="task-details__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="task-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
      >
        <header className="task-details__header">
          <div>
            <span className="task-details__eyebrow">
              Detalhes da tarefa
            </span>

            <h2 id="task-details-title">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            className="task-details__close"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            <FiX size={21} />
          </button>
        </header>

        <div className="task-details__content">
          <div className="task-details__badges">
            <span
              className={`task-details__priority task-details__priority--${task.priority}`}
            >
              Prioridade:{" "}
              {PRIORITY_LABELS[task.priority]}
            </span>

            <span className="task-details__status">
              {STATUS_LABELS[task.status]}
            </span>
          </div>

          <section className="task-details__section">
            <h3>Descrição</h3>

            <p>
              {task.description ||
                "Nenhuma descrição informada."}
            </p>
          </section>

          <section className="task-details__section">
            <h3>Tags</h3>

            <div className="task-details__tags">
              {task.tags.length > 0 ? (
                task.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))
              ) : (
                <p>Nenhuma tag cadastrada.</p>
              )}
            </div>
          </section>

          <div className="task-details__dates">
            <div>
              <FiCalendar size={18} />

              <span>
                <small>Prazo</small>
                <strong>
                  {formatDate(task.dueDate)}
                </strong>
              </span>
            </div>

            <div>
              <FiClock size={18} />

              <span>
                <small>Última atualização</small>
                <strong>
                  {formatDateTime(task.updatedAt)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {canManage && <footer className="task-details__footer">
          <button
            type="button"
            className="task-details__button task-details__button--danger"
            onClick={() => {
              onClose();
              onDelete(task);
            }}
          >
            <FiTrash2 size={17} />
            Excluir
          </button>

          <button
            type="button"
            className="task-details__button task-details__button--primary"
            onClick={() => {
              onClose();
              onEdit(task);
            }}
          >
            <FiEdit2 size={17} />
            Editar tarefa
          </button>
        </footer>}
      </section>
    </div>
  );
}
