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

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    tags: [...task.tags],
  }));
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(
    () => loadTasks() ?? INITIAL_TASKS,
  );

  const [history, setHistory] = useState<Task[][]>([]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function saveCurrentStateToHistory(
    currentTasks: Task[],
  ): void {
    setHistory((currentHistory) => [
      ...currentHistory,
      cloneTasks(currentTasks),
    ]);
  }

  function createTask(
    input: CreateTaskInput,
  ): Task {
    const currentDate = new Date().toISOString();

    const newTask: Task = {
      id: generateTaskId(),
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status,
      priority: input.priority,
      createdAt: currentDate,
      updatedAt: currentDate,
      dueDate:
        input.dueDate?.trim() || undefined,
      tags: normalizeTags(input.tags),
    };

    setTasks((currentTasks) => {
      saveCurrentStateToHistory(currentTasks);

      return [
        ...currentTasks,
        newTask,
      ];
    });

    return newTask;
  }

  function updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): void {
    setTasks((currentTasks) => {
      const taskExists = currentTasks.some(
        (task) => task.id === taskId,
      );

      if (!taskExists) {
        return currentTasks;
      }

      saveCurrentStateToHistory(currentTasks);

      return currentTasks.map((task) => {
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

          updatedAt: new Date().toISOString(),
        };
      });
    });
  }

  function deleteTask(taskId: string): void {
    setTasks((currentTasks) => {
      const taskExists = currentTasks.some(
        (task) => task.id === taskId,
      );

      if (!taskExists) {
        return currentTasks;
      }

      saveCurrentStateToHistory(currentTasks);

      return currentTasks.filter(
        (task) => task.id !== taskId,
      );
    });
  }

  function moveTask(
    taskId: string,
    newStatus: TaskStatus,
  ): void {
    setTasks((currentTasks) => {
      const taskToMove = currentTasks.find(
        (task) => task.id === taskId,
      );

      if (
        !taskToMove ||
        taskToMove.status === newStatus
      ) {
        return currentTasks;
      }

      saveCurrentStateToHistory(currentTasks);

      return currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  }

  function undoLastAction(): void {
    setHistory((currentHistory) => {
      if (currentHistory.length === 0) {
        return currentHistory;
      }

      const previousTasks =
        currentHistory[currentHistory.length - 1];

      setTasks(cloneTasks(previousTasks));

      return currentHistory.slice(0, -1);
    });
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

  function clearAllTasks(): void {
    setTasks((currentTasks) => {
      if (currentTasks.length === 0) {
        return currentTasks;
      }

      saveCurrentStateToHistory(currentTasks);

      return [];
    });
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
    canUndo: history.length > 0,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    undoLastAction,
    getTaskById,
    getTasksByStatus,
    clearAllTasks,
  };
}