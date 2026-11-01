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
import { useCatalogLanguage } from "@/lib/catalog-language";
import { isLocalDemo } from "@/lib/local-demo";

type Rep = { id: number; code: string; name: string };

export function OrderSheet({ reps }: { reps: Rep[] }) {
  const { lines, setQty, clear, totals } = useCart();
  const { t } = useCatalogLanguage();
  const [open, setOpen] = useState(false);
  const [rep, setRep] = useState("");
  const [outlet, setOutlet] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ order_id: number; total_retail: number } | null>(null);
  const submit = useServerFn(submitWebOrder);

  useEffect(() => { setRep(localStorage.getItem("gtm-rep") || ""); }, []);

  async function send(): Promise<void> {
    if (isLocalDemo) { toast.info(t("order.demoMode")); return; }
    if (!rep) { toast.error(t("order.selectRep")); return; }
    if (!outlet.trim()) { toast.error(t("order.outletRequired")); return; }
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
        <Button size="lg" aria-label={`${t("order.open")}${totals.count ? `, ${totals.count}` : ""}`} className="fixed bottom-4 right-4 z-40 h-12 rounded-full px-5 shadow-soft sm:bottom-5 sm:right-5 sm:h-14 sm:px-6">
          <ShoppingBag className="size-5" />
          <span className="font-semibold">{t("order.open")}</span>
          {totals.count > 0 && <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs font-bold text-primary">{totals.count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-display text-xl">{t("order.open")}</SheetTitle>
        </SheetHeader>
        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <CheckCircle2 className="size-14 text-success" />
            <h3 className="text-xl font-semibold">{t("order.sent")} #{done.order_id}</h3>
            <p className="text-muted-foreground">{t("order.total")} {ks(done.total_retail)}. {t("order.confirmation")}</p>
            <Button onClick={() => { setDone(null); setOpen(false); }}>{t("order.back")}</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {lines.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("order.empty")}</p>}
              {lines.map((l) => (
                <div key={l.pk} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.product_id} · {ks(l.retail)} / {l.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-9" aria-label={`${t("catalog.removeOne")} ${l.name}`} onClick={() => setQty(l, l.qty - 1)}><Minus className="size-3" /></Button>
                    <Input aria-label={`${t("common.product")} ${l.name} quantity`} className="h-9 w-14 text-center" inputMode="numeric" value={l.qty} onChange={(e) => setQty(l, Number(e.target.value.replace(/\D/g, "")) || 0)} />
                    <Button size="icon" variant="outline" className="size-9" aria-label={`${t("catalog.addOne")} ${l.name}`} onClick={() => setQty(l, l.qty + 1)}><Plus className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-9 text-destructive" aria-label={`${t("catalog.removeOne")} ${l.name}`} onClick={() => setQty(l, 0)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 border-t bg-muted/40 p-5">
              <div className="grid gap-3">
                {isLocalDemo && <p role="status" className="rounded-lg bg-warning/15 p-3 text-xs">{t("order.demoMode")}</p>}
                <div className="grid gap-1.5">
                  <Label htmlFor="order-rep">{t("order.salesRep")}</Label>
                  <Select value={rep} onValueChange={setRep}>
                    <SelectTrigger id="order-rep"><SelectValue placeholder={t("order.chooseRep")} /></SelectTrigger>
                    <SelectContent>
                      {reps.map((r) => { const l = repLabel(r.code, r.name); return <SelectItem key={r.id} value={l}>{l}</SelectItem>; })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="outlet">{t("order.outlet")}</Label>
                  <Input id="outlet" autoComplete="organization" maxLength={200} value={outlet} onChange={(e) => setOutlet(e.target.value)} placeholder={t("order.outletPlaceholder")} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("order.total")}</p>
                  <p className="font-display text-2xl font-semibold">{ks(totals.retail)}</p>
                  <p className="text-xs text-muted-foreground">{t("order.wholesaleTotal")} {ks(totals.wholesale)}</p>
                </div>
                <Button size="lg" disabled={isLocalDemo || busy || !lines.length} onClick={send}>{busy ? t("order.sending") : t("order.submit")}</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
