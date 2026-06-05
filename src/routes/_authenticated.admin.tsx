import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Users, Crown, TrendingUp, Banknote, Megaphone, Shield, UserCog, ListChecks } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Pressureboy808" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { isStaff, isAdmin, isSubAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isStaff,
    queryFn: async () => {
      const [users, vipActive, payments, predictions, ads] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        isAdmin
          ? supabase.from("payments").select("amount_pesewas, status, paid_at").eq("status", "success")
          : Promise.resolve({ data: [] as Array<{ amount_pesewas: number; paid_at: string | null }> }),
        supabase.from("predictions").select("status"),
        supabase.from("ad_campaigns").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      const pays = (payments as { data: Array<{ amount_pesewas: number; paid_at: string | null }> | null }).data ?? [];
      const total = pays.reduce((a, p) => a + p.amount_pesewas, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayRev = pays.filter((p) => p.paid_at && new Date(p.paid_at) >= today).reduce((a, p) => a + p.amount_pesewas, 0);
      const won = predictions.data?.filter((p) => p.status === "won").length ?? 0;
      const settled = predictions.data?.filter((p) => p.status !== "pending").length ?? 0;
      return {
        users: users.count ?? 0,
        vipActive: vipActive.count ?? 0,
        totalRev: total,
        todayRev,
        winRate: settled ? Math.round((won / settled) * 100) : 0,
        activeAds: ads.count ?? 0,
      };
    },
  });

  // Realtime: refresh overview on changes to any tracked table
  useEffect(() => {
    if (!isStaff) return;
    const ch = supabase
      .channel("admin-overview-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => qc.invalidateQueries({ queryKey: ["admin-overview"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => qc.invalidateQueries({ queryKey: ["admin-overview"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => qc.invalidateQueries({ queryKey: ["admin-overview"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => qc.invalidateQueries({ queryKey: ["admin-overview"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => qc.invalidateQueries({ queryKey: ["admin-overview"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isStaff, qc]);

  if (loading) return null;
  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20 text-center">
          <Card className="p-12">
            <h1 className="font-display text-2xl font-bold">Admins only</h1>
            <p className="mt-2 text-muted-foreground">You don't have access to this area.</p>
            <Link to="/dashboard" className="mt-4 inline-block text-primary-glow hover:underline">→ Back to dashboard</Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const baseCards = [
    { l: "Total Users", v: data?.users ?? "—", icon: Users },
    { l: "Active VIPs", v: data?.vipActive ?? "—", icon: Crown },
    { l: "Win Rate", v: data ? `${data.winRate}%` : "—", icon: TrendingUp },
    { l: "Active Ads", v: data?.activeAds ?? "—", icon: Megaphone },
  ];
  const adminCards = isAdmin ? [
    { l: "Today's Revenue", v: data ? formatGHS(data.todayRev) : "—", icon: Banknote },
    { l: "Total Revenue", v: data ? formatGHS(data.totalRev) : "—", icon: Banknote },
  ] : [];
  const cards = [...baseCards, ...adminCards];

  const sections = [
    { to: "/admin/predictions", title: "Manage Predictions", desc: "Upload free + VIP tips, mark results.", icon: ListChecks, staff: true },
    { to: "/admin/ads", title: "Ad Campaigns", desc: "Create, schedule and toggle ad placements.", icon: Megaphone, staff: true },
    { to: "/admin/users", title: "Registered Users", desc: "Browse, search and export users.", icon: Users, staff: true },
    { to: "/admin/subscribers", title: "VIP Subscribers", desc: "Extend, cancel & export subscribers.", icon: Crown, staff: false },
    { to: "/admin/revenue", title: "Revenue Analytics", desc: "Daily revenue, plan mix & growth.", icon: TrendingUp, staff: false },
    { to: "/admin/roles", title: "Roles & Staff", desc: "Assign admins and sub-admins.", icon: UserCog, staff: false },
  ];
  const visible = sections.filter((s) => isAdmin || s.staff);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary-glow" /> Admin Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? "Super-admin" : "Sub-admin"} access
              <Badge variant="outline" className="ml-2"><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />live</Badge>
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.l} className="p-5">
              <c.icon className="mb-2 h-5 w-5 text-primary-glow" />
              <div className="font-display text-2xl font-extrabold">{c.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{c.l}</div>
            </Card>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Card key={c.to} className="flex flex-col gap-3 p-6">
              <c.icon className="h-6 w-6 text-primary-glow" />
              <h2 className="font-display text-lg font-bold">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
              <Link to={c.to} className="mt-auto inline-block rounded-md bg-gradient-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-glow">
                Open →
              </Link>
            </Card>
          ))}
        </div>
        {isSubAdmin && !isAdmin && (
          <Card className="mt-4 p-6">
            <p className="text-sm text-muted-foreground">
              As a sub-admin you can upload predictions, manage ads, and view registered users.
              Revenue, subscribers, and role assignment are reserved for super-admins.
            </p>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
