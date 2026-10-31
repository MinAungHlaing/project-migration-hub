import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProductFormMeta } from "@/lib/admin.functions";

export type ProductValues = {
  id?: number | undefined; product_id?: string | undefined; reuse_product_id?: string | undefined; product_name: string; upc: string; unit: string; retail: string; wholesale: string;
  base_price: string; b2c: string; category: string; status: string; description: string; supplier: string;
};

export const emptyProduct: ProductValues = { product_name: "", upc: "", unit: "", retail: "", wholesale: "", base_price: "", b2c: "", category: "", status: "In Stock", description: "", supplier: "" };

export function ProductForm({ initial, onSubmit, busy, isNew }: { initial: ProductValues; onSubmit: (v: ProductValues) => void; busy: boolean; isNew: boolean }) {
  const [v, setV] = useState<ProductValues>(initial);
  const { data: meta } = useQuery({ queryKey: ["product-meta"], queryFn: () => getProductFormMeta() });
  const set = (k: keyof ProductValues) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  return (
    <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <div className="grid gap-4 md:grid-cols-2">
        {isNew ? (
          <div className="grid gap-1.5">
            <Label>Product ID</Label>
            <Select value={v.reuse_product_id || "__new"} onValueChange={(x) => setV({ ...v, reuse_product_id: x === "__new" ? undefined : x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">New ID — {meta?.nextId ?? "…"}</SelectItem>
                {(meta?.reusable ?? []).map((r) => <SelectItem key={r.id} value={r.product_id}>Reuse {r.product_id} (was {r.product_name})</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Reusing an Out Of Stock ID starts a fresh history for the new product.</p>
          </div>
        ) : (
          <div className="grid gap-1.5"><Label>Product ID</Label><Input required value={v.product_id ?? ""} onChange={set("product_id")} /></div>
        )}
        <div className="grid gap-1.5"><Label>Product name</Label><Input required value={v.product_name} onChange={set("product_name")} /></div>
        <div className="grid gap-1.5"><Label>Category</Label><Input list="cats" value={v.category} onChange={set("category")} placeholder="General" />
          <datalist id="cats">{meta?.categories.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="grid gap-1.5"><Label>Supplier</Label><Input list="sups" value={v.supplier} onChange={set("supplier")} />
          <datalist id="sups">{meta?.suppliers.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="grid gap-1.5"><Label>Unit</Label><Input value={v.unit} onChange={set("unit")} placeholder="pcs, box, kg…" /></div>
        <div className="grid gap-1.5"><Label>UPC</Label><Input inputMode="numeric" value={v.upc} onChange={set("upc")} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="grid gap-1.5"><Label>Retail (Ks)</Label><Input required inputMode="decimal" value={v.retail} onChange={set("retail")} /></div>
        <div className="grid gap-1.5"><Label>Wholesale (Ks)</Label><Input required inputMode="decimal" value={v.wholesale} onChange={set("wholesale")} /></div>
        <div className="grid gap-1.5"><Label>Base price (Ks)</Label><Input inputMode="decimal" value={v.base_price} onChange={set("base_price")} /></div>
        <div className="grid gap-1.5"><Label>B2C (Ks)</Label><Input inputMode="decimal" value={v.b2c} onChange={set("b2c")} /></div>
      </div>
      <div className="grid gap-1.5 md:w-60">
        <Label>Status</Label>
        <Select value={v.status} onValueChange={(x) => setV({ ...v, status: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="In Stock">In Stock</SelectItem><SelectItem value="Out Of Stock">Out Of Stock</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5"><Label>Description</Label><Textarea rows={4} value={v.description} onChange={set("description")} /></div>
      <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</Button></div>
    </form>
  );
}

export function toPayload(v: ProductValues) {
  const n = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    id: v.id, product_id: v.product_id, reuse_product_id: v.reuse_product_id, product_name: v.product_name, upc: Number(v.upc) || 0, unit: v.unit,
    retail: Number(v.retail), wholesale: Number(v.wholesale), base_price: n(v.base_price), b2c: n(v.b2c), category: v.category, status: v.status,
    description: v.description, supplier: v.supplier,
  };
}
