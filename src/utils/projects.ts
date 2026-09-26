import type { ProjectMembership } from "../types/workspace";

export function selectActiveProjectId(memberships: ProjectMembership[], preferredId: string) {
  if (memberships.some(({ project }) => project.id === preferredId && project.status === "active")) {
    return preferredId;
  }
  return memberships.find(({ project }) => project.status === "active")?.projectId
    ?? memberships[0]?.projectId
    ?? "";
}
