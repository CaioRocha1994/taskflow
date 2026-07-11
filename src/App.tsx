import {
  useMemo,
  useState,
} from "react";

import { DeleteTaskModal } from "./components/DeleteTaskModal/DeleteTaskModal";
import { Filters } from "./components/Filters/Filters";
import { Header } from "./components/Header/Header";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { TaskDetailsModal } from "./components/TaskDetailsModal/TaskDetailsModal";
import { TaskModal } from "./components/TaskModal/TaskModal";

import { useTasks } from "./hooks/useTasks";

import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
} from "./types/task";

function App() {
  const {
    tasks,
    taskCounters,
    canUndo,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    undoLastAction,
  } = useTasks();

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<TaskStatus | "all">("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<TaskPriority | "all">("all");

  const [
    isTaskModalOpen,
    setIsTaskModalOpen,
  ] = useState(false);

  const [
    selectedTask,
    setSelectedTask,
  ] = useState<Task | null>(null);

  const [
    initialTaskStatus,
    setInitialTaskStatus,
  ] = useState<TaskStatus>("backlog");

  const [
    taskPendingDeletion,
    setTaskPendingDeletion,
  ] = useState<Task | null>(null);

  const [
    taskInDetails,
    setTaskInDetails,
  ] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch === "" ||
        task.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        task.description
          .toLowerCase()
          .includes(normalizedSearch) ||
        task.tags.some((tag) =>
          tag
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  function handleOpenCreateModal(
    status: TaskStatus = "backlog",
  ) {
    setSelectedTask(null);
    setInitialTaskStatus(status);
    setIsTaskModalOpen(true);
  }

  function handleOpenEditModal(task: Task) {
    setTaskInDetails(null);
    setSelectedTask(task);
    setInitialTaskStatus(task.status);
    setIsTaskModalOpen(true);
  }

  function handleCloseTaskModal() {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }

  function handleCreateTask(
    input: CreateTaskInput,
  ) {
    createTask(input);
  }

  function handleUpdateTask(
    taskId: string,
    input: CreateTaskInput,
  ) {
    updateTask(taskId, input);
  }

  function handleDeleteTask(task: Task) {
    setTaskInDetails(null);
    setTaskPendingDeletion(task);
  }

  function handleCloseDeleteModal() {
    setTaskPendingDeletion(null);
  }

  function handleConfirmDelete(
    taskId: string,
  ) {
    deleteTask(taskId);
  }

  function handleOpenTaskDetails(
    task: Task,
  ) {
    setTaskInDetails(task);
  }

  function handleCloseTaskDetails() {
    setTaskInDetails(null);
  }

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  function handleUndo() {
    undoLastAction();

    setSelectedTask(null);
    setTaskPendingDeletion(null);
    setTaskInDetails(null);
  }

  return (
    <main>
      <Header
        totalTasks={taskCounters.total}
        completedTasks={taskCounters.done}
        canUndo={canUndo}
        onCreateTask={() =>
          handleOpenCreateModal("backlog")
        }
        onUndo={handleUndo}
      />

      <Filters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onClearFilters={handleClearFilters}
      />

      <KanbanBoard
        tasks={filteredTasks}
        onCreateTask={handleOpenCreateModal}
        onEditTask={handleOpenEditModal}
        onDeleteTask={handleDeleteTask}
        onOpenTaskDetails={
          handleOpenTaskDetails
        }
        onMoveTask={moveTask}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        task={selectedTask}
        initialStatus={initialTaskStatus}
        onClose={handleCloseTaskModal}
        onCreate={handleCreateTask}
        onUpdate={handleUpdateTask}
      />

      <DeleteTaskModal
        isOpen={Boolean(
          taskPendingDeletion,
        )}
        task={taskPendingDeletion}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <TaskDetailsModal
        isOpen={Boolean(taskInDetails)}
        task={taskInDetails}
        onClose={handleCloseTaskDetails}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteTask}
      />
    </main>
  );
}

export default App;