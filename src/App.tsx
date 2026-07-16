import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AccountSettings } from "./components/AccountSettings/AccountSettings";
import { ConfigurationRequired, AuthScreen, LoadingScreen, Onboarding, UpdatePasswordScreen } from "./components/Access/Access";
import { DeleteTaskModal } from "./components/DeleteTaskModal/DeleteTaskModal";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { Filters } from "./components/Filters/Filters";
import { Header } from "./components/Header/Header";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { TaskFlowLandingPage } from "./components/Marketing/TaskFlowLandingPage";
import { TaskDetailsModal } from "./components/TaskDetailsModal/TaskDetailsModal";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { WorkspaceSettings } from "./components/WorkspaceSettings/WorkspaceSettings";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useWorkspace } from "./hooks/useWorkspace";
import { getSupabase, isSupabaseConfigured } from "./lib/supabase";
import type { Task, TaskPriority, TaskStatus } from "./types/task";
import { isTaskFlowLandingPath, isTaskFlowLoginPath, TASKFLOW_PATHS } from "./utils/routes";

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
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"board" | "dashboard">("board");
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
        currentUserId={session.user.id}
        isDashboardOpen={activeView === "dashboard"}
        canManage={canManage}
        onCreateTask={() => openCreateModal()}
        onSettings={() => setIsSettingsOpen(true)}
        onAccountSettings={() => setIsAccountSettingsOpen(true)}
        onToggleDashboard={() => setActiveView((current) => current === "board" ? "dashboard" : "board")}
        onOpenNotificationTask={(taskId) => {
          const task = taskStore.tasks.find((item) => item.id === taskId);
          if (task) setTaskInDetails(task);
          else setOperationError("A tarefa desta notificação não está mais disponível.");
        }}
        onOrganizationChange={workspace.setActiveOrganizationId}
        onSignOut={() => void onSignOut()}
      />

      {(operationError || taskStore.error) && (
        <div className="app-feedback" role="alert">
          <span>{operationError || taskStore.error}</span>
          <button onClick={() => setOperationError("")}>Fechar</button>
        </div>
      )}

      {activeView === "board" && (
        <>
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
        </>
      )}

      {activeView === "dashboard" && (
        taskStore.isLoading ? <section className="board-loading">Carregando indicadores…</section> : (
          <Dashboard
            tasks={taskStore.tasks}
            teams={workspace.teams}
            members={workspace.members}
            companyName={membership.organization.name}
            currentUserId={session.user.id}
            canManage={canManage}
            onOpenTask={setTaskInDetails}
          />
        )
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
      <TaskDetailsModal isOpen={Boolean(taskInDetails)} task={taskInDetails} currentUserId={session.user.id} canManage={canManage} onClose={() => setTaskInDetails(null)} onEdit={openEditModal} onDelete={(task) => { setTaskInDetails(null); setTaskPendingDeletion(task); }} />
      <WorkspaceSettings isOpen={isSettingsOpen} organizationId={membership.organizationId} currentUserId={session.user.id} teams={workspace.teams} members={workspace.members} onClose={() => setIsSettingsOpen(false)} onChanged={workspace.refresh} />
      <AccountSettings
        isOpen={isAccountSettingsOpen}
        currentName={userName}
        email={session.user.email ?? ""}
        onClose={() => setIsAccountSettingsOpen(false)}
        onChanged={workspace.refresh}
      />
    </main>
  );
}

function ConnectedApp() {
  const { session, isLoading, isPasswordRecovery, setIsPasswordRecovery, signOut } = useAuth();

  useEffect(() => {
    document.title = session ? "TaskFlow | Painel" : "Entrar | TaskFlow";
    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
      ?? document.head.appendChild(document.createElement("meta"));
    robots.name = "robots";
    robots.content = "noindex, nofollow";
  }, [session]);

  useEffect(() => {
    if (isLoading) return;

    if (session && isTaskFlowLoginPath()) {
      window.history.replaceState({}, "", TASKFLOW_PATHS.app);
    } else if (!session && !isTaskFlowLoginPath()) {
      window.history.replaceState({}, "", TASKFLOW_PATHS.login);
    }
  }, [isLoading, session]);

  if (isLoading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;
  if (isPasswordRecovery) return <UpdatePasswordScreen onComplete={() => setIsPasswordRecovery(false)} />;
  return (
    <AuthenticatedApp
      session={session}
      onSignOut={async () => {
        await signOut();
        window.history.replaceState({}, "", TASKFLOW_PATHS.login);
      }}
    />
  );
}

export default function App() {
  if (isTaskFlowLandingPath()) return <TaskFlowLandingPage />;
  if (!isSupabaseConfigured) return <ConfigurationRequired />;
  return <ConnectedApp />;
}
