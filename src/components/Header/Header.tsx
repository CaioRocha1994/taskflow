import {
  FiCornerUpLeft,
  FiPlus,
} from "react-icons/fi";

import "./Header.css";

interface HeaderProps {
  totalTasks: number;
  completedTasks: number;
  canUndo: boolean;
  onCreateTask: () => void;
  onUndo: () => void;
}

export function Header({
  totalTasks,
  completedTasks,
  canUndo,
  onCreateTask,
  onUndo,
}: HeaderProps) {
  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100,
        );

  return (
    <header className="taskflow-header">
      <div className="taskflow-header__content">
        <div className="taskflow-header__brand">
          <div className="taskflow-header__logo">
            <span>TF</span>
          </div>

          <div>
            <span className="taskflow-header__eyebrow">
              Gestão visual de tarefas
            </span>

            <h1>TaskFlow</h1>

            <p>
              Organize prioridades, acompanhe entregas
              e mantenha o fluxo de trabalho sob
              controle.
            </p>
          </div>
        </div>

        <div className="taskflow-header__actions">
          <button
            type="button"
            className="taskflow-header__button taskflow-header__button--secondary"
            disabled={!canUndo}
            title={
              canUndo
                ? "Desfazer a última ação"
                : "Nenhuma ação disponível para desfazer"
            }
            onClick={onUndo}
          >
            <FiCornerUpLeft size={18} />
            Desfazer
          </button>

          <button
            type="button"
            className="taskflow-header__button taskflow-header__button--primary"
            onClick={onCreateTask}
          >
            <FiPlus size={20} />
            Nova tarefa
          </button>
        </div>
      </div>

      <div className="taskflow-header__metrics">
        <article className="taskflow-header__metric">
          <span>Total de tarefas</span>
          <strong>{totalTasks}</strong>
        </article>

        <article className="taskflow-header__metric">
          <span>Concluídas</span>
          <strong>{completedTasks}</strong>
        </article>

        <article className="taskflow-header__metric taskflow-header__metric--progress">
          <div className="taskflow-header__metric-title">
            <span>Progresso</span>
            <strong>{completionRate}%</strong>
          </div>

          <div className="taskflow-header__progress-track">
            <div
              className="taskflow-header__progress-value"
              style={{
                width: `${completionRate}%`,
              }}
            />
          </div>
        </article>
      </div>
    </header>
  );
}