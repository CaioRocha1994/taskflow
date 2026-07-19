import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from "../types/task";
import type { Team, WorkspaceMember } from "../types/workspace";

interface TaskRow {
  id: string;
  organization_id: string;
  team_id: string;
  assignee_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Task["priority"];
  due_date: string | null;
  deadline_at: string | null;
  tags: string[];
  task_tags?: Array<{ tag: { id: string; name: string } | Array<{ id: string; name: string }> | null }>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function mapTask(row: TaskRow, teams: Team[], members: WorkspaceMember[]): Task {
  const team = teams.find((item) => item.id === row.team_id);
  const assignee = members.find((item) => item.userId === row.assignee_id);
  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    teamName: team?.name ?? "Equipe",
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: assignee?.fullName,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    deadlineAt: row.deadline_at ?? undefined,
    tags: row.task_tags?.flatMap((relation) => {
      if (Array.isArray(relation.tag)) return relation.tag.map((tag) => tag.name);
      return relation.tag?.name ? [relation.tag.name] : [];
    }) ?? row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export function useTasks(
  organizationId: string,
  teams: Team[],
  members: WorkspaceMember[],
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setError("");
    const { data, error: queryError } = await getSupabase()
      .from("tasks")
      .select("*, task_tags(tag:tags(id, name))")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (queryError) setError(queryError.message);
    else setTasks(((data ?? []) as TaskRow[]).map((row) => mapTask(row, teams, members)));
    setIsLoading(false);
  }, [organizationId, teams, members]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!organizationId) return;
    const channel = getSupabase()
      .channel(`tasks:${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `organization_id=eq.${organizationId}` },
        () => void loadTasks(),
      )
      .subscribe();
    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [organizationId, loadTasks]);

  async function createTask(input: CreateTaskInput): Promise<void> {
    const { error: mutationError } = await getSupabase().rpc("save_task_with_tags", {
      p_task_id: null,
      p_organization_id: organizationId,
      p_team_id: input.teamId,
      p_assignee_id: input.assigneeId || null,
      p_title: input.title,
      p_description: input.description,
      p_status: input.status,
      p_priority: input.priority,
      p_deadline_at: input.deadlineAt || null,
      p_tag_names: input.tags,
    });
    if (mutationError) throw mutationError;
    await loadTasks();
  }

  async function updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
    if (
      input.teamId !== undefined
      && input.title !== undefined
      && input.description !== undefined
      && input.status !== undefined
      && input.priority !== undefined
      && input.tags !== undefined
    ) {
      const { error: saveError } = await getSupabase().rpc("save_task_with_tags", {
        p_task_id: taskId,
        p_organization_id: organizationId,
        p_team_id: input.teamId,
        p_assignee_id: input.assigneeId || null,
        p_title: input.title,
        p_description: input.description,
        p_status: input.status,
        p_priority: input.priority,
        p_deadline_at: input.deadlineAt || null,
        p_tag_names: input.tags,
      });
      if (saveError) throw saveError;
      await loadTasks();
      return;
    }

    const payload: Record<string, unknown> = {};
    if (input.teamId !== undefined) payload.team_id = input.teamId;
    if (input.assigneeId !== undefined) payload.assignee_id = input.assigneeId || null;
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.description !== undefined) payload.description = input.description.trim();
    if (input.status !== undefined) payload.status = input.status;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.dueDate !== undefined) payload.due_date = input.dueDate || null;
    if (input.deadlineAt !== undefined) payload.deadline_at = input.deadlineAt || null;

    const { error: mutationError } = await getSupabase()
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .eq("organization_id", organizationId);
    if (mutationError) throw mutationError;
    await loadTasks();
  }

  async function deleteTask(taskId: string): Promise<void> {
    const { error: mutationError } = await getSupabase()
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("organization_id", organizationId);
    if (mutationError) throw mutationError;
    await loadTasks();
  }

  async function moveTask(taskId: string, status: TaskStatus): Promise<void> {
    await updateTask(taskId, { status });
  }

  const taskCounters = useMemo(
    () =>
      tasks.reduce(
        (result, task) => {
          result.total += 1;
          if (task.status === "backlog") result.backlog += 1;
          if (task.status === "todo") result.todo += 1;
          if (task.status === "in-progress") result.inProgress += 1;
          if (task.status === "done") result.done += 1;
          return result;
        },
        { total: 0, backlog: 0, todo: 0, inProgress: 0, done: 0 },
      ),
    [tasks],
  );

  return { tasks, taskCounters, isLoading, error, createTask, updateTask, deleteTask, moveTask, refresh: loadTasks };
}
