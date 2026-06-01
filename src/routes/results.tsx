import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results & Win Rate · Pressureboy808" },
      { name: "description", content: "Verified prediction results, daily/weekly/monthly win rates, and full performance history." },
    ],
    links: [{ rel: "canonical", href: "/results" }],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { data } = useQuery({
    queryKey: ["results-stats"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("predictions")
        .select("id, match_name, league, match_date, tip, odds, status, result_score")
        .neq("status", "pending")
        .order("match_date", { ascending: false })
        .limit(100);
      const all = rows ?? [];
      const won = all.filter((r) => r.status === "won").length;
      const lost = all.filter((r) => r.status === "lost").length;
      const total = won + lost;
      return { rows: all, won, lost, total, rate: total ? Math.round((won / total) * 100) : 0 };
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <h1 className="font-display text-4xl font-extrabold">Results & Win Rate</h1>
        <p className="mt-2 text-muted-foreground">Every settled prediction. Tracked, public, honest.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { l: "Win Rate", v: data ? `${data.rate}%` : "—" },
            { l: "Wins", v: data?.won ?? "—" },
            { l: "Losses", v: data?.lost ?? "—" },
            { l: "Settled", v: data?.total ?? "—" },
          ].map((s) => (
            <Card key={s.l} className="p-6 text-center">
              <div className="font-display text-3xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
            </Card>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3 hidden md:table-cell">League</th>
                <th className="px-4 py-3">Tip</th>
                <th className="px-4 py-3 text-right">Odds</th>
                <th className="px-4 py-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows?.length ? data.rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.match_date)}</td>
                  <td className="px-4 py-3 font-medium">{r.match_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.league}</td>
                  <td className="px-4 py-3">{r.tip}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(r.odds).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-semibold uppercase ${r.status === "won" ? "text-success" : r.status === "lost" ? "text-destructive" : "text-muted-foreground"}`}>{r.status}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No settled results yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
