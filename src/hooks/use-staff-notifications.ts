import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Realtime toast notifications for staff (admins & sub-admins):
 *  - new user registrations (profiles INSERT)
 *  - ads going live (ad_campaigns INSERT with is_active=true OR UPDATE flipping to active)
 *  - prediction updates (predictions UPDATE — status / publish / score changes)
 *
 * Mounted globally; no-op for non-staff and during SSR.
 */
export function useStaffNotifications() {
  const { isStaff, loading } = useAuth();
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (loading || !isStaff || typeof window === "undefined") return;
    mountedAt.current = Date.now();

    const ch = supabase
      .channel("staff-notifications")
      // New users
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const p = payload.new as { email?: string; display_name?: string | null };
          toast.success("New user registered", {
            description: p.display_name || p.email || "Someone just joined.",
          });
        },
      )
      // Ads going live (new active ad)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ad_campaigns" },
        (payload) => {
          const a = payload.new as { name?: string; is_active?: boolean; placement?: string };
          if (a.is_active) {
            toast("Ad campaign live", {
              description: `${a.name ?? "Untitled"} · ${a.placement ?? ""}`,
            });
          }
        },
      )
      // Ads toggled on
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
          }
        },
      )
      // Prediction updates
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [isStaff, loading]);
}

export function StaffNotificationsMount() {
  useStaffNotifications();
  return null;
}
