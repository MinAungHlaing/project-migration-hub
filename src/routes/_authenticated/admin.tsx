import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Package, Image, Upload, ShoppingCart, Truck, Store, BarChart3, Boxes, ClipboardList, ShoppingBasket, Users, ExternalLink, LogOut, Menu, Wallet, ReceiptText, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { whoAmI } from "@/lib/admin.functions";
import { endLocalDemoSession, isLocalDemo } from "@/lib/local-demo";
import { LocalFeaturePreview } from "@/components/admin/local-feature-preview";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — GTM Catalog" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/images", label: "Media library", icon: Image },
  { to: "/admin/upload", label: "Catalog upload", icon: Upload },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { to: "/admin/outlets", label: "Outlets", icon: Store },
  { to: "/admin/sales-report", label: "Sales report", icon: BarChart3 },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/stock-counts", label: "Stock counts", icon: ClipboardList },
  { to: "/admin/purchases", label: "Purchasing", icon: ShoppingBasket },
  { to: "/admin/reps", label: "Sales team", icon: Users },
  { to: "/admin/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/admin/returns", label: "Returns", icon: RotateCcw },
  { to: "/admin/cashbox", label: "Cashbox", icon: Wallet },
] as const;

function AdminLayout() {
  const me = useServerFn(whoAmI);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const { data: liveData, isLoading: liveLoading, error } = useQuery({ queryKey: ["whoami"], queryFn: () => me(), retry: 1, enabled: !isLocalDemo });
  const data = isLocalDemo ? { isAdmin: true, email: "Local demo account" } : liveData;
  const isLoading = !isLocalDemo && liveLoading;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="max-w-sm text-muted-foreground">
          {error ? `We couldn't check your access: ${(error as Error).message}` : `You're signed in as ${data?.email ?? ""}, but this account isn't a catalog admin. Ask the owner to grant access.`}
        </p>
        <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</Button>
      </div>
    );
  }

  const nav = (
    <nav aria-label="Admin sections" className="grid gap-0.5">
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          activeProps={{ className: "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" }}>
          <n.icon className="size-4" />{n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside id="admin-navigation" className={`${open ? "fixed inset-0 z-50 block" : "hidden"} border-r bg-sidebar p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto`}>
        <div className="mb-5 flex items-center justify-between">
          <Link to="/admin" className="font-display text-lg font-bold text-primary">GTM Admin</Link>
          <Button size="sm" variant="ghost" className="lg:hidden" aria-label="Close admin menu" onClick={() => setOpen(false)}>Close</Button>
        </div>
        {nav}
        <div className="mt-6 grid gap-1 border-t pt-4 text-sm">
          {!isLocalDemo && <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent"><ExternalLink className="size-4" />Open catalog</Link>}
          <button onClick={async () => { if (isLocalDemo) endLocalDemoSession(); else await supabase.auth.signOut(); navigate({ to: "/auth" }); }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent"><LogOut className="size-4" />Log out</button>
          <p className="truncate px-3 pt-2 text-xs text-muted-foreground">{data.email}</p>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center gap-2 border-b bg-card px-4 py-3 lg:hidden">
          <Button size="icon" variant="ghost" aria-label="Open admin menu" aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="size-5" /></Button>
          <span className="font-display font-bold text-primary">GTM Admin</span>
        </div>
        <main className="mx-auto max-w-7xl p-4 md:p-8">
          {isLocalDemo ? <LocalFeaturePreview pathname={pathname} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
