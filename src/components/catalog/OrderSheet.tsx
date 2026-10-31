import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/lib/cart";
import { submitWebOrder } from "@/lib/catalog.functions";
import { ks, repLabel } from "@/lib/format";

type Rep = { id: number; code: string; name: string };

export function OrderSheet({ reps }: { reps: Rep[] }) {
  const { lines, setQty, clear, totals } = useCart();
  const [open, setOpen] = useState(false);
  const [rep, setRep] = useState("");
  const [outlet, setOutlet] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ order_id: number; total_retail: number } | null>(null);
  const submit = useServerFn(submitWebOrder);

  useEffect(() => { setRep(localStorage.getItem("gtm-rep") || ""); }, []);

  async function send() {
    if (!rep) return toast.error("Please select a sales rep.");
    if (!outlet.trim()) return toast.error("Outlet name is required.");
    setBusy(true);
    try {
      const key = sessionStorage.getItem("gtm-order-key") || crypto.randomUUID();
      sessionStorage.setItem("gtm-order-key", key);
      const res = await submit({ data: { rep_name: rep, outlet_name: outlet, items: lines.map((l) => ({ product_pk: l.pk, quantity: l.qty })), idempotency_key: key } });
      sessionStorage.removeItem("gtm-order-key");
      localStorage.setItem("gtm-rep", rep);
      clear();
      setOutlet("");
      setDone(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDone(null); }}>
      <SheetTrigger asChild>
        <Button size="lg" className="fixed bottom-5 right-5 z-40 h-14 rounded-full px-6 shadow-soft">
          <ShoppingBag className="size-5" />
          <span className="font-semibold">Order</span>
          {totals.count > 0 && <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs font-bold text-primary">{totals.count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-display text-xl">Your order</SheetTitle>
        </SheetHeader>
        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <CheckCircle2 className="size-14 text-success" />
            <h3 className="text-xl font-semibold">Order #{done.order_id} sent</h3>
            <p className="text-muted-foreground">Total {ks(done.total_retail)}. The office can see it now.</p>
            <Button onClick={() => { setDone(null); setOpen(false); }}>Back to catalog</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {lines.length === 0 && <p className="py-10 text-center text-muted-foreground">Add products from the catalog to start an order.</p>}
              {lines.map((l) => (
                <div key={l.pk} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.product_id} · {ks(l.retail)} / {l.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(l, l.qty - 1)}><Minus className="size-3" /></Button>
                    <Input className="h-8 w-14 text-center" inputMode="numeric" value={l.qty} onChange={(e) => setQty(l, Number(e.target.value.replace(/\D/g, "")) || 0)} />
                    <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(l, l.qty + 1)}><Plus className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setQty(l, 0)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 border-t bg-muted/40 p-5">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Sales rep</Label>
                  <Select value={rep} onValueChange={setRep}>
                    <SelectTrigger><SelectValue placeholder="Choose your name" /></SelectTrigger>
                    <SelectContent>
                      {reps.map((r) => { const l = repLabel(r.code, r.name); return <SelectItem key={r.id} value={l}>{l}</SelectItem>; })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="outlet">Outlet name</Label>
                  <Input id="outlet" maxLength={200} value={outlet} onChange={(e) => setOutlet(e.target.value)} placeholder="Shop name" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Retail total</p>
                  <p className="font-display text-2xl font-semibold">{ks(totals.retail)}</p>
                  <p className="text-xs text-muted-foreground">Wholesale {ks(totals.wholesale)}</p>
                </div>
                <Button size="lg" disabled={busy || !lines.length} onClick={send}>{busy ? "Sending…" : "Submit order"}</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
