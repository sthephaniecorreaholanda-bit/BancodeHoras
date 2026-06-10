import { useState, useEffect } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const NO_REMEMBER_KEY = "bh:no-remember";
export const SESSION_ACTIVE_KEY = "bh:session-active";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
      (event: string, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }

        if (event === "USER_UPDATED") {
          setIsPasswordRecovery(false);
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, isPasswordRecovery };
}
