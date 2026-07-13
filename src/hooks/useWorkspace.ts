import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type {
  Membership,
  MembershipRole,
  Team,
  WorkspaceMember,
} from "../types/workspace";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

interface MembershipRow {
  organization_id: string;
  role: MembershipRole;
  organizations: OrganizationRow | OrganizationRow[];
}

interface MemberRow {
  user_id: string;
  role: MembershipRole;
  profiles: {
    full_name: string;
    email: string;
  } | Array<{ full_name: string; email: string }>;
}

const ACTIVE_ORGANIZATION_KEY = "taskflow:active-organization";

export function useWorkspace(userId: string) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState(
    () => localStorage.getItem(ACTIVE_ORGANIZATION_KEY) ?? "",
  );
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
      const client = getSupabase();
      const { data, error: queryError } = await client
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug)")
        .eq("user_id", userId);

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      const nextMemberships = ((data ?? []) as unknown as MembershipRow[]).map(
        (row) => {
          const organization = Array.isArray(row.organizations)
            ? row.organizations[0]
            : row.organizations;
          return {
            organizationId: row.organization_id,
            role: row.role,
            organization,
          };
        },
      );

      setMemberships(nextMemberships);
      setActiveOrganizationIdState((current) => {
        const isValid = nextMemberships.some(
          (membership) => membership.organizationId === current,
        );
        const next = isValid ? current : nextMemberships[0]?.organizationId ?? "";
        if (next) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, next);
        return next;
      });
      setIsLoading(false);
    }

    void loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [userId, revision]);

  useEffect(() => {
    if (!activeOrganizationId) {
      setTeams([]);
      setMembers([]);
      return;
    }

    let cancelled = false;
    async function loadWorkspaceData() {
      const client = getSupabase();
      const [teamsResult, membersResult, teamMembersResult] = await Promise.all([
        client
          .from("teams")
          .select("id, organization_id, name, description")
          .eq("organization_id", activeOrganizationId)
          .order("name"),
        client
          .from("organization_members")
          .select("user_id, role, profiles(full_name, email)")
          .eq("organization_id", activeOrganizationId),
        client
          .from("team_members")
          .select("team_id, user_id")
          .eq("organization_id", activeOrganizationId),
      ]);

      if (cancelled) return;
      const firstError = teamsResult.error ?? membersResult.error ?? teamMembersResult.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }

      setTeams(
        (teamsResult.data ?? []).map((row) => ({
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          description: row.description,
        })),
      );

      const links = teamMembersResult.data ?? [];
      setMembers(
        ((membersResult.data ?? []) as unknown as MemberRow[]).map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            userId: row.user_id,
            role: row.role,
            fullName: profile?.full_name || profile?.email || "Usuário",
            email: profile?.email ?? "",
            teamIds: links
              .filter((link) => link.user_id === row.user_id)
              .map((link) => link.team_id),
          };
        }),
      );
    }

    void loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, revision]);

  function setActiveOrganizationId(organizationId: string) {
    localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
    setActiveOrganizationIdState(organizationId);
  }

  const activeMembership = useMemo(
    () =>
      memberships.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [memberships, activeOrganizationId],
  );

  return {
    memberships,
    activeMembership,
    activeOrganizationId,
    teams,
    members,
    isLoading,
    error,
    setActiveOrganizationId,
    refresh,
  };
}

