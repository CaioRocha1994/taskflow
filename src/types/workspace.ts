export type MembershipRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Membership {
  organizationId: string;
  role: MembershipRole;
  organization: Organization;
}

export type ProjectStatus = "active" | "inactive";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  icon: string;
  createdBy: string;
  createdAt: string;
}

export interface ProjectMembership {
  projectId: string;
  organizationId: string;
  role: MembershipRole;
  project: Project;
}

export interface Team {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  description: string;
}

export interface WorkspaceMember {
  userId: string;
  role: MembershipRole;
  fullName: string;
  email: string;
  teamIds: string[];
}
