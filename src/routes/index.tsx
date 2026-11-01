import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCatalog } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/catalog/ProductCard";
import { OrderSheet } from "@/components/catalog/OrderSheet";
import { ActivityBell } from "@/components/catalog/ActivityBell";
import { StorefrontNavigation } from "@/components/catalog/StorefrontNavigation";
import { useCatalogLanguage } from "@/lib/catalog-language";

const PAGE_SIZE = 24;

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog(), staleTime: 30_000 });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GTM Live Catalog — prices, stock & ordering" },
      { name: "description", content: "Search live GTM retail and wholesale prices, check stock, and send orders from the field." },
      { property: "og:title", content: "GTM Live Catalog" },
      { property: "og:description", content: "Live prices, availability and fast ordering in one place." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CatalogPage,
});

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const cart = useCart();
  const { t } = useCatalogLanguage();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [status, setStatus] = useState("In Stock");
  const [sort, setSort] = useState("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filtersActive = Boolean(q.trim()) || cat !== "ALL" || status !== "In Stock" || sort !== "recent";
  const inStockCount = data.items.filter((product) => product.status === "In Stock").length;

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = data.items.filter((p) =>
      (cat === "ALL" || p.category === cat) && (status === "ALL" || p.status === status) &&
      (!s || `${p.product_id} ${p.product_name} ${p.category} ${p.upc}`.toLowerCase().includes(s)));
    if (sort === "price_asc") list = [...list].sort((a, b) => a.retail - b.retail);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.retail - a.retail);
    if (sort === "name_asc") list = [...list].sort((a, b) => a.product_name.localeCompare(b.product_name));
    if (sort === "recent") list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [data.items, q, cat, status, sort]);
  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="min-h-screen pb-28">
      <StorefrontNavigation variant="hero" />
      <header className="hero-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-5 md:flex-row md:items-end md:justify-between md:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{t("catalog.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl md:text-5xl">{t("catalog.title")}</h1>
            <p className="mt-2 max-w-xl opacity-85">{t("catalog.subtitle")}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="rounded-xl bg-primary-foreground/10 px-4 py-2">
              <p className="font-display text-2xl font-bold">{data.items.length}</p>
              <p className="text-[11px] opacity-80">{t("catalog.products")}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 px-4 py-2">
              <p className="font-display text-2xl font-bold">{inStockCount}</p>
              <p className="text-[11px] opacity-80">{t("catalog.inStock")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("catalog.categories")}</p>
          <nav className="sticky top-4 grid gap-1">
            {["ALL", ...data.categories].map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => { setCat(c); setVisibleCount(PAGE_SIZE); }} className={`rounded-lg px-3 py-2 text-left text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {c === "ALL" ? t("catalog.all") : c}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="sticky top-0 z-30 -mx-4 mb-4 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); setVisibleCount(PAGE_SIZE); }} aria-label={t("catalog.search")} placeholder={t("catalog.search")} className="h-11 rounded-xl pl-9" />
              </div>
              <ActivityBell />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["In Stock", "Out Of Stock", "ALL"].map((s) => (
                <button key={s} aria-pressed={status === s} onClick={() => { setStatus(s); setVisibleCount(PAGE_SIZE); }} className={`min-h-9 rounded-full border px-3 py-1 text-xs font-medium ${status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  {s === "ALL" ? t("catalog.allAvailability") : s === "Out Of Stock" ? t("catalog.outOfStock") : t("catalog.inStock")}
                </button>
              ))}
              <div className="ml-auto w-full sm:w-52">
                <Select value={sort} onValueChange={(value) => { setSort(value); setVisibleCount(PAGE_SIZE); }}>
                  <SelectTrigger className="h-9 text-xs" aria-label={t("catalog.sort")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t("catalog.recent")}</SelectItem>
                    <SelectItem value="default">{t("catalog.default")}</SelectItem>
                    <SelectItem value="price_asc">{t("catalog.priceLow")}</SelectItem>
                    <SelectItem value="price_desc">{t("catalog.priceHigh")}</SelectItem>
                    <SelectItem value="name_asc">{t("catalog.nameSort")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {["ALL", ...data.categories].map((c) => (
                <button key={c} aria-pressed={cat === c} onClick={() => { setCat(c); setVisibleCount(PAGE_SIZE); }} className={`min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  {c === "ALL" ? t("catalog.all") : c}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground" aria-live="polite">
            <p>{t("catalog.showing")} {items.length} {t("catalog.of")} {data.items.length} {t("catalog.products")}</p>
            {filtersActive && <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => { setQ(""); setCat("ALL"); setStatus("In Stock"); setSort("recent"); setVisibleCount(PAGE_SIZE); }}>{t("catalog.clearFilters")}</button>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {visibleItems.map((p) => (
              <ProductCard key={p.id} p={p} qty={cart.qtyOf(p.id)} t={t}
                setQty={(n) => cart.setQty({ pk: p.id, product_id: p.product_id, name: p.product_name, unit: p.unit, retail: p.retail, wholesale: p.wholesale }, n)} />
            ))}
          </div>
          {!items.length && <div className="rounded-2xl border border-dashed p-8 text-center sm:p-16"><p className="font-medium">{t("catalog.noResults")}</p><button className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => { setQ(""); setCat("ALL"); setStatus("In Stock"); setSort("recent"); setVisibleCount(PAGE_SIZE); }}>{t("catalog.clearFilters")}</button></div>}
          {visibleCount < items.length && <div className="mt-6 text-center"><Button variant="outline" className="min-h-11 px-6" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>{t("catalog.showMore")}</Button></div>}
        </main>
      </div>
      <OrderSheet reps={data.reps} />
    </div>
  );
}
