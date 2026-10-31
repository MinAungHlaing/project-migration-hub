import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOrders } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, Stat } from "@/components/admin/kit";
import { dateTime, ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders/")({ component: Orders });

function Orders() {
  const [rep, setRep] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const { data } = useQuery({ queryKey: ["orders", rep, date, status], queryFn: () => listOrders({ data: { rep: rep || undefined, date: date || undefined, status: status || undefined } }) });
  const orders = data?.orders ?? [];
  return (
    <>
      <PageHeader title="Orders" sub="Every order from the catalog and the field app." />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Orders" value={orders.length} />
        <Stat label="Retail value" value={ks(orders.reduce((s, o) => s + Number(o.total_retail), 0))} />
        <Stat label="New" value={orders.filter((o) => o.status === "New").length} />
        <Stat label="Fulfilled" value={orders.filter((o) => o.status === "Fulfilled").length} />
      </div>
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={rep || "all"} onValueChange={(v) => setRep(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All reps" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All reps</SelectItem>{data?.repNames.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{["New", "Fulfilled", "Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        {orders.length ? (
          <Table head={["#", "Date", "Rep", "Outlet", "Retail", "Wholesale", "Status"]}>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to="/admin/orders/$id" params={{ id: String(o.id) }} className="font-medium text-primary">#{o.id}</Link>{o.price_mismatch && <AlertTriangle className="ml-1 inline size-3.5 text-warning" />}</td>
                <td className="text-muted-foreground">{dateTime(o.created_at)}</td><td>{o.rep_name}</td><td>{o.outlet_name}</td>
                <td>{ks(o.total_retail)}</td><td>{ks(o.total_wholesale)}</td><td><Badge>{o.status}</Badge></td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No orders match.</Empty>}
      </Panel>
    </>
  );
}
