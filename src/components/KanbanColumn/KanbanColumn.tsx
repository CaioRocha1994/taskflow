import type { CSSProperties } from "react";

import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";
import { FiPlus } from "react-icons/fi";

import { TaskCard } from "../TaskCard/TaskCard";

import type {
  KanbanColumn as KanbanColumnType,
  Task,
} from "../../types/task";

import "./KanbanColumn.css";

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetails: (task: Task) => void;
}

interface DraggableTaskCardProps {
  task: Task;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetails: (task: Task) => void;
}

function DraggableTaskCard({
  task,
  onEditTask,
  onDeleteTask,
  onOpenTaskDetails,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: {
      taskId: task.id,
      currentStatus: task.status,
    },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-column__draggable ${
        isDragging
          ? "kanban-column__draggable--dragging"
          : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <TaskCard
        task={task}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onOpenDetails={onOpenTaskDetails}
      />
    </div>
  );
}

export function KanbanColumn({
  column,
  tasks,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onOpenTaskDetails,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      status: column.id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${
        isOver ? "kanban-column--over" : ""
      }`}
    >
      <header className="kanban-column__header">
        <div>
          <div className="kanban-column__title-row">
            <span
              className={`kanban-column__indicator kanban-column__indicator--${column.id}`}
            />

            <h2>{column.title}</h2>

            <span className="kanban-column__counter">
              {tasks.length}
            </span>
          </div>

          <p>{column.description}</p>
        </div>

        <button
          type="button"
          className="kanban-column__add-button"
          aria-label={`Criar tarefa em ${column.title}`}
          onClick={onCreateTask}
        >
          <FiPlus size={18} />
        </button>
      </header>

      <div className="kanban-column__tasks">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onOpenTaskDetails={onOpenTaskDetails}
          />
        ))}

        {tasks.length === 0 && (
          <div className="kanban-column__empty">
            <span>
              Arraste uma tarefa para esta coluna
              ou crie uma nova.
            </span>

            <button
              type="button"
              onClick={onCreateTask}
            >
              <FiPlus size={16} />
              Criar tarefa
            </button>
          </div>
        )}
      </div>
    </section>
  );
}