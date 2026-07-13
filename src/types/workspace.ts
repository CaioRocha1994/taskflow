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

export interface Team {
  id: string;
  organizationId: string;
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

