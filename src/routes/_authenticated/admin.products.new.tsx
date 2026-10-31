import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { saveProduct } from "@/lib/admin.functions";
import { PageHeader, Panel, useAction } from "@/components/admin/kit";
import { ProductForm, emptyProduct, toPayload, type ProductValues } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/products/new")({ component: NewProduct });

function NewProduct() {
  const navigate = useNavigate();
  const save = useAction((v: ProductValues) => saveProduct({ data: toPayload(v) }), {
    success: "Product added.", invalidate: [["admin-products"], ["catalog"], ["product-meta"]],
    onDone: (r) => navigate({ to: "/admin/products/$id", params: { id: String((r as { id: number }).id) } }),
  });
  return (
    <>
      <PageHeader title="Add product" />
      <Panel><ProductForm isNew initial={emptyProduct} busy={save.isPending} onSubmit={(v) => save.mutate(v)} /></Panel>
    </>
  );
}
