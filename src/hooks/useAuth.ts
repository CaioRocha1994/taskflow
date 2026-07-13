import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => new URLSearchParams(window.location.search).get("recovery") === "1",
  );

  useEffect(() => {
    const client = getSupabase();

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  }

  return { session, isLoading, isPasswordRecovery, setIsPasswordRecovery, signOut };
}
