import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Banknote, Crown, TrendingUp, Users } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue · Admin" }] }),
  component: AdminRevenue,
});

const PLAN_COLORS: Record<string, string> = {
  daily: "hsl(210 90% 60%)",
  monthly: "hsl(265 85% 65%)",
  quarterly: "hsl(160 70% 50%)",
  lifetime: "hsl(40 95% 60%)",
};

function AdminRevenue() {
  const { isAdmin, loading } = useAuth();
  const [days, setDays] = useState<number>(30);

  const { data } = useQuery({
    queryKey: ["admin-revenue", days],
    enabled: isAdmin,
    queryFn: async () => {
      const since = new Date(); since.setUTCDate(since.getUTCDate() - days + 1);
      since.setUTCHours(0, 0, 0, 0);
      const [{ data: pays }, { data: allPays }, { count: usersCount }, { count: vipCount }] = await Promise.all([
        supabase.from("payments").select("amount_pesewas, plan, paid_at, status")
          .eq("status", "success").gte("paid_at", since.toISOString()),
        supabase.from("payments").select("amount_pesewas").eq("status", "success"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true })
          .eq("status", "active").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
      ]);
      return {
        pays: pays ?? [],
        totalAll: (allPays ?? []).reduce((a, p) => a + p.amount_pesewas, 0),
        usersCount: usersCount ?? 0,
        vipCount: vipCount ?? 0,
        since,
      };
    },
  });

  const { byDay, byPlan, periodTotal, txCount } = useMemo(() => {
    const dayMap = new Map<string, Record<string, number>>();
    const planMap = new Map<string, number>();
    let total = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      const k = d.toISOString().slice(0, 10);
      dayMap.set(k, { daily: 0, monthly: 0, quarterly: 0, lifetime: 0 });
    }
    for (const p of data?.pays ?? []) {
      if (!p.paid_at) continue;
      const k = new Date(p.paid_at).toISOString().slice(0, 10);
      const bucket = dayMap.get(k) ?? { daily: 0, monthly: 0, quarterly: 0, lifetime: 0 };
      bucket[p.plan] = (bucket[p.plan] ?? 0) + p.amount_pesewas / 100;
      dayMap.set(k, bucket);
      planMap.set(p.plan, (planMap.get(p.plan) ?? 0) + p.amount_pesewas);
      total += p.amount_pesewas;
    }
    return {
      byDay: Array.from(dayMap.entries()).map(([date, v]) => ({
        date: date.slice(5),
        total: +(v.daily + v.monthly + v.quarterly + v.lifetime).toFixed(2),
        ...v,
      })),
      byPlan: Array.from(planMap.entries()).map(([name, value]) => ({ name, value: value / 100 })),
      periodTotal: total,
      txCount: data?.pays.length ?? 0,
    };
  }, [data, days]);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-20">
          <Card className="p-10 text-center">
            <h1 className="font-display text-xl font-bold">Admins only</h1>
            <Link to="/dashboard" className="mt-3 inline-block text-primary-glow hover:underline">→ Dashboard</Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const kpis = [
    { l: "Period Revenue", v: formatGHS(periodTotal), icon: Banknote },
    { l: "All-time Revenue", v: data ? formatGHS(data.totalAll) : "—", icon: TrendingUp },
    { l: "Active VIPs", v: data?.vipCount ?? "—", icon: Crown },
    { l: "Total Users", v: data?.usersCount ?? "—", icon: Users },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Revenue Analytics</h1>
            <p className="text-sm text-muted-foreground">{txCount} successful transactions in selected window.</p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpis.map((c) => (
            <Card key={c.l} className="p-5">
              <c.icon className="mb-2 h-5 w-5 text-primary-glow" />
              <div className="font-display text-2xl font-extrabold">{c.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{c.l}</div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-5">
          <h2 className="font-display text-lg font-bold">Daily Revenue (GHS)</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={byDay}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => `GH₵ ${v.toFixed(2)}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-display text-lg font-bold">Revenue by Plan (stacked, GHS)</h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => `GH₵ ${Number(v).toFixed(2)}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  {Object.keys(PLAN_COLORS).map((k) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={PLAN_COLORS[k]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Plan Mix</h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPlan} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                    {byPlan.map((entry) => (
                      <Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `GH₵ ${Number(v).toFixed(2)}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
