import { useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Upload, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductAdmin, saveProduct, deleteProduct, uploadProductImage, removeProductImage } from "@/lib/admin.functions";
import { PageHeader, Panel, Table, Empty, useAction } from "@/components/admin/kit";
import { ProductForm, toPayload, type ProductValues } from "@/components/admin/ProductForm";
import { dateTime, imageUrl, ks, num, productSlug } from "@/lib/format";
import { toWebpBase64 } from "@/lib/image";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({ component: EditProduct });

function EditProduct() {
  const { id } = Route.useParams();
  const pk = Number(id);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-product", pk], queryFn: () => getProductAdmin({ data: { id: pk } }) });
  const inv = [["admin-product", pk], ["admin-products"], ["catalog"]];
  const save = useAction((v: ProductValues) => saveProduct({ data: { ...toPayload(v), id: pk } }), { success: "Saved.", invalidate: inv });
  const del = useAction(() => deleteProduct({ data: { id: pk } }), { success: "Product deleted.", invalidate: [["admin-products"], ["catalog"]], onDone: () => navigate({ to: "/admin/products" }) });
  const upload = useAction(async (f: File) => uploadProductImage({ data: { id: pk, base64: await toWebpBase64(f) } }), { success: "Photo saved.", invalidate: inv });
  const removeImg = useAction(() => removeProductImage({ data: { id: pk } }), { success: "Photo removed.", invalidate: inv });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const p = data?.product;
  if (!p) return <Empty>Product not found. <Link to="/admin/products" className="text-primary">Back</Link></Empty>;
  const s = (x: unknown) => (x == null ? "" : String(x));
  const initial: ProductValues = {
    id: p.id, product_id: p.product_id, product_name: p.product_name, upc: s(p.upc || ""), unit: p.unit, retail: s(p.retail), wholesale: s(p.wholesale),
    base_price: s(p.base_price), b2c: s(p.b2c), category: p.category, status: p.status, description: p.description, supplier: p.supplier,
  };
  const img = imageUrl(p.image_path, p.updated_at);

  return (
    <>
      <PageHeader title={p.product_name || p.product_id} sub={`${p.product_id} · generation ${p.generation} · stock on hand ${num(data.stock)} ${p.unit}`}
        actions={<>
          <Button asChild variant="outline"><Link to="/product/$slug" params={{ slug: productSlug(p.product_id) }}>View public page</Link></Button>
          <Button variant="destructive" onClick={() => confirm("Delete this product permanently?") && del.mutate(undefined)}><Trash2 className="size-4" />Delete</Button>
        </>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel title="Details"><ProductForm key={p.updated_at} isNew={false} initial={initial} busy={save.isPending} onSubmit={(v) => save.mutate(v)} /></Panel>
        <Panel title="Photo">
          <div className="overflow-hidden rounded-xl border bg-muted">
            {img ? <img src={img} alt="" className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center text-muted-foreground"><Package className="size-10" /></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <div className="mt-3 grid gap-2">
            <Button variant="outline" disabled={upload.isPending} onClick={() => fileRef.current?.click()}><Upload className="size-4" />{upload.isPending ? "Uploading…" : img ? "Replace photo" : "Upload photo"}</Button>
            {img && <Button variant="ghost" className="text-destructive" onClick={() => removeImg.mutate(undefined)}>Remove photo</Button>}
            <p className="text-xs text-muted-foreground">Saved as {productSlug(p.product_id)}.webp, resized to 1200px.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Price history" className="mt-6">
        {data.history.length ? (
          <Table head={["When", "Retail", "Wholesale", "Source"]}>
            {data.history.map((h) => (
              <tr key={h.id}><td>{dateTime(h.changed_at)}</td><td>{ks(h.old_retail)} → <b>{ks(h.new_retail)}</b></td><td>{ks(h.old_wholesale)} → <b>{ks(h.new_wholesale)}</b></td><td className="text-muted-foreground">{h.source}</td></tr>
            ))}
          </Table>
        ) : <Empty>No price changes recorded.</Empty>}
      </Panel>
    </>
  );
}
