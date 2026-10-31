import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStockCount, saveStockCount, approveStockCount, deleteStockCount } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateOnly, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/stock-counts/$id")({ component: CountDetail });

function CountDetail() {
  const id = Number(Route.useParams().id);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["stock-count", id], queryFn: () => getStockCount({ data: { id } }) });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  useEffect(() => { if (data) setVals(Object.fromEntries(data.lines.map((l) => [String(l.id), l.counted_quantity == null ? "" : String(l.counted_quantity)]))); }, [data]);
  const inv = [["stock-count", id], ["stock-counts"], ["inventory"]];
  const save = useAction(() => saveStockCount({ data: { id, counts: vals } }), { success: "Count saved.", invalidate: inv });
  const approve = useAction(async () => { await saveStockCount({ data: { id, counts: vals } }); return approveStockCount({ data: { id } }); }, { success: "Count approved — stock adjusted.", invalidate: inv });
  const del = useAction(() => deleteStockCount({ data: { id } }), { success: "Deleted.", invalidate: [["stock-counts"]], onDone: () => navigate({ to: "/admin/stock-counts" }) });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <Empty>Count not found.</Empty>;
  const draft = data.count.status === "draft";
  const lines = data.lines.filter((l) => `${l.product_id} ${l.product_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title={`COUNT-${id}`} sub={`${dateOnly(data.count.count_date)} · ${data.count.created_by}`}
        actions={<>
          <Badge>{data.count.status}</Badge>
          {draft && <>
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(undefined)}>Save progress</Button>
            <Button disabled={approve.isPending} onClick={() => confirm("Approve and adjust stock to these counts?") && approve.mutate(undefined)}>Approve</Button>
            <Button variant="ghost" className="text-destructive" onClick={() => confirm("Delete this count?") && del.mutate(undefined)}>Delete</Button>
          </>}
        </>} />
      <Panel>
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
        <Table head={["ID", "Product", "Book qty", "Current", "Counted", "Difference"]}>
          {lines.map((l) => {
            const v = vals[String(l.id)] ?? "";
            const diff = v === "" ? null : Number(v) - l.current_quantity;
            return (
              <tr key={l.id}>
                <td className="font-mono text-xs">{l.product_id}</td><td>{l.product_name}</td><td>{num(l.book_quantity)} {l.unit}</td><td>{num(l.current_quantity)}</td>
                <td>{draft ? <Input className="h-8 w-24" inputMode="decimal" value={v} onChange={(e) => setVals({ ...vals, [String(l.id)]: e.target.value })} /> : num(l.counted_quantity)}</td>
                <td className={diff == null ? "" : diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}>{diff == null ? "—" : `${diff > 0 ? "+" : ""}${num(diff)}`}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
