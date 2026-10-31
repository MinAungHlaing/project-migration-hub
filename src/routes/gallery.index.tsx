import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react";
import { catalogQuery } from "./index";
import { imageUrl } from "@/lib/format";

export const Route = createFileRoute("/gallery/")({
  head: () => ({
    meta: [
      { title: "Browse GTM products by category" },
      { name: "description", content: "A visual gallery of every GTM product category." },
      { property: "og:title", content: "GTM product gallery" },
      { property: "og:description", content: "Browse GTM products visually by category." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Gallery,
});

function Gallery() {
  const { data } = useSuspenseQuery(catalogQuery);
  const cats = data.categories.map((c) => {
    const items = data.items.filter((p) => p.category === c);
    return { c, count: items.length, cover: items.find((p) => p.image_path) };
  });
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Catalog</Link>
      <h1 className="mt-3 text-3xl font-bold">Gallery</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cats.map(({ c, count, cover }) => (
          <Link key={c} to="/gallery/$category" params={{ category: c }} className="group overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className="aspect-square bg-muted">
              {cover ? <img src={imageUrl(cover.image_path, cover.updated_at)!} alt={c} loading="lazy" className="size-full object-cover transition group-hover:scale-105" /> :
                <div className="flex size-full items-center justify-center text-muted-foreground"><Package className="size-10" /></div>}
            </div>
            <div className="p-3"><p className="font-semibold">{c}</p><p className="text-xs text-muted-foreground">{count} products</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
