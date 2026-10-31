import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrder, setOrderStatus, deleteOrder } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateTime, ks, num, repLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({ component: OrderDetail });

function OrderDetail() {
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: { id } }) });
  const status = useAction((s: string) => setOrderStatus({ data: { id, status: s } }), { success: "Status updated.", invalidate: [["order", id], ["orders"]] });
  const del = useAction(() => deleteOrder({ data: { id } }), { success: "Order deleted.", invalidate: [["orders"]], onDone: () => navigate({ to: "/admin/orders" }) });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <Empty>Order not found.</Empty>;
  const o = data.order;
  const outlet = o.outlets as { id: number; name: string; area: string } | null;
  return (
    <>
      <PageHeader title={`Order #${o.id}`} sub={`${dateTime(o.created_at)} · ${o.rep_name}`}
        actions={<>
          {["New", "Fulfilled", "Cancelled"].map((s) => <Button key={s} variant={o.status === s ? "default" : "outline"} disabled={status.isPending} onClick={() => status.mutate(s)}>{s}</Button>)}
          <Button variant="ghost" className="text-destructive" onClick={() => confirm("Delete this order?") && del.mutate(undefined)}><Trash2 className="size-4" /></Button>
        </>} />
      {o.price_mismatch && <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning/15 p-3 text-sm"><AlertTriangle className="size-4" />Prices changed after the rep's catalog was downloaded — this order used the older prices.</div>}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Items">
          <Table head={["Product", "Qty", "Delivered", "Unit retail", "Line retail", "Line wholesale"]}>
            {data.items.map((i) => {
              const delivered = ((i as { delivery_attempt_items: { quantity: number }[] }).delivery_attempt_items ?? []).reduce((s, d) => s + Number(d.quantity), 0);
              return (
                <tr key={i.id}><td><p className="font-medium">{i.product_name}</p><p className="font-mono text-xs text-muted-foreground">{i.product_id}</p></td>
                  <td>{i.quantity}</td><td>{num(delivered)}</td><td>{ks(i.unit_retail)}</td><td>{ks(i.line_retail)}</td><td>{ks(i.line_wholesale)}</td></tr>
              );
            })}
            <tr className="font-semibold"><td colSpan={4}>Total</td><td>{ks(o.total_retail)}</td><td>{ks(o.total_wholesale)}</td></tr>
          </Table>
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Summary">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Status</dt><dd><Badge>{o.status}</Badge></dd>
              <dt className="text-muted-foreground">Outlet</dt><dd>{outlet ? <Link to="/admin/outlets/$id" params={{ id: String(outlet.id) }} className="text-primary">{outlet.name}</Link> : o.outlet_name}</dd>
              <dt className="text-muted-foreground">Delivery rep</dt><dd>{data.deliveryRep ? repLabel(data.deliveryRep.code, data.deliveryRep.name) : "—"}</dd>
              {o.sync_received_at && <><dt className="text-muted-foreground">Synced</dt><dd>{dateTime(o.sync_received_at)}</dd></>}
            </dl>
          </Panel>
          <Panel title="Delivery attempts">
            {data.attempts.length ? data.attempts.map((a) => (
              <div key={a.id} className="mb-3 text-sm last:mb-0">
                <p><Badge>{a.result}</Badge> <span className="text-muted-foreground">{dateTime(a.created_at)}</span></p>
                <p>Cash collected {ks(a.cash_collected)}</p>
                {a.failure_reason && <p className="text-destructive">{a.failure_reason}</p>}
                {a.note && <p className="text-muted-foreground">{a.note}</p>}
              </div>
            )) : <p className="text-sm text-muted-foreground">None yet.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
