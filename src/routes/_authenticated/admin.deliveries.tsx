import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDeliveryBoard, assignDelivery, verifyHandover } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateTime, dateOnly, ks, repLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/deliveries")({ component: Deliveries });

function Deliveries() {
  const [date, setDate] = useState("");
  const { data } = useQuery({ queryKey: ["deliveries", date], queryFn: () => getDeliveryBoard({ data: { date: date || undefined } }) });
  const assign = useAction((v: { orderId: number; repId: number }) => assignDelivery({ data: v }), { success: "Assigned.", invalidate: [["deliveries"]] });
  const verify = useAction((v: { id: number; received: number }) => verifyHandover({ data: v }), { success: "Handover verified.", invalidate: [["deliveries"]] });
  const [received, setReceived] = useState<Record<number, string>>({});
  const repName = (id: number | null) => { const r = data?.allReps.find((x) => x.id === id); return r ? repLabel(r.code, r.name) : "—"; };

  return (
    <>
      <PageHeader title="Deliveries" sub="Assign new orders to reps with field app sign-in, and verify their cash handovers." />
      <Panel title="Orders waiting for delivery">
        {data?.reps.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No reps have field app sign-in yet — set a mobile username and password under Sales team.</p>}
        {data?.orders.length ? (
          <Table head={["#", "Placed", "Outlet", "Area", "Retail", "Assigned to", "Assign"]}>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td><Link to="/admin/orders/$id" params={{ id: String(o.id) }} className="text-primary">#{o.id}</Link></td>
                <td className="text-muted-foreground">{dateTime(o.created_at)}</td><td>{o.outlet_name}</td>
                <td>{(o.outlets as { area: string } | null)?.area || "—"}</td><td>{ks(o.total_retail)}</td><td>{repName(o.delivery_rep_id)}</td>
                <td>
                  <Select value={o.delivery_rep_id ? String(o.delivery_rep_id) : ""} onValueChange={(v) => assign.mutate({ orderId: o.id, repId: Number(v) })}>
                    <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Choose rep" /></SelectTrigger>
                    <SelectContent>{data.reps.map((r) => <SelectItem key={r.id} value={String(r.id)}>{repLabel(r.code, r.name)}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No new orders waiting.</Empty>}
      </Panel>
      <Panel title="Cash handovers" className="mt-6" actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />}>
        {data?.handovers.length ? (
          <Table head={["Date", "Rep", "Expected", "Declared", "Received", "Status", ""]}>
            {data.handovers.map((h) => {
              const rep = h.sales_reps as { code: string; name: string } | null;
              return (
                <tr key={h.id}>
                  <td>{dateOnly(h.handover_date)}</td><td>{rep ? repLabel(rep.code, rep.name) : ""}</td>
                  <td>{ks(h.expected_cash)}</td><td>{ks(h.declared_cash)}</td><td>{h.received_cash != null ? ks(h.received_cash) : "—"}</td>
                  <td><Badge>{h.status}</Badge>{h.verified_by && <p className="text-[11px] text-muted-foreground">{h.verified_by}</p>}</td>
                  <td>
                    {h.status === "pending" && (
                      <div className="flex gap-1">
                        <Input className="h-8 w-28" inputMode="decimal" placeholder="Received" value={received[h.id] ?? String(h.declared_cash)} onChange={(e) => setReceived({ ...received, [h.id]: e.target.value })} />
                        <Button size="sm" onClick={() => verify.mutate({ id: h.id, received: Number(received[h.id] ?? h.declared_cash) })}>Verify</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : <Empty>No handovers.</Empty>}
      </Panel>
    </>
  );
}
