import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/admin.functions";
import { PageHeader, Stat, Panel, Badge, Table, Empty } from "@/components/admin/kit";
import { ks, timeAgo, dateTime } from "@/lib/format";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const { data: liveData } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard(), enabled: !isLocalDemo });
  const data = isLocalDemo ? localDemoDashboard : liveData;
  const s = data?.stats;
  return (
    <>
      {isLocalDemo && <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">Local demo — sample data only. This dashboard is read-only; nothing is saved or sent to a backend.</div>}
      <PageHeader title="Good to see you." sub="Keep your catalog accurate, your team moving, and today's orders under control."
        actions={!isLocalDemo && <>
          <Button asChild><Link to="/admin/products/new"><Plus className="size-4" />Add product</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/upload"><Upload className="size-4" />Upload catalog</Link></Button>
          <Button asChild variant="outline"><Link to="/"><ExternalLink className="size-4" />View catalog</Link></Button>
        </>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active products" value={s?.products ?? "–"} hint={`${s?.categories ?? 0} categories`} />
        <Stat label="Ready to sell" value={s?.instock ?? "–"} hint={`${s?.outofstock ?? 0} out of stock`} />
        <Stat label="Orders today" value={s?.ordersToday ?? "–"} hint={s ? ks(s.retailToday) : ""} />
        <Stat label="Missing photos" value={s?.missingImages ?? "–"} hint={`${s?.pendingHandovers ?? 0} cash handovers to verify`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Recent orders" actions={!isLocalDemo && <Link to="/admin/orders" className="text-sm text-primary">All orders</Link>}>
          {data?.recentOrders.length ? (
            <Table head={["#", "Rep", "Outlet", "Total", "Status", "When"]}>
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{isLocalDemo ? `#${o.id}` : <Link to="/admin/orders/$id" params={{ id: String(o.id) }} className="font-medium text-primary">#{o.id}</Link>}</td>
                  <td>{o.rep_name}</td><td>{o.outlet_name}</td><td>{ks(o.total_retail)}</td><td><Badge>{o.status}</Badge></td>
                  <td className="text-muted-foreground">{dateTime(o.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : <Empty>No orders yet.</Empty>}
        </Panel>
        <Panel title="Catalog activity">
          <ul className="space-y-3">
            {(data?.activity ?? []).map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-medium">{a.product_name || "—"} <span className="text-xs font-normal text-muted-foreground">· {a.event_type.replace(/_/g, " ")}</span></p>
                {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
                <p className="text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
