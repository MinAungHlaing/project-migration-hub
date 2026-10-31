import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOutlet, saveOutlet, addOutletAlias, deleteOutletAlias } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty, useAction } from "@/components/admin/kit";
import { dateTime, ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/outlets/$id")({ component: OutletDetail });

type F = { name: string; area: string; note: string; shop_type: string; credit_limit: string; lat: string; lng: string };

function OutletDetail() {
  const id = Number(Route.useParams().id);
  const { data, isLoading } = useQuery({ queryKey: ["outlet", id], queryFn: () => getOutlet({ data: { id } }) });
  const [f, setF] = useState<F | null>(null);
  const [alias, setAlias] = useState("");
  const inv = [["outlet", id], ["outlets"]];
  const save = useAction((v: F) => saveOutlet({ data: { id, ...v, credit_limit: v.credit_limit === "" ? null : Number(v.credit_limit), lat: v.lat === "" ? null : Number(v.lat), lng: v.lng === "" ? null : Number(v.lng) } }), { success: "Saved.", invalidate: inv });
  const addA = useAction(() => addOutletAlias({ data: { outletId: id, alias } }), { success: "Alias added.", invalidate: inv, onDone: () => setAlias("") });
  const delA = useAction((aid: number) => deleteOutletAlias({ data: { id: aid } }), { invalidate: inv });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <Empty>Outlet not found.</Empty>;
  const o = data.outlet;
  const s = (x: unknown) => (x == null ? "" : String(x));
  const form: F = f ?? { name: o.name, area: o.area, note: o.note, shop_type: s(o.shop_type), credit_limit: s(o.credit_limit), lat: s(o.lat), lng: s(o.lng) };
  const set = (k: keyof F) => (e: { target: { value: string } }) => setF({ ...form, [k]: e.target.value });
  const aliases = o.outlet_aliases as { id: number; alias: string }[];
  return (
    <>
      <PageHeader title={o.name} sub={o.area} actions={o.lat != null && o.lng != null ? <Button asChild variant="outline"><a href={`https://www.google.com/maps?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer">Open map</a></Button> : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
            <div className="grid gap-1.5"><Label>Name</Label><Input required value={form.name} onChange={set("name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Area</Label><Input value={form.area} onChange={set("area")} /></div>
              <div className="grid gap-1.5"><Label>Shop type</Label><Input value={form.shop_type} onChange={set("shop_type")} /></div>
              <div className="grid gap-1.5"><Label>Credit limit (Ks)</Label><Input inputMode="decimal" value={form.credit_limit} onChange={set("credit_limit")} /></div>
              <div />
              <div className="grid gap-1.5"><Label>Latitude</Label><Input value={form.lat} onChange={set("lat")} /></div>
              <div className="grid gap-1.5"><Label>Longitude</Label><Input value={form.lng} onChange={set("lng")} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Note</Label><Textarea value={form.note} onChange={set("note")} /></div>
            <div><Button disabled={save.isPending}>Save</Button></div>
          </form>
        </Panel>
        <Panel title="Other names (aliases)">
          <p className="mb-3 text-sm text-muted-foreground">Orders typed with any of these names are linked to this outlet.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {aliases.map((a) => <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">{a.alias}<button onClick={() => delA.mutate(a.id)}><X className="size-3" /></button></span>)}
            {!aliases.length && <span className="text-sm text-muted-foreground">None.</span>}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addA.mutate(undefined); }}>
            <Input required placeholder="Add alias" value={alias} onChange={(e) => setAlias(e.target.value)} /><Button variant="outline">Add</Button>
          </form>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Orders">
          {data.orders.length ? <Table head={["#", "Date", "Rep", "Total", "Status"]}>
            {data.orders.map((x) => <tr key={x.id}><td><Link to="/admin/orders/$id" params={{ id: String(x.id) }} className="text-primary">#{x.id}</Link></td><td>{dateTime(x.created_at)}</td><td>{x.rep_name}</td><td>{ks(x.total_retail)}</td><td><Badge>{x.status}</Badge></td></tr>)}
          </Table> : <Empty>No orders.</Empty>}
        </Panel>
        <Panel title="Visits">
          {data.visits.length ? <Table head={["When", "Rep", "Type", "Note"]}>
            {data.visits.map((v) => <tr key={v.id}><td>{dateTime(v.visited_at)}</td><td>{v.rep_name}</td><td>{v.visit_type}</td><td className="text-muted-foreground">{v.note}</td></tr>)}
          </Table> : <Empty>No visits.</Empty>}
        </Panel>
      </div>
    </>
  );
}
