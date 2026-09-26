import { FiBarChart2, FiColumns, FiFolder, FiPlus } from "react-icons/fi";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import type { Membership, ProjectMembership } from "../../types/workspace";
import { HeaderMenu } from "../HeaderMenu/HeaderMenu";
import { NotificationsMenu } from "../NotificationsMenu/NotificationsMenu";
import "./Header.css";

interface HeaderProps {
  totalTasks: number;
  completedTasks: number;
  companyName: string;
  projectName: string;
  userName: string;
  role: string;
  memberships: Membership[];
  projectMemberships: ProjectMembership[];
  activeOrganizationId: string;
  activeProjectId: string;
  currentUserId: string;
  isDashboardOpen: boolean;
  isProjectsOpen: boolean;
  canManage: boolean;
  onCreateTask: () => void;
  onSettings: () => void;
  onAccountSettings: () => void;
  onToggleDashboard: () => void;
  onToggleProjects: () => void;
  onOpenNotificationTask: (projectId: string, taskId: string) => void;
  onOrganizationChange: (id: string) => void;
  onProjectChange: (id: string) => void;
  onSignOut: () => void;
}

export function Header({
  totalTasks,
  completedTasks,
  companyName,
  projectName,
  userName,
  role,
  memberships,
  projectMemberships,
  activeOrganizationId,
  activeProjectId,
  currentUserId,
  isDashboardOpen,
  isProjectsOpen,
  canManage,
  onCreateTask,
  onSettings,
  onAccountSettings,
  onToggleDashboard,
  onToggleProjects,
  onOpenNotificationTask,
  onOrganizationChange,
  onProjectChange,
  onSignOut,
}: HeaderProps) {
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const { preferences, toggleTheme } = useUserPreferences();

  return (
    <header className="taskflow-header">
      <div className="taskflow-header__content">
        <div className="taskflow-header__brand">
          <div className="taskflow-header__logo"><span>TF</span></div>
          <div>
            <span className="taskflow-header__eyebrow">{companyName} · {projectName} · {role}</span>
            <h1>TaskFlow</h1>
            <p>Organize prioridades, acompanhe entregas e mantenha o fluxo de trabalho sob controle.</p>
          </div>
        </div>

        <div className="taskflow-header__actions">
          {memberships.length > 1 && (
            <select className="taskflow-header__organization taskflow-header__organization--desktop" value={activeOrganizationId} onChange={(event) => onOrganizationChange(event.target.value)} aria-label="Selecionar empresa">
              {memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>{membership.organization.name}</option>
              ))}
            </select>
          )}
          <select className="taskflow-header__organization taskflow-header__organization--desktop" value={activeProjectId} onChange={(event) => onProjectChange(event.target.value)} aria-label="Selecionar projeto">
            {projectMemberships.filter(({ project }) => project.status === "active").map(({ project }) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button type="button" className="taskflow-header__button taskflow-header__button--primary taskflow-header__new-task" onClick={onCreateTask}>
            <FiPlus size={20} /> Nova tarefa
          </button>
          <button
            type="button"
            className={`taskflow-header__button taskflow-header__button--secondary taskflow-header__dashboard--desktop${isDashboardOpen ? " taskflow-header__button--active" : ""}`}
            onClick={onToggleDashboard}
          >
            {isDashboardOpen ? <FiColumns size={18} /> : <FiBarChart2 size={18} />}
            {isDashboardOpen ? "Voltar ao quadro" : "Dashboard"}
          </button>
          <button type="button" className={`taskflow-header__button taskflow-header__button--secondary taskflow-header__dashboard--desktop${isProjectsOpen ? " taskflow-header__button--active" : ""}`} onClick={onToggleProjects}>
            <FiFolder size={18} /> Projetos
          </button>
          <NotificationsMenu
            organizationId={activeOrganizationId}
            projectId={activeProjectId}
            projects={projectMemberships}
            userId={currentUserId}
            onOpenTask={onOpenNotificationTask}
          />
          <HeaderMenu
            theme={preferences.theme}
            memberships={memberships}
            projectMemberships={projectMemberships}
            activeOrganizationId={activeOrganizationId}
            activeProjectId={activeProjectId}
            isDashboardOpen={isDashboardOpen}
            isProjectsOpen={isProjectsOpen}
            canManage={canManage}
            userName={userName}
            onToggleDashboard={onToggleDashboard}
            onToggleProjects={onToggleProjects}
            onOrganizationChange={onOrganizationChange}
            onProjectChange={onProjectChange}
            onAccountSettings={onAccountSettings}
            onSettings={onSettings}
            onToggleTheme={() => void toggleTheme()}
            onSignOut={onSignOut}
          />
        </div>
      </div>

      <div className="taskflow-header__metrics">
        <article className="taskflow-header__metric"><span>Total de tarefas</span><strong>{totalTasks}</strong></article>
        <article className="taskflow-header__metric"><span>Concluídas</span><strong>{completedTasks}</strong></article>
        <article className="taskflow-header__metric taskflow-header__metric--progress">
          <div className="taskflow-header__metric-title"><span>Progresso</span><strong>{completionRate}%</strong></div>
          <div className="taskflow-header__progress-track"><div className="taskflow-header__progress-value" style={{ width: `${completionRate}%` }} /></div>
        </article>
      </div>
    </header>
  );
}
