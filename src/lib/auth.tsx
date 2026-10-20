import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

async function syncUserProfile(u: User | null) {
  if (!u) return;
  try {
    const fullName =
      (u.user_metadata?.full_name as string) ||
      (u.user_metadata?.name as string) ||
      u.email?.split("@")[0] ||
      "Creator";
    const avatarUrl =
      (u.user_metadata?.avatar_url as string) ||
      (u.user_metadata?.picture as string) ||
      null;

    // Check if profile exists first
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", u.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await supabase.from("profiles").insert({
        id: u.id,
        email: u.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        plan: "free",
        storage_used_bytes: 0,
      });
      if (insertErr) {
        console.warn("Profile insert notice (requires profiles INSERT policy or trigger):", insertErr.message);
      }
    } else {
      await supabase
        .from("profiles")
        .update({
          email: u.email,
          full_name: fullName,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq("id", u.id);
    }
  } catch (err) {
    console.warn("Could not sync user profile:", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        syncUserProfile(session.user);
      }
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        syncUserProfile(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
      syncUserProfile(data.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
