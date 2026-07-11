import { useEffect } from "react";

import {
  FiAlertTriangle,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import type { Task } from "../../types/task";

import "./DeleteTaskModal.css";

interface DeleteTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (taskId: string) => void;
}

export function DeleteTaskModal({
  isOpen,
  task,
  onClose,
  onConfirm,
}: DeleteTaskModalProps) {
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

  if (!isOpen || !task) {
    return null;
  }

  const taskId = task.id;

  function handleConfirm() {
    onConfirm(taskId);
    onClose();
  }

  return (
    <div
      className="delete-task-modal__overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="delete-task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-modal-title"
        aria-describedby="delete-task-modal-description"
      >
        <header className="delete-task-modal__header">
          <div className="delete-task-modal__icon">
            <FiAlertTriangle size={26} />
          </div>

          <button
            type="button"
            className="delete-task-modal__close"
            aria-label="Fechar modal de exclusão"
            onClick={onClose}
          >
            <FiX size={20} />
          </button>
        </header>

        <div className="delete-task-modal__content">
          <span className="delete-task-modal__eyebrow">
            Confirmação necessária
          </span>

          <h2 id="delete-task-modal-title">
            Excluir tarefa?
          </h2>

          <p id="delete-task-modal-description">
            Você está prestes a excluir a tarefa:
          </p>

          <strong>{task.title}</strong>

          <p>
            Esta ação não poderá ser desfeita.
          </p>
        </div>

        <footer className="delete-task-modal__footer">
          <button
            type="button"
            className="delete-task-modal__button delete-task-modal__button--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="delete-task-modal__button delete-task-modal__button--danger"
            onClick={handleConfirm}
          >
            <FiTrash2 size={17} />
            Excluir tarefa
          </button>
        </footer>
      </section>
    </div>
  );
}