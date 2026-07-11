import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  loadTasks,
  saveTasks,
} from "../services/taskStorage";

import type {
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from "../types/task";

import { INITIAL_TASKS } from "../utils/constants";

function generateTaskId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(
    () => loadTasks() ?? INITIAL_TASKS,
  );

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function createTask(
    input: CreateTaskInput,
  ): Task {
    const currentDate =
      new Date().toISOString();

    const newTask: Task = {
      id: generateTaskId(),
      title: input.title.trim(),
      description:
        input.description.trim(),
      status: input.status,
      priority: input.priority,
      createdAt: currentDate,
      updatedAt: currentDate,
      dueDate:
        input.dueDate?.trim() || undefined,
      tags: normalizeTags(input.tags),
    };

    setTasks((currentTasks) => [
      ...currentTasks,
      newTask,
    ]);

    return newTask;
  }

  function updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): void {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          ...input,

          title:
            input.title !== undefined
              ? input.title.trim()
              : task.title,

          description:
            input.description !== undefined
              ? input.description.trim()
              : task.description,

          dueDate:
            input.dueDate !== undefined
              ? input.dueDate.trim() ||
                undefined
              : task.dueDate,

          tags:
            input.tags !== undefined
              ? normalizeTags(input.tags)
              : task.tags,

          updatedAt:
            new Date().toISOString(),
        };
      }),
    );
  }

  function deleteTask(taskId: string): void {
    setTasks((currentTasks) =>
      currentTasks.filter(
        (task) => task.id !== taskId,
      ),
    );
  }

  function moveTask(
    taskId: string,
    newStatus: TaskStatus,
  ): void {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (
          task.id !== taskId ||
          task.status === newStatus
        ) {
          return task;
        }

        return {
          ...task,
          status: newStatus,
          updatedAt:
            new Date().toISOString(),
        };
      }),
    );
  }

  function getTaskById(
    taskId: string,
  ): Task | undefined {
    return tasks.find(
      (task) => task.id === taskId,
    );
  }

  function getTasksByStatus(
    status: TaskStatus,
  ): Task[] {
    return tasks.filter(
      (task) => task.status === status,
    );
  }

  function resetTasks(): void {
    setTasks(
      INITIAL_TASKS.map((task) => ({
        ...task,
        tags: [...task.tags],
      })),
    );
  }

  function clearAllTasks(): void {
    setTasks([]);
  }

  const taskCounters = useMemo(() => {
    return tasks.reduce(
      (counters, task) => {
        counters.total += 1;

        if (task.status === "backlog") {
          counters.backlog += 1;
        }

        if (task.status === "todo") {
          counters.todo += 1;
        }

        if (task.status === "in-progress") {
          counters.inProgress += 1;
        }

        if (task.status === "done") {
          counters.done += 1;
        }

        return counters;
      },
      {
        total: 0,
        backlog: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      },
    );
  }, [tasks]);

  return {
    tasks,
    taskCounters,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTaskById,
    getTasksByStatus,
    resetTasks,
    clearAllTasks,
  };
}