import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFlag,
  FiLayers,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";
import type { Team, WorkspaceMember } from "../../types/workspace";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../utils/constants";
import "./Dashboard.css";

type DashboardPeriod = 7 | 30 | 90;

interface DashboardProps {
  tasks: Task[];
  teams: Team[];
  members: WorkspaceMember[];
  companyName: string;
  currentUserId: string;
  canManage: boolean;
  onOpenTask: (task: Task) => void;
}

const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "in-progress", "done"];
const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseDueDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function isOverdue(task: Task, today: Date) {
  return Boolean(task.dueDate && task.status !== "done" && parseDueDate(task.dueDate) < today);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date.includes("T") ? date : `${date}T00:00:00`));
}

function formatDays(value: number | null) {
  if (value === null) return "—";
  if (value < 1) return "< 1 dia";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("pt-BR")} dia${rounded === 1 ? "" : "s"}`;
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export function Dashboard({
  tasks,
  teams,
  members,
  companyName,
  currentUserId,
  canManage,
  onOpenTask,
}: DashboardProps) {
  const [period, setPeriod] = useState<DashboardPeriod>(30);

  const metrics = useMemo(() => {
    const today = startOfDay();
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - period + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const activeTasks = tasks.filter((task) => task.status !== "done");
    const completedTasks = tasks.filter((task) => task.status === "done");
    const completedInPeriod = completedTasks.filter((task) => (
      task.completedAt && new Date(task.completedAt) >= periodStart
    ));
    const overdueTasks = activeTasks
      .filter((task) => isOverdue(task, today))
      .sort((first, second) => parseDueDate(first.dueDate!).getTime() - parseDueDate(second.dueDate!).getTime());
    const dueSoonTasks = activeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = parseDueDate(task.dueDate);
      return dueDate >= today && dueDate <= nextWeek;
    });
    const urgentTasks = activeTasks.filter((task) => task.priority === "urgent");
    const cycleTimes = completedTasks
      .filter((task) => task.completedAt)
      .map((task) => (
        (new Date(task.completedAt!).getTime() - new Date(task.createdAt).getTime()) / 86_400_000
      ))
      .filter((value) => value >= 0);
    const averageCycleTime = cycleTimes.length === 0
      ? null
      : cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length;
    const completedWithDueDate = completedTasks.filter((task) => task.dueDate && task.completedAt);
    const onTimeTasks = completedWithDueDate.filter((task) => {
      const dueDate = parseDueDate(task.dueDate!);
      dueDate.setHours(23, 59, 59, 999);
      return new Date(task.completedAt!) <= dueDate;
    });

    const statusCounts = Object.fromEntries(
      STATUS_ORDER.map((status) => [status, tasks.filter((task) => task.status === status).length]),
    ) as Record<TaskStatus, number>;
    const priorityCounts = Object.fromEntries(
      PRIORITY_ORDER.map((priority) => [priority, activeTasks.filter((task) => task.priority === priority).length]),
    ) as Record<TaskPriority, number>;

    const teamPerformance = teams
      .map((team) => {
        const teamTasks = tasks.filter((task) => task.teamId === team.id);
        const teamActive = teamTasks.filter((task) => task.status !== "done");
        const teamCompleted = teamTasks.filter((task) => task.status === "done");
        return {
          id: team.id,
          name: team.name,
          total: teamTasks.length,
          active: teamActive.length,
          completed: teamCompleted.length,
          overdue: teamActive.filter((task) => isOverdue(task, today)).length,
          rate: percentage(teamCompleted.length, teamTasks.length),
        };
      })
      .filter((team) => team.total > 0)
      .sort((first, second) => second.total - first.total);

    const visibleMembers = canManage
      ? members
      : members.filter((member) => member.userId === currentUserId);
    const memberWorkload = visibleMembers
      .map((member) => {
        const memberTasks = tasks.filter((task) => task.assigneeId === member.userId);
        const memberActive = memberTasks.filter((task) => task.status !== "done");
        return {
          id: member.userId,
          name: member.fullName,
          active: memberActive.length,
          overdue: memberActive.filter((task) => isOverdue(task, today)).length,
          urgent: memberActive.filter((task) => task.priority === "urgent").length,
          completed: memberTasks.filter((task) => task.status === "done").length,
        };
      })
      .filter((member) => member.active > 0 || member.completed > 0)
      .sort((first, second) => second.active - first.active);

    const recentCompletions = completedTasks
      .filter((task) => task.completedAt)
      .sort((first, second) => (
        new Date(second.completedAt!).getTime() - new Date(first.completedAt!).getTime()
      ))
      .slice(0, 6);

    return {
      total: tasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      completedInPeriod: completedInPeriod.length,
      overdue: overdueTasks.length,
      dueSoon: dueSoonTasks.length,
      urgent: urgentTasks.length,
      averageCycleTime,
      completionRate: percentage(completedTasks.length, tasks.length),
      onTimeRate: completedWithDueDate.length === 0
        ? null
        : percentage(onTimeTasks.length, completedWithDueDate.length),
      statusCounts,
      priorityCounts,
      teamPerformance,
      memberWorkload,
      overdueTasks: overdueTasks.slice(0, 6),
      recentCompletions,
    };
  }, [tasks, teams, members, period, canManage, currentUserId]);

  const health = metrics.overdue === 0
    ? { label: "Saudável", modifier: "healthy" }
    : metrics.active > 0 && metrics.overdue / metrics.active <= 0.15
      ? { label: "Atenção", modifier: "warning" }
      : { label: "Crítico", modifier: "critical" };

  const ringStyle = {
    "--dashboard-progress": `${metrics.completionRate * 3.6}deg`,
  } as CSSProperties;

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <span className="dashboard__eyebrow">{canManage ? "Visão gerencial" : "Minha produtividade"}</span>
          <h2>{canManage ? `Indicadores de ${companyName}` : "Resumo das minhas entregas"}</h2>
          <p>
            {canManage
              ? "Acompanhe capacidade, prazos e desempenho operacional por equipe e responsável."
              : "Acompanhe seus prazos, prioridades e evolução das tarefas atribuídas."}
          </p>
        </div>
        <label className="dashboard__period">
          <span>Entregas no período</span>
          <select value={period} onChange={(event) => setPeriod(Number(event.target.value) as DashboardPeriod)}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </label>
      </header>

      <div className="dashboard__summary">
        <article className="dashboard__score">
          <div className="dashboard__ring" style={ringStyle}>
            <span><strong>{metrics.completionRate}%</strong><small>concluído</small></span>
          </div>
          <div>
            <span className={`dashboard__health dashboard__health--${health.modifier}`}>{health.label}</span>
            <h3>Saúde operacional</h3>
            <p>{metrics.overdue === 0 ? "Nenhuma tarefa atrasada." : `${metrics.overdue} tarefa(s) precisam de atenção.`}</p>
          </div>
        </article>

        <div className="dashboard__kpis">
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--blue"><FiLayers /></span><div><small>Total</small><strong>{metrics.total}</strong><span>{metrics.active} em andamento</span></div></article>
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--green"><FiCheckCircle /></span><div><small>Entregas</small><strong>{metrics.completedInPeriod}</strong><span>nos últimos {period} dias</span></div></article>
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--red"><FiAlertTriangle /></span><div><small>Atrasadas</small><strong>{metrics.overdue}</strong><span>{metrics.urgent} urgentes ativas</span></div></article>
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--yellow"><FiCalendar /></span><div><small>Próximos 7 dias</small><strong>{metrics.dueSoon}</strong><span>com prazo próximo</span></div></article>
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--purple"><FiClock /></span><div><small>Tempo médio</small><strong>{formatDays(metrics.averageCycleTime)}</strong><span>da criação à conclusão</span></div></article>
          <article><span className="dashboard__kpi-icon dashboard__kpi-icon--cyan"><FiTarget /></span><div><small>No prazo</small><strong>{metrics.onTimeRate === null ? "—" : `${metrics.onTimeRate}%`}</strong><span>das entregas com prazo</span></div></article>
        </div>
      </div>

      <div className="dashboard__analytics">
        <article className="dashboard__panel">
          <header><div><FiTrendingUp /><span><strong>Distribuição por status</strong><small>Visão do fluxo atual</small></span></div></header>
          <div className="dashboard__bars">
            {STATUS_ORDER.map((status) => {
              const count = metrics.statusCounts[status];
              return (
                <div key={status}>
                  <div><span>{STATUS_LABELS[status]}</span><strong>{count}</strong></div>
                  <span className="dashboard__track">
                    <span className={`dashboard__bar dashboard__bar--${status}`} style={{ width: `${percentage(count, metrics.total)}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="dashboard__panel">
          <header><div><FiFlag /><span><strong>Prioridades ativas</strong><small>Risco e urgência da operação</small></span></div></header>
          <div className="dashboard__bars">
            {PRIORITY_ORDER.map((priority) => {
              const count = metrics.priorityCounts[priority];
              return (
                <div key={priority}>
                  <div><span>{PRIORITY_LABELS[priority]}</span><strong>{count}</strong></div>
                  <span className="dashboard__track">
                    <span className={`dashboard__bar dashboard__bar--priority-${priority}`} style={{ width: `${percentage(count, metrics.active)}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="dashboard__management-grid">
        <article className="dashboard__panel dashboard__panel--table">
          <header>
            <div><FiUsers /><span><strong>{canManage ? "Desempenho por equipe" : "Minha atividade por equipe"}</strong><small>Volume, conclusão e atrasos</small></span></div>
          </header>
          <div className="dashboard__table-wrap">
            <table>
              <thead><tr><th>Equipe ou setor</th><th>Total</th><th>Ativas</th><th>Concluídas</th><th>Atrasadas</th><th>Progresso</th></tr></thead>
              <tbody>
                {metrics.teamPerformance.map((team) => (
                  <tr key={team.id}>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.total}</td>
                    <td>{team.active}</td>
                    <td>{team.completed}</td>
                    <td><span className={team.overdue > 0 ? "dashboard__danger-value" : ""}>{team.overdue}</span></td>
                    <td><span className="dashboard__mini-progress"><span style={{ width: `${team.rate}%` }} /></span><small>{team.rate}%</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.teamPerformance.length === 0 && <p className="dashboard__empty">Ainda não há tarefas para comparar.</p>}
          </div>
        </article>

        <article className="dashboard__panel dashboard__panel--workload">
          <header><div><FiUser /><span><strong>{canManage ? "Carga por responsável" : "Minha carga atual"}</strong><small>Tarefas ativas por pessoa</small></span></div></header>
          <div className="dashboard__workload">
            {metrics.memberWorkload.slice(0, 8).map((member) => (
              <div key={member.id}>
                <span className="dashboard__avatar">{member.name.slice(0, 1).toUpperCase()}</span>
                <span><strong>{member.name}</strong><small>{member.completed} concluída(s)</small></span>
                <span className="dashboard__workload-numbers">
                  <strong>{member.active}</strong>
                  <small>{member.overdue > 0 ? `${member.overdue} atrasada(s)` : member.urgent > 0 ? `${member.urgent} urgente(s)` : "em dia"}</small>
                </span>
              </div>
            ))}
            {metrics.memberWorkload.length === 0 && <p className="dashboard__empty">Nenhuma carga registrada.</p>}
          </div>
        </article>
      </div>

      <div className="dashboard__attention-grid">
        <article className="dashboard__panel dashboard__task-list">
          <header><div><FiAlertTriangle /><span><strong>Tarefas que exigem atenção</strong><small>Prazos vencidos e ainda não concluídos</small></span></div><span className="dashboard__count dashboard__count--danger">{metrics.overdue}</span></header>
          <div>
            {metrics.overdueTasks.map((task) => (
              <button type="button" key={task.id} onClick={() => onOpenTask(task)}>
                <span className={`dashboard__priority-dot dashboard__priority-dot--${task.priority}`} />
                <span><strong>{task.title}</strong><small>{task.teamName} · {task.assigneeName || "Sem responsável"}</small></span>
                <span><small>Venceu</small><strong>{formatDate(task.dueDate!)}</strong></span>
                <FiArrowRight />
              </button>
            ))}
            {metrics.overdueTasks.length === 0 && <p className="dashboard__empty">Tudo em dia. Nenhuma tarefa atrasada.</p>}
          </div>
        </article>

        <article className="dashboard__panel dashboard__task-list dashboard__task-list--completed">
          <header><div><FiCheckCircle /><span><strong>Entregas recentes</strong><small>Últimas tarefas concluídas</small></span></div><span className="dashboard__count">{metrics.completed}</span></header>
          <div>
            {metrics.recentCompletions.map((task) => (
              <button type="button" key={task.id} onClick={() => onOpenTask(task)}>
                <span className="dashboard__completed-icon"><FiCheckCircle /></span>
                <span><strong>{task.title}</strong><small>{task.teamName} · {task.assigneeName || "Sem responsável"}</small></span>
                <span><small>Concluída</small><strong>{formatDate(task.completedAt!)}</strong></span>
                <FiArrowRight />
              </button>
            ))}
            {metrics.recentCompletions.length === 0 && <p className="dashboard__empty">Nenhuma tarefa concluída até o momento.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
