import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { FiX } from "react-icons/fi";

import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
} from "../../types/task";
import type { Team, WorkspaceMember } from "../../types/workspace";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../../utils/constants";

import "./TaskModal.css";

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  initialStatus?: TaskStatus;
  teams: Team[];
  members: WorkspaceMember[];
  currentUserId: string;
  canManage: boolean;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => Promise<void>;
  onUpdate: (
    taskId: string,
    input: CreateTaskInput,
  ) => Promise<void>;
}

interface TaskFormData {
  teamId: string;
  assigneeId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tags: string;
}

const EMPTY_FORM: TaskFormData = {
  teamId: "",
  assigneeId: "",
  title: "",
  description: "",
  status: "backlog",
  priority: "medium",
  dueDate: "",
  tags: "",
};

export function TaskModal({
  isOpen,
  task,
  initialStatus = "backlog",
  teams,
  members,
  currentUserId,
  canManage,
  onClose,
  onCreate,
  onUpdate,
}: TaskModalProps) {
  const [formData, setFormData] =
    useState<TaskFormData>(EMPTY_FORM);

  const [titleError, setTitleError] =
    useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (task) {
      setFormData({
        teamId: task.teamId,
        assigneeId: task.assigneeId ?? "",
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? "",
        tags: task.tags.join(", "),
      });

      setTitleError("");
      return;
    }

    setFormData({
      ...EMPTY_FORM,
      teamId:
        teams.find((team) =>
          canManage || members.find((member) => member.userId === currentUserId)?.teamIds.includes(team.id),
        )?.id ?? "",
      assigneeId: canManage ? "" : currentUserId,
      status: initialStatus,
    });

    setTitleError("");
  }, [isOpen, task, initialStatus, teams, members, currentUserId, canManage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  function updateField<
    Key extends keyof TaskFormData,
  >(field: Key, value: TaskFormData[Key]) {
    setFormData((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedTitle =
      formData.title.trim();

    if (!normalizedTitle) {
      setTitleError(
        "Informe um título para a tarefa.",
      );

      return;
    }

    const input: CreateTaskInput = {
      teamId: formData.teamId,
      assigneeId: formData.assigneeId,
      title: normalizedTitle,
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || undefined,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      setIsSubmitting(true);
      setFormError("");
      if (task) await onUpdate(task.id, input);
      else await onCreate(input);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="task-modal__overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <header className="task-modal__header">
          <div>
            <span className="task-modal__eyebrow">
              {isEditing
                ? "Atualização de tarefa"
                : "Nova demanda"}
            </span>

            <h2 id="task-modal-title">
              {isEditing
                ? "Editar tarefa"
                : "Criar nova tarefa"}
            </h2>

            <p>
              Preencha os dados necessários para
              manter o quadro organizado.
            </p>
          </div>

          <button
            type="button"
            className="task-modal__close"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <FiX size={21} />
          </button>
        </header>

        <form
          className="task-modal__form"
          onSubmit={handleSubmit}
        >
          <label className="task-modal__field">
            <span>Equipe ou setor<strong>*</strong></span>
            <select required value={formData.teamId} disabled={!canManage && Boolean(task)} onChange={(event) => updateField("teamId", event.target.value)}>
              <option value="" disabled>Selecione</option>
              {teams
                .filter((team) => canManage || members.find((member) => member.userId === currentUserId)?.teamIds.includes(team.id))
                .map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>

          <label className="task-modal__field">
            <span>Responsável</span>
            <select value={formData.assigneeId} disabled={!canManage} onChange={(event) => updateField("assigneeId", event.target.value)}>
              {canManage && <option value="">Sem responsável</option>}
              {members
                .filter((member) => canManage || member.userId === currentUserId)
                .filter((member) => !formData.teamId || member.teamIds.includes(formData.teamId))
                .map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
            </select>
          </label>
          <label className="task-modal__field task-modal__field--full">
            <span>
              Título
              <strong>*</strong>
            </span>

            <input
              autoFocus
              type="text"
              value={formData.title}
              maxLength={100}
              placeholder="Ex.: Criar página de login"
              onChange={(event) => {
                updateField(
                  "title",
                  event.target.value,
                );

                if (titleError) {
                  setTitleError("");
                }
              }}
            />

            <small
              className={
                titleError
                  ? "task-modal__error"
                  : "task-modal__counter"
              }
            >
              {titleError ||
                `${formData.title.length}/100 caracteres`}
            </small>
          </label>

          <label className="task-modal__field task-modal__field--full">
            <span>Descrição</span>

            <textarea
              value={formData.description}
              rows={5}
              maxLength={500}
              placeholder="Descreva os detalhes, critérios e contexto da tarefa."
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
            />

            <small className="task-modal__counter">
              {formData.description.length}/500
              caracteres
            </small>
          </label>

          <label className="task-modal__field">
            <span>Status</span>

            <select
              value={formData.status}
              onChange={(event) =>
                updateField(
                  "status",
                  event.target.value as TaskStatus,
                )
              }
            >
              {Object.entries(
                STATUS_LABELS,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-modal__field">
            <span>Prioridade</span>

            <select
              value={formData.priority}
              onChange={(event) =>
                updateField(
                  "priority",
                  event.target
                    .value as TaskPriority,
                )
              }
            >
              {Object.entries(
                PRIORITY_LABELS,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-modal__field">
            <span>Prazo</span>

            <input
              type="date"
              value={formData.dueDate}
              onChange={(event) =>
                updateField(
                  "dueDate",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="task-modal__field">
            <span>Tags</span>

            <input
              type="text"
              value={formData.tags}
              placeholder="React, Front-End, UI"
              onChange={(event) =>
                updateField(
                  "tags",
                  event.target.value,
                )
              }
            />

            <small>
              Separe as tags por vírgula.
            </small>
          </label>

          <footer className="task-modal__footer">
            {formError && <p className="task-modal__error">{formError}</p>}
            <button
              type="button"
              className="task-modal__button task-modal__button--secondary"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="task-modal__button task-modal__button--primary"
            >
              {isSubmitting ? "Salvando…" : isEditing
                ? "Salvar alterações"
                : "Criar tarefa"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
