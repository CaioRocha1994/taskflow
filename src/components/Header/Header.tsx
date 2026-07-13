import { FiLogOut, FiPlus, FiSettings } from "react-icons/fi";
import type { Membership } from "../../types/workspace";
import "./Header.css";

interface HeaderProps {
  totalTasks: number;
  completedTasks: number;
  companyName: string;
  userName: string;
  role: string;
  memberships: Membership[];
  activeOrganizationId: string;
  canManage: boolean;
  onCreateTask: () => void;
  onSettings: () => void;
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
  canManage,
  onCreateTask,
  onSettings,
  onOrganizationChange,
  onSignOut,
}: HeaderProps) {
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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
