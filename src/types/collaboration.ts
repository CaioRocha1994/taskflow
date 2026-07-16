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
  | "comment"
  | "due_today"
  | "due_tomorrow"
  | "overdue";

export interface WorkspaceNotification {
  id: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}
