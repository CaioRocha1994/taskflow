import type {
  KanbanColumn,
  Task,
  TaskPriority,
  TaskStatus,
} from "../types/task";

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    description: "Ideias e tarefas ainda não priorizadas.",
  },
  {
    id: "todo",
    title: "A Fazer",
    description: "Tarefas planejadas e prontas para execução.",
  },
  {
    id: "in-progress",
    title: "Em Andamento",
    description: "Tarefas que estão sendo desenvolvidas.",
  },
  {
    id: "done",
    title: "Concluído",
    description: "Tarefas finalizadas com sucesso.",
  },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "A Fazer",
  "in-progress": "Em Andamento",
  done: "Concluído",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export const INITIAL_TASKS: Task[] = [];