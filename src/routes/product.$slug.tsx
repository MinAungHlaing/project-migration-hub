import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Package } from "lucide-react";
import { getProductBySlug } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart";
import { QtyControl } from "@/components/catalog/ProductCard";
import { OrderSheet } from "@/components/catalog/OrderSheet";
import { dateOnly, imageUrl, ks } from "@/lib/format";

const productQuery = (slug: string) => queryOptions({ queryKey: ["product", slug], queryFn: () => getProductBySlug({ data: { slug } }) });

export const Route = createFileRoute("/product/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productQuery(params.slug)),
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.product_name} — ${ks(p.retail)} | GTM Catalog` : "Product not found | GTM Catalog";
    const desc = p ? `${p.product_id} · ${p.category} · Retail ${ks(p.retail)}, wholesale ${ks(p.wholesale)}.` : "This product is not in the GTM catalog.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const cart = useCart();
  const p = data.product;
  if (!p) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <Package className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="text-muted-foreground">No product matches “{slug}”. It may have been removed.</p>
        <Link to="/" className="text-primary underline">Back to catalog</Link>
      </div>
    );
  }
  const img = imageUrl(p.image_path, p.updated_at);
  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Catalog</Link>
        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
            {img ? <img src={img} alt={p.product_name} className="aspect-square w-full object-cover" /> :
              <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground"><Package className="size-16" /></div>}
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs text-muted-foreground">{p.product_id} · {p.category}</p>
            <h1 className="text-3xl font-bold">{p.product_name}</h1>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${p.status === "In Stock" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>{p.status}</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Retail</p><p className="font-display text-2xl font-semibold text-primary">{ks(p.retail)}</p></div>
              <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Wholesale</p><p className="font-display text-2xl font-semibold">{ks(p.wholesale)}</p></div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Unit</dt><dd>{p.unit}</dd>
              {p.upc ? <><dt className="text-muted-foreground">UPC</dt><dd className="font-mono">{p.upc}</dd></> : null}
            </dl>
            {p.description && <p className="whitespace-pre-line text-muted-foreground">{p.description}</p>}
            <div className="flex items-center gap-3">
              <QtyControl p={p} qty={cart.qtyOf(p.id)} setQty={(n) => cart.setQty({ pk: p.id, product_id: p.product_id, name: p.product_name, unit: p.unit, retail: p.retail, wholesale: p.wholesale }, n)} />
            </div>
            {data.history.length > 0 && (
              <div className="rounded-2xl border bg-card p-4">
                <p className="mb-2 font-semibold">Recent price changes</p>
                <ul className="space-y-1 text-sm">
                  {data.history.map((h, i) => (
                    <li key={i} className="flex justify-between gap-2"><span className="text-muted-foreground">{dateOnly(h.changed_at)}</span>
                      <span>{ks(h.old_retail)} → <b>{ks(h.new_retail)}</b></span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <OrderSheet reps={data.reps} />
    </div>
  );
}
