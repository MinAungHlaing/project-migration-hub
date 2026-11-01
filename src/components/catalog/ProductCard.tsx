import { Link } from "@tanstack/react-router";
import { Minus, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/lib/catalog.functions";
import { imageUrl, ks, productSlug } from "@/lib/format";

type Translate = (key: string) => string;

export function QtyControl({ p, qty, setQty, t }: { p: PublicProduct; qty: number; setQty: (n: number) => void; t: Translate }) {
  const out = p.status !== "In Stock";
  if (out) return <span className="text-xs font-medium text-destructive">{t("catalog.outOfStock")}</span>;
  if (!qty) return <Button size="sm" aria-label={`${t("catalog.add")} ${p.product_name}`} onClick={() => setQty(1)}><Plus className="size-4" />{t("catalog.add")}</Button>;
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" className="size-9" aria-label={`${t("catalog.removeOne")} ${p.product_name}`} onClick={() => setQty(qty - 1)}><Minus className="size-3" /></Button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
      <Button size="icon" variant="outline" className="size-9" aria-label={`${t("catalog.addOne")} ${p.product_name}`} onClick={() => setQty(qty + 1)}><Plus className="size-3" /></Button>
    </div>
  );
}

export function ProductCard({ p, qty, setQty, t }: { p: PublicProduct; qty: number; setQty: (n: number) => void; t: Translate }) {
  const img = imageUrl(p.image_path, p.updated_at);
  const out = p.status !== "In Stock";
  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-0.5 ${out ? "opacity-80" : ""}`}>
      <Link to="/product/$slug" params={{ slug: productSlug(p.product_id) }} className="relative block aspect-[4/3] bg-muted">
        {img ? (
          <img src={img} alt={p.product_name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground"><Package className="size-10" /></div>
        )}
        <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{p.category}</span>
        {out && <span className="absolute bottom-3 left-3 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-destructive">{t("catalog.outOfStock")}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="truncate font-mono text-[11px] text-muted-foreground">{p.product_id} · {p.unit}</p>
        <Link to="/product/$slug" params={{ slug: productSlug(p.product_id) }} className="line-clamp-2 min-h-10 font-semibold leading-snug hover:text-primary">{p.product_name}</Link>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t pt-3">
          <div>
            <p className="text-[11px] text-muted-foreground">{t("catalog.retail")}</p>
            <p className="font-display text-lg font-semibold text-primary">{ks(p.retail)}</p>
            <p className="text-xs text-muted-foreground">{t("catalog.wholesale")} {ks(p.wholesale)}</p>
          </div>
          <QtyControl p={p} qty={qty} setQty={setQty} t={t} />
        </div>
      </div>
    </article>
  );
}
