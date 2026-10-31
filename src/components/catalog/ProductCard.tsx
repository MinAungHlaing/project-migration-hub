import { Link } from "@tanstack/react-router";
import { Minus, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/lib/catalog.functions";
import { imageUrl, ks, productSlug } from "@/lib/format";

export function QtyControl({ p, qty, setQty }: { p: PublicProduct; qty: number; setQty: (n: number) => void }) {
  const out = p.status !== "In Stock";
  if (out) return <span className="text-xs font-medium text-destructive">Out of stock</span>;
  if (!qty) return <Button size="sm" onClick={() => setQty(1)}><Plus className="size-4" />Add</Button>;
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(qty - 1)}><Minus className="size-3" /></Button>
      <span className="w-8 text-center font-semibold">{qty}</span>
      <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(qty + 1)}><Plus className="size-3" /></Button>
    </div>
  );
}

export function ProductCard({ p, qty, setQty }: { p: PublicProduct; qty: number; setQty: (n: number) => void }) {
  const img = imageUrl(p.image_path, p.updated_at);
  const out = p.status !== "In Stock";
  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-0.5 ${out ? "opacity-70" : ""}`}>
      <Link to="/product/$slug" params={{ slug: productSlug(p.product_id) }} className="relative block aspect-[4/3] bg-muted">
        {img ? (
          <img src={img} alt={p.product_name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground"><Package className="size-10" /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{p.category}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-mono text-[11px] text-muted-foreground">{p.product_id} · {p.unit}</p>
        <Link to="/product/$slug" params={{ slug: productSlug(p.product_id) }} className="line-clamp-2 font-semibold leading-snug hover:text-primary">{p.product_name}</Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-display text-lg font-semibold text-primary">{ks(p.retail)}</p>
            <p className="text-xs text-muted-foreground">Wholesale {ks(p.wholesale)}</p>
          </div>
          <QtyControl p={p} qty={qty} setQty={setQty} />
        </div>
      </div>
    </div>
  );
}
