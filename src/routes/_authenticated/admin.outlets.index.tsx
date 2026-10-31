import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOutlets, saveOutlet } from "@/lib/admin.functions";
import { PageHeader, Panel, Table, Empty, useAction } from "@/components/admin/kit";
import { dateOnly, ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/outlets/")({ component: Outlets });

function Outlets() {
  const { data = [] } = useQuery({ queryKey: ["outlets"], queryFn: () => listOutlets() });
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const add = useAction(() => saveOutlet({ data: { name, area } }), { success: "Outlet added.", invalidate: [["outlets"]], onDone: () => { setName(""); setArea(""); } });
  const list = useMemo(() => data.filter((o) => `${o.name} ${o.area} ${(o.outlet_aliases as { alias: string }[]).map((a) => a.alias).join(" ")}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <>
      <PageHeader title="Outlets" sub="Shops your team visits. Names typed in orders are matched to outlets and their aliases." />
      <Panel title="Add outlet" className="mb-6">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(undefined); }}>
          <Input required placeholder="Outlet name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Input placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} className="max-w-xs" />
          <Button disabled={add.isPending}><Plus className="size-4" />Add</Button>
        </form>
      </Panel>
      <Panel>
        <Input placeholder="Search outlets" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-sm" />
        {list.length ? (
          <Table head={["Outlet", "Area", "Type", "Orders", "Sales", "Visits", "Last visit"]}>
            {list.map((o) => (
              <tr key={o.id}>
                <td><Link to="/admin/outlets/$id" params={{ id: String(o.id) }} className="font-medium text-primary">{o.name}</Link></td>
                <td>{o.area || "—"}</td><td>{o.shop_type || "—"}</td><td>{o.order_count}</td><td>{ks(o.sales)}</td><td>{o.visit_count}</td>
                <td className="text-muted-foreground">{dateOnly(o.last_visit)}</td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No outlets yet.</Empty>}
      </Panel>
    </>
  );
}
