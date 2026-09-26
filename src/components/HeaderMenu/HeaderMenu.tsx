import { useEffect, useId, useRef, useState } from "react";
import {
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiColumns,
  FiFolder,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSettings,
  FiSun,
  FiUser,
} from "react-icons/fi";
import type { AppTheme } from "../../types/preferences";
import type { Membership, ProjectMembership } from "../../types/workspace";
import "./HeaderMenu.css";

interface HeaderMenuProps {
  theme: AppTheme;
  memberships: Membership[];
  projectMemberships: ProjectMembership[];
  activeOrganizationId: string;
  activeProjectId: string;
  isDashboardOpen: boolean;
  isProjectsOpen: boolean;
  canManage: boolean;
  userName: string;
  onToggleDashboard: () => void;
  onToggleProjects: () => void;
  onOrganizationChange: (id: string) => void;
  onProjectChange: (id: string) => void;
  onAccountSettings: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

export function HeaderMenu({
  theme,
  memberships,
  projectMemberships,
  activeOrganizationId,
  activeProjectId,
  isDashboardOpen,
  isProjectsOpen,
  canManage,
  userName,
  onToggleDashboard,
  onToggleProjects,
  onOrganizationChange,
  onProjectChange,
  onAccountSettings,
  onSettings,
  onToggleTheme,
  onSignOut,
}: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const focusFrame = window.requestAnimationFrame(() => firstItemRef.current?.focus());

    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function runAction(action: () => void) {
    setIsOpen(false);
    action();
  }

  const nextTheme = theme === "dark" ? "claro" : "escuro";

  return (
    <div className="header-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`taskflow-header__button taskflow-header__button--secondary header-menu__trigger${isOpen ? " header-menu__trigger--open" : ""}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="menu"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FiMenu size={18} />
        <FiChevronDown className="header-menu__chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={panelId} className="header-menu__panel" role="menu" aria-label="Menu da conta">
          <button
            type="button"
            role="menuitem"
            className={`header-menu__item header-menu__mobile-only${isDashboardOpen ? " header-menu__item--active" : ""}`}
            aria-current={isDashboardOpen ? "page" : undefined}
            onClick={() => runAction(onToggleDashboard)}
          >
            {isDashboardOpen ? <FiColumns /> : <FiBarChart2 />}
            <span>
              <strong>{isDashboardOpen ? "Voltar ao quadro" : "Dashboard"}</strong>
              <small>{isDashboardOpen ? "Visualizar o quadro de tarefas" : "Visualizar indicadores e progresso"}</small>
            </span>
          </button>

          <button type="button" role="menuitem" className={`header-menu__item header-menu__mobile-only${isProjectsOpen ? " header-menu__item--active" : ""}`} onClick={() => runAction(onToggleProjects)}>
            <FiFolder />
            <span><strong>Projetos</strong><small>Trocar ou criar um projeto</small></span>
          </button>

          <label className="header-menu__organization">
            <span><FiFolder /> Projeto</span>
            <select value={activeProjectId} aria-label="Selecionar projeto" onChange={(event) => { setIsOpen(false); onProjectChange(event.target.value); }}>
              {projectMemberships.filter(({ project }) => project.status === "active").map(({ project }) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>

          {memberships.length > 1 && (
            <label className="header-menu__organization">
              <span><FiBriefcase /> Empresa</span>
              <select
                value={activeOrganizationId}
                aria-label="Selecionar empresa"
                onChange={(event) => {
                  setIsOpen(false);
                  onOrganizationChange(event.target.value);
                }}
              >
                {memberships.map((membership) => (
                  <option key={membership.organizationId} value={membership.organizationId}>
                    {membership.organization.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button ref={firstItemRef} type="button" role="menuitem" className="header-menu__item" onClick={() => runAction(onAccountSettings)}>
            <FiUser />
            <span><strong>Minha conta</strong><small>Perfil, senha e preferências</small></span>
          </button>

          {canManage && (
            <button type="button" role="menuitem" className="header-menu__item" onClick={() => runAction(onSettings)}>
              <FiSettings />
              <span><strong>Administrar</strong><small>Projeto, equipes e usuários</small></span>
            </button>
          )}

          <button type="button" role="menuitem" className="header-menu__item" onClick={() => runAction(onToggleTheme)}>
            {theme === "dark" ? <FiSun /> : <FiMoon />}
            <span><strong>Cor do tema</strong><small>Ativar tema {nextTheme}</small></span>
          </button>

          <div className="header-menu__divider" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="header-menu__item header-menu__item--danger"
            title={`Sair da conta de ${userName}`}
            onClick={() => runAction(onSignOut)}
          >
            <FiLogOut />
            <span><strong>Sair</strong><small>Encerrar a sessão com segurança</small></span>
          </button>
        </div>
      )}
    </div>
  );
}
