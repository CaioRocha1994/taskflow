import { FiBarChart2, FiColumns, FiLogOut, FiMoon, FiPlus, FiSettings, FiSun, FiUser } from "react-icons/fi";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import type { Membership } from "../../types/workspace";
import { NotificationsMenu } from "../NotificationsMenu/NotificationsMenu";
import "./Header.css";

interface HeaderProps {
  totalTasks: number;
  completedTasks: number;
  companyName: string;
  userName: string;
  role: string;
  memberships: Membership[];
  activeOrganizationId: string;
  currentUserId: string;
  isDashboardOpen: boolean;
  canManage: boolean;
  onCreateTask: () => void;
  onSettings: () => void;
  onAccountSettings: () => void;
  onToggleDashboard: () => void;
  onOpenNotificationTask: (taskId: string) => void;
  onOrganizationChange: (id: string) => void;
  onSignOut: () => void;
}

export function Header({
  totalTasks,
  completedTasks,
  companyName,
  userName,
  role,
  memberships,
  activeOrganizationId,
  currentUserId,
  isDashboardOpen,
  canManage,
  onCreateTask,
  onSettings,
  onAccountSettings,
  onToggleDashboard,
  onOpenNotificationTask,
  onOrganizationChange,
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
            <span className="taskflow-header__eyebrow">{companyName} · {role}</span>
            <h1>TaskFlow</h1>
            <p>Organize prioridades, acompanhe entregas e mantenha o fluxo de trabalho sob controle.</p>
          </div>
        </div>

        <div className="taskflow-header__actions">
          {memberships.length > 1 && (
            <select className="taskflow-header__organization" value={activeOrganizationId} onChange={(event) => onOrganizationChange(event.target.value)}>
              {memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>{membership.organization.name}</option>
              ))}
            </select>
          )}
          {canManage && (
            <button type="button" className="taskflow-header__button taskflow-header__button--secondary" onClick={onSettings}>
              <FiSettings size={18} /> Administrar
            </button>
          )}
          <button
            type="button"
            className={`taskflow-header__button taskflow-header__button--secondary${isDashboardOpen ? " taskflow-header__button--active" : ""}`}
            onClick={onToggleDashboard}
          >
            {isDashboardOpen ? <FiColumns size={18} /> : <FiBarChart2 size={18} />}
            {isDashboardOpen ? "Voltar ao quadro" : "Dashboard"}
          </button>
          <NotificationsMenu
            organizationId={activeOrganizationId}
            userId={currentUserId}
            onOpenTask={onOpenNotificationTask}
          />
          <button
            type="button"
            className="taskflow-header__button taskflow-header__button--secondary taskflow-header__theme-toggle"
            aria-label={`Ativar tema ${preferences.theme === "dark" ? "claro" : "escuro"}`}
            title={`Tema atual: ${preferences.theme === "dark" ? "Escuro" : "Claro"}`}
            onClick={() => void toggleTheme()}
          >
            {preferences.theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
            {preferences.theme === "dark" ? "Claro" : "Escuro"}
          </button>
          <button type="button" className="taskflow-header__button taskflow-header__button--secondary" onClick={onAccountSettings}>
            <FiUser size={18} /> Minha conta
          </button>
          <button type="button" className="taskflow-header__button taskflow-header__button--primary" onClick={onCreateTask}>
            <FiPlus size={20} /> Nova tarefa
          </button>
          <button type="button" className="taskflow-header__button taskflow-header__button--secondary" title={`Sair da conta de ${userName}`} onClick={onSignOut}>
            <FiLogOut size={18} /> Sair
          </button>
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
