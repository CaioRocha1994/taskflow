import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { Membership, MembershipRole, ProjectMembership, ProjectStatus, Team, WorkspaceMember } from "../types/workspace";
import { selectActiveProjectId } from "../utils/projects";

interface OrganizationRow { id: string; name: string; slug: string }
interface MembershipRow { organization_id: string; role: MembershipRole; organizations: OrganizationRow | OrganizationRow[] }
interface ProjectRow {
  project_id: string; organization_id: string; role: MembershipRole;
  projects: ProjectData | ProjectData[];
}
interface ProjectData {
  id: string; organization_id: string; name: string; description: string; status: ProjectStatus;
  color: string; icon: string; created_by: string; created_at: string;
}
interface MemberRow {
  user_id: string; role: MembershipRole;
  profiles: { full_name: string; email: string } | Array<{ full_name: string; email: string }>;
}

const ACTIVE_ORGANIZATION_KEY = "taskflow:active-organization";
const ACTIVE_PROJECT_KEY = "taskflow:active-project";

export function useWorkspace(userId: string) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(() => localStorage.getItem(ACTIVE_ORGANIZATION_KEY) ?? "");
  const [activeProjectId, setActiveProjectIdState] = useState(() => new URLSearchParams(window.location.search).get("project") ?? localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "");
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function loadMemberships() {
      setIsLoading(true);
      setError("");
      const { data, error: queryError } = await getSupabase().from("organization_members")
        .select("organization_id, role, organizations(id, name, slug)").eq("user_id", userId);
      if (cancelled) return;
      if (queryError) { setError(queryError.message); setIsLoading(false); return; }
      const next = ((data ?? []) as unknown as MembershipRow[]).map((row) => ({
        organizationId: row.organization_id, role: row.role,
        organization: Array.isArray(row.organizations) ? row.organizations[0] : row.organizations,
      }));
      setMemberships(next);
      setActiveOrganizationIdState((current) => {
        const selected = next.some((item) => item.organizationId === current) ? current : next[0]?.organizationId ?? "";
        if (selected) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, selected);
        return selected;
      });
      setIsLoading(false);
    }
    void loadMemberships();
    return () => { cancelled = true; };
  }, [userId, revision]);

  useEffect(() => {
    if (!activeOrganizationId) { setProjectMemberships([]); return; }
    let cancelled = false;
    async function loadProjects() {
      setIsLoading(true);
      const { data, error: queryError } = await getSupabase().from("project_members")
        .select("project_id, organization_id, role, projects(id, organization_id, name, description, status, color, icon, created_by, created_at)")
        .eq("organization_id", activeOrganizationId).eq("user_id", userId);
      if (cancelled) return;
      if (queryError) { setError(queryError.message); setIsLoading(false); return; }
      const next = ((data ?? []) as unknown as ProjectRow[]).map((row) => {
        const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
        return {
          projectId: row.project_id, organizationId: row.organization_id, role: row.role,
          project: {
            id: project.id, organizationId: project.organization_id, name: project.name,
            description: project.description, status: project.status, color: project.color,
            icon: project.icon, createdBy: project.created_by, createdAt: project.created_at,
          },
        };
      }).sort((a, b) => a.project.name.localeCompare(b.project.name, "pt-BR"));
      setProjectMemberships(next);
      setActiveProjectIdState((current) => {
        const selected = selectActiveProjectId(next, current);
        if (selected) localStorage.setItem(ACTIVE_PROJECT_KEY, selected);
        return selected;
      });
      setIsLoading(false);
    }
    void loadProjects();
    return () => { cancelled = true; };
  }, [activeOrganizationId, revision, userId]);

  useEffect(() => {
    if (!activeProjectId) { setTeams([]); setMembers([]); return; }
    let cancelled = false;
    async function loadProjectData() {
      const client = getSupabase();
      const [teamsResult, membersResult, teamMembersResult] = await Promise.all([
        client.from("teams").select("id, organization_id, project_id, name, description").eq("project_id", activeProjectId).order("name"),
        client.from("project_members").select("user_id, role, profiles(full_name, email)").eq("project_id", activeProjectId),
        client.from("team_members").select("team_id, user_id").eq("project_id", activeProjectId),
      ]);
      if (cancelled) return;
      const firstError = teamsResult.error ?? membersResult.error ?? teamMembersResult.error;
      if (firstError) { setError(firstError.message); return; }
      setTeams((teamsResult.data ?? []).map((row) => ({
        id: row.id, organizationId: row.organization_id, projectId: row.project_id,
        name: row.name, description: row.description,
      })));
      const links = teamMembersResult.data ?? [];
      setMembers(((membersResult.data ?? []) as unknown as MemberRow[]).map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          userId: row.user_id, role: row.role, fullName: profile?.full_name || profile?.email || "Usuário",
          email: profile?.email ?? "", teamIds: links.filter((link) => link.user_id === row.user_id).map((link) => link.team_id),
        };
      }));
    }
    void loadProjectData();
    return () => { cancelled = true; };
  }, [activeProjectId, revision]);

  function setActiveOrganizationId(id: string) {
    localStorage.setItem(ACTIVE_ORGANIZATION_KEY, id);
    setActiveOrganizationIdState(id);
    setActiveProjectIdState("");
  }
  function setActiveProjectId(id: string) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    setActiveProjectIdState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("project", id);
    url.searchParams.delete("task");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  const activeMembership = useMemo(() => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null, [memberships, activeOrganizationId]);
  const activeProjectMembership = useMemo(() => projectMemberships.find((item) => item.projectId === activeProjectId) ?? null, [projectMemberships, activeProjectId]);

  return {
    memberships, activeMembership, activeOrganizationId,
    projectMemberships, activeProjectMembership, activeProjectId,
    teams, members, isLoading, error,
    setActiveOrganizationId, setActiveProjectId, refresh,
  };
}
