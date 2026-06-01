import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Calendar, Receipt, Bookmark } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Pressureboy808" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isVip } = useAuth();

  const { data: sub } = useQuery({
    queryKey: ["my-sub", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["my-payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, reference, amount_pesewas, plan, status, paid_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-extrabold">Hi, {user?.user_metadata?.display_name ?? user?.email?.split("@")[0]}</h1>
        <p className="mt-1 text-muted-foreground">Your subscription, tips, and payment history.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Crown className="h-4 w-4 text-gold" /> Membership
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{isVip ? "VIP Active" : "Free"}</div>
            {sub?.expires_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                Expires {formatDate(sub.expires_at)}
              </div>
            )}
            {!isVip && (
              <Button asChild className="mt-4 w-full bg-gradient-gold text-gold-foreground">
                <Link to="/vip">Upgrade to VIP</Link>
              </Button>
            )}
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-4 w-4" /> Current Plan
            </div>
            <div className="mt-2 font-display text-2xl font-bold capitalize">{sub?.plan ?? "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">Status: {sub?.status ?? "none"}</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Bookmark className="h-4 w-4" /> Quick Links
            </div>
            <div className="mt-2 space-y-2 text-sm">
              <Link to="/predictions" className="block hover:text-primary-glow">→ Free Tips</Link>
              <Link to="/vip" className="block hover:text-primary-glow">→ VIP Slips</Link>
              <Link to="/results" className="block hover:text-primary-glow">→ Results</Link>
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <h2 className="font-display text-lg font-bold">Payment History</h2>
          </div>
          {payments && payments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2">Date</th><th>Reference</th><th>Plan</th><th className="text-right">Amount</th><th className="text-right">Status</th></tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="py-2 text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="font-mono text-xs">{p.reference}</td>
                      <td className="capitalize">{p.plan}</td>
                      <td className="text-right">{formatGHS(p.amount_pesewas)}</td>
                      <td className="text-right">
                        <Badge variant={p.status === "success" ? "default" : "outline"} className="capitalize">{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">No payments yet.</div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
