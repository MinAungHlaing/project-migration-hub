import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventory, recordMovement } from "@/lib/admin.functions";
import { PageHeader, Panel, Table, Empty, Stat, useAction } from "@/components/admin/kit";
import { dateTime, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/inventory")({ component: Inventory });

function Inventory() {
  const { data } = useQuery({ queryKey: ["inventory"], queryFn: () => getInventory() });
  const [q, setQ] = useState("");
  const [m, setM] = useState({ productPk: "", quantity: "", type: "receipt" as "receipt" | "issue", reference: "", note: "" });
  const rec = useAction(() => recordMovement({ data: { ...m, productPk: Number(m.productPk), quantity: Number(m.quantity) } }), {
    success: "Stock updated.", invalidate: [["inventory"]], onDone: () => setM({ ...m, quantity: "", reference: "", note: "" }),
  });
  const products = data?.products ?? [];
  const list = useMemo(() => products.filter((p) => `${p.product_id} ${p.product_name} ${p.supplier}`.toLowerCase().includes(q.toLowerCase())), [products, q]);
  return (
    <>
      <PageHeader title="Inventory" sub="Stock on hand. Deliveries, purchase receipts and approved counts update it automatically." />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Products tracked" value={products.length} />
        <Stat label="In stock (qty > 0)" value={products.filter((p) => p.quantity > 0).length} />
        <Stat label="Zero stock" value={products.filter((p) => p.quantity <= 0).length} />
      </div>
      <Panel title="Record stock movement" className="mb-6">
        <form className="grid gap-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); rec.mutate(undefined); }}>
          <div className="grid gap-1.5 md:col-span-2"><Label>Product</Label>
            <Select value={m.productPk} onValueChange={(v) => setM({ ...m, productPk: v })}>
              <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.product_id} — {p.product_name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid gap-1.5"><Label>Type</Label>
            <Select value={m.type} onValueChange={(v) => setM({ ...m, type: v as "receipt" | "issue" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="receipt">Receipt (+)</SelectItem><SelectItem value="issue">Issue (−)</SelectItem></SelectContent>
            </Select></div>
          <div className="grid gap-1.5"><Label>Quantity</Label><Input required inputMode="decimal" value={m.quantity} onChange={(e) => setM({ ...m, quantity: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Reference</Label><Input value={m.reference} onChange={(e) => setM({ ...m, reference: e.target.value })} /></div>
          <div className="flex items-end"><Button className="w-full" disabled={!m.productPk || rec.isPending}>Save</Button></div>
        </form>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel title="Stock on hand">
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
          {list.length ? <Table head={["ID", "Product", "Supplier", "On hand", "Updated"]}>
            {list.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.product_id}</td><td>{p.product_name}</td><td>{p.supplier}</td><td className="font-semibold">{num(p.quantity)} {p.unit}</td><td className="text-muted-foreground">{dateTime(p.updated_at)}</td></tr>)}
          </Table> : <Empty>No products.</Empty>}
        </Panel>
        <Panel title="Recent movements">
          {data?.movements.length ? <Table head={["When", "Product", "Change", "Type"]}>
            {data.movements.map((x) => <tr key={x.id}><td className="text-muted-foreground">{dateTime(x.created_at)}</td><td>{x.product_name}</td><td className={Number(x.delta) > 0 ? "text-success" : "text-destructive"}>{Number(x.delta) > 0 ? "+" : ""}{num(x.delta)}</td><td className="text-xs">{x.movement_type.replace(/_/g, " ")}<br /><span className="text-muted-foreground">{x.reference}</span></td></tr>)}
          </Table> : <Empty>No movements yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
