import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ConfigurationRequired, AuthScreen, LoadingScreen, Onboarding, UpdatePasswordScreen } from "./components/Access/Access";
import { DeleteTaskModal } from "./components/DeleteTaskModal/DeleteTaskModal";
import { Filters } from "./components/Filters/Filters";
import { Header } from "./components/Header/Header";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { TaskDetailsModal } from "./components/TaskDetailsModal/TaskDetailsModal";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { WorkspaceSettings } from "./components/WorkspaceSettings/WorkspaceSettings";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useWorkspace } from "./hooks/useWorkspace";
import { getSupabase, isSupabaseConfigured } from "./lib/supabase";
import type { Task, TaskPriority, TaskStatus } from "./types/task";

const ROLE_LABELS = { owner: "Proprietário", admin: "Administrador", member: "Membro" } as const;

function AuthenticatedApp({ session, onSignOut }: { session: Session; onSignOut: () => Promise<void> }) {
  const workspace = useWorkspace(session.user.id);
  const refreshWorkspace = workspace.refresh;
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(
    () => new URLSearchParams(window.location.search).has("invite"),
  );
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;

    async function acceptInvite() {
      const { error } = await getSupabase().rpc("accept_invitation", { p_token: token });
      if (error) setInviteError(error.message);
      else {
        window.history.replaceState({}, "", window.location.pathname);
        refreshWorkspace();
      }
      setIsAcceptingInvite(false);
    }
    void acceptInvite();
  }, [refreshWorkspace]);

  if (workspace.isLoading || isAcceptingInvite) return <LoadingScreen />;
  if (workspace.error && workspace.memberships.length === 0) {
    return <main className="access-shell"><section className="access-card"><h1>Não foi possível carregar</h1><p>{workspace.error}</p></section></main>;
  }
  if (workspace.memberships.length === 0) {
    return <Onboarding onComplete={workspace.refresh} />;
  }
  if (!workspace.activeMembership) return <LoadingScreen />;

  return (
    <TaskFlowWorkspace
      session={session}
      workspace={workspace}
      inviteError={inviteError}
      onSignOut={onSignOut}
    />
  );
}

interface WorkspaceHook extends ReturnType<typeof useWorkspace> {}

function TaskFlowWorkspace({
  session,
  workspace,
  inviteError,
  onSignOut,
}: {
  session: Session;
  workspace: WorkspaceHook;
  inviteError: string;
  onSignOut: () => Promise<void>;
}) {
  const membership = workspace.activeMembership!;
  const canManage = membership.role === "owner" || membership.role === "admin";
  const taskStore = useTasks(
    membership.organizationId,
    session.user.id,
    workspace.teams,
    workspace.members,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus>("backlog");
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);
  const [taskInDetails, setTaskInDetails] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [operationError, setOperationError] = useState(inviteError);

  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return taskStore.tasks.filter((task) => {
      const matchesSearch = !search || [task.title, task.description, task.teamName, task.assigneeName ?? "", ...task.tags]
        .some((value) => value.toLowerCase().includes(search));
      return matchesSearch && (statusFilter === "all" || task.status === statusFilter) && (priorityFilter === "all" || task.priority === priorityFilter);
    });
  }, [taskStore.tasks, searchTerm, statusFilter, priorityFilter]);

  function openCreateModal(status: TaskStatus = "backlog") {
    setSelectedTask(null);
    setInitialTaskStatus(status);
    setIsTaskModalOpen(true);
  }

  function openEditModal(task: Task) {
    if (!canManage) return;
    setTaskInDetails(null);
    setSelectedTask(task);
    setInitialTaskStatus(task.status);
    setIsTaskModalOpen(true);
  }

  async function deleteTask(taskId: string) {
    try {
      await taskStore.deleteTask(taskId);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Não foi possível excluir a tarefa.");
    }
  }

  const userName = session.user.user_metadata.full_name || session.user.email || "Usuário";

  return (
    <main>
      <Header
        totalTasks={taskStore.taskCounters.total}
        completedTasks={taskStore.taskCounters.done}
        companyName={membership.organization.name}
        userName={userName}
        role={ROLE_LABELS[membership.role]}
        memberships={workspace.memberships}
        activeOrganizationId={workspace.activeOrganizationId}
        canManage={canManage}
        onCreateTask={() => openCreateModal()}
        onSettings={() => setIsSettingsOpen(true)}
        onOrganizationChange={workspace.setActiveOrganizationId}
        onSignOut={() => void onSignOut()}
      />

      {(operationError || taskStore.error) && (
        <div className="app-feedback" role="alert">
          <span>{operationError || taskStore.error}</span>
          <button onClick={() => setOperationError("")}>Fechar</button>
        </div>
      )}

      <Filters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onClearFilters={() => { setSearchTerm(""); setStatusFilter("all"); setPriorityFilter("all"); }}
      />

      {taskStore.isLoading ? <section className="board-loading">Carregando tarefas…</section> : (
        <KanbanBoard
          tasks={filteredTasks}
          canManage={canManage}
          onCreateTask={openCreateModal}
          onEditTask={openEditModal}
          onDeleteTask={(task) => setTaskPendingDeletion(task)}
          onOpenTaskDetails={setTaskInDetails}
          onMoveTask={(taskId, status) => void taskStore.moveTask(taskId, status).catch((error: unknown) => setOperationError(error instanceof Error ? error.message : "Não foi possível mover a tarefa."))}
        />
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        task={selectedTask}
        initialStatus={initialTaskStatus}
        teams={workspace.teams}
        members={workspace.members}
        currentUserId={session.user.id}
        canManage={canManage}
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
        onCreate={taskStore.createTask}
        onUpdate={taskStore.updateTask}
      />
      <DeleteTaskModal isOpen={Boolean(taskPendingDeletion)} task={taskPendingDeletion} onClose={() => setTaskPendingDeletion(null)} onConfirm={(id) => void deleteTask(id)} />
      <TaskDetailsModal isOpen={Boolean(taskInDetails)} task={taskInDetails} canManage={canManage} onClose={() => setTaskInDetails(null)} onEdit={openEditModal} onDelete={(task) => { setTaskInDetails(null); setTaskPendingDeletion(task); }} />
      <WorkspaceSettings isOpen={isSettingsOpen} organizationId={membership.organizationId} currentUserId={session.user.id} teams={workspace.teams} members={workspace.members} onClose={() => setIsSettingsOpen(false)} onChanged={workspace.refresh} />
    </main>
  );
}

function ConnectedApp() {
  const { session, isLoading, isPasswordRecovery, setIsPasswordRecovery, signOut } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;
  if (isPasswordRecovery) return <UpdatePasswordScreen onComplete={() => setIsPasswordRecovery(false)} />;
  return <AuthenticatedApp session={session} onSignOut={signOut} />;
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  return <ConnectedApp />;
}
