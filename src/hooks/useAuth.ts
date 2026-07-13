import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const client = getSupabase();

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsPasswordRecovery(event === "PASSWORD_RECOVERY");
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
