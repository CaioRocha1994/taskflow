import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { TaskAttachment, TaskComment } from "../types/collaboration";
import type { Task } from "../types/task";

interface CommentRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

const ATTACHMENTS_BUCKET = "task-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 140);
}

export function useTaskCollaboration(
  task: Task | null,
  isOpen: boolean,
  currentUserId: string,
) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const taskId = task?.id;

  const loadCollaboration = useCallback(async () => {
    if (!task || !isOpen) return;

    setIsLoading(true);
    setError("");
    const client = getSupabase();
    const [commentsResult, attachmentsResult] = await Promise.all([
      client
        .from("task_comments")
        .select("id, author_id, body, created_at, updated_at")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true }),
      client
        .from("task_attachments")
        .select("id, uploaded_by, storage_path, file_name, mime_type, file_size, created_at")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = commentsResult.error ?? attachmentsResult.error;
    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const commentRows = (commentsResult.data ?? []) as CommentRow[];
    const attachmentRows = (attachmentsResult.data ?? []) as AttachmentRow[];
    const profileIds = [...new Set([
      ...commentRows.map((row) => row.author_id),
      ...attachmentRows.map((row) => row.uploaded_by),
    ])];
    const profileNames = new Map<string, string>();

    if (profileIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      for (const profile of (profiles ?? []) as Array<{ id: string; full_name: string; email: string }>) {
        profileNames.set(profile.id, profile.full_name || profile.email);
      }
    }

    setComments(commentRows.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      authorName: profileNames.get(row.author_id) ?? "Usuário",
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
    setAttachments(attachmentRows.map((row) => ({
      id: row.id,
      uploadedBy: row.uploaded_by,
      uploaderName: profileNames.get(row.uploaded_by) ?? "Usuário",
      storagePath: row.storage_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      createdAt: row.created_at,
    })));
    setIsLoading(false);
  }, [isOpen, task]);

  useEffect(() => {
    if (!isOpen || !taskId) {
      setComments([]);
      setAttachments([]);
      setError("");
      return;
    }

    void loadCollaboration();

    const client = getSupabase();
    const channel = client
      .channel(`task-collaboration:${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        () => void loadCollaboration(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_attachments", filter: `task_id=eq.${taskId}` },
        () => void loadCollaboration(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [isOpen, taskId, loadCollaboration]);

  async function addComment(body: string) {
    if (!task) return;
    setBusyKey("comment");
    setError("");
    try {
      const { error: mutationError } = await getSupabase().from("task_comments").insert({
        organization_id: task.organizationId,
        task_id: task.id,
        author_id: currentUserId,
        body: body.trim(),
      });
      if (mutationError) throw mutationError;
      await loadCollaboration();
    } finally {
      setBusyKey("");
    }
  }

  async function deleteComment(commentId: string) {
    setBusyKey(`comment-${commentId}`);
    try {
      const { error: mutationError } = await getSupabase()
        .from("task_comments")
        .delete()
        .eq("id", commentId);
      if (mutationError) throw mutationError;
      await loadCollaboration();
    } finally {
      setBusyKey("");
    }
  }

  async function uploadAttachment(file: File) {
    if (!task) return;
    if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo deve ter no máximo 10 MB.");
    if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Este tipo de arquivo não é permitido.");

    setBusyKey("attachment");
    setError("");
    const client = getSupabase();
    const attachmentId = crypto.randomUUID();
    const fileName = sanitizeFileName(file.name) || "arquivo";
    const storagePath = `${task.organizationId}/${task.id}/${attachmentId}-${fileName}`;

    try {
      const { error: uploadError } = await client.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await client.from("task_attachments").insert({
        id: attachmentId,
        organization_id: task.organizationId,
        task_id: task.id,
        uploaded_by: currentUserId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      });

      if (metadataError) {
        await client.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
        throw metadataError;
      }

      await loadCollaboration();
    } finally {
      setBusyKey("");
    }
  }

  async function openAttachment(storagePath: string) {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;

    const { data, error: signedUrlError } = await getSupabase().storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, 60);

    if (signedUrlError) {
      previewWindow?.close();
      throw signedUrlError;
    }

    if (previewWindow) previewWindow.location.href = data.signedUrl;
    else window.location.assign(data.signedUrl);
  }

  async function deleteAttachment(attachment: TaskAttachment) {
    setBusyKey(`attachment-${attachment.id}`);
    const client = getSupabase();
    try {
      const { error: storageError } = await client.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([attachment.storagePath]);
      if (storageError) throw storageError;

      const { error: metadataError } = await client
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);
      if (metadataError) throw metadataError;
      await loadCollaboration();
    } finally {
      setBusyKey("");
    }
  }

  return {
    comments,
    attachments,
    isLoading,
    busyKey,
    error,
    addComment,
    deleteComment,
    uploadAttachment,
    openAttachment,
    deleteAttachment,
    refresh: loadCollaboration,
  };
}
