import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Cloud, CloudOff, LogOut, RefreshCw, ShoppingCart, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguagePicker } from "@/components/catalog/LanguagePicker";
import {
  clearRepSession,
  readCachedCatalog,
  readQueuedOrders,
  readRepSession,
  saveCachedCatalog,
  saveQueuedOrder,
  saveQueuedOrders,
  saveRepSession,
  type QueuedRepOrder,
  type RepCatalogSnapshot,
  type RepIdentity,
} from "@/lib/rep-offline";
import { ks } from "@/lib/format";
import { useCatalogLanguage } from "@/lib/catalog-language";
import { isLocalDemo, localDemoCatalog, localDemoRepAccounts } from "@/lib/local-demo";
import { addLocalRepOrder } from "@/lib/local-workspace";

export const Route = createFileRoute("/rep")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sales rep PWA — GTM Catalog" },
      { name: "description", content: "Offline-first sales catalog and order capture." },
      { name: "theme-color", content: "#176b52" },
    ],
    links: [{ rel: "manifest", href: "/rep.webmanifest" }],
  }),
  component: RepApp,
});

type LoginResponse = { access_token: string; rep: RepIdentity };
type SyncResult = { client_order_id: string; ok: boolean; order_id?: number; error?: string; already_synced?: boolean; price_mismatch?: boolean };
type SyncResponse = { results: SyncResult[] };
type ApiErrorPayload = { error?: string };

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", ["Bearer", token].join(" "));
  const response = await fetch(path, { ...options, headers });
  const body = await response.json() as T & ApiErrorPayload;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

function RepApp() {
  const { t, language } = useCatalogLanguage();
  const syncingRef = useRef(false);
  const translateRef = useRef(t);
  const [session, setSession] = useState<{ token: string; rep: RepIdentity } | null>(null);
  const [snapshot, setSnapshot] = useState<RepCatalogSnapshot | null>(null);
  const [orders, setOrders] = useState<QueuedRepOrder[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [outletId, setOutletId] = useState("");
  const [newOutlet, setNewOutlet] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<"order" | "queue">("order");

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const loadStoredData = useCallback(async () => {
    try {
      const [cachedCatalog, queuedOrders] = await Promise.all([readCachedCatalog(), readQueuedOrders()]);
      setSnapshot(cachedCatalog);
      setOrders(queuedOrders);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read offline data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCatalog = useCallback(async (token: string) => {
    if (isLocalDemo) {
      const fresh: RepCatalogSnapshot = {
        snapshot_id: `local-${new Date().toISOString().slice(0, 10)}`,
        products: localDemoCatalog.items.map((product) => ({
          id: product.id,
          product_id: product.product_id,
          product_name: product.product_name,
          upc: product.upc,
          unit: product.unit,
          retail: product.retail,
          wholesale: product.wholesale,
          category: product.category,
          status: product.status,
          description: product.description,
        })),
        outlets: [
          { id: 1, name: "Shwe Market", area: "Sanchaung" },
          { id: 2, name: "City Mart", area: "Downtown" },
          { id: 3, name: "Golden Star Store", area: "Kamayut" },
        ],
      };
      await saveCachedCatalog(fresh);
      setSnapshot(fresh);
      return fresh;
    }
    const fresh = await requestJson<RepCatalogSnapshot>("/api/mobile/catalog", { method: "GET" }, token);
    await saveCachedCatalog(fresh);
    setSnapshot(fresh);
    return fresh;
  }, []);

  const syncPending = useCallback(async (token: string, repId: number, translate: typeof t) => {
    if ((!isLocalDemo && !navigator.onLine) || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const allOrders = await readQueuedOrders();
      const pending = allOrders.filter((order) =>
        order.rep_id === repId && (order.state === "queued" || order.state === "syncing"),
      );
      if (!pending.length) return;

      if (isLocalDemo) {
        for (const order of pending) {
          const serverOrderId = addLocalRepOrder({
            rep_name: session?.rep.name ?? "Local representative",
            outlet_name: order.outlet_name,
            total_retail: order.total_retail,
            status: "New",
            created_at: order.collected_at,
          });
          await saveQueuedOrder({ ...order, state: "synced", server_order_id: serverOrderId });
        }
        const updated = await readQueuedOrders();
        setOrders(updated);
        setNotice(`${pending.length} ${translate("rep.ordersSyncedCount")}`);
        setError("");
        return;
      }

      await saveQueuedOrders(allOrders.map((order) =>
        order.rep_id === repId && (order.state === "queued" || order.state === "syncing")
          ? { ...order, state: "syncing" }
          : order,
      ));
      setOrders(await readQueuedOrders());

      for (let offset = 0; offset < pending.length; offset += 50) {
        const batch = pending.slice(offset, offset + 50);
        const response = await requestJson<SyncResponse>(
          "/api/mobile/sync",
          {
            method: "POST",
            body: JSON.stringify({
              orders: batch.map((order) => ({
                client_order_id: order.client_order_id,
                catalog_snapshot_id: order.catalog_snapshot_id,
                outlet_name: order.outlet_name,
                outlet_id: order.outlet_id,
                collected_at: order.collected_at,
                items: order.items,
              })),
            }),
          },
          token,
        );
        const results = new Map<string, SyncResult>();
        for (const result of response.results) results.set(result.client_order_id, result);
        for (const order of batch) {
          const result = results.get(order.client_order_id);
          if (!result) {
            await saveQueuedOrder({ ...order, state: "needs-attention", sync_error: "The server did not return a result for this order." });
          } else if (result.ok) {
            const { sync_error: _syncError, server_order_id: _serverOrderId, ...syncedOrder } = order;
            await saveQueuedOrder({
              ...syncedOrder,
              ...(result.order_id === undefined ? {} : { server_order_id: result.order_id }),
              state: "synced",
              price_mismatch: result.price_mismatch ?? false,
            });
          } else {
            await saveQueuedOrder({ ...order, state: "needs-attention", sync_error: result.error || "The server rejected this order." });
          }
        }
      }
      const updated = await readQueuedOrders();
      setOrders(updated);
      const syncedCount = updated.filter((order) => order.state === "synced").length - allOrders.filter((order) => order.state === "synced").length;
      if (syncedCount > 0) setNotice(`${syncedCount} ${translate("rep.ordersSyncedCount")}`);
      if (updated.some((order) => order.rep_id === repId && order.state === "needs-attention")) {
        setError(translate("rep.reviewOrders"));
      } else {
        setError("");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Order sync failed.";
      try {
        await saveQueuedOrders((await readQueuedOrders()).map((order) =>
          order.rep_id === repId && order.state === "syncing" ? { ...order, state: "queued" } : order,
        ));
        setOrders(await readQueuedOrders());
      } catch (recoveryCause) {
        const recoveryMessage = recoveryCause instanceof Error ? recoveryCause.message : "Could not restore the local queue.";
        setError(`${message} The local queue could not be recovered: ${recoveryMessage}`);
        return;
      }
      setError(message);
    } finally {
      syncingRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    const storedSession = readRepSession();
    setSession(storedSession);
    setOnline(navigator.onLine);
    void loadStoredData();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/rep-sw.js").catch((cause: unknown) => {
        setError(cause instanceof Error ? `Offline app setup failed: ${cause.message}` : "Offline app setup failed.");
      });
    }
  }, [loadStoredData]);

  useEffect(() => {
    if (!session || (!online && !isLocalDemo)) return;
    void refreshCatalog(session.token)
      .then(() => syncPending(session.token, session.rep.id, translateRef.current))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not refresh the catalog.");
      });
  }, [session, online, refreshCatalog, syncPending]);

  useEffect(() => {
    const updateConnection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) setNotice(t("rep.connectionRestored"));
    };
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [t]);

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (snapshot?.products ?? []).filter((product) =>
      (!query || `${product.product_id} ${product.product_name} ${product.category} ${product.upc}`.toLowerCase().includes(query)),
    );
  }, [snapshot, search]);

  const total = useMemo(() => (snapshot?.products ?? []).reduce(
    (sum, product) => sum + product.retail * (quantities[product.id] ?? 0),
    0,
  ), [snapshot, quantities]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isLocalDemo) {
        const account = localDemoRepAccounts.find((item) =>
          item.username === username.trim().toLowerCase() && item.password === password,
        );
        if (!account) throw new Error("Demo sign-in failed. Try aung / password or thiri / password.");
        const result: LoginResponse = {
          access_token: `local-rep-${account.rep.id}`,
          rep: { ...account.rep },
        };
        saveRepSession(result.access_token, result.rep);
        setSession({ token: result.access_token, rep: result.rep });
        setPassword("");
        const fresh = await refreshCatalog(result.access_token);
        setSnapshot(fresh);
        setNotice(t("rep.catalogSaved"));
        return;
      }
      const result = await requestJson<LoginResponse>("/api/mobile/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      saveRepSession(result.access_token, result.rep);
      setSession({ token: result.access_token, rep: result.rep });
      setPassword("");
      const fresh = await refreshCatalog(result.access_token);
      setSnapshot(fresh);
      setNotice(t("rep.catalogSaved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createOrder() {
    if (!session || !snapshot) {
      setError(t("rep.signInRequired"));
      return;
    }
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ product_pk: Number(productId), quantity }));
    if (!items.length) {
      setError(t("rep.addProductFirst"));
      return;
    }
    const outlet = snapshot.outlets.find((item) => String(item.id) === outletId);
    const outletName = outlet?.name ?? newOutlet.trim();
    if (!outletName) {
      setError(t("rep.chooseOutlet"));
      return;
    }
    const order: QueuedRepOrder = {
      client_order_id: crypto.randomUUID(),
      rep_id: session.rep.id,
      catalog_snapshot_id: snapshot.snapshot_id,
      outlet_name: outletName,
      outlet_id: outlet?.id ?? null,
      collected_at: new Date().toISOString(),
      items,
      total_retail: total,
      state: "queued",
    };
    setBusy(true);
    try {
      await saveQueuedOrder(order);
      setOrders(await readQueuedOrders());
      setQuantities({});
      setNewOutlet("");
      setNotice(online ? t("rep.savedSyncing") : t("rep.savedOffline"));
      setTab("queue");
      if (online || isLocalDemo) await syncPending(session.token, session.rep.id, t);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this order offline.");
    } finally {
      setBusy(false);
    }
  }

  async function manualRefresh() {
    if (!session || (!online && !isLocalDemo)) return;
    setBusy(true);
    setError("");
    try {
      await refreshCatalog(session.token);
      await syncPending(session.token, session.rep.id, t);
      setNotice(t("rep.catalogRefreshed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearRepSession();
    setSession(null);
    setQuantities({});
    setOutletId("");
    setNewOutlet("");
    setSearch("");
    setTab("order");
    setNotice(t("rep.signedOut"));
  }

  if (loading) {
    return <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6 text-muted-foreground">{t("rep.opening")}</main>;
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="mb-5 flex justify-end"><LanguagePicker /></div>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{t("rep.title")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("rep.signIn")}</h1>
          <p className="mt-2 text-muted-foreground">{t("rep.signInHint")}</p>
        </div>
        <form onSubmit={signIn} className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="grid gap-1.5">
            <Label htmlFor="rep-username">{t("rep.username")}</Label>
            <Input id="rep-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rep-password">{t("rep.password")}</Label>
            <Input id="rep-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button type="submit" disabled={busy || (!online && !isLocalDemo)}>{busy ? t("rep.signingIn") : t("rep.signInDownload")}</Button>
          {!online && <p className="text-sm text-destructive">{t("rep.connectToSignIn")}</p>}
        </form>
        <ConnectionBadge online={online} t={t} />
        {notice && <p role="status" className="mt-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </main>
    );
  }

  const repOrders = orders.filter((order) => order.rep_id === session.rep.id);
  const repQueuedCount = repOrders.filter((order) => order.state === "queued" || order.state === "syncing").length;
  const unattributedOrderCount = orders.filter((order) => !Number.isInteger(order.rep_id)).length;

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 pb-8">
      <header className="sticky top-0 z-20 -mx-4 mb-5 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("rep.title")}</p>
            <h1 className="truncate font-display text-lg font-bold">{session.rep.code} · {session.rep.name}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <LanguagePicker />
            <Button size="icon" variant="outline" aria-label={t("rep.refresh")} disabled={!online || busy} onClick={manualRefresh}><RefreshCw className="size-4" /></Button>
            <Button size="icon" variant="outline" aria-label={t("rep.signOut")} onClick={signOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <ConnectionBadge online={online} t={t} />
          <p className="text-xs text-muted-foreground">
            {snapshot ? `${t("rep.snapshot")} ${snapshot.snapshot_id.slice(0, 8)}` : t("rep.noCatalog")}
          </p>
        </div>
      </header>

      {notice && <p role="status" className="mb-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {unattributedOrderCount > 0 && <p role="alert" className="mb-3 rounded-lg bg-warning/15 p-3 text-sm">{unattributedOrderCount} {t("rep.oldOrdersMissingRep")}</p>}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button variant={tab === "order" ? "default" : "outline"} onClick={() => setTab("order")}><ShoppingCart className="mr-2 size-4" />{t("rep.newOrder")}</Button>
        <Button variant={tab === "queue" ? "default" : "outline"} onClick={() => setTab("queue")}><Cloud className="mr-2 size-4" />{t("rep.queue")} ({repQueuedCount})</Button>
      </div>

      {tab === "order" ? (
        <section className="space-y-4">
          <div className="grid gap-2 rounded-xl border bg-card p-4">
            <Label htmlFor="rep-outlet">{t("rep.outlet")}</Label>
            <select id="rep-outlet" value={outletId} onChange={(event) => { setOutletId(event.target.value); setNewOutlet(""); }} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">{t("rep.selectOutlet")}</option>
              {(snapshot?.outlets ?? []).map((outlet) => <option key={outlet.id} value={String(outlet.id)}>{outlet.name}{outlet.area ? ` · ${outlet.area}` : ""}</option>)}
            </select>
            {!outletId && <Input maxLength={200} value={newOutlet} onChange={(event) => setNewOutlet(event.target.value)} placeholder={t("rep.newOutlet")} />}
          </div>

          <Input type="search" aria-label={t("rep.searchProducts")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("rep.searchProducts")} />
          <div className="space-y-2">
            {products.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              const available = product.status === "In Stock";
              return (
                <article key={product.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">{product.product_id} · {product.category} · {ks(product.retail)} / {product.unit}</p>
                    {!available && <p className="text-xs font-medium text-destructive">{t("catalog.outOfStock")}</p>}
                  </div>
                  {available && (
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" aria-label={`${t("rep.removeOne")} ${product.product_name}`} disabled={quantity === 0} onClick={() => setQuantities({ ...quantities, [product.id]: Math.max(0, quantity - 1) })}>−</Button>
                      <span className="w-6 text-center text-sm tabular-nums">{quantity}</span>
                      <Button size="icon" variant="outline" aria-label={`${t("rep.addOne")} ${product.product_name}`} onClick={() => setQuantities({ ...quantities, [product.id]: Math.min(999, quantity + 1) })}>+</Button>
                    </div>
                  )}
                </article>
              );
            })}
            {!products.length && <p className="py-8 text-center text-sm text-muted-foreground">{snapshot ? t("rep.notFound") : t("rep.downloadCatalog")}</p>}
          </div>
          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 py-4 backdrop-blur">
            <div><p className="text-xs text-muted-foreground">{t("rep.retailTotal")} · {Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)} {t("rep.itemCount")}</p><p className="font-display text-xl font-bold">{ks(total)}</p></div>
            <Button disabled={busy || !snapshot || total <= 0} onClick={createOrder}>{busy ? t("rep.saving") : t("rep.saveOrder")}</Button>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div><p className="font-semibold">{t("rep.ordersOnDevice")}</p><p className="text-sm text-muted-foreground">{repQueuedCount} {t("rep.waitingToSync")}</p></div>
            <Button size="sm" disabled={!online || busy || repQueuedCount === 0} onClick={() => void syncPending(session.token, session.rep.id, t)}>{t("rep.syncNow")}</Button>
          </div>
          {repOrders.map((order) => (
            <article key={order.client_order_id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-medium">{order.outlet_name}</p><p className="text-xs text-muted-foreground">{new Date(order.collected_at).toLocaleString(language === "my" ? "my-MM" : "en-US")} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("rep.itemCount")}</p></div>
                <OrderState state={order.state} t={t} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm"><span>{ks(order.total_retail)}</span>{order.server_order_id && <span className="text-muted-foreground">{t("rep.serverOrder")} #{order.server_order_id}</span>}</div>
              {order.price_mismatch && <p className="mt-2 text-sm text-warning">{t("rep.priceMismatch")}</p>}
              {order.sync_error && <p className="mt-2 text-sm text-destructive">{order.sync_error}</p>}
            </article>
          ))}
          {!repOrders.length && <p className="py-10 text-center text-sm text-muted-foreground">{t("rep.noOrders")}</p>}
          {repOrders.some((order) => order.state === "needs-attention") && <p className="rounded-lg bg-warning/15 p-3 text-sm">{t("rep.queueWarning")}</p>}
        </section>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("rep.offlineNote")} {snapshot ? `${snapshot.products.length} ${t("rep.catalogProductsCached")}` : ""}
      </p>
    </main>
  );
}

function ConnectionBadge({ online, t }: { online: boolean; t: (key: string) => string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${online ? "bg-accent text-accent-foreground" : "bg-warning/15 text-foreground"}`}>
      {online ? <><Wifi className="size-3" />{t("rep.online")}</> : <><WifiOff className="size-3" />{t("rep.offline")}</>}
    </span>
  );
}

function OrderState({ state, t }: { state: QueuedRepOrder["state"]; t: (key: string) => string }) {
  if (state === "synced") return <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="size-4" />{t("rep.synced")}</span>;
  if (state === "syncing") return <span className="text-xs text-muted-foreground">{t("rep.syncing")}</span>;
  if (state === "needs-attention") return <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><CloudOff className="size-4" />{t("rep.needsAttention")}</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><CloudOff className="size-4" />{t("rep.queued")}</span>;
}
