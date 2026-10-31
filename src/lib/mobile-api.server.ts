// Server-only logic for the Android field app API (/api/mobile/*). Contract preserved from the original Flask app.
import { adminClient } from "./server-clients";
import { randomToken, sha256Hex, verifyPassword } from "./crypto";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type Rep = { id: number; code: string; name: string; active: boolean };

export function repLabel(r: { code: string; name: string }) {
  const c = (r.code ?? "").trim(), n = (r.name ?? "").trim();
  return c && n ? `${c} (${n})` : c || n;
}

export async function getMobileRep(request: Request): Promise<Rep | null> {
  const auth = request.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = await sha256Hex(m[1].trim());
  const db = await adminClient();
  const { data: cred } = await db.from("rep_credentials").select("rep_id").eq("token_hash", hash).maybeSingle();
  if (!cred) return null;
  const { data: rep } = await db.from("sales_reps").select("id, code, name, active").eq("id", cred.rep_id).maybeSingle();
  if (!rep || !rep.active) return null;
  return rep as Rep;
}

export async function login(body: Record<string, unknown>) {
  const u = body.username, p = body.password;
  if (typeof u !== "string" || typeof p !== "string" || !u.trim() || !p) return json({ error: "Username and password are required." }, 400);
  const db = await adminClient();
  const { data: rep } = await db.from("sales_reps").select("id, code, name, active").ilike("mobile_username", u.trim().toLowerCase()).maybeSingle();
  const { data: cred } = rep ? await db.from("rep_credentials").select("password_hash").eq("rep_id", rep.id).maybeSingle() : { data: null };
  if (!rep || !rep.active || !cred?.password_hash || !(await verifyPassword(p, cred.password_hash))) {
    return json({ error: "Invalid username or password." }, 401);
  }
  const token = randomToken();
  await db.from("rep_credentials").update({ token_hash: await sha256Hex(token), updated_at: new Date().toISOString() }).eq("rep_id", rep.id);
  return json({ access_token: token, rep: { id: rep.id, code: rep.code, name: rep.name } });
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export async function catalogSnapshot() {
  const db = await adminClient();
  const { data: rows } = await db.from("products")
    .select("id, product_id, product_name, upc, unit, retail, wholesale, category, status, description, generation").order("id").range(0, 9999);
  const products = (rows ?? []).map((r) => ({ ...r, retail: Number(r.retail), wholesale: Number(r.wholesale) }));
  const payload = stableStringify(products);
  const snapshot_id = await sha256Hex(payload);
  await db.from("catalog_snapshots").upsert({ snapshot_id, payload_json: products }, { onConflict: "snapshot_id", ignoreDuplicates: true });
  const { data: outlets } = await db.from("outlets").select("id, name, area").order("name");
  return {
    snapshot_id,
    products: products.map(({ generation: _g, ...p }) => p),
    outlets: outlets ?? [],
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isoWithTz(v: unknown): string | null {
  if (typeof v !== "string" || !/(Z|[+-]\d{2}:?\d{2})$/.test(v)) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function validLocation(v: unknown): Record<string, number> | null | "invalid" {
  if (v == null) return null;
  if (typeof v !== "object") return "invalid";
  const o = v as Record<string, unknown>;
  const lat = o.latitude, lng = o.longitude, acc = o.accuracy;
  if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return "invalid";
  const out: Record<string, number> = { latitude: lat, longitude: lng };
  if (acc != null) {
    if (typeof acc !== "number" || !isFinite(acc) || acc < 0) return "invalid";
    out.accuracy = acc;
  }
  return out;
}

function optId(v: unknown): number | null | "invalid" {
  if (v == null) return null;
  if (typeof v === "boolean") return "invalid";
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : "invalid";
}

export async function syncOrders(rep: Rep, body: Record<string, unknown>) {
  const orders = body.orders;
  if (!Array.isArray(orders) || !orders.length || orders.length > 50) return json({ error: "Provide between 1 and 50 orders." }, 400);
  const db = await adminClient();
  const results = [];
  for (const o of orders as Record<string, unknown>[]) {
    if (!o || typeof o !== "object") { results.push({ ok: false, error: "Invalid order payload." }); continue; }
    const cid = o.client_order_id;
    const fail = (error: string) => results.push({ client_order_id: cid, ok: false, error });
    if (typeof cid !== "string" || !UUID_RE.test(cid)) { fail("Order ID must be a UUID."); continue; }
    const snap = o.catalog_snapshot_id;
    if (typeof snap !== "string" || !/^[a-f0-9]{64}$/.test(snap)) { fail("Invalid catalog snapshot."); continue; }
    const outletName = typeof o.outlet_name === "string" ? o.outlet_name.trim() : "";
    if (!outletName || outletName.length > 200) { fail("Outlet name is required and must be 200 characters or fewer."); continue; }
    const outletId = optId(o.outlet_id);
    if (outletId === "invalid") { fail("Invalid outlet selection."); continue; }
    const collected = isoWithTz(o.collected_at);
    if (!collected) { fail("Order collection time must be an ISO 8601 timestamp with timezone."); continue; }
    const loc = validLocation(o.visit_location);
    if (loc === "invalid") { fail("Invalid visit location."); continue; }
    const { data, error } = await db.rpc("create_mobile_order", {
      p_rep_id: rep.id, p_rep_name: repLabel(rep), p_client_order_id: cid, p_snapshot_id: snap, p_outlet_name: outletName,
      p_collected_at: collected, p_items: o.items ?? null, p_outlet_id: outletId, p_location: loc,
    } as never);
    if (error) { fail(error.message); continue; }
    results.push({ client_order_id: cid, ok: true, ...(data as object) });
  }
  return json({ results });
}

export async function syncVisits(rep: Rep, body: Record<string, unknown>) {
  const visits = body.visits;
  if (!Array.isArray(visits) || !visits.length || visits.length > 50) return json({ error: "Provide between 1 and 50 visits." }, 400);
  const db = await adminClient();
  const results = [];
  for (const v of visits as Record<string, unknown>[]) {
    if (!v || typeof v !== "object") { results.push({ ok: false, error: "Invalid visit payload." }); continue; }
    const cid = v.client_visit_id;
    const fail = (error: string) => results.push({ client_visit_id: cid, ok: false, error });
    if (typeof cid !== "string" || !UUID_RE.test(cid)) { fail("Visit ID must be a UUID."); continue; }
    const name = typeof v.outlet_name === "string" ? v.outlet_name.replace(/\s+/g, " ").trim() : "";
    if (!name || name.length > 200) { fail("Outlet name is required and must be 200 characters or fewer."); continue; }
    const type = typeof v.visit_type === "string" ? v.visit_type.replace(/\s+/g, " ").trim() : "general";
    if (!type || type.length > 40) { fail("Visit type is required and must be 40 characters or fewer."); continue; }
    const note = typeof v.note === "string" ? v.note.trim() : "";
    if (note.length > 500) { fail("Visit note must be 500 characters or fewer."); continue; }
    const at = isoWithTz(v.visited_at);
    if (!at) { fail("Visit time must be an ISO 8601 timestamp with timezone."); continue; }
    const outletId = optId(v.outlet_id);
    if (outletId === "invalid") { fail("Invalid outlet selection."); continue; }
    const loc = validLocation(v.visit_location);
    if (loc === "invalid") { fail("Invalid visit location."); continue; }
    const { data, error } = await db.rpc("create_mobile_visit", {
      p_rep_id: rep.id, p_rep_name: repLabel(rep), p_client_visit_id: cid, p_outlet_name: name, p_visited_at: at,
      p_visit_type: type, p_note: note, p_outlet_id: outletId, p_location: loc,
    } as never);
    if (error) { fail(error.message); continue; }
    results.push({ client_visit_id: cid, ok: true, ...(data as object) });
  }
  return json({ results });
}

export async function deliveries(rep: Rep, url: URL) {
  const date = url.searchParams.get("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Invalid date." }, 400);
  const db = await adminClient();
  const { data: assigned } = await db.from("delivery_assignments").select("order_id").eq("rep_id", rep.id).eq("active", true);
  const ids = (assigned ?? []).map((a) => a.order_id);
  const { data: orders } = ids.length
    ? await db.from("orders").select("id, outlet_name, total_retail, created_at, outlets(area)").in("id", ids).eq("delivery_rep_id", rep.id).eq("status", "New").order("created_at")
    : { data: [] as never[] };
  const result = [];
  for (const o of (orders ?? []) as { id: number; outlet_name: string; total_retail: number; created_at: string; outlets: { area: string } | null }[]) {
    const { data: items } = await db.from("order_items").select("id, product_id, product_name, unit_retail, quantity, delivery_attempt_items(quantity)").eq("order_id", o.id).order("id");
    const its = (items ?? []).map((i) => {
      const done = ((i as { delivery_attempt_items: { quantity: number }[] }).delivery_attempt_items ?? []).reduce((s, d) => s + Number(d.quantity), 0);
      return { id: i.id, product_id: i.product_id, product_name: i.product_name, quantity: Number(i.quantity) - done, unit_retail: Number(i.unit_retail ?? 0), done };
    });
    const { data: atts } = await db.from("delivery_attempts").select("cash_collected").eq("order_id", o.id).eq("result", "delivered");
    const collected = (atts ?? []).reduce((s, a) => s + Number(a.cash_collected), 0);
    const deliveredValue = its.reduce((s, i) => s + i.done * i.unit_retail, 0);
    result.push({
      id: o.id, outlet_name: o.outlet_name, area: o.outlets?.area ?? "", created_at: o.created_at, total_retail: Number(o.total_retail),
      items: its.filter((i) => i.quantity > 0).map(({ done: _d, ...i }) => i),
      delivered_value: deliveredValue, cash_collected: collected,
    });
  }
  let pq = db.from("delivery_attempts").select("id, order_id, cash_collected, created_at, orders(outlet_name), delivery_handover_items(attempt_id)")
    .eq("rep_id", rep.id).eq("result", "delivered").gt("cash_collected", 0).order("created_at");
  if (date) pq = pq.gte("created_at", `${date}T00:00:00Z`).lt("created_at", `${date}T23:59:59.999Z`);
  const { data: pend } = await pq;
  const pending = ((pend ?? []) as { id: number; order_id: number; cash_collected: number; created_at: string; orders: { outlet_name: string } | null; delivery_handover_items: unknown[] }[])
    .filter((p) => !p.delivery_handover_items?.length)
    .map((p) => ({ id: p.id, order_id: p.order_id, cash_collected: Number(p.cash_collected), created_at: p.created_at, outlet_name: p.orders?.outlet_name ?? "" }));
  return json({ orders: result, pending_cash: pending, pending_cash_total: pending.reduce((s, p) => s + p.cash_collected, 0) });
}

export async function syncDeliveries(rep: Rep, body: Record<string, unknown>) {
  const attempts = body.attempts;
  if (!Array.isArray(attempts) || !attempts.length || attempts.length > 50) return json({ error: "Provide between 1 and 50 delivery attempts." }, 400);
  const db = await adminClient();
  const results = [];
  for (const a of attempts as Record<string, unknown>[]) {
    if (!a || typeof a !== "object") { results.push({ ok: false, error: "Invalid delivery payload." }); continue; }
    const cid = a.client_attempt_id;
    const fail = (error: string) => results.push({ client_attempt_id: cid, ok: false, error });
    if (typeof cid !== "string" || !UUID_RE.test(cid)) { fail("Delivery attempt ID must be a UUID."); continue; }
    const orderId = optId(a.order_id);
    if (orderId === null || orderId === "invalid") { fail("Invalid order."); continue; }
    const result = a.result;
    if (result !== "delivered" && result !== "failed") { fail("Choose a valid delivery outcome."); continue; }
    const reason = typeof a.failure_reason === "string" ? a.failure_reason.trim() : a.failure_reason == null ? "" : null;
    const note = typeof a.note === "string" ? a.note.trim() : a.note == null ? "" : null;
    if (reason === null || note === null) { fail("Delivery notes must be text."); continue; }
    if (reason.length > 200 || note.length > 500) { fail("Delivery notes are too long."); continue; }
    if (result === "failed" && !reason) { fail("Enter a reason for the failed delivery."); continue; }
    let cash = result === "failed" ? 0 : a.cash_collected ?? 0;
    if (typeof cash === "boolean" || !isFinite(Number(cash)) || Number(cash) < 0) { fail("Collected cash must be a valid non-negative amount."); continue; }
    cash = Number(cash);
    const loc = validLocation(a.visit_location);
    if (loc === "invalid") { fail("Invalid visit location."); continue; }
    const { data, error } = await db.rpc("record_delivery_attempt", {
      p_rep_id: rep.id, p_client_attempt_id: cid, p_order_id: orderId, p_result: result, p_failure_reason: reason, p_note: note,
      p_cash: cash, p_location: loc, p_items: a.delivered_items ?? null,
    } as never);
    if (error) { fail(error.message); continue; }
    results.push({ client_attempt_id: cid, ok: true, ...(data as object) });
  }
  return json({ results });
}

export async function syncHandovers(rep: Rep, body: Record<string, unknown>) {
  const handovers = body.handovers;
  if (!Array.isArray(handovers) || !handovers.length || handovers.length > 20) return json({ error: "Provide between 1 and 20 handovers." }, 400);
  const db = await adminClient();
  const results = [];
  for (const h of handovers as Record<string, unknown>[]) {
    if (!h || typeof h !== "object") { results.push({ ok: false, error: "Invalid handover payload." }); continue; }
    const cid = h.client_handover_id;
    const fail = (error: string) => results.push({ client_handover_id: cid, ok: false, error });
    if (typeof cid !== "string" || !UUID_RE.test(cid)) { fail("Handover ID must be a UUID."); continue; }
    const date = h.handover_date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { fail("Choose a valid handover date."); continue; }
    const declared = h.declared_cash;
    if (typeof declared === "boolean" || !isFinite(Number(declared)) || Number(declared) < 0) { fail("Declared cash must be a valid non-negative amount."); continue; }
    const note = typeof h.note === "string" ? h.note.trim() : h.note == null ? "" : null;
    if (note === null) { fail("Handover note must be text."); continue; }
    if (note.length > 500) { fail("Handover note must be 500 characters or fewer."); continue; }
    const ids = h.attempt_ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some((x) => typeof x !== "number" || !Number.isInteger(x) || x < 1) || new Set(ids).size !== ids.length) {
      fail("Select between 1 and 100 delivery collections."); continue;
    }
    const { data, error } = await db.rpc("create_delivery_handover", {
      p_rep_id: rep.id, p_client_handover_id: cid, p_attempt_ids: ids, p_declared: Number(declared), p_date: date, p_note: note,
    } as never);
    if (error) { fail(error.message); continue; }
    results.push({ client_handover_id: cid, ok: true, ...(data as object) });
  }
  return json({ results });
}
