import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Crown, TrendingUp, Banknote } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Pressureboy808" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { isAdmin, loading } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const [users, vipActive, payments, predictions] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payments").select("amount_pesewas, status, paid_at").eq("status", "success"),
        supabase.from("predictions").select("status"),
      ]);
      const total = payments.data?.reduce((a, p) => a + p.amount_pesewas, 0) ?? 0;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayRev = payments.data?.filter((p) => p.paid_at && new Date(p.paid_at) >= today)
        .reduce((a, p) => a + p.amount_pesewas, 0) ?? 0;
      const won = predictions.data?.filter((p) => p.status === "won").length ?? 0;
      const settled = predictions.data?.filter((p) => p.status !== "pending").length ?? 0;
      return {
        users: users.count ?? 0,
        vipActive: vipActive.count ?? 0,
        totalRev: total,
        todayRev,
        winRate: settled ? Math.round((won / settled) * 100) : 0,
      };
    },
  });

  if (loading) return null;
  if (!isAdmin) {
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

  const cards = [
    { l: "Total Users", v: data?.users ?? "—", icon: Users },
    { l: "Active VIPs", v: data?.vipActive ?? "—", icon: Crown },
    { l: "Win Rate", v: data ? `${data.winRate}%` : "—", icon: TrendingUp },
    { l: "Today's Revenue", v: data ? formatGHS(data.todayRev) : "—", icon: Banknote },
    { l: "Total Revenue", v: data ? formatGHS(data.totalRev) : "—", icon: Banknote },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-extrabold">Admin Overview</h1>
        <p className="mt-1 text-muted-foreground">Full prediction, subscription, ad, and content management coming in next phase.</p>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.l} className="p-6">
              <c.icon className="mb-2 h-5 w-5 text-primary-glow" />
              <div className="font-display text-2xl font-extrabold">{c.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{c.l}</div>
            </Card>
          ))}
        </div>
        <Card className="mt-8 p-6">
          <p className="text-sm text-muted-foreground">
            The full admin panel (Predictions CRUD, Subscribers, Ads, Blog, Settings, Notifications) ships in Phase 4.
            Reply to grant your account the <code>admin</code> role and provide Paystack keys to unlock Phase 3.
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
