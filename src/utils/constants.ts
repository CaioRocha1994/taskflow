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

export const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Definir identidade visual",
    description:
      "Criar a paleta de cores, tipografia e principais padrões visuais do projeto.",
    status: "backlog",
    priority: "medium",
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    dueDate: "2026-07-18",
    tags: ["Design", "UI"],
  },
  {
    id: "task-2",
    title: "Estruturar componentes do Kanban",
    description:
      "Criar os componentes principais do quadro, colunas e cartões de tarefas.",
    status: "todo",
    priority: "high",
    createdAt: "2026-07-09T10:30:00.000Z",
    updatedAt: "2026-07-09T10:30:00.000Z",
    dueDate: "2026-07-16",
    tags: ["React", "TypeScript"],
  },
  {
    id: "task-3",
    title: "Implementar filtros de tarefas",
    description:
      "Permitir filtros por prioridade, status e pesquisa por palavras-chave.",
    status: "todo",
    priority: "medium",
    createdAt: "2026-07-09T14:00:00.000Z",
    updatedAt: "2026-07-09T14:00:00.000Z",
    dueDate: "2026-07-20",
    tags: ["Filtros", "UX"],
  },
  {
    id: "task-4",
    title: "Configurar drag-and-drop",
    description:
      "Implementar a movimentação de tarefas entre as colunas utilizando dnd-kit.",
    status: "in-progress",
    priority: "urgent",
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T11:45:00.000Z",
    dueDate: "2026-07-14",
    tags: ["dnd-kit", "Kanban"],
  },
  {
    id: "task-5",
    title: "Criar persistência local",
    description:
      "Salvar e recuperar as tarefas no localStorage do navegador.",
    status: "done",
    priority: "high",
    createdAt: "2026-07-07T15:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
    dueDate: "2026-07-12",
    tags: ["localStorage", "Persistência"],
  },
];