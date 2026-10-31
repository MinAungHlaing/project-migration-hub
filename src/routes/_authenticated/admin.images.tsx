import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listProductsAdmin, uploadProductImage } from "@/lib/admin.functions";
import { PageHeader, Stat, Panel, useAction } from "@/components/admin/kit";
import { imageUrl } from "@/lib/format";
import { toWebpBase64 } from "@/lib/image";

export const Route = createFileRoute("/_authenticated/admin/images")({ component: Images });

function Images() {
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => listProductsAdmin() });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "missing">("all");
  const upload = useAction(async ({ id, f }: { id: number; f: File }) => uploadProductImage({ data: { id, base64: await toWebpBase64(f) } }), { success: "Photo saved.", invalidate: [["admin-products"], ["catalog"]] });
  const list = useMemo(() => data.filter((p) => (filter === "all" || (filter === "with" ? p.has_image : !p.has_image)) &&
    `${p.product_id} ${p.product_name}`.toLowerCase().includes(q.toLowerCase())), [data, q, filter]);
  const withImg = data.filter((p) => p.has_image).length;
  return (
    <>
      <PageHeader title="Media library" sub="Product photos are saved under each product's ID automatically." />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Products" value={data.length} />
        <Stat label="With photo" value={withImg} />
        <Stat label="Missing photo" value={data.length - withImg} />
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Search by ID or name" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          {(["all", "with", "missing"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "with" ? "With photo" : "Missing"}</Button>)}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((p) => {
            const img = imageUrl(p.image_path, p.updated_at);
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border">
                <Link to="/admin/products/$id" params={{ id: String(p.id) }} className="block aspect-square bg-muted">
                  {img ? <img src={img} alt="" loading="lazy" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><Package className="size-8" /></div>}
                </Link>
                <div className="p-2">
                  <p className="font-mono text-[11px] text-muted-foreground">{p.product_id}</p>
                  <p className="line-clamp-1 text-xs font-medium">{p.product_name}</p>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs text-primary">
                    <Upload className="size-3" />{img ? "Replace" : "Upload"}
                    <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ id: p.id, f }); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
