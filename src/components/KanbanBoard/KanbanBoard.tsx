import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  sortTasksByPriorityAndDueDate,
} from "../../utils/taskHelpers";

import { KanbanColumn } from "../KanbanColumn/KanbanColumn";

import type {
  Task,
  TaskStatus,
} from "../../types/task";

import { KANBAN_COLUMNS } from "../../utils/constants";

import "./KanbanBoard.css";

interface KanbanBoardProps {
  tasks: Task[];
  onCreateTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetails: (task: Task) => void;
  onMoveTask: (
    taskId: string,
    newStatus: TaskStatus,
  ) => void;
}

function isTaskStatus(
  value: string,
): value is TaskStatus {
  return [
    "backlog",
    "todo",
    "in-progress",
    "done",
  ].includes(value);
}

export function KanbanBoard({
  tasks,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onOpenTaskDetails,
  onMoveTask,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const destinationStatus = String(over.id);

    if (!isTaskStatus(destinationStatus)) {
      return;
    }

    const draggedTask = tasks.find(
      (task) => task.id === taskId,
    );

    if (!draggedTask) {
      return;
    }

    if (
      draggedTask.status === destinationStatus
    ) {
      return;
    }

    onMoveTask(taskId, destinationStatus);
  }

  return (
    <section className="kanban-board">
      <div className="kanban-board__heading">
        <div>
          <span className="kanban-board__eyebrow">
            Fluxo de trabalho
          </span>

          <h2>Quadro Kanban</h2>

          <p>
            Arraste uma tarefa para atualizar seu
            status.
          </p>
        </div>

        <span className="kanban-board__result-count">
          {tasks.length} tarefa(s) exibida(s)
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board__columns">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks =
              sortTasksByPriorityAndDueDate(
                tasks.filter(
                  (task) =>
                    task.status === column.id,
                ),
              );

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onCreateTask={() =>
                  onCreateTask(column.id)
                }
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onOpenTaskDetails={
                  onOpenTaskDetails
                }
              />
            );
          })}
        </div>
      </DndContext>
    </section>
  );
}