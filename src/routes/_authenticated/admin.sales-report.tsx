import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSalesReport } from "@/lib/admin.functions";
import { PageHeader, Panel, Stat, Table, Empty } from "@/components/admin/kit";
import { ks, num, todayIso } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/sales-report")({ component: SalesReport });

function SalesReport() {
  const [start, setStart] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [end, setEnd] = useState(todayIso());
  const [rep, setRep] = useState("");
  const { data } = useQuery({ queryKey: ["sales", start, end, rep], queryFn: () => getSalesReport({ data: { start, end, rep: rep || undefined } }) });
  const t = data?.totals;
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d) => d.submitted_sales));
  return (
    <>
      <PageHeader title="Sales report" actions={<>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-40" />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-40" />
        <Select value={rep || "all"} onValueChange={(v) => setRep(v === "all" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All reps</SelectItem>{data?.repNames.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders" value={t?.order_count ?? 0} hint={`${t?.outlet_count ?? 0} outlets`} />
        <Stat label="Submitted sales" value={ks(t?.submitted_sales)} />
        <Stat label="Fulfilled sales" value={ks(t?.fulfilled_sales)} hint={`${t?.fulfilled_count ?? 0} fulfilled`} />
        <Stat label="Pending / cancelled" value={`${t?.pending_count ?? 0} / ${t?.cancelled_count ?? 0}`} />
      </div>
      <Panel title="Daily" className="mt-6">
        {data?.daily.length ? (
          <div className="flex h-40 items-end gap-1">
            {data.daily.map((d) => (
              <div key={d.day} className="group relative flex-1" title={`${d.day}: ${ks(d.submitted_sales)}`}>
                <div className="rounded-t bg-primary/80" style={{ height: `${(d.submitted_sales / maxDay) * 150}px` }} />
              </div>
            ))}
          </div>
        ) : <Empty>No orders in this period.</Empty>}
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By rep">
          {data?.reps.length ? <Table head={["Rep", "Orders", "Outlets", "Submitted", "Fulfilled"]}>
            {data.reps.map((r) => <tr key={r.rep_name}><td>{r.rep_name}</td><td>{r.order_count}</td><td>{r.outlet_count}</td><td>{ks(r.submitted_sales)}</td><td>{ks(r.fulfilled_sales)}</td></tr>)}
          </Table> : <Empty>—</Empty>}
        </Panel>
        <Panel title="Top products (excl. cancelled)">
          {data?.products.length ? <Table head={["Product", "Qty", "Orders", "Sales"]}>
            {data.products.map((p) => <tr key={p.product_id + p.product_name}><td><p>{p.product_name}</p><p className="font-mono text-xs text-muted-foreground">{p.product_id}</p></td><td>{num(p.quantity)}</td><td>{p.order_count}</td><td>{ks(p.sales)}</td></tr>)}
          </Table> : <Empty>—</Empty>}
        </Panel>
      </div>
    </>
  );
}
