export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  uploadedBy: string;
  uploaderName: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export type NotificationType =
  | "assignment"
  | "task_updated"
  | "comment"
  | "mention"
  | "due_today"
  | "due_tomorrow"
  | "due_soon"
  | "overdue"
  | "project_invite";

export interface WorkspaceNotification {
  id: string;
  projectId: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}
