import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Betting Guides & News · Pressureboy808" },
      { name: "description", content: "Football betting guides, match analysis, news, and promotions." },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data } = useQuery({
    queryKey: ["blog-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12">
        <h1 className="font-display text-4xl font-extrabold">Blog</h1>
        <p className="mt-2 text-muted-foreground">Betting strategy, match previews, and insider notes.</p>
        {data && data.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }}>
                <Card className="h-full overflow-hidden p-0 transition-all hover:border-primary/60 hover:shadow-glow">
                  {p.cover_image && <img src={p.cover_image} alt={p.title} className="aspect-video w-full object-cover" />}
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-wider text-primary-glow">{p.category}</div>
                    <h3 className="mt-1 font-display text-lg font-bold">{p.title}</h3>
                    {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                    <div className="mt-3 text-xs text-muted-foreground">{p.published_at ? formatDate(p.published_at) : ""}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-8 p-12 text-center text-muted-foreground">No posts published yet.</Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
