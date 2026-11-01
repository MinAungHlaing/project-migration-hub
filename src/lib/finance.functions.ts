import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./server-clients";
import { cashboxTotals, type Denomination } from "./finance-rules";

const fail = (e: { message?: string } | null | undefined): never => { throw new Error(e?.message || "Something went wrong."); };
const STATUSES = ["Pending", "Approved", "Rejected"] as const;
type Status = (typeof STATUSES)[number];
const num = (v: unknown, label: string, min = 0) => {
  const n = Number(v);
  if (v === "" || v == null || !isFinite(n) || n < min) throw new Error(`${label} must be ${min} or greater.`);
  return n;
};
const status = (s: string): Status => {
  if (!(STATUSES as readonly string[]).includes(s)) throw new Error("Unknown status.");
  return s as Status;
};

// ---------- expenses ----------
export const listExpenses = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data, error } = await db.from("expenses").select("*").order("expense_date", { ascending: false }).order("id", { ascending: false }).limit(500);
  if (error) fail(error);
  return data ?? [];
});

export const addExpense = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { expense_date: string; category: string; vendor: string; note: string; amount: number }) => d)
  .handler(async ({ data, context }) => {
    const { db, actor } = await requireAdmin(context);
    if (!data.category.trim()) throw new Error("Category is required.");
    const { error } = await db.from("expenses").insert({
      expense_date: data.expense_date || new Date().toISOString().slice(0, 10),
      category: data.category.trim(), vendor: data.vendor.trim(), note: data.note.trim(),
      amount: num(data.amount, "Amount"), created_by: actor,
    });
    if (error) fail(error);
    return { ok: true };
  });

export const setExpenseStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { db } = await requireAdmin(context);
    const { error } = await db.from("expenses").update({ status: status(data.status) }).eq("id", data.id);
    if (error) fail(error);
    return { ok: true };
  });

// ---------- returns ----------
export const listReturns = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data, error } = await db.from("product_returns").select("*").order("id", { ascending: false }).limit(500);
  if (error) fail(error);
  return data ?? [];
});

export const addReturn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { product_name: string; outlet_name: string; quantity: number; condition: string; reason: string; value: number }) => d)
  .handler(async ({ data, context }) => {
    const { db, actor } = await requireAdmin(context);
    if (!data.product_name.trim()) throw new Error("Product is required.");
    if (data.condition !== "good" && data.condition !== "damaged") throw new Error("Condition must be good or damaged.");
    const qty = num(data.quantity, "Quantity", 0);
    if (qty <= 0) throw new Error("Quantity must be greater than 0.");
    const { error } = await db.from("product_returns").insert({
      product_name: data.product_name.trim(), outlet_name: data.outlet_name.trim(), quantity: qty,
      condition: data.condition, reason: data.reason.trim(), value: num(data.value, "Value"), owner: actor,
    });
    if (error) fail(error);
    return { ok: true };
  });

export const setReturnStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { db } = await requireAdmin(context);
    const { error } = await db.from("product_returns").update({ status: status(data.status) }).eq("id", data.id);
    if (error) fail(error);
    return { ok: true };
  });

// ---------- cashbox ----------
export const listCashboxDays = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db } = await requireAdmin(context);
  const { data, error } = await db.from("cashbox_days").select("*").order("business_date", { ascending: false }).limit(60);
  if (error) fail(error);
  return data ?? [];
});

export const saveCashboxDay = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { business_date: string; opening: number; cash_sales: number; card_sales: number; refunds: number; denominations: Denomination[]; note: string }) => d)
  .handler(async ({ data, context }) => {
    const { db, actor } = await requireAdmin(context);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.business_date)) throw new Error("Pick a date.");
    const denominations = (data.denominations ?? []).map((d) => ({ denomination: num(d.denomination, "Note value"), count: Math.floor(num(d.count, "Note count")) }));
    const { counted } = cashboxTotals({ opening: 0, cash_sales: 0, refunds: 0, denominations });
    const { error } = await db.from("cashbox_days").upsert({
      business_date: data.business_date,
      opening: num(data.opening, "Opening"), cash_sales: num(data.cash_sales, "Cash sales"),
      card_sales: num(data.card_sales, "Card sales"), refunds: num(data.refunds, "Refunds"),
      counted, denominations, note: data.note.trim(), closed_by: actor, updated_at: new Date().toISOString(),
    }, { onConflict: "business_date" });
    if (error) fail(error);
    return { ok: true };
  });
