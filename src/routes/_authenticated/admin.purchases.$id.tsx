import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateOnly, dateTime, ks, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/purchases/$id")({ component: PODetail });

function PODetail() {
  const id = Number(Route.useParams().id);
  const { data, isLoading } = useQuery({ queryKey: ["purchase", id], queryFn: () => getPurchaseOrder({ data: { id } }) });
  const [qty, setQty] = useState<Record<string, string>>({});
  const inv = [["purchase", id], ["purchases"], ["inventory"]];
  const receive = useAction(() => {
    const quantities = Object.fromEntries((data?.items ?? []).map((i) => [String(i.id), qty[String(i.id)] ?? ""]));
    return receivePurchaseOrder({ data: { id, quantities } });
  }, { success: "Stock received.", invalidate: inv, onDone: () => setQty({}) });
  const cancel = useAction(() => cancelPurchaseOrder({ data: { id } }), { success: "Cancelled.", invalidate: inv });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <Empty>Purchase order not found.</Empty>;
  const o = data.order;
  const canReceive = o.status === "open" || o.status === "partial";
  return (
    <>
      <PageHeader title={o.order_code} sub={`${o.supplier} · ${dateOnly(o.order_date)}${o.invoice_number ? ` · invoice ${o.invoice_number}` : ""}`}
        actions={<>
          <Badge>{o.status}</Badge>
          {o.status === "open" && <Button variant="ghost" className="text-destructive" onClick={() => confirm("Cancel this purchase order?") && cancel.mutate(undefined)}>Cancel order</Button>}
        </>} />
      {o.note && <p className="mb-4 text-sm text-muted-foreground">{o.note}</p>}
      <Panel title="Lines" actions={canReceive ? <Button disabled={receive.isPending} onClick={() => receive.mutate(undefined)}>Receive entered quantities</Button> : o.received_at ? <span className="text-sm text-muted-foreground">Received {dateTime(o.received_at)}</span> : undefined}>
        <Table head={["ID", "Product", "Ordered", "Received", "Unit cost", "Line cost", ...(canReceive ? ["Receive now"] : [])]}>
          {data.items.map((i) => {
            const remaining = Number(i.ordered_quantity) - Number(i.received_quantity);
            return (
              <tr key={i.id}>
                <td className="font-mono text-xs">{i.product_id}</td><td>{i.product_name}</td><td>{num(i.ordered_quantity)} {i.unit}</td><td>{num(i.received_quantity)}</td>
                <td>{ks(i.unit_cost)}</td><td>{ks(Number(i.unit_cost) * Number(i.ordered_quantity))}</td>
                {canReceive && <td>{remaining > 0 ? <Input className="h-8 w-24" inputMode="decimal" placeholder={`≤ ${num(remaining)}`} value={qty[String(i.id)] ?? ""} onChange={(e) => setQty({ ...qty, [String(i.id)]: e.target.value })} /> : "Done"}</td>}
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
