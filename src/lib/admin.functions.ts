import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./server-clients";
import { hashPassword } from "./crypto";

const admin = () => createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]);
const fail = (e: { message?: string } | null | undefined): never => { throw new Error(e?.message || "Something went wrong."); };
const nonNeg = (v: unknown, label: string) => {
  const n = Number(v);
  if (typeof v === "boolean" || v === "" || v == null || !isFinite(n) || n < 0) throw new Error(`${label} must be zero or greater.`);
  return n;
};

// ---------- session ----------
export const whoAmI = admin().handler(async ({ context }) => {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  const claims = context.claims as { email?: string };
  return { isAdmin: !!data, email: claims?.email ?? "" };
});

// ---------- dashboard ----------
export const getDashboard = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const [prods, today, recent, activity, pendingHandovers] = await Promise.all([
    db.from("products").select("status, category, has_image, product_id").range(0, 9999),
    db.from("orders").select("id, total_retail").gte("created_at", start.toISOString()),
    db.from("orders").select("id, rep_name, outlet_name, total_retail, status, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("activity_log").select("id, event_type, product_name, details, created_at").order("id", { ascending: false }).limit(10),
    db.from("delivery_handovers").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const p = (prods.data ?? []).filter((x) => x.product_id);
  return {
    stats: {
      products: p.length,
      categories: new Set(p.map((x) => x.category)).size,
      instock: p.filter((x) => x.status === "In Stock").length,
      outofstock: p.filter((x) => x.status === "Out Of Stock").length,
      missingImages: p.filter((x) => !x.has_image).length,
      ordersToday: today.data?.length ?? 0,
      retailToday: (today.data ?? []).reduce((s, o) => s + Number(o.total_retail), 0),
      pendingHandovers: pendingHandovers.count ?? 0,
    },
    recentOrders: recent.data ?? [],
    activity: activity.data ?? [],
  };
});

// ---------- products ----------
export const listProductsAdmin = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data, error } = await db.from("products").select("*").order("id").range(0, 9999);
  if (error) fail(error);
  return (data ?? []).filter((p) => p.product_id || p.product_name);
});

export const getProductAdmin = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: p } = await db.from("products").select("*").eq("id", data.id).maybeSingle();
  if (!p) return { product: null, history: [], stock: 0 };
  const [{ data: history }, { data: bal }] = await Promise.all([
    db.from("price_history").select("*").eq("product_id", p.product_id).eq("generation", p.generation).order("changed_at", { ascending: false }).limit(200),
    db.from("stock_balances").select("quantity").eq("product_pk", p.id).maybeSingle(),
  ]);
  return { product: p, history: history ?? [], stock: Number(bal?.quantity ?? 0) };
});

export const getProductFormMeta = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const [{ data: next }, { data: oos }, { data: cats }] = await Promise.all([
    db.rpc("peek_next_product_id"),
    db.from("products").select("id, product_id, product_name").eq("status", "Out Of Stock").neq("product_id", "").order("product_id"),
    db.from("products").select("category, supplier").range(0, 9999),
  ]);
  return {
    nextId: next as string,
    reusable: oos ?? [],
    categories: Array.from(new Set((cats ?? []).map((c) => c.category).filter(Boolean))).sort(),
    suppliers: Array.from(new Set((cats ?? []).map((c) => c.supplier).filter(Boolean))).sort(),
  };
});

type ProductInput = {
  id?: number; reuse_product_id?: string; product_id?: string; product_name: string; upc?: number; unit?: string;
  retail: number; wholesale: number; base_price?: number | null; b2c?: number | null; category?: string; status?: string;
  description?: string; supplier?: string;
};

function cleanProduct(d: ProductInput) {
  const name = (d.product_name ?? "").trim();
  if (!name) throw new Error("Product name is required.");
  const status = d.status === "Out Of Stock" ? "Out Of Stock" : "In Stock";
  const retail = nonNeg(d.retail, "Retail");
  const wholesale = nonNeg(d.wholesale, "Wholesale");
  const base = d.base_price == null || (d.base_price as unknown) === "" ? null : nonNeg(d.base_price, "Base price");
  const b2c = d.b2c == null || (d.b2c as unknown) === "" ? null : nonNeg(d.b2c, "B2C");
  if (status === "In Stock" && base != null) {
    if (retail < base) throw new Error("Retail is below Base Price.");
    if (wholesale < base) throw new Error("Wholesale is below Base Price.");
    if (b2c != null && b2c < base) throw new Error("B2C is below Base Price.");
  }
  return {
    product_name: name, upc: Math.trunc(Number(d.upc) || 0), unit: (d.unit ?? "").trim() || "-", retail, wholesale,
    base_price: base, b2c, category: (d.category ?? "").trim() || "General", status,
    description: (d.description ?? "").trim(), supplier: (d.supplier ?? "").trim(),
  };
}

export const saveProduct = admin().inputValidator((d: ProductInput) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const row = cleanProduct(data);
  if (data.id) {
    const pid = (data.product_id ?? "").trim();
    if (!pid) throw new Error("Product ID is required.");
    const { error } = await db.from("products").update({ ...row, product_id: pid }).eq("id", data.id);
    if (error) fail(error.code === "23505" ? { message: "That Product ID is already used by another product." } : error);
    return { id: data.id };
  }
  if (data.reuse_product_id) {
    const { data: id, error } = await db.rpc("reuse_product_id", { p_product_id: data.reuse_product_id, p_data: row } as never);
    if (error) fail(error);
    if (data.reuse_product_id) {
      await db.storage.from("product-images").remove([`${data.reuse_product_id.replace(/\s+/g, "").toUpperCase()}.webp`]);
    }
    return { id: id as number };
  }
  const { data: pid, error: e1 } = await db.rpc("reserve_next_product_id");
  if (e1) fail(e1);
  const { data: ins, error } = await db.from("products").insert({ ...row, product_id: pid as string }).select("id").single();
  if (error) fail(error);
  await db.from("activity_log").insert({ event_type: "product_added", product_id: pid as string, product_name: row.product_name, details: "New product added", source: "manual" });
  return { id: ins!.id };
});

export const deleteProduct = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: p } = await db.from("products").select("image_path").eq("id", data.id).maybeSingle();
  const { error } = await db.rpc("delete_product_guarded", { p_pk: data.id } as never);
  if (error) fail(error);
  if (p?.image_path) await db.storage.from("product-images").remove([p.image_path]);
  return { ok: true };
});

/** Image arrives already resized/compressed to WebP in the browser; saved under the canonical Product-ID name. */
export const uploadProductImage = admin().inputValidator((d: { id: number; base64: string }) => {
  if (!d?.base64 || d.base64.length > 7_000_000) throw new Error("Image must be 5 MB or smaller.");
  return d;
}).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: p } = await db.from("products").select("product_id").eq("id", data.id).maybeSingle();
  if (!p?.product_id) throw new Error("Product not found.");
  const name = `${p.product_id.replace(/\s+/g, "").toUpperCase()}.webp`;
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const { error } = await db.storage.from("product-images").upload(name, bytes, { contentType: "image/webp", upsert: true });
  if (error) fail(error);
  await db.from("products").update({ image_path: name, has_image: true }).eq("id", data.id);
  return { image_path: name };
});

export const removeProductImage = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: p } = await db.from("products").select("image_path").eq("id", data.id).maybeSingle();
  if (p?.image_path) await db.storage.from("product-images").remove([p.image_path]);
  await db.from("products").update({ image_path: null, has_image: false }).eq("id", data.id);
  return { ok: true };
});

export type ImportRow = {
  product_id: string; product_name: string; upc: number; unit: string; retail: number; wholesale: number;
  category: string; status: string; description?: string; supplier?: string; base_price?: number | null; b2c?: number | null;
};

export const importCatalog = admin().inputValidator((d: { rows: ImportRow[]; replace: boolean; hasDescription: boolean; hasSupplier: boolean }) => {
  if (!Array.isArray(d?.rows) || !d.rows.length || d.rows.length > 5000) throw new Error("The sheet has no product rows.");
  return d;
}).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: res, error } = await db.rpc("import_catalog", {
    p_rows: data.rows, p_replace: data.replace, p_has_description: data.hasDescription, p_has_supplier: data.hasSupplier,
  } as never);
  if (error) fail(error);
  return res as { count: number; warnings: string[] };
});

export const getPriceHistoryAll = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data } = await db.from("price_history").select("*").order("changed_at", { ascending: false }).limit(5000);
  return data ?? [];
});

// ---------- sales reps ----------
export const listReps = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const [{ data: reps }, { data: creds }] = await Promise.all([
    db.from("sales_reps").select("*").order("code"),
    db.from("rep_credentials").select("rep_id, password_hash, token_hash"),
  ]);
  const map = new Map((creds ?? []).map((c) => [c.rep_id, c]));
  return (reps ?? []).map((r) => ({
    ...r, hasPassword: !!map.get(r.id)?.password_hash, signedIn: !!map.get(r.id)?.token_hash,
  }));
});

export const saveRep = admin().inputValidator((d: { id?: number; code: string; name: string; active: boolean; mobile_username?: string; mobile_password?: string }) => d)
  .handler(async ({ data, context }) => {
    const { db } = await requireAdmin(context);
    const code = (data.code ?? "").trim(), name = (data.name ?? "").trim();
    if (!code || !name) throw new Error("Code and name are required.");
    const username = (data.mobile_username ?? "").trim().toLowerCase() || null;
    const password = data.mobile_password ?? "";
    if (username && !/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error("Mobile username must be 3–64 characters: letters, numbers, dot, underscore, or hyphen.");
    if (password && password.length < 8) throw new Error("Mobile passwords must be at least 8 characters.");
    let id = data.id;
    let prevUser: string | null = null;
    if (id) {
      const { data: ex } = await db.from("sales_reps").select("mobile_username").eq("id", id).maybeSingle();
      prevUser = ex?.mobile_username ?? null;
      const { error } = await db.from("sales_reps").update({ code, name, active: data.active, mobile_username: username }).eq("id", id);
      if (error) fail(error.code === "23505" ? { message: "That mobile username is already assigned to another rep." } : error);
    } else {
      if (!!username !== !!password) throw new Error("Provide both a mobile username and password, or leave both blank.");
      const { data: ins, error } = await db.from("sales_reps").insert({ code, name, active: data.active, mobile_username: username }).select("id").single();
      if (error) fail(error.code === "23505" ? { message: "That mobile username is already assigned to another rep." } : error);
      id = ins!.id;
    }
    const { data: cred } = await db.from("rep_credentials").select("*").eq("rep_id", id!).maybeSingle();
    let password_hash = cred?.password_hash ?? null;
    let token_hash = cred?.token_hash ?? null;
    if (!username) { password_hash = null; token_hash = null; }
    else if (password) { password_hash = await hashPassword(password); token_hash = null; }
    if (username && !password_hash) throw new Error("Set a mobile password for this rep.");
    if (username !== prevUser || !data.active) token_hash = null;
    await db.from("rep_credentials").upsert({ rep_id: id!, password_hash, token_hash, updated_at: new Date().toISOString() });
    return { id };
  });

export const deleteRep = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  for (const t of ["delivery_assignments", "delivery_attempts", "delivery_handovers"] as const) {
    const { count } = await db.from(t).select("id", { count: "exact", head: true }).eq("rep_id", data.id);
    if (count) throw new Error("A rep with delivery history cannot be deleted; deactivate the rep instead.");
  }
  const { error } = await db.from("sales_reps").delete().eq("id", data.id);
  if (error) fail(error);
  return { ok: true };
});

// ---------- orders ----------
export const listOrders = admin().inputValidator((d: { rep?: string; date?: string; status?: string }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  let q = db.from("orders").select("id, rep_name, outlet_name, outlet_id, status, total_retail, total_wholesale, created_at, price_mismatch, rep_id, client_order_id, delivery_rep_id").order("created_at", { ascending: false }).limit(1000);
  if (data.rep) q = q.eq("rep_name", data.rep);
  if (data.status) q = q.eq("status", data.status);
  if (data.date) q = q.gte("created_at", `${data.date}T00:00:00Z`).lte("created_at", `${data.date}T23:59:59.999Z`);
  const [{ data: orders }, { data: reps }] = await Promise.all([q, db.from("orders").select("rep_name").limit(5000)]);
  return { orders: orders ?? [], repNames: Array.from(new Set((reps ?? []).map((r) => r.rep_name))).sort() };
});

export const getOrder = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: order } = await db.from("orders").select("*, outlets(id, name, area)").eq("id", data.id).maybeSingle();
  if (!order) return null;
  const [{ data: items }, { data: attempts }, { data: delivery }] = await Promise.all([
    db.from("order_items").select("*, delivery_attempt_items(quantity)").eq("order_id", data.id).order("id"),
    db.from("delivery_attempts").select("*, sales_reps(code, name)").eq("order_id", data.id).order("created_at"),
    order.delivery_rep_id ? db.from("sales_reps").select("code, name").eq("id", order.delivery_rep_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { order, items: items ?? [], attempts: attempts ?? [], deliveryRep: delivery };
});

export const setOrderStatus = admin().inputValidator((d: { id: number; status: string }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  if (!["New", "Fulfilled", "Cancelled"].includes(data.status)) throw new Error("Choose a valid order status.");
  if (data.status === "Fulfilled") {
    const { count } = await db.from("delivery_attempts").select("id", { count: "exact", head: true }).eq("order_id", data.id);
    if (count) {
      const { data: items } = await db.from("order_items").select("quantity, delivery_attempt_items(quantity)").eq("order_id", data.id);
      const open = (items ?? []).some((i) => ((i as { delivery_attempt_items: { quantity: number }[] }).delivery_attempt_items ?? []).reduce((s, d) => s + Number(d.quantity), 0) < Number(i.quantity) - 1e-9);
      if (open) throw new Error("This order still has undelivered quantities; record or cancel the remaining delivery.");
    }
  }
  const { error } = await db.from("orders").update({ status: data.status }).eq("id", data.id);
  if (error) fail(error);
  if (data.status !== "New") await db.from("delivery_assignments").update({ active: false }).eq("order_id", data.id).eq("active", true);
  return { ok: true };
});

export const deleteOrder = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { count } = await db.from("delivery_attempts").select("id", { count: "exact", head: true }).eq("order_id", data.id);
  if (count) throw new Error("An order with a delivery record cannot be deleted.");
  await db.from("outlet_visits").delete().eq("order_id", data.id);
  const { error } = await db.from("orders").delete().eq("id", data.id);
  if (error) fail(error);
  return { ok: true };
});

// ---------- deliveries ----------
export const getDeliveryBoard = admin().inputValidator((d: { date?: string }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  let hq = db.from("delivery_handovers").select("*, sales_reps(code, name), delivery_handover_items(amount)").order("created_at", { ascending: false }).limit(200);
  if (data.date) hq = hq.eq("handover_date", data.date);
  const [{ data: orders }, { data: reps }, { data: creds }, { data: handovers }] = await Promise.all([
    db.from("orders").select("id, rep_name, outlet_name, total_retail, created_at, delivery_rep_id, outlets(area)").eq("status", "New").order("created_at"),
    db.from("sales_reps").select("id, code, name, mobile_username").eq("active", true).order("name"),
    db.from("rep_credentials").select("rep_id, password_hash"),
    hq,
  ]);
  const ok = new Set((creds ?? []).filter((c) => c.password_hash).map((c) => c.rep_id));
  return {
    orders: orders ?? [],
    reps: (reps ?? []).filter((r) => r.mobile_username && ok.has(r.id)),
    allReps: reps ?? [],
    handovers: (handovers ?? []).map((h) => ({ ...h, expected_cash: ((h as { delivery_handover_items: { amount: number }[] }).delivery_handover_items ?? []).reduce((s, i) => s + Number(i.amount), 0) })),
  };
});

export const assignDelivery = admin().inputValidator((d: { orderId: number; repId: number }) => d).handler(async ({ data, context }) => {
  const { db, actor } = await requireAdmin(context);
  const { error } = await db.rpc("assign_delivery", { p_order_id: data.orderId, p_rep_id: data.repId, p_actor: actor } as never);
  if (error) fail(error);
  return { ok: true };
});

export const verifyHandover = admin().inputValidator((d: { id: number; received: number }) => d).handler(async ({ data, context }) => {
  const { db, actor } = await requireAdmin(context);
  const received = nonNeg(data.received, "Received cash");
  const { data: h } = await db.from("delivery_handovers").select("status").eq("id", data.id).maybeSingle();
  if (!h) throw new Error("Handover not found.");
  if (h.status !== "pending") throw new Error("This handover has already been verified.");
  const { error } = await db.from("delivery_handovers").update({ received_cash: received, status: "verified", verified_by: actor, verified_at: new Date().toISOString() }).eq("id", data.id).eq("status", "pending");
  if (error) fail(error);
  return { ok: true };
});

// ---------- outlets ----------
export const listOutlets = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const [{ data: outlets }, { data: orders }, { data: visits }] = await Promise.all([
    db.from("outlets").select("*, outlet_aliases(id, alias)").order("name"),
    db.from("orders").select("outlet_id, total_retail, created_at, status").not("outlet_id", "is", null).limit(10000),
    db.from("outlet_visits").select("outlet_id, visited_at").limit(10000),
  ]);
  return (outlets ?? []).map((o) => {
    const os = (orders ?? []).filter((x) => x.outlet_id === o.id);
    const vs = (visits ?? []).filter((x) => x.outlet_id === o.id);
    return {
      ...o, order_count: os.length,
      sales: os.filter((x) => x.status !== "Cancelled").reduce((s, x) => s + Number(x.total_retail), 0),
      visit_count: vs.length,
      last_visit: vs.map((v) => v.visited_at).sort().at(-1) ?? null,
    };
  });
});

export const getOutlet = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: outlet } = await db.from("outlets").select("*, outlet_aliases(id, alias)").eq("id", data.id).maybeSingle();
  if (!outlet) return null;
  const [{ data: orders }, { data: visits }] = await Promise.all([
    db.from("orders").select("id, rep_name, status, total_retail, created_at").eq("outlet_id", data.id).order("created_at", { ascending: false }).limit(200),
    db.from("outlet_visits").select("*").eq("outlet_id", data.id).order("visited_at", { ascending: false }).limit(200),
  ]);
  return { outlet, orders: orders ?? [], visits: visits ?? [] };
});

type OutletInput = { id?: number; name: string; area?: string; note?: string; shop_type?: string; credit_limit?: number | null; lat?: number | null; lng?: number | null };
export const saveOutlet = admin().inputValidator((d: OutletInput) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const name = (data.name ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 200) throw new Error("Outlet name is required and must be 200 characters or fewer.");
  const row = {
    name, area: (data.area ?? "").trim(), note: (data.note ?? "").trim(), shop_type: (data.shop_type ?? "").trim() || null,
    credit_limit: data.credit_limit == null || (data.credit_limit as unknown) === "" ? null : nonNeg(data.credit_limit, "Credit limit"),
    lat: data.lat == null || (data.lat as unknown) === "" ? null : Number(data.lat),
    lng: data.lng == null || (data.lng as unknown) === "" ? null : Number(data.lng),
    updated_at: new Date().toISOString(),
  };
  if (data.id) {
    const { error } = await db.from("outlets").update(row).eq("id", data.id);
    if (error) fail(error);
    return { id: data.id };
  }
  const { data: ins, error } = await db.from("outlets").insert(row).select("id").single();
  if (error) fail(error);
  return { id: ins!.id };
});

export const addOutletAlias = admin().inputValidator((d: { outletId: number; alias: string }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const alias = (data.alias ?? "").replace(/\s+/g, " ").trim();
  if (!alias || alias.length > 200) throw new Error("Alias is required.");
  const { error } = await db.from("outlet_aliases").insert({ outlet_id: data.outletId, alias });
  if (error) fail(error);
  return { ok: true };
});

export const deleteOutletAlias = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  await db.from("outlet_aliases").delete().eq("id", data.id);
  return { ok: true };
});

// ---------- sales report ----------
export const getSalesReport = admin().inputValidator((d: { start: string; end: string; rep?: string }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  let q = db.from("orders").select("id, rep_name, status, outlet_id, outlet_name, total_retail, created_at, order_items(product_id, product_name, quantity, line_retail)")
    .gte("created_at", `${data.start}T00:00:00Z`).lte("created_at", `${data.end}T23:59:59.999Z`).limit(10000);
  if (data.rep) q = q.eq("rep_name", data.rep);
  const [{ data: orders }, { data: allReps }] = await Promise.all([q, db.from("orders").select("rep_name").limit(10000)]);
  type O = { id: number; rep_name: string; status: string; outlet_id: number | null; outlet_name: string; total_retail: number; created_at: string; order_items: { product_id: string; product_name: string; quantity: number; line_retail: number }[] };
  const os = (orders ?? []) as unknown as O[];
  const agg = (list: O[]) => ({
    order_count: list.length,
    outlet_count: new Set(list.map((o) => (o.outlet_id ? `o:${o.outlet_id}` : `n:${(o.outlet_name ?? "").trim().toLowerCase()}`))).size,
    submitted_sales: list.reduce((s, o) => s + Number(o.total_retail), 0),
    fulfilled_sales: list.filter((o) => o.status === "Fulfilled").reduce((s, o) => s + Number(o.total_retail), 0),
    fulfilled_count: list.filter((o) => o.status === "Fulfilled").length,
    pending_count: list.filter((o) => o.status === "New").length,
    cancelled_count: list.filter((o) => o.status === "Cancelled").length,
  });
  const byRep = new Map<string, O[]>();
  os.forEach((o) => byRep.set(o.rep_name, [...(byRep.get(o.rep_name) ?? []), o]));
  const reps = [...byRep.entries()].map(([rep_name, l]) => ({ rep_name, ...agg(l) })).sort((a, b) => b.submitted_sales - a.submitted_sales);
  const prod = new Map<string, { product_id: string; product_name: string; quantity: number; sales: number; orders: Set<number> }>();
  os.filter((o) => o.status !== "Cancelled").forEach((o) => o.order_items.forEach((i) => {
    const k = `${i.product_id}|${i.product_name}`;
    const e = prod.get(k) ?? { product_id: i.product_id, product_name: i.product_name, quantity: 0, sales: 0, orders: new Set<number>() };
    e.quantity += Number(i.quantity); e.sales += Number(i.line_retail); e.orders.add(o.id); prod.set(k, e);
  }));
  const products = [...prod.values()].map(({ orders: s, ...p }) => ({ ...p, order_count: s.size })).sort((a, b) => b.sales - a.sales).slice(0, 100);
  const byDay = new Map<string, O[]>();
  os.forEach((o) => { const d = o.created_at.slice(0, 10); byDay.set(d, [...(byDay.get(d) ?? []), o]); });
  const daily = [...byDay.entries()].sort().map(([day, l]) => ({ day, order_count: l.length, submitted_sales: agg(l).submitted_sales, fulfilled_sales: agg(l).fulfilled_sales }));
  return { totals: agg(os), reps, products, daily, repNames: Array.from(new Set((allReps ?? []).map((r) => r.rep_name))).sort() };
});

// ---------- inventory ----------
export const getInventory = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const [{ data: products }, { data: balances }, { data: movements }] = await Promise.all([
    db.from("products").select("id, product_id, product_name, unit, category, supplier, status").neq("product_id", "").order("product_name").range(0, 9999),
    db.from("stock_balances").select("*").range(0, 9999),
    db.from("stock_movements").select("*").order("id", { ascending: false }).limit(50),
  ]);
  const bal = new Map((balances ?? []).map((b) => [b.product_pk, b]));
  return {
    products: (products ?? []).map((p) => ({ ...p, quantity: Number(bal.get(p.id)?.quantity ?? 0), updated_at: bal.get(p.id)?.updated_at ?? null })),
    movements: movements ?? [],
  };
});

export const recordMovement = admin().inputValidator((d: { productPk: number; quantity: number; type: "receipt" | "issue"; reference?: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { db, actor } = await requireAdmin(context);
    const q = Number(data.quantity);
    if (!isFinite(q) || q <= 0) throw new Error("Quantity must be greater than zero.");
    if (data.type !== "receipt" && data.type !== "issue") throw new Error("Choose a valid stock movement type.");
    const reference = (data.reference ?? "").trim(), note = (data.note ?? "").trim();
    if (reference.length > 120 || note.length > 500) throw new Error("Stock movement details are too long.");
    const { error } = await db.rpc("apply_stock_movement", { p_product_pk: data.productPk, p_delta: data.type === "receipt" ? q : -q, p_type: data.type, p_reference: reference, p_note: note, p_actor: actor } as never);
    if (error) fail(error);
    return { ok: true };
  });

// ---------- stock counts ----------
export const listStockCounts = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data } = await db.from("stock_counts").select("*, stock_count_lines(counted_quantity)").order("id", { ascending: false });
  return (data ?? []).map((c) => {
    const lines = (c as { stock_count_lines: { counted_quantity: number | null }[] }).stock_count_lines ?? [];
    return { ...c, stock_count_lines: undefined, line_count: lines.length, counted_count: lines.filter((l) => l.counted_quantity != null).length };
  });
});

export const createStockCount = admin().handler(async ({ context }) => {
  const { db, actor } = await requireAdmin(context);
  const { data, error } = await db.rpc("create_stock_count", { p_actor: actor, p_date: new Date().toISOString().slice(0, 10) } as never);
  if (error) fail(error);
  return { id: data as number };
});

export const getStockCount = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: count } = await db.from("stock_counts").select("*").eq("id", data.id).maybeSingle();
  if (!count) return null;
  const [{ data: lines }, { data: bal }] = await Promise.all([
    db.from("stock_count_lines").select("*").eq("count_id", data.id).order("product_id").range(0, 9999),
    db.from("stock_balances").select("product_pk, quantity").range(0, 9999),
  ]);
  const m = new Map((bal ?? []).map((b) => [b.product_pk, Number(b.quantity)]));
  return { count, lines: (lines ?? []).map((l) => ({ ...l, current_quantity: m.get(l.product_pk) ?? 0 })) };
});

export const saveStockCount = admin().inputValidator((d: { id: number; counts: Record<string, string | number | null> }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: c } = await db.from("stock_counts").select("status").eq("id", data.id).maybeSingle();
  if (!c) throw new Error("Stock count not found.");
  if (c.status !== "draft") throw new Error("Approved stock counts cannot be changed.");
  const { data: lines } = await db.from("stock_count_lines").select("id").eq("count_id", data.id).range(0, 9999);
  const valid = new Set((lines ?? []).map((l) => String(l.id)));
  const rows = Object.entries(data.counts).filter(([k]) => valid.has(k)).map(([k, v]) => {
    const q = v == null || String(v).trim() === "" ? null : nonNeg(v, "Counted quantity");
    return { id: Number(k), counted_quantity: q };
  });
  for (const r of rows) await db.from("stock_count_lines").update({ counted_quantity: r.counted_quantity }).eq("id", r.id).eq("count_id", data.id);
  return { ok: true };
});

export const approveStockCount = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db, actor } = await requireAdmin(context);
  const { error } = await db.rpc("approve_stock_count", { p_count_id: data.id, p_actor: actor } as never);
  if (error) fail(error);
  return { ok: true };
});

export const deleteStockCount = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: c } = await db.from("stock_counts").select("status").eq("id", data.id).maybeSingle();
  if (!c) throw new Error("Stock count not found.");
  if (c.status !== "draft") throw new Error("Approved stock counts cannot be deleted.");
  await db.from("stock_counts").delete().eq("id", data.id);
  return { ok: true };
});

// ---------- purchasing ----------
export const listPurchaseOrders = admin().handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data } = await db.from("purchase_orders").select("*, purchase_order_items(ordered_quantity, received_quantity, unit_cost)").order("id", { ascending: false });
  return (data ?? []).map((p) => {
    const items = (p as { purchase_order_items: { ordered_quantity: number; received_quantity: number; unit_cost: number }[] }).purchase_order_items ?? [];
    return {
      ...p, purchase_order_items: undefined, line_count: items.length,
      total_cost: items.reduce((s, i) => s + Number(i.ordered_quantity) * Number(i.unit_cost), 0),
      ordered_quantity: items.reduce((s, i) => s + Number(i.ordered_quantity), 0),
      received_quantity: items.reduce((s, i) => s + Number(i.received_quantity), 0),
    };
  });
});

export const createPurchaseOrder = admin().inputValidator((d: { supplier: string; orderDate: string; invoice?: string; note?: string; items: { product_pk: number; quantity: number; unit_cost: number }[] }) => d)
  .handler(async ({ data, context }) => {
    const { db, actor } = await requireAdmin(context);
    const supplier = (data.supplier ?? "").trim();
    if (!supplier || supplier.length > 200) throw new Error("Supplier is required and must be 200 characters or fewer.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.orderDate ?? "")) throw new Error("Choose a valid purchase date.");
    if (!Array.isArray(data.items) || !data.items.length) throw new Error("Add at least one product to the purchase order.");
    const seen = new Set<number>();
    const items = data.items.map((i) => {
      if (seen.has(i.product_pk)) throw new Error("Each product may appear only once on a purchase order.");
      seen.add(i.product_pk);
      const q = Number(i.quantity);
      if (!isFinite(q) || q <= 0) throw new Error("Ordered quantity must be greater than zero.");
      return { product_pk: i.product_pk, quantity: q, unit_cost: nonNeg(i.unit_cost ?? 0, "Unit cost") };
    });
    const { data: id, error } = await db.rpc("create_purchase_order", {
      p_supplier: supplier, p_items: items, p_date: data.orderDate, p_invoice: (data.invoice ?? "").trim(), p_note: (data.note ?? "").trim(), p_actor: actor,
    } as never);
    if (error) fail(error);
    return { id: id as number };
  });

export const getPurchaseOrder = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: order } = await db.from("purchase_orders").select("*").eq("id", data.id).maybeSingle();
  if (!order) return null;
  const { data: items } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", data.id).order("product_id");
  return { order, items: items ?? [] };
});

export const receivePurchaseOrder = admin().inputValidator((d: { id: number; quantities: Record<string, string | number> }) => d).handler(async ({ data, context }) => {
  const { db, actor } = await requireAdmin(context);
  const { error } = await db.rpc("receive_purchase_order", { p_po_id: data.id, p_quantities: data.quantities, p_actor: actor } as never);
  if (error) fail(error);
  return { ok: true };
});

export const cancelPurchaseOrder = admin().inputValidator((d: { id: number }) => d).handler(async ({ data, context }) => {
  const { db } = await requireAdmin(context);
  const { data: po } = await db.from("purchase_orders").select("status").eq("id", data.id).maybeSingle();
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== "open") throw new Error("Only purchase orders with no received stock can be cancelled.");
  await db.from("purchase_orders").update({ status: "cancelled" }).eq("id", data.id);
  return { ok: true };
});
