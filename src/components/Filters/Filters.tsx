import { FiSearch, FiX } from "react-icons/fi";

import type {
  TaskPriority,
  TaskStatus,
} from "../../types/task";

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../../utils/constants";

import "./Filters.css";

interface FiltersProps {
  searchTerm: string;
  statusFilter: TaskStatus | "all";
  priorityFilter: TaskPriority | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "all") => void;
  onPriorityChange: (value: TaskPriority | "all") => void;
  onClearFilters: () => void;
}

export function Filters({
  searchTerm,
  statusFilter,
  priorityFilter,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClearFilters,
}: FiltersProps) {
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  return (
    <section className="filters">
      <div className="filters__heading">
        <div>
          <span className="filters__eyebrow">
            Refinamento do quadro
          </span>

          <h2>Buscar e filtrar tarefas</h2>

          <p>
            Localize rapidamente tarefas por texto,
            status ou prioridade.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="filters__clear-button"
            onClick={onClearFilters}
          >
            <FiX size={17} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="filters__controls">
        <label className="filters__search">
          <span className="filters__label">
            Buscar tarefa
          </span>

          <div className="filters__search-wrapper">
            <FiSearch
              size={19}
              className="filters__search-icon"
            />

            <input
              type="text"
              value={searchTerm}
              placeholder="Digite o título, descrição ou tag"
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="filters__input-clear"
                aria-label="Limpar busca"
                onClick={() => onSearchChange("")}
              >
                <FiX size={17} />
              </button>
            )}
          </div>
        </label>

        <label className="filters__field">
          <span className="filters__label">
            Status
          </span>

          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(
                event.target.value as TaskStatus | "all",
              )
            }
          >
            <option value="all">
              Todos os status
            </option>

            {Object.entries(STATUS_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="filters__field">
          <span className="filters__label">
            Prioridade
          </span>

          <select
            value={priorityFilter}
            onChange={(event) =>
              onPriorityChange(
                event.target.value as
                  | TaskPriority
                  | "all",
              )
            }
          >
            <option value="all">
              Todas as prioridades
            </option>

            {Object.entries(PRIORITY_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
    </section>
  );
}