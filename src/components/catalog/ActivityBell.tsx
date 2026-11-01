import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, TrendingUp, PackagePlus, PackageX, PackageCheck, Repeat } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/catalog.functions";
import { timeAgo } from "@/lib/format";
import { useCatalogLanguage } from "@/lib/catalog-language";

const ICONS: Record<string, typeof Bell> = {
  price_changed: TrendingUp, product_added: PackagePlus, out_of_stock: PackageX, back_in_stock: PackageCheck, product_replaced: Repeat,
};
export function ActivityBell() {
  const { data, isError } = useQuery({ queryKey: ["activity"], queryFn: () => getActivity({ data: { limit: 30 } }), refetchInterval: 60_000 });
  const { t, language } = useCatalogLanguage();
  const [seen, setSeen] = useState(0);
  useEffect(() => { setSeen(Number(localStorage.getItem("gtm-seen-activity") || 0)); }, []);
  const unread = (data?.latest_id ?? 0) > seen;
  return (
    <Popover onOpenChange={(o) => { if (o && data) { localStorage.setItem("gtm-seen-activity", String(data.latest_id)); setSeen(data.latest_id); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative size-11 rounded-xl" aria-label={t("catalog.updates")}>
          <Bell className="size-5" />
          {unread && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b px-4 py-3 font-display font-semibold">{t("catalog.latestUpdates")}</div>
        <div className="max-h-96 overflow-y-auto">
          {(data?.events ?? []).map((e) => {
            const Icon = ICONS[e.event_type] ?? Bell;
            const titleKey = e.event_type === "price_changed" ? "catalog.priceUpdated"
              : e.event_type === "product_added" ? "catalog.added"
                : e.event_type === "out_of_stock" ? "catalog.outOfStock"
                  : e.event_type === "back_in_stock" ? "catalog.inStock"
                    : e.event_type === "product_replaced" ? "catalog.replaced" : "catalog.update";
            return (
              <div key={e.id} className="flex gap-3 border-b px-4 py-3 last:border-0">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(titleKey)}: {e.product_name || e.product_id}</p>
                  {e.details && <p className="text-xs text-muted-foreground">{e.details}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(e.created_at, language)}</p>
                </div>
              </div>
            );
          })}
          {isError ? <p className="p-6 text-center text-sm text-destructive">{t("catalog.updatesUnavailable")}</p>
            : !data?.events?.length && <p className="p-6 text-center text-sm text-muted-foreground">{t("catalog.noUpdates")}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
