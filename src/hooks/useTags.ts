import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { Tag } from "../types/tag";

interface TagRow {
  id: string;
  name: string;
}

export function useTags(organizationId: string, projectId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");

  const loadTags = useCallback(async () => {
    if (!organizationId || !projectId) return;
    const { data, error: queryError } = await getSupabase()
      .from("tags")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("name");
    if (queryError) setError(queryError.message);
    else {
      setError("");
      setTags(((data ?? []) as TagRow[]).map((row) => ({ id: row.id, name: row.name })));
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    void loadTags();
    if (!organizationId || !projectId) return;
    const client = getSupabase();
    const channel = client
      .channel(`tags:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tags", filter: `project_id=eq.${projectId}` },
        () => void loadTags(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadTags, organizationId, projectId]);

  return { tags, error, refresh: loadTags };
}
