import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Pressureboy808 Blog` },
      { name: "description", content: "Football betting guides and analysis from Pressureboy808." },
    ],
  }),
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        {isLoading ? (
          <div className="h-96 animate-pulse rounded-lg bg-card/60" />
        ) : data ? (
          <article>
            <Link to="/blog" className="text-xs uppercase tracking-wider text-primary-glow hover:underline">← Back to blog</Link>
            <h1 className="mt-3 font-display text-4xl font-extrabold">{data.title}</h1>
            <div className="mt-2 text-sm text-muted-foreground">{data.published_at ? formatDate(data.published_at) : ""}</div>
            {data.cover_image && <img src={data.cover_image} alt={data.title} className="mt-6 aspect-video w-full rounded-lg object-cover" />}
            <div className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap text-foreground">{data.content}</div>
          </article>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
