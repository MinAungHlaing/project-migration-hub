export type Denomination = { denomination: number; count: number };

/** Myanmar kyat notes counted in the cashbox. */
export const KYAT_NOTES = [50, 100, 200, 500, 1000, 5000, 10000, 20000];

/** Expected cash = opening + cash sales − refunds; variance = counted − expected. Card sales never enter the drawer. */
export function cashboxTotals(d: { opening: number; cash_sales: number; refunds: number; denominations: Denomination[] }) {
  const counted = d.denominations.reduce((s, x) => s + Number(x.denomination) * Number(x.count), 0);
  const expected = Number(d.opening) + Number(d.cash_sales) - Number(d.refunds);
  return { counted, expected, variance: counted - expected };
}
