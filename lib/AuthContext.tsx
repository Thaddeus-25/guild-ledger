"use client";

// Who is logged in. AuthProvider wraps every page (see app/layout.tsx),
// and any component can check the login with useAuth().

import { createContext, useContext, useEffect, useState } from "react";
import { loginErrorMessage, UNREACHABLE_MESSAGE } from "./authMessages";
import { getSupabase, isSupabaseConfigured, openedFromRecoveryLink } from "./supabaseClient";

export type AuthStatus = "no-config" | "checking" | "signed-out" | "signed-in";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthValue {
  status: AuthStatus;
  user: AuthUser | null;
  recovery: boolean; // opened from a password-reset email
  // Each of these returns null when it worked, or a message to show.
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<string | null>;
  sendPasswordReset(email: string): Promise<string | null>;
  updatePassword(password: string): Promise<string | null>;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  recovery: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

// Supabase's own words, unless the device couldn't reach it at all.
function plainError(error: { status?: number; name?: string; message: string }): string {
  if (error.status === 0 || error.name === "AuthRetryableFetchError") return UNREACHABLE_MESSAGE;
  return error.message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    status: isSupabaseConfigured() ? "checking" : "no-config",
    user: null,
    recovery: false,
  }));

  // Follow the login. Supabase calls us straight away with the saved
  // login (or none), then again whenever it changes: logging in or out,
  // or opening a password-reset link.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const fromRecoveryLink = openedFromRecoveryLink();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((previous) => {
        const user = session ? { id: session.user.id, email: session.user.email ?? "" } : null;
        return {
          status: user ? "signed-in" : "signed-out",
          // Keep the same object when nothing changed, so the ledger
          // doesn't reload every time the login is quietly refreshed.
          user: user && previous.user?.id === user.id && previous.user.email === user.email ? previous.user : user,
          recovery: previous.recovery || fromRecoveryLink || event === "PASSWORD_RECOVERY",
        };
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return UNREACHABLE_MESSAGE;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? loginErrorMessage(error) : null;
    } catch {
      return UNREACHABLE_MESSAGE;
    }
  }

  async function signOut(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      // "local" logs out this device only; your other devices stay logged in.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return error ? plainError(error) : null;
    } catch {
      return UNREACHABLE_MESSAGE;
    }
  }

  async function sendPasswordReset(email: string): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return UNREACHABLE_MESSAGE;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Only a missing connection is reported. Anything else gets the same
      // "a link is on its way" answer, so nobody can test which emails exist.
      if (error && plainError(error) === UNREACHABLE_MESSAGE) return UNREACHABLE_MESSAGE;
      return null;
    } catch {
      return UNREACHABLE_MESSAGE;
    }
  }

  async function updatePassword(password: string): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return UNREACHABLE_MESSAGE;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return error ? plainError(error) : null;
    } catch {
      return UNREACHABLE_MESSAGE;
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, sendPasswordReset, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
