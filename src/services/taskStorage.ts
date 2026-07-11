import type {
  Task,
  TaskPriority,
  TaskStatus,
} from "../types/task";

const STORAGE_KEY = "taskflow:tasks";

const VALID_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in-progress",
  "done",
];

const VALID_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTaskStatus(
  value: unknown,
): value is TaskStatus {
  return (
    isString(value) &&
    VALID_STATUSES.includes(value as TaskStatus)
  );
}

function isTaskPriority(
  value: unknown,
): value is TaskPriority {
  return (
    isString(value) &&
    VALID_PRIORITIES.includes(
      value as TaskPriority,
    )
  );
}

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isString)
  );
}

function isValidDateString(
  value: unknown,
): value is string {
  if (!isString(value)) {
    return false;
  }

  return !Number.isNaN(
    new Date(value).getTime(),
  );
}

function isTask(value: unknown): value is Task {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const task = value as Record<
    string,
    unknown
  >;

  const hasValidDueDate =
    task.dueDate === undefined ||
    task.dueDate === "" ||
    isValidDateString(task.dueDate);

  return (
    isString(task.id) &&
    task.id.trim().length > 0 &&
    isString(task.title) &&
    task.title.trim().length > 0 &&
    isString(task.description) &&
    isTaskStatus(task.status) &&
    isTaskPriority(task.priority) &&
    isValidDateString(task.createdAt) &&
    isValidDateString(task.updatedAt) &&
    hasValidDueDate &&
    isStringArray(task.tags)
  );
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    title: task.title.trim(),
    description: task.description.trim(),
    dueDate:
      task.dueDate?.trim() || undefined,
    tags: Array.from(
      new Set(
        task.tags
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ),
  };
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks),
    );
  } catch (error) {
    console.error(
      "Não foi possível salvar as tarefas:",
      error,
    );
  }
}

export function loadTasks(): Task[] | null {
  try {
    const storedValue =
      localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      clearTasks();
      return null;
    }

    const validTasks = parsedValue
      .filter(isTask)
      .map(normalizeTask);

    if (
      parsedValue.length > 0 &&
      validTasks.length === 0
    ) {
      clearTasks();
      return null;
    }

    return validTasks;
  } catch (error) {
    console.error(
      "Não foi possível carregar as tarefas:",
      error,
    );

    clearTasks();

    return null;
  }
}

export function clearTasks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error(
      "Não foi possível limpar as tarefas:",
      error,
    );
  }
}