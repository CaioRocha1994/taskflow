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

    if (!taskA.dueDate && !taskB.dueDate) {
      return 0;
    }

    if (!taskA.dueDate) {
      return 1;
    }

    if (!taskB.dueDate) {
      return -1;
    }

    return (
      new Date(taskA.dueDate).getTime() -
      new Date(taskB.dueDate).getTime()
    );
  });
}

export function isTaskOverdue(
  task: Task,
): boolean {
  if (!task.dueDate) {
    return false;
  }

  if (task.status === "done") {
    return false;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(
    `${task.dueDate}T00:00:00`,
  );

  return dueDate.getTime() < today.getTime();
}

export function isTaskDueToday(
  task: Task,
): boolean {
  if (!task.dueDate) {
    return false;
  }

  if (task.status === "done") {
    return false;
  }

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return task.dueDate === todayString;
}