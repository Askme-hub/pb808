import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, ShieldCheck, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PredictionCard, type Prediction } from "@/components/predictions/PredictionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "VIP Football Predictions · Pressureboy808" },
      { name: "description", content: "Premium VIP football tips: accumulators, correct scores, over/under, HT/FT. From 51 GHS / day." },
    ],
    links: [{ rel: "canonical", href: "/vip" }],
  }),
  component: VipPage,
});

const PLANS = [
  { plan: "daily", label: "Daily Pass", price: 5100, duration: "24 hours", popular: true },
  { plan: "monthly", label: "Monthly", price: 30000, duration: "30 days" },
  { plan: "quarterly", label: "Quarterly", price: 80000, duration: "90 days" },
  { plan: "lifetime", label: "Lifetime", price: 500000, duration: "Forever" },
] as const;

function VipPage() {
  const { user, isVip } = useAuth();

  const { data: tips } = useQuery({
    queryKey: ["vip-tips", user?.id, isVip],
    queryFn: async () => {
      const q = supabase
        .from("predictions")
        .select("*")
        .neq("category", "free")
        .eq("is_published", true)
        .order("match_date", { ascending: false })
        .limit(12);
      const { data, error } = await q;
      if (error) {
        // Non-VIPs get filtered by RLS — return empty silently
        return [] as Prediction[];
      }
      return (data as Prediction[]) ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-hero">
          <div className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-foreground">
                <Crown className="h-3 w-3" /> VIP Members Only
              </div>
              <h1 className="mt-5 font-display text-4xl font-extrabold md:text-5xl">
                Premium tips. Real edges.
              </h1>
              <p className="mt-3 text-muted-foreground">Accumulators · Correct Score · Over/Under · BTTS · HT/FT</p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <Card key={p.plan} className={`relative p-6 ${p.popular ? "border-gold/60 shadow-glow" : ""}`}>
                {p.popular && (
                  <Badge className="absolute -top-2 right-4 bg-gradient-gold text-gold-foreground">Most Popular</Badge>
                )}
                <div className="text-sm text-muted-foreground">{p.label}</div>
                <div className="mt-2 font-display text-3xl font-extrabold">{formatGHS(p.price)}</div>
                <div className="text-xs text-muted-foreground">{p.duration}</div>
                <ul className="mt-4 space-y-1 text-sm">
                  <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success" />All VIP predictions</li>
                  <li className="flex gap-2"><Zap className="h-4 w-4 text-primary-glow" />Instant access</li>
                </ul>
                <Button
                  asChild
                  className={`mt-6 w-full ${p.popular ? "bg-gradient-gold text-gold-foreground" : "bg-gradient-primary"}`}
                >
                  <Link to={user ? "/dashboard" : "/signup"}>
                    {user ? (isVip ? "You're VIP ✓" : "Upgrade") : "Get Started"}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Payments processed securely via Paystack. Daily pass auto-expires after 24 hours.
          </p>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">Today's VIP Slips</h2>
            {!isVip && !user && (
              <Button asChild size="sm" className="bg-gradient-gold text-gold-foreground"><Link to="/signup">Unlock</Link></Button>
            )}
          </div>
          {isVip && tips && tips.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tips.map((p) => <PredictionCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <PredictionCard
                  key={i}
                  locked
                  p={{
                    id: String(i),
                    category: "vip",
                    match_name: "Premium Match",
                    league: "Top League",
                    match_date: new Date().toISOString(),
                    match_time: "19:00",
                    tip: "VIP Tip",
                    odds: 2.5 + i * 0.1,
                    confidence: "very_high",
                    status: "pending",
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
