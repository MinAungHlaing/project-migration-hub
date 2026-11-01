import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Lock, ShoppingBag } from "lucide-react";
import { useCatalogLanguage } from "@/lib/catalog-language";
import { LanguagePicker } from "@/components/catalog/LanguagePicker";

const links = [
  { to: "/", key: "nav.catalog", icon: ShoppingBag },
  { to: "/gallery", key: "nav.gallery", icon: LayoutGrid },
  { to: "/rep", key: "nav.rep", icon: ShoppingBag },
  { to: "/admin", key: "nav.admin", icon: Lock },
] as const;

export function StorefrontNavigation({ variant = "light" }: { variant?: "light" | "hero" }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useCatalogLanguage();
  const hero = variant === "hero";

  return (
    <header className={hero ? "hero-panel border-b border-primary-foreground/15" : "border-b bg-card"}>
      <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link to="/" className="shrink-0 font-display text-lg font-bold" aria-label="GTM catalog home">GTM</Link>
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          {links.map(({ to, key, icon: Icon }) => {
            const active = to === "/"
              ? pathname === "/" || pathname.startsWith("/product/")
              : pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  hero
                    ? active ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                    : active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{t(key)}</span>
              </Link>
            );
          })}
          <LanguagePicker variant={hero ? "hero" : "light"} />
        </div>
      </nav>
    </header>
  );
}
