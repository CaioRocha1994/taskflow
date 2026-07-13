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
  organizationId: string;
  teamId: string;
  teamName: string;
  assigneeId?: string;
  assigneeName?: string;
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
  teamId: string;
  assigneeId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
}

export interface UpdateTaskInput {
  teamId?: string;
  assigneeId?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}
