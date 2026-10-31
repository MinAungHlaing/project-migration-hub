import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProductsAdmin, createPurchaseOrder } from "@/lib/admin.functions";
import { PageHeader, Panel, useAction } from "@/components/admin/kit";
import { ks, todayIso } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/purchases/new")({ component: NewPO });

type Line = { product_pk: string; quantity: string; unit_cost: string };

function NewPO() {
  const navigate = useNavigate();
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => listProductsAdmin() });
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(todayIso());
  const [invoice, setInvoice] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_pk: "", quantity: "", unit_cost: "" }]);
  const suppliers = Array.from(new Set(products.map((p) => p.supplier).filter(Boolean))).sort();
  const create = useAction(() => createPurchaseOrder({ data: { supplier, orderDate: date, invoice, note, items: lines.filter((l) => l.product_pk).map((l) => ({ product_pk: Number(l.product_pk), quantity: Number(l.quantity), unit_cost: Number(l.unit_cost || 0) })) } }), {
    success: "Purchase order created.", invalidate: [["purchases"]], onDone: (r) => navigate({ to: "/admin/purchases/$id", params: { id: String((r as { id: number }).id) } }),
  });
  const upd = (i: number, k: keyof Line, v: string) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_cost || 0), 0);
  return (
    <>
      <PageHeader title="New purchase order" />
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(undefined); }} className="grid gap-6">
        <Panel title="Supplier">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1.5"><Label>Supplier</Label><Input required list="po-sups" value={supplier} onChange={(e) => setSupplier(e.target.value)} /><datalist id="po-sups">{suppliers.map((s) => <option key={s} value={s} />)}</datalist></div>
            <div className="grid gap-1.5"><Label>Order date</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Invoice number</Label><Input value={invoice} onChange={(e) => setInvoice(e.target.value)} /></div>
          </div>
          <div className="mt-3 grid gap-1.5"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </Panel>
        <Panel title="Products" actions={<span className="text-sm font-semibold">Total {ks(total)}</span>}>
          <div className="grid gap-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_40px] gap-2">
                <Select value={l.product_pk} onValueChange={(v) => upd(i, "product_pk", v)}>
                  <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>{products.filter((p) => !supplier || !p.supplier || p.supplier === supplier || l.product_pk === String(p.id)).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.product_id} — {p.product_name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Qty" inputMode="decimal" value={l.quantity} onChange={(e) => upd(i, "quantity", e.target.value)} />
                <Input placeholder="Unit cost" inputMode="decimal" value={l.unit_cost} onChange={(e) => upd(i, "unit_cost", e.target.value)} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-3" onClick={() => setLines([...lines, { product_pk: "", quantity: "", unit_cost: "" }])}><Plus className="size-4" />Add line</Button>
        </Panel>
        <div><Button disabled={create.isPending}>Create purchase order</Button></div>
      </form>
    </>
  );
}
