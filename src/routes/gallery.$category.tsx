import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { catalogQuery } from "./index";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/catalog/ProductCard";
import { OrderSheet } from "@/components/catalog/OrderSheet";
import { Input } from "@/components/ui/input";
import { StorefrontNavigation } from "@/components/catalog/StorefrontNavigation";
import { useCatalogLanguage } from "@/lib/catalog-language";

const PAGE = 24;

export const Route = createFileRoute("/gallery/$category")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — GTM gallery` },
      { name: "description", content: `All GTM products in ${params.category}, with photos and live prices.` },
      { property: "og:title", content: `${params.category} — GTM gallery` },
      { property: "og:description", content: `Browse ${params.category} products with live prices.` },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { data } = useSuspenseQuery(catalogQuery);
  const cart = useCart();
  const { t } = useCatalogLanguage();
  const [shown, setShown] = useState(PAGE);
  const [query, setQuery] = useState("");
  const items = useMemo(() => data.items.filter((p) =>
    p.category === category &&
    (!query.trim() || `${p.product_id} ${p.product_name} ${p.upc}`.toLowerCase().includes(query.trim().toLowerCase())),
  ), [data.items, category, query]);
  const categoryExists = data.categories.includes(category);
  return (
    <>
      <StorefrontNavigation />
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 pb-28 sm:px-5 sm:py-8">
      <Link to="/gallery" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("catalog.backToGallery")}</Link>
      <h1 className="mt-3 break-words text-3xl font-bold">{category}</h1>
      {categoryExists ? (
        <>
          <p className="mt-1 text-muted-foreground">{t("catalog.showing")} {items.length} {t("catalog.products")}</p>
          <div className="relative mt-5 max-w-lg">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} aria-label={t("catalog.search")} placeholder={t("catalog.search")} className="h-11 pl-9" />
          </div>
        </>
      ) : <p className="mt-2 text-muted-foreground">{t("catalog.noResults")}</p>}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.slice(0, shown).map((p) => (
          <ProductCard key={p.id} p={p} qty={cart.qtyOf(p.id)} t={t}
            setQty={(n) => cart.setQty({ pk: p.id, product_id: p.product_id, name: p.product_name, unit: p.unit, retail: p.retail, wholesale: p.wholesale }, n)} />
        ))}
      </div>
      {!items.length && categoryExists && <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">{t("catalog.noResults")}</p>}
      {shown < items.length && <div className="mt-6 text-center"><button className="min-h-11 rounded-xl border bg-card px-5 py-2 text-sm font-medium hover:bg-accent" onClick={() => setShown(shown + PAGE)}>{t("catalog.showMore")}</button></div>}
      <OrderSheet reps={data.reps} />
      </main>
    </>
  );
}
