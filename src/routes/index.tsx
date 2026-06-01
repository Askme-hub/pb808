import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy, Zap, ShieldCheck, Crown, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PredictionCard, type Prediction } from "@/components/predictions/PredictionCard";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pressureboy808 — Daily Football Predictions & VIP Tips" },
      { name: "description", content: "Free daily football tips, premium VIP predictions, accumulators, correct scores, and verified results. Trusted by punters across Ghana." },
      { property: "og:title", content: "Pressureboy808 Prediction Hub" },
      { property: "og:description", content: "Daily winning football predictions from Ghana's sharpest tipster." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Stats />
        <LatestTips />
        <VipBanner />
        <Testimonials />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-glow">
            <Zap className="h-3 w-3" /> Daily Tips · Verified Results · Since 2022
          </div>
          <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Win More. <span className="bg-gradient-primary bg-clip-text text-transparent">Bet Smarter.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            Ghana's most accurate football prediction platform. Free daily tips,
            VIP accumulators, correct scores — verified, tracked, delivered.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
              <Link to="/vip">
                <Crown className="mr-2 h-4 w-4" /> Go VIP from {formatGHS(5100)}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/predictions">See Today's Free Tips <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { data } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [total, won] = await Promise.all([
        supabase.from("predictions").select("*", { count: "exact", head: true }).neq("status", "pending"),
        supabase.from("predictions").select("*", { count: "exact", head: true }).eq("status", "won"),
      ]);
      const t = total.count ?? 0;
      const w = won.count ?? 0;
      return { total: t, won: w, rate: t > 0 ? Math.round((w / t) * 100) : 0 };
    },
  });
  const items = [
    { label: "Win Rate", value: data ? `${data.rate}%` : "—", icon: TrendingUp },
    { label: "Predictions Settled", value: data?.total ?? "—", icon: Trophy },
    { label: "Wins Booked", value: data?.won ?? "—", icon: Star },
    { label: "Years Online", value: "3+", icon: ShieldCheck },
  ];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="container mx-auto grid grid-cols-2 gap-px overflow-hidden px-0 md:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="bg-background/60 px-6 py-8 text-center">
            <s.icon className="mx-auto mb-2 h-5 w-5 text-primary-glow" />
            <div className="font-display text-3xl font-extrabold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LatestTips() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-free-tips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("category", "free")
        .eq("is_published", true)
        .order("match_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data as Prediction[]) ?? [];
    },
  });

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-glow">Today</div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Latest Free Tips</h2>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/predictions">View all <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-card/60" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => <PredictionCard key={p.id} p={p} />)}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          No free predictions posted yet. Check back soon — fresh tips drop daily.
        </Card>
      )}
    </section>
  );
}

function VipBanner() {
  return (
    <section className="container mx-auto px-4 py-12">
      <Card className="relative overflow-hidden border-gold/30 bg-gradient-to-br from-primary/20 via-card to-background p-8 md:p-12">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-foreground">
              <Crown className="h-3 w-3" /> VIP Membership
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold md:text-4xl">
              High-odds slips, correct scores, and over/under — locked & loaded.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Get instant access to today's premium predictions, accumulators, and HT/FT
              tips. Cancel anytime. New tips daily.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {["Accumulator tips", "Correct score picks", "Over/Under specials", "HT/FT predictions", "High-odds combos", "Strategy guides"].map((f) => (
                <li key={f} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />{f}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-gold text-gold-foreground hover:opacity-90">
                <Link to="/vip">Upgrade for {formatGHS(5100)}/day</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/vip">See VIP plans</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              { league: "EPL", match: "Man City vs Arsenal", odds: "2.45" },
              { league: "La Liga", match: "Real Madrid vs Barcelona", odds: "3.10" },
              { league: "Serie A", match: "Inter vs Juventus", odds: "1.92" },
            ].map((m) => (
              <div key={m.match} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/80 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">{m.league}</div>
                  <div className="font-semibold">{m.match}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-muted px-3 py-1 font-mono text-sm tracking-widest blur-sm select-none">XXXXX</span>
                  <span className="font-display text-xl font-bold text-gold">{m.odds}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}

function Testimonials() {
  const items = [
    { name: "Kwame A.", text: "Cashed three weekend accas in a row. The VIP slips are 🔥.", role: "Accra" },
    { name: "Ama O.", text: "Free tips are already strong. VIP is on another level.", role: "Kumasi" },
    { name: "Yaw B.", text: "Real analysis, not random guesses. My bankroll thanks you.", role: "Takoradi" },
  ];
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary-glow">Trusted</div>
        <h2 className="font-display text-3xl font-bold md:text-4xl">What punters say</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <Card key={t.name} className="p-6">
            <div className="mb-3 flex gap-0.5 text-gold">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <p className="text-sm">"{t.text}"</p>
            <div className="mt-4 text-sm">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    { q: "How do I subscribe to VIP?", a: "Click any VIP button, sign in, and pay 51 GHS via Paystack. Access activates instantly for 24 hours. Monthly, quarterly, and lifetime plans are also available." },
    { q: "Are predictions guaranteed to win?", a: "No prediction is guaranteed. We share our analysis and confidence levels — manage your bankroll and bet responsibly." },
    { q: "How are results verified?", a: "Every settled tip is marked Won/Lost/Void on the platform. Win rates on the Results page reflect real history." },
    { q: "Can I cancel VIP?", a: "VIP is pay-as-you-go. Daily passes auto-expire after 24 hours. Recurring plans can be cancelled anytime from your dashboard." },
  ];
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-glow">FAQ</div>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Frequently asked</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {items.map((i, idx) => (
            <AccordionItem key={idx} value={`i-${idx}`}>
              <AccordionTrigger className="text-left">{i.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{i.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
