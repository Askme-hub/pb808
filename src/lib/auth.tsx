import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isVip: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      const uid = data.session.user.id;
      const [vipRes, roleRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", uid)
          .eq("status", "active")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .limit(1),
        supabase.from("user_roles").select("role").eq("user_id", uid).in("role", ["admin", "sub_admin"]),
      ]);
      setIsVip((vipRes.data?.length ?? 0) > 0);
      const roles = (roleRes.data ?? []).map((r) => r.role);
      setIsAdmin(roles.includes("admin"));
      setIsSubAdmin(roles.includes("sub_admin"));
    } else {
      setIsVip(false);
      setIsAdmin(false);
      setIsSubAdmin(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setTimeout(() => { refresh(); }, 0);
    });
    refresh();
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    isVip,
    isAdmin,
    isSubAdmin,
    isStaff: isAdmin || isSubAdmin,
    signOut: async () => { await supabase.auth.signOut(); },
    refresh,
  }), [session, loading, isVip, isAdmin, isSubAdmin]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
