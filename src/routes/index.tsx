import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, LayoutGrid, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCatalog } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/catalog/ProductCard";
import { OrderSheet } from "@/components/catalog/OrderSheet";
import { ActivityBell } from "@/components/catalog/ActivityBell";

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
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [status, setStatus] = useState("In Stock");
  const [sort, setSort] = useState("recent");

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

  return (
    <div className="min-h-screen pb-28">
      <header className="hero-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">GTM live catalog</p>
            <h1 className="mt-2 text-4xl font-bold md:text-5xl">Find what moves.</h1>
            <p className="mt-2 max-w-md opacity-85">Live prices, availability, and fast ordering in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/gallery" className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2.5 text-sm font-medium hover:bg-primary-foreground/20">
              <LayoutGrid className="size-4" /> Browse visually
            </Link>
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2.5 text-sm font-medium hover:bg-primary-foreground/20">
              <Lock className="size-4" /> Admin
            </Link>
            <div className="rounded-xl bg-primary-foreground/10 px-4 py-2 text-right">
              <p className="font-display text-2xl font-bold">{data.items.length}</p>
              <p className="text-[11px] opacity-80">products</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          <nav className="sticky top-4 grid gap-1">
            {["ALL", ...data.categories].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-2 text-left text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {c === "ALL" ? "All items" : c}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="sticky top-0 z-30 -mx-5 mb-4 bg-background/90 px-5 py-3 backdrop-blur">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, IDs, categories…" className="h-11 rounded-xl pl-9" />
              </div>
              <ActivityBell />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["In Stock", "Out Of Stock", "ALL"].map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-xs font-medium ${status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  {s === "ALL" ? "All" : s === "Out Of Stock" ? "Out of stock" : "In stock"}
                </button>
              ))}
              <div className="ml-auto w-44">
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently updated</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price_asc">Price ↑</SelectItem>
                    <SelectItem value="price_desc">Price ↓</SelectItem>
                    <SelectItem value="name_asc">A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {["ALL", ...data.categories].map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
                  {c === "ALL" ? "All items" : c}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">{items.length} products</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} qty={cart.qtyOf(p.id)}
                setQty={(n) => cart.setQty({ pk: p.id, product_id: p.product_id, name: p.product_name, unit: p.unit, retail: p.retail, wholesale: p.wholesale }, n)} />
            ))}
          </div>
          {!items.length && <p className="py-16 text-center text-muted-foreground">No products match.</p>}
        </main>
      </div>
      <OrderSheet reps={data.reps} />
    </div>
  );
}
