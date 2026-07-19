import type { Task } from "../types/task";

import { PRIORITY_ORDER } from "./constants";

export function sortTasksByPriorityAndDueDate(
  tasks: Task[],
): Task[] {
  return [...tasks].sort((taskA, taskB) => {
    const priorityDifference =
      PRIORITY_ORDER[taskB.priority] -
      PRIORITY_ORDER[taskA.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const taskADeadline = taskA.deadlineAt ?? taskA.dueDate;
    const taskBDeadline = taskB.deadlineAt ?? taskB.dueDate;

    if (!taskADeadline && !taskBDeadline) {
      return 0;
    }

    if (!taskADeadline) {
      return 1;
    }

    if (!taskBDeadline) {
      return -1;
    }

    return (
      new Date(taskADeadline).getTime() -
      new Date(taskBDeadline).getTime()
    );
  });
}

export function isTaskOverdue(
  task: Task,
): boolean {
  const deadline = task.deadlineAt ?? (task.dueDate ? `${task.dueDate}T23:59:59` : undefined);
  if (!deadline) {
    return false;
  }

  if (task.status === "done") {
    return false;
  }

  return isDeadlineOverdue(deadline);
}

export function isTaskDueToday(
  task: Task,
): boolean {
  const deadline = task.deadlineAt ?? (task.dueDate ? `${task.dueDate}T23:59:59` : undefined);
  if (!deadline) {
    return false;
  }

  if (task.status === "done") {
    return false;
  }

  const today = new Date();
  const dueDate = new Date(deadline);
  return dueDate.getFullYear() === today.getFullYear()
    && dueDate.getMonth() === today.getMonth()
    && dueDate.getDate() === today.getDate();
}

export function isTaskDueSoon(task: Task, minutes = 15): boolean {
  if (!task.deadlineAt || task.status === "done") return false;
  return isDeadlineDueSoon(task.deadlineAt, minutes);
}

export function isDeadlineOverdue(deadline: string, now = Date.now()): boolean {
  return new Date(deadline).getTime() < now;
}

export function isDeadlineDueSoon(deadline: string, minutes = 15, now = Date.now()): boolean {
  const difference = new Date(deadline).getTime() - now;
  return difference > 0 && difference <= minutes * 60_000;
}
