import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, TrendingUp, PackagePlus, PackageX, PackageCheck, Repeat } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/catalog.functions";
import { timeAgo } from "@/lib/format";

const ICONS: Record<string, typeof Bell> = {
  price_changed: TrendingUp, product_added: PackagePlus, out_of_stock: PackageX, back_in_stock: PackageCheck, product_replaced: Repeat,
};
const TITLES: Record<string, string> = {
  price_changed: "Price updated", product_added: "Added", out_of_stock: "Out of stock", back_in_stock: "Back in stock", product_replaced: "Replaced",
};

export function ActivityBell() {
  const { data } = useQuery({ queryKey: ["activity"], queryFn: () => getActivity({ data: { limit: 30 } }), refetchInterval: 60_000 });
  const [seen, setSeen] = useState(0);
  useEffect(() => { setSeen(Number(localStorage.getItem("gtm-seen-activity") || 0)); }, []);
  const unread = (data?.latest_id ?? 0) > seen;
  return (
    <Popover onOpenChange={(o) => { if (o && data) { localStorage.setItem("gtm-seen-activity", String(data.latest_id)); setSeen(data.latest_id); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative size-11 rounded-xl" aria-label="Updates">
          <Bell className="size-5" />
          {unread && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-display font-semibold">Latest updates</div>
        <div className="max-h-96 overflow-y-auto">
          {(data?.events ?? []).map((e) => {
            const Icon = ICONS[e.event_type] ?? Bell;
            return (
              <div key={e.id} className="flex gap-3 border-b px-4 py-3 last:border-0">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{TITLES[e.event_type] ?? "Update"}: {e.product_name || e.product_id}</p>
                  {e.details && <p className="text-xs text-muted-foreground">{e.details}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(e.created_at)}</p>
                </div>
              </div>
            );
          })}
          {!data?.events?.length && <p className="p-6 text-center text-sm text-muted-foreground">No updates yet.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
