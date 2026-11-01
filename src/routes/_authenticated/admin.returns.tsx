import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader, Panel, Stat, Table, Empty, Badge, useAction } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";
import { listReturns, addReturn, setReturnStatus } from "@/lib/finance.functions";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/returns")({
  head: () => ({ meta: [{ title: "Returns & damage — GTM Admin" }] }),
  component: ReturnsPage,
});

type Row = { id: number; product_name: string; outlet_name: string; quantity: number; condition: string; reason: string; value: number; owner: string; status: string };

function ReturnsPage() {
  const list = useServerFn(listReturns);
  const add = useServerFn(addReturn);
  const setStatus = useServerFn(setReturnStatus);
  const { data: live = [] } = useQuery({ queryKey: ["returns"], queryFn: () => list(), enabled: !isLocalDemo });
  const data: Row[] = isLocalDemo ? localDemoDashboard.returns.map((r) => ({ ...r, condition: "damaged" })) : (live as Row[]);
  const blank = { product_name: "", outlet_name: "", quantity: "1", condition: "good", reason: "", value: "" };
  const [form, setForm] = useState(blank);
  const save = useAction((f: typeof form) => add({ data: { ...f, quantity: Number(f.quantity), value: Number(f.value || 0) } }), {
    success: "Return recorded", invalidate: [["returns"]], onDone: () => setForm(blank),
  });
  const change = useAction((v: { id: number; status: string }) => setStatus({ data: v }), { invalidate: [["returns"]] });

  return (
    <>
      <PageHeader title="Returns & damage" sub="Stock returns, damaged goods, and customer rejections." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Records" value={data.length} />
        <Stat label="Total value" value={ks(data.reduce((s, r) => s + Number(r.value), 0))} />
        <Stat label="Pending" value={data.filter((r) => r.status.startsWith("Pending")).length} />
        <Stat label="Damaged" value={data.filter((r) => r.condition === "damaged").length} />
      </div>
      {!isLocalDemo && (
        <Panel title="Record a return" className="mb-6">
          <form className="grid gap-3 md:grid-cols-7" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
            <Input placeholder="Product" aria-label="Product" required value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            <Input placeholder="Outlet" aria-label="Outlet" value={form.outlet_name} onChange={(e) => setForm({ ...form, outlet_name: e.target.value })} />
            <Input type="number" min="1" aria-label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <select aria-label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="rounded-md border bg-background px-3 text-sm">
              <option value="good">Good (resell)</option><option value="damaged">Damaged</option>
            </select>
            <Input placeholder="Reason" aria-label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Input type="number" min="0" placeholder="Value (Ks)" aria-label="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Button type="submit" disabled={save.isPending}>Add</Button>
          </form>
        </Panel>
      )}
      <Panel>
        {data.length ? (
          <Table head={["ID", "Product", "Outlet", "Qty", "Condition", "Reason", "Value", "Recorded by", "Status"]}>
            {data.map((item) => (
              <tr key={item.id}>
                <td>#{item.id}</td>
                <td>{item.product_name}</td>
                <td>{item.outlet_name}</td>
                <td>{item.quantity}</td>
                <td className="capitalize">{item.condition}</td>
                <td>{item.reason}</td>
                <td>{ks(item.value)}</td>
                <td className="text-muted-foreground">{item.owner}</td>
                <td>
                  {isLocalDemo ? <Badge>{item.status}</Badge> : (
                    <select aria-label={`Status for return ${item.id}`} value={item.status} onChange={(e) => change.mutate({ id: item.id, status: e.target.value })} className="rounded-md border bg-background px-2 py-1 text-xs">
                      <option>Pending</option><option>Approved</option><option>Rejected</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No returns or damage records.</Empty>}
      </Panel>
    </>
  );
}
