import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, Table, Empty } from "@/components/admin/kit";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cashbox")({
  component: CashboxPage,
});

function CashboxPage() {
  const cashbox = isLocalDemo ? localDemoDashboard.cashbox : {
    opening: 0,
    cash_sales: 0,
    card_sales: 0,
    refunds: 0,
    variance: 0,
    closing: 0,
    day_close_by: "—",
    note: "—",
    denominations: [],
  };
  const totalDenominations = cashbox.denominations.reduce((sum, item) => sum + item.denomination * item.count, 0);
  return (
    <>
      <PageHeader title="Cashbox" sub="Daily cash reconciliation for the sales team." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Opening" value={ks(cashbox.opening)} />
        <Stat label="Cash sales" value={ks(cashbox.cash_sales)} />
        <Stat label="Refunds" value={ks(cashbox.refunds)} />
        <Stat label="Closing" value={ks(cashbox.closing)} />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Denominations">
          {cashbox.denominations.length ? (
            <Table head={["Denomination", "Count", "Value"]}>
              {cashbox.denominations.map((item) => (
                <tr key={item.denomination}>
                  <td>{ks(item.denomination)}</td>
                  <td>{item.count}</td>
                  <td>{ks(item.denomination * item.count)}</td>
                </tr>
              ))}
            </Table>
          ) : <Empty>No cash denominations recorded.</Empty>}
        </Panel>
        <Panel title="Day close summary">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Closed by</dt><dd className="font-medium">{cashbox.day_close_by}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Card sales</dt><dd>{ks(cashbox.card_sales)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Variance</dt><dd className={cashbox.variance >= 0 ? "text-foreground" : "text-destructive"}>{ks(cashbox.variance)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Counted total</dt><dd>{ks(totalDenominations)}</dd></div>
          </dl>
          <p className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">{cashbox.note}</p>
        </Panel>
      </div>
    </>
  );
}
