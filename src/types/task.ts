export type TaskStatus =
  | "backlog"
  | "todo"
  | "in-progress"
  | "done";

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  description: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}