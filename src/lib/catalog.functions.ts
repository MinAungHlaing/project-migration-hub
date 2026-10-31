import { createServerFn } from "@tanstack/react-start";
import { publicClient, adminClient } from "./server-clients";

const PUBLIC_COLS = "id, product_id, product_name, upc, unit, retail, wholesale, category, status, description, has_image, image_path, generation, updated_at";

export type PublicProduct = {
  id: number; product_id: string; product_name: string; upc: number; unit: string;
  retail: number; wholesale: number; category: string; status: string; description: string;
  has_image: boolean; image_path: string | null; generation: number; updated_at: string;
};

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [products, reps] = await Promise.all([
    db.from("products").select(PUBLIC_COLS).order("id").range(0, 4999),
    db.from("sales_reps").select("id, code, name").eq("active", true).order("code"),
  ]);
  if (products.error) throw new Error(products.error.message);
  const items = ((products.data ?? []) as unknown as PublicProduct[]).filter((p) => p.product_id || p.product_name);
  const categories = Array.from(new Set(items.map((p) => p.category))).sort();
  return { items, categories, reps: reps.data ?? [] };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const db = publicClient();
    const want = data.slug.replace(/\s+/g, "").toLowerCase();
    const { data: rows } = await db.from("products").select(PUBLIC_COLS).ilike("product_id", `%${want.replace(/^gtm-?/, "")}%`);
    const product = ((rows ?? []) as unknown as PublicProduct[]).find((p) => p.product_id.replace(/\s+/g, "").toLowerCase() === want) ?? null;
    const { data: reps } = await db.from("sales_reps").select("id, code, name").eq("active", true).order("code");
    let history: { changed_at: string; old_retail: number | null; new_retail: number | null; old_wholesale: number | null; new_wholesale: number | null }[] = [];
    if (product) {
      const h = await db.from("price_history").select("changed_at, old_retail, new_retail, old_wholesale, new_wholesale")
        .eq("product_id", product.product_id).eq("generation", product.generation).order("changed_at", { ascending: false }).limit(10);
      history = (h.data ?? []) as typeof history;
    }
    return { product, reps: reps ?? [], history };
  });

export const getActivity = createServerFn({ method: "GET" })
  .inputValidator((d: { limit?: number; beforeId?: number }) => d)
  .handler(async ({ data }) => {
    const db = publicClient();
    const limit = Math.max(1, Math.min(data.limit ?? 30, 100));
    let q = db.from("activity_log").select("id, event_type, product_id, product_name, details, created_at").order("id", { ascending: false }).limit(limit);
    if (data.beforeId) q = q.lt("id", data.beforeId);
    const [{ data: events }, { data: latest }] = await Promise.all([
      q, db.from("activity_log").select("id").order("id", { ascending: false }).limit(1),
    ]);
    return { latest_id: latest?.[0]?.id ?? 0, events: events ?? [], has_more: (events ?? []).length === limit };
  });

export const submitWebOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { rep_name: string; outlet_name: string; items: { product_pk: number; quantity: number }[]; idempotency_key?: string }) => {
    if (!d || typeof d.rep_name !== "string" || typeof d.outlet_name !== "string" || !Array.isArray(d.items)) throw new Error("Invalid order.");
    return d;
  })
  .handler(async ({ data }) => {
    const rep = data.rep_name.trim();
    const outlet = data.outlet_name.trim().slice(0, 200);
    if (!rep) throw new Error("Please select a sales rep.");
    if (!outlet) throw new Error("Outlet name is required.");
    if (!data.items.length || data.items.length > 500) throw new Error("Order is empty.");
    const db = await adminClient();
    // rep must exactly match an active, admin-managed rep (reps pick from a list)
    const { data: reps } = await db.from("sales_reps").select("code, name").eq("active", true);
    const labels = new Set((reps ?? []).map((r) => (r.code && r.name ? `${r.code.trim()} (${r.name.trim()})` : (r.code || r.name).trim())));
    if (!labels.has(rep)) throw new Error("Invalid sales rep selected.");
    const { data: res, error } = await db.rpc("create_web_order", {
      p_rep_name: rep, p_outlet_name: outlet, p_items: data.items, p_idempotency_key: (data.idempotency_key ?? "").trim().slice(0, 100) || null,
    } as never);
    if (error) throw new Error(error.message);
    if (!res) throw new Error("No valid items in this order.");
    return res as { order_id: number; total_retail: number; total_wholesale: number };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: { endpoint: string; p256dh?: string; auth?: string; remove?: boolean }) => {
    if (!d?.endpoint || typeof d.endpoint !== "string" || d.endpoint.length > 1000 || !d.endpoint.startsWith("https://")) throw new Error("Invalid subscription.");
    return d;
  })
  .handler(async ({ data }) => {
    const db = await adminClient();
    if (data.remove) {
      await db.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    } else {
      if (!data.p256dh || !data.auth) throw new Error("Invalid subscription.");
      await db.from("push_subscriptions").upsert({ endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth }, { onConflict: "endpoint" });
    }
    return { ok: true };
  });
