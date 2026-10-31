import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPurchaseOrders } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty } from "@/components/admin/kit";
import { dateOnly, ks, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/purchases/")({ component: Purchases });

function Purchases() {
  const { data = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => listPurchaseOrders() });
  return (
    <>
      <PageHeader title="Purchasing" sub="Supplier purchase orders. Receiving stock adds it to inventory."
        actions={<Button asChild><Link to="/admin/purchases/new"><Plus className="size-4" />New purchase order</Link></Button>} />
      <Panel>
        {data.length ? <Table head={["Code", "Supplier", "Date", "Invoice", "Lines", "Received", "Cost", "Status"]}>
          {data.map((p) => <tr key={p.id}><td><Link to="/admin/purchases/$id" params={{ id: String(p.id) }} className="font-mono text-primary">{p.order_code}</Link></td><td>{p.supplier}</td><td>{dateOnly(p.order_date)}</td><td>{p.invoice_number}</td><td>{p.line_count}</td><td>{num(p.received_quantity)} / {num(p.ordered_quantity)}</td><td>{ks(p.total_cost)}</td><td><Badge>{p.status}</Badge></td></tr>)}
        </Table> : <Empty>No purchase orders yet.</Empty>}
      </Panel>
    </>
  );
}
