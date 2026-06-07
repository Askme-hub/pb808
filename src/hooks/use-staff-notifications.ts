import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createElement } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Ctx = { unread: number; reset: () => void };
const StaffNotificationsCtx = createContext<Ctx>({ unread: 0, reset: () => {} });

const STORAGE_KEY = "staff-unread-count";

function readStored(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(sessionStorage.getItem(STORAGE_KEY) ?? "0");
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function StaffNotificationsProvider({ children }: { children: ReactNode }) {
  const { isStaff, loading } = useAuth();
  const [unread, setUnread] = useState<number>(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onAdmin = pathname.startsWith("/admin");
  const onAdminRef = useRef(onAdmin);
  onAdminRef.current = onAdmin;

  // Hydrate from sessionStorage on mount (client only)
  useEffect(() => {
    setUnread(readStored());
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, String(unread));
  }, [unread]);

  // Auto-reset when staff opens admin area
  useEffect(() => {
    if (onAdmin && unread !== 0) setUnread(0);
  }, [onAdmin, unread]);

  // Subscribe to realtime events for staff
  useEffect(() => {
    if (loading || !isStaff || typeof window === "undefined") return;

    const bump = () => {
      if (!onAdminRef.current) setUnread((c) => c + 1);
    };

    const ch = supabase
      .channel("staff-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const p = payload.new as { email?: string; display_name?: string | null };
          toast.success("New user registered", {
            description: p.display_name || p.email || "Someone just joined.",
          });
          bump();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ad_campaigns" },
        (payload) => {
          const a = payload.new as { name?: string; is_active?: boolean; placement?: string };
          if (a.is_active) {
            toast("Ad campaign live", {
              description: `${a.name ?? "Untitled"} · ${a.placement ?? ""}`,
            });
            bump();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ad_campaigns" },
        (payload) => {
          const a = payload.new as { name?: string; is_active?: boolean; placement?: string };
          const before = payload.old as { is_active?: boolean };
          if (a.is_active && !before?.is_active) {
            toast("Ad campaign went live", {
              description: `${a.name ?? "Untitled"} · ${a.placement ?? ""}`,
            });
            bump();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "predictions" },
        (payload) => {
          const n = payload.new as { match_name?: string; status?: string; result_score?: string | null };
          const o = payload.old as { status?: string };
          if (n.status && o?.status && n.status !== o.status) {
            const variant = n.status === "won" ? toast.success : n.status === "lost" ? toast.error : toast;
            variant(`Prediction ${n.status}`, {
              description: `${n.match_name ?? "Match"}${n.result_score ? ` · ${n.result_score}` : ""}`,
            });
          } else {
            toast("Prediction updated", { description: n.match_name ?? "" });
          }
          bump();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [isStaff, loading]);

  const value: Ctx = {
    unread,
    reset: () => setUnread(0),
  };

  return createElement(StaffNotificationsCtx.Provider, { value }, children);
}

export function useStaffNotifications() {
  return useContext(StaffNotificationsCtx);
}

/** Backwards-compatible mount component (no-op; provider handles everything). */
export function StaffNotificationsMount() {
  return null;
}
