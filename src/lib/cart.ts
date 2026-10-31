import { useCallback, useEffect, useState } from "react";

export type CartLine = { pk: number; product_id: string; name: string; unit: string; retail: number; wholesale: number; qty: number };
const KEY = "gtm-cart-v1";
const EVT = "gtm-cart-change";

function read(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    setLines(read());
    const on = () => setLines(read());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
  }, []);
  const save = useCallback((next: CartLine[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
  }, []);
  const setQty = useCallback((item: Omit<CartLine, "qty">, qty: number) => {
    const cur = read().filter((l) => l.pk !== item.pk);
    save(qty > 0 ? [...cur, { ...item, qty: Math.min(999, Math.floor(qty)) }] : cur);
  }, [save]);
  const clear = useCallback(() => save([]), [save]);
  const qtyOf = (pk: number) => lines.find((l) => l.pk === pk)?.qty ?? 0;
  const totals = lines.reduce((t, l) => ({ retail: t.retail + l.retail * l.qty, wholesale: t.wholesale + l.wholesale * l.qty, count: t.count + l.qty }), { retail: 0, wholesale: 0, count: 0 });
  return { lines, setQty, clear, qtyOf, totals };
}
