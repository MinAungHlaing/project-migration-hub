import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listStockCounts, createStockCount } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateOnly } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/stock-counts/")({ component: Counts });

function Counts() {
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["stock-counts"], queryFn: () => listStockCounts() });
  const create = useAction(() => createStockCount(), { invalidate: [["stock-counts"]], onDone: (r) => navigate({ to: "/admin/stock-counts/$id", params: { id: String((r as { id: number }).id) } }) });
  return (
    <>
      <PageHeader title="Stock counts" sub="Count what's physically on the shelf; approving a count adjusts stock to match."
        actions={<Button disabled={create.isPending} onClick={() => create.mutate(undefined)}><Plus className="size-4" />Start count</Button>} />
      <Panel>
        {data.length ? <Table head={["#", "Date", "Progress", "Status", "Created by"]}>
          {data.map((c) => <tr key={c.id}><td><Link to="/admin/stock-counts/$id" params={{ id: String(c.id) }} className="text-primary">COUNT-{c.id}</Link></td><td>{dateOnly(c.count_date)}</td><td>{c.counted_count} / {c.line_count}</td><td><Badge>{c.status}</Badge></td><td className="text-muted-foreground">{c.created_by}</td></tr>)}
        </Table> : <Empty>No stock counts yet.</Empty>}
      </Panel>
    </>
  );
}
