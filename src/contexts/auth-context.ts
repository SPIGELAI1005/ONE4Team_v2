import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

export type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ error: Error | null; user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
  changeEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
