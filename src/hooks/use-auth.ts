import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const NO_REMEMBER_KEY = "bh:no-remember";
export const SESSION_ACTIVE_KEY = "bh:session-active";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) {
        const noRemember = localStorage.getItem(NO_REMEMBER_KEY) === "1";
        const activeThisTab = sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
        if (noRemember && !activeThisTab) {
          supabase.auth.signOut().then(() => {
            setSession(null);
            setUser(null);
            setLoading(false);
          });
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
