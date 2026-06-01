import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PredictionCard, type Prediction } from "@/components/predictions/PredictionCard";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Free Daily Football Predictions · Pressureboy808" },
      { name: "description", content: "All free daily football tips: leagues, odds, confidence, and verified results — updated daily." },
      { property: "og:title", content: "Free Daily Football Predictions" },
    ],
    links: [{ rel: "canonical", href: "/predictions" }],
  }),
  component: FreeTipsPage,
});

function FreeTipsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["free-tips-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("category", "free")
        .eq("is_published", true)
        .order("match_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as Prediction[]) ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="mb-8 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-glow">Free</div>
          <h1 className="mt-1 font-display text-4xl font-extrabold">Daily Football Tips</h1>
          <p className="mt-2 text-muted-foreground">Every day, the best free picks from across Europe and beyond.</p>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 animate-pulse rounded-lg bg-card/60" />)}
          </div>
        ) : data && data.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => <PredictionCard key={p.id} p={p} />)}
          </div>
        ) : (
          <Card className="p-12 text-center text-muted-foreground">No free tips posted yet.</Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
