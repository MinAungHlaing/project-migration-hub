import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { catalogQuery } from "./index";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/catalog/ProductCard";
import { OrderSheet } from "@/components/catalog/OrderSheet";

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
  const [shown, setShown] = useState(PAGE);
  const items = data.items.filter((p) => p.category === category);
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 py-8 pb-28">
      <Link to="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Gallery</Link>
      <h1 className="mt-3 text-3xl font-bold">{category}</h1>
      <p className="text-muted-foreground">{items.length} products</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, shown).map((p) => (
          <ProductCard key={p.id} p={p} qty={cart.qtyOf(p.id)}
            setQty={(n) => cart.setQty({ pk: p.id, product_id: p.product_id, name: p.product_name, unit: p.unit, retail: p.retail, wholesale: p.wholesale }, n)} />
        ))}
      </div>
      {shown < items.length && <div className="mt-6 text-center"><button className="rounded-xl border bg-card px-5 py-2 text-sm font-medium hover:bg-accent" onClick={() => setShown(shown + PAGE)}>Show more</button></div>}
      <OrderSheet reps={data.reps} />
    </div>
  );
}
