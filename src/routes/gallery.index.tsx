import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { catalogQuery } from "./index";
import { imageUrl } from "@/lib/format";
import { StorefrontNavigation } from "@/components/catalog/StorefrontNavigation";
import { useCatalogLanguage } from "@/lib/catalog-language";

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
  const { t } = useCatalogLanguage();
  const [query, setQuery] = useState("");
  const cats = useMemo(() => data.categories.map((c) => {
    const items = data.items.filter((p) => p.category === c);
    return { c, count: items.length, cover: items.find((p) => p.image_path) };
  }).filter(({ c }) => c.toLowerCase().includes(query.trim().toLowerCase())), [data.categories, data.items, query]);
  return (
    <>
      <StorefrontNavigation />
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
      <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("catalog.backToCatalog")}</Link>
      <h1 className="mt-3 text-3xl font-bold">{t("catalog.galleryTitle")}</h1>
      <p className="mt-1 text-muted-foreground">{t("catalog.galleryIntro")}</p>
      <div className="relative mt-5 max-w-lg">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("catalog.categories")} placeholder={t("catalog.categories")} className="h-11 pl-9" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cats.map(({ c, count, cover }) => (
          <Link key={c} to="/gallery/$category" params={{ category: c }} aria-label={`${t("catalog.viewCategory")}: ${c}, ${count} ${t("catalog.products")}`} className="group overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className="aspect-square bg-muted">
              {cover ? <img src={imageUrl(cover.image_path, cover.updated_at)!} alt={c} loading="lazy" className="size-full object-cover transition group-hover:scale-105" /> :
                <div className="flex size-full items-center justify-center text-muted-foreground"><Package className="size-10" /></div>}
            </div>
            <div className="p-3 sm:p-4"><p className="line-clamp-2 min-h-10 font-semibold">{c}</p><p className="text-xs text-muted-foreground">{count} {t("catalog.products")}</p></div>
          </Link>
        ))}
      </div>
      {!cats.length && <p className="py-12 text-center text-muted-foreground">{t("catalog.noResults")}</p>}
      </main>
    </>
  );
}
