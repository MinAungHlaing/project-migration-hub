import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listReps, saveRep, deleteRep } from "@/lib/admin.functions";
import { PageHeader, Panel, Table, Empty, useAction } from "@/components/admin/kit";

export const Route = createFileRoute("/_authenticated/admin/reps")({ component: Reps });

type F = { id?: number; code: string; name: string; active: boolean; mobile_username: string; mobile_password: string };

function Reps() {
  const { data = [] } = useQuery({ queryKey: ["reps"], queryFn: () => listReps() });
  const [form, setForm] = useState<F | null>(null);
  const save = useAction((f: F) => saveRep({ data: f }), { success: "Saved.", invalidate: [["reps"], ["catalog"]], onDone: () => setForm(null) });
  const del = useAction((id: number) => deleteRep({ data: { id } }), { success: "Rep deleted.", invalidate: [["reps"], ["catalog"]] });
  return (
    <>
      <PageHeader title="Sales team" sub="Reps pick their name from this list when ordering. Give a rep a field app username and password to let them sync orders and deliveries."
        actions={<Button onClick={() => setForm({ code: "", name: "", active: true, mobile_username: "", mobile_password: "" })}><Plus className="size-4" />Add rep</Button>} />
      <Panel>
        {data.length ? <Table head={["Code", "Name", "Active", "Field app", ""]}>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="font-mono">{r.code}</td><td>{r.name}</td><td>{r.active ? "Yes" : "No"}</td>
              <td>{r.mobile_username ? <span className="inline-flex items-center gap-1"><Smartphone className="size-3.5" />{r.mobile_username}{!r.hasPassword && <span className="text-xs text-destructive">(needs password)</span>}</span> : <span className="text-muted-foreground">—</span>}</td>
              <td className="text-right">
                <Button size="icon" variant="ghost" onClick={() => setForm({ id: r.id, code: r.code, name: r.name, active: r.active, mobile_username: r.mobile_username ?? "", mobile_password: "" })}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${r.name}?`) && del.mutate(r.id)}><Trash2 className="size-4" /></Button>
              </td>
            </tr>
          ))}
        </Table> : <Empty>No reps yet.</Empty>}
      </Panel>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit rep" : "Add rep"}</DialogTitle></DialogHeader>
          {form && (
            <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="grid gap-1.5"><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="T-1" /></div>
                <div className="grid gap-1.5"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />Active</label>
              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-medium">Field app sign-in</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5"><Label>Username</Label><Input value={form.mobile_username} onChange={(e) => setForm({ ...form, mobile_username: e.target.value })} placeholder="optional" /></div>
                  <div className="grid gap-1.5"><Label>{form.id ? "New password" : "Password"}</Label><Input type="password" minLength={8} value={form.mobile_password} onChange={(e) => setForm({ ...form, mobile_password: e.target.value })} placeholder={form.id ? "leave blank to keep" : "min 8 characters"} /></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Changing the username or password signs the rep out of the app.</p>
              </div>
              <Button disabled={save.isPending}>Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
