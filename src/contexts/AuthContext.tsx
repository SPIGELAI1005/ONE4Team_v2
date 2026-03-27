import { useEffect, useRef, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/contexts/auth-context";

const DEV_AUTO_EMAIL = import.meta.env.DEV ? (import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL ?? "") : "";
const DEV_AUTO_PASSWORD = import.meta.env.DEV ? (import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD ?? "") : "";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const devLoginAttempted = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);

      if (
        !existing?.user &&
        !devLoginAttempted.current &&
        DEV_AUTO_EMAIL &&
        DEV_AUTO_PASSWORD &&
        window.location.hostname === "localhost"
      ) {
        devLoginAttempted.current = true;
        console.info("[DEV] Auto-login →", DEV_AUTO_EMAIL);
        void (async () => {
          const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email: DEV_AUTO_EMAIL,
            password: DEV_AUTO_PASSWORD,
          });
          if (error) {
            console.warn("[DEV] Auto-login failed:", error.message);
            console.info("[DEV] Attempting to create dev account…");
            const { error: signUpErr } = await supabase.auth.signUp({
              email: DEV_AUTO_EMAIL,
              password: DEV_AUTO_PASSWORD,
              options: {
                emailRedirectTo: `${window.location.origin}/auth`,
                data: { display_name: "Dev Admin" },
              },
            });
            if (signUpErr) {
              console.error("[DEV] Sign-up also failed:", signUpErr.message);
              console.info("[DEV] → Go to your Supabase Dashboard > Authentication > Users and verify the account exists and email is confirmed.");
            } else {
              console.info("[DEV] Account created. Check Supabase Dashboard > Authentication > Users — you may need to confirm the email, then refresh this page.");
            }
          } else if (signInData?.user) {
            const { data: memberships } = await supabase
              .from("club_memberships")
              .select("club_id, role")
              .eq("user_id", signInData.user.id)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1);
            const m = memberships?.[0];
            if (m) {
              localStorage.setItem("one4team.activeRole", m.role);
              localStorage.setItem(`one4team.activeClubId:${signInData.user.id}`, m.club_id);
              console.info(`[DEV] Active role set to "${m.role}" for club ${m.club_id}`);
            }
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    metadata?: Record<string, unknown>
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { display_name: displayName, ...(metadata ?? {}) },
      },
    });
    return {
      error: error as Error | null,
      user: data.user ?? null,
      session: data.session ?? null,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    return { error: error as Error | null };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    return { error: error as Error | null };
  };

  const changeEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth` }
    );
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithMagicLink,
        resendConfirmation,
        changeEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// (no exports besides AuthProvider)
