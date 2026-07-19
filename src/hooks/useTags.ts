import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { Tag } from "../types/tag";

interface TagRow {
  id: string;
  name: string;
}

export function useTags(organizationId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");

  const loadTags = useCallback(async () => {
    if (!organizationId) return;
    const { data, error: queryError } = await getSupabase()
      .from("tags")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name");
    if (queryError) setError(queryError.message);
    else {
      setError("");
      setTags(((data ?? []) as TagRow[]).map((row) => ({ id: row.id, name: row.name })));
    }
  }, [organizationId]);

  useEffect(() => {
    void loadTags();
    if (!organizationId) return;
    const client = getSupabase();
    const channel = client
      .channel(`tags:${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tags", filter: `organization_id=eq.${organizationId}` },
        () => void loadTags(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadTags, organizationId]);

  return { tags, error, refresh: loadTags };
}
